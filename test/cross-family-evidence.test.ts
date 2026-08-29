// Tests for the cross-family evidence layer.
//
// Every `KNOWN-BAD` case below is a mistake that either shipped in this repository or was one edit
// away from shipping. They are written as the wrong behaviour first — "here is the flattering number
// somebody would quote" — and then asserted against, because a test that only checks the happy path
// does not stop the failure it was written for.

import { describe, expect, it } from "vitest";
import { BUILT_FAMILIES, REALISM_LEVELS, builtFamily } from "../src/families/registry.js";
import { type CombinedResult, indistinguishableFromChance } from "../src/reports/bank-completion-report.js";
import {
  analyseChain,
  assertChainNotQuotedAsBreadth,
  diversityTargets,
} from "../src/reports/chain-analysis.js";
import {
  definedButUnused,
  profileRun,
  scanSubmission,
  scanTranscript,
  stripNonCode,
} from "../src/reports/self-check.js";
import {
  calibrationOf,
  commandsIn,
  qualityOf,
  statedConfidenceOf,
} from "../src/reports/submission-quality.js";
import { assertCombinedWidthAllowed, bankCompletion } from "../src/trials/bank-completion.js";
import { type KindedBank, kindedBank } from "../src/trials/bank.js";
import type { EvidenceLedger } from "../src/trials/evidence-lifecycle.js";
import {
  MIGRATIONS,
  assertMigrationAccountsForLosses,
  assertMigrationDeclared,
  assertStaleRunsLabelled,
} from "../src/trials/migration.js";
import { PROVIDERS, providerFamiliesOf } from "../src/trials/provider-registry.js";
import type { Matrix } from "../src/types.js";

// ---------------------------------------------------------------- fixtures

const matrixOf = (familyId: string, subjects: readonly string[], instances: number): Matrix => ({
  schema: "agent-eval-foundry/matrix@1",
  suite: familyId,
  provenance: {
    repo: null,
    artifact_commit: null,
    task_sha256: null,
    suite_shape: "test",
    checks_total: instances,
    extracted_from: [],
    caveat: "test fixture",
  },
  reference_subject: null,
  subjects: subjects.map((id) => ({ id, label: id, family: "agent", model: id, effort: null, note: null })),
  instances: Array.from({ length: instances }, (_, i) => ({
    id: `i${i}`,
    schedule: "test",
    seed: null,
    keys: null,
    family: "test",
    source: "test",
    note: null,
  })),
  results: Object.fromEntries(
    Array.from({ length: instances }, (_, i) => [
      `i${i}`,
      Object.fromEntries(subjects.map((s) => [s, { failed: [] as string[] }])),
    ]),
  ),
});

const bankOf = (
  familyId: string,
  subjects: readonly string[],
  kind: "agent" | "mutant" = "agent",
): KindedBank =>
  kindedBank(
    { familyId, matrix: matrixOf(familyId, subjects, 4), provenance: "test", agentDerived: kind === "agent" },
    kind,
  );

const trialOf = (
  familyId: string,
  subjectId: string,
  state: "counted" | "superseded" | "refused" | "infra" | "not-run",
  scenarioSetId = "set-1",
) => ({
  familyId,
  runId: `${familyId}-${subjectId}-${state}`,
  subjectId,
  state,
  scenarioSetId,
  countsReason: `test fixture in state ${state}`,
});

// ---------------------------------------------------------------- shared bank completion

