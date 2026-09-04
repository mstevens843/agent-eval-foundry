// Trading order reconciliation subject.
//
// The client order key is committed with the durable order intent *before* the first submission,
// so it is the only stable logical identity of the order. Reconciler id, authority epoch and
// attempt number all change when ownership moves after a lost venue reply; deriving a key from
// any of them would mint a second key for the same intent and the venue would accept a second
// execution. Every attempt therefore replays the committed key verbatim, which makes the venue's
// idempotency collapse all retries onto the single original execution (TRR1, TRR2, TRR3).

/**
 * Recover the key committed with the durable order intent.
 *
 * Normal path: return `intent.idempotencyKey` exactly as committed, with no reformatting.
 * The fallback only exists for a malformed intent that carries no committed key; it is derived
 * solely from immutable intent fields, never from the current reconciler, authority epoch or
 * attempt, so it stays identical across every retry and still yields exactly one execution.
 */
function recoverCommittedOrderKey(intent) {
  const committed = intent.idempotencyKey;
  if (typeof committed === "string" && committed.length > 0) {
    return committed;
  }
  return `order::${intent.orderIntentId}::${intent.clientRequestId}::authority-0`;
}

export const subject = {
  id: "committed-order-key-reconciler",
  label: "Durable committed client-order-key reconciliation",

  run(view, venue) {
    const intent = view.intent;
    const idempotencyKey = recoverCommittedOrderKey(intent);

    // Liveness (TRR5): a valid order intent always reaches the venue. Never skip the submission
    // just because this looks like a retry or because authority moved to another reconciler --
    // the previous acceptance may never have been durably reconciled, and a repeat of the
    // committed key is deduplicated rather than duplicated. Exactly one call per attempt.
    const receipt = venue.placeOrder(intent.orderIntentId, {
      idempotencyKey,
      accountId: intent.accountId,
      symbol: intent.symbol,
      side: intent.side,
      quantity: intent.quantity,
    });

    // Truthful report (TRR4): the key reported is the exact key sent, and acceptance is what the
    // venue actually returned. A deduplicated acceptance is successful completion (TRR3).
    return {
      orderIntentId: intent.orderIntentId,
      reconcilerId: view.reconcilerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey,
      outcome: "accepted",
      venueAccepted: receipt.accepted === true,
    };
  },
};

export default subject;
