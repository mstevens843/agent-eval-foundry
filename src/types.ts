// The data model, and the one decision that matters in it.
//
// A benchmark result is usually stored as a scalar per (task, model): a score, or a pass/fail.
// That shape cannot answer the question this tool exists to ask, because the moment you reduce a
// suite to per-task pass rates you have thrown away *which* subjects failed *which* instance -- and
// that co-failure structure is the entire signal. Two tasks that fail the same models are one
// measurement wearing two names, and you cannot see that in a column of averages.
//
// So the unit here is the CELL: one subject's outcome on one instance, carrying the named checks it
// failed. `null` is a first-class cell value and means "not measured", never "passed". Conflating
// those two is the single easiest way to manufacture a flattering diversity number, because an
// unmeasured cell silently reads as agreement.
//
// What this file is NOT: a runner. Nothing here executes a task, spawns a model, or talks to a
// harness. This package reads matrices other systems produced. That boundary is deliberate -- the
// measurement has to be auditable by someone who does not trust the thing that produced the data.

/** A subject under test: an implementation being graded. Usually one model's submitted artifact. */
export interface Subject {
  readonly id: string;
  readonly label: string;
  /** Grouping for per-family analysis, e.g. "opus", "codex", "baseline". */
  readonly family: string;
  readonly model: string | null;
  readonly effort: string | null;
  readonly note: string | null;
}

/** One graded task instance. In a schedule-driven suite this is (schedule, seed, size). */
export interface Instance {
  readonly id: string;
  readonly schedule: string;
  readonly seed: number | null;
  readonly keys: number | null;
  /** Grouping for per-family analysis, e.g. which hidden family this point belongs to. */
  readonly family: string;
  readonly source: string | null;
  readonly note: string | null;
}

/** One measured outcome. An empty `failed` array is a pass; the cell being absent is not. */
export interface Cell {
  readonly failed: readonly string[];
}

export interface Provenance {
  readonly repo: string | null;
  readonly artifact_commit: string | null;
  readonly task_sha256: string | null;
  readonly suite_shape: string | null;
  readonly checks_total: number | null;
  readonly extracted_from: readonly string[];
  /**
   * Free text stating how subjects and instances were selected relative to each other. Required to
   * be present, permitted to be empty. It is printed verbatim in every report, because a diversity
   * number computed over a bank the instances were tuned against is close to meaningless and the
   * reader must be told so in the same breath as the number.
   */
  readonly caveat: string | null;
}

export interface Matrix {
  readonly schema: string;
  readonly suite: string;
  readonly provenance: Provenance;
  /** Excluded from every subject computation: the oracle is not evidence about difficulty. */
  readonly reference_subject: string | null;
  readonly subjects: readonly Subject[];
  readonly instances: readonly Instance[];
  /** `results[instanceId][subjectId]`; `null` means not measured. */
  readonly results: Readonly<Record<string, Readonly<Record<string, Cell | null>>>>;
}

/** An instance's catch set: the subjects it distinguishes from correct. */
export interface CatchSet {
  readonly instanceId: string;
  /** Sorted subject ids that failed this instance. */
  readonly caught: readonly string[];
  /** Subject ids with no measurement here. Reported, never imputed. */
  readonly unmeasured: readonly string[];
  /** Union of every check name that failed here, sorted. */
  readonly checks: readonly string[];
}

/** A group of instances sharing one identical catch set. */
export interface Cluster {
  readonly caught: readonly string[];
  readonly instanceIds: readonly string[];
}

export type SubjectRole = "discriminating" | "always-caught" | "never-caught";

export interface SubjectStat {
  readonly subjectId: string;
  readonly caughtBy: number;
  readonly measuredOn: number;
  readonly role: SubjectRole;
}

/** One point on the axis curve: what the suite measures once the k weakest subjects are removed. */
export interface CurvePoint {
  readonly droppedWeakest: number;
  readonly remainingSubjects: readonly string[];
  readonly distinctMeasurements: number;
  /**
   * Antichain width at this point. Carried alongside `distinctMeasurements` because the two decay
   * differently and quoting the wrong one overstates what survives: distinct catch sets is the
   * count this package exists to argue is inflated, so a curve that reported only that number would
   * invite exactly the error the headline warns about.
   */
  readonly independentAxes: number;
  readonly blindInstances: number;
}

export interface AxisReport {
  readonly suite: string;
  readonly provenance: Provenance;
  readonly instanceCount: number;
  readonly subjectCount: number;
  readonly measuredCells: number;
  readonly unmeasuredCells: number;
  /** Instances whose catch set is empty: they separate nothing in this bank. */
  readonly blindInstances: readonly string[];
  readonly clusters: readonly Cluster[];
  /** Distinct non-empty catch sets. The honest count of what the suite measures. */
  readonly distinctMeasurements: number;
  /**
   * Width of the subset-poset over distinct catch sets (Dilworth). Instances on a chain differ only
   * in sensitivity to one underlying defect; the antichain width is the count that cannot be
   * explained that way.
   */
  readonly independentAxes: number;
  readonly chains: readonly (readonly string[])[];
  readonly subjectStats: readonly SubjectStat[];
  readonly curve: readonly CurvePoint[];
  readonly redundancy: number;
}
