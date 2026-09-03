import type { EvidenceCost } from "./adaptive-funnel.js";
import type {
  DiscoveryCandidate,
  DiscoveryCandidateEvidence,
  DiscoveryKnobSketch,
  DiscoveryTaskShapeDraft,
  DiscoveryTruthSource,
  DiscoveryWorkbench,
} from "./discovery-workbench.js";
import type { Registry } from "./registry.js";
import { fail, id, mustExist, uniqueIds } from "./schema.js";

// The probe vocabulary now lives in `probe-types.ts` so that importers which only describe a
// result do not have to load this runner. Re-exported here so every existing consumer of this
// module keeps working unchanged: the seam is additive, and nothing had to be rewritten.
export * from "./probe-types.js";
import type {
  ProbeCell,
  ProbeDefinition,
  ProbeExpectedBehavior,
  ProbeResult,
  ProbeRunSummary,
  ProbeStrategy,
  ProbeSubject,
  ProbeSubjectKind,
  ProbeSubjectResult,
  ProbeTrace,
  ProbeVerdict,
  RunnerProbeScenario,
} from "./probe-types.js";
import { PROBE_STRATEGIES, PROBE_SUBJECT_KINDS, PROBE_VERDICTS } from "./probe-types.js";

const truth = (name: string, whatItSettles: string): DiscoveryTruthSource => ({
  name,
  whatItSettles,
  whyIndependent: "The probe checker owns this authority and subjects receive only declared observations.",
});

const expected = (
  decision: ProbeExpectedBehavior["decision"],
  authority: string,
  requiredEffects: readonly string[],
  requiredAudit: readonly string[],
  extras: Partial<ProbeExpectedBehavior> = {},
): ProbeExpectedBehavior => ({
  decision,
  authority,
  requiredEffects,
  forbiddenEffects: extras.forbiddenEffects ?? [],
  requiredAudit,
  maxEffectCount: extras.maxEffectCount ?? requiredEffects.length,
  mustUseCurrentState: extras.mustUseCurrentState ?? true,
  mustPreserveLiveness: extras.mustPreserveLiveness ?? true,
  mustPreserveProvenance: extras.mustPreserveProvenance ?? true,
});

const scenario = (
  idValue: string,
  publicSetup: string,
  hiddenBehaviorSketch: string,
  knobs: Readonly<Record<string, string>>,
  behavior: ProbeExpectedBehavior,
): RunnerProbeScenario => ({
  id: idValue,
  publicSetup,
  hiddenBehaviorSketch,
  knobs,
  expected: behavior,
});

const subject = (
  idValue: string,
  kind: ProbeSubjectKind,
  strategy: ProbeStrategy,
  intendedChecks: readonly string[],
  label: string,
): ProbeSubject => ({ id: idValue, kind, strategy, intendedChecks, label });

const commonSubjects = (specific: readonly ProbeSubject[]): readonly ProbeSubject[] => [
  subject("reference", "reference", "reference", [], "reference-like expected behavior"),
  ...specific,
];

function defineProbe(input: Omit<ProbeDefinition, "id">): ProbeDefinition {
  return { ...input, id: `${input.candidateId}-probe` };
}

