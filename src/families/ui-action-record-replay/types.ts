// The PUBLIC domain model for UI action record-and-replay.
//
// Shipped verbatim in the agent-facing package, so nothing here is ground truth. The scenario, its
// mutations and the effect ledger live in `truth.ts`.
//
// THE THESIS
//
// A model can discover a UI workflow. That is not the capability worth having. The capability worth
// having is a RECORDING that replays deterministically with no model in the loop — because a
// workflow that needs the model every time is not automation, it is a demo with a subscription.
//
// So the task is not "click the right thing". It is: record a trace whose every step carries what
// must be true before it and what must be true after it, then replay that trace against a UI that
// has changed underneath you, and either complete it or halt with a named reason. Improvising is a
// failure even when it works — `R6_NO_MODEL_IN_LOOP` is a rule, and the harness owns the channel
// that would let you break it.

export interface UiNode {
  readonly id: string;
  readonly role: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly text: string;
  readonly children: readonly UiNode[];
}

/**
 * How a step finds its target.
 *
 * Structural rather than textual on purpose: matching on visible text would make the family a string
 * exercise, and text is the one thing that legitimately changes between record and replay.
 */
export interface Selector {
  readonly kind: "testid" | "role_index" | "attr";
  readonly value: string;
  /** For `attr`: which attribute. For `role_index`: the index within the role. */
  readonly qualifier: string | null;
}

export const ACTION_KINDS = ["click", "type", "submit", "confirm"] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

/** What must hold before a step runs. A step with no precondition is a step that cannot halt safely. */
export interface Precondition {
  readonly nodeExists: boolean;
  /** Attribute the target must carry, and the value it must have. */
  readonly attr: string | null;
  readonly attrValue: string | null;
}

/** What must hold after. Observed, never assumed. */
export interface Postcondition {
  readonly effect: string | null;
  readonly attr: string | null;
  readonly attrValue: string | null;
}

export interface RecordedStep {
  readonly index: number;
  readonly kind: ActionKind;
  readonly selector: Selector;
  /**
   * The node id this step resolved to WHEN IT WAS RECORDED.
   *
   * Present because real recordings store it, and because it is the temptation the family exists to
   * measure: replaying against this id is faster, simpler, and wrong the moment the page changes.
   * A correct replayer treats it as a hint and resolves the selector live.
   */
  readonly recordedNodeId: string;
  readonly value: string | null;
  readonly precondition: Precondition;
  readonly postcondition: Postcondition;
  /** True when running this step twice would do the thing twice. */
  readonly irreversible: boolean;
}

export interface ActionTrace {
  readonly id: string;
  readonly steps: readonly RecordedStep[];
}

// ---------------------------------------------------------------- what a replayer may do

export interface QueryResult {
  readonly node: UiNode | null;
  /** How many nodes matched. More than one is ambiguous and must not be resolved by guessing. */
  readonly matches: number;
  /**
   * True when the region exists but has not finished loading.
   *
   * The distinction between "not there yet" and "not there" is the whole of `asyncSettled`, and it
   * has to be readable: a replayer that cannot tell them apart must either halt on everything absent
   * or re-record on everything absent, and both are wrong half the time. A real DOM exposes the same
   * thing through `aria-busy`.
   */
  readonly pending: boolean;
}

/**
 * The application facade.
 *
 * `askModel` exists and works. Using it is a rule violation, and the harness records every call —
 * which is what makes "no model in the loop" a measurement rather than an honour system. A facade
 * that simply omitted the method would measure nothing: the interesting failure is an implementation
 * that reaches for a model when the deterministic path gets hard.
 */
export interface AppFacade {
  /** Resolve a selector against the LIVE tree, right now. */
  query: (selector: Selector) => QueryResult;
  /** Read one attribute of a node, live. */
  attr: (nodeId: string, name: string) => string | null;
  click: (nodeId: string) => void;
  type: (nodeId: string, text: string) => void;
  submit: (nodeId: string) => void;
  /** Observe whether a confirmation is currently presented. */
  confirmationPresent: () => boolean;
  /** Accept the presented confirmation. Throws if none is presented. */
  acceptConfirmation: () => void;
  /** Available, recorded, and a rule violation to call. */
  askModel: (question: string) => string;
}

export const OUTCOMES = ["completed", "halted", "unreplayable"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export interface StepAudit {
  readonly index: number;
  /** The node id the selector actually resolved to at replay time, or null when it did not. */
  readonly resolvedNodeId: string | null;
  /** What the precondition check actually observed. Not "ok" — the observed value. */
  readonly preconditionObserved: string | null;
  readonly postconditionObserved: string | null;
  readonly confirmationObserved: boolean | null;
  readonly ran: boolean;
  /** Why the step did not run, when it did not. Named reasons only. */
  readonly haltReason: string | null;
}

export interface ReplayReport {
  readonly traceId: string;
  readonly outcome: Outcome;
  readonly steps: readonly StepAudit[];
  /** Set when the whole trace was refused as unreplayable, with the reason. */
  readonly unreplayableReason: string | null;
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  /**
   * Replay one recorded trace against a live app.
   *
   * Called once per replay. A scenario may call it twice with the same trace, which is the
   * idempotency test: the second run must not repeat an irreversible step.
   */
  readonly replay: (trace: ActionTrace, app: AppFacade) => ReplayReport;
}
