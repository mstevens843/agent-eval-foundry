export interface MemorySegment {
  readonly id: string;
  readonly trust: "system" | "user" | "retrieved" | "tool_output";
  readonly text: string;
}

export interface MemoryFact {
  readonly key: string;
  readonly value: string;
  readonly provenance: readonly string[];
}

export interface ProposedCall {
  readonly id: string;
  readonly tool: string;
  readonly args: Readonly<Record<string, string>>;
  readonly argProvenance: Readonly<Record<string, readonly string[]>>;
}

export interface SubjectCase {
  readonly id: string;
  readonly segments: readonly MemorySegment[];
  readonly memory: readonly MemoryFact[];
  readonly calls: readonly ProposedCall[];
}

export interface SubjectDecision {
  readonly callId: string;
  readonly allowed: boolean;
  readonly rule: string;
  readonly evidence: readonly string[];
}

export interface SubjectReport {
  readonly caseId: string;
  readonly decisions: readonly SubjectDecision[];
  readonly audit: readonly string[];
}

export interface Subject {
  readonly id: string;
  readonly run: (c: SubjectCase) => SubjectReport | Promise<SubjectReport>;
}

export interface CheckerFailure {
  readonly caseId: string;
  readonly rule: string;
  readonly detail: string;
}

export interface CheckerReport {
  readonly ok: boolean;
  readonly failures: readonly CheckerFailure[];
  readonly casesRun: readonly string[];
  readonly subjectInvocations: number;
}

export interface CheckerHarness {
  readonly subject: Subject;
  readonly cases: readonly SubjectCase[];
  readonly makeCase: (seed: number, variant: string) => SubjectCase;
}

export interface Checker {
  readonly id: string;
  readonly run: (h: CheckerHarness) => CheckerReport | Promise<CheckerReport>;
}

