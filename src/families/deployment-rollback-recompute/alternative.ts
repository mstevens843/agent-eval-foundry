import type { DeploymentController, Subject } from "./types.js";
const intents = new WeakMap<
  DeploymentController,
  Map<string, Parameters<DeploymentController["compensate"]>[1]>
>();
export const alternative: Subject = {
  id: "alternative",
  label: "Detached compensation journal",
  run(view, controller) {
    let journal = intents.get(controller);
    if (!journal) {
      journal = new Map();
      intents.set(controller, journal);
    }
    let request = journal.get(view.intent.rollbackIntentId);
    if (!request) {
      const { idempotencyKey, releaseId, regionId, compensation } = view.intent;
      request = structuredClone({ idempotencyKey, releaseId, regionId, compensation });
      journal.set(view.intent.rollbackIntentId, request);
    }
    const receipt = controller.compensate(view.intent.rollbackIntentId, request);
    controller.compensate(view.intent.rollbackIntentId, request);
    return {
      rollbackIntentId: view.intent.rollbackIntentId,
      controllerId: view.controllerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey: request.idempotencyKey,
      outcome: "compensated",
      controllerApplied: receipt.applied,
    };
  },
};
