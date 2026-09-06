import { makeSubject, reference } from "./reference.js";
import type { Subject } from "./types.js";

/** Narrow adversary: one policy switch differs from the reference. */
export const recomputeCurrentEpoch = makeSubject(
  "recompute-current-epoch",
  "Recompute the idempotency key from the current lease epoch",
  { recoverCommittedKey: false, callTool: true, reportSentKey: true },
);

export const noOp = makeSubject("no-op", "Report success without calling the external tool", {
  recoverCommittedKey: true,
  callTool: false,
  reportSentKey: true,
});

export const forgedStableReport = makeSubject(
  "forged-stable-report",
  "Use an epoch key while claiming the committed key",
  { recoverCommittedKey: false, callTool: true, reportSentKey: false },
);

export const changedPayload: Subject = {
  ...reference,
  id: "correct-key-wrong-payload",
  label: "Recover the key but execute a changed payload",
  run: (view, tool) =>
    reference.run(view, {
      execute: (id, request) => tool.execute(id, { ...request, payload: `${request.payload}-changed` }),
    }),
};
export const unrequestedWork: Subject = {
  ...reference,
  id: "unrequested-work",
  label: "Complete the intent and perform unrelated work",
  run(view, tool) {
    const report = reference.run(view, tool);
    tool.execute("unrequested", { idempotencyKey: "unrequested", payload: "unrequested" });
    return report;
  },
};
export const MUTANTS: readonly Subject[] = [
  recomputeCurrentEpoch,
  noOp,
  forgedStableReport,
  changedPayload,
  unrequestedWork,
];
export const BASELINES = ["no-op"] as const;
export const CHEAT_ORACLES = ["no-op", "forged-stable-report"] as const;

export const INTENDED_CHECK: Readonly<Record<string, string>> = {
  "recompute-current-epoch": "exactly_once",
  "no-op": "liveness",
  "forged-stable-report": "stable_key_recovered",
  "correct-key-wrong-payload": "effect_matches_intent",
  "unrequested-work": "effect_matches_intent",
};
