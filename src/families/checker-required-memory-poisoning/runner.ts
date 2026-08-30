// Runner for the checker-required memory-poisoning family.

import { parseMatrix } from "../../matrix.js";
import type { Matrix } from "../../types.js";
import { BASELINES, INTENDED_CHECK, MUTANTS } from "./mutants.js";
import { referenceSubmission, runChecker, runSubjectTrace } from "./reference.js";
import { enumerateSpace, generateScenarios, selectMeasuredSet } from "./scenarios.js";
import type { Scenario } from "./truth.js";
import type { Submission } from "./types.js";
import { type Failure, verify } from "./verify.js";

export interface CellResult {
  readonly scenarioId: string;
  readonly subjectId: string;
  readonly failures: readonly Failure[];
  readonly crashed: string | null;
}

export interface RunResult {
  readonly scenarios: readonly Scenario[];
  readonly subjects: readonly Submission[];
  readonly cells: readonly CellResult[];
  readonly spaceSize: number;
}

export const ALL_SUBJECTS: readonly Submission[] = [referenceSubmission, ...MUTANTS];

export function runCell(scenario: Scenario, submission: Submission): CellResult {
  try {
    const subjectTrace = runSubjectTrace(scenario.memoryScenario, submission.subject, "candidate");
    const checkerRun = runChecker(scenario, submission.checker);
    return {
      scenarioId: scenario.id,
      subjectId: submission.id,
      failures: verify({ scenario, subjectTrace, checkerRun }),
      crashed: null,
    };
  } catch (err) {
    return {
      scenarioId: scenario.id,
      subjectId: submission.id,
      failures: [
        { check: "checker_returns_well_formed_report", detail: `runner threw: ${(err as Error).message}` },
      ],
      crashed: (err as Error).message,
    };
  }
}

export function runFamily(subjects: readonly Submission[] = ALL_SUBJECTS): RunResult {
  const space = enumerateSpace();
  const scenarios = generateScenarios(selectMeasuredSet(space));
  const cells = scenarios.flatMap((scenario) => subjects.map((subject) => runCell(scenario, subject)));
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
    suite: "checker-required-memory-poisoning",
    provenance: {
      repo: "agent-eval-foundry",
      artifact_commit: null,
      task_sha256: null,
      suite_shape: `${run.scenarios.length} scenarios / ${graded.length} subjects / ${run.spaceSize} points in the declared space`,
      checks_total: run.scenarios.length,
      extracted_from: [
        "src/families/checker-required-memory-poisoning/runner.ts (in-process sweep)",
        "src/families/checker-required-memory-poisoning/verify.ts (subject and checker grading)",
      ],
      caveat:
        "Subjects are known-bad submissions authored with the verifier. The axis count is mutant-detection evidence for the submitted-checker contract, not real-agent difficulty evidence. A counted trial directory is required before claiming models actually struggle with this family.",
    },
    reference_subject: "reference",
    subjects: graded.map((s) => ({
      id: s.id,
      label: s.label,
      family:
        s.id.startsWith("subject-") || s.id.includes("implementation") ? "subject-mutant" : "checker-mutant",
      model: null,
      effort: null,
      note: INTENDED_CHECK[s.id] ?? null,
    })),
    instances: run.scenarios.map((s) => ({
      id: s.id,
      schedule: `${s.params.checkerProbe}/${s.params.attack}/s${s.params.sessionsBetween}/${s.params.memoryKind}`,
      seed: s.params.seed,
      keys: s.checkerCase.sessions.flatMap((x) => x.actions).length,
      family: s.params.checkerProbe,
      source: "generated",
      note: s.params.visibleCoverage,
    })),
    results,
  });
}

export const referenceFailures = (run: RunResult): readonly CellResult[] =>
  run.cells.filter((c) => c.subjectId === "reference" && c.failures.length > 0);

export { BASELINES, INTENDED_CHECK };
