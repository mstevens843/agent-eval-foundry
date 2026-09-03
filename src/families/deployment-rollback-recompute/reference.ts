import { attemptRollbackKey, authorityRollbackKey } from "./truth.js";
import type { Subject } from "./types.js";

export type KeyPolicy = "committed" | "authority" | "attempt";

export interface SubjectOptions {
  readonly keyPolicy: KeyPolicy;
  readonly callController: boolean;
  readonly reportSentKey: boolean;
}

export const REFERENCE_OPTIONS: SubjectOptions = {
  keyPolicy: "committed",
  callController: true,
  reportSentKey: true,
};

export const makeSubject = (
  id: string,
  label: string,
  options: SubjectOptions = REFERENCE_OPTIONS,
): Subject => ({
  id,
  label,
  run(view, controller) {
    const sentKey =
      options.keyPolicy === "committed"
        ? view.intent.idempotencyKey
        : options.keyPolicy === "authority"
          ? authorityRollbackKey(view.intent.rollbackIntentId, view.intent.releaseId, view.authorityEpoch)
          : attemptRollbackKey(view.intent.rollbackIntentId, view.intent.releaseId, view.attempt);
    const receipt = options.callController
      ? controller.compensate(view.intent.rollbackIntentId, {
          idempotencyKey: sentKey,
          releaseId: view.intent.releaseId,
          regionId: view.intent.regionId,
          compensation: view.intent.compensation,
        })
      : { applied: true as const, effectId: "invented-effect", deduplicated: false };
    return {
      rollbackIntentId: view.intent.rollbackIntentId,
      controllerId: view.controllerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey: options.reportSentKey ? sentKey : view.intent.idempotencyKey,
      outcome: "compensated",
      controllerApplied: receipt.applied,
    };
  },
});

export const reference = makeSubject("reference", "Recover the committed rollback key");
