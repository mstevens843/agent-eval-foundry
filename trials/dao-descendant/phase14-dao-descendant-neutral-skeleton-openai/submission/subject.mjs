export const subject = {
  id: "durable-outbox-recovery",
  label: "Recover committed idempotency key",

  run(view, tool) {
    const { actionId, payload, idempotencyKey } = view.intent;
    const receipt = tool.execute(actionId, {
      idempotencyKey,
      payload,
    });

    return {
      actionId,
      workerId: view.workerId,
      leaseEpoch: view.leaseEpoch,
      idempotencyKey,
      outcome: "executed",
      toolOk: receipt.ok,
    };
  },
};
