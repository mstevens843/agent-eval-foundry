// Bridges a concluded Phase 21 matched-pair experiment into a `HardnessOperatorEvidence`-shaped
// record, per Lane 0's decision: hardness-ledger.ts stays the retrospective summary layer; Phase 21's
// schema is the prospective, machine-checkable one. This keeps the two linked rather than forked.

import type { HardnessOperatorEvidence, OperatorConfidence } from "../foundry/hardness-ledger.js";
import type { OperatorTreatment } from "./operator-schema.js";
import type { McNemarResult, StoppingDecision } from "./stopping-rule.js";

export interface ExperimentSummaryForLedger {
  readonly operator: OperatorTreatment;
  readonly familyId: string;
  readonly baselineCount: number;
  readonly treatedCount: number;
  readonly mcNemar: McNemarResult;
  readonly stoppingRule: StoppingDecision;
  readonly provenance: readonly string[];
  readonly extractedOn: string;
  /**
   * Distinguishes which phase's methodology produced this record, so a later phase re-measuring the
   * SAME operator/family pair under a different (e.g. held-out-envelope) protocol adds a new ledger
   * entry instead of silently overwriting an earlier one under an identical id. Defaults to "phase21"
   * so every pre-existing call site (and its exact-id test assertion) is unaffected.
   */
  readonly phaseLabel?: string;
}

const confidenceFor = (stoppingRule: StoppingDecision, mcNemar: McNemarResult): OperatorConfidence => {
  if (stoppingRule.kind === "stop-uplift") return "high";
  if (stoppingRule.kind === "stop-null" && mcNemar.concordant > 0) return "medium";
  return "low";
};

export function toHardnessOperatorEvidence(summary: ExperimentSummaryForLedger): HardnessOperatorEvidence {
  const { operator, mcNemar, stoppingRule } = summary;
  const countable = stoppingRule.kind === "stop-uplift" || stoppingRule.kind === "stop-null";
  return {
    id: `${summary.phaseLabel ?? "phase21"}-${operator.id}-${summary.familyId}`,
    category: "difficulty",
    name: operator.causalClaim,
    changed: operator.constructionDelta,
    stayedFixed: operator.staysFixed,
    beforeEvidence: `baseline arm: ${summary.baselineCount} units`,
    afterEvidence: `treated arm: ${summary.treatedCount} units; McNemar exact p=${mcNemar.pValueTwoSided.toFixed(4)} (discordant treated-wins=${mcNemar.discordantTreatedWins}, baseline-wins=${mcNemar.discordantBaselineWins}, concordant=${mcNemar.concordant})`,
    measurementStatus: "measured",
    fairnessOutcome:
      "Matched pair mechanically confirmed diffable (assertMatchedPairDiffable); every declared field outside the operator's own shapeFieldsEdited held identical between arms.",
    verifierIntegrityEffect:
      "n/a — this operator changes scenario selection or a shape field, not verifier logic itself.",
    solveRateEffect: {
      countable,
      before: countable ? String(summary.baselineCount) : null,
      after: countable ? String(summary.treatedCount) : null,
      note: stoppingRule.reason,
    },
    capabilityAttribution: countable
      ? "measures mutant/mechanism detection under matched selection, not agent capability directly — see reports/PHASE-21-OPERATOR-CAUSAL-LAB.md for the honesty split"
      : `not yet resolved: ${stoppingRule.reason}`,
    provenance: summary.provenance,
    confidence: confidenceFor(stoppingRule, mcNemar),
  };
}
