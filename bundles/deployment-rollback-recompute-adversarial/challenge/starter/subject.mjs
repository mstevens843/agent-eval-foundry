// Deliberately wrong after controller authority changes.
// Read SPEC.md, then recover the committed key from the durable rollback intent.

export const subject = {
  id: "starter",
  label: "Current-authority rollback-key recomputation starter",
  run(view, controller) {
    // WRONG: authorityEpoch changes when another controller recovers the rollback.
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
