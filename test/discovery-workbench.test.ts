import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type DiscoveryCandidate,
  candidateToTaskShapeDraft,
  parseDiscoveryCandidate,
  scoreDiscoveryCandidate,
  summarizeDiscoveryWorkbench,
  summarizeSurfaceCoverage,
} from "../src/foundry/discovery-workbench.js";
import { loadAdaptiveFunnel, loadDiscoveryWorkbench, loadRegistry } from "../src/foundry/load.js";
import { SchemaError } from "../src/foundry/schema.js";
import { renderDiscoveryWorkbenchReport } from "../src/reports/discovery-workbench-report.js";

const ROOT = new URL("..", import.meta.url).pathname;

const read = (path: string): unknown => JSON.parse(readFileSync(`${ROOT}${path}`, "utf8"));
const fixture = (name: string): unknown => read(`fixtures/invalid/discovery-candidates/${name}.json`);

const loaded = () => {
  const registry = loadRegistry(ROOT);
  const funnel = loadAdaptiveFunnel(ROOT, registry);
  const workbench = loadDiscoveryWorkbench(ROOT, registry, funnel);
  return { registry, funnel, workbench };
};

const firstCandidate = (): DiscoveryCandidate =>
  parseDiscoveryCandidate((read("data/candidate-pool.json") as unknown[])[0], "candidate");

const withRisk = (
  candidate: DiscoveryCandidate,
  risk: keyof DiscoveryCandidate["riskNotes"],
  level: "low" | "medium" | "high",
): DiscoveryCandidate => ({
  ...candidate,
  riskNotes: {
    ...candidate.riskNotes,
    [risk]: {
      level,
      note: `${risk} is ${level} for this synthetic test.`,
      mitigation: "Synthetic mitigation.",
    },
  },
});

describe("Discovery Workbench data", () => {
  it("loads a validated 50-candidate pool linked to mechanisms and transfer tests", () => {
    const { registry, funnel, workbench } = loaded();

    expect(workbench.candidates).toHaveLength(50);
    expect(workbench.candidates.every((c) => c.expectedKnobs.length >= 2)).toBe(true);
    expect(workbench.candidates.every((c) => c.transferPotential.targetDomains.length > 0)).toBe(true);
    expect(registry.mechanisms.length).toBeGreaterThanOrEqual(15);
    expect(funnel.transfers.length).toBeGreaterThanOrEqual(7);
  });

  it("accepts a valid candidate", () => {
    const candidate = firstCandidate();

    expect(candidate.id).toBe("payment-unknown-capture-receipt");
    expect(candidate.authoritativeTruthSource.name).toMatch(/ledger/i);
    expect(candidate.surfaceCoverageTags.riskCategories.length).toBeGreaterThan(0);
  });

  it("rejects a candidate with no authoritative truth source by the intended rule", () => {
    expect(() => parseDiscoveryCandidate(fixture("no-truth-source"), "candidate")).toThrowError(
      expect.objectContaining({ code: "DISCOVERY_CANDIDATE_NO_TRUTH_SOURCE" }),
    );
  });

  it("rejects a wording-only candidate before it reaches the queue", () => {
    expect(() => parseDiscoveryCandidate(fixture("wording-only"), "candidate")).toThrowError(
      expect.objectContaining({ code: "DISCOVERY_CANDIDATE_WORDING_ONLY" }),
    );
  });

  it("blocks promotion when expected mutants are absent", () => {
    expect(() => parseDiscoveryCandidate(fixture("no-expected-mutants"), "candidate")).toThrowError(
      expect.objectContaining({ code: "DISCOVERY_CANDIDATE_NO_EXPECTED_MUTANTS" }),
    );
  });

  it("blocks or rejects candidates with no transfer potential", () => {
    expect(() => parseDiscoveryCandidate(fixture("no-transfer"), "candidate")).toThrowError(
      expect.objectContaining({ code: "DISCOVERY_CANDIDATE_NO_TRANSFER" }),
    );
  });
});