describe("shared-bank completion", () => {
  it("refuses when no subject attempted every family", () => {
    const c = bankCompletion({
      banks: [bankOf("a", ["m1"]), bankOf("b", ["m2"])],
      trials: [trialOf("a", "m1", "counted"), trialOf("b", "m2", "counted")],
    });
    expect(c.verdict).toBe("refused");
    expect(c.sharedSubjects).toHaveLength(0);
    expect(() => assertCombinedWidthAllowed(c)).toThrow(/BANK_BELOW_THRESHOLD/);
  });

  // KNOWN-BAD: quoting a combined width off two shared subjects.
  //
  // With two shared subjects the antichain width can only be 0, 1 or 2. It cannot distinguish
  // "these families measure the same thing" from "they measure different things", so the number is a
  // bound wearing a measurement's clothes — and it is the most flattering figure available, because
  // it reads as a portfolio total.
  it("is PARTIAL at two shared subjects and refuses the combined width", () => {
    const c = bankCompletion({
      banks: [bankOf("a", ["m1", "m2"]), bankOf("b", ["m1", "m2"])],
      trials: [
        trialOf("a", "m1", "counted"),
        trialOf("a", "m2", "counted"),
        trialOf("b", "m1", "counted"),
        trialOf("b", "m2", "counted"),
      ],
    });
    expect(c.verdict).toBe("partial");
    expect(c.sharedSubjects).toHaveLength(2);
    expect(() => assertCombinedWidthAllowed(c)).toThrow(/BANK_BELOW_THRESHOLD/);
    expect(c.minimumAdditionalTrials).toBeGreaterThan(0);
  });

  it("is MEASURED at three shared subjects and permits the combined width", () => {
    const subjects = ["m1", "m2", "m3"];
    const c = bankCompletion({
      banks: [bankOf("a", subjects), bankOf("b", subjects)],
      trials: subjects.flatMap((s) => [trialOf("a", s, "counted"), trialOf("b", s, "counted")]),
    });
    expect(c.verdict).toBe("measured");
    expect(c.minimumAdditionalTrials).toBe(0);
    expect(() => assertCombinedWidthAllowed(c)).not.toThrow();
  });

  it("a subject missing one family is not shared, and the hole says why", () => {
    const c = bankCompletion({
      banks: [bankOf("a", ["m1", "m2", "m3"]), bankOf("b", ["m1", "m2"])],
      trials: [
        ...["m1", "m2", "m3"].map((s) => trialOf("a", s, "counted")),
        trialOf("b", "m1", "counted"),
        trialOf("b", "m2", "counted"),
      ],
    });
    expect(c.sharedSubjects).toEqual(["m1", "m2"]);
    const hole = c.holes.find((h) => h.subjectId === "m3");
    expect(hole?.familyId).toBe("b");
    expect(hole?.reason).toBe("never-attempted");
    expect(hole?.fillable).toBe(true);
  });

  // KNOWN-BAD: a provider refusal counted toward overlap.
  //
  // A refusal is not an attempt and never a failure. Counting one toward the shared bank would let a
  // model that declined the task be quoted as evidence about the task — and it is the cheapest
  // possible way to reach a threshold, which is exactly why it has to be impossible.
  it("a provider refusal never counts toward overlap", () => {
    const c = bankCompletion({
      banks: [bankOf("a", ["m1", "m2", "m3"]), bankOf("b", ["m1", "m2"])],
      trials: [
        ...["m1", "m2", "m3"].map((s) => trialOf("a", s, "counted")),
        trialOf("b", "m1", "counted"),
        trialOf("b", "m2", "counted"),
        trialOf("b", "m3", "refused"),
      ],
    });
    expect(c.sharedSubjects).not.toContain("m3");
    const hole = c.holes.find((h) => h.subjectId === "m3" && h.familyId === "b");
    expect(hole?.reason).toBe("refused");
    // And it must not appear as work someone can do: re-running until a provider complies would
    // manufacture a sample.
    expect(hole?.fillable).toBe(false);
  });

  // KNOWN-BAD: a stale trial keeping a subject in the shared bank.
  //
  // The subject looks present in any naive join over trial directories — there IS a graded trial —
  // and the combined width it produces is a number about two different tasks.
  it("a superseded trial does not keep a subject in the shared bank", () => {
    const c = bankCompletion({
      banks: [bankOf("a", ["m1", "m2", "m3"]), bankOf("b", ["m1", "m2"])],
      trials: [
        ...["m1", "m2", "m3"].map((s) => trialOf("a", s, "counted")),
        trialOf("b", "m1", "counted"),
        trialOf("b", "m2", "counted"),
        trialOf("b", "m3", "superseded"),
      ],
    });
    expect(c.sharedSubjects).toEqual(["m1", "m2"]);
    expect(c.holes.find((h) => h.subjectId === "m3")?.reason).toBe("superseded");
    expect(c.verdict).toBe("partial");
  });

  it("refuses any combined width when the families are not comparable", () => {
    const subjects = ["m1", "m2", "m3"];
    const c = bankCompletion({
      banks: [bankOf("a", subjects), bankOf("b", subjects)],
      trials: [
        ...subjects.map((s) => trialOf("a", s, "counted")),
        trialOf("b", "m1", "counted", "set-1"),
        trialOf("b", "m2", "counted", "set-2"),
        trialOf("b", "m3", "counted", "set-1"),
      ],
    });
    expect(c.comparability.verdict).toBe("incomparable");
    expect(() => assertCombinedWidthAllowed(c)).toThrow(/BANK_INCOMPARABLE/);
  });

  // Model identity vs provider identity. Four models from one lab are four SUBJECTS and one LAB, and
  // the two numbers answer different questions.
  it("counts sibling models as separate subjects and one provider family", () => {
    const anthropic = PROVIDERS.filter((p) => p.family === "anthropic").map((p) => p.subjectId);
    expect(anthropic.length).toBeGreaterThan(2);
    expect(new Set(anthropic).size).toBe(anthropic.length);
    expect(providerFamiliesOf(anthropic)).toEqual(["anthropic"]);
    expect(providerFamiliesOf([...anthropic, "gpt-5.6-sol"])).toEqual(["anthropic", "openai"]);
  });

  it("never merges an agent bank with a mutant bank", () => {
    const c = bankCompletion({
      banks: [bankOf("a", ["m1", "m2", "m3"], "mutant")],
      trials: [],
    });
    expect(c.kind).toBe("mutant");
    expect(c.axisKind).toBe("mutant-detection");
  });
});

