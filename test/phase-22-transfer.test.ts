// Phase 22 — Transfer Infrastructure And The First Real Signal.
//
// Covers: the frozen mutant envelope's soundness guarantees, the OperatorAdapter registry's
// fail-closed refusal, the generic orchestrator's coverage experiment (including its matched-pair
// enforcement), within-family replication across all its verdict branches, and the regraded-real-
// submission path (Docker-gated — skipped, not falsely passed, when unavailable, matching Phase 20's
// own convention in test/phase-20-secure-executor.test.ts).

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { operatorTreatment, parseOperatorTreatmentSchema } from "../src/phase-21/operator-schema.js";
import type { OperatorTreatment } from "../src/phase-21/operator-schema.js";
import { caaRevalidationAdapter } from "../src/phase-22/adapters/caa-revalidation-adapter.js";
import { registerAllAdapters } from "../src/phase-22/adapters/index.js";
import {
  ALL_SCENARIOS,
  DEV_MUTANTS,
  HELD_OUT_MUTANTS,
  assertEnvelopeSound,
  buildMutantEnvelope,
} from "../src/phase-22/mutant-envelope.js";
import { getAdapter } from "../src/phase-22/operator-adapter.js";
import type { OperatorAdapter } from "../src/phase-22/operator-adapter.js";
import { runCoverageExperiment } from "../src/phase-22/orchestrator.js";
import type { CoverageRunResult } from "../src/phase-22/orchestrator.js";
import { regradeSubmissionAgainstSuite } from "../src/phase-22/regrade.js";
import { assessWithinFamilyReplication } from "../src/phase-22/within-family-replication.js";

const ROOT = new URL("..", import.meta.url).pathname;
const readJson = (p: string): unknown => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

let operator: OperatorTreatment;
beforeAll(() => {
  registerAllAdapters();
  const schema = parseOperatorTreatmentSchema(readJson("data/phase-21-operators.json"));
  operator = operatorTreatment(schema, "hidden-scenario-selection-targets-narrow-mutants");
});

describe("mutant envelope", () => {
  it("has nine development mutants (unchanged, re-exported from the shipped family) and eight held-out mutants", () => {
    expect(DEV_MUTANTS.length).toBe(9);
    expect(HELD_OUT_MUTANTS.length).toBe(8);
  });

  it("builds a sound envelope: disjoint ids, non-vacuous/non-universal failure rates, unique held-out fingerprints", () => {
    const envelope = buildMutantEnvelope();
    expect(envelope.scenarioSpaceSize).toBe(ALL_SCENARIOS.length);
    expect(() => assertEnvelopeSound(envelope)).not.toThrow();
    const devIds = new Set(envelope.development.map((e) => e.id));
    for (const entry of envelope.heldOut) expect(devIds.has(entry.id)).toBe(false);
  });

  it("reproduces the same bankHash across two independent builds", () => {
    expect(buildMutantEnvelope().bankHash).toBe(buildMutantEnvelope().bankHash);
  });

  it("refuses an envelope with a held-out id collision against development", () => {
    const envelope = buildMutantEnvelope();
    const [firstHeldOut, ...restHeldOut] = envelope.heldOut;
    const [firstDev] = envelope.development;
    if (firstHeldOut === undefined || firstDev === undefined) {
      throw new Error("envelope unexpectedly has an empty bank");
    }
    const collided = {
      ...envelope,
      heldOut: [{ ...firstHeldOut, id: firstDev.id }, ...restHeldOut],
    };
    expect(() => assertEnvelopeSound(collided)).toThrowError(
      expect.objectContaining({ code: "PHASE22_ENVELOPE_INVALID" }),
    );
  });

  it("refuses an envelope entry whose failure rate is vacuous or universal", () => {
    const envelope = buildMutantEnvelope();
    const [firstHeldOut, ...restHeldOut] = envelope.heldOut;
    if (firstHeldOut === undefined) throw new Error("envelope unexpectedly has an empty held-out bank");
    const vacuous = {
      ...envelope,
      heldOut: [{ ...firstHeldOut, failureRateOverFullSpace: 0 }, ...restHeldOut],
    };
    expect(() => assertEnvelopeSound(vacuous)).toThrowError(
      expect.objectContaining({ code: "PHASE22_ENVELOPE_INVALID" }),
    );
  });
});

describe("operator adapter registry", () => {
  it("fails closed for an unregistered family", () => {
    expect(() => getAdapter("not-a-real-family")).toThrowError(
      expect.objectContaining({ code: "PHASE22_ADAPTER_NOT_FOUND" }),
    );
  });

  it("resolves the registered caa-revalidation adapter", () => {
    const adapter = getAdapter("caa-revalidation");
    expect(adapter.familyId).toBe("caa-revalidation");
    expect(adapter.operatorId).toBe("hidden-scenario-selection-targets-narrow-mutants");
  });
});

