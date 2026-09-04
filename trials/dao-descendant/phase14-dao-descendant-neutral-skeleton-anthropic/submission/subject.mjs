// Durable outbox recovery.
//
// The idempotency key is committed to the durable intent before any worker is
// allowed to touch the external tool, so the key is authority: every attempt --
// first delivery or post-crash retry under a brand new worker and lease epoch --
// replays that same committed key. workerId and leaseEpoch are mutable lease
// state and are reported, never used to build a key (DOR1).

/**
 * Read the committed key out of the durable intent.
 * Nothing here consults the worker or the lease epoch.
 */
function committedKey(intent) {
  if (!intent || typeof intent !== "object") return "";

  const direct = intent.idempotencyKey;
  if (typeof direct === "string" && direct.length > 0) return direct;

  // Defensive only: if the durable record spells the field differently, the key
  // still comes from the intent rather than from anything recomputed.
  for (const field of ["committedIdempotencyKey", "committedKey", "idempotency_key", "key"]) {
    const value = intent[field];
    if (typeof value === "string" && value.length > 0) return value;
  }

  // A queue of durable keys: the committed one is the first that was ever queued,
  // so later epochs converge on it instead of draining a fresh key each time.
  for (const field of ["idempotencyKeys", "queuedKeys", "keyQueue", "keys"]) {
    const list = intent[field];
    if (Array.isArray(list)) {
      const first = list.find((k) => typeof k === "string" && k.length > 0);
      if (first !== undefined) return first;
    }
  }

  return "";
}

export const subject = {
  id: "durable-outbox-recovery",
  label: "Replays the committed idempotency key on every attempt",

  run(view, tool) {
    const intent = view.intent;
    const idempotencyKey = committedKey(intent);

    // Exactly one tool call per attempt: retries collectively yield one effect
    // because the key is unchanged, and a deduplicated receipt is success, not a
    // reason to mint a replacement key (DOR2, DOR3, DOR5).
    const receipt = tool.execute(intent.actionId, {
      idempotencyKey,
      payload: intent.payload,
    });

    // Report exactly what this attempt did: the key that was sent on the wire and
    // the outcome observed from the tool (DOR4).
    return {
      actionId: intent.actionId,
      workerId: view.workerId,
      leaseEpoch: view.leaseEpoch,
      idempotencyKey,
      outcome: "executed",
      toolOk: receipt ? receipt.ok !== false : false,
    };
  },
};

export default subject;