describe("Discovery Workbench scoring", () => {
  it("does not promote high-difficulty candidates with low fairness", () => {
    const candidate = {
      ...withRisk(firstCandidate(), "fairnessRisk", "high"),
      expectedAxisPotential: 5,
      proposedNextStep: "task_shape" as const,
    };
    const score = scoreDiscoveryCandidate(candidate);

    expect(score.dimensions.expectedAgentDifficulty).toBeGreaterThanOrEqual(8);
    expect(score.recommendedAction).toBe("hold");
    expect(score.blockingReasons.map((b) => b.code)).toContain("low-fairness");
  });

  it("does not promote high-surface candidates with no feasible verifier", () => {
    const candidate = {
      ...withRisk(firstCandidate(), "verifierRisk", "high"),
      proposedNextStep: "task_shape" as const,
    };
    const score = scoreDiscoveryCandidate(candidate);

    expect(score.dimensions.surfaceCoverageValue).toBeGreaterThanOrEqual(8);
    expect(score.recommendedAction).toBe("hold");
    expect(score.blockingReasons.map((b) => b.code)).toContain("weak-verifier-plan");
  });

  it("is deterministic", () => {
    const candidate = firstCandidate();

    expect(scoreDiscoveryCandidate(candidate)).toEqual(scoreDiscoveryCandidate(candidate));
  });

  it("keeps the promotion queue stable", () => {
    const { workbench } = loaded();
    const first = summarizeDiscoveryWorkbench(workbench).topBuildOrProbeCandidates.map((s) => s.candidateId);
    const second = summarizeDiscoveryWorkbench(workbench).topBuildOrProbeCandidates.map((s) => s.candidateId);

    expect(first).toEqual(second);
  });

  it("warns when the top queue repeats one mechanism", () => {
    const base = firstCandidate();
    const clones: DiscoveryCandidate[] = Array.from({ length: 10 }, (_, i) => ({
      ...base,
      id: `repeat-${i}`,
      title: `Repeat ${i}`,
      failureMechanisms: ["stale-state"],
    }));
    const summary = summarizeDiscoveryWorkbench({ candidates: clones });

    expect(summary.warnings).toContain(
      "top-ranked candidates over-concentrate on one mechanism; run a surface-diversity pass",
    );
  });
});

describe("surface coverage and reports", () => {
  it("separates surface breadth from defect-axis diversity", () => {
    const { workbench } = loaded();
    const surface = summarizeSurfaceCoverage(workbench.candidates);

    expect(surface.groups.domains.length).toBeGreaterThan(10);
    expect(surface.defectMechanisms.length).toBeGreaterThan(10);
    expect(surface.groups.domains).not.toEqual(surface.defectMechanisms);
  });

  it("generates a draft task-shape artifact with required bridge fields", () => {
    const draft = candidateToTaskShapeDraft(firstCandidate());

    expect(draft.familyId).toBe("payment-unknown-capture-receipt");
    expect(draft.visibleRulesDraft.length).toBeGreaterThan(0);
    expect(draft.behaviorSpaceDraft).toMatch(/payment|capture/i);
    expect(draft.hiddenRegionDraft).toMatch(/Hidden cases/i);
    expect(draft.authoritativeSource.name).toMatch(/ledger/i);
    expect(draft.expectedMutants.length).toBeGreaterThan(0);
    expect(draft.baselineCheats.length).toBeGreaterThan(0);
    expect(draft.humanSolvabilityNotes.length).toBeGreaterThan(0);
    expect(draft.adversarialAuditNotes.length).toBeGreaterThan(0);
    expect(draft.transferLinks.length).toBeGreaterThan(0);
  });

  it("renders the discovery report reproducibly", () => {
    const { registry, workbench } = loaded();
    const summary = summarizeDiscoveryWorkbench(workbench);
    const first = renderDiscoveryWorkbenchReport({ registry, workbench, summary });
    const second = renderDiscoveryWorkbenchReport({ registry, workbench, summary });

    expect(first).toBe(second);
    expect(first).toContain("Discovery Workbench v1");
    expect(first).toContain("Surface coverage is separate from defect-axis diversity.");
  });

  it("surfaces schema errors as stable codes", () => {
    let thrown: unknown;
    try {
      parseDiscoveryCandidate(fixture("no-cheap-screen"), "candidate");
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(SchemaError);
    expect((thrown as SchemaError).code).toBe("DISCOVERY_CANDIDATE_NO_CHEAP_SCREEN");
  });
});
