// Neutral starter. Implement the normative contract in SPEC.md.
// This profile supplies the interface without seeding a key-selection strategy.

export const subject = {
  id: "starter-neutral",
  label: "Neutral durable-recovery skeleton",
  run(view, tool) {
    void tool;
    return {
      actionId: view.intent.actionId,
      workerId: view.workerId,
      leaseEpoch: view.leaseEpoch,
      idempotencyKey: "",
      outcome: "not_implemented",
      toolOk: false,
    };
  },
};
