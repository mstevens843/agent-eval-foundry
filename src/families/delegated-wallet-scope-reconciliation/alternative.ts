import { auditEvent } from "./reference.js";
import { decideSpend, spendEffectFor } from "./truth.js";
import type { Subject } from "./types.js";
const receipts = new Map<string, string>();
export const alternative: Subject = {
  id: "alternative",
  label: "Budget-first authority join with receipt journal",
  run(view, authority) {
    const budget = authority.remainingBudget(view.request.walletId, view.request.owner);
    const token = authority.currentToken(view.request.tokenId);
    const delegation = authority.currentDelegation(view.request.delegationId);
    const policy = authority.currentPolicy(view.request.policyId);
    const key = `${view.id}:${view.request.idempotencyKey}`;
    const verdict = receipts.has(key)
      ? { allowed: false, reason: "DWS8_NO_DUPLICATE_SPEND" as const }
      : decideSpend(view.request, policy, delegation, token, budget);
    if (verdict.allowed)
      receipts.set(key, authority.executeSpend(view.request.id, spendEffectFor(view.request)).effectId);
    return {
      decisions: [{ actionId: view.request.id, ...verdict }],
      audit: [
        auditEvent(
          1,
          view.request.id,
          "OBSERVED",
          policy,
          delegation,
          token,
          budget,
          false,
          "budget-first authority join",
        ),
        auditEvent(
          2,
          view.request.id,
          verdict.reason,
          policy,
          delegation,
          token,
          budget,
          false,
          "receipt-journal decision",
        ),
      ],
    };
  },
};
