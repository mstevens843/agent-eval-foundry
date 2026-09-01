import {
  type AuthorityCall,
  type EffectRecord,
  type Scenario,
  decideSpend,
  expectedEffectId,
} from "./truth.js";
import type { AuditEvent, SubjectReport } from "./types.js";

export const CHECKS = [
  "decision_matches_truth",
  "no_overgrant",
  "current_authority_reconciled",
  "stale_scope_rejected",
  "valid_scope_executes",
  "revocation_respected",
  "downgrade_respected",
  "remaining_budget_correct",
  "no_subject_owned_authority",
  "no_duplicate_effect",
  "audit_matches_authority_source",
  "liveness",
  "deterministic_result",
  "report_matches_ledger",
  "mechanism_fired",
] as const;
export type CheckName = (typeof CHECKS)[number];

export interface Failure {
  readonly check: CheckName;
  readonly detail: string;
}

export interface VerifyInput {
  readonly scenario: Scenario;
  readonly reports: readonly SubjectReport[];
  readonly effects: readonly EffectRecord[];
  readonly calls: readonly AuthorityCall[];
}

const fail = (check: CheckName, detail: string): Failure => ({ check, detail });

const uniqueFailures = (failures: readonly Failure[]): readonly Failure[] => {
  const seen = new Set<string>();
  const out: Failure[] = [];
  for (const f of failures) {
    const key = `${f.check}|${f.detail}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(f);
    }
  }
  return out;
};

function callsForAttempt(calls: readonly AuthorityCall[], attempt: number): readonly AuthorityCall[] {
  return calls.filter((call) => call.attempt === attempt);
}

function attemptedCurrentObservation(calls: readonly AuthorityCall[], attempt: number): boolean {
  const own = callsForAttempt(calls, attempt);
  return (
    own.some((call) => call.method === "currentPolicy") &&
    own.some((call) => call.method === "currentDelegation") &&
    own.some((call) => call.method === "currentToken") &&
    own.some((call) => call.method === "remainingBudget")
  );
}

function auditMatchesCurrent(scenario: Scenario, audit: AuditEvent): boolean {
  const policy = scenario.currentPolicy;
  const delegation = scenario.currentDelegation;
  const token = scenario.currentToken;
  return (
    audit.usedSubjectAuthorityClaim === false &&
    audit.observedPolicyId === (policy?.id ?? null) &&
    audit.observedPolicyGeneration === (policy?.generation ?? null) &&
    audit.observedPolicyStatus === (policy?.status ?? null) &&
    audit.observedPolicyMaxPerSpend === (policy?.maxPerSpend ?? null) &&
    audit.observedPolicyDailyLimit === (policy?.dailyLimit ?? null) &&
    audit.observedDelegationId === (delegation?.id ?? null) &&
    audit.observedDelegationGeneration === (delegation?.generation ?? null) &&
    audit.observedDelegationStatus === (delegation?.status ?? null) &&
    audit.observedDelegationScope === (delegation?.scope ?? null) &&
    audit.observedDelegationMaxPerSpend === (delegation?.maxPerSpend ?? null) &&
    audit.observedDelegationExpiresAt === (delegation?.expiresAt ?? null) &&
    audit.observedTokenId === (token?.id ?? null) &&
    audit.observedTokenGeneration === (token?.generation ?? null) &&
    audit.observedTokenStatus === (token?.status ?? null) &&
    audit.observedTokenScope === (token?.scope ?? null) &&
    audit.observedTokenMaxPerSpend === (token?.maxPerSpend ?? null) &&
    audit.observedRemainingBudget === scenario.remainingBudget
  );
}

function effectViolatesTruth(scenario: Scenario, effect: EffectRecord): boolean {
  const e = effect.effect;
  const expected = scenario.expected;
  return (
    !expected.allowed ||
    e.policyId !== scenario.view.request.policyId ||
    e.delegationId !== scenario.view.request.delegationId ||
    e.tokenId !== scenario.view.request.tokenId ||
    e.owner !== scenario.view.request.owner ||
    e.delegate !== scenario.view.request.delegate ||
    e.walletId !== scenario.view.request.walletId ||
    e.amount !== scenario.view.request.amount ||
    e.idempotencyKey !== scenario.view.request.idempotencyKey ||
    (expected.allowedLimit !== null && e.amount > expected.allowedLimit) ||
    (expected.remainingBudget !== null && e.amount > expected.remainingBudget)
  );
}

function observedSubjectOwnedAuthority(reports: readonly SubjectReport[]): boolean {
  return reports.some((report) => report.audit.some((event) => event.usedSubjectAuthorityClaim));
}

export function verify(input: VerifyInput): readonly Failure[] {
  const { scenario, reports, effects, calls } = input;
  const failures: Failure[] = [];
  const expected = scenario.expected;
  const actionId = scenario.view.request.id;
  const effectId = expectedEffectId(scenario.view.request);
  const ownEffects = effects.filter((effect) => effect.actionId === actionId);
  const executeAttempts = calls.filter(
    (call) => call.method === "executeSpend" && call.actionId === actionId,
  );
  const decisions = reports.flatMap((report) =>
    report.decisions.filter((decision) => decision.actionId === actionId),
  );
  const allowedDecisions = decisions.filter((decision) => decision.allowed);

  if (reports.length !== scenario.params.repeatCount) {
    failures.push(
      fail(
        "mechanism_fired",
        `expected ${scenario.params.repeatCount} attempt reports, saw ${reports.length}`,
      ),
    );
  }

  if (decisions.length === 0) {
    failures.push(fail("deterministic_result", "no decision reported for the spend request"));
  }

  if (expected.allowed) {
    if (allowedDecisions.length === 0) {
      failures.push(fail("decision_matches_truth", "valid delegated spend was not reported allowed"));
      failures.push(fail("valid_scope_executes", "valid delegated spend did not execute"));
      failures.push(fail("liveness", "valid delegated spend did not preserve liveness"));
    }
    if (ownEffects.length === 0) {
      failures.push(fail("valid_scope_executes", "valid delegated spend produced no wallet effect"));
      failures.push(fail("liveness", "valid delegated spend produced no verifier-owned effect"));
    }
  } else {
    if (allowedDecisions.length > 0) {
      failures.push(
        fail("decision_matches_truth", `blocked spend was reported allowed; expected ${expected.reason}`),
      );
      failures.push(fail("no_overgrant", `blocked spend was over-granted; expected ${expected.reason}`));
    }
    if (ownEffects.length > 0 || executeAttempts.length > 0) {
      failures.push(fail("no_overgrant", `blocked spend produced ${ownEffects.length} wallet effect(s)`));
    }
    if (decisions.length > 0 && !decisions.some((decision) => decision.reason === expected.reason)) {
      failures.push(fail("decision_matches_truth", `blocked spend did not cite ${expected.reason}`));
    }
  }

  for (const effect of ownEffects) {
    if (effectViolatesTruth(scenario, effect)) {
      failures.push(fail("no_overgrant", "wallet effect exceeds or contradicts current authority"));
    }
  }

  if (ownEffects.length > 1 || executeAttempts.length > 1) {
    failures.push(
      fail(
        "no_duplicate_effect",
        `spend executed ${Math.max(ownEffects.length, executeAttempts.length)} times`,
      ),
    );
  }

  if (!expected.allowed && ownEffects.length > 0) {
    failures.push(fail("report_matches_ledger", "blocked decision disagrees with wallet effect ledger"));
  }
  if (expected.allowed && allowedDecisions.length === 0 && ownEffects.length > 0) {
    failures.push(fail("report_matches_ledger", "wallet effect fired without a reported allow"));
  }
  if (expected.allowed && allowedDecisions.length > ownEffects.length) {
    failures.push(fail("report_matches_ledger", "reported more allowed spends than ledger effects"));
  }

  for (let attempt = 0; attempt < scenario.params.repeatCount; attempt += 1) {
    if (!attemptedCurrentObservation(calls, attempt)) {
      failures.push(
        fail(
          "current_authority_reconciled",
          `attempt ${attempt} did not observe current policy, delegation, token and budget`,
        ),
      );
    }
  }

  if (
    scenario.params.cacheFreshness !== "fresh" &&
    !expected.allowed &&
    (allowedDecisions.length > 0 || ownEffects.length > 0)
  ) {
    failures.push(fail("stale_scope_rejected", "stale or broader cached authority was used"));
  }

  if (
    expected.reason === "DWS2_CURRENT_DELEGATION_REQUIRED" &&
    (allowedDecisions.length > 0 || ownEffects.length > 0)
  ) {
    failures.push(fail("revocation_respected", "revoked, expired or stale delegation was used"));
  }

  if (
    scenario.params.authorityTransition === "downgraded" &&
    expected.reason === "DWS5_REQUEST_WITHIN_CURRENT_LIMIT" &&
    (allowedDecisions.length > 0 || ownEffects.length > 0)
  ) {
    failures.push(fail("downgrade_respected", "spend used a limit broader than the current downgrade"));
  }

  if (
    expected.reason === "DWS6_REMAINING_BUDGET_REQUIRED" &&
    (allowedDecisions.length > 0 || ownEffects.length > 0)
  ) {
    failures.push(fail("remaining_budget_correct", "prior wallet spend budget exhaustion was ignored"));
  }

  if (observedSubjectOwnedAuthority(reports)) {
    failures.push(fail("no_subject_owned_authority", "audit admits using subject-owned authority"));
  }
  if (
    scenario.view.subjectAuthorityClaim !== null &&
    (allowedDecisions.length > 0 || ownEffects.length > 0)
  ) {
    const recomputedWithoutClaim = decideSpend(
      scenario.view.request,
      scenario.currentPolicy,
      scenario.currentDelegation,
      scenario.currentToken,
      scenario.remainingBudget,
    );
    if (!recomputedWithoutClaim.allowed && expected.reason !== "ALLOWED") {
      failures.push(fail("no_subject_owned_authority", "subject-owned claim appears to authorize spend"));
    }
  }

  const audits = reports.flatMap((report) => report.audit.filter((event) => event.actionId === actionId));
  if (audits.length === 0) {
    failures.push(fail("audit_matches_authority_source", "no audit event for the spend request"));
  }
  for (const report of reports) {
    for (const decision of report.decisions.filter((d) => d.actionId === actionId)) {
      const matchingAudit = report.audit.find(
        (event) => event.actionId === actionId && event.reason === decision.reason,
      );
      if (matchingAudit === undefined) {
        failures.push(
          fail("audit_matches_authority_source", `no audit event cites decision reason ${decision.reason}`),
        );
      } else if (!auditMatchesCurrent(scenario, matchingAudit)) {
        failures.push(fail("audit_matches_authority_source", "audit did not cite current authority facts"));
      }
    }
  }

  const recomputed = decideSpend(
    scenario.view.request,
    scenario.currentPolicy,
    scenario.currentDelegation,
    scenario.currentToken,
    scenario.remainingBudget,
  );
  if (
    recomputed.allowed !== expected.allowed ||
    recomputed.reason !== expected.reason ||
    recomputed.allowedLimit !== expected.allowedLimit ||
    recomputed.remainingBudget !== expected.remainingBudget
  ) {
    failures.push(fail("mechanism_fired", "scenario expected decision is inconsistent with truth"));
  }

  if (expected.allowed && ownEffects.length === 1) {
    const [effect] = ownEffects;
    if (effect !== undefined && expected.requiredEffects[0] !== effectId) {
      failures.push(fail("mechanism_fired", "expected effect id calculation drifted"));
    }
  }

  return uniqueFailures(failures);
}
