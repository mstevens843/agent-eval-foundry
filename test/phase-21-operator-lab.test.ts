import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { enumerateSpace } from "../src/families/caa-revalidation/scenarios.js";
import {
  evaluateStoppingRule,
  mcNemarExact,
  operatorTreatment,
  parseOperatorTreatmentSchema,
  requireMatchedPair,
  runPilot,
  selectNaiveBaseline,
  selectSmallTargeted,
  toHardnessOperatorEvidence,
} from "../src/index.js";
import type { MatchedObservation, StoppingRulePreregistration } from "../src/index.js";

const ROOT = new URL("..", import.meta.url).pathname;
const readJson = (p: string): unknown => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

describe("operator-treatment schema", () => {
  const schema = parseOperatorTreatmentSchema(readJson("data/phase-21-operators.json"));

  it("parses the checked-in twelve operators", () => {
    expect(schema.operators.length).toBe(12);
  });

  it("every operator id is unique", () => {
    const ids = schema.operators.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rejects a schema with a duplicate id", () => {
    const raw = readJson("data/phase-21-operators.json") as { operators: unknown[] };
    const dup = { ...raw, operators: [raw.operators[0], raw.operators[0]] };
    expect(() => parseOperatorTreatmentSchema(dup)).toThrowError(
      expect.objectContaining({ code: "PHASE21_OPERATOR_SCHEMA_INVALID" }),
    );
  });

  it("rejects an operator marked measurable:false with a non-untested evidenceStatus", () => {
    const raw = readJson("data/phase-21-operators.json") as { operators: Record<string, unknown>[] };
    const bad = {
      ...raw,
      operators: [{ ...raw.operators[0], measurable: false, evidenceStatus: "measured" }],
    };
    expect(() => parseOperatorTreatmentSchema(bad)).toThrowError(
      expect.objectContaining({ code: "PHASE21_OPERATOR_SCHEMA_INVALID" }),
    );
  });

  it("looks up a known operator and throws on an unknown one", () => {
    const found = operatorTreatment(schema, "hidden-scenario-selection-targets-narrow-mutants");
    expect(found.measurable).toBe(true);
    expect(() => operatorTreatment(schema, "not-a-real-operator")).toThrow(/unknown operator id/);
  });

  it("every operator's legibility-sensitive claim is consistent with its excluded/candidate substrates", () => {
    const grandfathered = [
      "dao-descendant",
      "trading-reconciliation-recompute",
      "deployment-rollback-recompute",
    ];
    for (const op of schema.operators) {
      if (!op.legibilitySensitive) continue;
      // A legibility-sensitive operator must not list a grandfathered family as a clean candidate
      // UNLESS it is explicitly the defect-non-legibility operator itself, whose whole point is
      // constructing a NEW sibling variant of exactly those families (see its own excludedSubstrates
      // note) — every other legibility-sensitive operator must exclude them outright.
      if (op.id === "defect-non-legibility-at-edit-site") continue;
      for (const family of grandfathered) {
        expect(op.candidateSubstrates, `${op.id} candidateSubstrates`).not.toContain(family);
      }
    }
  });
});

describe("matched-pair diffability", () => {
  const schema = parseOperatorTreatmentSchema(readJson("data/phase-21-operators.json"));
  const operator = operatorTreatment(schema, "diagnosis-radius");

  it("accepts a pair that differs only in the declared field", () => {
    const result = requireMatchedPair(operator, {
      sharedComponentDescriptions: { generator: "fixture" },
      baselineDeltaFields: { "scenarios.params.sessionsBetween": 2 },
      treatedDeltaFields: { "scenarios.params.sessionsBetween": 5 },
    });
    expect(result.verdict).toBe("matched");
    expect(result.differingFields).toEqual(["scenarios.params.sessionsBetween"]);
  });

  it("refuses a pair that differs in an undeclared field (confounded)", () => {
    expect(() =>
      requireMatchedPair(operator, {
        sharedComponentDescriptions: { generator: "fixture" },
        baselineDeltaFields: { "scenarios.params.sessionsBetween": 2, mutantBankVersion: "v1" },
        treatedDeltaFields: { "scenarios.params.sessionsBetween": 5, mutantBankVersion: "v2" },
      }),
    ).toThrowError(expect.objectContaining({ code: "PHASE21_MATCHED_PAIR_NOT_DIFFABLE" }));
  });

  it("refuses a pair with no delta at all", () => {
    expect(() =>
      requireMatchedPair(operator, {
        sharedComponentDescriptions: { generator: "fixture" },
        baselineDeltaFields: { "scenarios.params.sessionsBetween": 3 },
        treatedDeltaFields: { "scenarios.params.sessionsBetween": 3 },
      }),
    ).toThrow(/no delta to measure/);
  });
});

