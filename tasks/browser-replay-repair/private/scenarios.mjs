export const checkIds = [
  "completion",
  "exact_effects",
  "current_preconditions",
  "confirmation",
  "reports",
  "preservation",
];
export function scenarios() {
  const rows = Array.from({ length: 18 }, (_, n) => ({
    id: "case-" + String(n).padStart(3, "0"),
    traceId: "replay-" + n,
    attempts: n === 0 ? 1 : 2,
    confirmation: n % 3 !== 0,
    renew: n > 1,
    decoy: n % 2 === 1,
    competing: n > 3,
    remount: n % 2 === 0,
    remountAfterFill: n % 3 === 1,
    delay: n % 2,
    receiptLag: n % 3,
    events: Array.from({ length: n === 0 ? 1 : 4 }, (_, step) => ({
      step,
      entity: "entity-" + Math.floor(step / 2),
      field: step < 2 ? "title" : "memo",
      value: step < 2 ? "repeated value" : "value é " + step,
      selector: step < 2 ? "#old-title" : "#old-memo",
      path: "/records/entity-" + Math.floor(step / 2),
    })),
    ...(n >= 6
      ? {
          interrupt: {
            method: ["api.submit", "api.confirm", "api.settle", "api.navigate", "api.fill", "api.operation"][
              n % 6
            ],
            count: (n % 2) + 1,
          },
        }
      : {}),
  }));
  const exact=structuredClone(rows[7]);exact.id='identity-and-empty-values';exact.traceId='trace \"é\"';exact.events[0].value='';exact.events[1].step=10;exact.events[2].step=20;exact.events[3].step=30;rows.push(exact);
  // Steps are unique integers. A dialog already bound to the requested operation
  // can be confirmed without creating another submission first. The adjacent
  // values distinguish operation matching from a blanket rule about old dialogs.
  for (const first of [-1, -2, 0]) {
    const scenario = structuredClone(rows.find((row) => row.confirmation && row.competing));
    scenario.id = `signed-step-${first}`;
    scenario.traceId = "signed-step";
    scenario.events[0].step = first;
    scenario.attempts = 2;
    delete scenario.interrupt;
    rows.push(scenario);
  }
  return rows;
}
