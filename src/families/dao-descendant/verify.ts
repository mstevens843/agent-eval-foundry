import { requireShape } from "../../screens/rig-integrity.js";
import type { VerificationInput } from "./truth.js";

export const CHECKS = [
  "exactly_once",
  "stable_key_recovered",
  "liveness",
  "report_matches_call_ledger",
  "local_confirmation_green",
] as const;

export interface Failure {
  readonly check: (typeof CHECKS)[number];
  readonly detail: string;
}

const failure = (check: Failure["check"], detail: string): Failure => ({ check, detail });
const VALID_REPORT_OUTCOMES = new Set(["executed"]);

export function verify(value: unknown): readonly Failure[] {
  const top = requireShape(value, "verification", ["scenario", "reports", "calls", "effects"]);
  const scenario = requireShape(top["scenario"], "verification.scenario", ["intent", "params", "views"]);
  const intent = requireShape(scenario["intent"], "verification.scenario.intent", [
    "actionId",
    "idempotencyKey",
    "payload",
  ]);
  if (!Array.isArray(top["reports"]) || !Array.isArray(top["calls"]) || !Array.isArray(top["effects"])) {
    throw new TypeError("verification reports, calls and effects must be arrays");
  }
  const input = value as VerificationInput;
  const actionId = String(intent["actionId"]);
  const stableKey = String(intent["idempotencyKey"]);
  const ownCalls = input.calls.filter((call) => call.actionId === actionId);
  const ownEffects = input.effects.filter((effect) => effect.actionId === actionId);
  const failures: Failure[] = [];

  if (ownEffects.length !== 1) {
    failures.push(
      failure("exactly_once", `external ledger contains ${ownEffects.length} effects for ${actionId}`),
    );
  }
  if (ownCalls.some((call) => call.request.idempotencyKey !== stableKey)) {
    failures.push(failure("stable_key_recovered", "a worker sent a key other than the committed key"));
  }
  if (ownCalls.length === 0 || ownEffects.length === 0) {
    failures.push(failure("liveness", "no external effect was completed"));
  }
  if (
    input.reports.length !== input.scenario.views.length ||
    input.reports.some((report, index) => {
      const call = ownCalls[index];
      return (
        call === undefined ||
        report.actionId !== call.actionId ||
        report.workerId !== call.workerId ||
        report.leaseEpoch !== call.leaseEpoch ||
        report.idempotencyKey !== call.request.idempotencyKey
      );
    })
  ) {
    failures.push(failure("report_matches_call_ledger", "subject report contradicts the sealed call ledger"));
  }
  if (input.reports.some((report) => !VALID_REPORT_OUTCOMES.has(report.outcome) || report.toolOk !== true)) {
    failures.push(
      failure("local_confirmation_green", "an attempt did not observe a successful tool receipt"),
    );
  }
  return failures;
}