export const EXECUTABLE_PROBES: readonly ProbeDefinition[] = [
  defineProbe({
    mechanismId: "model-alias-drift",
    candidateId: "deployment-model-alias-rollout-drift",
    domain: "deployment rollback",
    hypothesis:
      "Agents approve a rollout for one model alias target and execute after the alias resolves to a different model.",
    visibleRuleSketch: [
      "Approval binds to the resolved model generation, not only the alias name.",
      "A rollout must recheck the registry when the alias generation changes.",
    ],
    hiddenBehaviorSketch:
      "Probe cases vary alias generation, rollout timing and rollback health state inside the public registry model.",
    authoritativeTruthSource: truth(
      "model registry generation ledger",
      "Which model generation an alias resolved to at approval and rollout time.",
    ),
    scenarios: [
      scenario(
        "alias-stable",
        "Alias resolves to generation g1 during approval and rollout; in-window evals are healthy.",
        "No alias drift occurs.",
        { alias: "stable", generation: "g1", window: "open", expected_decision: "continue" },
        expected(
          "execute",
          "model-rollout-ledger",
          ["continue-g1"],
          ["approved-generation", "served-version", "baseline-version"],
        ),
      ),
      scenario(
        "alias-drifts-before-rollout",
        "Alias is approved at g1 and resolves to g2 before rollout.",
        "Final rollout target differs from the approved generation.",
        { alias: "drift", generation: "g1-to-g2", window: "open", expected_decision: "quarantine" },
        expected(
          "block",
          "model-rollout-ledger",
          [],
          ["approved-generation", "served-version", "blocked-generation-drift"],
          {
            forbiddenEffects: ["continue-g2"],
          },
        ),
      ),
      scenario(
        "alias-drifts-after-health-fail",
        "Alias changes and the health ledger marks g2 unhealthy.",
        "The current registry and health authority both reject rollout.",
        { alias: "drift", health: "unhealthy", window: "open", expected_decision: "rollback" },
        expected(
          "block",
          "model-rollout-ledger",
          ["rollback-g2"],
          ["served-version", "baseline-version", "health-generation"],
          {
            forbiddenEffects: ["continue-g2"],
          },
        ),
      ),
      scenario(
        "mixed-stream-current-healthy",
        "Eval stream contains both g1 and g2 results; only concrete g2 in-window samples govern current rollout.",
        "Alias-level aggregation would mix old and new model outcomes.",
        { alias: "drift", stream: "mixed", window: "open", expected_decision: "continue" },
        expected(
          "execute",
          "model-rollout-ledger",
          ["continue-g2"],
          ["served-version", "baseline-version", "mixed-stream"],
        ),
      ),
      scenario(
        "closed-canary-window",
        "Alias resolves to g2, but the canary window is closed.",
        "Healthy-looking samples are outside the permitted rollout window.",
        { alias: "drift", generation: "g1-to-g2", window: "closed", expected_decision: "re_evaluate" },
        expected("wait", "model-rollout-ledger", ["re-evaluate-g2"], ["served-version", "closed-window"], {
          forbiddenEffects: ["continue-g2", "rollback-g2"],
        }),
      ),
      scenario(
        "rollback-request-stale",
        "A rollback request references g1 after the alias has already moved to g2 with healthy evidence.",
        "The stale rollback request must not override current authoritative rollout state.",
        { alias: "drift", rollback: "stale", window: "complete", expected_decision: "continue" },
        expected(
          "execute",
          "model-rollout-ledger",
          ["continue-g2"],
          ["served-version", "baseline-version", "stale-rollback-ignored"],
        ),
      ),
    ],
    subjects: commonSubjects([
      subject(
        "cached-alias-truster",
        "known-bad",
        "cached-alias-truster",
        ["current_alias_reconciled", "no_stale_alias_assumption"],
        "binds rollout decisions to a cached alias map",
      ),
      subject(
        "alias-name-only-decider",
        "known-bad",
        "alias-name-only-decider",
        ["truth_source_used", "current_alias_reconciled"],
        "treats the alias string as model identity",
      ),
      subject(
        "stale-baseline-comparer",
        "known-bad",
        "stale-baseline-comparer",
        ["correct_baseline_compared", "audit_matches_rollout_source"],
        "compares rollout evals against a stale baseline",
      ),
      subject(
        "rollback-everything",
        "known-bad",
        "rollback-everything",
        ["liveness_bounded", "decision_matches_truth"],
        "rolls back every rollout instead of preserving valid continues",
      ),
      subject(
        "never-rollback",
        "known-bad",
        "never-rollback",
        ["rollback_uses_authoritative_ledger", "decision_matches_truth"],
        "continues even after authoritative current-version regression evidence",
      ),
      subject(
        "audit-liar",
        "baseline",
        "audit-liar",
        ["audit_matches_rollout_source", "audit_evidence_present"],
        "records a final status without served-version evidence",
      ),
    ]),
    expectedBadBehaviors: [
      "cached alias loyalty",
      "alias-name-only model identity",
      "stale baseline comparison",
      "rollback-everything liveness loss",
      "never rollback on bad current rollout",
      "audit without authoritative served-version evidence",
    ],
    cheapVerifierChecks: [
      "decision_matches_truth",
      "current_alias_reconciled",
      "no_stale_alias_assumption",
      "truth_source_used",
      "rollout_window_respected",
      "eval_result_version_attributed",
      "correct_baseline_compared",
      "rollback_uses_authoritative_ledger",
      "audit_matches_rollout_source",
      "liveness_bounded",
    ],
    baselineExpectations: [
      "status-only rollout is rejected",
      "alias-name-only rollout is rejected",
      "rollback-everything does not preserve liveness",
    ],
    promotionCriteria: [
      "Reference passes stable and drift cases.",
      "Alias-name, stale-cache, stale-baseline, rollback-everything, never-rollback and audit-liar subjects fail intended checks.",
      "Probe includes continue, rollback, quarantine/re-evaluate and mixed-stream cases.",
    ],
    killCriteria: [
      "If alias resolution is always immutable, the mechanism collapses to ordinary deployment approval.",
    ],
    estimatedCost: { evidence: "local", engineerHours: 3, usd: 0 },
    transferTargets: ["schema drift", "provider routing"],
    preferredVerdict: "promote_to_task_shape",
  }),
  defineProbe({
    mechanismId: "model-alias-drift",
    candidateId: "provider-failover-router-alias-drift",
    domain: "model-routing incident response",
    hypothesis:
      "Agents that handled model-alias rollout drift will still trust cached router state or provider labels when failover receipts and rollout ledgers disagree.",
    visibleRuleSketch: [
      "Alias identity is not routing truth.",
      "Current provider/model route must be reconciled from router receipts plus rollout/eval ledgers.",
      "Rollback and failback decisions target concrete provider/model routes, not alias names.",
      "A missing or delayed router receipt requires bounded quarantine rather than guessed continuation.",
      "Audit must preserve source disagreement instead of flattening it into a final status.",
    ],
    hiddenBehaviorSketch:
      "Probe cases vary failover timing, delayed router receipts, ledger disagreement, provider/model eval attribution and concrete rollback/failback targets inside the public router-ledger model.",
    authoritativeTruthSource: truth(
      "router receipt ledger",
      "Which provider/model route actually served each request and which rollback or failback target is currently authorized.",
    ),
    scenarios: [
      scenario(
        "failover-provider-b-clean-continue",
        "Alias `prod-chat` was cached on provider A, then router failover served provider B/model b2 with clean current evals.",
        "Cached route A is stale; router receipt B plus rollout/eval ledgers authorize continuing B.",
        {
          failoverTiming: "before_eval",
          routerReceiptDelay: "landed",
          fallbackProvider: "provider_b",
          ledgerDisagreement: "none",
          evalProviderMix: "all_current_b",
          rollbackTargetKind: "none",
          cachedRouteStaleness: "stale_provider_a",
          evidenceCompleteness: "complete",
          actionRequired: "continue",
        },
        expected(
          "execute",
          "router-receipt-ledger",
          ["continue-provider-b"],
          ["router-receipt", "rollout-ledger", "provider-model", "current-route"],
          { forbiddenEffects: ["continue-provider-a", "rollback-provider-b", "failback-provider-a"] },
        ),
      ),
      scenario(
        "late-receipt-provider-b-rollback",
        "The local alias cache still shows provider A, but a late router receipt proves provider B/model b2 served a major regression.",
        "Rollback must target provider B/model b2 after reconciling the late receipt.",
        {
          failoverTiming: "during_canary",
          routerReceiptDelay: "late_landed",
          fallbackProvider: "provider_b",
          ledgerDisagreement: "router_after_rollout",
          evalProviderMix: "current_b_bad",
          rollbackTargetKind: "provider_route",
          cachedRouteStaleness: "stale_provider_a",
          evidenceCompleteness: "complete",
          actionRequired: "rollback",
        },
        expected(
          "block",
          "router-receipt-ledger",
          ["rollback-provider-b"],
          ["router-receipt", "provider-model", "rollback-target", "ledger-disagreement"],
          { forbiddenEffects: ["continue-provider-b", "rollback-alias-route", "rollback-provider-a"] },
        ),
      ),
      scenario(
        "ledger-disagreement-quarantine",
        "Rollout ledger says provider A/model a1 is live, but router receipts show provider B/model b2 and eval evidence is incomplete.",
        "The contradiction must be preserved and traffic quarantined pending authoritative settlement.",
        {
          failoverTiming: "mid_request",
          routerReceiptDelay: "landed",
          fallbackProvider: "provider_b",
          ledgerDisagreement: "router_vs_rollout",
          evalProviderMix: "insufficient_current",
          rollbackTargetKind: "unknown",
          cachedRouteStaleness: "stale_provider_a",
          evidenceCompleteness: "partial",
          actionRequired: "quarantine",
        },
        expected(
          "wait",
          "router-receipt-ledger",
          ["quarantine-route"],
          ["router-receipt", "rollout-ledger", "ledger-disagreement", "insufficient-evidence"],
          { forbiddenEffects: ["continue-provider-a", "continue-provider-b", "failback-provider-a"] },
        ),
      ),
      scenario(
        "valid-failback-after-b-regression",
        "Provider B fallback regressed and the router receipt plus rollout ledger authorize failback to provider A/model a1.",
        "Failback is the live action because the current authoritative route says B is bad and A is still valid.",
        {
          failoverTiming: "after_fallback",
          routerReceiptDelay: "landed",
          fallbackProvider: "provider_b",
          ledgerDisagreement: "none",
          evalProviderMix: "current_b_bad_a_healthy",
          rollbackTargetKind: "provider_failback",
          cachedRouteStaleness: "fresh",
          evidenceCompleteness: "complete",
          actionRequired: "failback",
        },
        expected(
          "execute",
          "router-receipt-ledger",
          ["failback-provider-a"],
          ["router-receipt", "provider-model", "failback-target", "current-route"],
          { forbiddenEffects: ["continue-provider-b", "rollback-alias-route"] },
        ),
      ),
      scenario(
        "invalid-failback-cache-stale",
        "The cache says provider A was the previous stable route, but current router receipts show provider B/model b2 is healthy and failback is not authorized.",
        "The correct action is to continue provider B and reject cache-only failback.",
        {
          failoverTiming: "before_eval",
          routerReceiptDelay: "landed",
          fallbackProvider: "provider_b",
          ledgerDisagreement: "none",
          evalProviderMix: "current_b_clean",
          rollbackTargetKind: "none",
          cachedRouteStaleness: "stale_provider_a",
          evidenceCompleteness: "complete",
          actionRequired: "continue",
        },
        expected(
          "execute",
          "router-receipt-ledger",
          ["continue-provider-b"],
          ["router-receipt", "provider-model", "current-route"],
          { forbiddenEffects: ["failback-provider-a", "rollback-alias-route"] },
        ),
      ),
      scenario(
        "mixed-provider-eval-attribution",
        "The eval stream contains provider A/model a1 and provider B/model b2 samples under the same alias.",
        "Only current provider B/model b2 samples govern the current route decision.",
        {
          failoverTiming: "during_eval",
          routerReceiptDelay: "landed",
          fallbackProvider: "provider_b",
          ledgerDisagreement: "none",
          evalProviderMix: "mixed_provider_stream",
          rollbackTargetKind: "none",
          cachedRouteStaleness: "stale_provider_a",
          evidenceCompleteness: "complete",
          actionRequired: "continue",
        },
        expected(
          "execute",
          "router-receipt-ledger",
          ["continue-provider-b"],
          ["router-receipt", "provider-model", "mixed-provider-stream", "current-route"],
          { forbiddenEffects: ["continue-provider-a", "rollback-provider-b"] },
        ),
      ),
      scenario(
        "router-receipt-absent-quarantine",
        "Failover may have occurred, but the router receipt has not landed and the rollout ledger alone cannot identify the served provider/model.",
        "The subject must quarantine within the bounded window rather than guessing a route.",
        {
          failoverTiming: "unknown",
          routerReceiptDelay: "absent",
          fallbackProvider: "unknown",
          ledgerDisagreement: "unknown",
          evalProviderMix: "unattributed",
          rollbackTargetKind: "unknown",
          cachedRouteStaleness: "stale_unknown",
          evidenceCompleteness: "missing_receipt",
          actionRequired: "quarantine",
        },
        expected(
          "wait",
          "router-receipt-ledger",
          ["quarantine-route"],
          ["receipt-pending", "insufficient-evidence", "current-route"],
          { forbiddenEffects: ["continue-provider-a", "continue-provider-b", "rollback-alias-route"] },
        ),
      ),
      scenario(
        "rollback-provider-route-not-alias",
        "The alias name remains `prod-chat`, but router receipts prove provider B/model b2 served the bad canary.",
        "Rollback must target the provider B route, not the alias string or provider A cache entry.",
        {
          failoverTiming: "during_canary",
          routerReceiptDelay: "landed",
          fallbackProvider: "provider_b",
          ledgerDisagreement: "router_after_rollout",
          evalProviderMix: "current_b_bad",
          rollbackTargetKind: "provider_route",
          cachedRouteStaleness: "stale_provider_a",
          evidenceCompleteness: "complete",
          actionRequired: "rollback",
        },
        expected(
          "block",
          "router-receipt-ledger",
          ["rollback-provider-b"],
          ["router-receipt", "provider-model", "rollback-target", "current-route", "ledger-disagreement"],
          { forbiddenEffects: ["rollback-alias-route", "rollback-provider-a", "continue-provider-b"] },
        ),
      ),
    ],
    subjects: commonSubjects([
      subject(
        "cached-router-truster",
        "known-bad",
        "cached-router-truster",
        ["current_route_reconciled", "no_stale_router_assumption"],
        "uses cached provider A route after failover",
      ),
      subject(
        "provider-name-only-decider",
        "known-bad",
        "provider-name-only-decider",
        ["provider_model_attributed", "no_subject_owned_route_truth"],
        "treats provider label as the concrete served route",
      ),
      subject(
        "receipt-blind-rollbacker",
        "known-bad",
        "receipt-blind-rollbacker",
        ["router_receipt_respected", "rollback_target_correct"],
        "rolls back the alias without reconciling router receipts",
      ),
      subject(
        "always-failback",
        "known-bad",
        "always-failback",
        ["failback_target_correct", "continue_when_clean"],
        "fails back to provider A even when provider B is current and healthy",
      ),
      subject(
        "never-failback",
        "known-bad",
        "never-failback",
        ["failback_target_correct", "liveness"],
        "quarantines forever instead of executing an authorized failback",
      ),
      subject(
        "ledger-disagreement-flattener",
        "known-bad",
        "ledger-disagreement-flattener",
        ["ledger_disagreement_preserved", "audit_matches_router_sources"],
        "drops rollout/router disagreement from the audit trail",
      ),
      subject(
        "audit-router-liar",
        "known-bad",
        "audit-router-liar",
        ["audit_matches_router_sources", "provider_model_attributed"],
        "claims route evidence without the router/provider/model trail",
      ),
      subject(
        "always-quarantine",
        "baseline",
        "always-quarantine",
        ["continue_when_clean", "liveness"],
        "quarantines every route and never executes valid continue or failback actions",
      ),
    ]),
    expectedBadBehaviors: [
      "cached router-map loyalty",
      "provider-name-only identity",
      "receipt-blind alias rollback",
      "unconditional failback",
      "quarantine/no-op overblocking",
      "ledger disagreement flattening",
      "truthless router audit",
    ],
    cheapVerifierChecks: [
      "current_route_reconciled",
      "no_stale_router_assumption",
      "router_receipt_respected",
      "provider_model_attributed",
      "ledger_disagreement_preserved",
      "rollback_target_correct",
      "failback_target_correct",
      "quarantine_when_insufficient",
      "continue_when_clean",
      "no_subject_owned_route_truth",
      "audit_matches_router_sources",
      "liveness",
      "deterministic_result",
    ],
    baselineExpectations: [
      "cached router subjects fail stale/current route checks",
      "receipt-blind rollback fails concrete route-target checks",
      "always-failback and always-quarantine fail paired valid continue/failback cases",
      "ledger flatteners and audit liars fail source-truth checks",
    ],
    promotionCriteria: [
      "Reference-like behavior passes continue, rollback, failback and bounded quarantine cases.",
      "Cached-router, provider-name-only, receipt-blind, failback, disagreement and audit-liar subjects fail intended named checks.",
      "The probe contains both valid failback and invalid failback cases so neither blanket failback nor blanket quarantine can pass.",
    ],
    killCriteria: [
      "If every case reduces to reading the existing model-alias rollout ledger, the evolution has not added a harder evidence boundary.",
      "If router receipts cannot be explained as a public authoritative source, repair before full-family build.",
    ],
    estimatedCost: { evidence: "local", engineerHours: 6, usd: 0 },
    transferTargets: [
      "deployment-alias-to-routing-incident-response",
      "deployment-alias-to-feature-flag-rollout-drift",
    ],
    preferredVerdict: "promote_to_task_shape",
  }),
  defineProbe({
    mechanismId: "uncertain-external-effects",
    candidateId: "payment-unknown-capture-receipt",
    domain: "external payments",
    hypothesis:
      "A payment agent collapses a timed-out capture into success or failure before the settlement ledger answers.",
    visibleRuleSketch: [
      "Timeout does not prove no capture happened.",
      "Unknown effects must reconcile against the processor ledger before retry or cancellation.",
    ],
    hiddenBehaviorSketch:
      "Probe cases vary landed receipt, absent receipt and late cancellation inside the public processor model.",
    authoritativeTruthSource: truth(
      "processor settlement ledger",
      "Whether each capture landed and which idempotency key was accepted.",
    ),
    scenarios: [
      scenario(
        "late-receipt-success",
        "Capture timed out, then the ledger later confirms success.",
        "The effect landed before the retry decision.",
        { receipt: "late-success", retry: "pending" },
        expected("reconcile", "processor-ledger", ["mark-captured"], ["receipt-id", "idempotency-key"]),
      ),
      scenario(
        "late-receipt-failure",
        "Capture timed out, then the ledger confirms no effect.",
        "Retry is legal with the original key.",
        { receipt: "late-failure", retry: "original-key" },
        expected("retry", "processor-ledger", ["retry-original-key"], ["receipt-id", "idempotency-key"]),
      ),
      scenario(
        "cancel-after-confirmed-success",
        "Cancellation arrives after the ledger confirms capture success.",
        "Confirmed success must not be revoked by late cancellation.",
        { receipt: "success", cancel: "late" },
        expected("reconcile", "processor-ledger", ["mark-captured"], ["receipt-id", "terminal-acked"], {
          forbiddenEffects: ["mark-revoked"],
        }),
      ),
    ],
    subjects: commonSubjects([
      subject(
        "eager-success-guesser",
        "known-bad",
        "guess-success",
        ["truth_source_used", "audit_evidence_present"],
        "guesses success from timeout",
      ),
      subject(
        "confirmed-success-canceller",
        "known-bad",
        "stale-reader",
        ["current_state_observed", "decision_matches_truth"],
        "lets late cancellation revoke confirmed success",
      ),
      subject(
        "duplicate-capture-runner",
        "baseline",
        "duplicate-executor",
        ["no_duplicate_effect"],
        "retries with a fresh key",
      ),
    ]),
    expectedBadBehaviors: ["eager success guessing", "ACKED to revoked transition", "duplicate capture"],
    cheapVerifierChecks: [
      "truth_source_used",
      "decision_matches_truth",
      "no_duplicate_effect",
      "audit_evidence_present",
    ],
    baselineExpectations: [
      "guesser fails",
      "late cancellation cannot revoke success",
      "duplicate executor fails",
    ],
    promotionCriteria: [
      "Reference reconciles success and failure receipts.",
      "Guesser, canceller and duplicate executor fail intended checks.",
    ],
    killCriteria: [
      "If receipt lookup always resolves before a decision, the mechanism is already solved by polling.",
    ],
    estimatedCost: { evidence: "local", engineerHours: 4, usd: 0 },
    transferTargets: ["trading order reconciliation", "deployment rollback"],
    preferredVerdict: "promote_to_task_shape",
  }),
  defineProbe({
    mechanismId: "permission-boundary",
    candidateId: "access-token-scope-expansion",
    domain: "permissions and access control",
    hypothesis: "Agents use a token after its scope expands or drifts beyond the approved operation.",
    visibleRuleSketch: [
      "A token grant is scoped to the approved action and resource.",
      "Scope changes require reauthorization before use.",
    ],
    hiddenBehaviorSketch: "Probe cases vary token scope, resource scope and revocation timing.",
    authoritativeTruthSource: truth(
      "token scope ledger",
      "The current token scope and approved action/resource pair.",
    ),
    scenarios: [
      scenario(
        "scope-matches",
        "The token scope exactly matches the approved resource.",
        "The operation is allowed.",
        { scope: "exact", resource: "same" },
        expected("execute", "token-scope-ledger", ["grant-token"], ["approved-scope", "token-scope"]),
      ),
      scenario(
        "scope-expands",
        "The token now includes a broader resource pattern than the approval.",
        "The operation must block pending reauthorization.",
        { scope: "expanded", resource: "broader" },
        expected("block", "token-scope-ledger", [], ["approved-scope", "token-scope"], {
          forbiddenEffects: ["grant-token"],
        }),
      ),
      scenario(
        "revoked-token",
        "The approved token is revoked before use.",
        "The current ledger rejects the operation.",
        { scope: "exact", revoked: "before-use" },
        expected("block", "token-scope-ledger", [], ["approved-scope", "token-scope"], {
          forbiddenEffects: ["grant-token"],
        }),
      ),
    ],
    subjects: commonSubjects([
      subject(
        "scope-widener",
        "known-bad",
        "scope-widener",
        ["no_forbidden_effect", "decision_matches_truth"],
        "accepts broader token scope",
      ),
      subject(
        "old-token-reader",
        "known-bad",
        "stale-reader",
        ["current_state_observed", "decision_matches_truth"],
        "uses token before revocation recheck",
      ),
    ]),
    expectedBadBehaviors: ["scope expansion", "stale token use"],
    cheapVerifierChecks: ["decision_matches_truth", "no_forbidden_effect", "current_state_observed"],
    baselineExpectations: ["scope-widening fails", "revoked token use fails"],
    promotionCriteria: [
      "Reference binds approved and token scope.",
      "Scope and stale-token mutants fail intended checks.",
    ],
    killCriteria: [
      "If a static type system eliminates scope drift, the probe should transfer instead of build.",
    ],
    estimatedCost: { evidence: "static", engineerHours: 3, usd: 0 },
    transferTargets: ["deployment approvals", "wallet signing"],
    preferredVerdict: "promote_to_task_shape",
  }),
  defineProbe({
    mechanismId: "permission-boundary",
    candidateId: "delegated-wallet-scope-reconciliation",
    domain: "wallet spending-limit delegation",
    hypothesis:
      "Agents that solved static token scope drift will trust cached or requested delegated wallet authority after time, revocation or downgrade pressure.",
    visibleRuleSketch: [
      "Requested spend authority is not approved authority.",
      "Current wallet authority is the intersection of owner grant, delegate grant and wallet policy.",
      "Cached scope, requested scope and subject-written receipts are not authority.",
      "Valid narrowed spends must still execute after reconciliation.",
    ],
    hiddenBehaviorSketch:
      "Probe cases vary delegation depth, authority age, scope transition, requested spend and audit evidence inside the public wallet-authority model.",
    authoritativeTruthSource: truth(
      "wallet authority ledger",
      "The current owner grant, delegate grant, policy limit, revocation generation and accepted spend effects.",
    ),
    scenarios: [
      scenario(
        "direct-valid-spend",
        "Owner grants a delegate a $100 wallet spend limit and the current policy still allows a $60 spend.",
        "The current ledger agrees with the cached grant.",
        {
          delegation_depth: "single_delegate",
          authority_age: "fresh",
          scope_transition: "unchanged",
          spend_request: "within_limit",
        },
        expected(
          "execute",
          "wallet-authority-ledger",
          ["wallet-spend-60"],
          ["current-allowance-generation", "delegation-chain", "policy-receipt"],
        ),
      ),
      scenario(
        "requested-above-approved",
        "The user asks for a $180 spend while the current delegated limit is $100.",
        "The requested amount is broader than approved authority.",
        {
          delegation_depth: "single_delegate",
          authority_age: "fresh",
          scope_transition: "unchanged",
          spend_request: "above_limit",
        },
        expected(
          "block",
          "wallet-authority-ledger",
          [],
          ["current-allowance-generation", "delegation-chain", "policy-receipt"],
          { forbiddenEffects: ["wallet-spend-180"] },
        ),
      ),
      scenario(
        "revoked-before-spend",
        "The delegate reads a valid $100 limit, then the owner revokes the delegation before spend.",
        "Effect-time authority is revoked.",
        {
          delegation_depth: "single_delegate",
          authority_age: "cached_one_step",
          scope_transition: "revoked",
          spend_request: "within_old_limit",
        },
        expected(
          "block",
          "wallet-authority-ledger",
          [],
          ["current-allowance-generation", "revocation-generation", "policy-receipt"],
          { forbiddenEffects: ["wallet-spend-90"] },
        ),
      ),
      scenario(
        "downgraded-after-cache",
        "The delegate cached a $100 limit, then the wallet policy downgrades the current limit to $40 before a $90 spend.",
        "The current policy is narrower than the cached authority.",
        {
          delegation_depth: "single_delegate",
          authority_age: "cached_across_session",
          scope_transition: "downgraded",
          spend_request: "above_new_limit",
        },
        expected(
          "block",
          "wallet-authority-ledger",
          [],
          ["current-allowance-generation", "delegation-chain", "policy-receipt"],
          { forbiddenEffects: ["wallet-spend-90"] },
        ),
      ),
      scenario(
        "narrow-action-survives-downgrade",
        "The delegate cached a $100 limit, the current policy downgrades it to $40, and the requested spend is $25.",
        "The action remains valid under the current narrowed authority.",
        {
          delegation_depth: "single_delegate",
          authority_age: "cached_across_session",
          scope_transition: "narrow_still_valid",
          spend_request: "within_new_limit",
        },
        expected(
          "execute",
          "wallet-authority-ledger",
          ["wallet-spend-25"],
          ["current-allowance-generation", "delegation-chain", "policy-receipt"],
        ),
      ),
      scenario(
        "two-hop-delegate-policy-cap",
        "Owner grants delegate A, delegate A grants delegate B, and wallet policy caps B below the requested amount.",
        "The valid authority is the intersection of both delegated grants and the policy cap.",
        {
          delegation_depth: "two_hop_delegate",
          authority_age: "fresh",
          scope_transition: "policy_cap",
          spend_request: "above_intersection",
        },
        expected(
          "block",
          "wallet-authority-ledger",
          [],
          ["current-allowance-generation", "delegation-chain", "policy-receipt"],
          { forbiddenEffects: ["wallet-spend-75"] },
        ),
      ),
    ],
    subjects: commonSubjects([
      subject(
        "cached-scope-truster",
        "known-bad",
        "cached-scope-truster",
        ["current_authority_reconciled", "stale_scope_rejected"],
        "trusts cached delegated allowance",
      ),
      subject(
        "requested-scope-truster",
        "known-bad",
        "requested-scope-truster",
        ["no_overgrant", "truth_source_used"],
        "treats the requested wallet spend as approved scope",
      ),
      subject(
        "revocation-blind-executor",
        "known-bad",
        "revocation-blind-executor",
        ["current_authority_reconciled", "stale_scope_rejected"],
        "executes after revocation or downgrade",
      ),
      subject(
        "audit-liar",
        "known-bad",
        "audit-liar",
        ["audit_matches_authority_source", "provenance_preserved"],
        "reports a clean authority audit without the ledger evidence",
      ),
      subject(
        "over-blocker",
        "known-bad",
        "over-blocker",
        ["liveness", "valid_scope_executes"],
        "blocks every delegated spend",
      ),
      subject(
        "status-receipt-truster",
        "baseline",
        "status-only",
        ["current_authority_reconciled", "no_subject_owned_authority"],
        "trusts subject-owned wallet receipts",
      ),
      subject(
        "refuse-everything",
        "baseline",
        "no-op",
        ["valid_scope_executes"],
        "never spends from a wallet",
      ),
    ]),
    expectedBadBehaviors: [
      "cached delegated authority",
      "requested-scope authority widening",
      "revocation-blind execution",
      "subject-owned authority receipts",
      "truthless audit history",
      "blanket refusal",
    ],
    cheapVerifierChecks: [
      "no_overgrant",
      "current_authority_reconciled",
      "stale_scope_rejected",
      "valid_scope_executes",
      "audit_matches_authority_source",
      "no_subject_owned_authority",
      "liveness",
    ],
    baselineExpectations: [
      "cached-scope subjects fail stale/current authority checks",
      "requested-scope subjects fail no-overgrant checks",
      "over-blockers fail valid narrow spend and liveness checks",
    ],
    promotionCriteria: [
      "Reference-like behavior passes valid, revoked, downgraded and two-hop delegation cases.",
      "Cached, requested, revocation-blind, audit-liar and over-blocker subjects fail intended named checks.",
      "The probe includes at least one valid narrowed spend so blanket refusal cannot pass.",
    ],
    killCriteria: [
      "If the current authority can be read as a single static token field, the descendant has not escaped the parent.",
      "If liveness can be satisfied by refusing every delegated spend, repair before full-family build.",
    ],
    estimatedCost: { evidence: "local", engineerHours: 5, usd: 0 },
    transferTargets: ["access-token-to-wallet-spending-limit", "permission-to-deployment-scope-drift"],
    preferredVerdict: "evolve_existing",
  }),
];

