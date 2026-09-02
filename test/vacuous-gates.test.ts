// Tests for three gates that were measuring the wrong thing, or nothing at all.
//
// Each case below is written the way the repository's other honesty tests are: state the flattering
// number that shipped, then assert against it. All three failed on the code that was here before —
// `sharedSubjectCount` capped at 2 against a threshold of 3, `mechanismsExercised` was character for
// character the `referencePasses` expression, and five gates enforced by the loader were advertised
// as part of the ship gate's own blocking work.

import { describe, expect, it } from "vitest";
import { runFamily } from "../src/families/prompt-injection-containment/runner.js";
import { loadRegistry } from "../src/foundry/load.js";
import { PIC_FAMILY, sharedSubjectCount, sharedSubjectsFor } from "../src/reports/evidence.js";
import { renderGateReport } from "../src/reports/gate-report.js";
import { type FamilyEvidence, GATES, assessFamily } from "../src/reports/ship-report.js";
import {
  computeEvidence,
  mechanismCoverage,
  mechanismCoverageDetail,
  mechanismsExercisedFrom,
} from "../src/reports/trial-report.js";
import { MIN_SHARED_SUBJECTS } from "../src/trials/bank.js";
import { runLocalTrials } from "../src/trials/orchestrate.js";
import type { Matrix } from "../src/types.js";

const ROOT = process.cwd();
const UI_FAMILY = "ui-action-record-replay";

// ---------------------------------------------------------------- R5: shared subjects

describe("the shared-subject metric measures cross-family overlap", () => {
  // KNOWN-BAD: a gate that could not pass.
  //
  // `sharedSubjectCount` intersected a family's subject ids with the imported outbox history and
  // nothing else. That history has exactly two counted subjects, so the metric was capped at 2 by
  // construction — against a threshold of 3. `shared-bank-ready` could not pass for any family, ever,
  // whatever anybody ran. A gate that cannot pass says nothing about the family it is judging.
  it("counts subjects shared with ANY measured family, not just the outbox", () => {
    const shared = sharedSubjectsFor(ROOT, UI_FAMILY);
    // The old metric could only ever see these two, because they are the outbox's whole bank.
    const outboxBank = ["claude-opus-5", "gpt-5.6-sol"];
    const beyondTheOutbox = shared.filter((s) => !outboxBank.includes(s));
    expect(beyondTheOutbox.length).toBeGreaterThan(0);
    expect(shared.length).toBeGreaterThan(outboxBank.length);
  });

  it("the threshold is now reachable, so the gate is a question rather than a wall", () => {
    const count = sharedSubjectCount(ROOT, UI_FAMILY);
    expect(count).toBeGreaterThanOrEqual(MIN_SHARED_SUBJECTS);

    const registry = loadRegistry(ROOT);
    const shape = registry.shapes.find((s) => s.familyId === UI_FAMILY);
    expect(shape).toBeDefined();
    const evidence: FamilyEvidence = {
      familyId: UI_FAMILY,
      referencePasses: true,
      baselinesBlocked: [],
      baselinesTotal: 0,
      mutantsCaught: [],
      mechanismsExercised: true,
      isolation: "subprocess",
      countedAgentTrials: 1,
      agentTrialsPassed: 0,
      sharedBankSubjects: count,
      reportsDeterministic: true,
    };
    const gate = assessFamily(shape as NonNullable<typeof shape>, registry, evidence).results.find(
      (r) => r.gate.id === "shared-bank-ready",
    );
    expect(gate?.verdict).toBe("pass");
  });

  // A family nobody has attempted shares nothing. The repair must not manufacture overlap.
  it("a family with no counted trials still reports zero", () => {
    expect(sharedSubjectCount(ROOT, "delegated-wallet-scope-reconciliation")).toBe(0);
  });
});

// ---------------------------------------------------------------- R11a: mechanisms-exercised

const coverageMatrix = (
  instances: readonly string[],
  subjects: readonly string[],
  cells: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>,
): Matrix => ({
  schema: "agent-eval-foundry/matrix@1",
  suite: "coverage-fixture",
  provenance: {
    repo: null,
    artifact_commit: null,
    task_sha256: null,
    suite_shape: "fixture",
    checks_total: instances.length,
    checks_declared: null,
    extracted_from: [],
    caveat: "fixture",
  },
  reference_subject: null,
  subjects: subjects.map((id) => ({
    id,
    label: id,
    family: "mutant",
    model: null,
    effort: null,
    note: null,
  })),
  instances: instances.map((id) => ({
    id,
    schedule: id,
    seed: null,
    keys: null,
    family: "fixture",
    source: "fixture",
    note: null,
  })),
  results: Object.fromEntries(
    instances.map((i) => [
      i,
      Object.fromEntries(subjects.map((s) => [s, { failed: [...(cells[i]?.[s] ?? [])] }])),
    ]),
  ),
});

