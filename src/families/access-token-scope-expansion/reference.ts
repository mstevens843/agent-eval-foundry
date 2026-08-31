import type { DecisionReason } from "./spec.js";
import { decideRequest, grantFor, withAttempt } from "./truth.js";
import type {
  ApprovalRecord,
  AuditEvent,
  Decision,
  ScenarioView,
  Subject,
  SubjectReport,
  TokenRecord,
} from "./types.js";

const completed = new Map<string, Set<string>>();

export function resetCompletionRecords(): void {
  completed.clear();
}

const completedFor = (subjectId: string): Set<string> => {
  let set = completed.get(subjectId);
  if (set === undefined) {
    set = new Set();
    completed.set(subjectId, set);
  }
  return set;
};

export interface ReferenceOptions {
  readonly observeApproval: boolean;
  readonly observeToken: boolean;
  readonly ignoreApproval: boolean;
  readonly ignoreTokenStatus: boolean;
  readonly ignoreScopeResourcePrincipal: boolean;
  readonly guardDuplicates: boolean;
  readonly invokeEffects: boolean;
  readonly writeAudit: boolean;
  readonly overBlock: boolean;
}

export const REFERENCE_OPTIONS: ReferenceOptions = {
  observeApproval: true,
  observeToken: true,
  ignoreApproval: false,
  ignoreTokenStatus: false,
  ignoreScopeResourcePrincipal: false,
  guardDuplicates: true,
  invokeEffects: true,
  writeAudit: true,
  overBlock: false,
};

function auditEvent(
  seq: number,
  actionId: string,
  reason: DecisionReason | "OBSERVED",
  approval: ApprovalRecord | null,
  token: TokenRecord | null,
  detail: string,
): AuditEvent {
  return {
    seq,
    actionId,
    reason,
    observedApprovalId: approval?.id ?? null,
    observedApprovalGeneration: approval?.generation ?? null,
    observedApprovalStatus: approval?.status ?? null,
    observedTokenId: token?.id ?? null,
    observedTokenGeneration: token?.generation ?? null,
    observedTokenStatus: token?.status ?? null,
    observedScope: token?.scope ?? approval?.scope ?? null,
    observedResource: token?.resource ?? approval?.resource ?? null,
    observedPrincipal: token?.principal ?? approval?.principal ?? null,
    detail,
  };
}

function applyMutantBug(
  base: Decision,
  options: ReferenceOptions,
  approval: ApprovalRecord | null,
  token: TokenRecord | null,
): Decision {
  if (options.overBlock) return { ...base, allowed: false, reason: "ATS1_CURRENT_APPROVAL_REQUIRED" };
  if (options.ignoreApproval && base.reason === "ATS1_CURRENT_APPROVAL_REQUIRED") {
    return { ...base, allowed: true, reason: "ALLOWED" };
  }
  if (options.ignoreTokenStatus && base.reason === "ATS2_CURRENT_TOKEN_REQUIRED") {
    return { ...base, allowed: true, reason: "ALLOWED" };
  }
  if (
    options.ignoreScopeResourcePrincipal &&
    [
      "ATS3_SCOPE_MUST_MATCH_APPROVAL",
      "ATS4_RESOURCE_MUST_MATCH_APPROVAL",
      "ATS5_PRINCIPAL_MUST_MATCH_APPROVAL",
    ].includes(base.reason)
  ) {
    return { ...base, allowed: true, reason: "ALLOWED" };
  }
  if (
    approval !== null &&
    token !== null &&
    options.ignoreScopeResourcePrincipal &&
    token.status === "active"
  ) {
    return { ...base, allowed: true, reason: "ALLOWED" };
  }
  return base;
}

export function makeSubject(id: string, label: string, options: ReferenceOptions): Subject {
  return {
    id,
    label,
    run(view: ScenarioView, authority): SubjectReport {
      const approval = options.observeApproval
        ? authority.currentApproval(view.request.approvalId)
        : view.cachedApproval;
      const token = options.observeToken ? authority.currentToken(view.request.tokenId) : view.cachedToken;
      const actionId = view.request.id;
      const subjectDone = completedFor(id);
      const audit: AuditEvent[] = [];
      let seq = 0;

      if (options.writeAudit) {
        seq += 1;
        audit.push(
          auditEvent(seq, actionId, "OBSERVED", approval, token, "current authority facts observed"),
        );
      }

      const completionKey = `${view.id}:${actionId}`;

      if (options.guardDuplicates && subjectDone.has(completionKey)) {
        const decision: Decision = {
          actionId,
          allowed: false,
          reason: "ATS6_NO_DUPLICATE_GRANT",
        };
        if (options.writeAudit) {
          seq += 1;
          audit.push(auditEvent(seq, actionId, decision.reason, approval, token, "duplicate grant blocked"));
        }
        return { decisions: [decision], audit };
      }

      const expected = decideRequest(view.request, approval, token);
      const decision = applyMutantBug(
        { actionId, allowed: expected.allowed, reason: expected.reason },
        options,
        approval,
        token,
      );

      if (decision.allowed && options.invokeEffects) {
        authority.issueToken(actionId, grantFor(view.request));
        subjectDone.add(completionKey);
      }

      if (options.writeAudit) {
        seq += 1;
        audit.push(auditEvent(seq, actionId, decision.reason, approval, token, "decision recorded"));
      }

      return { decisions: [decision], audit };
    },
  };
}

export const reference = makeSubject(
  "reference",
  "Observes current approval/token state, binds exact scope and avoids duplicate grants",
  REFERENCE_OPTIONS,
);

export { withAttempt };
