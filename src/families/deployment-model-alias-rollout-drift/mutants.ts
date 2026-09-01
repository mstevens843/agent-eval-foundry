import { REFERENCE_OPTIONS, type ReferenceOptions, makeSubject } from "./reference.js";
import type { Subject } from "./types.js";

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
  "no-op-always-quarantine": "liveness",
  "always-continue": "quarantine_when_insufficient",
};
