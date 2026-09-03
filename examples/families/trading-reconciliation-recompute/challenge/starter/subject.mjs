// Deliberately wrong after reconciliation authority changes.
// Read SPEC.md, then recover the committed key from the durable order intent.

export const subject = {
  id: "starter",
  label: "Current-authority order-key recomputation starter",
  run(view, venue) {
    // WRONG: authorityEpoch changes when a new reconciler takes ownership.
    const idempotencyKey =
      `order::${view.intent.orderIntentId}::${view.intent.clientRequestId}::authority-${view.authorityEpoch}`;
    const receipt = venue.placeOrder(view.intent.orderIntentId, {
      idempotencyKey,
      accountId: view.intent.accountId,
      symbol: view.intent.symbol,
      side: view.intent.side,
      quantity: view.intent.quantity,
    });
    return {
      orderIntentId: view.intent.orderIntentId,
      reconcilerId: view.reconcilerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey,
      outcome: "accepted",
      venueAccepted: receipt.accepted,
    };
  },
};
