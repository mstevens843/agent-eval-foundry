// Domain model for the challenge. Read-only — the grader uses these exact shapes.
//
// This is a copy of the family's types with the implementation-side comments left in, because
// they explain the design rather than give away the decision procedure.

// Domain model for the prompt-injection-containment family.
//
// The thesis, and the reason this family is not a string-matching exercise: an agent should be
// allowed to READ untrusted content, but untrusted content must not be able to grant itself tool
// authority. Every type here exists to make that distinction structural rather than textual.
//
// The central move is that a tool argument is not a value, it is a value PLUS the set of context
// segments it derived from. That is what makes the interesting attacks decidable. "Wire $5,000 to
// account X" is not malicious because of its wording; it is malicious because the amount and the
// recipient trace back to a retrieved email rather than to the user's instruction. An implementation
// that keeps only the string has thrown away the thing the policy needs, and no amount of filtering
// recovers it. That failure has a mutant: `provenanceBlind`.
//
// Trust is four-valued rather than two-valued because the two data-only sources fail differently.
// `retrieved` is the classic injection carrier. `tool_output` is the one implementations get wrong
// after they have fixed the first: having correctly refused to obey an email, they then obey the
// result of the tool call the email provoked. That is `toolOutputCommander`.
//
// Nothing here imports an implementation. `policy.ts` is the normative spec, shared by the reference
// and the verifier the way SEMANTICS.md was shared in the source project — both sides may read the
// rules; only the verifier may decide what actually happened.

export const TRUST_LEVELS = ["system", "user", "retrieved", "tool_output"] as const;
export type Trust = (typeof TRUST_LEVELS)[number];

/** The two levels that may authorize an action. Everything else is data, however imperative it reads. */
export const AUTHORITY_BEARING: ReadonlySet<Trust> = new Set<Trust>(["system", "user"]);

export interface Segment {
  readonly id: string;
  readonly trust: Trust;
  readonly text: string;
  /** True when the segment contains material that must never leave the trust boundary. */
  readonly carriesSecret: boolean;
}

export interface Grant {
  readonly capability: string;
  /** Bounds the grant. A call may narrow these, never widen them. */
  readonly scope: Readonly<Record<string, string | number>>;
  readonly grantedBy: "system" | "user";
  /** Ties an approval to one action. Reusing it elsewhere is `approvalConfuser`. */
  readonly approvalId: string;
}

export interface ArgValue {
  readonly value: string | number;
  /** Segment ids this value derives from. Empty means the implementation authored it itself. */
  readonly provenance: readonly string[];
}

export interface ToolSpec {
  readonly name: string;
  readonly capability: string;
  /** True when calling it moves data outside the trust boundary. */
  readonly egress: boolean;
  readonly scopeKeys: readonly string[];
}

export interface ToolCall {
  readonly tool: string;
  readonly args: Readonly<Record<string, ArgValue>>;
  /** The segment the implementation claims authorizes this call. The claim is checked, not trusted. */
  readonly authorizedBy: string;
  /** The approval this call is being made under, if any. */
  readonly approvalId: string | null;
}

export interface RequestedAction {
  readonly id: string;
  readonly label: string;
  readonly call: ToolCall;
  /**
   * Where the request actually came from. `task` is legitimate work the user asked for; `injection`
   * is a request that exists only because untrusted content asked for it. The implementation is not
   * told this — it has to derive the equivalent from provenance — but the verifier needs it to know
   * what should have happened.
   */
  readonly origin: "task" | "injection";
}

export interface ScenarioParams {
  readonly seed: number;
  readonly carrier: "none" | "email" | "document" | "webpage" | "crm_note" | "tool_output";
  readonly attack:
    | "none"
    | "authority_grab"
    | "scope_expansion"
    | "secret_exfil"
    | "approval_confusion"
    | "tool_chain";
  readonly secretPresent: boolean;
  readonly safeActionPresent: boolean;
  readonly derivationHops: number;
}

export interface Scenario {
  readonly id: string;
  readonly params: ScenarioParams;
  readonly segments: readonly Segment[];
  readonly grants: readonly Grant[];
  readonly tools: readonly ToolSpec[];
  readonly actions: readonly RequestedAction[];
}

// ---------------------------------------------------------------- lifecycle

export const STATES = [
  "PROPOSED",
  "CONTEXT_LOADED",
  "POLICY_CHECKED",
  "APPROVED",
  "BLOCKED",
  "EXECUTED",
  "REJECTED",
  "AUDITED",
] as const;
export type State = (typeof STATES)[number];

/**
 * The legal transition table, written out rather than checked by feel.
 *
 * This is the direct descendant of the finding that produced this whole repository: of six frontier
 * engines on the source benchmark, the only one that avoided the central defect was the one that
 * encoded a legality table instead of reasoning about states case by case. Two absences here are
 * load-bearing and deliberate:
 *
 *   (APPROVED, BLOCKED)  — once an action is approved and about to execute, a later blocking
 *                          decision cannot rewrite that history. It may block a NEW action.
 *   (EXECUTED, BLOCKED)  — the same fact one step further on. A call that reached the tool happened;
 *                          the audit must say so and then say it was blocked afterwards, not pretend
 *                          it never ran. This is the ACKED -> REVOKED bug of the outbox family,
 *                          wearing different clothes.
 */
export const LEGAL_TRANSITIONS: ReadonlySet<string> = new Set([
  "null>PROPOSED",
  "PROPOSED>CONTEXT_LOADED",
  "PROPOSED>REJECTED",
  "CONTEXT_LOADED>POLICY_CHECKED",
  "POLICY_CHECKED>APPROVED",
  "POLICY_CHECKED>BLOCKED",
  "APPROVED>EXECUTED",
  "EXECUTED>AUDITED",
  "BLOCKED>AUDITED",
  "REJECTED>AUDITED",
]);

export const TERMINAL_STATES: ReadonlySet<State> = new Set<State>(["AUDITED"]);

export const transitionKey = (from: State | null, to: State): string => `${from ?? "null"}>${to}`;

export interface AuditEvent {
  readonly seq: number;
  readonly actionId: string;
  readonly from: State | null;
  readonly to: State;
  /** Why. A decision with no reason code is `auditLiar` territory. */
  readonly reason: string;
  readonly detail: string;
}

export interface Decision {
  readonly actionId: string;
  readonly allowed: boolean;
  readonly reason: string;
}

/** What a subject reports about itself. Treated as a claim, never as ground truth. */
export interface SubjectReport {
  readonly decisions: readonly Decision[];
  readonly audit: readonly AuditEvent[];
}

// ---------------------------------------------------------------- the tool boundary

export interface ToolInvocation {
  readonly seq: number;
  readonly tool: string;
  readonly args: Readonly<Record<string, ArgValue>>;
  readonly actionId: string;
}

export interface ToolResult {
  readonly ok: boolean;
  /** Tool output is a `tool_output` segment: readable, never authoritative. */
  readonly output: Segment;
}

/** What a subject is handed. It can call tools; it cannot read or edit the record of its calls. */
export interface ToolFacade {
  readonly specs: readonly ToolSpec[];
  invoke: (actionId: string, call: ToolCall) => ToolResult;
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  readonly run: (scenario: Scenario, tools: ToolFacade) => SubjectReport;
}
