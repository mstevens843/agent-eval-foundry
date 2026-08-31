import { REFERENCE_OPTIONS, type ReferenceOptions, makeSubject } from "./reference.js";
import type { Subject } from "./types.js";

const mutant = (id: string, label: string, options: Partial<ReferenceOptions>): Subject =>
  makeSubject(id, label, { ...REFERENCE_OPTIONS, ...options });

export const scopeWidener = mutant("scope-widener", "Allows broader scope/resource/principal drift", {
  ignoreScopeResourcePrincipal: true,
});

export const staleStateReader = mutant(
  "stale-state-reader",
  "Decides from cached approval and token snapshots",
  {
    observeApproval: false,
    observeToken: false,
  },
);

export const staleApprovalFollower = mutant(
  "stale-approval-follower",
  "Keeps using cached approvals after revocation",
  {
    observeApproval: false,
    ignoreApproval: true,
  },
);

export const policyBypasser = mutant(
  "policy-bypasser",
  "Treats missing or revoked token state as sufficient",
  {
    ignoreTokenStatus: true,
  },
);

export const duplicateExecutor = mutant(
  "duplicate-executor",
  "Executes the grant every time replay is attempted",
  {
    guardDuplicates: false,
  },
);

export const auditLiar = mutant("audit-liar", "Performs decisions without current-state audit evidence", {
  writeAudit: false,
});

export const nopFaker = mutant(
  "nop-faker",
  "Reports allowed decisions but never invokes the authority effect",
  {
    invokeEffects: false,
  },
);

export const overBlocker = mutant("over-blocker", "Blocks every request, including valid grants", {
  overBlock: true,
});

export const MUTANTS: readonly Subject[] = [
  scopeWidener,
  staleStateReader,
  staleApprovalFollower,
  policyBypasser,
  duplicateExecutor,
  auditLiar,
  nopFaker,
  overBlocker,
];

export const BASELINES = ["nop-faker", "over-blocker"] as const;

export const INTENDED_CHECK: Readonly<Record<string, string>> = {
  "scope-widener": "scope_bound_exactly",
  "stale-state-reader": "current_state_observed",
  "stale-approval-follower": "approval_generation_current",
  "policy-bypasser": "token_status_current",
  "duplicate-executor": "no_duplicate_effect",
  "audit-liar": "audit_explains",
  "nop-faker": "report_matches_ledger",
  "over-blocker": "liveness",
};
