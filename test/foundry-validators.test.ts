// Mutation testing for the foundry's own checkers.
//
// Three assertions, in increasing order of how much they are worth:
//
// 1. Every known-bad fixture is rejected. Necessary, and the weakest of the three: a validator that
//    threw on everything would pass it.
// 2. Every fixture is rejected FOR ITS DECLARED CODE. This is what stops a fixture passing by
//    accident through some unrelated rule, which is how a rule quietly stops working while its test
//    stays green.
// 3. Every code in the rule table is exercised by something. A rule with no known-bad example is a
//    rule nobody has demonstrated works. This is the assertion that would have caught the failure
//    the source project measured in its own agents: two of three Opus engines shipped checkers that
//    could not express the rule they were checking, and their own fuzzers ran clean over the bug.
//
// Codes that cannot be expressed as a malformed JSON document -- coverage, scaffold and budget rules
// -- are exercised programmatically below and registered in PROGRAMMATIC so assertion 3 stays
// complete rather than quietly excusing them.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertBudgetInputs, assertPlanHonest } from "../src/foundry/budget-check.js";
import { planBudget } from "../src/foundry/budget.js";
import { assertCoverage, buildRegistry } from "../src/foundry/registry.js";
import { checkScaffold } from "../src/foundry/scaffold-check.js";
import { generateScaffold } from "../src/foundry/scaffold.js";
import { RULE_CODES, type RuleCode, SchemaError } from "../src/foundry/schema.js";
import {
  parseCandidate,
  parseMechanism,
  parseMechanisms,
  parseMutant,
  parseTaskShape,
} from "../src/foundry/validate.js";
import { MatrixError, parseMatrix } from "../src/matrix.js";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p: string): unknown => JSON.parse(readFileSync(`${ROOT}fixtures/invalid/${p}`, "utf8"));

interface FixtureEntry {
  readonly file: string;
  readonly kind: "mechanism" | "mutant" | "shape" | "candidate" | "matrix" | "registry";
  readonly code: string;
  readonly note: string;
}

const MANIFEST = read("manifest.json") as FixtureEntry[];

const PARSERS: Record<FixtureEntry["kind"], (v: unknown) => unknown> = {
  mechanism: (v) => parseMechanism(v, "fixture"),
  mutant: (v) => parseMutant(v, "fixture"),
  shape: (v) => parseTaskShape(v, "fixture"),
  candidate: (v) => parseCandidate(v, "fixture"),
  matrix: (v) => parseMatrix(v),
  // Cross-collection references are checked when the registry is assembled, not when a single row
  // is parsed. Routing this fixture differently is the point: a dangling id is invisible to the row
  // validator by design, and a corpus that hid that would be testing the wrong layer.
  registry: (v) => buildRegistry([parseMechanism(v, "fixture")], [], [], []),
};

/** Rules exercised by code below rather than by a JSON fixture. Keeps assertion 3 honest. */
const PROGRAMMATIC: readonly RuleCode[] = [
  "E_TYPE",
  "E_SHAPE",
  "E_DUPLICATE_ID",
  "COVERAGE_MECHANISM_WITHOUT_MUTANT",
  "COVERAGE_MUTANT_ORPHANED",
  "SCAFFOLD_MISSING_ARTIFACT",
  "SCAFFOLD_EMPTY_ARTIFACT",
  "SCAFFOLD_METADATA_MISMATCH",
  "BUDGET_NO_LABOUR_COST",
  "BUDGET_IMPLAUSIBLE_YIELD",
  "BUDGET_NEGATIVE_INPUT",
  "BUDGET_RETRY_RATE_OUT_OF_RANGE",
];

describe("known-bad fixtures", () => {
  it("the corpus is non-trivial", () => {
    expect(MANIFEST.length).toBeGreaterThanOrEqual(25);
  });

  for (const entry of MANIFEST) {
    it(`rejects ${entry.file} with ${entry.code}`, () => {
      let thrown: unknown;
      try {
        PARSERS[entry.kind](read(entry.file));
      } catch (err) {
        thrown = err;
      }
      expect(thrown, `${entry.file} was accepted; ${entry.note}`).toBeDefined();
      const code =
        thrown instanceof SchemaError
          ? thrown.code
          : thrown instanceof MatrixError
            ? thrown.code
            : `unexpected:${String(thrown)}`;
      // The load-bearing assertion: rejected for the DECLARED reason, not by luck.
      expect(code, `${entry.file} was rejected, but by the wrong rule`).toBe(entry.code);
    });
  }
});

