// Rollback controller entrypoint.

export const subject = {
  id: "starter",
  label: "Rollback controller",
  run(view, controller) {
    const idempotencyKey =
      `rollback::${view.intent.rollbackIntentId}::${view.intent.releaseId}::authority-${view.authorityEpoch}`;
    const receipt = controller.compensate(view.intent.rollbackIntentId, {
      idempotencyKey,
      releaseId: view.intent.releaseId,
      regionId: view.intent.regionId,
      compensation: view.intent.compensation,
    });
    return {
      rollbackIntentId: view.intent.rollbackIntentId,
      controllerId: view.controllerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey,
      outcome: "compensated",
      controllerApplied: receipt.applied,
    };
  },
};
