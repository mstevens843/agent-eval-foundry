// The novelty baseline that Phase 15 and Phase 16 actually reviewed.
//
// THE DEFECT THIS REPAIRS, found in Phase 17 while packaging the first prospective survivor.
//
// A reader packet's `packetSha256` is the identity two independent blind readers reviewed, and both
// phases embedded the built-family list into that packet as the novelty baseline - by reading the
// shape registry LIVE at render time. So the hash of a frozen artifact was a function of mutable
// repository state. Adding this phase's own family changed the Phase 16 CAA packet from
// `45475d79...` to `9bf28a39...`: the packet whose 2-of-2 promotion is the entire basis for building
// that candidate could no longer be reproduced.
//
// Phase 15 failed loudly (`waf-complexity-reader-a: stale packet hash`). PHASE 16 DID NOT, because
// its continuation compares stored reviews against stored packets and never re-renders. That is the
// worse half: the same class as `DEFECT-TAXONOMY.md` B1, a rule that nothing enforces, sitting under
// the evidence chain rather than inside a task.
//
// The list below is the exact 21-family baseline both runs used, captured from baseline commit
// c3005fe. It is data, not a derivation, and it must never be regenerated from the live registry:
// regenerating it is the defect.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface FrozenNoveltyFamily {
  readonly familyId: string;
  readonly domain: string;
  readonly mechanisms: readonly string[];
}

interface FrozenNoveltyBaselineFile {
  readonly schema: "agent-eval-foundry/frozen-novelty-baseline@1";
  readonly recordedFor: readonly string[];
  readonly capturedFromCommit: string;
  readonly families: readonly FrozenNoveltyFamily[];
}

export const FROZEN_NOVELTY_BASELINE_PATH = "data/phase-novelty-baseline-2026-09.json";

/** The recorded baseline, for a run whose reader packets are already frozen. */
export function frozenNoveltyBaseline(root: string): readonly FrozenNoveltyFamily[] {
  const parsed = JSON.parse(
    readFileSync(join(root, FROZEN_NOVELTY_BASELINE_PATH), "utf8"),
  ) as FrozenNoveltyBaselineFile;
  if (parsed.schema !== "agent-eval-foundry/frozen-novelty-baseline@1") {
    throw new Error(`${FROZEN_NOVELTY_BASELINE_PATH}: unexpected schema ${parsed.schema}`);
  }
  if (parsed.families.length === 0) {
    throw new Error(`${FROZEN_NOVELTY_BASELINE_PATH}: empty baseline; a frozen packet cannot be rebuilt`);
  }
  return parsed.families;
}
