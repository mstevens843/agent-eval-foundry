// Starter. Implement `run` and export `subject`.
//
// This is a SKELETON, not a working control layer: it reads the facade, refuses everything with one
// placeholder reason code, and writes an audit event with none of the observed fields filled in. It
// fails almost every hidden scenario as shipped. Replace the marked sections.
//
// Contract:
//   run(view, authority) -> { decisions: [{ actionId, allowed, reason }], audit: [...] }
//
// The authority facade is the current source of truth. Cached snapshots in `view` may be stale.
// SPEC.md holds the rules, the reason codes, and the audit fields every decision must carry.

export const subject = {
  id: "starter",
  label: "Starter skeleton - not an implementation",

  run(view, authority) {
    const actionId = view.request.id;
    const approval = authority.currentApproval(view.request.approvalId);
    const token = authority.currentToken(view.request.tokenId);

    // TODO: decide this request from `approval` and `token` above - the current authority - rather
    // than from view.cachedApproval / view.cachedToken, and apply the rules in SPEC.md in order.
    // Replace the placeholder below with the decision and the governing reason code.
    const allowed = false;
    const reason = "ATS1_CURRENT_APPROVAL_REQUIRED";

    // TODO: when (and only when) the request is authorized, issue exactly one grant:
    //   authority.issueToken(actionId, { approvalId, tokenId, principal, resource, scope });
    // The grant payload you send is graded against the request AND the current approval, so it must
    // carry exactly the approved authority and nothing broader.

    // TODO: replace the nulls with the current authority facts this decision actually used, and add
    // whatever further audit events SPEC.md requires.
    const audit = [
      {
        seq: 1,
        actionId,
        reason,
        observedApprovalId: null,
        observedApprovalGeneration: null,
        observedApprovalStatus: null,
        observedTokenId: null,
        observedTokenGeneration: null,
        observedTokenStatus: null,
        observedScope: null,
        observedResource: null,
        observedPrincipal: null,
        detail: "TODO: cite the current authority facts behind this decision",
      },
    ];

    return { decisions: [{ actionId, allowed, reason }], audit };
  },
};