describe("orchestrator — real coverage experiment on caa-revalidation", () => {
  const adapter = caaRevalidationAdapter;
  const prereg = (label: string, max: number) => ({
    experimentId: `test-${label}`,
    operatorId: operator.id,
    minimumMatchedPairs: 5,
    alpha: 0.05,
    referenceMustPass: true,
    maximumMatchedPairs: max,
  });

  it("runs the held-out bank at the shipped quota and finds zero discordant pairs (real, honest null)", () => {
    const result = runCoverageExperiment(adapter, operator, "heldOut", 24, prereg("heldout-24", 8));
    expect(result.referenceCleanUnderNaive).toBe(true);
    expect(result.referenceCleanUnderTargeted).toBe(true);
    expect(result.primary.mutantCount).toBe(8);
    expect(result.primary.discordantTargetedWins).toBe(0);
    expect(result.primary.discordantNaiveWins).toBe(0);
    expect(result.stoppingRule.kind).toBe("stop-null");
    expect(result.secondaryCaveated.caveat).toMatch(/not independent random samples/);
  });

  it("runs the development bank too, for sanity, and also finds zero discordant pairs", () => {
    const result = runCoverageExperiment(adapter, operator, "development", 24, prereg("dev-24", 9));
    expect(result.primary.mutantCount).toBe(9);
    expect(result.stoppingRule.kind).toBe("stop-null");
  });

  it("refuses a matched pair when the adapter's naive and targeted selectors are actually identical", () => {
    const brokenAdapter: OperatorAdapter = {
      ...adapter,
      selectTargeted: adapter.selectNaive,
    };
    expect(() =>
      runCoverageExperiment(brokenAdapter, operator, "heldOut", 24, prereg("broken", 8)),
    ).toThrowError(expect.objectContaining({ code: "PHASE21_MATCHED_PAIR_NOT_DIFFABLE" }));
  });
});

describe("within-family replication", () => {
  const makeRun = (
    kind: CoverageRunResult["stoppingRule"]["kind"],
    targetedWins = 0,
    naiveWins = 0,
  ): CoverageRunResult => ({
    familyId: "caa-revalidation",
    operatorId: "test-op",
    adapterVersion: "1.0.0",
    bank: "heldOut",
    quota: 24,
    naiveScenarioCount: 24,
    targetedScenarioCount: 24,
    referenceCleanUnderNaive: true,
    referenceCleanUnderTargeted: true,
    perMutant: [],
    primary: {
      mutantCount: 8,
      caughtByNaiveCount: 8,
      caughtByTargetedCount: 8,
      discordantTargetedWins: targetedWins,
      discordantNaiveWins: naiveWins,
      concordant: 8 - targetedWins - naiveWins,
    },
    secondaryCaveated: { pValueTwoSided: 1, independenceAssumption: "n/a", caveat: "n/a" },
    stoppingRule: { kind, reason: "test fixture" } as CoverageRunResult["stoppingRule"],
  });

  it("requires at least two runs", () => {
    const result = assessWithinFamilyReplication([
      { conditionLabel: "only-one", result: makeRun("stop-null") },
    ]);
    expect(result.verdict).toBe("INSUFFICIENT-RUNS");
  });

  it("declares REPLICATED-NULL when every independent condition reaches a null stopping decision", () => {
    const result = assessWithinFamilyReplication([
      { conditionLabel: "n24", result: makeRun("stop-null") },
      { conditionLabel: "n3", result: makeRun("stop-null") },
    ]);
    expect(result.verdict).toBe("REPLICATED-NULL");
  });

  it("declares REPLICATED-UPLIFT-TOWARD-TARGETED when every run agrees on direction", () => {
    const result = assessWithinFamilyReplication([
      { conditionLabel: "n24", result: makeRun("stop-uplift", 5, 0) },
      { conditionLabel: "n3", result: makeRun("stop-uplift", 3, 0) },
    ]);
    expect(result.verdict).toBe("REPLICATED-UPLIFT-TOWARD-TARGETED");
  });

  it("declares INCONSISTENT-NOT-REPLICATED when uplift direction disagrees across runs", () => {
    const result = assessWithinFamilyReplication([
      { conditionLabel: "n24", result: makeRun("stop-uplift", 5, 0) },
      { conditionLabel: "n3", result: makeRun("stop-uplift", 0, 3) },
    ]);
    expect(result.verdict).toBe("INCONSISTENT-NOT-REPLICATED");
  });

  it("declares VALIDITY-REGRESSION-BLOCKS-REPLICATION when any run's reference failed", () => {
    const result = assessWithinFamilyReplication([
      { conditionLabel: "n24", result: makeRun("stop-null") },
      { conditionLabel: "n3", result: makeRun("stop-validity-regression") },
    ]);
    expect(result.verdict).toBe("VALIDITY-REGRESSION-BLOCKS-REPLICATION");
  });
});

describe("regraded-real-submission evidence (Docker-gated, real container path)", () => {
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
    "regrades a preserved real Phase 17 submission against a small suite through the trusted executor",
    () => {
      const suite = ALL_SCENARIOS.slice(0, 2);
      const modulePath = join(
        ROOT,
        "trials/caa-revalidation/phase17-caa-slot-1-openai-attempt-1/submission/subject.mjs",
      );
      const result = regradeSubmissionAgainstSuite("test-slot-1", modulePath, "test-2-scenario", suite);
      expect(result.cells.length).toBe(2);
      for (const cell of result.cells) expect(cell.hostError).toBeNull();
    },
  );
});
