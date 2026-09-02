import {
  type AuthorityCall,
  type EffectRecord,
  type Scenario,
  decideRequest,
  expectedEffectId,
} from "./truth.js";
import type { AuditEvent, SubjectReport, TokenGrant } from "./types.js";

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

/**
 * Expiry-shaped fields a subject might attach to a grant.
 *
 * Nothing in this family's approval or request carries an expiry, so a grant that carries one is
 * asserting authority no approval ever gave it. The sibling wallet family checks its effect payload
 * the same way (`effectViolatesTruth` there); this list is the access-token equivalent for the one
 * grant field the domain model does not have.
 */
const GRANT_EXPIRY_FIELDS = ["expiresAt", "expiry", "notAfter", "validUntil", "ttl", "ttlSeconds"] as const;

/**
 * Compare an ISSUED grant against the request and the current approval, field by field.
 *
 * WHY THIS EXISTS. Every other clause below reads decision strings. A subject that makes all the
 * correct decisions and then calls `issueToken` with `scope: "admin:invoice"`, `resource:
 * "invoice-*"`, `principal: "ops-bot"` passed the whole verifier — measured 0 failures out of 384,
 * a 0% detection rate — because nothing looked at the effect payload. The decision is not the
 * grant. What the authority ends up holding is the grant, so the grant is what has to be bound.
 */
function grantBindingMismatches(scenario: Scenario, grant: TokenGrant | null | undefined): readonly string[] {
  const request = scenario.view.request;
  const approval = scenario.currentApproval;
  if (grant === null || grant === undefined || typeof grant !== "object") {
    return ["grant payload is missing, so the issued authority cannot be bound to anything"];
  }
  const issued = grant as TokenGrant & Record<string, unknown>;
  const out: string[] = [];

  const bind = (field: string, value: unknown, requested: unknown, approved: unknown): void => {
    if (value !== requested) {
      out.push(`grant ${field} ${String(value)} is not the requested ${String(requested)}`);
      return;
    }
    if (approved !== undefined && value !== approved) {
      out.push(`grant ${field} ${String(value)} is not the current approval's ${String(approved)}`);
    }
  };

  bind("scope", issued.scope, request.scope, approval?.scope);
  bind("resource", issued.resource, request.resource, approval?.resource);
  bind("principal", issued.principal, request.principal, approval?.principal);
  bind("approvalId", issued.approvalId, request.approvalId, approval?.id);
  bind("tokenId", issued.tokenId, request.tokenId, undefined);

  for (const field of GRANT_EXPIRY_FIELDS) {
    const carried = issued[field];
    if (carried !== undefined && carried !== null) {
      out.push(`grant carries ${field} ${String(carried)}, which no approval in this family grants`);
    }
  }

  return out;
}

export function verify(input: VerifyInput): readonly Failure[] {
  const { scenario, reports, effects, calls } = input;
  const failures: Failure[] = [];
  const expected = scenario.expected;
  const actionId = scenario.view.request.id;
  const repeated = scenario.params.repeatCount > 1;
  const effectId = expectedEffectId(scenario.view.request);
  const ownEffects = effects.filter((e) => e.actionId === actionId);
  const effectCount = ownEffects.length;
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

  // The decision-string half of `scope_bound_exactly` is above. This is the effect half: whatever
  // the subject DECIDED, the grant it actually issued has to name the requested and currently
  // approved principal, resource and scope, and nothing wider.
  for (const effect of ownEffects) {
    const mismatches = grantBindingMismatches(scenario, effect.grant);
    if (mismatches.length > 0) {
      failures.push(
        fail("scope_bound_exactly", `issued grant is not bound exactly: ${mismatches.join("; ")}`),
      );
    }
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
