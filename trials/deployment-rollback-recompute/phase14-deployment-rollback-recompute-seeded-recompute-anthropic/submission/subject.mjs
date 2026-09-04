// Recovery of one already-authorized rollback compensation.
//
// The idempotency key was committed into the durable rollback intent after authorization and
// before any controller call, so it is the only stable identity of the compensation. Controller
// identity, authority epoch and attempt number all change while the same intent is being
// recovered, so none of them may contribute to the key (DRR1). Sending the committed key on
// every attempt lets the idempotent controller collapse all retries onto the single effect that
// the first attempt may already have applied (DRR2, DRR3).

export const subject = {
  id: "committed-key-rollback-recovery",
  label: "Durable committed-key rollback recovery",
  run(view, controller) {
    const intent = view.intent;

    // Recovered verbatim from the durable intent, never recomputed from the current view.
    const idempotencyKey = intent.idempotencyKey;

    // The intent is authorized, so it always reaches the controller (DRR5). A previous
    // controller may have completed this compensation before its reply was lost; repeating the
    // committed key returns that original effect as a deduplicated receipt instead of applying
    // a second one.
    const receipt = controller.compensate(intent.rollbackIntentId, {
      idempotencyKey,
      releaseId: intent.releaseId,
      regionId: intent.regionId,
      compensation: intent.compensation,
    });

    // A deduplicated receipt is successful completion, so both receipt shapes report the same
    // outcome; every other field mirrors this attempt exactly as it was made (DRR4).
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

export default subject;
