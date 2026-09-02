// The root-cause record, and the gate that now depends on it.
//
// Two artifacts in this repository were published as difficulty evidence and labelled `capability`
// by nobody: that was simply what a counted failure meant, because `difficulty-evidenced` asked
// `countedAgentTrials > 0` and nothing else. One was a deployment-alias run whose six failing checks
// fan out of a single root decision; the other a memory-poisoning run that failed every attack
// scenario because the host handed it a new memory facade per session while the package promised the
// same one.
//
// So the assertions below are about the DEFAULT more than about the happy path. A trial with no
// sidecar must read `unlabelled` and must not count; a trial whose failure is attributed to the
// harness must not count; and the gate must still be able to fail, or it is a rubber stamp wearing
// a stricter name.

import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRegistry } from "../src/foundry/load.js";
import { NEEDS_HUMAN_READ } from "../src/reports/diagnosis.js";
import type { FamilyEvidence } from "../src/reports/ship-report.js";
import { assessFamily, familyStatusLabel } from "../src/reports/ship-report.js";
import { evaluateKillSignal, parseCampaignPlan } from "../src/trials/campaign.js";
import { readFamilyTrials, readTrialDirectory, writeTrialDirectory } from "../src/trials/directory.js";
import {
  ROOT_CAUSES,
  ROOT_CAUSE_FILE,
  isDifficultyEvidence,
  parseRootCause,
  tallyRootCauses,
  unlabelledRootCause,
} from "../src/trials/root-cause.js";
import type { RootCause } from "../src/trials/root-cause.js";
import { NEVER_COUNTS } from "../src/trials/types.js";
import type { TrialRecord } from "../src/trials/types.js";

const ROOT = new URL("..", import.meta.url).pathname;

// ---------------------------------------------------------------- fixtures

const cells = (failing: number, total = 4) =>
  Array.from({ length: total }, (_, i) => ({
    scenarioId: `sc${i}`,
    failed: i < failing ? ["a_check"] : [],
  }));

const record = (over: Partial<TrialRecord> = {}): TrialRecord => ({
  runId: "t1",
  familyId: "fam",
  subjectId: "s1",
  subjectType: "agent",
  model: "test/model",
  effort: null,
  status: "completed",
  counts: true,
  countsReason: "completed and graded",
  scenarioSetId: "set1",
  cells: cells(2),
  runtimeSeconds: 1,
  costUsd: 0,
  artifactPath: "submission",
  isolation: "subprocess",
  notes: "",
  ...over,
});

const sidecar = (over: Record<string, unknown> = {}) => ({
  runId: "t1",
  familyId: "fam",
  label: "capability",
  rationale: "the submission implements the published rule and still gets the behaviour wrong",
  evidenceRead: ["submission/subject.mjs", "challenge/SPEC.md"],
  labelledBy: { kind: "human", id: "a-person", date: "2026-09-01" },
  diagnosisReading: "capability",
  ...over,
});

/** A trial directory on disk, optionally with a root-cause sidecar beside it. */
const writeDir = (opts: { trial?: Partial<TrialRecord>; rootCause?: unknown } = {}): string => {
  const root = mkdtempSync(join(tmpdir(), "foundry-rc-"));
  const rec = record(opts.trial);
  writeTrialDirectory({
    root,
    familyId: rec.familyId,
    runId: rec.runId,
    record: rec,
    countability: { counts: rec.counts, reason: rec.countsReason, classification: rec.status },
    transcript: "ok",
    challengeFiles: [{ path: "SPEC.md", content: "the rules" }],
    submissionFiles: [{ path: "subject.mjs", content: "export const subject = {};" }],
    verifierOutput: { cells: rec.cells, detail: "graded" },
    metadata: { runId: rec.runId },
  });
  const dir = join(root, rec.familyId, rec.runId);
  if (opts.rootCause !== undefined) {
    writeFileSync(join(dir, ROOT_CAUSE_FILE), `${JSON.stringify(opts.rootCause, null, 2)}\n`, "utf8");
  }
  return dir;
};

// ---------------------------------------------------------------- the record on disk

