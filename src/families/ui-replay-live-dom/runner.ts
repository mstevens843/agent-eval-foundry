// The runner. Drives every subject through every measured scenario and emits a matrix the axis meter
// already reads, plus the catch-set machinery the incomparability argument is stated in.
//
// Completion records are reset between subjects: without that a subject that ran earlier would leave
// state behind and the next one would look idempotent for free, with the harness doing the work the
// subject is graded on.

import { parseMatrix } from "../../matrix.js";
import type { Matrix } from "../../types.js";
import { App } from "./app.js";
import { INTENDED_CHECK, MUTANTS, POLE_SUBJECTS } from "./mutants.js";
import { reference, resetCompletionRecords } from "./reference.js";
import { enumerateSpace, generateScenarios, selectMeasuredSet, witnessInstances } from "./scenarios.js";
import type { Scenario } from "./truth.js";
import type { ReplayReport, Subject } from "./types.js";
import { CHECKS, type Failure, verify } from "./verify.js";

export interface CellResult {
  readonly scenarioId: string;
  readonly subjectId: string;
  readonly failures: readonly Failure[];
  readonly crashed: string | null;
}

export interface RunResult {
  readonly scenarios: readonly Scenario[];
  readonly subjects: readonly Subject[];
  readonly cells: readonly CellResult[];
  readonly spaceSize: number;
  /** Witness key -> the measured scenario id it resolved to. Relocation is expected and recorded. */
  readonly witnesses: ReadonlyMap<string, string>;
}

export const ALL_SUBJECTS: readonly Subject[] = [reference, ...MUTANTS, ...POLE_SUBJECTS];

/**
 * A budget MEASURED rather than inherited.
 *
 * 864 scenarios driven through a reducer that re-derives its legitimacy map on every mutation is a
 * materially different cost from the parent family's immutable seven-node tree, and inheriting the
 * parent's 1500s would be how a campaign silently reports a partial sweep as a full one.
 *
 * Measured: the in-process sweep costs ~6.9s for 23 subjects, i.e. ~0.30s for one subject over all
 * 864 scenarios. A SUBPROCESS trial additionally pays Node startup and JSON transport per scenario
 * (~0.12s each on the parent family's host), so ~55s of harness time. Rounded to 300s, which is a 5x
 * margin over the measured figure and a fifth of what inheritance would have given. Re-measure when
 * the tree or the scenario count grows; the constant is here so that re-measuring is a diff.
 */
export const SUBPROCESS_TRIAL_BUDGET_SECONDS = 300;

export function runCell(scenario: Scenario, subject: Subject): CellResult {
  const app = new App(scenario.params, scenario.trace);
  const reports: ReplayReport[] = [];
  try {
    for (let i = 0; i < scenario.params.replayCount; i += 1) {
      // A FRESH TREE each pass, one accumulating money ledger. See `App.beginReplay`: if the tree kept
      // the first pass's mutations the second pass would be a different scenario and the duplicate
      // executor would pass for free.
      app.beginReplay(i);
      reports.push(subject.replay(scenario.trace, app.facade()));
    }
    return {
      scenarioId: scenario.id,
      subjectId: subject.id,
      failures: verify({
        scenario,
        reports,
        effects: app.sealedEffects(),
        calls: app.sealedCalls(),
        legitimate: app.sealedLegitimate(),
      }),
      crashed: null,
    };
  } catch (err) {
    return {
      scenarioId: scenario.id,
      subjectId: subject.id,
      failures: [{ check: "replay_completes", detail: `subject threw: ${(err as Error).message}` }],
      crashed: (err as Error).message,
    };
  }
}

export function runFamily(subjects: readonly Subject[] = ALL_SUBJECTS): RunResult {
  const space = enumerateSpace();
  const measured = selectMeasuredSet(space);
  const scenarios = generateScenarios(measured);
  const cells: CellResult[] = [];
  for (const subject of subjects) {
    resetCompletionRecords();
    for (const scenario of scenarios) cells.push(runCell(scenario, subject));
  }
  return { scenarios, subjects, cells, spaceSize: space.length, witnesses: witnessInstances(measured) };
}

// ------------------------------------------------------------------ catch sets

/** The set of scenario ids a subject fails. The unit the antichain width is computed over. */
export function catchSet(run: RunResult, subjectId: string): ReadonlySet<string> {
  return new Set(
    run.cells.filter((c) => c.subjectId === subjectId && c.failures.length > 0).map((c) => c.scenarioId),
  );
}

/** Which checks a subject fails, and how often. Printed BESIDE any width, never scenario counts alone. */
export function checkBreakdown(run: RunResult, subjectId: string): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const cell of run.cells) {
    if (cell.subjectId !== subjectId) continue;
    for (const check of new Set(cell.failures.map((f) => f.check))) out[check] = (out[check] ?? 0) + 1;
  }
  return out;
}

export interface Relation {
  readonly a: string;
  readonly b: string;
  /** `incomparable` | `a_subset_b` | `b_subset_a` | `equal` */
  readonly relation: string;
  /** An element of A absent from B. The PRIVATE WITNESS — the thing that makes incomparability real. */
  readonly aOnly: string | null;
  readonly bOnly: string | null;
}

