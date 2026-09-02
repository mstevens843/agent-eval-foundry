// The four validators on the CTRF import path, which nobody had ever shown work.
//
// `test/foundry-validators.test.ts` asserts that every rule code in the registry has at least one
// known-bad case, on the principle that a checker nobody has watched fail is a checker nobody has
// shown works. Four codes on this path had none — they were raised in `src/trials/history.ts` and
// tested nowhere — so that assertion had been failing since the import was written, and the failure
// was invisible because the whole verification suite had been deferred for three phases.
//
// These are the cases. Each one feeds the import a specific corruption and asserts the specific code.
//
// Why the corruptions are the ones they are: this path turns a Harbor CTRF report into per-check
// trial cells by zipping 264 parametrized results index-for-index against 264 `(name, seed, keys,
// check)` tuples parsed out of a tag. A zip that slips does not throw — it produces a full, plausible
// bank of cells attributing the wrong failures to the wrong scenarios. That is a defect that reads as
// evidence, which is the class this repository exists to catch, so the guards against it are the last
// ones that should go untested.

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { importOutboxTrialDirectories, readOutboxGrading } from "../src/trials/history.js";

const scratch = () => mkdtempSync(join(tmpdir(), "outbox-import-"));

/** A CTRF report with `n` parametrized results carrying `tags` tuples, plus an optional summary. */
function ctrf(dir: string, tests: readonly Record<string, unknown>[], summary?: Record<string, unknown>): string {
  const path = join(dir, "ctrf.json");
  writeFileSync(
    path,
    JSON.stringify({ results: { tests, ...(summary ? { summary } : {}) } }, null, 1),
  );
  return path;
}

/**
 * One parametrized result. Every result in a real report carries the SAME tag — the whole tuple list
 * — and its identity comes from its INDEX in that list, which is exactly why a count mismatch is
 * unrecoverable rather than merely untidy.
 */
const TAG = (...tuples: readonly string[]) =>
  `parametrize::name,seed,keys,check::[${tuples.join(", ")}]`;

const T = (name: string, seed: number, keys: number, check: string) =>
  `('${name}', ${seed}, ${keys}, '${check}')`;

const cell = (tag: string, status: string): Record<string, unknown> => ({
  name: "test_invariants.py::test_invariant",
  status,
  tags: [tag],
});

describe("OUTBOX_CTRF_TUPLE_MISMATCH — the index-for-index zip is only valid when the counts agree", () => {
  it("refuses a report with more parametrized results than declared tuples", () => {
    const dir = scratch();
    // Three results, two tuples. Zipping would silently give the third result the second's identity,
    // or `undefined`, and every downstream cell name after that point would be wrong.
    const tag = TAG(T("serial-clean", 1009, 12, "exactly_once"), T("serial-clean", 1009, 12, "gate"));
    const path = ctrf(dir, [cell(tag, "passed"), cell(tag, "failed"), cell(tag, "failed")]);
    expect(() => readOutboxGrading(path)).toThrow(/OUTBOX_CTRF_TUPLE_MISMATCH/);
  });

  it("accepts a report whose counts agree", () => {
    const dir = scratch();
    const tag = TAG(T("serial-clean", 1009, 12, "exactly_once"), T("serial-clean", 1009, 12, "gate"));
    const path = ctrf(dir, [cell(tag, "passed"), cell(tag, "failed")]);
    const grading = readOutboxGrading(path);
    expect(grading.cells.length).toBeGreaterThan(0);
  });
});

describe("OUTBOX_CTRF_FAILURE_MISCOUNT — the report and its own entries must agree", () => {
  it("refuses a report whose summary contradicts its entries", () => {
    const dir = scratch();
    // One failing entry, a summary claiming five. Neither can then be trusted to name what failed,
    // and the whole point of this import is that it names what failed.
    const tag = TAG(T("serial-clean", 1009, 12, "exactly_once"), T("serial-clean", 1009, 12, "gate"));
    const path = ctrf(dir, [cell(tag, "passed"), cell(tag, "failed")], { failed: 5 });
    expect(() => readOutboxGrading(path)).toThrow(/OUTBOX_CTRF_FAILURE_MISCOUNT/);
  });

  it("accepts a report whose summary matches", () => {
    const dir = scratch();
    const tag = TAG(T("serial-clean", 1009, 12, "exactly_once"), T("serial-clean", 1009, 12, "gate"));
    const path = ctrf(dir, [cell(tag, "passed"), cell(tag, "failed")], { failed: 1 });
    expect(() => readOutboxGrading(path)).not.toThrow();
  });
});

describe("the import refuses to record a subject as having been given nothing", () => {
  it("OUTBOX_TASK_SUBTREE_MISSING — an empty agent-visible subtree", () => {
    const root = scratch();
    const taskDir = join(root, "task");
    mkdirSync(join(taskDir, "environment", "app"), { recursive: true });
    // The directory exists and holds no source. A trial whose challenge copy is empty records what
    // the subject could see as nothing, which would make every later fairness question unanswerable.
    expect(() =>
      importOutboxTrialDirectories({
        harborRunsRoot: join(root, "runs"),
        taskDir,
        trialsRoot: join(root, "trials"),
        familyId: "durable-approval-outbox",
        runIds: ["run-1"],
      }),
    ).toThrow(/OUTBOX_TASK_SUBTREE_MISSING/);
  });

  it("OUTBOX_RUN_WITHOUT_TRIAL — a run directory with no trial inside it", () => {
    const root = scratch();
    const taskDir = join(root, "task");
    mkdirSync(join(taskDir, "environment", "app"), { recursive: true });
    writeFileSync(join(taskDir, "environment", "app", "engine.py"), "STATE = 1\n");
    // The run exists but carries no `<familyId>__*` trial. Harbor produces this when a job is
    // launched and dies before the trial is created — a real state on disk in this project, and one
    // that must not silently import as a trial with no grading.
    mkdirSync(join(root, "runs", "run-1", "run-1"), { recursive: true });
    expect(() =>
      importOutboxTrialDirectories({
        harborRunsRoot: join(root, "runs"),
        taskDir,
        trialsRoot: join(root, "trials"),
        familyId: "durable-approval-outbox",
        runIds: ["run-1"],
      }),
    ).toThrow(/OUTBOX_RUN_WITHOUT_TRIAL/);
  });
});
