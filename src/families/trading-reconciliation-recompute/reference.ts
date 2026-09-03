import { attemptOrderKey, authorityOrderKey } from "./truth.js";
import type { Subject } from "./types.js";

export type KeyPolicy = "committed" | "authority" | "attempt";

export interface SubjectOptions {
  readonly keyPolicy: KeyPolicy;
  readonly callVenue: boolean;
  readonly reportSentKey: boolean;
}

export const REFERENCE_OPTIONS: SubjectOptions = {
  keyPolicy: "committed",
  callVenue: true,
  reportSentKey: true,
};

export const makeSubject = (
  id: string,
  label: string,
  options: SubjectOptions = REFERENCE_OPTIONS,
): Subject => ({
  id,
  label,
  run(view, venue) {
    const sentKey =
      options.keyPolicy === "committed"
        ? view.intent.idempotencyKey
        : options.keyPolicy === "authority"
          ? authorityOrderKey(view.intent.orderIntentId, view.intent.clientRequestId, view.authorityEpoch)
          : attemptOrderKey(view.intent.orderIntentId, view.intent.clientRequestId, view.attempt);
    const receipt = options.callVenue
      ? venue.placeOrder(view.intent.orderIntentId, {
          idempotencyKey: sentKey,
          accountId: view.intent.accountId,
          symbol: view.intent.symbol,
          side: view.intent.side,
          quantity: view.intent.quantity,
        })
      : { accepted: true as const, executionId: "invented-execution", deduplicated: false };
    return {
      orderIntentId: view.intent.orderIntentId,
      reconcilerId: view.reconcilerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey: options.reportSentKey ? sentKey : view.intent.idempotencyKey,
      outcome: "accepted",
      venueAccepted: receipt.accepted,
    };
  },
});

export const reference = makeSubject("reference", "Recover the committed client order key");