describe("mechanisms-exercised is computed independently of reference-passes", () => {
  const intended = [
    { mutantId: "m1", check: "rule_a" },
    { mutantId: "m2", check: "rule_b" },
  ];

  // KNOWN-BAD: two blocking gates, one expression.
  //
  // `mechanismsExercised: sweep.referenceFailures.length === 0` is `referencePasses` spelled again.
  // The gate advertised an independent question — does every scenario reach the mechanism it claims?
  // — and could not answer it, because it was not looking at the scenarios. This fixture has a
  // perfectly clean reference and a scenario that blocks on a check no mutant was written for, which
  // the old predicate cannot distinguish from a healthy family.
  it("fails on a scenario that blocks on a check no mutant was written for", () => {
    const matrix = coverageMatrix(["s1", "s2"], ["m1", "m2"], {
      s1: { m1: ["rule_a"], m2: [] },
      // s2 catches both mutants, but on an earlier rule than either was written for: it looks
      // like a working scenario in a pass-rate table and exercises neither mechanism.
      s2: { m1: ["preflight"], m2: ["preflight"] },
    });
    const coverage = mechanismCoverage(matrix, intended);
    expect(coverage.exercised).toBe(1);
    expect(coverage.misattributed).toEqual(["s2"]);
    expect(coverage.blind).toEqual([]);
    expect(mechanismsExercisedFrom(coverage)).toBe(false);
    expect(mechanismCoverageDetail(coverage)).toMatch(/1 block on a check no mutant was written for/);
  });

  it("a scenario nothing fails is reported blind, not failed", () => {
    const matrix = coverageMatrix(["s1", "s2"], ["m1"], { s1: { m1: ["rule_a"] }, s2: { m1: [] } });
    const coverage = mechanismCoverage(matrix, intended);
    expect(coverage.blind).toEqual(["s2"]);
    expect(coverage.misattributed).toEqual([]);
    expect(mechanismsExercisedFrom(coverage)).toBe(true);
  });

  // Without this clause the gate would pass by having nothing to mis-attribute, which is how a gate
  // stops failing without anything about the family improving.
  it("a bank with nothing in it does not pass by default", () => {
    const matrix = coverageMatrix(["s1"], ["m1"], { s1: { m1: [] } });
    expect(mechanismsExercisedFrom(mechanismCoverage(matrix, []))).toBe(false);
  });
});

describe("the containment family's evidence carries a per-scenario coverage count", () => {
  const evidence = computeEvidence(runFamily(), runLocalTrials());

  // The number the old predicate could not produce. `referenceFailures.length === 0` knows nothing
  // about individual scenarios, so a per-scenario count is proof the gate is reading the sweep
  // rather than restating `reference-passes`.
  it("names the four control scenarios nothing in the bank fails", () => {
    expect(evidence.mechanismScenarios).toBe(128);
    expect(evidence.mechanismScenariosExercised).toBe(124);
    expect(evidence.mechanismScenariosBlind).toBe(4);
    expect(evidence.mechanismScenariosMisattributed).toBe(0);
    // Still true, and now true for a reason that has been checked rather than assumed.
    expect(evidence.referencePasses).toBe(true);
    expect(evidence.mechanismsExercised).toBe(true);
  });
});

// ---------------------------------------------------------------- R11b/c: the gate report

describe("the gate report tells the truth about which gates fire", () => {
  const registry = loadRegistry(ROOT);

  // KNOWN-BAD: `neverFired` required `na.length === 0`, so a gate that rejects nobody but reads
  // `n/a` for even one family was left out of the section whose whole job is naming gates that have
  // never rejected anything. Every evidence-backed gate is in that shape, `mechanisms-exercised`
  // included, so the largest group of zero-fail gates was the one the section could not see.
  it("names a zero-fail gate even when some families read n/a", () => {
    const out = renderGateReport({ registry, evidence: {} });
    expect(out).toMatch(/reject nothing here/);
    expect(out).toMatch(/`mechanisms-exercised`/);
    expect(out).toMatch(/BLOCKING gates that have never failed/);
  });

  it("advertises the schema-enforced gates separately from the blocking ones", () => {
    const schemaEnforced = GATES.filter((g) => g.schemaEnforced === true).map((g) => g.id);
    expect(schemaEnforced).toEqual([
      "solvable",
      "trust-boundary",
      "fairness",
      "cheat-resistance",
      "hidden-region-declared",
    ]);

    const blocking = GATES.filter((g) => g.blocking && g.schemaEnforced !== true);
    // Was advertised as 14. Five of those are refused by `parseTaskShape` before a shape can reach
    // the gate table at all, so they were never this table's work.
    expect(blocking).toHaveLength(GATES.filter((g) => g.blocking).length - 5);

    const out = renderGateReport({ registry, evidence: {} });
    expect(out).toMatch(new RegExp(`\\*\\*${blocking.length} blocking\\*\\*`));
    expect(out).toMatch(/## Schema-enforced/);
    expect(out).toMatch(/The blocking count was advertised as 14/);
  });

  // Moved buckets, not deleted: a schema-enforced gate still fails closed if a shape somehow reaches
  // the assessment without going through the loader.
  it("schema-enforced gates still block when they fail", () => {
    const shape = registry.shapes[0];
    expect(shape).toBeDefined();
    const forged = { ...(shape as NonNullable<typeof shape>), fairnessConstraints: [] };
    const a = assessFamily(forged, registry);
    expect(a.blockingFailures).toContain("fairness");
  });
});
