import type { DecisionReason } from "./spec.js";
import { decideSpend, spendEffectFor, withAttempt } from "./truth.js";
import type {
  AuditEvent,
  Decision,
  DelegationRecord,
  ScenarioView,
  Subject,
  SubjectReport,
  WalletPolicy,
  WalletToken,
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
  readonly observePolicy: boolean;
  readonly observeDelegation: boolean;
  readonly observeToken: boolean;
  readonly observeBudget: boolean;
  readonly trustSubjectAuthorityClaim: boolean;
  readonly trustRequestedAuthority: boolean;
  readonly ignoreRevocation: boolean;
  readonly ignoreDowngrade: boolean;
  readonly ignoreBudget: boolean;
  readonly guardDuplicates: boolean;
  readonly invokeEffects: boolean;
  readonly writeAudit: boolean;
  readonly lieAudit: boolean;
  readonly overBlock: boolean;
  readonly allowEverything: boolean;
}

export const REFERENCE_OPTIONS: ReferenceOptions = {
  observePolicy: true,
  observeDelegation: true,
  observeToken: true,
  observeBudget: true,
  trustSubjectAuthorityClaim: false,
  trustRequestedAuthority: false,
  ignoreRevocation: false,
  ignoreDowngrade: false,
  ignoreBudget: false,
  guardDuplicates: true,
  invokeEffects: true,
  writeAudit: true,
  lieAudit: false,
  overBlock: false,
  allowEverything: false,
};

function auditEvent(
  seq: number,
  actionId: string,
  reason: DecisionReason | "OBSERVED",
  policy: WalletPolicy | null,
  delegation: DelegationRecord | null,
  token: WalletToken | null,
  remainingBudget: number | null,
  usedSubjectAuthorityClaim: boolean,
  detail: string,
): AuditEvent {
  return {
    seq,
    actionId,
    reason,
    observedPolicyId: policy?.id ?? null,
    observedPolicyGeneration: policy?.generation ?? null,
    observedPolicyStatus: policy?.status ?? null,
    observedPolicyMaxPerSpend: policy?.maxPerSpend ?? null,
    observedPolicyDailyLimit: policy?.dailyLimit ?? null,
    observedDelegationId: delegation?.id ?? null,
    observedDelegationGeneration: delegation?.generation ?? null,
    observedDelegationStatus: delegation?.status ?? null,
    observedDelegationScope: delegation?.scope ?? null,
    observedDelegationMaxPerSpend: delegation?.maxPerSpend ?? null,
    observedDelegationExpiresAt: delegation?.expiresAt ?? null,
    observedTokenId: token?.id ?? null,
    observedTokenGeneration: token?.generation ?? null,
    observedTokenStatus: token?.status ?? null,
    observedTokenScope: token?.scope ?? null,
    observedTokenMaxPerSpend: token?.maxPerSpend ?? null,
    observedRemainingBudget: remainingBudget,
    usedSubjectAuthorityClaim,
    detail,
  };
}

function claimedPolicy(view: ScenarioView): WalletPolicy | null {
  if (view.subjectAuthorityClaim === null) return view.cachedPolicy;
  return view.cachedPolicy === null
    ? null
    : {
        ...view.cachedPolicy,
        generation: view.subjectAuthorityClaim.policyGeneration,
        maxPerSpend: view.subjectAuthorityClaim.maxPerSpend,
        dailyLimit: view.subjectAuthorityClaim.remainingBudget,
        status: "active",
      };
}

function claimedDelegation(view: ScenarioView): DelegationRecord | null {
  if (view.subjectAuthorityClaim === null) return view.cachedDelegation;
  return view.cachedDelegation === null
    ? null
    : {
        ...view.cachedDelegation,
        generation: view.subjectAuthorityClaim.delegationGeneration,
        maxPerSpend: view.subjectAuthorityClaim.maxPerSpend,
        expiresAt: view.request.observedAt + 500,
        status: "active",
      };
}

function claimedToken(view: ScenarioView): WalletToken | null {
  if (view.subjectAuthorityClaim === null) return view.cachedToken;
  return view.cachedToken === null
    ? null
    : {
        ...view.cachedToken,
        generation: view.subjectAuthorityClaim.tokenGeneration,
        maxPerSpend: view.subjectAuthorityClaim.maxPerSpend,
        status: "active",
      };
}

