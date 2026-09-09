// Real mid-trace process death: `crashAfterSubmit: 2` kills the subject after its 2nd
// `api.act` call has already landed server-side — with no confirmation, decoy or delay
// in play, a correct implementation makes exactly one `fill` and one `submit` act call
// per event, so this lands right after the first event's submission commits its receipt,
// before the subject can see the response, move to the next event, or finish the trace.
// The trace is then redelivered fresh (a new process, same storage/DOM), the real-world
// response to an unconfirmed submission. A subject that does not consult `api.receipts()`
// before redelivering will resubmit the already-committed first event — the DOM does not
// disable a form after it commits, so a blind resubmission dispatches a second real click
// and a second receipt — which the existing `exact_effects` (order- and count-exact) and
// `completion` checks already catch. No crash-specific check dimension is needed, only a
// genuine interruption those checks were never exercised against before.
function crashCases() {
  return Array.from({ length: 4 }, (_, seed) => ({
    id: `case-crash-${String(seed).padStart(3, "0")}`,
    seed: 1000 + seed,
    remount: false,
    delay: 0,
    confirmation: false,
    decoy: false,
    attempts: 1,
    crashAfterSubmit: 2,
    // Three independent events in one trace, crash lands after the first commits: the
    // redelivery must recognize that one via receipts and still complete the other two,
    // in order, exactly once each.
    events: Array.from({ length: 3 }, (_, step) => ({
      step,
      entity: `crash-record-${seed}-${step}`,
      field: step % 2 ? "memo" : "title",
      value: `crash value ${seed * 31 + step} ${step % 2 ? "é & <ok>" : "accepted"}`,
      selector: `crash-control-${seed}-${step}`,
    })),
  }));
}
export function scenarios() {
  return [
    ...Array.from({ length: 16 }, (_, seed) => ({
      id: `case-${String(seed).padStart(3, "0")}`,
      seed,
      remount: !!(seed & 1),
      delay: (seed >> 1) & 1,
      confirmation: !!(seed & 4),
      decoy: !!(seed & 8),
      attempts: seed === 0 ? 1 : 3,
      events: Array.from({ length: seed === 0 ? 1 : 3 }, (_, step) => ({
        step,
        entity: `record-${seed * 17 + step}`,
        field: step % 2 ? "memo" : "title",
        value: seed === 0 ? "" : `value ${seed * 31 + step} ${step % 2 ? "é & <ok>" : "accepted"}`,
        selector: `control-${step}`,
      })),
    })),
    ...crashCases(),
  ];
}
export const checkIds = [
  "completion",
  "exact_effects",
  "current_preconditions",
  "confirmation",
  "reports",
  "preservation",
];
