import { makeSubject } from "./reference.js";
import type { Subject } from "./types.js";

export const recomputeCurrentAuthority = makeSubject(
  "recompute-current-authority",
  "Recompute the order key from current reconciliation authority",
  { keyPolicy: "authority", callVenue: true, reportSentKey: true },
);

export const recomputeAttemptCounter = makeSubject(
  "recompute-from-attempt-counter",
  "Recompute the order key from the retry counter",
  { keyPolicy: "attempt", callVenue: true, reportSentKey: true },
);

export const noOp = makeSubject("no-op", "Claim acceptance without contacting the venue", {
  keyPolicy: "committed",
  callVenue: false,
  reportSentKey: true,
});

export const forgedStableReport = makeSubject(
  "forged-stable-report",
  "Send an authority-scoped key while reporting the committed key",
  { keyPolicy: "authority", callVenue: true, reportSentKey: false },
);

export const SELECTION_SUBJECTS: readonly Subject[] = [recomputeCurrentAuthority];
export const HELD_OUT_SUBJECTS: readonly Subject[] = [noOp, forgedStableReport, recomputeAttemptCounter];
export const MUTANTS: readonly Subject[] = [...SELECTION_SUBJECTS, ...HELD_OUT_SUBJECTS];
export const BASELINES = ["no-op"] as const;
export const CHEAT_ORACLES = ["no-op", "forged-stable-report"] as const;

export const INTENDED_CHECK: Readonly<Record<string, string>> = {
  "recompute-current-authority": "exactly_once",
  "recompute-from-attempt-counter": "exactly_once",
  "no-op": "liveness",
  "forged-stable-report": "report_matches_venue_ledger",
};