describe("structural rules", () => {
  const base = read("mechanisms/no-measurable-signal.json") as Record<string, unknown>;

  it("E_TYPE — a field of the wrong type", () => {
    expect(() => parseMechanism({ ...base, name: 42 }, "f")).toThrowError(
      expect.objectContaining({ code: "E_TYPE" }),
    );
  });

  it("E_SHAPE — a document that is not an object", () => {
    expect(() => parseMechanism([1, 2, 3], "f")).toThrowError(expect.objectContaining({ code: "E_SHAPE" }));
  });

  it("E_DUPLICATE_ID — two entries with the same id", () => {
    const one = read("mechanisms/dangling-mutant-ref.json");
    expect(() => parseMechanisms([one, one], "f")).toThrowError(
      expect.objectContaining({ code: "E_DUPLICATE_ID" }),
    );
  });
});

describe("coverage rules", () => {
  const mech = {
    id: "lonely-mechanism",
    name: "Lonely",
    summary: "No mutant exercises it.",
    whyAgentsFail: "n/a",
    whatCorrectSystemsDo: "n/a",
    falsePositiveShape: "n/a",
    exampleDomains: [],
    suggestedMutants: ["some-mutant"],
    fairnessRisks: [],
    cheatRisks: [],
    measurableSignals: ["a signal"],
    maturity: "argued",
    evidence: null,
  };
  const mutant = {
    id: "some-mutant",
    name: "Some mutant",
    bug: "n/a",
    mechanisms: ["other-mechanism"],
    caughtBy: ["a check"],
    falseConfidence: "n/a",
    sketch: "n/a",
  };

  it("COVERAGE_MECHANISM_WITHOUT_MUTANT — a mechanism nothing can detect", () => {
    const other = { ...mech, id: "other-mechanism", suggestedMutants: ["some-mutant"] };
    const registry = buildRegistry(
      [parseMechanism(mech, "m0"), parseMechanism(other, "m1")],
      [parseMutant(mutant, "x0")],
      [],
      [],
    );
    // `lonely-mechanism` is named by no mutant, so nothing in the bank exercises it.
    expect(() => assertCoverage(registry)).toThrowError(
      expect.objectContaining({ code: "COVERAGE_MECHANISM_WITHOUT_MUTANT" }),
    );
  });

  it("COVERAGE_MUTANT_ORPHANED — a mutant no mechanism suggests and no family expects", () => {
    const m = parseMechanism({ ...mech, id: "other-mechanism", suggestedMutants: ["some-mutant"] }, "m");
    const used = parseMutant(mutant, "x0");
    const orphan = parseMutant({ ...mutant, id: "orphan-mutant" }, "x1");
    expect(() => assertCoverage(buildRegistry([m], [used, orphan], [], []))).toThrowError(
      expect.objectContaining({ code: "COVERAGE_MUTANT_ORPHANED" }),
    );
  });

  it("E_DANGLING_REF fires across collections, not just within a document", () => {
    const m = parseMechanism({ ...mech, suggestedMutants: ["nope"] }, "m");
    expect(() => buildRegistry([m], [], [], [])).toThrowError(
      expect.objectContaining({ code: "E_DANGLING_REF" }),
    );
  });
});

describe("scaffold rules", () => {
  const registry = buildRegistry(
    [
      parseMechanism(
        {
          id: "m-one",
          name: "M",
          summary: "s",
          whyAgentsFail: "w",
          whatCorrectSystemsDo: "c",
          falsePositiveShape: "f",
          exampleDomains: [],
          suggestedMutants: ["x-one"],
          fairnessRisks: ["r"],
          cheatRisks: ["c"],
          measurableSignals: ["s"],
          maturity: "argued",
          evidence: null,
        },
        "m",
      ),
    ],
    [
      parseMutant(
        {
          id: "x-one",
          name: "X",
          bug: "b",
          mechanisms: ["m-one"],
          caughtBy: ["a"],
          falseConfidence: "f",
          sketch: "s",
        },
        "x",
      ),
    ],
    [],
    [],
  );
  const good = generateScaffold(
    { familyId: "demo", name: "Demo", domain: "payments", mechanismIds: ["m-one"] },
    registry,
  );

  it("the generator's own output passes the independent checker", () => {
    expect(() => checkScaffold(good.files, "demo")).not.toThrow();
  });

  it("SCAFFOLD_MISSING_ARTIFACT — a gate was skipped", () => {
    const missing = good.files.filter((f) => f.path !== "mutant-plan.md");
    expect(() => checkScaffold(missing, "demo")).toThrowError(
      expect.objectContaining({ code: "SCAFFOLD_MISSING_ARTIFACT" }),
    );
  });

  it("SCAFFOLD_EMPTY_ARTIFACT — a file that looks finished and says nothing", () => {
    const hollow = good.files.map((f) =>
      f.path === "fairness-checklist.md" ? { path: f.path, content: "# Fairness\n" } : f,
    );
    expect(() => checkScaffold(hollow, "demo")).toThrowError(
      expect.objectContaining({ code: "SCAFFOLD_EMPTY_ARTIFACT" }),
    );
  });

  it("SCAFFOLD_METADATA_MISMATCH — the manifest disagrees with the folder", () => {
    expect(() => checkScaffold(good.files, "a-different-family")).toThrowError(
      expect.objectContaining({ code: "SCAFFOLD_METADATA_MISMATCH" }),
    );
  });
});

