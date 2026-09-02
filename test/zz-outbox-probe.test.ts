// The outbox bank must be made of real grading, and only of this task's grading.
//
// Two defects lived here and both survived for months because nothing pinned the numbers.
//
// 1. Runs were classified by DIRECTORY-NAME PREFIX, never by the task they actually ran. Five runs of
//    `reorg-safe-settlement` sat inside the durable-approval-outbox bank, all with reward 1.0,
//    counting as clean passes of a task they never attempted.
// 2. A single binary reward was expanded into 24 per-scenario cells. For a reward-0 run that claimed
//    "failed all 24 scenarios" under `suite_reward_zero`, a check no verifier ever ran; for a
//    reward-1 run it claimed the run PASSED 24 named scenarios. The source records neither.
//
// The repair for (2) is not a better synthetic cell. Six of those runs were preserved with their full
// CTRF report — 264 parametrized results plus 3 suite-level tests — and they are now trial
// directories with per-check cells. The archive counts nothing at all, so exactly one path counts
// these six runs and it is the one holding the submitted engines.
//
// These assertions are deliberately exact. They are the mapping check: 264 parametrized results zip
// index-for-index against 264 declared (name, seed, keys, check) tuples, and a zip that slips
// produces different numbers here. If the run corpus legitimately changes, update them and say why in
// the commit — a count that drifts silently is how the first defect survived.
//
// The filename is legacy: this began as a scratch probe and could not be renamed in place.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countedAgentRecordsFor, measuredAgentBanks, outboxHistory } from "../src/reports/evidence.js";
import { INLINE_SCRIPT, profileRun } from "../src/reports/self-check.js";
import { assertComparable, readFamilyTrials } from "../src/trials/directory.js";
import { runTaskName } from "../src/trials/history.js";

const OUTBOX_TASK = "durable-approval-outbox";
const ROOT = join(__dirname, "..");

/** Verified against the source CTRF reports: scenarios failed per run, and on which check. */
const EXPECTED: Readonly<Record<string, { failed: number; checks: readonly string[] }>> = {
  "cc267-claude-1": { failed: 2, checks: ["completion"] },
  "cc267-claude-2": { failed: 13, checks: ["audit_explains"] },
  "cc267-claude-3": { failed: 11, checks: ["audit_explains"] },
  "cc267-codex-1": { failed: 11, checks: ["audit_explains"] },
  "cc267-codex-2": { failed: 11, checks: ["audit_explains"] },
  "cc267-codex-3": { failed: 11, checks: ["audit_explains"] },
};

describe("the outbox trial directories carry the grading the source actually produced", () => {
  const dirs = readFamilyTrials(join(ROOT, "trials"), OUTBOX_TASK);

  it("all six preserved runs are present, counted, and graded on one scenario set", () => {
    expect(dirs.map((d) => d.runId)).toEqual(Object.keys(EXPECTED));
    for (const dir of dirs) {
      expect(dir.record.counts, dir.runId).toBe(true);
      expect(dir.record.cells.length, dir.runId).toBe(24);
      expect(dir.submissionFiles.length, dir.runId).toBeGreaterThan(0);
    }
    // One suite, or the six are not comparable with each other. The earlier `fh-*` round ran the
    // same 24 scenarios against a 245-check suite and reversed one verdict, which is why the set id
    // carries the check count.
    assertComparable(dirs);
    expect([...new Set(dirs.map((d) => d.record.scenarioSetId))]).toEqual(["dao-24-267"]);
  });

  it.each(Object.entries(EXPECTED))("%s failed exactly the scenarios the CTRF report names", (runId, e) => {
    const record = dirs.find((d) => d.runId === runId)?.record;
    if (record === undefined) throw new Error(`no trial directory for ${runId}`);
    const failed = record.cells.filter((c) => c.failed.length > 0);
    expect(failed.length).toBe(e.failed);
    expect([...new Set(failed.flatMap((c) => c.failed))].sort()).toEqual([...e.checks].sort());
  });

  it("nobody in this repository has adjudicated them yet, and the record says so", () => {
    // The phase rule is that nobody labels their own trials. `unlabelled` is a state with a name, and
    // it is what keeps `difficulty-evidenced` failing until somebody reads the transcripts.
    for (const dir of dirs) expect(dir.rootCause.label, dir.runId).toBe("unlabelled");
  });

  it("the model identity is the one the run observed, not one a registry declared", () => {
    const claude = dirs.find((d) => d.runId === "cc267-claude-1")?.record;
    const codex = dirs.find((d) => d.runId === "cc267-codex-1")?.record;
    expect(claude?.model).toBe("anthropic/claude-opus-5");
    expect(claude?.effort).toBe("max");
    expect(codex?.model).toBe("openai/gpt-5.6-sol");
    expect(codex?.effort).toBe("xhigh");
    // Subject id drops the effort so the same model is one subject across families; the effort is
    // preserved on its own field rather than folded into the identity.
    expect(claude?.subjectId).toBe("claude-opus-5");
    expect(codex?.subjectId).toBe("gpt-5.6-sol");
  });
});

