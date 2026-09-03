import type { AttemptReport, DurableIntent, RecoveryView, ToolRequest } from "./types.js";

export interface ScenarioParams {
  readonly seed: number;
  readonly nWorkers: number;
  readonly keys: number;
  readonly crashPosition: "none" | "after_tool";
}

export interface Scenario {
  readonly id: string;
  readonly params: ScenarioParams;
  readonly intent: DurableIntent;
  readonly views: readonly RecoveryView[];
}

export interface ToolCall {
  readonly seq: number;
  readonly attempt: number;
  readonly workerId: string;
  readonly leaseEpoch: number;
  readonly actionId: string;
  readonly request: ToolRequest;
}

export interface ExternalEffect {
  readonly seq: number;
  readonly actionId: string;
  readonly idempotencyKey: string;
  readonly payload: string;
  readonly effectId: string;
}

export interface VerificationInput {
  readonly scenario: Scenario;
  readonly reports: readonly AttemptReport[];
  readonly calls: readonly ToolCall[];
  readonly effects: readonly ExternalEffect[];
}

export const committedKey = (actionId: string, requestId: string): string =>
  `idem::${actionId}::${requestId}::epoch-0`;

export const recomputedKey = (actionId: string, requestId: string, leaseEpoch: number): string =>
  `idem::${actionId}::${requestId}::epoch-${leaseEpoch}`;

export const effectId = (key: string): string => `effect::${key}`;

export const buildScenario = (params: ScenarioParams): Scenario => {
  const target = params.seed % params.keys;
  const actionId = `action-${params.seed}-${target}`;
  const requestId = `request-${params.seed}-${params.keys}`;
  const intent: DurableIntent = {
    actionId,
    requestId,
    payload: `payload-${params.seed}-${target}`,
    idempotencyKey: committedKey(actionId, requestId),
  };
  const attempts = params.crashPosition === "after_tool" ? params.nWorkers : 1;
  return {
    id: `recovery-${params.seed}-w${params.nWorkers}-k${params.keys}-${params.crashPosition}`,
    params,
    intent,
    views: Array.from({ length: attempts }, (_, attempt) => ({
      intent,
      workerId: `worker-${attempt + 1}`,
      leaseEpoch: attempt,
      attempt,
    })),
  };
};
