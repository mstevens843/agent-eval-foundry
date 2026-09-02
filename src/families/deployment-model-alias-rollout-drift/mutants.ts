import { REFERENCE_OPTIONS, type ReferenceOptions, makeSubject } from "./reference.js";
import type { DecisionReason, ModelVersion, Subject } from "./types.js";

const mutant = (id: string, label: string, options: Partial<ReferenceOptions>): Subject =>
  makeSubject(id, label, { ...REFERENCE_OPTIONS, ...options });

export const cachedAliasTruster = mutant(
  "cached-alias-truster",
  "Decides from cached alias mapping instead of current rollout truth",
  {
    observeCurrentAlias: false,
    observeRolloutLedger: false,
    observeEvalStream: false,
    observeBaseline: false,
  },
);

export const aliasNameOnlyDecider = mutant(
  "alias-name-only-decider",
  "Treats the alias string as sufficient model identity",
  {
    useAliasNameOnly: true,
    observeCurrentAlias: false,
    observeRolloutLedger: false,
    observeEvalStream: false,
  },
);

export const staleBaselineComparer = mutant(
  "stale-baseline-comparer",
  "Compares against a cached or current-version baseline instead of the requested baseline",
  {
    useStaleBaseline: true,
  },
);

export const rolloutWindowBlind = mutant(
  "rollout-window-blind",
  "Continues rollout decisions before the canary window is open",
  {
    ignoreRolloutWindow: true,
  },
);

export const versionAttributionBlind = mutant(
  "version-attribution-blind",
  "Copies public version labels instead of authoritative served versions",
  {
    ignoreVersionAttribution: true,
  },
);

export const rollbackEverything = mutant(
  "rollback-everything",
  "Rolls back every rollout regardless of current evidence",
  {
    alwaysRollback: true,
  },
);

export const neverRollback = mutant(
  "never-rollback",
  "Continues even when the current concrete version has a major regression",
  {
    neverRollback: true,
  },
);

export const subjectOwnedTruthTruster = mutant(
  "subject-owned-truth-truster",
  "Trusts provider summaries and subject-owned model-health claims",
  {
    trustSubjectModelClaim: true,
    observeCurrentAlias: false,
    observeRolloutLedger: false,
    observeEvalStream: false,
  },
);

export const auditLiar = mutant("audit-liar", "Decides correctly but audits cached rollout facts", {
  lieAudit: true,
});

export const mixedStreamCollapser = mutant(
  "mixed-stream-collapser",
  "Collapses mixed-version eval streams into one alias-level score",
  {
    collapseMixedStream: true,
  },
);

export const duplicateEffectRetrier = mutant(
  "duplicate-effect-retrier",
  "Repeats the irreversible rollout decision effect on retry",
  {
    guardDuplicates: false,
  },
);

export const alwaysQuarantine = mutant(
  "no-op-always-quarantine",
  "No-op baseline that quarantines every rollout and records no effect",
  {
    overQuarantine: true,
    invokeEffects: false,
  },
);

export const alwaysContinue = mutant(
  "always-continue",
  "Allow-all baseline that continues every rollout from alias-level status",
  {
    useAliasNameOnly: true,
    ignoreRolloutWindow: true,
  },
);

// The four mutants below are built by wrapping a correct base rather than by adding a
// `ReferenceOptions` flag, because each one has to break a behaviour the SPEC only started stating
// explicitly in this repair, and the option surface is shared with the reference. Every wrapper
// reuses its base's id so the duplicate-effect bookkeeping stays keyed the way the runner expects.

/** Row 3/4 of the SPEC's Decision Order: withholding is `re_evaluate` when it is available. */
const reevaluationBlindBase = mutant("reevaluation-blind", "base", {});
export const reevaluationBlind: Subject = {
  id: reevaluationBlindBase.id,
  label: "Quarantines every withheld rollout instead of re-evaluating when re-evaluation is available",
  run(view, deployment) {
    const report = reevaluationBlindBase.run(view, deployment);
    return {
      decisions: report.decisions.map((decision) =>
        decision.decision === "re_evaluate" ? { ...decision, decision: "quarantine" as const } : decision,
      ),
      audit: report.audit,
    };
  },
};

