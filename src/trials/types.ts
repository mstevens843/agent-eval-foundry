// The trial record: one attempt by one subject at one family, and whether it counts.
//
// This is the layer the whole repository was missing. Until now a family could be measured against
// mutants written alongside its own verifier, which proves the verifier discriminates and proves
// nothing whatever about difficulty. A trial record is the unit that closes that gap, and it is
// deliberately the SAME shape for a reference run, a mutant sweep and a frontier-model attempt --
// because the moment those live in different formats, the comparison everyone wants to make quietly
// stops being possible.
//
// THE COUNTING RULES ARE THE POINT
//
// `status` and `counts` are separate fields on purpose. A run can complete and not count; a run can
// fail and still be worth keeping. The rules below are inherited directly from the assignment the
// source project was built for, which excluded "agent crashes, API or rate-limit failures, container
// failures, timeouts, and other execution or infrastructure errors" from the trial matrix:
//
//   completed             counts. The subject ran and was graded.
//   refused               DOES NOT COUNT. A provider-level refusal is not evidence of difficulty --
//                         no attempt was made. The source project hit this three times with one
//                         model family and recorded reward 0 that meant nothing.
//   timeout               does not count. An infrastructure limit, not a capability finding.
//   infrastructure_error  does not count.
//   crashed               counts as a failure IF the crash is in the subject's own code, which is a
//                         judgement the importer must make explicitly rather than by default.
//
// Recording a refusal as a zero is the single easiest way to manufacture difficulty evidence, and it
// is why `counts` cannot be inferred from `status` alone: the importer must supply `countsReason`.

export const SUBJECT_TYPES = ["reference", "mutant", "baseline", "agent"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export const TRIAL_STATUSES = ["completed", "refused", "timeout", "infrastructure_error", "crashed"] as const;
export type TrialStatus = (typeof TRIAL_STATUSES)[number];

/** Statuses that may never count toward a difficulty claim, whatever the importer says. */
export const NEVER_COUNTS: ReadonlySet<TrialStatus> = new Set<TrialStatus>([
  "refused",
  "timeout",
  "infrastructure_error",
]);

export const ISOLATION_LEVELS = ["in-process", "subprocess", "container"] as const;
export type IsolationLevel = (typeof ISOLATION_LEVELS)[number];

/**
 * What each level actually buys. Written down because "isolated" is the kind of word that gets
 * asserted rather than checked, and the source project's three real verifier bypasses were all
 * failures of exactly this assumption.
 */
export const ISOLATION_GUARANTEES: Readonly<Record<IsolationLevel, string>> = {
  "in-process":
    "The subject receives a frozen facade and never sees the ledger array. It cannot swap the recorder by accident. It CAN reach past its arguments — module globals, prototype patching, the filesystem — so this level is sufficient for code you wrote and insufficient for code an agent wrote.",
  subprocess:
    "The subject runs in a separate node process and communicates over stdout. It cannot touch the parent's memory, so the ledger and the grading are genuinely out of reach. It still shares the filesystem and network with the parent.",
  container:
    "The subject runs in a container with its own filesystem and no network. Not implemented here; declared so the gate can distinguish it rather than treating subprocess as the ceiling.",
};

export interface TrialCell {
  readonly scenarioId: string;
  /** Named checks that failed. Empty means the subject passed this scenario — see `unmeasured`. */
  readonly failed: readonly string[];
  /**
   * Set when this scenario was NOT individually graded, carrying the reason why.
   *
   * An empty `failed` array is an affirmative claim: this subject was run against this named
   * scenario and every check on it passed. There is no way to spell "we don't know" in an array of
   * failing check names — the absence of a name reads as a pass — so a source that only preserves a
   * suite-level verdict has to say so in a separate field or lie. The importer for the Harbor
   * archive is exactly that source: a reward of 1 means "the suite that was current at the time
   * returned 1", which does not name a single scenario.
   *
   * An unmeasured cell is never a pass and never a failure. `summarise` will not call a record
   * passed while one is present, and `buildAgentBank` maps it to a null matrix cell, which the
   * matrix layer already excludes from catch sets rather than imputing as a pass.
   */
  readonly unmeasured?: string;
}

/** A cell that positively records a pass: graded, and nothing failed. */
export const cellPassed = (c: TrialCell): boolean => c.unmeasured === undefined && c.failed.length === 0;

/** A cell that positively records a failure. */
export const cellFailed = (c: TrialCell): boolean => c.unmeasured === undefined && c.failed.length > 0;

export interface TrialRecord {
  readonly runId: string;
  readonly familyId: string;
  readonly subjectId: string;
  readonly subjectType: SubjectType;
  /** Model identifier for agent trials; null for local subjects. */
  readonly model: string | null;
  readonly effort: string | null;
  readonly status: TrialStatus;
  /**
   * Whether this run may contribute to a difficulty claim. Never inferred: the importer states it
   * and justifies it, because the default-true version of this field is how refusals become zeros.
   */
  readonly counts: boolean;
  readonly countsReason: string;
  readonly scenarioSetId: string;
  readonly cells: readonly TrialCell[];
  readonly runtimeSeconds: number | null;
  readonly costUsd: number | null;
  /** Where the submitted artifact is preserved. Required for agent trials. */
  readonly artifactPath: string | null;
  readonly isolation: IsolationLevel;
  readonly notes: string;
}

export interface TrialSet {
  readonly familyId: string;
  readonly scenarioSetId: string;
  readonly records: readonly TrialRecord[];
}

/** Counted agent trials only. The population any difficulty claim must be built from. */
export const countedAgentTrials = (set: TrialSet): readonly TrialRecord[] =>
  set.records.filter((r) => r.subjectType === "agent" && r.counts && !NEVER_COUNTS.has(r.status));

export const uncountedTrials = (set: TrialSet): readonly TrialRecord[] =>
  set.records.filter((r) => !r.counts);

export interface TrialSummary {
  readonly subjectId: string;
  readonly subjectType: SubjectType;
  readonly status: TrialStatus;
  readonly counts: boolean;
  readonly scenariosFailed: number;
  readonly scenariosTotal: number;
  /** Scenarios present in the record but never individually graded. */
  readonly scenariosUnmeasured: number;
  readonly passed: boolean;
}

export const summarise = (r: TrialRecord): TrialSummary => {
  const failed = r.cells.filter(cellFailed).length;
  const unmeasured = r.cells.filter((c) => c.unmeasured !== undefined).length;
  return {
    subjectId: r.subjectId,
    subjectType: r.subjectType,
    status: r.status,
    counts: r.counts,
    scenariosFailed: failed,
    scenariosTotal: r.cells.length,
    scenariosUnmeasured: unmeasured,
    // A record with an ungraded scenario in it has not been shown to pass. Reporting it as a pass is
    // the same error as reading an empty `failed` array off a source that never graded per scenario.
    passed: r.status === "completed" && failed === 0 && unmeasured === 0,
  };
};
