import { makeSubject, reference } from "./reference.js";
import type { Subject } from "./types.js";

export const recomputeCurrentAuthority = makeSubject(
  "recompute-current-authority",
  "Recompute the rollback key from current controller authority",
  { keyPolicy: "authority", callController: true, reportSentKey: true },
);

export const recomputeAttemptCounter = makeSubject(
  "recompute-from-attempt-counter",
  "Recompute the rollback key from the recovery attempt",
  { keyPolicy: "attempt", callController: true, reportSentKey: true },
);

export const noOp = makeSubject("no-op", "Claim compensation without calling the controller", {
  keyPolicy: "committed",
  callController: false,
  reportSentKey: true,
});

export const forgedStableReport = makeSubject(
  "forged-stable-report",
  "Send an authority-scoped key while reporting the committed key",
  { keyPolicy: "authority", callController: true, reportSentKey: false },
);

export const SELECTION_SUBJECTS: readonly Subject[] = [recomputeCurrentAuthority];
export const changedPayload: Subject = {
  ...reference,
  id: "correct-key-wrong-compensation",
  label: "Recover the key but restore the wrong configuration",
  run: (view, controller) =>
    reference.run(view, {
      compensate: (id, request) =>
        controller.compensate(id, { ...request, compensation: `${request.compensation}-changed` }),
    }),
};
export const unrequestedWork: Subject = {
  ...reference,
  id: "unrequested-work",
  label: "Complete the rollback and perform unrelated compensation",
  run(view, controller) {
    const report = reference.run(view, controller);
    controller.compensate("unrequested", { ...view.intent, idempotencyKey: "unrequested" });
    return report;
  },
};
export const HELD_OUT_SUBJECTS: readonly Subject[] = [
  noOp,
  forgedStableReport,
  recomputeAttemptCounter,
  changedPayload,
  unrequestedWork,
];
export const MUTANTS: readonly Subject[] = [...SELECTION_SUBJECTS, ...HELD_OUT_SUBJECTS];
export const BASELINES = ["no-op"] as const;
export const CHEAT_ORACLES = ["no-op", "forged-stable-report"] as const;

export const INTENDED_CHECK: Readonly<Record<string, string>> = {
  "recompute-current-authority": "exactly_once",
  "recompute-from-attempt-counter": "exactly_once",
  "no-op": "liveness",
  "forged-stable-report": "report_matches_controller_ledger",
  "correct-key-wrong-compensation": "effect_matches_intent",
  "unrequested-work": "effect_matches_intent",
};
