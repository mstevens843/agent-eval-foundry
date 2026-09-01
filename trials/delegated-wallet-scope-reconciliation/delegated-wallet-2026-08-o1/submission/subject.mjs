const completedIdempotencyKeys = new Set();

const ACTIVE = "active";
const SPEND = "spend";

const callOrNull = (fn) => {
  try {
    const value = fn();
    return value === undefined ? null : value;
  } catch {
    return null;
  }
};

const observedAuditEvent = (
  seq,
  actionId,
  reason,
  policy,
  delegation,
  token,
  remainingBudget,
  detail,
) => ({
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
  usedSubjectAuthorityClaim: false,
  detail,
});

const policyBlocks = (policy, request) =>
  policy === null ||
  policy.id !== request.policyId ||
  policy.status !== ACTIVE ||
  policy.owner !== request.owner ||
  policy.walletId !== request.walletId;

const delegationBlocks = (delegation, request) =>
  delegation === null ||
  delegation.id !== request.delegationId ||
  delegation.status !== ACTIVE ||
  delegation.generation !== request.delegationGeneration ||
  delegation.owner !== request.owner ||
  delegation.delegate !== request.delegate ||
  delegation.walletId !== request.walletId ||
  delegation.expiresAt <= request.observedAt;

const tokenBlocks = (token, delegation, request) =>
  token === null ||
  token.id !== request.tokenId ||
  token.status !== ACTIVE ||
  token.generation !== request.tokenGeneration ||
  token.generation !== delegation.generation ||
  token.delegate !== request.delegate ||
  token.walletId !== request.walletId ||
  token.issuedFromDelegationId !== delegation.id;

const scopeBlocks = (request, delegation, token) =>
  request.requestedScope !== SPEND ||
  delegation.scope !== SPEND ||
  token.scope !== SPEND;

const spendEffect = (request) => ({
  policyId: request.policyId,
  delegationId: request.delegationId,
  tokenId: request.tokenId,
  owner: request.owner,
  delegate: request.delegate,
  walletId: request.walletId,
  amount: request.amount,
  idempotencyKey: request.idempotencyKey,
});

export const subject = {
  id: "delegated-wallet-reconciler",
  label: "Delegated wallet authority reconciler",

  run(view, authority) {
    const request = view.request;
    const actionId = request.id;

    const policy = callOrNull(() => authority.currentPolicy(request.policyId));
    const delegation = callOrNull(() => authority.currentDelegation(request.delegationId));
    const token = callOrNull(() => authority.currentToken(request.tokenId));
    const remainingBudget = callOrNull(() =>
      authority.remainingBudget(request.walletId, request.owner),
    );

    const audit = [
      observedAuditEvent(
        1,
        actionId,
        "OBSERVED",
        policy,
        delegation,
        token,
        remainingBudget,
        "observed current authority facade facts",
      ),
    ];

    let allowed = false;
    let reason = "DWS1_CURRENT_POLICY_REQUIRED";

    if (completedIdempotencyKeys.has(request.idempotencyKey)) {
      reason = "DWS8_NO_DUPLICATE_SPEND";
    } else if (policyBlocks(policy, request)) {
      reason = "DWS1_CURRENT_POLICY_REQUIRED";
    } else if (delegationBlocks(delegation, request)) {
      reason = "DWS2_CURRENT_DELEGATION_REQUIRED";
    } else if (tokenBlocks(token, delegation, request)) {
      reason = "DWS3_CURRENT_TOKEN_REQUIRED";
    } else if (scopeBlocks(request, delegation, token)) {
      reason = "DWS4_DELEGATION_SCOPE_REQUIRED";
    } else if (
      request.amount > Math.min(policy.maxPerSpend, delegation.maxPerSpend, token.maxPerSpend)
    ) {
      reason = "DWS5_REQUEST_WITHIN_CURRENT_LIMIT";
    } else if (remainingBudget === null || request.amount > remainingBudget) {
      reason = "DWS6_REMAINING_BUDGET_REQUIRED";
    } else {
      const result = callOrNull(() => authority.executeSpend(actionId, spendEffect(request)));
      if (result?.ok === true) {
        completedIdempotencyKeys.add(request.idempotencyKey);
        allowed = true;
        reason = "ALLOWED";
      } else {
        completedIdempotencyKeys.add(request.idempotencyKey);
        reason = "DWS8_NO_DUPLICATE_SPEND";
      }
    }

    audit.push(
      observedAuditEvent(
        2,
        actionId,
        reason,
        policy,
        delegation,
        token,
        remainingBudget,
        "decision recorded from current authority facts",
      ),
    );

    return {
      decisions: [{ actionId, allowed, reason }],
      audit,
    };
  },
};
