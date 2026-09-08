export const checkIds = [
  "completion",
  "index_payload",
  "version_order",
  "ownership",
  "checkpoint_prefix",
  "preservation",
];
export function scenarios() {
  // 4 independent bits (1, 2, 4, 8): entity naming, p's delivery order, q's delivery order,
  // and post-reassignment redelivery/duplicates. Every bit must move the observable trace for
  // at least one candidate, or it is padding — see the audit note below.
  //
  // Array order matters too: a small-N prefix of this list (e.g. checker-required grading's
  // scenario subsample) has to already span the bit most defects depend on, not whichever bit
  // happens to be numerically lowest. Plain ascending seed order front-loads bit 1 (entity
  // naming) and defers bit 2 (out-of-order delivery to p) — but out-of-order delivery is what
  // most checkpoint/version defects actually need to surface, so seed 0 and seed 1 alone (both
  // in-order) look identical to a correct implementation on any check that only breaks under
  // reordering. Swapping bits 1 and 2 for generation order (not for each case's own id or
  // content) puts an out-of-order-delivery case in the first pair without changing what any
  // individual scenario contains.
  const seedOrder = Array.from({ length: 16 }, (_, i) => (i & 0b1100) | ((i & 1) << 1) | ((i >> 1) & 1));
  const cases = seedOrder.map((seed) => {
    const event = (p, o, g = 0) => ({
      kind: "callback",
      partition: p,
      generation: g,
      offset: o,
      eventId: p + "-" + o,
      record: { entity: seed & 1 ? "shared" : "doc-" + (o % 2), version: o + 1, body: p + ":" + o },
    });
    const order = seed & 2 ? [2, 0, 1] : [0, 1, 2],
      events = order.map((o) => event("p", o));
    // q's own two callbacks (offsets 0 and 1) are delivered out of order when this bit is set,
    // the same contiguous-checkpoint / version-ordering exercise `order` already gives p — q
    // previously only ever saw its own events in-order regardless of this bit's value, because
    // only the *position* of q's first event among p's events was varied, which no candidate's
    // behavior actually depends on (q and p are independently scoped by SEMANTICS.md).
    const qFirst = seed & 4 ? event("q", 1) : event("q", 0),
      qSecond = seed & 4 ? event("q", 0) : event("q", 1);
    events.push(qFirst);
    events.push({ kind: "assignment", partition: "p", generation: 1 }, event("p", 3, 0), event("p", 3, 1));
    if (seed & 8) events.push(event("p", 1, 1), event("p", 3, 1));
    events.push(event("foreign", 0), qSecond);
    return { id: "case-" + String(seed).padStart(3, "0"), partitions: ["p", "q"], events };
  });
  const simple = [0, 1].map((offset) => ({
    kind: "callback",
    partition: "p",
    generation: 0,
    offset,
    eventId: "e" + offset,
    record: { entity: "doc" + offset, version: 1, body: "v" + offset },
  }));
  cases.push({ id: "case-032", partitions: ["p"], events: simple });
  return cases;
}
