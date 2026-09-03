// Public domain model. Hidden truth, verifier, scenario selection and ledgers are absent.

export interface RollbackIntent {
  readonly rollbackIntentId: string;
  readonly releaseId: string;
  readonly regionId: string;
  readonly compensation: string;
  /** Committed after rollback authorization and before any controller call. */
  readonly idempotencyKey: string;
}

export interface RollbackRecoveryView {
  readonly intent: RollbackIntent;
  readonly controllerId: string;
  readonly authorityEpoch: number;
  readonly attempt: number;
}

export interface ControllerRequest {
  readonly idempotencyKey: string;
  readonly releaseId: string;
  readonly regionId: string;
  readonly compensation: string;
}

export interface ControllerReceipt {
  readonly applied: true;
  readonly effectId: string;
  readonly deduplicated: boolean;
}

export interface DeploymentController {
  compensate(rollbackIntentId: string, request: ControllerRequest): ControllerReceipt;
}

export interface RollbackReport {
  readonly rollbackIntentId: string;
  readonly controllerId: string;
  readonly authorityEpoch: number;
  readonly idempotencyKey: string;
  readonly outcome: "compensated";
  readonly controllerApplied: true;
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  run(view: RollbackRecoveryView, controller: DeploymentController): RollbackReport;
}