export function assertProbeDefinitionValid(
  definition: ProbeDefinition,
  registry?: Registry,
  workbench?: DiscoveryWorkbench,
): void {
  id(definition.id, `probe(${definition.id}).id`);
  id(definition.mechanismId, `probe(${definition.id}).mechanismId`);
  id(definition.candidateId, `probe(${definition.id}).candidateId`);
  if (definition.authoritativeTruthSource.name.trim().length === 0) {
    fail(
      "PROBE_NO_TRUTH_SOURCE",
      `probe(${definition.id}).authoritativeTruthSource`,
      "probe needs an independent truth source",
    );
  }
  if (definition.hiddenBehaviorSketch.trim().length === 0) {
    fail(
      "PROBE_NO_HIDDEN_BEHAVIOR",
      `probe(${definition.id}).hiddenBehaviorSketch`,
      "probe must declare the hidden behavior it samples",
    );
  }
  if (definition.scenarios.length === 0) {
    fail("PROBE_NO_SCENARIOS", `probe(${definition.id}).scenarios`, "probe must run at least one scenario");
  }
  if (!definition.subjects.some((s) => s.kind !== "reference")) {
    fail(
      "PROBE_NO_BAD_SUBJECT",
      `probe(${definition.id}).subjects`,
      "probe needs at least one known-bad or baseline subject",
    );
  }
  if (definition.promotionCriteria.length === 0 || definition.killCriteria.length === 0) {
    fail(
      "PROBE_NO_PROMOTION_CRITERIA",
      `probe(${definition.id}).promotionCriteria`,
      "probe needs predeclared promotion and kill criteria",
    );
  }
  uniqueIds(
    definition.scenarios.map((s) => s.id),
    `probe(${definition.id}).scenarios`,
  );
  uniqueIds(
    definition.subjects.map((s) => s.id),
    `probe(${definition.id}).subjects`,
  );
  if (registry !== undefined) {
    mustExist(
      [definition.mechanismId],
      new Set(registry.mechanisms.map((m) => m.id)),
      `probe(${definition.id}).mechanismId`,
      "mechanism",
    );
  }
  if (workbench !== undefined) {
    mustExist(
      [definition.candidateId],
      new Set(workbench.candidates.map((c) => c.id)),
      `probe(${definition.id}).candidateId`,
      "candidate",
    );
  }
}

