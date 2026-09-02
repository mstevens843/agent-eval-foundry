// The imported outbox bank must contain only the outbox task, and must not invent per-scenario detail.
//
// Two defects lived here and both survived for months because nothing pinned the numbers.
//
// 1. Runs were classified by DIRECTORY-NAME PREFIX, never by the task they actually ran. Five runs of
//    `reorg-safe-settlement` sat inside the durable-approval-outbox bank, all with reward 1.0,
//    counting as clean passes of a task they never attempted.
// 2. A single binary reward was expanded into 24 per-scenario cells. For a reward-0 run that claimed
//    "failed all 24 scenarios"; for a reward-1 run it claimed the run PASSED 24 named scenarios. The
//    source records neither. That is an affirmative claim the data cannot support.
//
// These assertions are deliberately exact. If the run corpus legitimately changes, update them and
// say why in the commit — a count that drifts silently is how the first defect survived.
//
// The filename is legacy: this began as a scratch probe and could not be renamed in place.

import { describe, expect, it } from "vitest";
import { outboxHistory } from "../src/reports/evidence.js";
import { runTaskName } from "../src/trials/history.js";

const OUTBOX_TASK = "durable-approval-outbox";

describe("imported outbox bank", () => {
  const history = outboxHistory(process.cwd());
  const counted = history.records.filter((r) => r.counts);

  it("counts only runs of the outbox task itself", () => {
    const foreign = history.runs
      .filter((run) => counted.some((r) => r.runId === run.runName))
      .map((run) => ({ run: run.runName, task: runTaskName(run) }))
      .filter((r) => r.task !== null && r.task !== OUTBOX_TASK);

    expect(foreign, "a counted outbox trial ran a different task entirely").toEqual([]);
    expect(history.counted).toBe(15);
    expect(history.records.length).toBe(33);
  });

  it("does not fabricate a clean pass from a binary reward", () => {
    // A reward-1 run must not assert that 24 named scenarios each passed: the archive holds one
    // aggregate bit and no per-check detail. A cell that neither failed nor was individually graded
    // has to SAY it was never graded — an empty `failed` with no marker reads as a measured pass.
    const silentPasses = counted.flatMap((r) =>
      r.cells
        .filter((c) => c.failed.length === 0 && c.unmeasured === undefined)
        .map((c) => `${r.runId}/${c.scenarioId}`),
    );
    expect(
      silentPasses.slice(0, 5),
      "a binary reward was expanded into per-scenario passes the source never recorded",
    ).toEqual([]);
  });

  it("reports the failing runs it actually measured", () => {
    const failing = counted.filter((r) => r.cells.some((c) => c.failed.length > 0));
    expect(failing.length).toBe(13);
  });
});
