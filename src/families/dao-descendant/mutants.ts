import { makeSubject } from "./reference.js";
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

export const MUTANTS: readonly Subject[] = [recomputeCurrentEpoch, noOp, forgedStableReport];
export const BASELINES = ["no-op"] as const;
export const CHEAT_ORACLES = ["no-op", "forged-stable-report"] as const;

export const INTENDED_CHECK: Readonly<Record<string, string>> = {
  "recompute-current-epoch": "exactly_once",
  "no-op": "liveness",
  "forged-stable-report": "stable_key_recovered",
};
