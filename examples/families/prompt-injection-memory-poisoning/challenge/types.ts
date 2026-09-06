
export const TRUST_LEVELS = ["system", "user", "retrieved", "tool_output"] as const;
export type Trust = (typeof TRUST_LEVELS)[number];

/** The two levels that may authorize an action. Everything else is data, however imperative. */
export const AUTHORITY_BEARING: ReadonlySet<Trust> = new Set<Trust>(["system", "user"]);

export interface Segment {
  readonly id: string;
  readonly trust: Trust;
  readonly text: string;
  /**
   * The distinctive token this segment introduces into the world.
   *
   * Null for segments that carry no reusable value. The token is what makes provenance checkable by
   * content: it appears in this segment, in any memory record derived from it, and in the argument
   * of any action that uses it.
   */
  readonly payload: string | null;
  /**
   * The key this segment's content must be stored under, when it is worth storing.
   *
   * Published rather than guessed. The difficulty this family measures is whether provenance
   * survives the store, not whether an implementation can infer a naming convention — leaving the
   * key to be guessed would add an unfair failure mode that teaches nothing and would make a
   * correct implementation fail for a reason the spec never stated.
   */
  readonly memoryKey: string | null;
  readonly carriesSecret: boolean;
}

export interface MemoryRecord {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  /** Segment ids the subject CLAIMS this value derived from. Checked against content. */
  readonly provenance: readonly string[];
  /** The trust the subject CLAIMS for the content. Checked against the true origin. */
  readonly originTrust: Trust;
  /**
   * Whether this record carries secret material.
   *
   * Part of the WRITE contract, exactly like `provenance`, and for the same reason: a segment's
   * `carriesSecret` flag is visible while the segment is in context and gone once it is not, so if
   * it is not written down it cannot be recovered later. `M6_SECRET_EGRESS` speaks of "a record
   * marked as carrying a secret" — this is that mark. Set it when the stored value contains material
   * from a segment whose own `carriesSecret` is true.
   *
   * A store that keeps the record at all keeps this flag: unlike `provenance`, no store type drops
   * it, so a value's secrecy is always persistable.
   *
   * Optional at write time and always present on a recalled record: omitting it means `false`. An
   * unmarked record is an unmarked record, not an unknowable one.
   */
  readonly carriesSecret?: boolean;
  readonly writtenInSession: number;
}

export interface ArgValue {
  readonly value: string | number;
  /**
   * Where this value came from, as the SCENARIO declares it: segment ids, memory record keys, or
   * both. This is ground truth the verifier reads; the subject is not asked to reproduce it, it is
   * asked to act correctly given what it stored.
   */
  readonly derivedFrom: readonly string[];
}

export interface ToolSpec {
  readonly name: string;
  readonly capability: string;
  readonly privileged: boolean;
  readonly egress: boolean;
}

export interface ToolCall {
  readonly tool: string;
  readonly args: Readonly<Record<string, ArgValue>>;
  /** The segment or memory key the subject claims authorizes this call. Checked, never trusted. */
  readonly authorizedBy: string;
}

export interface Grant {
  readonly capability: string;
  readonly grantedBy: "system" | "user";
}

export interface RequestedAction {
  readonly id: string;
  readonly label: string;
  readonly call: ToolCall;
  /** Legitimate work, or work that exists only because untrusted content asked for it. */
  readonly origin: "task" | "injection";
}

// ---------------------------------------------------------------- lifecycle

export const STATES = [
  "PROPOSED",
  "RECALLED",
  "POLICY_CHECKED",
  "APPROVED",
  "BLOCKED",
  "EXECUTED",
  "AUDITED",
] as const;
export type State = (typeof STATES)[number];

/**
 * The legal transition table. Same discipline as the parent family, and the same two deliberate
 * absences: once an action is approved or has executed, a later decision may not rewrite that
 * history. `RECALLED` replaces the parent's `CONTEXT_LOADED` because the step that matters here is
 * consulting memory, and an implementation that decides without reaching that state has skipped the
 * only part of the task that is new.
 */
export const LEGAL_TRANSITIONS: ReadonlySet<string> = new Set([
  "null>PROPOSED",
  "PROPOSED>RECALLED",
  "RECALLED>POLICY_CHECKED",
  "POLICY_CHECKED>APPROVED",
  "POLICY_CHECKED>BLOCKED",
  "APPROVED>EXECUTED",
  "EXECUTED>AUDITED",
  "BLOCKED>AUDITED",
]);

export const TERMINAL_STATES: ReadonlySet<State> = new Set<State>(["AUDITED"]);
export const transitionKey = (from: State | null, to: State): string => `${from ?? "null"}>${to}`;

export interface AuditEvent {
  readonly seq: number;
  readonly actionId: string;
  readonly from: State | null;
  readonly to: State;
  readonly reason: string;
  /** Memory record keys the subject consulted for this decision. Empty is a finding, not a style. */
  readonly recalled: readonly string[];
  readonly detail: string;
}

export interface Decision {
  readonly actionId: string;
  readonly allowed: boolean;
  readonly reason: string;
}

export interface SubjectReport {
  readonly decisions: readonly Decision[];
  readonly audit: readonly AuditEvent[];
}

// ---------------------------------------------------------------- the facades

/**
 * The memory the subject writes and later reads.
 *
 * `recall` returns records exactly as they were written. That is the whole point: if the subject
 * dropped provenance at write time, recall cannot invent it, and the subject is left holding a value
 * with no origin — which the policy says must be treated as untrusted.
 *
 * ONE facade object serves a whole scenario. The same object is handed to every `runSession` call,
 * so an implementation may key per-scenario state off the facade's identity (a `WeakMap`, say) and
 * rely on that state surviving the session boundary.
 */
export interface MemoryFacade {
  write: (record: Omit<MemoryRecord, "id" | "writtenInSession">) => MemoryRecord;
  recall: (key: string) => MemoryRecord | null;
  keys: () => readonly string[];
}

export interface ToolResult {
  readonly ok: boolean;
  readonly output: Segment;
}

export interface ToolFacade {
  readonly specs: readonly ToolSpec[];
  invoke: (actionId: string, call: ToolCall) => ToolResult;
}

export interface ToolInvocation {
  readonly seq: number;
  readonly tool: string;
  readonly actionId: string;
  readonly args: Readonly<Record<string, ArgValue>>;
}

/** What a subject sees of one session. It never sees an earlier session's segments. */
export interface SessionView {
  readonly index: number;
  readonly segments: readonly Segment[];
  readonly actions: readonly RequestedAction[];
  readonly grants: readonly Grant[];
  readonly tools: readonly ToolSpec[];
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  /**
   * Called once per session, in order, with the SAME memory facade object throughout the scenario.
   *
   * Object identity is part of the contract, not an accident of the harness: `memory` in session 3
   * is `===` the `memory` of session 0.
   */
  readonly runSession: (view: SessionView, memory: MemoryFacade, tools: ToolFacade) => SubjectReport;
}