// ---------------------------------------------------------------- null-model direction

describe("combined width against chance", () => {
  const result = (combinedAxes: number, nullBaseline: number | null): CombinedResult => ({
    perFamilyAxes: { a: 1, b: 1 },
    combinedAxes,
    sumOfParts: 2,
    nullBaseline,
    ceiling: 100,
    instances: 100,
    measuredCells: 300,
  });

  // KNOWN-BAD: reading the null model backwards.
  //
  // This shipped for one edit. The null keeps each subject's failure COUNT and redraws WHICH
  // instances it fails, which destroys structure and pushes the width UP — so it is an upper bound,
  // and a real corpus far BELOW it is the good case. The first version flagged exactly that case as
  // "at the null ceiling" and would have discarded the repository's strongest evidence.
  it("treats a width far below the null as signal, not noise", () => {
    expect(indistinguishableFromChance(result(3, 6))).toBe(false);
  });

  it("treats a width at or above the null as uninformative", () => {
    expect(indistinguishableFromChance(result(6, 6))).toBe(true);
    expect(indistinguishableFromChance(result(7, 6))).toBe(true);
  });

  it("says nothing when no null model was run", () => {
    expect(indistinguishableFromChance(result(3, null))).toBe(false);
  });
});

// ---------------------------------------------------------------- chains

