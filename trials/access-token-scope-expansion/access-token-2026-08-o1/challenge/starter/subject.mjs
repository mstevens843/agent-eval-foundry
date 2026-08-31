// Starter. Implement `run` and export `subject`.
//
// Contract:
//   run(view, authority) -> { decisions: [{ actionId, allowed, reason }], audit: [...] }
//
// The authority facade is the current source of truth. Cached snapshots may be stale.

const completed = new Set();

const auditEvent = (seq, actionId, reason, approval, token, detail) => ({
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
});

export const subject = {
  id: "starter",
  label: "Starter stub - replace me",

  run(view, authority) {
    const approval = authority.currentApproval(view.request.approvalId);
    const token = authority.currentToken(view.request.tokenId);
    const actionId = view.request.id;
    const audit = [auditEvent(1, actionId, "OBSERVED", approval, token, "observed current authority")];

    let allowed = false;
    let reason = "ATS1_CURRENT_APPROVAL_REQUIRED";

    if (completed.has(actionId)) {
      reason = "ATS6_NO_DUPLICATE_GRANT";
    } else if (approval === null || approval.status !== "active" || approval.generation !== view.request.approvalGeneration) {
      reason = "ATS1_CURRENT_APPROVAL_REQUIRED";
    } else if (token === null || token.status !== "active") {
      reason = "ATS2_CURRENT_TOKEN_REQUIRED";
    } else if (view.request.scope !== approval.scope || token.scope !== approval.scope || token.scope !== view.request.scope) {
      reason = "ATS3_SCOPE_MUST_MATCH_APPROVAL";
    } else if (view.request.resource !== approval.resource || token.resource !== approval.resource || token.resource !== view.request.resource) {
      reason = "ATS4_RESOURCE_MUST_MATCH_APPROVAL";
    } else if (view.request.principal !== approval.principal || token.principal !== approval.principal || token.principal !== view.request.principal) {
      reason = "ATS5_PRINCIPAL_MUST_MATCH_APPROVAL";
    } else {
      allowed = true;
      reason = "ALLOWED";
      authority.issueToken(actionId, {
        approvalId: view.request.approvalId,
        tokenId: view.request.tokenId,
        principal: view.request.principal,
        resource: view.request.resource,
        scope: view.request.scope,
      });
      completed.add(actionId);
    }

    audit.push(auditEvent(2, actionId, reason, approval, token, "decision recorded"));
    return { decisions: [{ actionId, allowed, reason }], audit };
  },
};