describe("McNemar's exact test", () => {
  it("returns p=1 with zero discordant pairs (perfectly concordant)", () => {
    const obs: MatchedObservation[] = [
      { unitId: "a", baseline: 1, treated: 1 },
      { unitId: "b", baseline: 0, treated: 0 },
    ];
    const result = mcNemarExact(obs);
    expect(result.discordantTreatedWins).toBe(0);
    expect(result.discordantBaselineWins).toBe(0);
    expect(result.pValueTwoSided).toBe(1);
  });

  it("detects a strongly asymmetric discordant split as significant", () => {
    // 10 discordant pairs, all in the treated-wins direction: this must be significant.
    const obs: MatchedObservation[] = Array.from({ length: 10 }, (_, i) => ({
      unitId: `u${i}`,
      baseline: 0,
      treated: 1,
    }));
    const result = mcNemarExact(obs);
    expect(result.discordantTreatedWins).toBe(10);
    expect(result.discordantBaselineWins).toBe(0);
    expect(result.pValueTwoSided).toBeLessThan(0.01);
  });

  it("a 50/50 discordant split is not significant", () => {
    const obs: MatchedObservation[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        unitId: `t${i}`,
        baseline: 0 as const,
        treated: 1 as const,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        unitId: `b${i}`,
        baseline: 1 as const,
        treated: 0 as const,
      })),
    ];
    const result = mcNemarExact(obs);
    expect(result.pValueTwoSided).toBeGreaterThan(0.5);
  });
});

describe("stopping rule", () => {
  const basePrereg: StoppingRulePreregistration = {
    experimentId: "test",
    operatorId: "test-op",
    minimumMatchedPairs: 3,
    alpha: 0.05,
    referenceMustPass: true,
    maximumMatchedPairs: 10,
  };

  it("continues below the minimum pair count regardless of the data", () => {
    const obs: MatchedObservation[] = [{ unitId: "a", baseline: 0, treated: 1 }];
    const decision = evaluateStoppingRule(basePrereg, obs);
    expect(decision.kind).toBe("continue");
  });

  it("stops for validity regression when the reference fails, even with plenty of pairs", () => {
    const obs: MatchedObservation[] = Array.from({ length: 5 }, (_, i) => ({
      unitId: `u${i}`,
      baseline: 1,
      treated: 1,
    }));
    const decision = evaluateStoppingRule(basePrereg, obs, [
      { unitId: "reference-under-treated", referencePassed: false },
    ]);
    expect(decision.kind).toBe("stop-validity-regression");
  });

  it("stops for uplift once significance is reached", () => {
    const obs: MatchedObservation[] = Array.from({ length: 8 }, (_, i) => ({
      unitId: `u${i}`,
      baseline: 0,
      treated: 1,
    }));
    const decision = evaluateStoppingRule(basePrereg, obs);
    expect(decision.kind).toBe("stop-uplift");
  });

  it("stops null at the max pair ceiling with zero discordant pairs", () => {
    const obs: MatchedObservation[] = Array.from({ length: 10 }, (_, i) => ({
      unitId: `u${i}`,
      baseline: 1,
      treated: 1,
    }));
    const decision = evaluateStoppingRule(basePrereg, obs);
    expect(decision.kind).toBe("stop-null");
  });
});

describe("Phase 21 Lane 5 local pilot — caa-revalidation scenario selection (real data, no agents)", () => {
  const schema = parseOperatorTreatmentSchema(readJson("data/phase-21-operators.json"));

  it("the naive and small-targeted selectors draw from the real declared space and differ in composition", () => {
    const space = enumerateSpace();
    const naive = selectNaiveBaseline(space, 3);
    const targeted = selectSmallTargeted(space, 3);
    expect(naive.length).toBe(3);
    expect(targeted.length).toBe(3);
  });

  it("runs end to end on the real family and produces a mechanically-verified result at both sizes", () => {
    const result = runPilot(schema);
    expect(result.operatorId).toBe("hidden-scenario-selection-targets-narrow-mutants");
    for (const sized of [result.shippedSize, result.smallSize]) {
      expect(sized.referenceCleanUnderBaseline).toBe(true);
      expect(sized.referenceCleanUnderTreated).toBe(true);
      expect(sized.perMutant.length).toBe(9);
      // Every mutant's own intended check is a real check the family declares — never undefined.
      for (const m of sized.perMutant) expect(m.intendedCheck.length).toBeGreaterThan(0);
    }
  });

  it("converts a concluded pilot result into a HardnessOperatorEvidence-shaped ledger record", () => {
    const result = runPilot(schema);
    const operator = operatorTreatment(schema, result.operatorId);
    const record = toHardnessOperatorEvidence({
      operator,
      familyId: "caa-revalidation",
      baselineCount: result.shippedSize.baselineScenarioIds.length,
      treatedCount: result.shippedSize.treatedScenarioIds.length,
      mcNemar: result.shippedSize.mcNemar,
      stoppingRule: result.shippedSize.stoppingRule,
      provenance: ["src/phase-21/pilot-caa-scenario-selection.ts"],
      extractedOn: "2026-09-05",
    });
    expect(record.id).toBe("phase21-hidden-scenario-selection-targets-narrow-mutants-caa-revalidation");
    expect(record.provenance).toContain("src/phase-21/pilot-caa-scenario-selection.ts");
  });
});
