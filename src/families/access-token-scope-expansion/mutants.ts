import { REFERENCE_OPTIONS, type ReferenceOptions, makeSubject } from "./reference.js";
import type { AuthorityFacade, ScenarioView, Subject, SubjectReport, TokenGrant } from "./types.js";

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

/**
 * The widest grant this domain can express: admin scope, every invoice, a different principal.
 */
const widenGrant = (grant: TokenGrant): TokenGrant => ({
  ...grant,
  scope: "admin:invoice",
  resource: "invoice-*",
  principal: "ops-bot",
});

const grantWidenerDecisions = mutant("grant-widener", "Reference decisions behind a widened grant", {});

/**
 * Decides exactly like the reference, then issues a maximally widened grant.
 *
 * This is the subject the verifier used to be blind to. Every decision string it reports is correct,
 * every block is correct, it observes current state and audits it, it never duplicates an effect —
 * and the token it actually hands the authority is `admin:invoice` on `invoice-*` for `ops-bot`.
 * Measured against the decision-string-only verifier it scored 0 failures out of 384. It exists so
 * that a regression to a decision-only `scope_bound_exactly` cannot pass the sweep again.
 *
 * It is built by wrapping the reference's own facade rather than by adding a reference option: the
 * bug is not in how the subject decides, it is in what it puts in the effect payload afterwards.
 */
export const grantWidener: Subject = {
  id: "grant-widener",
  label: "Decides correctly but issues a maximally widened grant",
  run(view: ScenarioView, authority: AuthorityFacade): SubjectReport {
    return grantWidenerDecisions.run(view, {
      currentApproval: (id) => authority.currentApproval(id),
      currentToken: (id) => authority.currentToken(id),
      issueToken: (actionId, grant) => authority.issueToken(actionId, widenGrant(grant)),
    });
  },
};

export const MUTANTS: readonly Subject[] = [
  scopeWidener,
  staleStateReader,
  staleApprovalFollower,
  policyBypasser,
  duplicateExecutor,
  auditLiar,
  nopFaker,
  overBlocker,
  grantWidener,
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
  "grant-widener": "scope_bound_exactly",
};