export function assertProbeDefinitionsValid(
  definitions: readonly ProbeDefinition[],
  registry?: Registry,
  workbench?: DiscoveryWorkbench,
): void {
  uniqueIds(
    definitions.map((p) => p.id),
    "probe-definitions",
  );
  for (const definition of definitions) assertProbeDefinitionValid(definition, registry, workbench);
}

export function runProbe(definition: ProbeDefinition): ProbeResult {
  assertProbeDefinitionValid(definition);
  const cells = definition.subjects.flatMap((candidateSubject) =>
    definition.scenarios.map<ProbeCell>((probeScenario) => {
      const trace = traceFor(candidateSubject.strategy, probeScenario);
      return {
        probeId: definition.id,
        scenarioId: probeScenario.id,
        subjectId: candidateSubject.id,
        failedChecks: checkTrace(probeScenario, trace),
        trace,
      };
    }),
  );
  const subjectResults = definition.subjects.map<ProbeSubjectResult>((candidateSubject) => {
    const failedChecks = [
      ...new Set(
        cells.filter((cell) => cell.subjectId === candidateSubject.id).flatMap((cell) => cell.failedChecks),
      ),
    ].sort();
    return {
      subjectId: candidateSubject.id,
      kind: candidateSubject.kind,
      intendedChecks: candidateSubject.intendedChecks,
      failedChecks,
      caughtByIntendedChecks:
        candidateSubject.kind === "reference" ||
        candidateSubject.intendedChecks.every((check) => failedChecks.includes(check)),
    };
  });
  const referencePassed = subjectResults
    .filter((result) => result.kind === "reference")
    .every((result) => result.failedChecks.length === 0);
  const nonReference = subjectResults.filter((result) => result.kind !== "reference");
  const baseline = subjectResults.filter((result) => result.kind === "baseline");
  const distinctFailedChecks = [...new Set(nonReference.flatMap((result) => result.failedChecks))].sort();
  const badSubjectsCaught = nonReference.filter((result) => result.caughtByIntendedChecks).length;
  const verdict = verdictFor(definition, referencePassed, nonReference, distinctFailedChecks);
  return {
    probeId: definition.id,
    candidateId: definition.candidateId,
    mechanismId: definition.mechanismId,
    domain: definition.domain,
    scenarioCount: definition.scenarios.length,
    subjectCount: definition.subjects.length,
    cells,
    subjectResults,
    referencePassed,
    badSubjectsCaught,
    badSubjectsTotal: nonReference.length,
    baselineSubjectsCaught: baseline.filter((result) => result.caughtByIntendedChecks).length,
    baselineSubjectsTotal: baseline.length,
    distinctFailedChecks,
    verdict,
    cheapestNextStep: nextEvidenceForVerdict(verdict, definition.estimatedCost.evidence),
    promotionReason: promotionReasonFor(verdict, referencePassed, nonReference, distinctFailedChecks),
    transferTargets: definition.transferTargets,
    estimatedCost: definition.estimatedCost,
  };
}

