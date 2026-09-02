// Two ways the durable-outbox importer manufactured evidence, pinned against the real archive.
//
// FIRST, it decided what a run was from the DIRECTORY NAME. `run-claude-1`, `v2-claude-1`,
// `v21-claude-1`, `v22-claude-1` and `check-v21` all match the "standard attempt" name pattern, all
// carry reward 1.0, and all ran `reorg-safe-settlement` — a different task, whose trial ids were
// sitting in the same `result.json` the importer was already parsing. Five foreign solves were
// counted as outbox solves.
//
// SECOND, it expanded one binary reward into 24 per-scenario cells. A reward-0 run became "failed all
// 24 scenarios", which is coarse but not false; a reward-1 run became 24 cells of `failed: []`, which
// is the affirmative claim "this subject was graded against `serial-clean-1009-12` and passed it".
// The archive cannot support that claim — every run directory holds exactly one file, `result.json`,
// with one reward in it — and in this archive the claim is also wrong: `fh-claude-3` and
// `v2-opus-3b` were both recorded as solves at the time and both were later found still carrying the
// `ACKED -> REVOKED` defect.
//
// Both groups fail against the pre-fix importer.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseMatrix } from "../src/matrix.js";
import { buildAgentBank } from "../src/trials/agent-bank.js";
import {
  NO_PER_SCENARIO_DETAIL,
  SUITE_REWARD_ZERO,
  importDurableOutboxHistory,
  runTaskName,
} from "../src/trials/history.js";
import { cellPassed, summarise } from "../src/trials/types.js";
import { parseTrialRecord } from "../src/trials/validate.js";

const ROOT = join(__dirname, "..");
const RUNS = join(ROOT, "examples/durable-outbox/runs");
const OUTBOX = "durable-approval-outbox";

const matrix = parseMatrix(
  JSON.parse(readFileSync(join(ROOT, "examples/durable-outbox/matrix.json"), "utf8")),
);
const scenarioIds = matrix.instances.map((i) => i.id);
const history = importDurableOutboxHistory(RUNS, OUTBOX, scenarioIds, "dao-24");
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
    "%s ran a different task, so it does not count",
    (runId) => {
      const record = recordFor(runId);
      expect(record).toBeDefined();
      expect(record?.counts).toBe(false);
      expect(record?.cells).toEqual([]);
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

  it("still counts the real outbox attempts and reports the waste rate over those alone", () => {
    expect(history.records.length).toBe(33);
    expect(history.counted).toBe(15);
    expect(recordFor("cc267-claude-1")?.counts).toBe(true);
    expect(recordFor("v2-opus-1")?.counts).toBe(true);
    // 17 standard attempts at THIS task; 2 (v2-codex-2 ApiOverloadedError, v2-opus-3 AgentTimeoutError)
    // produced nothing usable. Computed from trial ids, so the foreign runs are not in the denominator.
    expect(history.standardRuns).toBe(17);
    expect(history.standardCounted).toBe(15);
    expect(history.standardWasteRate).toBeCloseTo(2 / 17, 6);
  });
});

describe("the importer refuses to fabricate per-scenario detail it does not have", () => {
  it("a counted reward-1 run produces no clean per-scenario pass", () => {
    // Pre-fix: 24 cells of `failed: []` each, i.e. 24 assertions that a named scenario was passed.
    for (const runId of ["fh-claude-3", "v2-opus-3b"]) {
      const record = recordFor(runId);
      expect(record?.counts).toBe(true);
      expect(record?.cells.length).toBe(24);
      expect(record?.cells.some(cellPassed)).toBe(false);
      for (const cell of record?.cells ?? []) {
        expect(cell.failed).toEqual([]);
        expect(cell.unmeasured).toBe(NO_PER_SCENARIO_DETAIL);
      }
      // ...and the record is not reported as a pass on the strength of cells nobody graded.
      if (record === undefined) throw new Error("expected a record for the reward-1 outbox run");
      const s = summarise(record);
      expect(s.scenariosUnmeasured).toBe(24);
      expect(s.passed).toBe(false);
    }
  });

  it("across the whole import, not one cell claims a scenario was graded and passed", () => {
    const counted = history.records.filter((r) => r.counts);
    const cells = counted.flatMap((r) => r.cells);
    expect(cells.length).toBe(360);
    expect(cells.filter(cellPassed).length).toBe(0); // was 168
    expect(cells.filter((c) => c.unmeasured !== undefined).length).toBe(48);
    // A suite-level zero does entail a failure somewhere, so that coarse cell is kept as-is.
    expect(cells.filter((c) => c.failed.length > 0).length).toBe(312);
    expect(new Set(cells.flatMap((c) => c.failed))).toEqual(new Set([SUITE_REWARD_ZERO]));
    expect(counted.filter((r) => r.cells.some((c) => c.failed.length > 0)).length).toBe(13);
  });

  it("an ungraded cell reaches the agent bank as a null, never as a pass", () => {
    // Only the two reward-1 runs, so their cells are the sole evidence for the subject. Pre-fix this
    // bank showed `claude-opus-5` passing all 24 instances, which is a catch set of nothing derived
    // from a suite-level bit; a null is excluded from catch sets instead of imputed as a pass.
    const rewardOne = history.records.filter((r) => r.counts && /fh-claude-3|v2-opus-3b/.test(r.runId));
    expect(rewardOne.length).toBe(2);
    const bank = buildAgentBank(rewardOne, { familyId: OUTBOX, instanceIds: scenarioIds, caveat: "test" });
    const opus = "claude-opus-5";
    expect(bank.matrix.subjects.map((s) => s.id)).toContain(opus);
    const nulls = scenarioIds.filter((id) => bank.matrix.results[id]?.[opus] === null);
    const passes = scenarioIds.filter((id) => bank.matrix.results[id]?.[opus]?.failed.length === 0);
    expect(passes.length).toBe(0); // was 24
    expect(nulls.length).toBe(24);
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