describe("nested catch sets", () => {
  const subj = (id: string, failed: readonly string[], lab = "anthropic") => ({
    subjectId: id,
    providerFamily: lab,
    failed: new Set(failed),
    graded: 10,
  });

  // KNOWN-BAD: reporting four subjects as four axes.
  //
  // The real shape of the UI family: five counted trials, four subjects, two labs, failing 33, 46,
  // 62 and 90 scenarios. Four different numbers reads as breadth. Every pair nests, so it is one
  // axis at four sensitivities, and no fifth subject can change that.
  it("detects a total order and reports ONE axis however many subjects there are", () => {
    const c = analyseChain("ui", [
      subj("s33", ["a"]),
      subj("s46", ["a", "b"]),
      subj("s62", ["a", "b", "c"], "anthropic"),
      subj("s90", ["a", "b", "c", "d"], "openai"),
    ]);
    expect(c.isChain).toBe(true);
    expect(c.agentAxes).toBe(1);
    expect(c.incomparable).toHaveLength(0);
    expect(c.order).toEqual(["s33", "s46", "s62", "s90"]);
    expect(c.reading).toMatch(/Adding subjects cannot change this/);
  });

  it("identical failure sets are still a chain", () => {
    const c = analyseChain("ui", [subj("a", ["x", "y"]), subj("b", ["x", "y"])]);
    expect(c.isChain).toBe(true);
    expect(c.pairs[0]?.relation).toBe("identical");
  });

  it("one incomparable pair is enough to break the chain", () => {
    const c = analyseChain("mp", [subj("a", ["x", "y"]), subj("b", ["y", "z"]), subj("c", ["x", "y", "z"])]);
    expect(c.isChain).toBe(false);
    expect(c.agentAxes).toBeGreaterThan(1);
    expect(c.incomparable.some((p) => p.relation === "overlapping")).toBe(true);
  });

  it("disjoint failure sets are incomparable", () => {
    const c = analyseChain("mp", [subj("a", ["x"]), subj("b", ["y"])]);
    expect(c.isChain).toBe(false);
    expect(c.pairs[0]?.relation).toBe("disjoint");
  });

  it("one failing subject is not evidence of breadth and not a chain", () => {
    const c = analyseChain("ui", [subj("a", ["x"]), subj("b", [])]);
    expect(c.isChain).toBe(false);
    expect(c.reading).toMatch(/not evidence of breadth/);
  });

  // KNOWN-BAD: a chained family reporting its subject count as its axis count.
  //
  // The whole reason this module exists. Four subjects, four failure counts, and a total order —
  // "four measurements" is the bank size wearing a measurement's name.
  it("refuses to let a chained family quote its subject count as breadth", () => {
    const chain = analyseChain("ui", [subj("a", ["x"]), subj("b", ["x", "y"]), subj("c", ["x", "y", "z"])]);
    expect(() => assertChainNotQuotedAsBreadth(chain, 3)).toThrow(/CHAIN_QUOTED_AS_BREADTH/);
    expect(() => assertChainNotQuotedAsBreadth(chain, 1)).not.toThrow();

    const wide = analyseChain("mp", [subj("a", ["x"]), subj("b", ["y"])]);
    expect(() => assertChainNotQuotedAsBreadth(wide, 2)).not.toThrow();
  });

  it("names knob regions that separate nobody", () => {
    const params = new Map([
      ["i0", { knob: "lo" }],
      ["i1", { knob: "lo" }],
      ["i2", { knob: "hi" }],
      ["i3", { knob: "hi" }],
    ]);
    const t = diversityTargets("f", [subj("a", ["i0", "i1"]), subj("b", ["i0", "i1"])], params);
    expect(t.saturated.some((r) => r.value === "lo")).toBe(true);
    expect(t.untouched.some((r) => r.value === "hi")).toBe(true);
  });
});

// ---------------------------------------------------------------- self-check classification

