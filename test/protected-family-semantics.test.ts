import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CaseRegistry,
  generateCheckerCase,
} from "../src/families/checker-required-memory-poisoning/cases.js";
import { buildScenario } from "../src/families/checker-required-memory-poisoning/scenarios.js";
import { BUILT_FAMILY_IDS, builtFamily } from "../src/families/registry.js";
import { protectedScenariosFor } from "../src/trials/router.js";

describe("complete deterministic semantic populations", () => {
  for (const familyId of BUILT_FAMILY_IDS)
    it(`${familyId}: full reference, mutant and independent alternative populations`, async () => {
      const family = builtFamily(familyId);
      const sweep = family.run();
      expect(sweep.referenceFailures).toEqual([]);
      for (const control of sweep.mutantsCaught)
        expect(control.caught, `${familyId}/${control.mutantId}/${control.check}`).toBe(true);
      const base = resolve(dirname(family.typesPath));
      const runner = await import(`${base}/runner.ts`);
      const { alternative } = await import(`${base}/alternative.ts`);
      const failures = [];
      for (const scenario of protectedScenariosFor(familyId)) {
        const cell = runner.runCell(scenario, alternative);
        if (cell.crashed || cell.failures.length)
          failures.push({ id: scenario.id, failures: cell.failures, error: cell.crashed });
      }
      expect(failures.slice(0, 10), `${failures.length} alternative failures`).toEqual([]);
    }, 120_000);
});

describe("case generator contract", () => {
  const original = buildScenario({
    seed: 11,
    attack: "none",
    sessionsBetween: 0,
    memoryKind: "summary",
    checkerProbe: "reference_accept",
    visibleCoverage: "visible_example",
  });
  it("changes actual sessions consistently, retains runnable identity and bounds", () => {
    const registry = new CaseRegistry(original);
    const sameParameters = new CaseRegistry(original).make({});
    expect(sameParameters.id).not.toBe(original.checkerCase.id);
    expect(sameParameters.sessions).toEqual(original.checkerCase.sessions);
    const made = registry.make({
      seed: 101,
      attack: "secret_recall",
      sessionsBetween: 3,
      memoryKind: "fact_store",
    });
    expect(made).not.toEqual(original.checkerCase);
    expect(made.sessions).not.toEqual(original.checkerCase.sessions);
    expect(
      registry.make({ seed: 101, attack: "secret_recall", sessionsBetween: 3, memoryKind: "fact_store" }),
    ).toEqual(made);
    expect(registry.run(made.id).checkerCase).toEqual(made);
    expect(generateCheckerCase(made.params).checkerCase).toEqual(made);
    expect(() => registry.run("not-generated")).toThrow("CASE_UNKNOWN");
    expect(() => registry.make({ seed: Number.NaN })).toThrow("CASE_PARAMS");
    expect(() => registry.make({ sessionsBetween: 2 } as never)).toThrow("CASE_PARAMS");
    for (let seed = 0; seed < 15; seed++) registry.make({ seed: 500 + seed });
    expect(() => registry.make({ seed: 900 })).toThrow("CASE_LIMIT");
    for (let i = 1; i < 64; i++) registry.run(made.id);
    expect(() => registry.run(made.id)).toThrow("CASE_LIMIT");
  });
});
