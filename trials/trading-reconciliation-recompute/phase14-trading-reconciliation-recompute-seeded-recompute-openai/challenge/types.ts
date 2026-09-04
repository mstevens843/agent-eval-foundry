// Public domain model. Hidden truth, verifier, scenario selection and ledgers are absent.

export interface OrderIntent {
  readonly orderIntentId: string;
  readonly clientRequestId: string;
  readonly accountId: string;
  readonly symbol: string;
  readonly side: "buy" | "sell";
  readonly quantity: number;
  /** Committed before any reconciler may submit the order. */
  readonly idempotencyKey: string;
}

export interface OrderRecoveryView {
  readonly intent: OrderIntent;
  readonly reconcilerId: string;
  readonly authorityEpoch: number;
  readonly attempt: number;
}

export interface VenueRequest {
  readonly idempotencyKey: string;
  readonly accountId: string;
  readonly symbol: string;
  readonly side: "buy" | "sell";
  readonly quantity: number;
}

export interface VenueReceipt {
  readonly accepted: true;
  readonly executionId: string;
  readonly deduplicated: boolean;
}

export interface TradingVenue {
  placeOrder(orderIntentId: string, request: VenueRequest): VenueReceipt;
}

export interface ReconciliationReport {
  readonly orderIntentId: string;
  readonly reconcilerId: string;
  readonly authorityEpoch: number;
  readonly idempotencyKey: string;
  readonly outcome: "accepted";
  readonly venueAccepted: true;
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  run(view: OrderRecoveryView, venue: TradingVenue): ReconciliationReport;
}
