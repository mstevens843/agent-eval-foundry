// The PUBLIC domain model for replaying a recorded trace against a LIVE, MUTATING tree.
//
// Shipped verbatim into the challenge package, so nothing here is ground truth. The scenario, the
// reducer schedule, the expected outcome and both ledgers live in `truth.ts` and `app.ts`.
//
// WHY THIS FAMILY EXISTS, AND WHAT ITS PARENT GOT WRONG
//
// `ui-action-record-replay` measured one thing four times. Four counted agent trials failed 33, 46,
// 62 and 90 of its 324 scenarios and every pair NESTED — 33 ⊂ 46 ⊂ 62 ⊂ 90 — because every scenario
// in it rewarded the same disposition. Bailing out early was always right, so a stricter replayer
// dominated a laxer one everywhere and the catch sets were forced into a total order. Under the
// repository's own axis meter a chain has width 1 no matter how many subjects you add.
//
// The single cause was a facade field. The parent's `query` returned `{ node, matches, pending }`,
// and `pending: true` meant "the region is there and not ready yet". That is the family's central
// question — is this affordance GONE or merely NOT SETTLED — answered on demand by the harness. With
// the question answered for free, patience was never a bet, so there was nothing to trade off.
//
// `pending` IS DELETED HERE. `query` returns `{ node, matches, tick, treeVersion }` and nothing that
// speaks about the future. What a replayer gets instead is a page it can read and a clock it must
// pay for:
//
//   `data-entity`     identity of the OBJECT a node stands for. Survives a re-mount, CHANGES when a
//                     node is superseded by a different object wearing the same role and name.
//   `data-txn-state`  whether the enclosing region already has an open, half-finished transaction —
//                     possibly opened by a previous crashed replay this subject never ran.
//   `settle()`        one logical tick, drawn from a RATIONED budget. When it reports `advanced:
//                     false` there is no more time, and asking again is a stall.
//   the region        a torn-down region is absent from the tree; a region that is merely waiting is
//                     present and holds a skeleton placeholder carrying `pending:<entity>`.
//
// Those four are decisive on DIFFERENT scenario classes, and no single disposition satisfies all of
// them: settling more is right when a region mounts late and wrong when a foreign hold is open;
// re-deriving from the page is right after a re-mount and wrong after a supersede. That is the
// trade-off the parent lacked, and it is the only thing that lifts the antichain width above 1.

export interface UiNode {
  readonly id: string;
  readonly role: string;
  /**
   * Attributes. The load-bearing ones are `data-entity`, `data-region`, `aria-label`,
   * `aria-disabled`, `data-txn-state`, `data-txn-entity`, `data-testid` and `aria-busy`.
   *
   * `aria-busy` is EVIDENCE, NOT AN ORACLE. The `busyFidelity` knob is allowed to lie with it — a
   * spinner over content that will never mount, or no spinner over content that genuinely mounts
   * late. No scenario's correct answer depends on it, and the reference never reads it.
   */
  readonly attrs: Readonly<Record<string, string>>;
  readonly text: string;
  readonly children: readonly UiNode[];
}

/**
 * How a step names its target.
 *
 * Five kinds, because a recording made by a real tool stores whatever the page offered and the kinds
 * DISAGREE once the page moves. `css_path` is deliberately brittle under reorder and wrap; `testid`
 * dies when a framework re-mounts without one; `role_name` survives both and cannot tell two
 * renderings of the same row apart. A replayer that is loyal to exactly one kind is wrong wherever
 * that kind is the one that drifted — and those wrongs do not nest, which is the point.
 */
export interface Selector {
  readonly kind: "testid" | "role_name" | "attr" | "role_index" | "css_path";
  /** For `role_name`: `"<role>|<accessible name>"`. For `css_path`: child indices from the root. */
  readonly value: string;
  /** For `attr`: the attribute. For `role_index`: the index. For `role_name`: the region, or null. */
  readonly qualifier: string | null;
}

