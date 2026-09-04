export const subject = {
  id: "committed-rollback-recovery",
  label: "Recover committed rollback key",

  run(view, controller) {
    const { intent } = view;
    const idempotencyKey = intent.idempotencyKey;

    const receipt = controller.compensate(intent.rollbackIntentId, {
      idempotencyKey,
      releaseId: intent.releaseId,
      regionId: intent.regionId,
      compensation: intent.compensation,
    });

    return {
      rollbackIntentId: intent.rollbackIntentId,
      controllerId: view.controllerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey,
      outcome: "compensated",
      controllerApplied: receipt.applied,
    };
  },
};