describe("self-check classification", () => {
  it("strips comments and string literals before matching", () => {
    const code = stripNonCode('// assert(x)\nconst s = "invariant";\nconst y = 1;');
    expect(code).not.toMatch(/assert/);
    expect(code).not.toMatch(/invariant/);
    expect(code).toMatch(/const y = 1/);
  });

  // KNOWN-BAD: crediting a self-check that exists only in prose.
  //
  // The first version of this analysis matched `assert|invariant|sanity` against raw source. A
  // submission whose comment says "never asserted: the recording's expectation is not evidence"
  // would have been credited with an assertion it does not have.
  it("a comment describing verification is not verification", () => {
    const p = profileRun({
      runId: "r",
      familyId: "f",
      subjectId: "m",
      providerFamily: "anthropic",
      state: "counted",
      scenariosFailed: 0,
      submissionFiles: [
        {
          name: "subject.mjs",
          source: "// I built a legality table and asserted every invariant.\nexport const subject = {};",
        },
      ],
      transcript: null,
    });
    expect(p.strongestObserved).toBeNull();
    expect(p.verdict).toBe("absent");
  });

  it("an executable assertion is observed", () => {
    const signals = scanSubmission("function f(x){ assert(x > 0); return x; }");
    expect(signals.some((s) => s.kind === "assertions" && s.source === "observed")).toBe(true);
  });

  it("a declared legality table is observed", () => {
    const signals = scanSubmission("const LEGAL = new Map([['a', ['b']]]);");
    expect(signals.some((s) => s.kind === "legality-table")).toBe(true);
  });

  // KNOWN-BAD: crediting domain logic as a self-check because of its name.
  //
  // `auditAlreadyCompleted` in a real submission matched an `audit[A-Z]` pattern and was reported as
  // a separate checker. It is the implementation deciding whether a trace already ran — the task
  // itself. These families are ABOUT auditing and validating, so their domain vocabulary and the
  // vocabulary of self-verification are the same words, and a name-shaped pattern cannot separate
  // them. Both patterns were removed from the source scanner for that reason.
  it("a function named like a checker is not a checker", () => {
    const signals = scanSubmission("function auditAlreadyCompleted(trace, app) { return false; }");
    expect(signals).toHaveLength(0);
  });

  it("finds a checker that is defined and never called", () => {
    expect(definedButUnused("function checkThing(x){ return x; }\nexport const s = 1;")).toEqual([
      "checkThing",
    ]);
    expect(definedButUnused("function checkThing(x){ return x; }\ncheckThing(1);")).toEqual([]);
  });

  // A transcript claim is evidence about what the model attempted, never that it happened. The two
  // are separate fields and are never added together.
  it("a transcript claim is self-reported and never promoted to observed", () => {
    const p = profileRun({
      runId: "r",
      familyId: "f",
      subjectId: "m",
      providerFamily: "openai",
      state: "counted",
      scenariosFailed: 5,
      submissionFiles: [{ name: "subject.mjs", source: "export const subject = {};" }],
      transcript: "I wrote 14 synthetic scenarios and a legality table, and all of them passed.",
    });
    expect(p.strongestObserved).toBeNull();
    expect(p.selfReported.every((s) => s.source === "self-reported")).toBe(true);
    expect(p.verdict).toBe("self-reported");
    expect(p.observed.some((s) => s.kind === "narrative-only")).toBe(true);
  });

  it("classifies node --check as syntax-only, not verification", () => {
    const s = scanTranscript("Verification run: `node --check submission/subject.mjs`");
    expect(s.some((x) => x.kind === "syntax-only")).toBe(true);
    expect(s.some((x) => x.kind === "fuzzing")).toBe(false);
  });

  // KNOWN-BAD: reading only `subject.mjs` and concluding nobody self-verifies.
  //
  // Two runs shipped their checker as a SECOND file — `_test.mjs` with a real transition table, and a
  // pair of `_test_*.mjs` harnesses. A scanner that reads the graded artifact alone reports them as
  // having none, which is how "not one of sixteen submissions built a self-check" became a headline
  // that was about the scanner rather than about the models.
  it("finds a checker shipped as a second file", () => {
    const p = profileRun({
      runId: "r",
      familyId: "f",
      subjectId: "m",
      providerFamily: "anthropic",
      state: "counted",
      scenariosFailed: 0,
      submissionFiles: [
        { name: "subject.mjs", source: "export const subject = {};" },
        { name: "_test.mjs", source: "const LEGAL = new Set(['a>b']);\nassert(LEGAL.has('a>b'));" },
      ],
      transcript: null,
    });
    expect(p.verdict).toBe("observed");
    expect(p.strongestObserved).not.toBeNull();
    expect(p.extraFiles).toEqual(["_test.mjs"]);
    expect(p.observed.some((sig) => sig.locus.startsWith("_test.mjs"))).toBe(true);
  });

  it("no artifact and no transcript is unobservable, not absent", () => {
    const p = profileRun({
      runId: "r",
      familyId: "f",
      subjectId: "m",
      providerFamily: "google",
      state: "infra",
      scenariosFailed: 0,
      submissionFiles: [],
      transcript: null,
    });
    expect(p.verdict).toBe("unobservable");
  });
});

// ---------------------------------------------------------------- submission quality

