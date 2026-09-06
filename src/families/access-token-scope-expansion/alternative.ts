import { auditEvent } from "./reference.js";
import { decideRequest, grantFor } from "./truth.js";
import type { Subject } from "./types.js";
const receipts = new Map<string, string>();
/** Token-first reads and a receipt journal, rather than the reference's Boolean completion set.
 * Policy predicate/audit serialization are shared; no reference subject is called. */
export const alternative: Subject = {
  id: "alternative",
  label: "Receipt-journal authorization",
  run(view, authority) {
    const token = authority.currentToken(view.request.tokenId);
    const approval = authority.currentApproval(view.request.approvalId);
    const key = `${view.id}:${view.request.id}`;
    const verdict = receipts.has(key)
      ? { allowed: false, reason: "ATS6_NO_DUPLICATE_GRANT" as const }
      : decideRequest(view.request, approval, token);
    if (verdict.allowed)
      receipts.set(key, authority.issueToken(view.request.id, grantFor(view.request)).effectId);
    return {
      decisions: [{ actionId: view.request.id, ...verdict }],
      audit: [
        auditEvent(1, view.request.id, "OBSERVED", approval, token, "token then approval"),
        auditEvent(2, view.request.id, verdict.reason, approval, token, "receipt-journal decision"),
      ],
    };
  },
};
