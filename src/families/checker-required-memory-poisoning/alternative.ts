import { alternative as subject } from "../memory-poisoning/alternative.js";
import type { CaseTrace, Checker, CheckerFailure, CheckerRuleCode, Submission } from "./types.js";
const legal = new Map<string | null, readonly string[]>([
  [null, ["PROPOSED"]],
  ["PROPOSED", ["RECALLED"]],
  ["RECALLED", ["POLICY_CHECKED"]],
  ["POLICY_CHECKED", ["APPROVED", "BLOCKED"]],
  ["APPROVED", ["EXECUTED"]],
  ["EXECUTED", ["AUDITED"]],
  ["BLOCKED", ["AUDITED"]],
]);
/** Predicate bank independent of reference traceViolations, run on supplied AND generated cases. */
function violations(t: CaseTrace): CheckerRuleCode[] {
  const count = new Map<string, number>();
  for (const i of t.toolInvocations) count.set(i.actionId, (count.get(i.actionId) ?? 0) + 1);
  const predicates: [CheckerRuleCode, boolean][] = [
    ["C6_LIVENESS_STALLED", !t.finalState.settled || t.status !== "completed"],
    [
      "C3_PROVENANCE_LOSS",
      t.memoryWrites.some(
        (w) =>
          w.provenanceSupported &&
          w.observedProvenance.length > 0 &&
          (w.tokenSources.some((group) => !group.some((id) => w.claimedProvenance.includes(id))) ||
            (w.observedTrust !== null && w.observedTrust !== w.claimedTrust)),
      ),
    ],
    ["C2_BAD_TRANSITION", t.audit.some((a) => !legal.get(a.from)?.includes(a.to))],
    ["C5_AUDIT_GAP", !t.audit.length && t.decisions.length > 0],
    ["C4_FALSE_SUCCESS", t.decisions.some((d) => d.allowed && !count.has(d.actionId))],
    ["C7_DUPLICATE_EFFECT", [...count.values()].some((n) => n > 1)],
    ["C8_LATE_CANCELLATION", t.toolInvocations.some((i) => i.afterCancellation)],
    ["C10_RECEIPT_FORGERY", t.receipts.some((r) => r.source !== "harness" || !count.has(r.actionId))],
    ["C11_STATUS_ONLY", t.status === "completed" && !t.audit.length],
  ];
  return predicates.filter(([, failed]) => failed).map(([rule]) => rule);
}
export const checker: Checker = {
  id: "alternative-checker",
  label: "Generated-case predicate checker",
  run(input) {
    const supplied = input.cases[0];
    if (!supplied) throw Error("a supplied case is required");
    const extra = input.makeCase({ seed: (supplied.params.seed + 1) % 2147483648 });
    const cases = [...input.cases, extra];
    const failures: CheckerFailure[] = [];
    for (const c of cases)
      for (const rule of violations(input.runCase(c.id)))
        failures.push({ caseId: c.id, rule, detail: `observed ${rule}` });
    return {
      ok: !failures.length,
      failures,
      casesRun: cases.map((c) => c.id),
      subjectInvocations: cases.length,
    };
  },
};
export const alternative: Submission = {
  id: "alternative",
  label: "Indexed memory subject with generation-using predicate checker",
  subject,
  checker,
};
export { subject };
