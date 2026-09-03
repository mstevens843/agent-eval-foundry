import type { OrderIntent, OrderRecoveryView, ReconciliationReport, VenueRequest } from "./types.js";

export interface ScenarioParams {
  readonly seed: number;
  readonly nReconcilers: number;
  readonly orders: number;
  readonly crashPosition: "none" | "after_venue_accept";
}

export interface Scenario {
  readonly id: string;
  readonly params: ScenarioParams;
  readonly intent: OrderIntent;
  readonly views: readonly OrderRecoveryView[];
}

export interface VenueCall {
  readonly seq: number;
  readonly attempt: number;
  readonly reconcilerId: string;
  readonly authorityEpoch: number;
  readonly orderIntentId: string;
  readonly request: VenueRequest;
}

export interface TradeExecution {
  readonly seq: number;
  readonly orderIntentId: string;
  readonly idempotencyKey: string;
  readonly accountId: string;
  readonly symbol: string;
  readonly side: "buy" | "sell";
  readonly quantity: number;
  readonly executionId: string;
}

export interface VerificationInput {
  readonly scenario: Scenario;
  readonly reports: readonly ReconciliationReport[];
  readonly calls: readonly VenueCall[];
  readonly effects: readonly TradeExecution[];
}

export const committedOrderKey = (orderIntentId: string, clientRequestId: string): string =>
  `order::${orderIntentId}::${clientRequestId}::authority-0`;

export const authorityOrderKey = (
  orderIntentId: string,
  clientRequestId: string,
  authorityEpoch: number,
): string => `order::${orderIntentId}::${clientRequestId}::authority-${authorityEpoch}`;

export const attemptOrderKey = (orderIntentId: string, clientRequestId: string, attempt: number): string =>
  `order::${orderIntentId}::${clientRequestId}::authority-${attempt * 13}`;

export const executionId = (key: string): string => `execution::${key}`;

export const buildScenario = (params: ScenarioParams): Scenario => {
  const orderIndex = params.seed % params.orders;
  const orderIntentId = `order-intent-${params.seed}-${orderIndex}`;
  const clientRequestId = `client-request-${params.seed}-${params.orders}`;
  const intent: OrderIntent = {
    orderIntentId,
    clientRequestId,
    accountId: `account-${(params.seed % 3) + 1}`,
    symbol: ["ALPHA", "BETA", "GAMMA"][params.seed % 3] ?? "ALPHA",
    side: params.seed % 2 === 0 ? "buy" : "sell",
    quantity: (orderIndex + 1) * 10,
    idempotencyKey: committedOrderKey(orderIntentId, clientRequestId),
  };
  const attempts = params.crashPosition === "after_venue_accept" ? params.nReconcilers : 1;
  return {
    id: `order-recovery-${params.seed}-r${params.nReconcilers}-o${params.orders}-${params.crashPosition}`,
    params,
    intent,
    views: Array.from({ length: attempts }, (_, attempt) => ({
      intent,
      reconcilerId: `reconciler-${attempt + 1}`,
      authorityEpoch: attempt * 7,
      attempt,
    })),
  };
};