/**
 * The SEMANTIC anchor a recording stores beside the selector.
 *
 * Three identities that one tree cannot collapse into one:
 *
 *   node id       dies on any re-mount
 *   role+name+region  survives a re-mount AND survives a supersede — which is exactly why it is not
 *                 sufficient on its own
 *   entity        survives a re-mount, CHANGES on a supersede
 *
 * `role`, `name` and `region` are the MATCHER. `entity` is the GUARD: it is not used to find
 * candidates, it is compared against what was found. Making entity part of the matcher would quietly
 * turn "your object is gone" into "nothing matched", collapsing two findings that need different
 * answers back into one.
 */
export interface Anchor {
  readonly role: string;
  readonly name: string;
  readonly region: string;
  readonly entity: string;
}

export const ACTION_KINDS = ["click", "type", "submit"] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

/** What must hold before a step runs. Observed off the live node, never assumed from the recording. */
export interface Precondition {
  readonly attr: string;
  readonly attrValue: string;
}

export interface Postcondition {
  /** The irreversible effect this step causes, or null. */
  readonly effect: string | null;
}

export interface RecordedStep {
  readonly index: number;
  readonly kind: ActionKind;
  /** The primary way the recording names the target. */
  readonly selector: Selector;
  /** The structural path the recording ALSO stored. Brittle by design; kept because real tools keep it. */
  readonly path: Selector;
  /** The semantic anchor. Re-deriving from this is a first-class strategy, not an improvisation. */
  readonly anchor: Anchor;
  /**
   * The node id this step resolved to WHEN RECORDED.
   *
   * A hint, and the temptation the family measures: acting on it is faster and wrong the instant a
   * framework re-mounts, because a re-mount assigns new ids while keeping the entity.
   */
  readonly recordedNodeId: string;
  readonly value: string | null;
  readonly precondition: Precondition;
  readonly postcondition: Postcondition;
  /** Running this twice does the thing twice. */
  readonly irreversible: boolean;
  /** OPENS a two-phase transaction (`hold_funds`). Only these steps are subject to L12. */
  readonly opensTransaction: boolean;
  /** CLOSES one (`capture_funds`). */
  readonly closesTransaction: boolean;
}

export interface ActionTrace {
  readonly id: string;
  readonly steps: readonly RecordedStep[];
  /** Every entity this recording is entitled to act on. L12 compares a foreign hold against this. */
  readonly entities: readonly string[];
}

// ---------------------------------------------------------------- what a replayer may do

/**
 * `matches` is reported and the node is null when more than one matched: a selector that no longer
 * identifies one node has stopped being an address, and returning the first would be the guess.
 *
 * There is deliberately NO `pending` field. See the header.
 */
export interface QueryResult {
  readonly node: UiNode | null;
  readonly matches: number;
  readonly tick: number;
  readonly treeVersion: number;
}

/** Anchor re-derivation returns every candidate, so ambiguity is the caller's problem to refuse. */
export interface AnchorResult {
  readonly nodes: readonly UiNode[];
  readonly matches: number;
  readonly tick: number;
  readonly treeVersion: number;
}

/**
 * What a region looks like from outside.
 *
 * `present: false` is the difference between GONE and NOT YET, and it is a fact about the page right
 * now rather than a promise about the future — which is what separates it from the parent's
 * `pending` oracle. A region that is waiting is present and holds a skeleton child whose
 * `data-entity` is `pending:<entity>`.
 */
export interface RegionState {
  readonly present: boolean;
  /** `"idle"` or `"open"`. `"open"` means a two-phase transaction is half-finished. */
  readonly txnState: string | null;
  /** Which entity that open transaction belongs to. */
  readonly txnEntity: string | null;
}

/** One logical tick. `advanced: false` means the clock has stopped; asking again is a stall. */
export interface SettleResult {
  readonly advanced: boolean;
  readonly remaining: number;
  readonly tick: number;
}

