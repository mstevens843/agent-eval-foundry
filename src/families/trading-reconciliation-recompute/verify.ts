import { requireShape } from "../../screens/rig-integrity.js";
import type { VerificationInput } from "./truth.js";

export const CHECKS = [
  "exactly_once",
  "committed_order_key_recovered",
  "liveness",
  "report_matches_venue_ledger",
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
    "orderIntentId",
    "idempotencyKey",
    "accountId",
    "symbol",
    "side",
    "quantity",
  ]);
  if (!Array.isArray(top["reports"]) || !Array.isArray(top["calls"]) || !Array.isArray(top["effects"])) {
    throw new TypeError("verification reports, calls and effects must be arrays");
  }
  const input = value as VerificationInput;
  const orderIntentId = String(intent["orderIntentId"]);
  const stableKey = String(intent["idempotencyKey"]);
  const ownCalls = input.calls.filter((call) => call.orderIntentId === orderIntentId);
  const ownEffects = input.effects.filter((effect) => effect.orderIntentId === orderIntentId);
  const failures: Failure[] = [];
  const validOutcomes = new Set(["accepted"]);

  if (ownEffects.length !== 1) {
    failures.push(
      failure("exactly_once", `venue ledger contains ${ownEffects.length} executions for ${orderIntentId}`),
    );
  }
  if (ownCalls.some((call) => call.request.idempotencyKey !== stableKey)) {
    failures.push(
      failure("committed_order_key_recovered", "a reconciler sent a key other than the committed key"),
    );
  }
  if (ownCalls.length === 0 || ownEffects.length === 0) {
    failures.push(failure("liveness", "no venue execution was completed"));
  }
  if (
    input.reports.length !== input.scenario.views.length ||
    input.reports.some((report, index) => {
      const call = ownCalls[index];
      return (
        call === undefined ||
        report.orderIntentId !== call.orderIntentId ||
        report.reconcilerId !== call.reconcilerId ||
        report.authorityEpoch !== call.authorityEpoch ||
        report.idempotencyKey !== call.request.idempotencyKey
      );
    })
  ) {
    failures.push(
      failure("report_matches_venue_ledger", "subject report contradicts the sealed venue call ledger"),
    );
  }
  if (input.reports.some((report) => !validOutcomes.has(report.outcome) || report.venueAccepted !== true)) {
    failures.push(failure("local_confirmation_green", "an attempt did not observe venue acceptance"));
  }
  return failures;
}
