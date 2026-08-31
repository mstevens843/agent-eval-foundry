const completedGrantKeys = new Set();

const decisionAudit = (seq, actionId, reason, request, approval, token, detail) => ({
  seq,
  actionId,
  reason,
  observedApprovalId: approval?.id ?? null,
  observedApprovalGeneration: approval?.generation ?? null,
  observedApprovalStatus: approval?.status ?? null,
  observedTokenId: token?.id ?? null,
  observedTokenGeneration: token?.generation ?? null,
  observedTokenStatus: token?.status ?? null,
  observedScope: observedValue("scope", request, approval, token),
  observedResource: observedValue("resource", request, approval, token),
  observedPrincipal: observedValue("principal", request, approval, token),
  detail,
});

const observedValue = (field, request, approval, token) => {
  const expected = request[field];
  const approvalValue = approval?.[field] ?? null;
  const tokenValue = token?.[field] ?? null;

  if (approvalValue !== null && approvalValue !== expected) {
    return approvalValue;
  }

  if (tokenValue !== null && tokenValue !== expected) {
    return tokenValue;
  }

  if (approvalValue !== null && tokenValue !== null && approvalValue !== tokenValue) {
    return approvalValue;
  }

  return tokenValue ?? approvalValue;
};

const completedKey = (view) => {
  const request = view.request;

  return JSON.stringify([
    view.id,
    request.id,
    request.approvalId,
    request.tokenId,
    request.approvalGeneration,
    request.principal,
    request.resource,
    request.scope,
  ]);
};

const firstBlockingReason = (request, approval, token) => {
  if (
    approval === null ||
    approval.status !== "active" ||
    approval.generation !== request.approvalGeneration
  ) {
    return "ATS1_CURRENT_APPROVAL_REQUIRED";
  }

  if (token === null || token.status !== "active") {
    return "ATS2_CURRENT_TOKEN_REQUIRED";
  }

  if (
    request.scope !== approval.scope ||
    request.scope !== token.scope ||
    approval.scope !== token.scope
  ) {
    return "ATS3_SCOPE_MUST_MATCH_APPROVAL";
  }

  if (
    request.resource !== approval.resource ||
    request.resource !== token.resource ||
    approval.resource !== token.resource
  ) {
    return "ATS4_RESOURCE_MUST_MATCH_APPROVAL";
  }

  if (
    request.principal !== approval.principal ||
    request.principal !== token.principal ||
    approval.principal !== token.principal
  ) {
    return "ATS5_PRINCIPAL_MUST_MATCH_APPROVAL";
  }

  return null;
};

export const subject = {
  id: "authority-ledger-exact-match",
  label: "Authority-ledger exact match",

  run(view, authority) {
    const request = view.request;
    const actionId = request.id;
    const approval = authority.currentApproval(request.approvalId);
    const token = authority.currentToken(request.tokenId);
    const key = completedKey(view);

    let allowed = false;
    let reason = firstBlockingReason(request, approval, token);
    let detail = "blocked by current authority state";

    if (reason === null) {
      if (completedGrantKeys.has(key)) {
        reason = "ATS6_NO_DUPLICATE_GRANT";
        detail = "grant already completed for this scenario request";
      } else {
        const issue = authority.issueToken(actionId, {
          approvalId: request.approvalId,
          tokenId: request.tokenId,
          principal: request.principal,
          resource: request.resource,
          scope: request.scope,
        });

        if (issue?.ok === true) {
          allowed = true;
          reason = "ALLOWED";
          completedGrantKeys.add(key);
          detail = "grant effect accepted by authority";
        } else {
          reason = "ATS6_NO_DUPLICATE_GRANT";
          detail = "authority rejected duplicate grant effect";
        }
      }
    }

    return {
      decisions: [{ actionId, allowed, reason }],
      audit: [decisionAudit(1, actionId, reason, request, approval, token, detail)],
    };
  },
};
