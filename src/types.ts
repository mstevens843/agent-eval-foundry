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
  /**
   * The names of every check the suite DECLARES, whether or not any of them fired.
   *
   * OPTIONAL, and that is load-bearing rather than lenient. It was briefly required-but-nullable,
   * on the `caveat` pattern, which forced all eight family runners to emit it — and every
   * `runner.ts` is hashed by `VERIFIER_PATHS` into the verifier hash that gates whether a counted
   * adversarial audit still counts. A two-line metadata addition therefore rotated eight verifier
   * hashes and invalidated audits over a change that cannot affect grading.
   *
   * The rule that came out of it: NON-GRADING METADATA DOES NOT GO IN A HASHED FILE. The value is
   * injected by `sweep()` in `src/families/registry.ts`, which already holds every family's declared
   * check list and is not hashed, so the runners stay byte-identical to the verifier that graded the
   * evidence.
   *
   * `checks_total` cannot substitute for it. That field is a bare number whose meaning differs by
   * producer — 267 means check EXECUTIONS for the outbox, 128 means SCENARIOS for another family,
   * 500 means INSTANCES for the SWE-bench import — so a firing rate computed against it would be
   * three different statistics wearing one name. Names, or nothing.
   */
  readonly checks_declared?: readonly string[] | null;
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

/**
 * How much work one check in the suite is doing.
 *
 * This exists because of a number nobody had ever computed about the best suite in this project: of
 * the eleven checks in the 267-check durable-outbox suite, TWO ever fired against any of the six
 * frontier agents that failed it. Nine never fired at all. The suite was not measuring eleven things
 * and finding two problems; it was measuring two things, nine times over, and the check count was
 * never evidence of breadth.
 *
 * "How many of your checks have ever fired" is a one-line diagnostic any suite owner can run, and
 * almost none have. It is deliberately reported per check rather than as a bare rate, because the
 * right response depends on WHICH checks are silent.
 *
 * A check that never fires is not automatically dead weight. Hygiene checks — determinism, duplicate
 * effects, mechanism-fired — are SUPPOSED not to fire on a valid scenario, and a suite whose safety
 * rails all fire is a suite with a broken harness. So this names them and lets the reader judge; it
 * never condemns them.
 */
export interface CheckStat {
  readonly check: string;
  /** (instance, subject) pairs where this check appears in `failed`. */
  readonly firedOnCells: number;
  /** Distinct instances where it fired. */
  readonly firedOnInstances: number;
  /** Distinct subjects it caught. A check firing on one subject only separates that subject. */
  readonly firedOnSubjects: number;
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
  /**
   * A minimum chain cover: each chain is a nested sequence of catch sets, weakest first. Kept as
   * data rather than pre-formatted text so the reporter owns rendering and can truncate a
   * hundred-member catch set instead of emitting it in full.
   */
  readonly chains: readonly (readonly (readonly string[])[])[];
  readonly subjectStats: readonly SubjectStat[];
  /** Per-check firing counts, busiest first. Empty when the matrix records no check names. */
  readonly checkStats: readonly CheckStat[];
  /**
   * Checks the suite DECLARES but that never fired against any subject in this bank.
   *
   * Null when the matrix does not declare its check universe, because the honest answer is then "we
   * do not know" rather than zero. A silent check and an undeclared check are different facts, and
   * collapsing them lets a suite report perfect coverage by simply not saying what it checks.
   */
  readonly checksNeverFired: readonly string[] | null;
  readonly curve: readonly CurvePoint[];
  readonly redundancy: number;
  /**
   * Optional significance test. Present only when explicitly requested, because it costs a full
   * re-measurement per trial. It calibrates `independentAxes` rather than replacing it: a corpus
   * whose real width sits near the null width has an axis count explained by bank size and run
   * noise, not by structure.
   */
  readonly nullBaseline?: NullBaselineSummary;
}

/** Null-model result, summarised for reporting. See `src/null-model.ts`. */
export interface NullBaselineSummary {
  readonly seed: number;
  readonly trials: number;
  readonly widths: readonly number[];
  readonly meanWidth: number;
  /** One axis per discriminating instance: the largest width the corpus could report. */
  readonly ceiling: number;
}
