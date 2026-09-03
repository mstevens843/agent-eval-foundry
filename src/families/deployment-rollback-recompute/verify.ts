import { requireShape } from "../../screens/rig-integrity.js";
import type { VerificationInput } from "./truth.js";

export const CHECKS = [
  "exactly_once",
  "committed_rollback_key_recovered",
  "liveness",
  "report_matches_controller_ledger",
  "local_confirmation_green",
] as const;

export interface Failure {
  readonly check: (typeof CHECKS)[number];
  readonly detail: string;
}

const failure = (check: Failure["check"], detail: string): Failure => ({ check, detail });

export function verify(value: unknown): readonly Failure[] {
  const top = requireShape(value, "verification", ["scenario", "reports", "calls", "effects"]);
  const scenario = requireShape(top["scenario"], "verification.scenario", ["intent", "params", "views"]);
  const intent = requireShape(scenario["intent"], "verification.scenario.intent", [
    "rollbackIntentId",
    "idempotencyKey",
    "releaseId",
    "regionId",
    "compensation",
  ]);
  if (!Array.isArray(top["reports"]) || !Array.isArray(top["calls"]) || !Array.isArray(top["effects"])) {
    throw new TypeError("verification reports, calls and effects must be arrays");
  }
  const input = value as VerificationInput;
  const rollbackIntentId = String(intent["rollbackIntentId"]);
  const stableKey = String(intent["idempotencyKey"]);
  const ownCalls = input.calls.filter((call) => call.rollbackIntentId === rollbackIntentId);
  const ownEffects = input.effects.filter((effect) => effect.rollbackIntentId === rollbackIntentId);
  const failures: Failure[] = [];
  const validOutcomes = new Set(["compensated"]);

  if (ownEffects.length !== 1) {
    failures.push(
      failure(
        "exactly_once",
        `controller ledger contains ${ownEffects.length} compensation effects for ${rollbackIntentId}`,
      ),
    );
  }
  if (ownCalls.some((call) => call.request.idempotencyKey !== stableKey)) {
    failures.push(
      failure("committed_rollback_key_recovered", "a controller sent a key other than the committed key"),
    );
  }
  if (ownCalls.length === 0 || ownEffects.length === 0) {
    failures.push(failure("liveness", "no compensation effect was completed"));
  }
  if (
    input.reports.length !== input.scenario.views.length ||
    input.reports.some((report, index) => {
      const call = ownCalls[index];
      return (
        call === undefined ||
        report.rollbackIntentId !== call.rollbackIntentId ||
        report.controllerId !== call.controllerId ||
        report.authorityEpoch !== call.authorityEpoch ||
        report.idempotencyKey !== call.request.idempotencyKey
      );
    })
  ) {
    failures.push(
      failure(
        "report_matches_controller_ledger",
        "subject report contradicts the sealed controller call ledger",
      ),
    );
  }
  if (
    input.reports.some((report) => !validOutcomes.has(report.outcome) || report.controllerApplied !== true)
  ) {
    failures.push(failure("local_confirmation_green", "an attempt did not observe controller completion"));
  }
  return failures;
}
