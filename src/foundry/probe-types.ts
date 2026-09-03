// The probe vocabulary, extracted as a seam so that reading a probe's RESULT does not require
// loading the 1,839-line runner that produces one.
//
// WHY THIS FILE EXISTS. Phases 5 and 6 both reported that net lines rose and that no deletion path
// existed, and Phase 6 measured why: `probe-runner.ts` had 23 live exports across fifteen importers,
// so "delete it" was not an actionable instruction. The coupling map (`scripts/coupling-map.mjs`)
// then showed the shape of the problem was much smaller than the count suggested -- SEVEN of ten
// non-barrel `src` importers needed nothing but `ProbeResult` or `ProbeRunSummary`, both of which are
// pure types. Four of those seven are `src/spec-probe/*`, a module with no connection to running
// probes at all.
//
// The load-bearing finding, and the one Phase 7 was asked to settle: `src/foundry/promotion.ts`
// depends on this vocabulary through `import type` alone. THE PROMOTION VALIDATOR NEVER RAN A LIVE
// PROBE. It accepts a `ProbeRunSummary` a caller hands it, which means the largest reason given for
// keeping the runner alive was never true. Nothing has to be rewritten to break that dependency;
// it only had to be looked at.
//
// This file therefore holds the declarations and nothing else -- no runner, no probe bank, no
// execution. Importers that only needed to describe a probe result now depend on this instead.

import type { EvidenceCost } from "./adaptive-funnel.js";
import type { DiscoveryTruthSource } from "./discovery-workbench.js";

export const PROBE_VERDICTS = [
  "promote_to_task_shape",
  "needs_repair",
  "kill_unfair",
  "kill_no_truth_source",
  "kill_self_verifiable",
  "kill_wording_only",
  "hold_needs_transfer",
  "evolve_existing",
  "transfer_existing",
] as const;
export type ProbeVerdict = (typeof PROBE_VERDICTS)[number];
export type ProbePromotionDecision = ProbeVerdict;

export const PROBE_SUBJECT_KINDS = ["reference", "baseline", "known-bad"] as const;
export type ProbeSubjectKind = (typeof PROBE_SUBJECT_KINDS)[number];

export const PROBE_STRATEGIES = [
  "reference",
  "guess-success",
  "status-only",
  "stale-reader",
  "duplicate-executor",
  "audit-liar",
  "scope-widener",
  "cached-scope-truster",
  "requested-scope-truster",
  "revocation-blind-executor",
  "over-blocker",
  "no-op",
  "cached-alias-truster",
  "alias-name-only-decider",
  "stale-baseline-comparer",
  "rollback-everything",
  "never-rollback",
  "cached-router-truster",
  "provider-name-only-decider",
  "receipt-blind-rollbacker",
  "always-failback",
  "never-failback",
  "ledger-disagreement-flattener",
  "audit-router-liar",
  "always-quarantine",
] as const;
export type ProbeStrategy = (typeof PROBE_STRATEGIES)[number];

export interface ProbeExpectedBehavior {
  readonly decision: "execute" | "block" | "reconcile" | "retry" | "wait" | "no-bypass";
  readonly authority: string;
  readonly requiredEffects: readonly string[];
  readonly forbiddenEffects: readonly string[];
  readonly requiredAudit: readonly string[];
  readonly maxEffectCount: number;
  readonly mustUseCurrentState: boolean;
  readonly mustPreserveLiveness: boolean;
  readonly mustPreserveProvenance: boolean;
}

export interface RunnerProbeScenario {
  readonly id: string;
  readonly publicSetup: string;
  readonly hiddenBehaviorSketch: string;
  readonly knobs: Readonly<Record<string, string>>;
  readonly expected: ProbeExpectedBehavior;
}

export interface ProbeSubject {
  readonly id: string;
  readonly kind: ProbeSubjectKind;
  readonly strategy: ProbeStrategy;
  readonly label: string;
  readonly intendedChecks: readonly string[];
}

export interface ProbeDefinition {
  readonly id: string;
  readonly mechanismId: string;
  readonly candidateId: string;
  readonly domain: string;
  readonly hypothesis: string;
  readonly visibleRuleSketch: readonly string[];
  readonly hiddenBehaviorSketch: string;
  readonly authoritativeTruthSource: DiscoveryTruthSource;
  readonly scenarios: readonly RunnerProbeScenario[];
  readonly subjects: readonly ProbeSubject[];
  readonly expectedBadBehaviors: readonly string[];
  readonly cheapVerifierChecks: readonly string[];
  readonly baselineExpectations: readonly string[];
  readonly promotionCriteria: readonly string[];
  readonly killCriteria: readonly string[];
  readonly estimatedCost: {
    readonly evidence: EvidenceCost;
    readonly engineerHours: number;
    readonly usd: number;
  };
  readonly transferTargets: readonly string[];
  readonly preferredVerdict: ProbeVerdict;
}

export interface ProbeTrace {
  readonly decision: ProbeExpectedBehavior["decision"] | "bypass";
  readonly authority: string;
  readonly effects: readonly string[];
  readonly audit: readonly string[];
  readonly usedCurrentState: boolean;
  readonly livenessPreserved: boolean;
  readonly provenancePreserved: boolean;
}

export interface ProbeCell {
  readonly probeId: string;
  readonly scenarioId: string;
  readonly subjectId: string;
  readonly failedChecks: readonly string[];
  readonly trace: ProbeTrace;
}

export interface ProbeSubjectResult {
  readonly subjectId: string;
  readonly kind: ProbeSubjectKind;
  readonly intendedChecks: readonly string[];
  readonly failedChecks: readonly string[];
  readonly caughtByIntendedChecks: boolean;
}

export interface ProbeResult {
  readonly probeId: string;
  readonly candidateId: string;
  readonly mechanismId: string;
  readonly domain: string;
  readonly scenarioCount: number;
  readonly subjectCount: number;
  readonly cells: readonly ProbeCell[];
  readonly subjectResults: readonly ProbeSubjectResult[];
  readonly referencePassed: boolean;
  readonly badSubjectsCaught: number;
  readonly badSubjectsTotal: number;
  readonly baselineSubjectsCaught: number;
  readonly baselineSubjectsTotal: number;
  readonly distinctFailedChecks: readonly string[];
  readonly verdict: ProbeVerdict;
  readonly cheapestNextStep: EvidenceCost;
  readonly promotionReason: string;
  readonly transferTargets: readonly string[];
  readonly estimatedCost: ProbeDefinition["estimatedCost"];
}

export interface ProbeRunSummary {
  readonly probes: readonly ProbeResult[];
  readonly promoted: readonly ProbeResult[];
  readonly needsRepair: readonly ProbeResult[];
  readonly held: readonly ProbeResult[];
  readonly killed: readonly ProbeResult[];
  readonly totalScenarios: number;
  readonly totalBadSubjectsCaught: number;
  readonly totalBadSubjects: number;
  readonly expectedBuildHoursForPromoted: number;
  readonly expectedProbeUsd: number;
}
