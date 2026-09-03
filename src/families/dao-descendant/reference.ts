import { recomputedKey } from "./truth.js";
import type { Subject } from "./types.js";

export interface ReferenceOptions {
  readonly recoverCommittedKey: boolean;
  readonly callTool: boolean;
  readonly reportSentKey: boolean;
}

export const REFERENCE_OPTIONS: ReferenceOptions = {
  recoverCommittedKey: true,
  callTool: true,
  reportSentKey: true,
};

export const makeSubject = (
  id: string,
  label: string,
  options: ReferenceOptions = REFERENCE_OPTIONS,
): Subject => ({
  id,
  label,
  run(view, tool) {
    const sentKey = options.recoverCommittedKey
      ? view.intent.idempotencyKey
      : recomputedKey(view.intent.actionId, view.intent.requestId, view.leaseEpoch);
    const receipt = options.callTool
      ? tool.execute(view.intent.actionId, {
          idempotencyKey: sentKey,
          payload: view.intent.payload,
        })
      : { ok: true as const, effectId: "invented-effect", deduplicated: false };
    return {
      actionId: view.intent.actionId,
      workerId: view.workerId,
      leaseEpoch: view.leaseEpoch,
      idempotencyKey: options.reportSentKey ? sentKey : view.intent.idempotencyKey,
      outcome: "executed",
      toolOk: receipt.ok,
    };
  },
});

export const reference = makeSubject("reference", "Recover the committed idempotency key");
