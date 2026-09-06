// Phase 23 — Operator Classification And The First Trusted Agent-Facing Causal Experiment.
//
// Covers: the diagnosis-radius matched-pair construction (arm scenario selection, validity gates,
// package freezing, mechanical matched-pair confirmation), and the route-parity bonus check
// (Docker-gated — skipped, not falsely passed, when unavailable, matching the convention in
// test/phase-20-secure-executor.test.ts and test/phase-22-transfer.test.ts).

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { enumerateSpace } from "../src/families/memory-poisoning/scenarios.js";
import { requireMatchedPair } from "../src/phase-21/matched-pair.js";
import { operatorTreatment, parseOperatorTreatmentSchema } from "../src/phase-21/operator-schema.js";
import type { OperatorTreatment } from "../src/phase-21/operator-schema.js";
import {
  BASELINE_ARM,
  BASELINE_SESSIONS_BETWEEN,
  TREATED_ARM,
  TREATED_SESSIONS_BETWEEN,
  freezeArmPackage,
  runValidityGates,
  selectFixedSessionsBetween,
} from "../src/phase-23/diagnosis-radius.js";
import { checkRouteParity } from "../src/phase-23/route-parity.js";

const ROOT = new URL("..", import.meta.url).pathname;
const readJson = (p: string): unknown => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

let operator: OperatorTreatment;
beforeAll(() => {
  const schema = parseOperatorTreatmentSchema(readJson("data/phase-21-operators.json"));
  operator = operatorTreatment(schema, "diagnosis-radius");
});

describe("diagnosis-radius — scenario selection", () => {
  it("selects only the requested sessionsBetween value and covers every other declared knob", () => {
    const space = enumerateSpace();
    const baseline = selectFixedSessionsBetween(space, BASELINE_SESSIONS_BETWEEN, 1 / 3);
    expect(baseline.every((p) => p.sessionsBetween === BASELINE_SESSIONS_BETWEEN)).toBe(true);
    expect(baseline.length).toBeGreaterThan(0);
  });

  it("refuses (via assertKnobCoverage's fail) an under-sampled fraction that drops a declared knob value", () => {
    const space = enumerateSpace();
    expect(() => selectFixedSessionsBetween(space, BASELINE_SESSIONS_BETWEEN, 0.01)).toThrowError(
      expect.objectContaining({ code: "SAMPLE_KNOB_FROZEN" }),
    );
  });

  it("BASELINE_ARM and TREATED_ARM are fixed at the declared constants", () => {
    expect(BASELINE_ARM.sessionsBetween).toBe(BASELINE_SESSIONS_BETWEEN);
    expect(TREATED_ARM.sessionsBetween).toBe(TREATED_SESSIONS_BETWEEN);
    expect(BASELINE_ARM.scenarios.length).toBeGreaterThan(0);
    expect(TREATED_ARM.scenarios.length).toBeGreaterThan(0);
  });
});

describe("diagnosis-radius — validity gates (validity checks, not hardness evidence)", () => {
  it("reference is clean on both arms", () => {
    const baseline = runValidityGates(BASELINE_ARM);
    const treated = runValidityGates(TREATED_ARM);
    expect(baseline.referenceClean).toBe(true);
    expect(treated.referenceClean).toBe(true);
  });

  it("every mutant is caught by at least one arm, jointly", () => {
    const baseline = runValidityGates(BASELINE_ARM);
    const treated = runValidityGates(TREATED_ARM);
    const caughtByEither = new Map<string, boolean>();
    for (const m of baseline.mutantsCaught) caughtByEither.set(m.mutantId, m.caught);
    for (const m of treated.mutantsCaught) {
      caughtByEither.set(m.mutantId, (caughtByEither.get(m.mutantId) ?? false) || m.caught);
    }
    expect(caughtByEither.size).toBeGreaterThan(0);
    for (const [, caught] of caughtByEither) expect(caught).toBe(true);
  });

  it("same-session-resolver is specifically NOT caught at sessionsBetween=0 (expected, documented family behavior)", () => {
    const baseline = runValidityGates(BASELINE_ARM);
    const row = baseline.mutantsCaught.find((m) => m.mutantId === "same-session-resolver");
    expect(row?.caught).toBe(false);
    const treated = runValidityGates(TREATED_ARM);
    const treatedRow = treated.mutantsCaught.find((m) => m.mutantId === "same-session-resolver");
    expect(treatedRow?.caught).toBe(true);
  });
});

describe("diagnosis-radius — matched-pair and package freezing", () => {
  it("mechanically confirms the pair differs only in scenarios.params.sessionsBetween", () => {
    const result = requireMatchedPair(operator, {
      sharedComponentDescriptions: { scenarios: "unmodified", verify: "unmodified" },
      baselineDeltaFields: { "scenarios.params.sessionsBetween": BASELINE_ARM.sessionsBetween },
      treatedDeltaFields: { "scenarios.params.sessionsBetween": TREATED_ARM.sessionsBetween },
    });
    expect(result.verdict).toBe("matched");
    expect(result.differingFields).toEqual(["scenarios.params.sessionsBetween"]);
  });

  it("refuses a pair with an undeclared confounding field", () => {
    expect(() =>
      requireMatchedPair(operator, {
        sharedComponentDescriptions: { scenarios: "unmodified" },
        baselineDeltaFields: { "scenarios.params.sessionsBetween": 0, memoryKind: "summary" },
        treatedDeltaFields: { "scenarios.params.sessionsBetween": 3, memoryKind: "vector_note" },
      }),
    ).toThrowError(expect.objectContaining({ code: "PHASE21_MATCHED_PAIR_NOT_DIFFABLE" }));
  });

  it("keeps hidden-only selection out of the visible package hash", () => {
    const typesSource = readFileSync(join(ROOT, "src/families/memory-poisoning/types.ts"), "utf8");
    const baseline = freezeArmPackage(typesSource, BASELINE_ARM, "test-baseline-s0");
    const baselineAgain = freezeArmPackage(typesSource, BASELINE_ARM, "test-baseline-s0");
    const treated = freezeArmPackage(typesSource, TREATED_ARM, "test-treated-s3");
    expect(baseline.packageHash).toBe(baselineAgain.packageHash);
    expect(baseline.packageHash).toBe(treated.packageHash);
    expect(baseline.scenarioParamsHash).not.toBe(treated.scenarioParamsHash);
  });
});

describe("route parity (Docker-gated, real container path)", () => {
  let dockerAvailable = false;
  beforeAll(() => {
    try {
      execFileSync("docker", ["info"], { stdio: "ignore", timeout: 20_000 });
      dockerAvailable = true;
    } catch {
      dockerAvailable = false;
    }
  });

  it.runIf(() => dockerAvailable)(
    "a preserved honest submission grades identically through both the pre- and post-Phase-20 routes",
    () => {
      const modulePath = join(
        ROOT,
        "trials/caa-revalidation/phase17-caa-slot-1-openai-attempt-1/submission/subject.mjs",
      );
      const result = checkRouteParity("test-slot-1", modulePath);
      expect(result.identical).toBe(true);
      expect(result.discrepancies).toEqual([]);
      expect(result.preRouteHostErrors).toBe(0);
      expect(result.postRouteHostErrors).toBe(0);
    },
  );
});