describe("exactly one path counts these runs", () => {
  it("the imported archive counts nothing and produces no cells", () => {
    const history = outboxHistory(ROOT);
    expect(history.records.length).toBe(33);
    expect(history.counted).toBe(0);
    expect(history.records.flatMap((r) => r.cells)).toEqual([]);
    // The six are not double-counted: the archive knows they bought a verdict and still refuses to
    // treat that verdict as evidence, because its copy of it is one bit.
    expect(history.gradedRuns.map((r) => r.runName)).toEqual(
      expect.arrayContaining(Object.keys(EXPECTED)),
    );
    for (const runId of Object.keys(EXPECTED)) {
      expect(history.records.find((r) => r.runId === runId)?.counts, runId).toBe(false);
    }
  });

  it("counts only runs of the outbox task itself", () => {
    const history = outboxHistory(ROOT);
    const foreign = history.gradedRuns
      .map((run) => ({ run: run.runName, task: runTaskName(run) }))
      .filter((r) => r.task !== OUTBOX_TASK);
    expect(foreign, "a run of a different task reached the outbox denominator").toEqual([]);
  });

  it("no synthetic check reaches the counted bank, and no cell claims an ungraded pass", () => {
    const records = countedAgentRecordsFor(ROOT, OUTBOX_TASK);
    expect(records.length).toBe(6);
    const cells = records.flatMap((r) => r.cells);
    expect(cells.length).toBe(24 * 6);
    // Every failing check is a check the source verifier actually ran.
    expect([...new Set(cells.flatMap((c) => c.failed))].sort()).toEqual(["audit_explains", "completion"]);
    // And no cell is a hedge: these were graded per check, so none is marked unmeasured.
    expect(cells.filter((c) => c.unmeasured !== undefined)).toEqual([]);

    const bank = measuredAgentBanks(ROOT).find((b) => b.familyId === OUTBOX_TASK);
    expect(bank?.kind).toBe("imported");
    expect(bank?.subjects).toEqual(["claude-opus-5", "gpt-5.6-sol"]);
  });
});