function applyMutantBug(
  base: Decision,
  options: ReferenceOptions,
  view: ScenarioView,
  policy: WalletPolicy | null,
  delegation: DelegationRecord | null,
  token: WalletToken | null,
  remainingBudget: number | null,
): Decision {
  if (options.allowEverything) return { ...base, allowed: true, reason: "ALLOWED" };
  if (options.overBlock) return { ...base, allowed: false, reason: "DWS1_CURRENT_POLICY_REQUIRED" };
  if (options.trustSubjectAuthorityClaim && view.subjectAuthorityClaim !== null) {
    return { ...base, allowed: true, reason: "ALLOWED" };
  }
  if (
    options.ignoreRevocation &&
    base.reason === "DWS2_CURRENT_DELEGATION_REQUIRED" &&
    policy !== null &&
    delegation !== null &&
    token !== null
  ) {
    return { ...base, allowed: true, reason: "ALLOWED" };
  }
  if (options.ignoreDowngrade && base.reason === "DWS5_REQUEST_WITHIN_CURRENT_LIMIT") {
    return { ...base, allowed: true, reason: "ALLOWED" };
  }
  if (options.ignoreBudget && base.reason === "DWS6_REMAINING_BUDGET_REQUIRED") {
    return { ...base, allowed: true, reason: "ALLOWED" };
  }
  if (
    options.trustRequestedAuthority &&
    (base.reason === "DWS4_DELEGATION_SCOPE_REQUIRED" || base.reason === "DWS5_REQUEST_WITHIN_CURRENT_LIMIT")
  ) {
    return { ...base, allowed: true, reason: "ALLOWED" };
  }
  if (
    options.trustRequestedAuthority &&
    policy !== null &&
    delegation !== null &&
    token !== null &&
    remainingBudget !== null &&
    view.request.amount <= remainingBudget
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
      const usedSubjectAuthority = options.trustSubjectAuthorityClaim && view.subjectAuthorityClaim !== null;
      const policy = usedSubjectAuthority
        ? claimedPolicy(view)
        : options.observePolicy
          ? authority.currentPolicy(view.request.policyId)
          : view.cachedPolicy;
      const delegation = usedSubjectAuthority
        ? claimedDelegation(view)
        : options.observeDelegation
          ? authority.currentDelegation(view.request.delegationId)
          : view.cachedDelegation;
      const token = usedSubjectAuthority
        ? claimedToken(view)
        : options.observeToken
          ? authority.currentToken(view.request.tokenId)
          : view.cachedToken;
      const remainingBudget = usedSubjectAuthority
        ? (view.subjectAuthorityClaim?.remainingBudget ?? null)
        : options.observeBudget
          ? authority.remainingBudget(view.request.walletId, view.request.owner)
          : (view.subjectAuthorityClaim?.remainingBudget ?? policy?.dailyLimit ?? null);
      const actionId = view.request.id;
      const subjectDone = completedFor(id);
      const audit: AuditEvent[] = [];
      let seq = 0;
      const auditedPolicy = options.lieAudit ? view.cachedPolicy : policy;
      const auditedDelegation = options.lieAudit ? view.cachedDelegation : delegation;
      const auditedToken = options.lieAudit ? view.cachedToken : token;
      const auditedBudget = options.lieAudit
        ? (view.subjectAuthorityClaim?.remainingBudget ?? null)
        : remainingBudget;

      if (options.writeAudit) {
        seq += 1;
        audit.push(
          auditEvent(
            seq,
            actionId,
            "OBSERVED",
            auditedPolicy,
            auditedDelegation,
            auditedToken,
            auditedBudget,
            usedSubjectAuthority,
            "current wallet authority facts observed",
          ),
        );
      }

      const completionKey = `${view.id}:${view.request.idempotencyKey}`;
      if (options.guardDuplicates && subjectDone.has(completionKey)) {
        const decision: Decision = {
          actionId,
          allowed: false,
          reason: "DWS8_NO_DUPLICATE_SPEND",
        };
        if (options.writeAudit) {
          seq += 1;
          audit.push(
            auditEvent(
              seq,
              actionId,
              decision.reason,
              auditedPolicy,
              auditedDelegation,
              auditedToken,
              auditedBudget,
              usedSubjectAuthority,
              "duplicate spend blocked",
            ),
          );
        }
        return { decisions: [decision], audit };
      }

      const expected = decideSpend(
        view.request,
        policy,
        delegation,
        token,
        options.ignoreBudget ? Number.POSITIVE_INFINITY : remainingBudget,
      );
      const decision = applyMutantBug(
        { actionId, allowed: expected.allowed, reason: expected.reason },
        options,
        view,
        policy,
        delegation,
        token,
        remainingBudget,
      );

      if (decision.allowed && options.invokeEffects) {
        authority.executeSpend(actionId, spendEffectFor(view.request));
        subjectDone.add(completionKey);
      }

      if (options.writeAudit) {
        seq += 1;
        audit.push(
          auditEvent(
            seq,
            actionId,
            decision.reason,
            auditedPolicy,
            auditedDelegation,
            auditedToken,
            auditedBudget,
            usedSubjectAuthority,
            "decision recorded",
          ),
        );
      }

      return { decisions: [decision], audit };
    },
  };
}

export const reference = makeSubject(
  "reference",
  "Reconciles current wallet policy, delegation, token and budget before spending",
  REFERENCE_OPTIONS,
);

export { withAttempt };
