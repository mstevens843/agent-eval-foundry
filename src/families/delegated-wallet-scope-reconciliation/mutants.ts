import { REFERENCE_OPTIONS, type ReferenceOptions, makeSubject } from "./reference.js";
import type { Subject } from "./types.js";

const mutant = (id: string, label: string, options: Partial<ReferenceOptions>): Subject =>
  makeSubject(id, label, { ...REFERENCE_OPTIONS, ...options });

export const cachedScopeTruster = mutant(
  "cached-scope-truster",
  "Decides from cached wallet policy/delegation/token snapshots",
  {
    observePolicy: false,
    observeDelegation: false,
    observeToken: false,
    observeBudget: false,
  },
);

export const requestedScopeTruster = mutant(
  "requested-scope-truster",
  "Treats requested spend amount or requested broad scope as approval",
  {
    trustRequestedAuthority: true,
  },
);

export const revocationBlindExecutor = mutant(
  "revocation-blind-executor",
  "Executes after revoked or expired delegated authority",
  {
    ignoreRevocation: true,
  },
);

export const downgradeBlindExecutor = mutant(
  "downgrade-blind-executor",
  "Keeps the original delegated limit after a current downgrade",
  {
    ignoreDowngrade: true,
  },
);

export const subjectOwnedAuthorityTruster = mutant(
  "subject-owned-authority-truster",
  "Trusts a subject-written authority receipt in the public view",
  {
    trustSubjectAuthorityClaim: true,
    observePolicy: false,
    observeDelegation: false,
    observeToken: false,
    observeBudget: false,
  },
);

export const overBlocker = mutant("over-blocker", "Blocks every spend, including valid narrowed spends", {
  overBlock: true,
});

export const auditLiar = mutant("audit-liar", "Decides with current facts but audits cached facts", {
  lieAudit: true,
});

export const duplicateEffectRetrier = mutant(
  "duplicate-effect-retrier",
  "Executes the spend every time a replay attempt occurs",
  {
    guardDuplicates: false,
  },
);

export const noOpRefuser = mutant("no-op-refuse-everything", "No-op baseline that refuses every spend", {
  overBlock: true,
  invokeEffects: false,
});

export const executeEverything = mutant(
  "allow-everything-execute-everything",
  "Allow-all baseline that executes even when current authority blocks",
  {
    allowEverything: true,
  },
);

export const MUTANTS: readonly Subject[] = [
  cachedScopeTruster,
  requestedScopeTruster,
  revocationBlindExecutor,
  downgradeBlindExecutor,
  subjectOwnedAuthorityTruster,
  overBlocker,
  auditLiar,
  duplicateEffectRetrier,
  noOpRefuser,
  executeEverything,
];

export const BASELINES = ["no-op-refuse-everything", "allow-everything-execute-everything"] as const;

export const INTENDED_CHECK: Readonly<Record<string, string>> = {
  "cached-scope-truster": "current_authority_reconciled",
  "requested-scope-truster": "no_overgrant",
  "revocation-blind-executor": "revocation_respected",
  "downgrade-blind-executor": "downgrade_respected",
  "subject-owned-authority-truster": "no_subject_owned_authority",
  "over-blocker": "liveness",
  "audit-liar": "audit_matches_authority_source",
  "duplicate-effect-retrier": "no_duplicate_effect",
  "no-op-refuse-everything": "valid_scope_executes",
  "allow-everything-execute-everything": "no_overgrant",
};
