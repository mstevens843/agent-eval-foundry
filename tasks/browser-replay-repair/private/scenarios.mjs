export function scenarios() {
  return Array.from({ length: 16 }, (_, seed) => ({
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
  }));
}
export const checkIds = [
  "completion",
  "exact_effects",
  "current_preconditions",
  "confirmation",
  "reports",
  "preservation",
];
