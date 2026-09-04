export const subject = {
  id: "durable-outbox-recovery",
  label: "Recover committed idempotency key",

  run(view, tool) {
    const { intent, workerId, leaseEpoch } = view;
    const { actionId, payload, idempotencyKey } = intent;

    const receipt = tool.execute(actionId, {
      idempotencyKey,
      payload,
    });

    return {
      actionId,
      workerId,
      leaseEpoch,
      idempotencyKey,
      outcome: "executed",
      toolOk: receipt.ok,
    };
  },
};