// ---------------------------------------------------------------- self-check behaviour
//
// The claim under test: across these six runs the agents' OWN verification behaviour differed, and
// the difference is visible in source rather than in prose. It is pinned here rather than described,
// because "the agent's own tests said it was correct and it was not" is the failure mode the whole
// project was founded on and this is the only corpus that measures it directly.
//
// Two corrections to the received version of this claim are pinned as assertions, because both are
// the kind of thing that gets repeated until somebody checks it:
//
//  1. It is NOT true that only one lab verified itself. All six wrote verification source and ran it.
//     What differs is where it went: three wrote named files, three piped every script to a shell.
//     A scanner that reads written files alone reports the second group as having built nothing.
//  2. It is NOT true that `cc267-claude-1` built a legality table over audit transitions. Its checker
//     enforces chain continuity and terminal-state liveness and never enumerates the legal edges.
//     Exactly one run on record wrote such a table — `cc267-codex-3` — and that table lists
//     `('ACKED', 'REVOKED')` as ALLOWED, which is the transition its 11 failures are all about. That
//     is the sharpest instance of the founding failure mode anywhere in either repository: the agent
//     wrote down the rule, wrote it down wrong, and its own suite passed.
describe("what the six agents did to verify themselves", () => {
  const dirs = readFamilyTrials(join(ROOT, "trials"), OUTBOX_TASK);
  const profiles = dirs.map((dir) =>
    profileRun({
      runId: dir.runId,
      familyId: OUTBOX_TASK,
      subjectId: dir.record.subjectId,
      providerFamily: String(dir.record.model ?? "unknown").split("/")[0] ?? "unknown",
      state: "counted",
      scenariosFailed: dir.record.cells.filter((c) => c.failed.length > 0).length,
      submissionFiles: dir.submissionFiles.flatMap((name) => {
        const file = join(dir.path, "submission", name);
        return existsSync(file) ? [{ name, source: readFileSync(file, "utf8") }] : [];
      }),
      transcript: readFileSync(join(dir.path, "transcript.txt"), "utf8"),
      // The whole engine package is graded, so nothing in the submission is a checker shipped
      // beside the artifact. Defaulting to `subject.mjs` here reported all seven engine modules as
      // voluntary self-checks.
      gradedArtifact: null,
    }),
  );
  const of = (runId: string) => {
    const p = profiles.find((x) => x.runId === runId);
    if (p === undefined) throw new Error(`no profile for ${runId}`);
    return p;
  };

  it("every run wrote verification source and no run shipped any of it", () => {
    for (const p of profiles) {
      expect(p.unshipped.length, p.runId).toBeGreaterThan(0);
      expect(p.extraFiles, p.runId).toEqual([]);
      // Never promoted. The submission is seven engine modules; a grader reading it sees no checker.
      expect(p.strongestObserved, p.runId).toBeNull();
      expect(p.verdict, p.runId).toBe("ephemeral");
      expect(p.ephemeral.every((s) => s.source === "ephemeral"), p.runId).toBe(true);
    }
  });

  // KNOWN-BAD: "the Codex runs built nothing at all."
  //
  // They wrote no checker FILE, which is not the same fact. Every one of them piped assertion scripts
  // to a shell and ran them against the graded engine, and the count below is what a file-only
  // scanner would have reported as zero.
  it("names the checker files where there were files and counts the shell scripts where there were not", () => {
    const named = (runId: string) => of(runId).unshipped.filter((n) => !n.startsWith(INLINE_SCRIPT));
    expect(named("cc267-claude-1")).toEqual([
      "/app/check.py",
      "/app/fuzz.py",
      "/app/scenarios.py",
      "/app/mutations.py",
    ]);
    expect(named("cc267-claude-2")).toEqual([
      "/app/check_invariants.py",
      "/app/check_appendonly.py",
      "/app/hunt.py",
    ]);
    expect(named("cc267-claude-3")).toEqual(["/tmp/check/verify.py"]);
    for (const runId of ["cc267-codex-1", "cc267-codex-2", "cc267-codex-3"]) {
      expect(named(runId), runId).toEqual([]);
      expect(of(runId).unshipped.length, runId).toBeGreaterThan(10);
    }
  });

  it("exactly one run wrote a legality table, and it still failed eleven scenarios", () => {
    const withTable = profiles.filter((p) => p.ephemeral.some((s) => s.kind === "legality-table"));
    expect(withTable.map((p) => p.runId)).toEqual(["cc267-codex-3"]);
    expect(of("cc267-codex-3").scenariosFailed).toBe(11);
    // A checker bounds what you can EXPRESS and not what you EXPLORE — and here it did not even
    // bound expression correctly. The table was written, and it permitted the failing edge.
    expect(of("cc267-claude-1").strongestEphemeral).not.toBe("legality-table");
  });
});
