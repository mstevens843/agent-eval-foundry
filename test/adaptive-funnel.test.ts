import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parseMechanismProbe,
  parseTransferTest,
  planAdaptiveFunnel,
} from "../src/foundry/adaptive-funnel.js";
import { loadAdaptiveFunnel, loadRegistry } from "../src/foundry/load.js";
import { SchemaError } from "../src/foundry/schema.js";
import { renderAdaptiveFunnelReport } from "../src/reports/adaptive-funnel-report.js";

const ROOT = new URL("..", import.meta.url).pathname;

const fixture = (path: string): unknown =>
  JSON.parse(readFileSync(`${ROOT}fixtures/invalid/${path}`, "utf8"));

describe("adaptive funnel data", () => {
  it("loads validated mechanism probes and transfer tests from source data", () => {
    const registry = loadRegistry(ROOT);
    const funnel = loadAdaptiveFunnel(ROOT, registry);

    expect(funnel.probes.length).toBeGreaterThanOrEqual(8);
    expect(funnel.transfers.length).toBeGreaterThanOrEqual(5);
    expect(funnel.probes.every((p) => p.transferCandidates.length > 0)).toBe(true);
    expect(funnel.transfers.every((t) => t.whatStaysFixed.length > 0 && t.whatChanges.length > 0)).toBe(true);
  });

  it("accepts a valid probe with a cheap pre-model screen", () => {
    const probe = parseMechanismProbe(
      JSON.parse(readFileSync(`${ROOT}data/mechanism-probes.json`, "utf8"))[0],
      "probe",
    );

    expect(probe.expectedAgentFailure).toMatch(/unknown|timeout|retry/i);
    expect(probe.cheapValidationChecks.some((c) => c.cost === "static" || c.cost === "local")).toBe(true);
  });

  it("rejects a probe with no transfer candidate by the intended rule", () => {
    expect(() => parseMechanismProbe(fixture("probes/no-transfer-candidate.json"), "probe")).toThrowError(
      expect.objectContaining({ code: "FUNNEL_PROBE_NO_TRANSFER_CANDIDATE" }),
    );
  });

  it("rejects a transfer test that does not say what stays fixed", () => {
    expect(() => parseTransferTest(fixture("transfers/no-fixed.json"), "transfer")).toThrowError(
      expect.objectContaining({ code: "FUNNEL_TRANSFER_NO_FIXED" }),
    );
  });

  it("rejects a transfer test that does not say what changes", () => {
    expect(() => parseTransferTest(fixture("transfers/no-changed.json"), "transfer")).toThrowError(
      expect.objectContaining({ code: "FUNNEL_TRANSFER_NO_CHANGED" }),
    );
  });
});