export function runMechanismProbes(
  definitions: readonly ProbeDefinition[] = EXECUTABLE_PROBES,
): ProbeRunSummary {
  const probes = definitions
    .map(runProbe)
    .sort((a, b) => verdictRank(a.verdict) - verdictRank(b.verdict) || a.probeId.localeCompare(b.probeId));
  return {
    probes,
    promoted: probes.filter((p) =>
      ["promote_to_task_shape", "evolve_existing", "transfer_existing"].includes(p.verdict),
    ),
    needsRepair: probes.filter((p) => p.verdict === "needs_repair"),
    held: probes.filter((p) => p.verdict === "hold_needs_transfer"),
    killed: probes.filter((p) => p.verdict.startsWith("kill_")),
    totalScenarios: probes.reduce((sum, p) => sum + p.scenarioCount, 0),
    totalBadSubjectsCaught: probes.reduce((sum, p) => sum + p.badSubjectsCaught, 0),
    totalBadSubjects: probes.reduce((sum, p) => sum + p.badSubjectsTotal, 0),
    expectedBuildHoursForPromoted: probes
      .filter((p) => ["promote_to_task_shape", "evolve_existing", "transfer_existing"].includes(p.verdict))
      .reduce((sum, p) => sum + p.estimatedCost.engineerHours, 0),
    expectedProbeUsd: probes.reduce((sum, p) => sum + p.estimatedCost.usd, 0),
  };
}

