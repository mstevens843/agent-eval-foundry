import { equal, sorted, verdicts } from "./checker-utils.mjs";
const minutes = (value) => Date.parse(`${value}Z`) / 60000;
const civil = (value) => new Date(value * 60000).toISOString().slice(0, 16);
// Invert each piecewise-constant UTC interval, rather than scanning minutes as the grader does.
function instant(local, zone) {
  const wall = minutes(local),
    candidates = [];
  const intervals = [{ at: -Infinity, offset: zone.initialOffset }, ...zone.transitions, { at: Infinity }];
  for (let i = 0; i + 1 < intervals.length; i++) {
    const value = wall - intervals[i].offset;
    if (intervals[i].at <= value && value < intervals[i + 1].at) candidates.push(value);
  }
  return candidates.length ? Math.min(...candidates) : null;
}
export function materialize(view) {
  const events = [];
  const zones = new Map(view.zones.map((z) => [z.id, z]));
  for (const series of view.series) {
    const origin = minutes(series.start);
    for (let day = 0; civil(origin + day * 1440).slice(0, 10) <= series.until; day++) {
      const rid = civil(origin + day * 1440),
        rule = series.rule;
      const selected =
        rule.frequency === "daily"
          ? day % rule.interval === 0
          : Math.floor(day / 7) % rule.interval === 0 &&
            rule.weekdays.includes(new Date((origin + day * 1440) * 60000).getUTCDay());
      if (!selected || series.excluded.includes(rid) || instant(rid, zones.get(series.zone)) === null)
        continue;
      const exception = series.exceptions.find((e) => e.rid === rid) ?? {};
      const source = { ...series, ...exception };
      let local = exception.start ?? rid;
      let zone = source.zone,
        room = source.room,
        cancelled = source.cancelled === true;
      for (const change of view.changes) {
        if (change.uid !== series.uid || (change.scope === "single" ? rid !== change.rid : rid < change.rid))
          continue;
        if (change.action === "cancel") cancelled = true;
        else if (!cancelled) {
          local = civil(minutes(local) + (change.delta ?? 0));
          zone = change.zone ?? zone;
          if (Object.hasOwn(change, "room")) room = change.room;
        }
      }
      const utc = instant(local, zones.get(zone));
      events.push({
        uid: series.uid,
        rid,
        startLocal: local,
        zone,
        startUTC: utc,
        endUTC: utc === null ? null : utc + source.duration,
        status: cancelled ? "cancelled" : utc === null ? "skipped" : "active",
        room,
        attendees: source.attendees,
      });
    }
  }
  const bookings = [
    ...view.externalBookings,
    ...events
      .filter((e) => e.status === "active" && e.room !== null)
      .map((e) => ({
        key: JSON.stringify([e.uid, e.rid]),
        room: e.room,
        startUTC: e.startUTC,
        endUTC: e.endUTC,
      })),
  ];
  return { events, bookings };
}
const recordKey = (r) => JSON.stringify([r.kind, r.id]);
function check(c) {
  let records = [],
    external = structuredClone(c.input.externalBookings);
  if (c.prefixes.length !== c.input.deliveries.length || c.acks.length !== c.input.deliveries.length)
    return false;
  const normalized = (rows) => sorted(rows.map((e) => ({ ...e, attendees: sorted(e.attendees) })));
  for (const [i, d] of c.input.deliveries.entries()) {
    const map = new Map(records.map((r) => [recordKey(r), r]));
    for (const r of d.updates)
      if (!map.has(recordKey(r)) || map.get(recordKey(r)).revision < r.revision) map.set(recordKey(r), r);
    records = [...map.values()];
    // Concurrent booking exists only if the authority actually reached its scheduled publish boundary.
    const prefix = c.prefixes[i];
    if (d.concurrentBooking && prefix.externalBookings.some((b) => b.key === d.concurrentBooking.key))
      external.push(d.concurrentBooking);
    if (
      !equal(sorted(prefix.records), sorted(records)) ||
      !equal(sorted(prefix.externalBookings), sorted(external))
    )
      return false;
    const live = records.filter((r) => r.value !== null),
      get = (k) => live.filter((r) => r.kind === k).map((r) => r.value),
      window = get("window")[0];
    const all = materialize({
      series: get("series"),
      zones: get("zone"),
      changes: get("changes").flat(),
      externalBookings: external,
    });
    const events = all.events.filter((e) => e.rid >= window.from && e.rid <= window.through),
      keys = new Set(events.map((e) => JSON.stringify([e.uid, e.rid])));
    const bookings = all.bookings.filter((b) => external.some((x) => x.key === b.key) || keys.has(b.key));
    if (
      !equal(normalized(prefix.events), normalized(events)) ||
      !equal(sorted(prefix.bookings), sorted(bookings))
    )
      return false;
    if (!c.acks.some((a) => a.deliveryId === d.id && a.generation === prefix.generation)) return false;
    for (const p of c.publications.filter((p) => p.deliveryId === d.id))
      if (
        !equal(sorted(p.records), sorted(records)) ||
        !equal(normalized(p.events), normalized(events)) ||
        !equal(sorted(p.bookings), sorted(bookings))
      )
        return false;
  }
  return equal(
    c.actual,
    c.prefixes.at(-1) &&
      Object.fromEntries(Object.entries(c.prefixes.at(-1)).filter(([k]) => k !== "deliveryId")),
  );
}
export const run = ({ cases }) => verdicts(cases, check);
