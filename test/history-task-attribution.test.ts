// Two ways the durable-outbox importer manufactured evidence, pinned against the real archive.
//
// FIRST, it decided what a run was from the DIRECTORY NAME. `run-claude-1`, `v2-claude-1`,
// `v21-claude-1`, `v22-claude-1` and `check-v21` all match the "standard attempt" name pattern, all
// carry reward 1.0, and all ran `reorg-safe-settlement` — a different task, whose trial ids were
// sitting in the same `result.json` the importer was already parsing. Five foreign solves were
// counted as outbox solves.
//
// SECOND, it expanded one binary reward into 24 per-scenario cells. A reward-0 run became "failed all
// 24 scenarios" under a synthetic check named `suite_reward_zero`; a reward-1 run became 24 cells of
// `failed: []`, which is the affirmative claim "this subject was graded against `serial-clean-1009-12`
// and passed it". The archive cannot support either claim — every run directory holds exactly one
// file, `result.json`, with one reward in it — and in this archive the second is also wrong:
// `fh-claude-3` and `v2-opus-3b` were both recorded as solves at the time and both were later found
// still carrying the `ACKED -> REVOKED` defect.
//
// The reward-1 half was fixed first, by marking those cells ungraded. The reward-0 half survived a
// round longer, because "the suite returned zero" is at least true — but it named a check no verifier
// ever ran and it reached the shared bank as though one had. Both are now gone: the archive emits no
// cells at all, and the six runs whose per-check grading survived are trial directories instead.
//
// Every group below fails against the importer that preceded it.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseMatrix } from "../src/matrix.js";
import { buildAgentBank } from "../src/trials/agent-bank.js";
import { importDurableOutboxHistory, runTaskName } from "../src/trials/history.js";
import { cellPassed, summarise } from "../src/trials/types.js";
import { parseTrialRecord } from "../src/trials/validate.js";

const ROOT = join(__dirname, "..");
const RUNS = join(ROOT, "examples/durable-outbox/runs");
const OUTBOX = "durable-approval-outbox";

const matrix = parseMatrix(
  JSON.parse(readFileSync(join(ROOT, "examples/durable-outbox/matrix.json"), "utf8")),
);
const scenarioIds = matrix.instances.map((i) => i.id);
const history = importDurableOutboxHistory(RUNS, OUTBOX, "dao-24");
const recordFor = (runId: string) => history.records.find((r) => r.runId === runId);

describe("imported runs are attributed to the task they actually ran", () => {
  it("reads the task from the preserved trial ids, not the directory name", () => {
    expect(
      runTaskName({
        runName: "v21-claude-1",
        agent: "claude-code",
        model: "anthropic/claude-opus-5",
        effort: "adhoc",
        reward: 1,
        exceptions: [],
        erroredTrials: 0,
        costUsd: 1,
        runtimeSeconds: 10,
        trialIds: ["reorg-safe-settlement__JLEb9LQ"],
      }),
    ).toBe("reorg-safe-settlement");
    // No ids preserved is "cannot be verified", not "matches".
    expect(
      runTaskName({
        runName: "run-claude-2",
        agent: "claude-code",
        model: "anthropic/claude-opus-5",
        effort: "adhoc",
        reward: null,
        exceptions: ["CancelledError"],
        erroredTrials: 1,
        costUsd: null,
        runtimeSeconds: null,
        trialIds: [],
      }),
    ).toBeNull();
  });

  // The core regression. Pre-fix these five were counted, at reward 1.0, as outbox solves.
  it.each(["run-claude-1", "v2-claude-1", "v21-claude-1", "v22-claude-1", "check-v21"])(
    "%s ran a different task, so it is excluded by task and not merely uncounted",
    (runId) => {
      const record = recordFor(runId);
      expect(record).toBeDefined();
      expect(record?.counts).toBe(false);
      expect(record?.cells).toEqual([]);
      expect(history.excludedForTask).toContain(runId);
      // `gradedRuns` is the budget denominator, and a foreign task must never enter it however
      // cleanly it ran: four of these carry reward 1.0.
      expect(history.gradedRuns.some((r) => r.runName === runId)).toBe(false);
    },
  );

  it("keeps every excluded run as a record carrying an explanatory reason", () => {
    // Preserved, not deleted: the same idiom cheat and gate runs already use.
    for (const runId of ["run-claude-1", "v2-claude-1", "v21-claude-1", "v22-claude-1"]) {
      expect(recordFor(runId)?.countsReason).toMatch(
        /ran task "reorg-safe-settlement", not "durable-approval-outbox"/,
      );
    }
    expect(recordFor("check-v21")?.countsReason).toMatch(/ran task "check-reorg-safe-settlement"/);
    // A run whose archive preserved no trial ids cannot be attributed either way, and says so.
    expect(recordFor("run-claude-2")?.countsReason).toMatch(/preserves no trial ids/);
    expect(history.excludedForTask).toContain("v21-claude-1");
    expect(history.excludedForTask).toContain("run-claude-2");
  });

  it("reports the waste rate over the real outbox attempts alone", () => {
    expect(history.records.length).toBe(33);
    // 17 standard attempts at THIS task; 2 (v2-codex-2 ApiOverloadedError, v2-opus-3 AgentTimeoutError)
    // produced nothing usable. Computed from trial ids, so the foreign runs are not in the denominator.
    expect(history.standardRuns).toBe(17);
    expect(history.standardCounted).toBe(15);
    expect(history.gradedRuns.length).toBe(15);
    expect(history.standardWasteRate).toBeCloseTo(2 / 17, 6);
    // Graded is not counted. The money bought a verdict; the verdict is one bit.
    expect(history.gradedRuns.map((r) => r.runName)).toContain("cc267-claude-1");
    expect(recordFor("cc267-claude-1")?.counts).toBe(false);
  });
});

