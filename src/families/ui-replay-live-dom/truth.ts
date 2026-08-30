// Ground truth. NEVER shipped in a challenge package.
//
// `expectedOutcome`, `expectedReason` and `expectedEffects` are the adjudication RESULT. The
// adjudication RULES are published verbatim in SPEC.md (L1..L13, with their precedence) because a
// family whose answer cannot be derived from the shipped rules plus the shipped page is measuring
// luck. Which fate actually occurred, and which points are the incomparability witnesses, are NOT
// published — that is the line between a declared space and a hidden rule.

import type { ActionTrace, UiNode } from "./types.js";

export const REGION_FATES = [
  "stable",
  "late_mount",
  "superseded",
  "remount_rekeyed",
  "disabled_then_enabled",
  "removed",
] as const;
export type RegionFate = (typeof REGION_FATES)[number];

export const PRIOR_STATES = ["clean", "arming", "foreign_hold"] as const;
export type PriorState = (typeof PRIOR_STATES)[number];

export interface ScenarioParams {
  /**
   * Not cosmetic. `settlesAt` is derived from seed AND fate together, and INVERTED between the two
   * seeds, so each seed is on the affordable side of the budget threshold for one fate and the
   * unaffordable side for another. A seed that only ever made one fate expensive would be a single
   * arithmetic fact standing in for an axis.
   */
  readonly seed: number;
  /** What step 1's own click does to the region step 6 needs. The replayer causes its own mismatch. */
  readonly regionFate: RegionFate;
  /** The state the page is in before replay begins. `foreign_hold` is a crashed run's leftovers. */
  readonly priorState: PriorState;
  /** How many `settle()` ticks the harness will grant for the WHOLE replay pass. Rationed. */
  readonly settleBudget: number;
  /** `duplicated` mounts a twin of whatever the anchor matches, making re-derivation ambiguous. */
  readonly anchorFidelity: "exact" | "duplicated";
  /**
   * Internal scenario knob for the categorical anchor axis.
   *
   * `none` leaves the target addressed normally. The other values make the recorded test id,
   * semantic anchor, and structural path resolve to three different live nodes; exactly one of those
   * nodes still carries the recorded entity/effect/precondition. The field name is ground-truth
   * metadata and is never shipped in the challenge package.
   */
  readonly anchorConflict: "none" | "testid_wins" | "semantic_wins" | "path_wins";
  /** Whether `aria-busy` tells the truth. Declared, never load-bearing. */
  readonly busyFidelity: "honest" | "misleading";
  /** 1 or 2. Two replays, FRESH TREE each pass, one accumulating money ledger. */
  readonly replayCount: number;
}

export interface Scenario {
  readonly id: string;
  readonly params: ScenarioParams;
  /** The tick at which this scenario's deferred mount/enable lands. 0 when nothing is deferred. */
  readonly settlesAt: number;
  /** Ticks a correct replayer must spend across the whole pass. `settleBudget >= this` is affordable. */
  readonly settlesNeeded: number;
  /** The tree as it was when the trace was recorded: pristine, `clean`, `stable`. */
  readonly recordedTree: UiNode;
  /** The tree at tick 0 of replay, before step 1's reactions fire. */
  readonly initialTree: UiNode;
  readonly trace: ActionTrace;
  readonly expectedOutcome: "completed" | "halted" | "unreplayable";
  /**
   * The reason a correct replayer names.
   *
   * Recorded for the family report's check breakdown, and deliberately NOT graded for string
   * equality. Grading the reason string would re-nest the family: a strict subject that bails on a
   * superseded target reaches the RIGHT outcome (`unreplayable`, no capture) by a cruder route, and
   * failing it for the wording would make strictness dominate again.
   */
  readonly expectedReason: string | null;
  /** The effects a correct replay produces, as `label@entity`, in order, across all passes. */
  readonly expectedEffects: readonly string[];
}

export interface EffectRecord {
  readonly seq: number;
  readonly effect: string;
  readonly nodeId: string;
  /** Which OBJECT the effect landed on. The whole of `effect_targets_recorded_entity`. */
  readonly entity: string;
  readonly replayIndex: number;
  readonly tick: number;
}

/** Every facade call, including the ones that should not have been made. */
export interface FacadeCall {
  readonly seq: number;
  readonly method: string;
  readonly detail: string;
  readonly replayIndex: number;
  readonly tick: number;
  /**
   * For write calls only: was the target a node this trace was entitled to touch?
   *
   * Scoped as (any step's live primary or anchor match) ∪ (the mounted confirmation subtree) ∪ (any
   * recorded node id). The parent shipped a check that punished the reference for clicking a
   * prerequisite; a rule that forbids every write but the step's own target forbids accepting the
   * dialog the step itself mounted.
   */
  readonly permitted: boolean | null;
}