describe("submission quality metrics", () => {
  it("extracts quoted shell commands and ignores prose in backticks", () => {
    expect(commandsIn("ran `node --check subject.mjs` and read `R3` carefully")).toEqual([
      "node --check subject.mjs",
    ]);
  });

  it("reads unqualified correctness claims as assertive", () => {
    expect(statedConfidenceOf("The implementation is complete and verified.").confidence).toBe("assertive");
    expect(statedConfidenceOf("This should handle the async case.").confidence).toBe("hedged");
    expect(statedConfidenceOf("Wrote the file.").confidence).toBe("silent");
    expect(statedConfidenceOf(null).confidence).toBe("silent");
  });

  it("calls an assertive claim that failed overconfident, and only for counted runs", () => {
    expect(calibrationOf("assertive", true, 32)).toBe("overconfident");
    expect(calibrationOf("assertive", true, 0)).toBe("aligned");
    expect(calibrationOf("hedged", true, 32)).toBe("appropriately-hedged");
    // A superseded or refused run has no outcome to be calibrated against.
    expect(calibrationOf("assertive", false, 32)).toBe("n/a");
  });

  it("reports rule citation as n/a when a family publishes no rule codes", () => {
    const q = qualityOf({
      runId: "r",
      familyId: "ui-action-record-replay",
      subjectId: "m",
      providerFamily: "anthropic",
      state: "counted",
      submissionFiles: ["subject.mjs"],
      source: "const x = 1;",
      transcript: null,
      ruleCodes: [],
      scenariosGraded: 10,
      scenariosFailed: 1,
      checksFailed: ["c"],
      runtimeSeconds: 1,
      costUsd: null,
      selfCheck: null,
    });
    expect(q.ruleCodesCited).toBeNull();
    expect(q.ruleCodesPublished).toBe(0);
  });
});

// ---------------------------------------------------------------- migrations and stale evidence

describe("challenge migration", () => {
  const ledger = (familyId: string, superseded: readonly string[]): EvidenceLedger => ({
    familyId,
    currentHash: "new",
    entries: superseded.map((runId) => ({
      runId,
      familyId,
      model: "anthropic/x",
      state: "superseded" as const,
      ranAgainst: "old",
      currentHash: "new",
      reason: "test",
    })),
    counted: [],
    superseded,
  });

  // Every rule code this file is registered as covering must actually be exercised here. Named in a
  // comment so the membership assertion in foundry-validators.test.ts has something to find even for
  // the two codes thrown as plain Errors rather than through `fail()`:
  // MIGRATION_LOSSES_UNRECORDED is exercised by assertMigrationAccountsForLosses below.
  it("the recorded migration names both hashes and a real reason", () => {
    const m = MIGRATIONS[0];
    expect(m).toBeDefined();
    expect(m?.fromHash).not.toBe(m?.toHash);
    expect((m?.reason ?? "").length).toBeGreaterThan(200);
    expect(m?.invalidated.length).toBeGreaterThan(0);
  });

  // KNOWN-BAD: a hash that moved with nothing written down.
  //
  // Indistinguishable from a spec quietly reworded until the failures stopped. The hash invalidates
  // the evidence either way; only the record says whether the change was principled.
  it("refuses an undeclared migration", () => {
    expect(() => assertMigrationDeclared("some-family", "aaa", "bbb")).toThrow(/MIGRATION_UNDECLARED/);
  });

  it("accepts a declared one", () => {
    const m = MIGRATIONS[0];
    if (m === undefined) throw new Error("no migration on record");
    expect(() => assertMigrationDeclared(m.familyId, m.fromHash, m.toHash)).not.toThrow();
  });

  // KNOWN-BAD: a migration record whose "reason" is a shrug.
  //
  // `MIGRATION_UNREASONED`. The record exists, both hashes are named, and it says "fixed spec" — which
  // conveys exactly as much as no record at all. The point of the paperwork is that the next family
  // does not repeat the ambiguity, and a one-line reason teaches nothing.
  it("refuses a migration whose reason explains nothing", () => {
    const thin = [
      {
        familyId: "f",
        fromHash: "aaa",
        toHash: "bbb",
        reason: "fixed the spec",
        discoveredBy: null,
        invalidated: ["r1"],
        reissuedAs: null,
        date: "2026-01-01",
      },
    ];
    expect(() => assertMigrationDeclared("f", "aaa", "bbb", thin)).toThrow(/MIGRATION_UNREASONED/);
    const proper = [{ ...thin[0], reason: MIGRATIONS[0]?.reason ?? "" }] as typeof thin;
    expect(() => assertMigrationDeclared("f", "aaa", "bbb", proper)).not.toThrow();
  });

  it("a hash that has not moved needs no record", () => {
    expect(() => assertMigrationDeclared("anything", "same", "same")).not.toThrow();
  });

  // KNOWN-BAD: a superseded run presented as the strongest evidence on the page.
  //
  // This shipped. `mp-claude-2` cited 7 of 8 rule codes, failed 47 scenarios, and reappeared as a
  // report's headline "confident false positive" after the repair that invalidated it — because the
  // run's own record still says `counts: true`. `counts` is about grading and says nothing about
  // whether the task still exists.
  it("refuses a report that names a stale run with no label in its section", () => {
    const text = ["# Report", "", "## Strongest evidence", "", "- `old-run` failed 47 scenarios"].join("\n");
    expect(() => assertStaleRunsLabelled("r.md", text, [ledger("f", ["old-run"])])).toThrow(
      /REPORT_STALE_UNLABELLED/,
    );
  });

  it("accepts a stale run under a section that labels it", () => {
    const text = [
      "# Report",
      "",
      "## Superseded trials",
      "",
      "These ran against an earlier version of this challenge.",
      "",
      "- `old-run`",
    ].join("\n");
    expect(() => assertStaleRunsLabelled("r.md", text, [ledger("f", ["old-run"])])).not.toThrow();
  });

  // A label somewhere in the section does not rescue a row that says the opposite on its own line.
  it("refuses a table row that calls a stale run counted", () => {
    const text = [
      "# Report",
      "",
      "## Evidence",
      "",
      "Superseded runs are excluded from the counted set.",
      "",
      "| run | state |",
      "|---|---|",
      "| `old-run` | counted |",
    ].join("\n");
    expect(() => assertStaleRunsLabelled("r.md", text, [ledger("f", ["old-run"])])).toThrow(
      /describes it as counted/,
    );
  });

  it("refuses a migration record that does not name every trial it invalidated", () => {
    // An undercounted cost reads as a cheaper repair than it was, and the cost is the whole reason
    // the discipline exists: the recorded repair invalidated three counted trials.
    const m = MIGRATIONS[0];
    if (m === undefined) throw new Error("no migration on record");
    const withExtra: EvidenceLedger = {
      familyId: m.familyId,
      currentHash: m.toHash,
      entries: [],
      counted: [],
      superseded: [...m.invalidated, "mp-claude-unrecorded"],
    };
    expect(() => assertMigrationAccountsForLosses(m.familyId, withExtra, MIGRATIONS)).toThrow(
      /MIGRATION_LOSSES_UNRECORDED/,
    );
    const exact: EvidenceLedger = { ...withExtra, superseded: m.invalidated };
    expect(() => assertMigrationAccountsForLosses(m.familyId, exact)).not.toThrow();
  });

  it("says nothing when no run is superseded", () => {
    expect(() => assertStaleRunsLabelled("r.md", "`old-run` counted", [ledger("f", [])])).not.toThrow();
  });
});

