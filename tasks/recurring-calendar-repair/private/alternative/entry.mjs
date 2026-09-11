import { sync } from "./src/sync.mjs";
const parse = (s) => Date.parse(s + "Z") / 60000;
const text = (n) => new Date(n * 60000).toISOString().slice(0, 16);
function resolve(local, z) {
  const wall = parse(local),
    bounds = [-Infinity, ...z.transitions.map((t) => t.at), Infinity],
    offsets = [z.initialOffset, ...z.transitions.map((t) => t.offset)];
  const hits = [];
  for (let i = 0; i < offsets.length; i++) {
    const u = wall - offsets[i];
    if (u >= bounds[i] && u < bounds[i + 1]) hits.push(u);
  }
  return hits.length ? Math.min(...hits) : null;
}
const calendar = {
  async run(v, api) {
    const events = [];
    for (const s of [...v.series].reverse()) {
      const start = parse(s.start),
        days = Math.floor((parse(s.until + "T23:59") - start) / 1440);
      const candidates = Array.from({ length: days + 1 }, (_, d) => ({ d, n: start + d * 1440 }));
      for (const { d, n } of candidates) {
        if (
          s.rule.frequency === "daily"
            ? d % s.rule.interval !== 0
            : Math.floor(d / 7) % s.rule.interval !== 0 ||
              !s.rule.weekdays.includes(new Date(n * 60000).getUTCDay())
        )
          continue;
        const rid = text(n);
        if (
          s.excluded.includes(rid) ||
          resolve(
            rid,
            v.zones.find((z) => z.id === s.zone),
          ) === null
        )
          continue;
        const x = s.exceptions.find((e) => e.rid === rid);
        let local = x?.start ?? rid,
          zone = x?.zone ?? s.zone,
          room = x && Object.hasOwn(x, "room") ? x.room : s.room,
          cancelled = x?.cancelled ?? false;
        for (const c of v.changes.filter(
          (c) => c.uid === s.uid && (c.scope === "single" ? c.rid === rid : c.rid <= rid),
        )) {
          if (c.action === "cancel") cancelled = true;
          else if (!cancelled) {
            local = text(parse(local) + (c.delta ?? 0));
            zone = c.zone ?? zone;
            if (Object.hasOwn(c, "room")) room = c.room;
          }
        }
        const u = resolve(
          local,
          v.zones.find((z) => z.id === zone),
        );
        events.push({
          uid: s.uid,
          rid,
          startLocal: local,
          zone,
          startUTC: u,
          endUTC: u === null ? null : u + (x?.duration ?? s.duration),
          status: cancelled ? "cancelled" : u === null ? "skipped" : "active",
          room,
          attendees: [...structuredClone(x?.attendees ?? s.attendees)].reverse(),
        });
      }
    }
    const bookings = events
      .filter((e) => e.status === "active" && e.room !== null)
      .map((e) => ({
        key: JSON.stringify([e.uid, e.rid]),
        room: e.room,
        startUTC: e.startUTC,
        endUTC: e.endUTC,
      }));
    await api.commit({ events, bookings: [...bookings, ...v.externalBookings] });
    return { complete: true };
  },
};

export const subject = {
  run: (v, api) =>
    sync(
      v,
      api,
      async (source) => {
        let result;
        await calendar.run(source, {
          commit: async (r) => {
            result = r;
            return { stored: true };
          },
        });
        return result;
      },
      { recover: true, reverse: true },
    ),
};
