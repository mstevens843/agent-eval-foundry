// Ground truth for the UI replay family. NEVER shipped in a challenge package.
//
// The effect ledger is the important thing in here. It is owned by the simulated application and
// exposes no read method to the subject: a replayer can cause a payment and can never see the record
// of payments. That is what makes `replay_idempotent` decidable — the harness knows the submit ran
// twice even if the subject's audit says it ran once.

import type { ActionTrace, UiNode } from "./types.js";

export interface ScenarioParams {
  readonly seed: number;
  /** What changed in the DOM between recording and replay. The core of the family. */
  readonly mutation:
    | "none"
    | "attribute_renamed"
    | "node_reordered"
    | "node_wrapped"
    | "text_changed"
    | "node_removed";
  /** How far into the trace the mutation bites. A defect at step 5 survives a smoke test of step 1. */
  readonly mutationDepth: number;
  readonly confirmation: "absent" | "present" | "suppressed";
  /** Whether the region under the selector has finished loading at replay time. */
  readonly asyncSettled: boolean;
  /** 1 or 2. Two exercises idempotency. */
  readonly replayCount: number;
}

export interface Scenario {
  readonly id: string;
  readonly params: ScenarioParams;
  /** The tree as it was when the trace was recorded. */
  readonly recordedTree: UiNode;
  /** The tree at replay time, after the mutation. */
  readonly liveTree: UiNode;
  readonly trace: ActionTrace;
  /**
   * Whether a correct replayer can complete this trace at all.
   *
   * `node_removed` at any depth makes the trace unreplayable: the target is gone and no amount of
   * care brings it back. The correct answer there is to report it as unreplayable, which is a
   * distinct outcome from halting mid-way and from completing.
   */
  readonly expectedOutcome: "completed" | "halted" | "unreplayable";
  /** The effects a correct replay produces, in order. */
  readonly expectedEffects: readonly string[];
}

export interface EffectRecord {
  readonly seq: number;
  readonly effect: string;
  readonly nodeId: string;
  readonly replayIndex: number;
}

/** Every call the subject made on the facade, including the ones it should not have made. */
export interface FacadeCall {
  readonly seq: number;
  readonly method: string;
  readonly detail: string;
  readonly replayIndex: number;
}
