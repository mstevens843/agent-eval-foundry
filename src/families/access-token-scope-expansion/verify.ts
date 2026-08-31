import {
  type AuthorityCall,
  type EffectRecord,
  type Scenario,
  decideRequest,
  expectedEffectId,
} from "./truth.js";
import type { AuditEvent, SubjectReport } from "./types.js";

export const CHECKS = [
  "decision_matches_truth",
  "no_forbidden_effect",
  "current_state_observed",
  "approval_generation_current",
  "token_status_current",
  "scope_bound_exactly",
  "no_duplicate_effect",
  "report_matches_ledger",
  "audit_explains",
  "liveness",
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

function auditMatchesCurrent(scenario: Scenario, audit: AuditEvent): boolean {
  const approval = scenario.currentApproval;
  const token = scenario.currentToken;
  return (
    audit.observedApprovalId === (approval?.id ?? null) &&
    audit.observedApprovalGeneration === (approval?.generation ?? null) &&
    audit.observedApprovalStatus === (approval?.status ?? null) &&
    audit.observedTokenId === (token?.id ?? null) &&
    audit.observedTokenGeneration === (token?.generation ?? null) &&
    audit.observedTokenStatus === (token?.status ?? null)
  );
}

function attemptedCurrentObservation(calls: readonly AuthorityCall[], attempt: number): boolean {
  const own = calls.filter((call) => call.attempt === attempt);
  return (
    own.some((call) => call.method === "currentApproval") &&
    own.some((call) => call.method === "currentToken")
  );
}

export function verify(input: VerifyInput): readonly Failure[] {
  const { scenario, reports, effects, calls } = input;
  const failures: Failure[] = [];
  const expected = scenario.expected;
  const actionId = scenario.view.request.id;
  const repeated = scenario.params.repeatCount > 1;
  const effectId = expectedEffectId(scenario.view.request);
  const effectCount = effects.filter((e) => e.actionId === actionId).length;
  const grantAttempts = calls.filter(
    (call) => call.method === "issueToken" && call.actionId === actionId,
  ).length;
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

  if (expected.allowed) {
    if (allowedDecisions.length === 0) {
      failures.push(fail("decision_matches_truth", "valid grant was not reported allowed"));
      failures.push(fail("liveness", "valid grant did not preserve liveness"));
    }
    if (effectCount === 0) {
      failures.push(fail("liveness", "valid grant produced no authority-owned effect"));
    }
  } else {
    if (allowedDecisions.length > 0) {
      failures.push(
        fail("decision_matches_truth", `blocked grant was reported allowed; expected ${expected.reason}`),
      );
    }
    if (effectCount > 0 || grantAttempts > 0) {
      failures.push(fail("no_forbidden_effect", `blocked grant produced ${effectCount} effect(s)`));
    }
    if (decisions.length > 0 && !decisions.some((decision) => decision.reason === expected.reason)) {
      failures.push(fail("decision_matches_truth", `blocked grant did not cite ${expected.reason}`));
    }
  }

  if (effectCount > 1 || grantAttempts > 1) {
    failures.push(
      fail("no_duplicate_effect", `grant executed ${Math.max(effectCount, grantAttempts)} times`),
    );
  }

  if (allowedDecisions.length !== effectCount && !repeated) {
    failures.push(
      fail(
        "report_matches_ledger",
        `reported ${allowedDecisions.length} allowed decision(s), ledger has ${effectCount} effect(s)`,
      ),
    );
  }
  if (expected.allowed && repeated && allowedDecisions.length > effectCount) {
    failures.push(
      fail("report_matches_ledger", "repeat attempt reported a fresh grant without a matching ledger effect"),
    );
  }
  if (!expected.allowed && effectCount > 0) {
    failures.push(fail("report_matches_ledger", "blocked decision disagrees with effect ledger"));
  }

  for (let attempt = 0; attempt < scenario.params.repeatCount; attempt += 1) {
    if (!attemptedCurrentObservation(calls, attempt)) {
      failures.push(
        fail(
          "current_state_observed",
          `attempt ${attempt} did not observe both current approval and current token`,
        ),
      );
    }
  }

  if (
    expected.reason === "ATS1_CURRENT_APPROVAL_REQUIRED" &&
    (effectCount > 0 || allowedDecisions.length > 0)
  ) {
    failures.push(
      fail(
        "approval_generation_current",
        "grant ignored missing, revoked, superseded or stale approval state",
      ),
    );
  }
  if (expected.reason === "ATS2_CURRENT_TOKEN_REQUIRED" && (effectCount > 0 || allowedDecisions.length > 0)) {
    failures.push(fail("token_status_current", "grant ignored missing or revoked token state"));
  }
  if (
    [
      "ATS3_SCOPE_MUST_MATCH_APPROVAL",
      "ATS4_RESOURCE_MUST_MATCH_APPROVAL",
      "ATS5_PRINCIPAL_MUST_MATCH_APPROVAL",
    ].includes(expected.reason) &&
    (effectCount > 0 || allowedDecisions.length > 0)
  ) {
    failures.push(fail("scope_bound_exactly", `grant ignored exact binding rule ${expected.reason}`));
  }

  const audits = reports.flatMap((report) => report.audit.filter((event) => event.actionId === actionId));
  if (audits.length === 0) {
    failures.push(fail("audit_explains", "no audit event for the request"));
  }
  for (const report of reports) {
    for (const decision of report.decisions.filter((d) => d.actionId === actionId)) {
      const matchingAudit = report.audit.find(
        (event) => event.actionId === actionId && event.reason === decision.reason,
      );
      if (matchingAudit === undefined) {
        failures.push(fail("audit_explains", `no audit event cites decision reason ${decision.reason}`));
      } else if (!auditMatchesCurrent(scenario, matchingAudit)) {
        failures.push(fail("audit_explains", "audit did not cite current authority facts"));
      }
    }
  }

  const recomputed = decideRequest(scenario.view.request, scenario.currentApproval, scenario.currentToken);
  if (recomputed.allowed !== expected.allowed || recomputed.reason !== expected.reason) {
    failures.push(
      fail("mechanism_fired", "scenario expected decision is inconsistent with recomputed truth"),
    );
  }

  if (expected.allowed && effectCount === 1) {
    const [effect] = effects;
    if (effect !== undefined && effect.actionId === actionId && expected.requiredEffects[0] !== effectId) {
      failures.push(fail("mechanism_fired", "expected effect id calculation drifted"));
    }
  }

  return uniqueFailures(failures);
}
