import { minute, civil, utc } from "./time.mjs";
export function expand(series, zones) {
  const out = [];
  for (const s of series) {
    const start = minute(s.start),
      until = minute(s.until + "T23:59");
    for (let n = start, day = 0; n <= until; n += 1440, day++) {
      const weekday = new Date(n * 60000).getUTCDay();
      const included =
        s.rule.frequency === "daily"
          ? day % s.rule.interval === 0
          : Math.floor(day / 7) % s.rule.interval === 0 && s.rule.weekdays.includes(weekday);
      const rid = civil(n),
        zone = zones.find((z) => z.id === s.zone);
      if (!included || s.excluded.includes(rid) || utc(rid, zone) === null) continue;
      const e = s.exceptions.find((e) => e.rid === rid);
      out.push({
        uid: s.uid,
        rid,
        startLocal: e?.start ?? rid,
        zone: e?.zone ?? s.zone,
        duration: e?.duration ?? s.duration,
        room: e && Object.hasOwn(e, "room") ? e.room : s.room,
        attendees: structuredClone(e?.attendees ?? s.attendees),
        cancelled: e?.cancelled ?? false,
      });
    }
  }
  return out;
}
