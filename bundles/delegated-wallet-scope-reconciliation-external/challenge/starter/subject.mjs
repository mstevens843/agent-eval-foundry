// Starter. Implement `run` and export `subject`.
//
// Contract:
//   run(view, authority) -> { decisions: [{ actionId, allowed, reason }], audit: [...] }
//
// The authority facade is the current source of truth. Cached snapshots and subject-written claims
// may be stale or false.

const completed = new Set();

const auditEvent = (seq, actionId, reason, policy, delegation, token, remainingBudget, detail) => ({
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

export const subject = {
  id: "starter",
  label: "Starter stub - replace me",

  run(view, authority) {
    const policy = authority.currentPolicy(view.request.policyId);
    const delegation = authority.currentDelegation(view.request.delegationId);
    const token = authority.currentToken(view.request.tokenId);
    const remainingBudget = authority.remainingBudget(view.request.walletId, view.request.owner);
    const actionId = view.request.id;
    const audit = [
      auditEvent(1, actionId, "OBSERVED", policy, delegation, token, remainingBudget, "observed current wallet authority"),
    ];

    let allowed = false;
    let reason = "DWS1_CURRENT_POLICY_REQUIRED";
    const completionKey = view.request.idempotencyKey;

    if (completed.has(completionKey)) {
      reason = "DWS8_NO_DUPLICATE_SPEND";
    } else if (policy === null || policy.status !== "active") {
      reason = "DWS1_CURRENT_POLICY_REQUIRED";
    } else if (
      delegation === null ||
      delegation.status !== "active" ||
      delegation.generation !== view.request.delegationGeneration ||
      delegation.owner !== view.request.owner ||
      delegation.delegate !== view.request.delegate ||
      delegation.walletId !== view.request.walletId ||
      delegation.expiresAt <= view.request.observedAt
    ) {
      reason = "DWS2_CURRENT_DELEGATION_REQUIRED";
    } else if (
      token === null ||
      token.status !== "active" ||
      token.generation !== view.request.tokenGeneration ||
      token.generation !== delegation.generation ||
      token.delegate !== view.request.delegate ||
      token.walletId !== view.request.walletId ||
      token.issuedFromDelegationId !== delegation.id
    ) {
      reason = "DWS3_CURRENT_TOKEN_REQUIRED";
    } else if (view.request.requestedScope !== "spend" || delegation.scope !== "spend" || token.scope !== "spend") {
      reason = "DWS4_DELEGATION_SCOPE_REQUIRED";
    } else {
      const allowedLimit = Math.min(policy.maxPerSpend, delegation.maxPerSpend, token.maxPerSpend);
      if (view.request.amount > allowedLimit) {
        reason = "DWS5_REQUEST_WITHIN_CURRENT_LIMIT";
      } else if (remainingBudget === null || view.request.amount > remainingBudget) {
        reason = "DWS6_REMAINING_BUDGET_REQUIRED";
      } else {
        allowed = true;
        reason = "ALLOWED";
        authority.executeSpend(actionId, {
          policyId: view.request.policyId,
          delegationId: view.request.delegationId,
          tokenId: view.request.tokenId,
          owner: view.request.owner,
          delegate: view.request.delegate,
          walletId: view.request.walletId,
          amount: view.request.amount,
          idempotencyKey: view.request.idempotencyKey,
        });
        completed.add(completionKey);
      }
    }

    audit.push(auditEvent(2, actionId, reason, policy, delegation, token, remainingBudget, "decision recorded"));
    return { decisions: [{ actionId, allowed, reason }], audit };
  },
};