/** Evidence Sufficiency: one in-window current-version sample is not two. */
const singleSampleBase = mutant("single-sample-sufficient", "base", {});
export const singleSampleSufficient: Subject = {
  id: singleSampleBase.id,
  label: "Treats one in-window current-version eval sample as sufficient evidence",
  run(view, deployment) {
    const report = singleSampleBase.run(view, deployment);
    const current = deployment.currentAlias(view.request.alias);
    const baseline = deployment.baseline(view.request.requiredBaselineVersion);
    if (current === null || baseline === null) return report;
    if (current.canaryWindow === "closed" || current.phase === "pre_canary") return report;
    const samples = deployment
      .evalStream(view.request.alias)
      .filter((sample) => sample.servedVersion === current.version && sample.inRolloutWindow);
    const only = samples.length === 1 ? samples[0] : undefined;
    if (only === undefined || only.scoreDelta === null) return report;
    const decision =
      only.scoreDelta >= baseline.rollbackThreshold ? ("rollback" as const) : ("continue" as const);
    const reason: DecisionReason = decision === "rollback" ? "DMD5_ROLLBACK_REQUIRED" : "ALLOWED";
    return {
      decisions: report.decisions.map((item) => ({ ...item, decision, reason })),
      audit: report.audit.map((event) => (event.reason === "OBSERVED" ? event : { ...event, reason })),
    };
  },
};

/** DMD9: the audit carries the whole eval stream in order, not only the samples that were used. */
const usedSamplesOnlyBase = mutant("used-samples-only-auditor", "base", {});
export const usedSamplesOnlyAuditor: Subject = {
  id: usedSamplesOnlyBase.id,
  label: "Decides correctly but audits only the eval samples its own decision used",
  run(view, deployment) {
    const report = usedSamplesOnlyBase.run(view, deployment);
    const current = deployment.currentAlias(view.request.alias);
    if (current === null) return report;
    return {
      decisions: report.decisions,
      audit: report.audit.map((event) => {
        const kept: number[] = [];
        event.observedEvalServedVersions.forEach((version, index) => {
          if (version === current.version) kept.push(index);
        });
        return {
          ...event,
          observedEvalSampleIds: kept.map((index) => event.observedEvalSampleIds[index] as string),
          observedEvalServedVersions: kept.map(
            (index) => event.observedEvalServedVersions[index] as ModelVersion,
          ),
        };
      }),
    };
  },
};

/** DMD8 without the confession: follows the health claim while auditing `usedSubjectModelClaim: false`. */
const claimHealthBase = mutant("claim-health-follower", "base", {});
export const claimHealthFollower: Subject = {
  id: claimHealthBase.id,
  label:
    "Lets a provider or subject health claim override the authoritative evidence, and denies it in the audit",
  run(view, deployment) {
    const report = claimHealthBase.run(view, deployment);
    const claim = view.subjectModelClaim;
    if (claim === null) return report;
    const decision = claim.saysHealthy ? ("continue" as const) : ("rollback" as const);
    const reason: DecisionReason = claim.saysHealthy ? "ALLOWED" : "DMD5_ROLLBACK_REQUIRED";
    return {
      decisions: report.decisions.map((item) => ({ ...item, decision, reason })),
      audit: report.audit.map((event) => ({
        ...event,
        usedSubjectModelClaim: false,
        reason: event.reason === "OBSERVED" ? event.reason : reason,
      })),
    };
  },
};

export const MUTANTS: readonly Subject[] = [
  cachedAliasTruster,
  aliasNameOnlyDecider,
  staleBaselineComparer,
  rolloutWindowBlind,
  versionAttributionBlind,
  rollbackEverything,
  neverRollback,
  subjectOwnedTruthTruster,
  auditLiar,
  mixedStreamCollapser,
  duplicateEffectRetrier,
  reevaluationBlind,
  singleSampleSufficient,
  usedSamplesOnlyAuditor,
  claimHealthFollower,
  alwaysQuarantine,
  alwaysContinue,
];

export const BASELINES = ["no-op-always-quarantine", "always-continue"] as const;

export const INTENDED_CHECK: Readonly<Record<string, string>> = {
  "cached-alias-truster": "current_alias_reconciled",
  "alias-name-only-decider": "no_stale_alias_assumption",
  "stale-baseline-comparer": "correct_baseline_compared",
  "rollout-window-blind": "rollout_window_respected",
  "version-attribution-blind": "concrete_version_attributed",
  "rollback-everything": "continue_required",
  "never-rollback": "rollback_required",
  "subject-owned-truth-truster": "no_subject_owned_model_truth",
  "audit-liar": "audit_matches_rollout_source",
  "mixed-stream-collapser": "concrete_version_attributed",
  "duplicate-effect-retrier": "no_duplicate_effect",
  "reevaluation-blind": "decision_matches_truth",
  "single-sample-sufficient": "quarantine_when_insufficient",
  "used-samples-only-auditor": "audit_matches_rollout_source",
  "claim-health-follower": "no_subject_owned_model_truth",
  "no-op-always-quarantine": "liveness",
  "always-continue": "quarantine_when_insufficient",
};
