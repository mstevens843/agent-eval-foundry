// Public domain model. Hidden truth, verifier, scenario selection and ledgers are absent.

export interface DurableIntent {
  readonly actionId: string;
  readonly requestId: string;
  readonly payload: string;
  /** Committed before any worker may call the external tool. */
  readonly idempotencyKey: string;
}

export interface RecoveryView {
  readonly intent: DurableIntent;
  readonly workerId: string;
  readonly leaseEpoch: number;
  readonly attempt: number;
}

export interface ToolRequest {
  readonly idempotencyKey: string;
  readonly payload: string;
}

export interface ToolReceipt {
  readonly ok: true;
  readonly effectId: string;
  readonly deduplicated: boolean;
}

export interface OutboxTool {
  execute(actionId: string, request: ToolRequest): ToolReceipt;
}

export interface AttemptReport {
  readonly actionId: string;
  readonly workerId: string;
  readonly leaseEpoch: number;
  readonly idempotencyKey: string;
  readonly outcome: "executed";
  readonly toolOk: true;
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  run(view: RecoveryView, tool: OutboxTool): AttemptReport;
}
