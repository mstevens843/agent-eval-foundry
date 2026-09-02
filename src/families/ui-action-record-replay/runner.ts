// The runner. Drives every subject through every scenario, replaying the declared number of times,
// and emits a matrix the axis meter already reads.
//
// Completion records are reset between subjects. Without that, a subject that ran earlier would leave
// state behind and the next one would look idempotent for free — the harness would be doing the work
// the subject is graded on.

import { parseMatrix } from "../../matrix.js";
import type { Matrix } from "../../types.js";
import { App } from "./app.js";
import { MUTANTS } from "./mutants.js";
import { reference, resetCompletionRecords } from "./reference.js";
import { enumerateSpace, generateScenarios, selectMeasuredSet } from "./scenarios.js";
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
}

export const ALL_SUBJECTS: readonly Subject[] = [reference, ...MUTANTS];

export function runCell(scenario: Scenario, subject: Subject): CellResult {
  const app = new App(scenario.liveTree, scenario.params.confirmation, scenario.params.asyncSettled);
  const reports: ReplayReport[] = [];
  try {
    for (let i = 0; i < scenario.params.replayCount; i += 1) {
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
  const scenarios = generateScenarios(selectMeasuredSet(space));
  const cells: CellResult[] = [];
  for (const subject of subjects) {
    resetCompletionRecords();
    for (const scenario of scenarios) cells.push(runCell(scenario, subject));
  }
  return { scenarios, subjects, cells, spaceSize: space.length };
}

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
    suite: "ui-action-record-replay",
    provenance: {
      repo: "agent-eval-foundry",
      artifact_commit: null,
      task_sha256: null,
      suite_shape: `${run.scenarios.length} scenarios / ${graded.length} subjects / ${run.spaceSize} points in the declared space`,
      checks_total: run.scenarios.length,
      checks_declared: [...CHECKS],
      extracted_from: [
        "src/families/ui-action-record-replay/runner.ts (in-process sweep)",
        "src/families/ui-action-record-replay/verify.ts (grading)",
      ],
      caveat:
        "Subjects are MUTANTS written alongside the verifier, so this is a lower bound on what the " +
        "verifier detects and says nothing about difficulty for a real agent — no trial has been run. " +
        "The application is simulated: a deterministic tree, not a browser, so a pass here does not " +
        "transfer to a real DOM without further evidence. Isolation is in-process for this sweep.",
    },
    reference_subject: "reference",
    subjects: graded.map((s) => ({
      id: s.id,
      label: s.label,
      family: "mutant",
      model: null,
      effort: null,
      note: null,
    })),
    instances: run.scenarios.map((s) => ({
      id: s.id,
      schedule: `${s.params.mutation}@${s.params.mutationDepth}/${s.params.confirmation}`,
      seed: s.params.seed,
      keys: s.trace.steps.length,
      family: s.params.mutation,
      source: "generated",
      note: null,
    })),
    results,
  });
}

export const referenceFailures = (run: RunResult): readonly CellResult[] =>
  run.cells.filter((c) => c.subjectId === "reference" && c.failures.length > 0);
