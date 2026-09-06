// Order reconciliation entrypoint.

export const subject = {
  id: "starter",
  label: "Order reconciler",
  run(view, venue) {
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
