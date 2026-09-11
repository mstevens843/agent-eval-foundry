import { session as rawSession, checks, equal, canonical } from "./adapter.mjs";
import { deliver } from "./restart.mjs";
import { publicationShape } from "./publication-shape.mjs";
// The scenario returns the complete observations once. Repeating its cumulative
// history in every process result needlessly multiplies the collector payload.
function session(...args) {
  const adapter = rawSession(...args);
  adapter.result = () => ({ channels: {}, report: { captured: true } });
  return adapter;
}
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
    publications = [],
    prefixes = [],
    acks = [],
    interruptions = [];
  let state = {
    generation: 0,
    records: [],
    events: [],
    bookings: structuredClone(s.externalBookings),
    externalBookings: structuredClone(s.externalBookings),
  };
  let active = null,
    raced = false,
    sourceRecords = [];
  const flags = {
    completion: true,
    occurrence_identity: true,
    civil_time: true,
    history: true,
    bookings: true,
    preservation: true,
    source_revisions: true,
  };
  const recordKey = (r) => JSON.stringify([r.kind, r.id]);
  const latest = (records, updates) => {
    const result = structuredClone(records);
    for (const r of updates) {
      const at = result.findIndex((p) => recordKey(p) === recordKey(r));
      if (at < 0) result.push(r);
      else if (r.revision > result[at].revision) result[at] = r;
    }
    return result;
  };
  const sorted = (xs) => [...xs].sort((a, b) => canonical(a).localeCompare(canonical(b)));
  function wanted(records) {
    const live = records.filter((r) => r.value !== null),
      get = (k) => live.filter((r) => r.kind === k).map((r) => r.value);
    const window = get("window")[0];
    const v = {
      series: get("series"),
      zones: get("zone"),
      changes: get("changes").flat(),
      externalBookings: state.externalBookings,
    };
    const all = expected(v),
      events = all.events.filter((e) => e.rid >= window.from && e.rid <= window.through),
      keys = new Set(events.map(key)),
      external = new Set(state.externalBookings.map((b) => b.key));
    return { events, bookings: all.bookings.filter((b) => external.has(b.key) || keys.has(b.key)) };
  }
  const operations = {
    read: () => structuredClone(state),
    publish: (r) => {
      if (!publicationShape(r)) return { error: "shape" };
      if (!raced && active.concurrentBooking) {
        raced = true;
        state.generation++;
        state.externalBookings.push(active.concurrentBooking);
        state.bookings.push(active.concurrentBooking);
      }
      if (r.baseGeneration !== state.generation) return { stale: true };
      const records = sourceRecords,
        want = wanted(records);
      flags.source_revisions &&= equal(sorted(r.records), sorted(records));
      flags.occurrence_identity &&= equal(r.events.map(key).sort(), want.events.map(key).sort());
      flags.civil_time &&= want.events.every((e) => {
        const a = r.events.find((a) => key(a) === key(e));
        return a && ["startLocal", "zone", "startUTC", "endUTC"].every((k) => a[k] === e[k]);
      });
      flags.history &&= want.events.every(
        (e) => r.events.find((a) => key(a) === key(e))?.status === e.status,
      );
      flags.bookings &&= equal(sorted(r.bookings), sorted(want.bookings));
      flags.preservation &&= equal(normalize(r.events), normalize(want.events));
      state = {
        ...state,
        generation: state.generation + 1,
        records: r.records,
        events: r.events,
        bookings: r.bookings,
      };
      publications.push({ deliveryId: active.id, ...structuredClone(state) });
      return { stored: true, generation: state.generation };
    },
    ack: ({ deliveryId, generation }) => {
      if (deliveryId !== active.id || generation !== state.generation) return { error: "request" };
      // A redelivered process may legally publish a new, equivalent generation.
      // Keep the latest successful acknowledgement, including a lost-response retry.
      const previous = acks.find((a) => a.deliveryId === deliveryId);
      if (previous) previous.generation = generation;
      else acks.push({ deliveryId, generation });
      return { stored: true };
    },
  };
  for (const d of s.deliveries) {
    active = d;
    raced = false;
    const target = (sourceRecords = latest(sourceRecords, d.updates));
    await deliver(
      execute,
      () =>
        session(
          { deliveryId: d.id, updates: d.updates, storage },
          operations,
          (r) => reports.push(r),
          observations,
        ),
      d.interrupt ? { ...d.interrupt, observations } : null,
      interruptions,
      { deliveryId: d.id },
    );
    flags.completion &&= acks.some((a) => a.deliveryId === d.id && a.generation === state.generation);
    flags.source_revisions &&= equal(sorted(state.records), sorted(target));
    if (target.length) {
      const want = wanted(target);
      flags.preservation &&= equal(normalize(state.events), normalize(want.events));
      flags.bookings &&= equal(sorted(state.bookings), sorted(want.bookings));
    }
    prefixes.push({ deliveryId: d.id, ...structuredClone(state) });
  }
  return {
    ...checks(flags),
    input: {
      externalBookings: s.externalBookings,
      deliveries: s.deliveries.map(({ id, updates, concurrentBooking }) => ({
        id,
        updates,
        ...(concurrentBooking ? { concurrentBooking } : {}),
      })),
    },
    actual: state,
    publications,
    prefixes,
    acks,
    observations,
    reports,
    interruptions,
  };
}
