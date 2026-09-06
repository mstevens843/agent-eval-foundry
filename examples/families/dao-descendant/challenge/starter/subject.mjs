// Recovery worker entrypoint.

export const subject = {
  id: "starter",
  label: "Recovery worker",
  run(view, tool) {
    const idempotencyKey =
      `idem::${view.intent.actionId}::${view.intent.requestId}::epoch-${view.leaseEpoch}`;
    const receipt = tool.execute(view.intent.actionId, {
      idempotencyKey,
      payload: view.intent.payload,
    });
    return {
      actionId: view.intent.actionId,
      workerId: view.workerId,
      leaseEpoch: view.leaseEpoch,
      idempotencyKey,
      outcome: "executed",
      toolOk: receipt.ok,
    };
  },
};