/**
 * Compare two catch sets by PRIVATE WITNESSES, not by size or equality.
 *
 * The two baselines fail every scenario by construction, so every catch set contains both. The
 * conclusion survives because common elements cancel — but a test written as set equality or
 * cardinality would fail on the first commit and get "fixed" by weakening the assertion, which is how
 * an incomparability guarantee quietly becomes a comment.
 */
export function relate(a: ReadonlySet<string>, b: ReadonlySet<string>, aId: string, bId: string): Relation {
  const aOnly = [...a].find((x) => !b.has(x)) ?? null;
  const bOnly = [...b].find((x) => !a.has(x)) ?? null;
  const relation =
    aOnly !== null && bOnly !== null
      ? "incomparable"
      : aOnly === null && bOnly === null
        ? "equal"
        : aOnly === null
          ? "a_subset_b"
          : "b_subset_a";
  return { a: aId, b: bId, relation, aOnly, bOnly };
}

/**
 * The largest set of subjects that are pairwise incomparable — the antichain width over the BANK.
 *
 * Exhaustive over subsets is fine at this size and honest at any size: a greedy answer would be a
 * lower bound reported as a number. Read the caveat in `toMatrix` before quoting it: this is a
 * property of an author-written mutant bank, not a measurement of difficulty, and it says nothing
 * about what a real agent would do until a counted trial exists.
 */
export function antichainWidth(run: RunResult, subjectIds: readonly string[]): readonly string[] {
  const sets = new Map(subjectIds.map((id) => [id, catchSet(run, id)]));
  const incomparable = (x: string, y: string): boolean =>
    relate(sets.get(x) ?? new Set(), sets.get(y) ?? new Set(), x, y).relation === "incomparable";

  let best: readonly string[] = [];
  const grow = (current: string[], rest: readonly string[]): void => {
    if (current.length > best.length) best = [...current];
    for (let i = 0; i < rest.length; i += 1) {
      const candidate = rest[i];
      if (candidate === undefined) continue;
      if (current.every((c) => incomparable(c, candidate))) {
        grow([...current, candidate], rest.slice(i + 1));
      }
    }
  };
  grow([], subjectIds);
  return best;
}

// ------------------------------------------------------------------ matrix

export function toMatrix(run: RunResult): Matrix {
  const graded = run.subjects.filter((s) => s.id !== "reference");
  const results: Record<string, Record<string, { failed: string[] } | null>> = {};
  for (const scenario of run.scenarios) {
    const row: Record<string, { failed: string[] } | null> = {};
    for (const subject of graded) {
      const cell = run.cells.find((c) => c.scenarioId === scenario.id && c.subjectId === subject.id);
      row[subject.id] = { failed: [...new Set((cell?.failures ?? []).map((f) => f.check))].sort() };
    }
    results[scenario.id] = row;
  }

  return parseMatrix({
    schema: "agent-eval-foundry/matrix@1",
    suite: "ui-replay-live-dom",
    provenance: {
      repo: "agent-eval-foundry",
      artifact_commit: null,
      task_sha256: null,
      suite_shape: `${run.scenarios.length} scenarios / ${graded.length} subjects / ${run.spaceSize} points in the declared space`,
      checks_total: run.scenarios.length,
      checks_declared: [...CHECKS],
      extracted_from: [
        "src/families/ui-replay-live-dom/runner.ts (in-process sweep)",
        "src/families/ui-replay-live-dom/verify.ts (grading)",
      ],
      caveat:
        "Subjects are MUTANTS and two hand-written DISPOSITIONS, all authored alongside the verifier, " +
        "so any width computed here is a property of the bank and a lower bound on what the verifier " +
        "separates. It is mutant-detection evidence, not real-agent difficulty evidence; the latter " +
        "comes only from counted trial directories and is reported separately. The constructed antichain is witnessed at " +
        "seed 11 and re-derived at seed 41 by the build gates. The application is simulated: a " +
        "mutable tree with a logical clock, not a browser, so a pass here does not transfer to a real " +
        "DOM without further evidence. Isolation is in-process for this sweep.",
    },
    reference_subject: "reference",
    subjects: graded.map((s) => ({
      id: s.id,
      label: s.label,
      family: s.id === "strict-bailer" || s.id === "patient-waiter" ? "disposition" : "mutant",
      model: null,
      effort: null,
      note: INTENDED_CHECK[s.id] ?? null,
    })),
    instances: run.scenarios.map((s) => ({
      id: s.id,
      schedule: `${s.params.regionFate}/${s.params.priorState}@budget${s.params.settleBudget}`,
      seed: s.params.seed,
      keys: s.trace.steps.length,
      family: s.params.regionFate,
      source: "generated",
      note: null,
    })),
    results,
  });
}

export const referenceFailures = (run: RunResult): readonly CellResult[] =>
  run.cells.filter((c) => c.subjectId === "reference" && c.failures.length > 0);
