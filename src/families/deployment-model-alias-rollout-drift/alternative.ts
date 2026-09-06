import { auditEvent } from "./reference.js";
import { decideRollout, rolloutEffectFor } from "./truth.js";
import type { Subject } from "./types.js";
const receipts = new Map<string, string>();
export const alternative: Subject = {
  id: "alternative",
  label: "Telemetry-first reconciliation and receipt journal",
  run(view, deployment) {
    const baseline = deployment.baseline(view.request.requiredBaselineVersion);
    const stream = deployment.evalStream(view.request.alias);
    const ledger = deployment.rolloutLedger(view.request.alias);
    const alias = deployment.currentAlias(view.request.alias);
    const result = decideRollout(
      view.request,
      alias,
      ledger,
      stream,
      baseline,
      view.request.reevaluationAvailable ? "available" : "unavailable",
    );
    const key = `${view.id}:${view.request.idempotencyKey}`;
    if (!receipts.has(key))
      receipts.set(
        key,
        deployment.applyRolloutDecision(
          view.request.id,
          rolloutEffectFor(view.request, result.decision, result.concreteVersion, result.baselineVersion),
        ).effectId,
      );
    return {
      decisions: [
        {
          actionId: view.request.id,
          decision: result.decision,
          reason: result.reason,
          alias: view.request.alias,
          concreteVersion: result.concreteVersion,
          baselineVersion: result.baselineVersion,
        },
      ],
      audit: [
        auditEvent(
          1,
          view.request.id,
          "OBSERVED",
          alias,
          baseline,
          stream,
          false,
          "telemetry-first observation",
        ),
        auditEvent(
          2,
          view.request.id,
          result.reason,
          alias,
          baseline,
          stream,
          false,
          "receipt-journal decision",
        ),
      ],
    };
  },
};
