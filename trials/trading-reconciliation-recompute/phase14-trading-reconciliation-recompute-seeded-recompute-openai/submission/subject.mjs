export const subject = {
  id: "committed-order-key-reconciliation",
  label: "Committed order-key reconciliation",

  run(view, venue) {
    const { intent } = view;
    const idempotencyKey = intent.idempotencyKey;

    const receipt = venue.placeOrder(intent.orderIntentId, {
      idempotencyKey,
      accountId: intent.accountId,
      symbol: intent.symbol,
      side: intent.side,
      quantity: intent.quantity,
    });

    return {
      orderIntentId: intent.orderIntentId,
      reconcilerId: view.reconcilerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey,
      outcome: "accepted",
      venueAccepted: receipt.accepted,
    };
  },
};