// ---------------------------------------------------------------- realism labelling

describe("realism labelling", () => {
  // KNOWN-BAD: a simulated tree labelled dom-like.
  //
  // The UI family carried `dom-like` while being an immutable seven-node tree with one mutable
  // boolean, resolved by `data-testid` only. Nothing could drift and nothing an action did changed
  // what a later action saw. Generous self-description is exactly what the ladder exists to prevent.
  it("no family claims a rung it has not built", () => {
    for (const f of BUILT_FAMILIES) {
      expect(REALISM_LEVELS).toContain(f.realism);
      // Nothing here is browser-backed, and saying otherwise would be the single most misleading
      // claim this repository could make about the UI family.
      expect(f.realism).not.toBe("browser-backed");
    }
  });

  it("every family states what the next rung would buy", () => {
    for (const f of BUILT_FAMILIES) {
      expect(f.realismGap.length).toBeGreaterThan(80);
    }
  });

  it("the realism level is not part of the challenge package", () => {
    // Relabelling a harness must never change a hash. If it did, an honesty correction would
    // invalidate the evidence that motivated it, and nobody would ever make one.
    const pkg = builtFamily("ui-action-record-replay").challenge("export type X = 1;\n", "set-1");
    const text = pkg.files.map((f) => f.content).join("\n");
    for (const level of REALISM_LEVELS) expect(text).not.toContain(level);
  });
});