/**
 * Actions FAIL SILENTLY, the way a real click on a detached or disabled node does.
 *
 * Nothing throws. A thrown error is loud and easy to handle; a swallowed click is why UI automation
 * is hard, and it is why `action_applied` exists — the audit's `ran: true` is a claim that the call
 * ledger can contradict.
 */
export interface ActionResult {
  readonly applied: boolean;
  /** `TARGET_DISABLED` | `DETACHED` | `STALE_HANDLE` | `CONFIRMATION_REQUIRED` | `NOT_A_CONFIRMATION` */
  readonly reason: string | null;
  readonly treeVersion: number;
}

/**
 * The application facade.
 *
 * `handleVersion` is the version a query reported when it handed the node over. Every mutation bumps
 * the tree version and DETACHES every handle taken before it — a React re-render, in miniature. Pass
 * it and a stale handle no-ops with `STALE_HANDLE`; omit it and you are asserting you re-read the
 * page yourself. "Query once, act many" is therefore a defect rather than a style.
 *
 * `askModel` exists and works. Calling it is a rule violation and the harness owns the channel, which
 * is what makes `no_model_in_loop` a measurement rather than an honour system.
 */
export interface AppFacade {
  query: (selector: Selector) => QueryResult;
  queryAnchor: (anchor: Anchor) => AnchorResult;
  attr: (nodeId: string, name: string) => string | null;
  regionState: (region: string) => RegionState;
  settle: () => SettleResult;
  click: (nodeId: string, handleVersion?: number) => ActionResult;
  type: (nodeId: string, text: string, handleVersion?: number) => ActionResult;
  /**
   * On a target declaring `data-opens-confirmation`, this MOUNTS an `alertdialog` and applies
   * nothing, returning `CONFIRMATION_REQUIRED`. The effect fires from `acceptConfirmation`.
   */
  submit: (nodeId: string, handleVersion?: number) => ActionResult;
  /** Accept a mounted confirmation by the id of its Confirm button. This is what fires the effect. */
  acceptConfirmation: (nodeId: string, handleVersion?: number) => ActionResult;
  askModel: (question: string) => string;
}

export const OUTCOMES = ["completed", "halted", "unreplayable"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export interface StepAudit {
  readonly index: number;
  /** The id actually acted on, or null. Must be a node the step could legitimately have identified. */
  readonly resolvedNodeId: string | null;
  /** `primary` | `anchor` | null — how it was found. An audit that cannot say this explains nothing. */
  readonly resolvedVia: string | null;
  readonly resolvedTick: number | null;
  /** The OBSERVED precondition value. Not "ok" — the value read off the live node. */
  readonly preconditionObserved: string | null;
  /** The `data-entity` read off the resolved node. The guard's evidence. */
  readonly entityObserved: string | null;
  readonly postconditionObserved: string | null;
  /** The Confirm button actually observed and accepted, or null. */
  readonly confirmationNodeId: string | null;
  readonly ran: boolean;
  readonly haltReason: string | null;
}

export interface ReplayReport {
  readonly traceId: string;
  readonly outcome: Outcome;
  readonly steps: readonly StepAudit[];
  readonly unreplayableReason: string | null;
  /**
   * Irreversible effects that FIRED and were not closed.
   *
   * Stopping between `hold_funds` and `capture_funds` is legal. Stopping without SAYING so leaves an
   * operator with money held and no record of it, which is `no_orphaned_transaction`.
   */
  readonly pendingEffects: readonly string[];
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  /**
   * Replay one recorded trace.
   *
   * A scenario may call this TWICE with the same trace against a FRESHLY REBUILT tree — the honest
   * model of re-running yesterday's recording on a fresh page load. The tree resets; the money does
   * not. The second call must not repeat either phase.
   */
  readonly replay: (trace: ActionTrace, app: AppFacade) => ReplayReport;
}
