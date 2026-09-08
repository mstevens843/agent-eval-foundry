import { session, checks, equal, canonical } from "./adapter.mjs";
const min = (s) => Date.parse(s + "Z") / 60000,
  str = (n) => new Date(n * 60000).toISOString().slice(0, 16);
function resolve(wall, z) {
  // Bounded minute search deliberately differs from the service's offset enumeration.
  const w = min(wall);
  for (let u = w - 840; u <= w + 720; u++) {
    const changes = z.transitions.filter((t) => t.at <= u),
      offset = changes.length ? changes.at(-1).offset : z.initialOffset;
    if (u + offset === w) return u;
  }
  return null;
}
export function expected(v) {
  const events = [];
  for (const series of v.series) {
    for (let distance = 0; distance <= 28; distance++) {
      const candidate = min(series.start) + 1440 * distance,
        rid = str(candidate);
      if (rid.slice(0, 10) > series.until) break;
      if (
        series.rule.frequency === "daily"
          ? distance % series.rule.interval !== 0
          : Math.floor(distance / 7) % series.rule.interval !== 0 ||
            !series.rule.weekdays.includes(new Date(candidate * 60000).getUTCDay())
      )
        continue;
      if (
        series.excluded.includes(rid) ||
        resolve(
          rid,
          v.zones.find((z) => z.id === series.zone),
        ) === null
      )
        continue;
      const ex = series.exceptions.find((e) => e.rid === rid) ?? {};
      let local = ex.start ?? rid,
        zone = ex.zone ?? series.zone,
        room = Object.hasOwn(ex, "room") ? ex.room : series.room,
        cancelled = ex.cancelled ?? false;
      for (const change of v.changes) {
        if (
          change.uid !== series.uid ||
          !(change.scope === "single" ? rid === change.rid : rid >= change.rid)
        )
          continue;
        if (change.action === "cancel") cancelled = true;
        else if (!cancelled) {
          local = str(min(local) + (change.delta ?? 0));
          if (change.zone !== undefined) zone = change.zone;
          if (Object.hasOwn(change, "room")) room = change.room;
        }
      }
      const u = resolve(
        local,
        v.zones.find((z) => z.id === zone),
      );
      events.push({
        uid: series.uid,
        rid,
        startLocal: local,
        zone,
        startUTC: u,
        endUTC: u === null ? null : u + (ex.duration ?? series.duration),
        status: cancelled ? "cancelled" : u === null ? "skipped" : "active",
        room,
        attendees: ex.attendees ?? series.attendees,
      });
    }
  }
  return {
    events,
    bookings: [
      ...v.externalBookings,
      ...events
        .filter((e) => e.status === "active" && e.room !== null)
        .map((e) => ({
          key: JSON.stringify([e.uid, e.rid]),
          room: e.room,
          startUTC: e.startUTC,
          endUTC: e.endUTC,
        })),
    ],
  };
}
const key = (e) => JSON.stringify([e.uid, e.rid]);
const order = (rows) => [...rows].sort((a, b) => canonical(a).localeCompare(canonical(b)));
function normalize(rows) {
  return rows
    .map((e) => ({ ...e, attendees: order(e.attendees ?? []) }))
    .sort((a, b) => key(a).localeCompare(key(b)));
}
export async function runScenario(s, execute, storage) {
  const observations = [],
    reports = [],
    commits = [];
  await execute(
    session(
      { ...s.view, storage },
      {
        commit: ({ events, bookings }) => {
          if (
            !Array.isArray(events) ||
            !Array.isArray(bookings) ||
            events.length > 500 ||
            bookings.length > 600
          )
            return { error: "shape" };
          commits.push({ events, bookings });
          return { stored: true };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const want = expected(s.view),
    actual = commits.at(-1) ?? { events: [], bookings: [] },
    lookup = (e) => actual.events.find((a) => key(a) === key(e));
  return {
    ...checks({
      completion: commits.length === 1,
      occurrence_identity: equal(actual.events.map(key).sort(), want.events.map(key).sort()),
      civil_time: want.events.every((e) => {
        const a = lookup(e);
        return !!a && ["startLocal", "zone", "startUTC", "endUTC"].every((k) => a[k] === e[k]);
      }),
      history: want.events.every((e) => lookup(e)?.status === e.status),
      bookings: equal(order(actual.bookings), order(want.bookings)),
      preservation: equal(normalize(actual.events), normalize(want.events)),
    }),
    actual,
    expected: want,
    observations,
    reports,
    view: s.view,
  };
}
