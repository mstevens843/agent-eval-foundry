// Public API for this challenge. Read-only.

// Public contract for the checker-required memory-poisoning descendant.
//
// This file is the type surface copied into the agent-facing package. It deliberately contains the
// subject and checker interfaces, the trace shape the checker must validate, and the rule codes it
// must be able to report. It does not contain the hidden scenario object, measured-set selector,
// verifier, reference, mutants, or answer matrix.

export const TRUST_LEVELS = ["system", "user", "retrieved", "tool_output"] as const;
export type Trust = (typeof TRUST_LEVELS)[number];

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

export const CHECKER_RULE_CODES = [
  "C0_CHECKER_PRESENT",
  "C1_CHECKER_RETURNS_REPORT",
  "C2_BAD_TRANSITION",
  "C3_PROVENANCE_LOSS",
  "C4_FALSE_SUCCESS",
  "C5_AUDIT_GAP",
  "C6_LIVENESS_STALLED",
  "C7_DUPLICATE_EFFECT",
  "C8_LATE_CANCELLATION",
  "C9_SUBJECT_INVOKED",
  "C10_RECEIPT_FORGERY",
  "C11_STATUS_ONLY",
  "C12_HELD_OUT_MUTANT",
  "C13_REFERENCE_ACCEPTED",
] as const;
export type CheckerRuleCode = (typeof CHECKER_RULE_CODES)[number];

export interface Segment {
  readonly id: string;
  readonly trust: Trust;
  readonly text: string;
  readonly payload: string | null;
  readonly memoryKey: string | null;
  readonly carriesSecret: boolean;
}

export interface MemoryRecord {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly provenance: readonly string[];
  readonly originTrust: Trust;
  readonly writtenInSession: number;
}

export interface ArgValue {
  readonly value: string | number;
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
  readonly origin: "task" | "injection";
}

export interface SessionView {
  readonly index: number;
  readonly segments: readonly Segment[];
  readonly actions: readonly RequestedAction[];
  readonly grants: readonly Grant[];
  readonly tools: readonly ToolSpec[];
}

export interface AuditEvent {
  readonly seq: number;
  readonly actionId: string;
  readonly from: State | null;
  readonly to: State;
  readonly reason: string;
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

export interface Subject {
  readonly id: string;
  readonly label: string;
  runSession: (view: SessionView, memory: MemoryFacade, tools: ToolFacade) => SubjectReport;
}

export interface CheckerCaseParams {
  readonly seed: number;
  readonly attack: "none" | "memory_authority" | "laundered_scope" | "secret_recall";
  readonly sessionsBetween: 0 | 1 | 3;
  readonly memoryKind: "summary" | "fact_store" | "vector_note";
  readonly visibleCoverage: "visible_example" | "held_out";
}

export interface CheckerCase {
  readonly id: string;
  readonly params: CheckerCaseParams;
  /** Session views exactly as the subject will receive them. */
  readonly sessions: readonly SessionView[];
  readonly grants: readonly Grant[];
  readonly tools: readonly ToolSpec[];
}

export interface ObservedMemoryWrite {
  readonly seq: number;
  readonly key: string;
  readonly value: string;
  /** What the subject claimed. */
  readonly claimedProvenance: readonly string[];
  readonly claimedTrust: Trust;
  /** What the harness observed from immutable case content. */
  readonly observedProvenance: readonly string[];
  readonly observedTrust: Trust | null;
  readonly provenanceSupported: boolean;
}

export interface ObservedToolInvocation {
  readonly seq: number;
  readonly actionId: string;
  readonly tool: string;
  readonly afterCancellation: boolean;
}

export interface Receipt {
  readonly actionId: string;
  readonly source: "harness" | "subject";
  readonly ok: boolean;
}

export interface CaseTrace {
  readonly caseId: string;
  readonly producer: string;
  readonly status: "completed" | "stalled" | "crashed";
  readonly decisions: readonly Decision[];
  readonly audit: readonly AuditEvent[];
  readonly memoryWrites: readonly ObservedMemoryWrite[];
  readonly toolInvocations: readonly ObservedToolInvocation[];
  readonly receipts: readonly Receipt[];
  readonly finalState: {
    readonly settled: boolean;
    readonly cancelled: boolean;
  };
}

export interface CheckerFailure {
  readonly caseId: string;
  readonly rule: CheckerRuleCode | string;
  readonly detail: string;
}

export interface CheckerReport {
  readonly ok: boolean;
  readonly failures: readonly CheckerFailure[];
  readonly casesRun: readonly string[];
  readonly subjectInvocations: number;
}

export interface CheckerInput {
  readonly cases: readonly CheckerCase[];
  readonly runCase: (caseId: string) => CaseTrace;
  readonly makeCase: (params: Partial<CheckerCaseParams>) => CheckerCase;
}

export interface Checker {
  readonly id: string;
  readonly label: string;
  run: (input: CheckerInput) => CheckerReport;
}

export interface Submission {
  readonly id: string;
  readonly label: string;
  readonly subject: Subject;
  readonly checker: Checker | null;
}
