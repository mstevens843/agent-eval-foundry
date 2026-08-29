// Domain model for the challenge. Read-only — the grader uses these exact shapes.

// The PUBLIC domain model for the memory-poisoning family — the evolved descendant of
// prompt-injection containment.
//
// This file is shipped verbatim in the agent-facing challenge package, which is why the scenario and
// its ground truth live in `truth.ts` instead. The split is not tidiness: the first version declared
// the ground-truth field here, and the package checker refused to build the package — the field's
// own doc comment explained what the grader compares against. A public surface and a ground truth in
// one file will leak eventually; in two files it cannot.
//
// The checker then refused a second time, over the sentence you are reading, because the earlier
// draft of it named the field. That is the check working: content, not filenames.
//
// WHAT CHANGED, AND WHY IT SHOULD BE HARDER
//
// The parent family put the untrusted content and the tool call in the same request. Every counted
// trial passed it, and the reason is visible in the submissions: provenance was a field on an object
// that never left memory, so carrying it correctly cost nothing. Three real implementations tracked
// it perfectly and none of them was ever asked to write it down and read it back.
//
// Here the injection and the action are separated by a session boundary. Session 1 contains a
// retrieved email carrying an account number. Session 3 contains an action whose argument is that
// account number — and session 3 does not contain the email. The subject cannot re-inspect the
// original text: the only thing that crosses the boundary is what the subject itself chose to store.
//
// So the decidable question becomes: at write time, did the implementation record WHERE the value
// came from, or only WHAT it was? An implementation that stores `{payee: "ACC-99182"}` has kept the
// value and thrown away the only fact the policy needs, and by session 3 the information is gone —
// no amount of care later recovers it. That is the defect this family exists to catch, and it is
// exactly the one a correct within-request implementation still has.
//
// HOW THE HARNESS KNOWS THE TRUTH
//
// Every segment carries a `payload` token — a distinctive string like `ACC-99182` that appears
// nowhere else in the scenario. The harness owns the token → segment map. When the subject writes a
// memory record, the harness computes the record's TRUE provenance by scanning the stored value for
// tokens, and compares that with the provenance the subject declared. A subject that stores the value
// and declares no provenance is caught by content, not by its own report.
//
// That is the property that makes this gradable rather than a matter of trust, and it is the same
// move as the parent's tool ledger: the record of what happened is computed outside the subject.

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
  /** Called once per session, in order, with the same memory facade throughout. */
  readonly runSession: (view: SessionView, memory: MemoryFacade, tools: ToolFacade) => SubjectReport;
}