describe("adaptive funnel planning", () => {
  const input = () => {
    const registry = loadRegistry(ROOT);
    const funnel = loadAdaptiveFunnel(ROOT, registry);
    return { registry, funnel };
  };

  it("chooses cheap evidence before model trials", () => {
    const { registry, funnel } = input();
    const summary = planAdaptiveFunnel(funnel, registry, [
      { familyId: "smoke-later", trialReady: true, countedAgentTrials: 0 },
    ]);

    const firstModel = summary.nextActions.findIndex((a) => a.evidenceCost === "one_agent");
    const firstCheap = summary.nextActions.findIndex((a) =>
      ["paper", "static", "local", "mutant"].includes(a.evidenceCost),
    );
    expect(firstCheap).toBeGreaterThanOrEqual(0);
    expect(firstModel).toBeGreaterThan(firstCheap);
  });

  it("does not recommend a full matrix before a smoke trial", () => {
    const { registry, funnel } = input();
    const summary = planAdaptiveFunnel(funnel, registry, [
      { familyId: "trial-ready-family", trialReady: true, countedAgentTrials: 0 },
    ]);

    const action = summary.nextActions.find((a) => a.targetId === "trial-ready-family");
    expect(action?.stage).toBe("smoke_trial");
    expect(action?.stage).not.toBe("full_matrix");
  });

  it("does not treat repeated same-provider trials as cross-lab transfer", () => {
    const { registry, funnel } = input();
    const summary = planAdaptiveFunnel(funnel, registry, [
      {
        familyId: "openai-only-family",
        trialReady: true,
        countedAgentTrials: 3,
        sharedProviderFamilies: ["openai"],
        agentFailuresChain: false,
        agentAxes: 2,
      },
    ]);

    const action = summary.nextActions.find((a) => a.targetId === "openai-only-family");
    expect(action?.stage).toBe("transfer_test");
    expect(action?.decision).toBe("transfer");
    expect(action?.reason).toMatch(/same-provider/);
  });

  it("routes a clean counted smoke pass to evolve rather than transfer or matrix", () => {
    const { registry, funnel } = input();
    const summary = planAdaptiveFunnel(funnel, registry, [
      {
        familyId: "clean-smoke-family",
        trialReady: true,
        countedAgentTrials: 1,
        agentTrialsPassed: 1,
        sharedProviderFamilies: ["openai"],
        agentFailuresChain: false,
        agentAxes: null,
      },
    ]);

    const action = summary.nextActions.find((a) => a.targetId === "clean-smoke-family");
    expect(action?.decision).toBe("evolve");
    expect(action?.stage).toBe("task_shape");
    expect(action?.reason).toMatch(/solved/);
  });

  it("keeps provider refusals out of production-mode advancement", () => {
    const { registry, funnel } = input();
    const summary = planAdaptiveFunnel(funnel, registry, [
      {
        familyId: "refused-family",
        trialReady: true,
        countedAgentTrials: 0,
        providerRefusals: 2,
      },
    ]);

    const action = summary.nextActions.find((a) => a.targetId === "refused-family");
    expect(action?.mode).toBe("validation");
    expect(action?.stage).toBe("smoke_trial");
    expect(action?.stage).not.toBe("full_matrix");
  });

  it("sends stale challenge hashes with no counted current-hash trial to repair", () => {
    const { registry, funnel } = input();
    const summary = planAdaptiveFunnel(funnel, registry, [
      {
        familyId: "stale-family",
        trialReady: true,
        countedAgentTrials: 0,
        sharedProviderFamilies: [],
        agentAxes: null,
        staleTrials: ["old-run"],
      },
    ]);

    const action = summary.nextActions.find((a) => a.targetId === "stale-family");
    expect(action?.decision).toBe("repair");
    expect(action?.stage).toBe("task_shape");
    expect(action?.mode).toBe("validation");
  });

  it("does not route a repaired-and-re-measured family back to repair forever", () => {
    // Superseded trials stay on disk by design, so a family that has ever been repaired carries
    // stale run ids permanently. Once it has a counted trial against the CURRENT challenge hash the
    // repair is done, and the funnel must judge it on that counted evidence instead.
    const { registry, funnel } = input();
    const summary = planAdaptiveFunnel(funnel, registry, [
      {
        familyId: "repaired-and-remeasured-family",
        trialReady: true,
        countedAgentTrials: 2,
        agentTrialsPassed: 0,
        sharedProviderFamilies: ["openai", "anthropic"],
        agentFailuresChain: false,
        agentAxes: 3,
        staleTrials: ["superseded-run-a", "superseded-run-b"],
      },
    ]);

    const action = summary.nextActions.find((a) => a.targetId === "repaired-and-remeasured-family");
    expect(action?.decision).not.toBe("repair");
    expect(action?.decision).toBe("promote");
    expect(action?.mode).toBe("production");
    expect(action?.stage).toBe("full_matrix");
  });

  it("still holds a repaired family at its counted-evidence stage, not at repair", () => {
    // Same preserved-stale situation, but the counted evidence is a single same-provider trial:
    // the decision must come from the counted branches (transfer), never from the stale record.
    const { registry, funnel } = input();
    const summary = planAdaptiveFunnel(funnel, registry, [
      {
        familyId: "repaired-one-provider-family",
        trialReady: true,
        countedAgentTrials: 1,
        agentTrialsPassed: 0,
        sharedProviderFamilies: ["openai"],
        agentFailuresChain: false,
        agentAxes: null,
        staleTrials: ["superseded-run-a"],
      },
    ]);

    const action = summary.nextActions.find((a) => a.targetId === "repaired-one-provider-family");
    expect(action?.decision).toBe("transfer");
    expect(action?.stage).toBe("transfer_test");
  });

  it("sends collapsed agent failure chains to evolve or hold, not broad ship claims", () => {
    const { registry, funnel } = input();
    const summary = planAdaptiveFunnel(funnel, registry, [
      {
        familyId: "chain-family",
        trialReady: true,
        countedAgentTrials: 4,
        sharedProviderFamilies: ["openai", "anthropic"],
        agentAxes: 1,
        agentFailuresChain: true,
      },
    ]);

    const action = summary.nextActions.find((a) => a.targetId === "chain-family");
    expect(action?.decision).toBe("evolve");
    expect(action?.stage).toBe("transfer_test");
  });

  it("renders the adaptive funnel report deterministically", () => {
    const { registry, funnel } = input();
    const summary = planAdaptiveFunnel(funnel, registry, []);
    const first = renderAdaptiveFunnelReport({ registry, funnel, summary });
    const second = renderAdaptiveFunnelReport({ registry, funnel, summary });

    expect(first).toBe(second);
    expect(first).toContain("Do not run `/6` first.");
    expect(first).toContain("Transfer proposed is not transfer proven.");
  });

  it("surfaces schema errors as stable codes", () => {
    let thrown: unknown;
    try {
      parseMechanismProbe(fixture("probes/no-cheap-screen.json"), "probe");
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(SchemaError);
    expect((thrown as SchemaError).code).toBe("FUNNEL_PROBE_NO_CHEAP_SCREEN");
  });
});