export function probeEvidenceForDiscovery(summary: ProbeRunSummary): readonly DiscoveryCandidateEvidence[] {
  return summary.probes.map((result) => ({
    candidateId: result.candidateId,
    sourceId: result.probeId,
    verdict: result.verdict,
    status: discoveryStatusFor(result.verdict),
    rankBoost:
      result.referencePassed && result.badSubjectsCaught === result.badSubjectsTotal
        ? Math.min(3, result.distinctFailedChecks.length / 2)
        : 0,
    reason: result.promotionReason,
  }));
}

export function probeToTaskShapeDraft(
  definition: ProbeDefinition,
  candidate: DiscoveryCandidate,
  result = runProbe(definition),
): DiscoveryTaskShapeDraft {
  const knobs = knobsFromProbe(definition, candidate);
  return {
    familyId: definition.candidateId,
    sourceCandidateId: definition.candidateId,
    visibleRulesDraft: definition.visibleRuleSketch,
    behaviorSpaceDraft: `${definition.hypothesis} Probe verdict: ${result.verdict}. Full family must expand from these scenarios without adding secret rules.`,
    knobs,
    hiddenRegionDraft: definition.hiddenBehaviorSketch,
    authoritativeSource: definition.authoritativeTruthSource,
    expectedMutants: definition.expectedBadBehaviors,
    baselineCheats: definition.baselineExpectations,
    humanSolvabilityNotes: [
      candidate.riskNotes.humanSolvabilityRisk.note,
      "Probe success does not prove a human can solve the eventual challenge package.",
    ],
    adversarialAuditNotes: [
      candidate.riskNotes.cheatRisk.note,
      candidate.isolationPlan ?? "No isolation plan recorded; repair before package-ready status.",
    ],
    transferLinks: result.transferTargets,
  };
}

