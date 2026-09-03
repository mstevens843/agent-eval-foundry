import type { ControllerRequest, RollbackIntent, RollbackRecoveryView, RollbackReport } from "./types.js";

export interface ScenarioParams {
  readonly seed: number;
  readonly nControllers: number;
  readonly effects: number;
  readonly crashPosition: "none" | "after_compensation";
}

export interface Scenario {
  readonly id: string;
  readonly params: ScenarioParams;
  readonly intent: RollbackIntent;
  readonly views: readonly RollbackRecoveryView[];
}

export interface ControllerCall {
  readonly seq: number;
  readonly attempt: number;
  readonly controllerId: string;
  readonly authorityEpoch: number;
  readonly rollbackIntentId: string;
  readonly request: ControllerRequest;
}

export interface RollbackEffect {
  readonly seq: number;
  readonly rollbackIntentId: string;
  readonly idempotencyKey: string;
  readonly releaseId: string;
  readonly regionId: string;
  readonly compensation: string;
  readonly effectId: string;
}

export interface VerificationInput {
  readonly scenario: Scenario;
  readonly reports: readonly RollbackReport[];
  readonly calls: readonly ControllerCall[];
  readonly effects: readonly RollbackEffect[];
}

export const committedRollbackKey = (rollbackIntentId: string, releaseId: string): string =>
  `rollback::${rollbackIntentId}::${releaseId}::authority-0`;

export const authorityRollbackKey = (
  rollbackIntentId: string,
  releaseId: string,
  authorityEpoch: number,
): string => `rollback::${rollbackIntentId}::${releaseId}::authority-${authorityEpoch}`;

export const attemptRollbackKey = (rollbackIntentId: string, releaseId: string, attempt: number): string =>
  `rollback::${rollbackIntentId}::${releaseId}::authority-${attempt * 17}`;

export const rollbackEffectId = (key: string): string => `rollback-effect::${key}`;

export const buildScenario = (params: ScenarioParams): Scenario => {
  const effectIndex = params.seed % params.effects;
  const releaseId = `release-${params.seed}-${params.effects}`;
  const rollbackIntentId = `rollback-intent-${params.seed}-${effectIndex}`;
  const intent: RollbackIntent = {
    rollbackIntentId,
    releaseId,
    regionId: ["us-west", "eu-central", "ap-south"][params.seed % 3] ?? "us-west",
    compensation: `restore-config-${effectIndex}`,
    idempotencyKey: committedRollbackKey(rollbackIntentId, releaseId),
  };
  const attempts = params.crashPosition === "after_compensation" ? params.nControllers : 1;
  return {
    id: `rollback-recovery-${params.seed}-c${params.nControllers}-e${params.effects}-${params.crashPosition}`,
    params,
    intent,
    views: Array.from({ length: attempts }, (_, attempt) => ({
      intent,
      controllerId: `controller-${attempt + 1}`,
      authorityEpoch: attempt * 11,
      attempt,
    })),
  };
};
