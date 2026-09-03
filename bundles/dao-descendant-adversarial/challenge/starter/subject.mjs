// Starter skeleton. It is deliberately wrong after reassignment.
// Read SPEC.md, then replace the recomputation with recovery from the durable intent.

export const subject = {
  id: "starter",
  label: "Current-epoch recomputation starter",
  run(view, tool) {
    // WRONG: leaseEpoch changes when another worker recovers the action.
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
