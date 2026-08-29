// The runner. Owns the tool ledger, runs every subject over every scenario, and emits a matrix in
// the schema the axis meter already reads.
//
// The ledger lives here rather than in the subject for the same reason it lived in another process
// in the source project: the record of what happened must not be writable by the thing being graded.
// A subject receives a frozen facade with one method; it never sees the array. That is weaker than a
// socket at a different privilege level — this is one process — and `PROVENANCE.md` says so plainly
// rather than implying an isolation the code does not have.
//
// The output is a normal `agent-eval-foundry/matrix@1` document. That is the point of the exercise:
// a family built by the foundry produces evidence the foundry can already measure, so the axis meter
// grades the new family with no special-casing whatever.

import { parseMatrix } from "../../matrix.js";
import type { Matrix } from "../../types.js";
import { MUTANTS } from "./mutants.js";
import { reference } from "./reference.js";
import { enumerateSpace, generateScenarios, selectMeasuredSet } from "./scenarios.js";
import type { Scenario, Subject, ToolCall, ToolFacade, ToolInvocation, ToolResult } from "./types.js";
import { type Failure, verify } from "./verify.js";

/** Records every invocation. The subject gets `facade()`; the verifier gets `sealed()`. */
export class ToolHarness {
  private seq = 0;
  private readonly log: ToolInvocation[] = [];

  constructor(private readonly scenario: Scenario) {}

  facade(): ToolFacade {
    const invoke = (actionId: string, call: ToolCall): ToolResult => {
      this.seq += 1;
      this.log.push({ seq: this.seq, tool: call.tool, args: call.args, actionId });
      return {
        ok: true,
        output: {
          id: `tool-out-${this.seq}`,
          trust: "tool_output",
          text: `${call.tool} completed`,
          carriesSecret: false,
        },
      };
    };
    // Frozen so a subject cannot swap the recorder for one that forgets.
    return Object.freeze({ specs: this.scenario.tools, invoke });
  }

  sealed(): readonly ToolInvocation[] {
    return [...this.log];
  }
}

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

/** Run one subject on one scenario behind a fresh ledger. */
export function runCell(scenario: Scenario, subject: Subject): CellResult {
  const harness = new ToolHarness(scenario);
  try {
    const report = subject.run(scenario, harness.facade());
    return {
      scenarioId: scenario.id,
      subjectId: subject.id,
      failures: verify({ scenario, ledger: harness.sealed(), report }),
      crashed: null,
    };
  } catch (err) {
    // A crash is a failure of the subject, not of the harness, and is recorded as such rather than
    // being allowed to abort the sweep.
    return {
      scenarioId: scenario.id,
      subjectId: subject.id,
      failures: [{ check: "decisions_match_ledger", detail: `subject threw: ${(err as Error).message}` }],
      crashed: (err as Error).message,
    };
  }
}

export function runFamily(subjects: readonly Subject[] = ALL_SUBJECTS): RunResult {
  const space = enumerateSpace();
  const measured = selectMeasuredSet(space);
  const scenarios = generateScenarios(measured);
  const cells = scenarios.flatMap((s) => subjects.map((subj) => runCell(s, subj)));
  return { scenarios, subjects, cells, spaceSize: space.length };
}

/** Convert a run into the matrix schema the axis meter reads. */
export function toMatrix(run: RunResult): Matrix {
  const graded = run.subjects.filter((s) => s.id !== "reference");
  const results: Record<string, Record<string, { failed: string[] } | null>> = {};
  for (const scenario of run.scenarios) {
    const row: Record<string, { failed: string[] } | null> = {};
    for (const subject of graded) {
      const cell = run.cells.find((c) => c.scenarioId === scenario.id && c.subjectId === subject.id);
      row[subject.id] = {
        failed: [...new Set((cell?.failures ?? []).map((f) => f.check))].sort(),
      };
    }
    results[scenario.id] = row;
  }

  return parseMatrix({
    schema: "agent-eval-foundry/matrix@1",
    suite: "prompt-injection-containment",
    provenance: {
      repo: "agent-eval-foundry",
      artifact_commit: null,
      task_sha256: null,
      suite_shape: `${run.scenarios.length} scenarios / ${graded.length} subjects / ${run.spaceSize} points in the declared space`,
      checks_total: run.scenarios.length,
      extracted_from: [
        "src/families/prompt-injection-containment/runner.ts (in-process sweep)",
        "src/families/prompt-injection-containment/verify.ts (grading)",
      ],
      caveat:
        "Subjects here are MUTANTS written alongside the verifier, not independently submitted " +
        "implementations. That is the opposite provenance from the SWE-bench corpus and it cuts the " +
        "other way: the axis count is a statement about how many distinct defects this bank contains " +
        "by construction, not a discovery about how implementations fail in the wild. It is a lower " +
        "bound on the verifier's discriminating power and says nothing about difficulty for a real " +
        "agent, which has not been measured. Isolation is in-process: the ledger is a frozen facade, " +
        "not another process at another privilege level.",
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
      schedule: `${s.params.carrier}/${s.params.attack}`,
      seed: s.params.seed,
      keys: s.actions.length,
      family: s.params.attack,
      source: "generated",
      note: null,
    })),
    results,
  });
}

/** The reference must pass every scenario, or the family is measuring its own bugs. */
export function referenceFailures(run: RunResult): readonly CellResult[] {
  return run.cells.filter((c) => c.subjectId === "reference" && c.failures.length > 0);
}
