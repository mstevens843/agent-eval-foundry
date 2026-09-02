// Starter. Implement `run` and export `subject`.
//
// This is a SKELETON, not a working control layer: it reads the facade, refuses everything with one
// placeholder reason code, and writes an audit event with none of the observed fields filled in. It
// fails almost every hidden scenario as shipped. Replace the marked sections.
//
// Contract:
//   run(view, authority) -> { decisions: [{ actionId, allowed, reason }], audit: [...] }
//
// The authority facade is the current source of truth. Cached snapshots and subject-written claims
// may be stale or false. SPEC.md holds the rules, the reason codes, and the audit fields every
// decision must carry.

export const subject = {
  id: "starter",
  label: "Starter skeleton - not an implementation",

  run(view, authority) {
    const actionId = view.request.id;
    const policy = authority.currentPolicy(view.request.policyId);
    const delegation = authority.currentDelegation(view.request.delegationId);
    const token = authority.currentToken(view.request.tokenId);
    const remainingBudget = authority.remainingBudget(view.request.walletId, view.request.owner);

    // TODO: reconcile the four current facts above and decide the spend from them - not from
    // view.cachedPolicy / view.cachedDelegation / view.cachedToken and not from any subject-owned
    // authority claim in the view. Apply the rules in SPEC.md in order and replace the placeholder
    // below with the decision and the governing reason code.
    const allowed = false;
    const reason = "DWS1_CURRENT_POLICY_REQUIRED";

    // TODO: when (and only when) current authority allows it, execute exactly one spend:
    //   authority.executeSpend(actionId, { policyId, delegationId, tokenId, owner, delegate,
    //                                      walletId, amount, idempotencyKey });
    // The effect payload you send is graded against the request and the current authority, so it
    // must carry exactly the authorized spend and nothing broader.

    // TODO: replace the nulls with the current authority facts this decision actually used, and add
    // whatever further audit events SPEC.md requires.
    const audit = [
      {
        seq: 1,
        actionId,
        reason,
        observedPolicyId: null,
        observedPolicyGeneration: null,
        observedPolicyStatus: null,
        observedPolicyMaxPerSpend: null,
        observedPolicyDailyLimit: null,
        observedDelegationId: null,
        observedDelegationGeneration: null,
        observedDelegationStatus: null,
        observedDelegationScope: null,
        observedDelegationMaxPerSpend: null,
        observedDelegationExpiresAt: null,
        observedTokenId: null,
        observedTokenGeneration: null,
        observedTokenStatus: null,
        observedTokenScope: null,
        observedTokenMaxPerSpend: null,
        observedRemainingBudget: null,
        usedSubjectAuthorityClaim: false,
        detail: "TODO: cite the current authority facts behind this decision",
      },
    ];

    return { decisions: [{ actionId, allowed, reason }], audit };
  },
};