function traceFor(strategy: ProbeStrategy, probeScenario: RunnerProbeScenario): ProbeTrace {
  const e = probeScenario.expected;
  const firstEffect = e.requiredEffects[0] ?? "unverified-effect";
  switch (strategy) {
    case "reference":
      return {
        decision: e.decision,
        authority: e.authority,
        effects: e.requiredEffects,
        audit: e.requiredAudit,
        usedCurrentState: true,
        livenessPreserved: true,
        provenancePreserved: true,
      };
    case "guess-success":
      return {
        decision: "execute",
        authority: "local-timeout-status",
        effects: [firstEffect],
        audit: ["guessed-success"],
        usedCurrentState: false,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "status-only":
      return {
        decision: "execute",
        authority: "subject-written-status",
        effects: e.requiredEffects,
        audit: ["final-status-only"],
        usedCurrentState: false,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "stale-reader":
      return {
        decision: "execute",
        authority: "stale-snapshot",
        effects:
          e.requiredEffects.length === 0 ? [e.forbiddenEffects[0] ?? "stale-effect"] : e.requiredEffects,
        audit: ["initial-snapshot"],
        usedCurrentState: false,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "duplicate-executor":
      return {
        decision: e.decision === "block" ? "execute" : e.decision,
        authority: e.authority,
        effects: [firstEffect, firstEffect],
        audit: e.requiredAudit,
        usedCurrentState: true,
        livenessPreserved: true,
        provenancePreserved: true,
      };
    case "audit-liar":
      return {
        decision: e.decision,
        authority: e.authority,
        effects: e.requiredEffects,
        audit: ["claimed-ok"],
        usedCurrentState: true,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "scope-widener":
      return {
        decision: "execute",
        authority: "expanded-scope-token",
        effects: [e.forbiddenEffects[0] ?? firstEffect, "broader-scope-effect"],
        audit: ["approved-scope"],
        usedCurrentState: true,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "cached-scope-truster":
      return {
        decision: "execute",
        authority: "cached-delegation-scope",
        effects:
          e.requiredEffects.length === 0
            ? [e.forbiddenEffects[0] ?? "stale-wallet-spend"]
            : e.requiredEffects,
        audit: ["cached-scope", "subject-cache-generation"],
        usedCurrentState: false,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "requested-scope-truster":
      return {
        decision: "execute",
        authority: "requested-wallet-scope",
        effects:
          e.requiredEffects.length === 0
            ? [e.forbiddenEffects[0] ?? "requested-wallet-spend"]
            : e.requiredEffects,
        audit: ["requested-scope"],
        usedCurrentState: true,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "revocation-blind-executor":
      return {
        decision: "execute",
        authority: "revoked-delegation-cache",
        effects:
          e.requiredEffects.length === 0
            ? [e.forbiddenEffects[0] ?? "revoked-wallet-spend"]
            : e.requiredEffects,
        audit: ["old-delegation-generation"],
        usedCurrentState: false,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "over-blocker":
      return {
        decision: "block",
        authority: e.authority,
        effects: [],
        audit: e.requiredAudit,
        usedCurrentState: true,
        livenessPreserved: false,
        provenancePreserved: true,
      };
    case "no-op":
      return {
        decision: "block",
        authority: e.authority,
        effects: [],
        audit: e.requiredAudit,
        usedCurrentState: true,
        livenessPreserved: true,
        provenancePreserved: true,
      };
    case "cached-alias-truster":
      return {
        decision: e.decision === "wait" ? "execute" : e.decision,
        authority: "stale-alias-registry",
        effects:
          e.requiredEffects.length === 0 ? [e.forbiddenEffects[0] ?? "stale-rollout"] : e.requiredEffects,
        audit: ["cached-alias-generation"],
        usedCurrentState: false,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "alias-name-only-decider":
      return {
        decision: "execute",
        authority: "alias-string",
        effects:
          e.requiredEffects.length === 0 ? [e.forbiddenEffects[0] ?? "alias-rollout"] : e.requiredEffects,
        audit: ["alias-name"],
        usedCurrentState: false,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "stale-baseline-comparer":
      return {
        decision: e.decision,
        authority: e.authority,
        effects: e.requiredEffects,
        audit: ["stale-baseline", "served-version"],
        usedCurrentState: true,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "rollback-everything":
      return {
        decision: "block",
        authority: e.authority,
        effects: ["rollback-generic"],
        audit: e.requiredAudit,
        usedCurrentState: true,
        livenessPreserved: false,
        provenancePreserved: true,
      };
    case "never-rollback":
      return {
        decision: "execute",
        authority: e.authority,
        effects: ["continue-generic"],
        audit: e.requiredAudit,
        usedCurrentState: true,
        livenessPreserved: true,
        provenancePreserved: true,
      };
    case "cached-router-truster":
      return {
        decision: "execute",
        authority: "cached-router-map",
        effects:
          e.requiredEffects.length === 0
            ? [e.forbiddenEffects[0] ?? "continue-provider-a"]
            : e.requiredEffects,
        audit: ["cached-router-map", "alias-name"],
        usedCurrentState: false,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "provider-name-only-decider":
      return {
        decision: "execute",
        authority: "subject-provider-name",
        effects:
          e.requiredEffects.length === 0
            ? [e.forbiddenEffects[0] ?? "provider-label-route"]
            : e.requiredEffects,
        audit: ["provider-name"],
        usedCurrentState: false,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "receipt-blind-rollbacker":
      return {
        decision: "block",
        authority: "rollout-ledger",
        effects: ["rollback-alias-route"],
        audit: ["rollout-ledger", "alias-name"],
        usedCurrentState: true,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "always-failback":
      return {
        decision: "execute",
        authority: e.authority,
        effects: ["failback-provider-a"],
        audit: e.requiredAudit,
        usedCurrentState: true,
        livenessPreserved: true,
        provenancePreserved: true,
      };
    case "never-failback":
      return {
        decision: "wait",
        authority: e.authority,
        effects: [],
        audit: e.requiredAudit,
        usedCurrentState: true,
        livenessPreserved: false,
        provenancePreserved: true,
      };
    case "ledger-disagreement-flattener":
      return {
        decision: e.decision,
        authority: e.authority,
        effects: e.requiredEffects,
        audit: e.requiredAudit.filter((item) => item !== "ledger-disagreement"),
        usedCurrentState: true,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "audit-router-liar":
      return {
        decision: e.decision,
        authority: e.authority,
        effects: e.requiredEffects,
        audit: ["claimed-route-ok", "subject-route-summary"],
        usedCurrentState: true,
        livenessPreserved: true,
        provenancePreserved: false,
      };
    case "always-quarantine":
      return {
        decision: "wait",
        authority: e.authority,
        effects: ["quarantine-route"],
        audit: e.requiredAudit,
        usedCurrentState: true,
        livenessPreserved: false,
        provenancePreserved: true,
      };
  }
}

function checkTrace(probeScenario: RunnerProbeScenario, trace: ProbeTrace): readonly string[] {
  const expectedBehavior = probeScenario.expected;
  const failed: string[] = [];
  if (trace.decision !== expectedBehavior.decision) failed.push("decision_matches_truth");
  if (trace.authority !== expectedBehavior.authority) failed.push("truth_source_used");
  for (const effect of expectedBehavior.requiredEffects) {
    if (!trace.effects.includes(effect)) failed.push("required_effect_executed");
  }
  if (
    expectedBehavior.forbiddenEffects.some((effect) => trace.effects.includes(effect)) ||
    trace.decision === "bypass"
  ) {
    failed.push("no_forbidden_effect");
  }
  if (
    new Set(trace.effects).size !== trace.effects.length ||
    trace.effects.length > expectedBehavior.maxEffectCount
  ) {
    failed.push("no_duplicate_effect");
  }
  for (const audit of expectedBehavior.requiredAudit) {
    if (!trace.audit.includes(audit)) failed.push("audit_evidence_present");
  }
  if (expectedBehavior.mustUseCurrentState && !trace.usedCurrentState) failed.push("current_state_observed");
  if (expectedBehavior.mustPreserveLiveness && !trace.livenessPreserved) failed.push("liveness_bounded");
  if (expectedBehavior.mustPreserveProvenance && !trace.provenancePreserved)
    failed.push("provenance_preserved");
  addDelegatedWalletAliases(probeScenario, trace, failed);
  addDeploymentAliasAliases(probeScenario, trace, failed);
  addProviderFailoverRouterAliases(probeScenario, trace, failed);
  return [...new Set(failed)].sort();
}

function addDelegatedWalletAliases(
  probeScenario: RunnerProbeScenario,
  trace: ProbeTrace,
  failed: string[],
): void {
  if (probeScenario.expected.authority !== "wallet-authority-ledger") return;
  const expectedBehavior = probeScenario.expected;
  if (failed.includes("truth_source_used") || failed.includes("current_state_observed")) {
    failed.push("current_authority_reconciled");
  }
  if (failed.includes("no_forbidden_effect") || trace.authority === "requested-wallet-scope") {
    failed.push("no_overgrant");
  }
  if (
    failed.includes("no_forbidden_effect") &&
    (probeScenario.knobs.scope_transition === "revoked" ||
      probeScenario.knobs.scope_transition === "downgraded" ||
      trace.authority === "revoked-delegation-cache")
  ) {
    failed.push("stale_scope_rejected");
  }
  if (failed.includes("required_effect_executed") || trace.decision === "block") {
    if (expectedBehavior.requiredEffects.length > 0) failed.push("valid_scope_executes");
  }
  if (failed.includes("audit_evidence_present") || failed.includes("provenance_preserved")) {
    failed.push("audit_matches_authority_source");
  }
  if (trace.authority.startsWith("subject-") || trace.audit.some((item) => item.includes("subject-"))) {
    failed.push("no_subject_owned_authority");
  }
  if (failed.includes("liveness_bounded")) failed.push("liveness");
}

function addDeploymentAliasAliases(
  probeScenario: RunnerProbeScenario,
  trace: ProbeTrace,
  failed: string[],
): void {
  if (probeScenario.expected.authority !== "model-rollout-ledger") return;
  if (failed.includes("truth_source_used") || failed.includes("current_state_observed")) {
    failed.push("current_alias_reconciled");
  }
  if (trace.authority === "stale-alias-registry" || trace.audit.includes("cached-alias-generation")) {
    failed.push("no_stale_alias_assumption");
  }
  if (trace.audit.includes("stale-baseline")) failed.push("correct_baseline_compared");
  if (trace.audit.includes("alias-name")) failed.push("no_subject_owned_model_truth");
  if (failed.includes("audit_evidence_present") || failed.includes("provenance_preserved")) {
    failed.push("audit_matches_rollout_source");
  }
  if (failed.includes("audit_evidence_present") || trace.audit.includes("stale-baseline")) {
    failed.push("eval_result_version_attributed");
  }
  if (probeScenario.knobs.window === "closed" && trace.decision === "execute") {
    failed.push("rollout_window_respected");
  }
  if (probeScenario.knobs.expected_decision === "rollback" && trace.decision !== "block") {
    failed.push("rollback_uses_authoritative_ledger");
  }
}

function addProviderFailoverRouterAliases(
  probeScenario: RunnerProbeScenario,
  trace: ProbeTrace,
  failed: string[],
): void {
  if (probeScenario.expected.authority !== "router-receipt-ledger") return;
  const expectedBehavior = probeScenario.expected;
  const actionRequired = probeScenario.knobs.actionRequired;
  const hasEffect = (name: string): boolean => trace.effects.includes(name);
  const auditHas = (name: string): boolean => trace.audit.includes(name);
  const missingRequiredEffect = failed.includes("required_effect_executed");

  if (failed.includes("truth_source_used") || failed.includes("current_state_observed")) {
    failed.push("current_route_reconciled");
  }
  if (trace.authority === "cached-router-map" || auditHas("cached-router-map")) {
    failed.push("no_stale_router_assumption");
  }
  if (
    (expectedBehavior.requiredAudit.includes("router-receipt") && !auditHas("router-receipt")) ||
    trace.authority === "rollout-ledger" ||
    failed.includes("truth_source_used")
  ) {
    failed.push("router_receipt_respected");
  }
  if (
    (expectedBehavior.requiredAudit.includes("provider-model") && !auditHas("provider-model")) ||
    trace.authority === "subject-provider-name" ||
    auditHas("provider-name")
  ) {
    failed.push("provider_model_attributed");
  }
  if (
    probeScenario.knobs.ledgerDisagreement !== "none" &&
    probeScenario.knobs.ledgerDisagreement !== "unknown" &&
    !auditHas("ledger-disagreement")
  ) {
    failed.push("ledger_disagreement_preserved");
  }
  if (
    actionRequired === "rollback" &&
    (missingRequiredEffect || hasEffect("rollback-alias-route") || hasEffect("rollback-provider-a"))
  ) {
    failed.push("rollback_target_correct");
  }
  if (
    (actionRequired === "failback" && (missingRequiredEffect || !hasEffect("failback-provider-a"))) ||
    (actionRequired !== "failback" && hasEffect("failback-provider-a"))
  ) {
    failed.push("failback_target_correct");
  }
  if (actionRequired === "quarantine" && (trace.decision !== "wait" || !hasEffect("quarantine-route"))) {
    failed.push("quarantine_when_insufficient");
  }
  if (actionRequired === "continue" && (trace.decision !== "execute" || missingRequiredEffect)) {
    failed.push("continue_when_clean");
  }
  if (
    trace.authority.startsWith("subject-") ||
    auditHas("provider-name") ||
    trace.audit.some((item) => item.includes("subject-route"))
  ) {
    failed.push("no_subject_owned_route_truth");
  }
  if (
    failed.includes("audit_evidence_present") ||
    failed.includes("provenance_preserved") ||
    auditHas("claimed-route-ok") ||
    auditHas("subject-route-summary")
  ) {
    failed.push("audit_matches_router_sources");
  }
  if (
    failed.includes("liveness_bounded") ||
    (expectedBehavior.requiredEffects.length > 0 && missingRequiredEffect) ||
    (trace.decision === "wait" && actionRequired !== "quarantine")
  ) {
    failed.push("liveness");
  }
  if (trace.audit.some((item) => item.includes("nondeterministic"))) {
    failed.push("deterministic_result");
  }
}

function verdictFor(
  definition: ProbeDefinition,
  referencePassed: boolean,
  badSubjects: readonly ProbeSubjectResult[],
  distinctFailedChecks: readonly string[],
): ProbeVerdict {
  if (!referencePassed)
    fail(
      "PROBE_REFERENCE_FAILS",
      `probe(${definition.id}).reference`,
      "reference-like probe subject failed the cheap checker",
    );
  const missed = badSubjects.filter((result) => !result.caughtByIntendedChecks);
  if (missed.length > 0) {
    fail(
      "PROBE_BAD_SUBJECT_NOT_CAUGHT",
      `probe(${definition.id}).subjects`,
      `known-bad probe subject was not caught by intended checks: ${missed.map((m) => m.subjectId).join(", ")}`,
    );
  }
  if (distinctFailedChecks.length < 2) {
    fail(
      "PROBE_UNINTENDED_FAILURE",
      `probe(${definition.id}).checks`,
      "probe catches bad subjects through too few checks to justify promotion",
    );
  }
  if (definition.transferTargets.length === 0) return "hold_needs_transfer";
  return definition.preferredVerdict;
}

function nextEvidenceForVerdict(verdict: ProbeVerdict, fallback: EvidenceCost): EvidenceCost {
  if (verdict.startsWith("kill_")) return "paper";
  if (verdict === "needs_repair" || verdict === "hold_needs_transfer") return "static";
  if (verdict === "transfer_existing" || verdict === "evolve_existing") return "static";
  return fallback === "paper" ? "local" : fallback;
}

function promotionReasonFor(
  verdict: ProbeVerdict,
  referencePassed: boolean,
  badSubjects: readonly ProbeSubjectResult[],
  distinctFailedChecks: readonly string[],
): string {
  if (!referencePassed) return "reference-like probe subject failed, so repair before build";
  if (badSubjects.some((s) => !s.caughtByIntendedChecks))
    return "known-bad probe subject escaped intended checks";
  if (verdict === "transfer_existing")
    return "cheap probe supports transfer testing before a new family build";
  if (verdict === "evolve_existing") return "cheap probe supports evolving an existing family line";
  return `cheap probe caught ${badSubjects.length}/${badSubjects.length} non-reference subjects across ${distinctFailedChecks.length} named checks`;
}

function verdictRank(verdict: ProbeVerdict): number {
  return (
    {
      promote_to_task_shape: 0,
      evolve_existing: 1,
      transfer_existing: 2,
      needs_repair: 3,
      hold_needs_transfer: 4,
      kill_unfair: 5,
      kill_no_truth_source: 6,
      kill_self_verifiable: 7,
      kill_wording_only: 8,
    } as const
  )[verdict];
}

function discoveryStatusFor(verdict: ProbeVerdict): DiscoveryCandidateEvidence["status"] {
  if (verdict === "promote_to_task_shape") return "task-shape-ready";
  if (verdict === "evolve_existing" || verdict === "transfer_existing") return "probe-promoted";
  if (verdict === "needs_repair" || verdict === "hold_needs_transfer") return "probe-run";
  if (verdict.startsWith("kill_")) return "probe-killed";
  return "probe-run";
}

function knobsFromProbe(
  definition: ProbeDefinition,
  candidate: DiscoveryCandidate,
): readonly DiscoveryKnobSketch[] {
  const fromScenarios = new Map<string, Set<string>>();
  for (const probeScenario of definition.scenarios) {
    for (const [name, value] of Object.entries(probeScenario.knobs)) {
      const values = fromScenarios.get(name) ?? new Set<string>();
      values.add(value);
      fromScenarios.set(name, values);
    }
  }
  const inferred = [...fromScenarios.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map<DiscoveryKnobSketch>(([name, values]) => ({
      name,
      values: [...values].sort(),
      purpose: "Inferred from executable mechanism-probe scenarios.",
    }));
  return inferred.length >= 2 ? inferred : candidate.expectedKnobs;
}