describe("the archive import produces no cells and counts nothing", () => {
  it("not one record counts, whatever its reward", () => {
    expect(history.counted).toBe(0);
    expect(history.uncounted).toBe(history.records.length);
    for (const record of history.records) expect(record.cells).toEqual([]);
  });

  it("a clean run at this task says why a binary reward is not evidence", () => {
    for (const runId of ["cc267-claude-1", "fh-claude-3", "v2-opus-1", "v2-opus-3b"]) {
      const record = recordFor(runId);
      expect(record?.counts).toBe(false);
      // The reason names both halves: what the source recorded, and where the real cells live.
      expect(record?.countsReason).toMatch(/one binary suite reward and no per-check detail/);
      expect(record?.countsReason).toMatch(/trials\/durable-approval-outbox\//);
    }
  });

  it("neither reward-1 run is reported as a pass", () => {
    // Pre-fix: 24 cells of `failed: []` each, i.e. 24 assertions that a named scenario was passed.
    for (const runId of ["fh-claude-3", "v2-opus-3b"]) {
      const record = recordFor(runId);
      if (record === undefined) throw new Error(`expected a record for ${runId}`);
      expect(record.cells.some(cellPassed)).toBe(false);
      expect(summarise(record).passed).toBe(false);
    }
  });

  it("the synthetic `suite_reward_zero` check reaches no bank, because no bank can be built", () => {
    // Pre-fix: 312 cells across 13 counted runs, every one of them failing a check no verifier ran.
    const cells = history.records.flatMap((r) => r.cells);
    expect(cells.length).toBe(0);
    const bank = buildAgentBank(history.records, {
      familyId: OUTBOX,
      instanceIds: scenarioIds,
      caveat: "test",
    });
    expect(bank.subjects).toEqual([]);
    expect(bank.matrix.subjects).toEqual([]);
  });

  it("a cell may not be both ungraded and carry named failing checks", () => {
    const base = {
      runId: "r",
      familyId: OUTBOX,
      subjectId: "s",
      subjectType: "agent",
      model: "m",
      effort: null,
      status: "completed",
      counts: true,
      countsReason: "because",
      scenarioSetId: "dao-24",
      runtimeSeconds: null,
      costUsd: null,
      artifactPath: "runs/r",
      isolation: "container",
      notes: "",
    };
    expect(() =>
      parseTrialRecord({ ...base, cells: [{ scenarioId: "a", failed: ["x"], unmeasured: "why" }] }),
    ).toThrowError(expect.objectContaining({ code: "TRIAL_CELL_UNMEASURED_WITH_FAILURES" }));
    expect(() =>
      parseTrialRecord({ ...base, cells: [{ scenarioId: "a", failed: [], unmeasured: "why" }] }),
    ).not.toThrow();
  });
});