describe("budget rules", () => {
  const sane = {
    totalUsd: 100_000,
    labourRateUsdPerHour: 120,
    hoursPerFamily: 45,
    hoursPerScreenedCandidate: 3,
    cycleHitRate: 0.1,
    matricesPerFamily: 3,
    usdPerMatrix: 48.66,
    retryRate: 0.15,
    instancesPerFamily: 24,
    axesPerFamily: 3,
  };

  it("a sane plan passes both checkers", () => {
    expect(() => assertBudgetInputs(sane)).not.toThrow();
    expect(() => assertPlanHonest(planBudget(sane))).not.toThrow();
  });

  it("BUDGET_NEGATIVE_INPUT — a non-positive input", () => {
    expect(() => assertBudgetInputs({ ...sane, hoursPerFamily: 0 })).toThrowError(
      expect.objectContaining({ code: "BUDGET_NEGATIVE_INPUT" }),
    );
  });

  it("BUDGET_RETRY_RATE_OUT_OF_RANGE — a rate outside [0,1]", () => {
    expect(() => assertBudgetInputs({ ...sane, retryRate: 3 })).toThrowError(
      expect.objectContaining({ code: "BUDGET_RETRY_RATE_OUT_OF_RANGE" }),
    );
  });

  it("BUDGET_NO_LABOUR_COST — the fake 1,000-tasks-for-$100k plan", () => {
    // The shape this rule exists to catch: price the trials, omit the engineering, divide.
    const fake = { ...sane, hoursPerFamily: 0.1, hoursPerScreenedCandidate: 0.01 };
    const plan = planBudget(fake);
    // It "works" arithmetically, and spectacularly: omitting the engineering multiplies the yield.
    expect(plan.shippedTasks).toBeGreaterThan(planBudget(sane).shippedTasks * 10);
    expect(() => assertPlanHonest(plan)).toThrowError(
      expect.objectContaining({ code: "BUDGET_NO_LABOUR_COST" }),
    );
  });

  it("BUDGET_IMPLAUSIBLE_YIELD — a plan that does not fit its own budget", () => {
    // Labour priced at a token rate so the share check passes, but the implied engineer-years
    // exceed what the money buys at that rate.
    const plan = planBudget(sane);
    const inflated = { ...plan, impliedEngineerYears: plan.impliedEngineerYears * 100 };
    expect(() => assertPlanHonest(inflated)).toThrowError(
      expect.objectContaining({ code: "BUDGET_IMPLAUSIBLE_YIELD" }),
    );
  });
});

describe("rule coverage — the mutation test on the checkers themselves", () => {
  it("every rule code has at least one known-bad case", () => {
    const fromFixtures = new Set(MANIFEST.map((m) => m.code));
    const covered = new Set<string>([...fromFixtures, ...PROGRAMMATIC]);
    const uncovered = RULE_CODES.filter((c) => !covered.has(c));
    expect(
      uncovered,
      `these rules have no known-bad example, so nobody has shown they work: ${uncovered.join(", ")}`,
    ).toEqual([]);
  });

  it("no fixture declares a code outside the rule table or the matrix loader's codes", () => {
    const matrixCodes = new Set([
      "E_TYPE",
      "E_SHAPE",
      "E_SCHEMA",
      "E_DUP",
      "E_MISSING_ROW",
      "E_MISSING_CELL",
      "E_UNKNOWN_SUBJECT",
      "E_UNKNOWN_INSTANCE",
      "E_NO_CAVEAT",
      "E_REFERENCE_IN_SUBJECTS",
    ]);
    const known = new Set<string>([...RULE_CODES, ...matrixCodes]);
    const stray = MANIFEST.filter((m) => !known.has(m.code)).map((m) => `${m.file}:${m.code}`);
    expect(stray).toEqual([]);
  });
});
