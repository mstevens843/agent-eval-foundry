import type { Subject, TradingVenue } from "./types.js";
const intents = new WeakMap<TradingVenue, Map<string, Parameters<TradingVenue["placeOrder"]>[1]>>();
export const alternative: Subject = {
  id: "alternative",
  label: "Detached committed order journal",
  run(view, venue) {
    let journal = intents.get(venue);
    if (!journal) {
      journal = new Map();
      intents.set(venue, journal);
    }
    let request = journal.get(view.intent.orderIntentId);
    if (!request) {
      const { idempotencyKey, accountId, symbol, side, quantity } = view.intent;
      request = structuredClone({ idempotencyKey, accountId, symbol, side, quantity });
      journal.set(view.intent.orderIntentId, request);
    }
    const receipt = venue.placeOrder(view.intent.orderIntentId, request);
    venue.placeOrder(view.intent.orderIntentId, request);
    return {
      orderIntentId: view.intent.orderIntentId,
      reconcilerId: view.reconcilerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey: request.idempotencyKey,
      outcome: "accepted",
      venueAccepted: receipt.accepted,
    };
  },
};
