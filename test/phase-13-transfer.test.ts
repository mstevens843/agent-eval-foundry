import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { recomputeCurrentEpoch as daoNarrow } from "../src/families/dao-descendant/mutants.js";
import { reference as daoReference } from "../src/families/dao-descendant/reference.js";
import { runCell as runDaoCell } from "../src/families/dao-descendant/runner.js";
import {
  designCell as daoDesignCell,
  generateScenarios as daoGenerate,
  selectProbeSet as daoProbeSet,
  enumerateSpace as daoSpace,
} from "../src/families/dao-descendant/scenarios.js";
import { recomputeCurrentAuthority as deployNarrow } from "../src/families/deployment-rollback-recompute/mutants.js";
import { reference as deployReference } from "../src/families/deployment-rollback-recompute/reference.js";
import { runCell as runDeployCell } from "../src/families/deployment-rollback-recompute/runner.js";
import {
  designCell as deployDesignCell,
  generateScenarios as deployGenerate,
  selectProbeSet as deployProbeSet,
  enumerateSpace as deploySpace,
} from "../src/families/deployment-rollback-recompute/scenarios.js";
import { recomputeCurrentAuthority as tradeNarrow } from "../src/families/trading-reconciliation-recompute/mutants.js";
import { reference as tradeReference } from "../src/families/trading-reconciliation-recompute/reference.js";
import { runCell as runTradeCell } from "../src/families/trading-reconciliation-recompute/runner.js";
import {
  designCell as tradeDesignCell,
  generateScenarios as tradeGenerate,
  selectProbeSet as tradeProbeSet,
  enumerateSpace as tradeSpace,
} from "../src/families/trading-reconciliation-recompute/scenarios.js";
import {
  measurePhase13,
  parsePhase13BoundaryEvidence,
  parsePhase13Preregistration,
  renderPhase13DesignMatrix,
  renderPhase13Results,
} from "../src/reports/phase-13-transfer.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const EXPECTED_PATTERN = {
  U0C0: false,
  U1C0: false,
  U0C1: false,
  U1C1: true,
};

describe("Phase 13 cheap transfer probes", () => {
  it("isolates the same U x C interaction in durable outbox", () => {
    const scenarios = daoGenerate(daoProbeSet(daoSpace()));
    const observed = Object.fromEntries(
      scenarios.map((scenario) => {
        expect(runDaoCell(scenario, daoReference).failures).toHaveLength(0);
        const narrow = runDaoCell(scenario, daoNarrow);
        return [
          daoDesignCell(scenario.params),
          narrow.failures.some((failure) => failure.check === "exactly_once"),
        ];
      }),
    );
    expect(observed).toEqual(EXPECTED_PATTERN);
  });

  it("isolates the same U x C interaction in trading reconciliation", () => {
    const scenarios = tradeGenerate(tradeProbeSet(tradeSpace()));
    const observed = Object.fromEntries(
      scenarios.map((scenario) => {
        expect(runTradeCell(scenario, tradeReference).failures).toHaveLength(0);
        const narrow = runTradeCell(scenario, tradeNarrow);
        return [
          tradeDesignCell(scenario.params),
          narrow.failures.some((failure) => failure.check === "exactly_once"),
        ];
      }),
    );
    expect(observed).toEqual(EXPECTED_PATTERN);
  });

  it("isolates the same U x C interaction in deployment rollback", () => {
    const scenarios = deployGenerate(deployProbeSet(deploySpace()));
    const observed = Object.fromEntries(
      scenarios.map((scenario) => {
        expect(runDeployCell(scenario, deployReference).failures).toHaveLength(0);
        const narrow = runDeployCell(scenario, deployNarrow);
        return [
          deployDesignCell(scenario.params),
          narrow.failures.some((failure) => failure.check === "exactly_once"),
        ];
      }),
    );
    expect(observed).toEqual(EXPECTED_PATTERN);
  });
});

describe("Phase 13 measurement contract", () => {
  it("refuses a preregistration that authorizes model reads or paid trials", () => {
    const registered = JSON.parse(
      readFileSync(`${ROOT}/data/phase-13-preregistration.json`, "utf8"),
    ) as Record<string, unknown>;
    const budgets = registered.budgets as Record<string, unknown>;
    expect(() =>
      parsePhase13Preregistration({ ...registered, budgets: { ...budgets, modelReads: 1 } }),
    ).toThrow(/zero-dollar and zero-model-read/);
    expect(() => parsePhase13Preregistration({ ...registered, budgets: { ...budgets, paidUsd: 1 } })).toThrow(
      /zero-dollar and zero-model-read/,
    );
  });

  it("keeps post-outcome boundary provenance from becoming preregistered evidence", () => {
    const evidence = parsePhase13BoundaryEvidence(
      JSON.parse(readFileSync(`${ROOT}/data/phase-13-boundary-evidence.json`, "utf8")),
    );
    expect(evidence.timing).toBe("post-outcome");
    expect(evidence.sources).toHaveLength(6);
    expect(evidence.substrates).toHaveLength(3);
    expect(evidence.substrates.filter((row) => row.classification.includes("post-outcome"))).toHaveLength(2);
  });

  it("recomputes three trial-ready local transfers without claiming agent difficulty", () => {
    const result = measurePhase13(ROOT);
    expect(result.summary).toMatchObject({
      probesRun: 3,
      probeSurvivors: 3,
      packagesTrialReady: 3,
      paidUsd: 0,
      modelReads: 0,
      localTransferEstablished: true,
      agentDifficultyEstablished: false,
      prospectiveRealSystemTransferEstablished: false,
    });
    expect(result.boundaryEvidence).toMatchObject({
      path: "data/phase-13-boundary-evidence.json",
      timing: "post-outcome",
    });
    for (const substrate of result.substrates) {
      expect(substrate.killSignalsTriggered, substrate.id).toEqual([]);
      expect(substrate.probe.interactionContrast, substrate.id).toBe(1);
      expect(substrate.grid, substrate.id).toMatchObject({
        parameterPoints: 72,
        referenceFailures: 0,
        narrowFailures: 27,
      });
      expect(substrate.selected, substrate.id).toMatchObject({
        scenarios: 24,
        targetScenarios: 18,
        controls: 6,
        referenceFailures: 0,
        narrowTargetFailures: 18,
        narrowControlFailures: 0,
        narrowTargetLocalGreen: 18,
      });
      expect(substrate.selected.heldOut).toHaveLength(3);
      expect(substrate.selected.heldOut.every((subject) => subject.caughtInSelected > 0)).toBe(true);
      expect(substrate.package).toMatchObject({
        files: 8,
        examples: 3,
        deterministic: true,
        routeHostErrors: 0,
        starterFailures: 18,
        campaignHashCurrent: true,
        campaignSlotsNotRun: 2,
        trialReady: true,
      });
    }
    expect(renderPhase13Results(result)).toBe(
      readFileSync(`${ROOT}/data/phase-13-activation-results.json`, "utf8"),
    );
    expect(renderPhase13DesignMatrix(result)).toBe(
      readFileSync(`${ROOT}/data/phase-13-design-matrix.json`, "utf8"),
    );
  });
});
