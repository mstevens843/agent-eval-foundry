import { equal, sorted, verdicts } from "./checker-utils.mjs";
const minutes = (value) => Date.parse(`${value}Z`) / 60000;
const civil = (value) => new Date(value * 60000).toISOString().slice(0, 16);
// Invert each piecewise-constant UTC interval, rather than scanning minutes as the grader does.
function instant(local, zone) {
  const wall = minutes(local), candidates = [];
  const intervals = [{ at: -Infinity, offset: zone.initialOffset }, ...zone.transitions, { at: Infinity }];
  for (let i = 0; i + 1 < intervals.length; i++) {
    const value = wall - intervals[i].offset;
    if (intervals[i].at <= value && value < intervals[i + 1].at) candidates.push(value);
  }
  return candidates.length ? Math.min(...candidates) : null;
}
function check(cell) {
  const { view } = cell, events = [];
  const zones = new Map(view.zones.map((z) => [z.id, z]));
  const commits = cell.observations.filter((o) => o.method === "commit" && o.value?.stored === true);
  if (commits.length !== 1) return false;
  for (const series of view.series) {
    const origin = minutes(series.start);
    for (let day = 0; civil(origin + day * 1440).slice(0, 10) <= series.until; day++) {
      const rid = civil(origin + day * 1440), rule = series.rule;
      const selected = rule.frequency === "daily" ? day % rule.interval === 0
        : Math.floor(day / 7) % rule.interval === 0 && rule.weekdays.includes(new Date((origin + day * 1440) * 60000).getUTCDay());
      if (!selected || series.excluded.includes(rid) || instant(rid, zones.get(series.zone)) === null) continue;
      const exception = series.exceptions.find((e) => e.rid === rid) ?? {};
      const source = { ...series, ...exception };
      let local = exception.start ?? rid;
      let zone = source.zone, room = source.room, cancelled = source.cancelled === true;
      for (const change of view.changes) {
        if (change.uid !== series.uid || (change.scope === "single" ? rid !== change.rid : rid < change.rid)) continue;
        if (change.action === "cancel") cancelled = true;
        else if (!cancelled) {
          local = civil(minutes(local) + (change.delta ?? 0));
          zone = change.zone ?? zone;
          if (Object.hasOwn(change, "room")) room = change.room;
        }
      }
      const utc = instant(local, zones.get(zone));
      events.push({ uid: series.uid, rid, startLocal: local, zone, startUTC: utc,
        endUTC: utc === null ? null : utc + source.duration,
        status: cancelled ? "cancelled" : utc === null ? "skipped" : "active", room, attendees: source.attendees });
    }
  }
  const bookings = [...view.externalBookings, ...events.filter((e) => e.status === "active" && e.room !== null)
    .map((e) => ({ key: JSON.stringify([e.uid, e.rid]), room: e.room, startUTC: e.startUTC, endUTC: e.endUTC }))];
  const normalized = (rows) => sorted(rows.map((e) => ({ ...e, attendees: sorted(e.attendees) })));
  return equal(normalized(cell.actual.events), normalized(events)) && equal(sorted(cell.actual.bookings), sorted(bookings));
}
export const run = ({ cases }) => verdicts(cases, check);
