// Durable outbox recovery.
//
// The idempotency key is committed into the durable intent *before* any worker is
// allowed to touch the external tool, so it is the only authority for retries.
// Lease state (workerId, leaseEpoch) is mutable across recoveries and therefore
// never contributes to the key -- it is only ever reported.

/**
 * Recover the committed idempotency key from the durable intent.
 * DOR1: never derived from view.workerId / view.leaseEpoch.
 */
function committedKey(intent) {
  const key = intent.idempotencyKey;
  if (typeof key === "string" && key.length > 0) return key;
  // Defensive only: the intent is required to carry the committed key. If it is
  // ever absent, fall back to durable fields alone so that every worker for the
  // action still agrees on one key and the tool still deduplicates.
  return `idem::${intent.actionId}::${intent.requestId}`;
}

export const subject = {
  id: "durable-outbox-recovery",
  label: "Recovers the committed idempotency key from the durable intent",

  run(view, tool) {
    const intent = view.intent;
    const actionId = intent.actionId;

    // DOR1 / DOR3: every attempt -- first delivery or post-crash retry under a new
    // worker and lease epoch -- sends the same committed key.
    const idempotencyKey = committedKey(intent);

    // DOR5: this attempt calls the tool. DOR2: because the key is identical across
    // attempts, the idempotent tool collapses them into exactly one external effect;
    // a deduplicated OK receipt is success, never a reason to mint a second key.
    const receipt = tool.execute(actionId, {
      idempotencyKey,
      payload: intent.payload,
    });

    // DOR4: report the action, the current worker and lease epoch, the exact key
    // that was sent, and the outcome actually observed from the tool.
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

export default subject;