describe("the root-cause sidecar", () => {
  it("(a) a trial with NO sidecar reads `unlabelled`, and unlabelled is not difficulty evidence", () => {
    const dir = writeDir();
    const trial = readTrialDirectory(dir);

    // The whole point: the missing file is a named state, not a silent `capability`.
    expect(trial.rootCause.label).toBe("unlabelled");
    expect(trial.rootCause.evidenceRead).toEqual([]);
    expect(isDifficultyEvidence(trial.record, trial.rootCause)).toBe(false);

    // And the trial itself is a perfectly good counted failure. "Counted" and "difficulty evidence"
    // are now different facts, which is exactly what was missing.
    expect(trial.record.counts).toBe(true);
    expect(trial.record.cells.some((c) => c.failed.length > 0)).toBe(true);
    rmSync(join(dir, "..", ".."), { recursive: true, force: true });
  });

  it("(b) a trial labelled `harness-contract-violation` is not difficulty evidence", () => {
    // The memory-poisoning shape: the host handed the subject a new memory facade per session while
    // the package promised the same one, so every attack scenario failed for a reason that has
    // nothing to do with the model. It is a counted failure and it is not a capability finding.
    const dir = writeDir({
      rootCause: sidecar({
        label: "harness-contract-violation",
        rationale: "the host built a new memory facade per session while the package promised the same one",
        diagnosisReading: "single-cause-fanout",
      }),
    });
    const trial = readTrialDirectory(dir);
    expect(trial.rootCause.label).toBe("harness-contract-violation");
    expect(isDifficultyEvidence(trial.record, trial.rootCause)).toBe(false);
    rmSync(join(dir, "..", ".."), { recursive: true, force: true });
  });

  it("(c) a trial labelled `capability` IS difficulty evidence", () => {
    const dir = writeDir({ rootCause: sidecar() });
    const trial = readTrialDirectory(dir);
    expect(trial.rootCause.label).toBe("capability");
    expect(trial.rootCause.labelledBy.kind).toBe("human");
    expect(isDifficultyEvidence(trial.record, trial.rootCause)).toBe(true);
    rmSync(join(dir, "..", ".."), { recursive: true, force: true });
  });

  it("every other label in the closed enum is also not difficulty evidence", () => {
    // Guards the set rather than the three cases above: adding a member to `ROOT_CAUSES` must not
    // silently widen what counts.
    const rec = record();
    for (const label of ROOT_CAUSES) {
      const cause = { ...unlabelledRootCause("t1", "fam"), label: label as RootCause };
      expect(isDifficultyEvidence(rec, cause), label).toBe(label === "capability");
    }
  });

  it("a counted trial that failed nothing is never difficulty evidence, even labelled `capability`", () => {
    // Belt and braces against the label being used to promote a clean run: `capability` means the
    // agent got a behaviour wrong, and a run that failed nothing got nothing wrong.
    const clean = record({ cells: cells(0) });
    const cause = { ...unlabelledRootCause("t1", "fam"), label: "capability" as RootCause };
    expect(isDifficultyEvidence(clean, cause)).toBe(false);
  });
});

// ---------------------------------------------------------------- the parser

