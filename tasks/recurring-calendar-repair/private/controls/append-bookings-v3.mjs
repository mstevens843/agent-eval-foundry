export const identity = (r) => JSON.stringify([r.kind, r.id]);
export function merge(records, updates) {
  const by = new Map(records.map((r) => [identity(r), r]));
  for (const r of updates)
    if (!by.has(identity(r)) || by.get(identity(r)).revision < r.revision) by.set(identity(r), r);
  return [...by.values()];
}
export function source(records, externalBookings) {
  const live = records.filter((r) => r.value !== null),
    values = (kind) => live.filter((r) => r.kind === kind).map((r) => r.value);
  return {
    series: values("series"),
    zones: values("zone"),
    changes: values("changes").flat(),
    window: values("window")[0],
    externalBookings,
  };
}
export async function sync(view, api, materialize, { recover = false, reverse = false } = {}) {
  if (recover) await api.publish({ baseGeneration: -1, records: [], events: [], bookings: [] });
  for (;;) {
    const state = await api.read({});
    const records = merge(state.records, view.updates);
    const changed = records.some(
      (r) => !state.records.some((p) => identity(p) === identity(r) && p.revision === r.revision),
    );
    if (!changed) {
      await api.ack({ deliveryId: view.deliveryId, generation: state.generation });
      return { complete: true };
    }
    const v = source(records, state.externalBookings),
      output = await materialize(v);
    const events = output.events.filter((e) => e.rid >= v.window.from && e.rid <= v.window.through);
    const keys = new Set(events.map((e) => JSON.stringify([e.uid, e.rid])));
    const external = new Set(state.externalBookings.map((b) => b.key));
    const bookings = [
      ...state.bookings.filter((b) => !output.bookings.some((x) => x.key === b.key)),
      ...output.bookings,
    ].filter((b) => external.has(b.key) || keys.has(b.key));
    const result = await api.publish({
      baseGeneration: state.generation,
      records: reverse ? [...records].reverse() : records,
      events: reverse ? [...events].reverse() : events,
      bookings: reverse ? [...bookings].reverse() : bookings,
    });
    if (result.stored) {
      await api.ack({ deliveryId: view.deliveryId, generation: result.generation });
      return { complete: true };
    }
  }
}