describe("the root-cause parser", () => {
  it("(e) rejects an unknown label rather than pooling it", () => {
    expect(() => parseRootCause(sidecar({ label: "model-was-lazy" }))).toThrowError(
      expect.objectContaining({ code: "ROOTCAUSE_UNKNOWN_LABEL" }),
    );
    // Including a near-synonym, which is how a closed vocabulary becomes an open one.
    expect(() => parseRootCause(sidecar({ label: "spec-defect" }))).toThrowError(
      expect.objectContaining({ code: "ROOTCAUSE_UNKNOWN_LABEL" }),
    );
    expect(() => parseRootCause(sidecar({ label: 7 }))).toThrowError(
      expect.objectContaining({ code: "ROOTCAUSE_UNKNOWN_LABEL" }),
    );
  });

  it("(e) rejects a malformed record", () => {
    expect(() => parseRootCause("not an object")).toThrowError(expect.objectContaining({ code: "E_SHAPE" }));
    expect(() => parseRootCause(sidecar({ runId: "" }))).toThrowError(
      expect.objectContaining({ code: "E_TYPE" }),
    );
  });

  it("rejects a label with no argument behind it", () => {
    expect(() => parseRootCause(sidecar({ rationale: "capability" }))).toThrowError(
      expect.objectContaining({ code: "ROOTCAUSE_NO_RATIONALE" }),
    );
  });

  it("rejects a label that names nothing the labeller read", () => {
    expect(() => parseRootCause(sidecar({ evidenceRead: [] }))).toThrowError(
      expect.objectContaining({ code: "ROOTCAUSE_NO_EVIDENCE" }),
    );
    // `unlabelled` is the one exception: it is the claim that nobody has looked.
    expect(() =>
      parseRootCause(
        sidecar({
          label: "unlabelled",
          evidenceRead: [],
          rationale: "nobody has read this trial's transcript yet",
          diagnosisReading: null,
        }),
      ),
    ).not.toThrow();
  });

  it("rejects an anonymous adjudication", () => {
    for (const bad of [undefined, {}, { kind: "committee", id: "x" }, { kind: "human", id: "" }]) {
      expect(() => parseRootCause(sidecar({ labelledBy: bad })), JSON.stringify(bad)).toThrowError(
        expect.objectContaining({ code: "ROOTCAUSE_NO_LABELLER" }),
      );
    }
  });

  it("rejects a record copied from another trial's directory", () => {
    const dir = writeDir({ rootCause: sidecar({ runId: "someone-elses-run" }) });
    expect(() => readTrialDirectory(dir)).toThrowError(
      expect.objectContaining({ code: "ROOTCAUSE_RUN_MISMATCH" }),
    );
    rmSync(join(dir, "..", ".."), { recursive: true, force: true });
  });

  it("rejects a label that contradicts what the trial actually did", () => {
    // `capability` on a run that failed nothing...
    const promoted = writeDir({ trial: { cells: cells(0) }, rootCause: sidecar() });
    expect(() => readTrialDirectory(promoted)).toThrowError(
      expect.objectContaining({ code: "ROOTCAUSE_LABEL_CONTRADICTS_OUTCOME" }),
    );
    rmSync(join(promoted, "..", ".."), { recursive: true, force: true });

    // ...and `clean` on a run that failed something.
    const buried = writeDir({
      rootCause: sidecar({
        label: "clean",
        rationale: "nothing to see here, this trial passed everything it was given",
        diagnosisReading: "clean",
      }),
    });
    expect(() => readTrialDirectory(buried)).toThrowError(
      expect.objectContaining({ code: "ROOTCAUSE_LABEL_CONTRADICTS_OUTCOME" }),
    );
    rmSync(join(buried, "..", ".."), { recursive: true, force: true });
  });

  it("refuses an AUTOMATED `capability` over a reading that needs a human", () => {
    // `NEEDS_HUMAN_READ` in diagnosis.ts already named these readings as ones that must not be
    // quoted as a difficulty result without a person reading the transcript. That was a comment.
    // Both published mis-labellings in this repository have exactly this shape.
    for (const reading of ["likely-spec-defect", "single-cause-fanout", "mixed"]) {
      expect(
        () =>
          parseRootCause(
            sidecar({
              labelledBy: { kind: "automated", id: "diagnose", date: "2026-09-01" },
              diagnosisReading: reading,
            }),
            "root-cause",
            { record: record() },
          ),
        reading,
      ).toThrowError(expect.objectContaining({ code: "ROOTCAUSE_CAPABILITY_OVER_UNREAD_DIAGNOSIS" }));

      // A HUMAN may write it: overriding a hedge after reading the transcript is the whole point of
      // the hedge. The record shows it was a person, which is the fact that was missing.
      expect(
        () => parseRootCause(sidecar({ diagnosisReading: reading }), "root-cause", { record: record() }),
        reading,
      ).not.toThrow();
    }
  });

  it("a malformed sidecar throws rather than reading as absent", () => {
    // "this file is unreadable" and "nobody has read this trial" are different facts, and demoting
    // the first to the second would let a broken record disappear into an honest-looking gap.
    const dir = writeDir({ rootCause: sidecar({ label: "not-a-cause" }) });
    expect(() => readTrialDirectory(dir)).toThrowError(
      expect.objectContaining({ code: "ROOTCAUSE_UNKNOWN_LABEL" }),
    );
    rmSync(join(dir, "..", ".."), { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------- the gate

const gateEvidence = (over: Partial<FamilyEvidence> = {}): FamilyEvidence => ({
  familyId: "ui-action-record-replay",
  referencePasses: true,
  baselinesBlocked: ["nop", "over-blocker"],
  baselinesTotal: 2,
  mutantsCaught: [{ mutantId: "m", check: "c", caught: true }],
  mechanismsExercised: true,
  isolation: "subprocess",
  countedAgentTrials: 5,
  agentTrialsPassed: 0,
  capabilityEvidencedTrials: 2,
  unlabelledCountedTrials: 3,
  sharedBankSubjects: 3,
  reportsDeterministic: true,
  trialReady: true,
  ...over,
});

const gateOf = (evidence: FamilyEvidence | undefined) => {
  const registry = loadRegistry(ROOT);
  const shape = registry.shapes.find((s) => s.familyId === "ui-action-record-replay");
  if (shape === undefined) throw new Error("ui-action-record-replay shape must exist");
  const assessment = assessFamily(shape, registry, evidence);
  return {
    assessment,
    verdict: assessment.results.find((r) => r.gate.id === "difficulty-evidenced")?.verdict,
    detail: assessment.results.find((r) => r.gate.id === "difficulty-evidenced")?.detail ?? "",
  };
};

describe("the difficulty-evidenced gate reads root causes", () => {
  it("(c) passes when a counted trial is root-caused to `capability`", () => {
    const g = gateOf(gateEvidence());
    expect(g.verdict).toBe("pass");
    expect(g.detail).toMatch(/2 of 5 counted agent trial\(s\) failed with root cause/);
    expect(g.assessment.blockingFailures).not.toContain("difficulty-evidenced");
  });

  it("(a)(b)(d) FAILS when five counted trials exist and none is root-caused to `capability`", () => {
    // Not vacuous, and not a duplicate of the counted-trial count: five counted trials, four of them
    // failing, and the gate still refuses. This is the deployment-alias and memory-poisoning shape.
    const g = gateOf(gateEvidence({ capabilityEvidencedTrials: 0, unlabelledCountedTrials: 5 }));
    expect(g.verdict).toBe("fail");
    expect(g.detail).toMatch(/5 counted agent trial\(s\), none root-caused/);
    expect(g.assessment.blockingFailures).toContain("difficulty-evidenced");
    expect(g.assessment.verdict).toBe("NOT-READY");
  });

  it("(d) evidence that never computed root causes reads as zero, not as a pass", () => {
    // The dangerous default. An evidence bundle assembled without consulting the sidecars has not
    // established that anything is difficulty evidence, and "not computed" must never mean
    // "computed and positive" — that WAS the bug, spelled `countedAgentTrials > 0`.
    const { capabilityEvidencedTrials, unlabelledCountedTrials, ...partial } = gateEvidence();
    expect(capabilityEvidencedTrials).toBe(2);
    expect(unlabelledCountedTrials).toBe(3);
    const g = gateOf(partial as FamilyEvidence);
    expect(g.verdict).toBe("fail");
    expect(g.detail).toMatch(/none root-caused/);
  });

  it("(d) a shape that DECLARES agent trials cannot pass the gate on the declaration", () => {
    // `agentTrialsRun` is a number in a JSON file. It cannot say why a trial failed, so it cannot
    // establish difficulty. This is the hole the imported-history families used to walk through.
    const g = gateOf(undefined);
    expect(g.verdict).toBe("fail");
    expect(g.assessment.blockingFailures).toContain("difficulty-evidenced");
  });

  it("stays independently failable: it is not a duplicate of `not-already-solved`", () => {
    // Same evidence, opposite verdicts on the two gates. A family whose counted trials all FAILED
    // (so it is not already solved) and none of which is adjudicated fails only this one.
    const g = gateOf(
      gateEvidence({ agentTrialsPassed: 0, capabilityEvidencedTrials: 0, unlabelledCountedTrials: 5 }),
    );
    expect(g.verdict).toBe("fail");
    expect(
      g.assessment.results.find((r) => r.gate.id === "not-already-solved")?.verdict,
      "not-already-solved must still pass: something failed",
    ).toBe("pass");
    expect(g.assessment.blockingFailures).toEqual(["difficulty-evidenced"]);
  });

  it("the family status label is derived from the gate, not re-decided beside it", () => {
    // Two hand-rolled copies of this ladder lived in cli.ts and read `countedAgentTrials > 0`. They
    // would now print `difficulty-evidenced` for a family the gate marks NOT-READY for failing
    // exactly that gate.
    expect(familyStatusLabel(gateOf(gateEvidence()).assessment)).toBe("SHIP");
    expect(
      familyStatusLabel(gateOf(gateEvidence({ capabilityEvidencedTrials: 0 })).assessment),
      "five counted trials, none adjudicated: not difficulty-evidenced",
    ).toBe("trial-ready");
  });
});

// ---------------------------------------------------------------- the tally

describe("tallying root causes over a counted population", () => {
  it("counts capability, unlabelled and every label separately", () => {
    const t = tallyRootCauses([
      {
        record: record({ runId: "a" }),
        rootCause: { ...unlabelledRootCause("a", "fam"), label: "capability" },
      },
      {
        record: record({ runId: "b" }),
        rootCause: { ...unlabelledRootCause("b", "fam"), label: "harness-contract-violation" },
      },
      { record: record({ runId: "c" }), rootCause: unlabelledRootCause("c", "fam") },
      {
        record: record({ runId: "d", cells: cells(0) }),
        rootCause: { ...unlabelledRootCause("d", "fam"), label: "clean" },
      },
    ]);
    expect(t.counted).toBe(4);
    expect(t.capability).toBe(1);
    expect(t.unlabelled).toBe(1);
    expect(t.byLabel["harness-contract-violation"]).toBe(1);
    expect(t.byLabel.clean).toBe(1);
    expect(t.byLabel["package-leak"]).toBe(0);
  });
});

// ---------------------------------------------------------------- the kill signal, now executable

const plan = () =>
  parseCampaignPlan({
    campaignId: "kill-signal-test",
    familyId: "fam",
    hypothesis: "the family separates subjects on the cross-session mechanism",
    killSignal:
      "Every counted trial passes cleanly, which is already-solved; or the failures are caused by a package or host defect, which is HOLD/REPAIR rather than difficulty-evidenced.",
    confirmSignal:
      "At least one counted trial fails an intended check under the current challenge hash with its artifact preserved.",
    challengeHash: "abc123",
    scenarioSetId: "set1",
    scenariosExpected: 4,
    timeoutMs: 60000,
    artifactPath: "submission",
    isolation: "subprocess",
    counting: {
      neverCounts: [...NEVER_COUNTS],
      onRefusal: "record and leave it",
      onInfraFailure: "retry once, then record",
      onCrash: "counts only if the crash is in the subject's own code",
      retriesOnInfra: 1,
      retryOnRefusal: false,
    },
    preservation: ["transcript", "submission"],
    budgetUsd: 10,
    slots: [
      {
        slotId: "A1",
        model: "test/model",
        subjectId: "s1",
        effort: null,
        runner: "shell",
        command: ["echo"],
        state: "RUN",
        runId: "t1",
        note: "",
      },
    ],
  });

describe("the pre-registered kill signal is evaluated, not decorative", () => {
  it("does not fire when a counted failure is root-caused to `capability`", () => {
    const k = evaluateKillSignal(plan(), [{ record: record(), rootCause: "capability" }]);
    expect(k.verdict).toBe("NOT_FIRED");
    expect(k.capabilityTrials).toBe(1);
  });

  it("fires the already-solved clause when every counted trial passed everything", () => {
    const k = evaluateKillSignal(plan(), [{ record: record({ cells: cells(0) }), rootCause: "clean" }]);
    expect(k.verdict).toBe("FIRED_ALREADY_SOLVED");
    expect(k.failingTrials).toBe(0);
  });

  it("fires the not-difficulty clause when the failures are the harness, not the model", () => {
    // The clause every checked-in kill signal in this repository states in prose and nothing read:
    // "failures caused by an ambiguous interface or host/package defect mean HOLD/REPAIR rather
    // than difficulty-evidenced".
    const k = evaluateKillSignal(plan(), [{ record: record(), rootCause: "harness-contract-violation" }]);
    expect(k.verdict).toBe("FIRED_NOT_DIFFICULTY");
    expect(k.disqualified).toEqual([{ runId: "t1", rootCause: "harness-contract-violation" }]);
  });

  it("fires the not-difficulty clause for an UNLABELLED failure too", () => {
    // A counted failure nobody has read is not difficulty evidence, and the plan said so before the
    // run. It is not an error and it is not a kill either — it is a finding that the campaign has
    // produced no difficulty evidence yet.
    const k = evaluateKillSignal(plan(), [{ record: record(), rootCause: "unlabelled" }]);
    expect(k.verdict).toBe("FIRED_NOT_DIFFICULTY");
  });

  it("is not evaluable when no counted trial belongs to the campaign's slots", () => {
    expect(evaluateKillSignal(plan(), []).verdict).toBe("NOT_EVALUABLE");
    // A trial the plan never claimed cannot fire another campaign's kill signal.
    expect(
      evaluateKillSignal(plan(), [{ record: record({ runId: "someone-else" }), rootCause: "capability" }])
        .verdict,
    ).toBe("NOT_EVALUABLE");
    // Neither can an uncounted one.
    expect(
      evaluateKillSignal(plan(), [
        { record: record({ status: "refused", counts: false }), rootCause: "unlabelled" },
      ]).verdict,
    ).toBe("NOT_EVALUABLE");
  });
});

// ---------------------------------------------------------------- the checked-in trials

describe("every checked-in trial's root cause", () => {
  const families = readdirSync(join(ROOT, "trials"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  it("every trial directory on disk carries a sidecar that parses against its own trial", () => {
    // `readTrialDirectory` parses each sidecar against the trial it sits beside, so a mislabelled,
    // contradictory or copied record throws here rather than at report time.
    let seen = 0;
    for (const familyId of families) {
      for (const t of readFamilyTrials(join(ROOT, "trials"), familyId)) {
        expect((ROOT_CAUSES as readonly string[]).includes(t.rootCause.label), t.runId).toBe(true);
        expect(t.rootCause.runId, t.runId).toBe(t.runId);
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThanOrEqual(30);
  });

  it("no checked-in label is an automated `capability` over a reading that needs a human", () => {
    // The rule with teeth, asserted over the real corpus rather than only over a fixture. Both
    // published mis-labellings had exactly this shape, and an automated relabelling pass is the
    // most likely way it comes back.
    for (const familyId of families) {
      for (const t of readFamilyTrials(join(ROOT, "trials"), familyId)) {
        if (t.rootCause.label !== "capability") continue;
        if (t.rootCause.labelledBy.kind !== "automated") continue;
        expect(
          NEEDS_HUMAN_READ.has(t.rootCause.diagnosisReading ?? "clean"),
          `${t.runId} is an automated capability label over a ${t.rootCause.diagnosisReading} reading`,
        ).toBe(false);
      }
    }
  });

  it("a capability label is only ever on a counted trial that actually failed something", () => {
    for (const familyId of families) {
      for (const t of readFamilyTrials(join(ROOT, "trials"), familyId)) {
        if (t.rootCause.label !== "capability") continue;
        expect(t.record.counts, t.runId).toBe(true);
        expect(
          t.record.cells.some((c) => c.failed.length > 0),
          t.runId,
        ).toBe(true);
      }
    }
  });
});
