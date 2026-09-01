import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type FamilyLineage,
  type LineageRuntimeFamilyEvidence,
  assertLineagesValid,
  evaluateLineage,
  evaluateLineages,
  lineageFeedbackForDiscovery,
  parseFamilyLineage,
  parseFamilyLineages,
  planPortfolioReallocation,
} from "../src/foundry/lineage.js";
import { loadDiscoveryWorkbench, loadLineages, loadPromotions, loadRegistry } from "../src/foundry/load.js";
import { SchemaError } from "../src/foundry/schema.js";
import { renderLineageLearningReport } from "../src/reports/lineage-report.js";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (path: string): unknown => JSON.parse(readFileSync(`${ROOT}${path}`, "utf8"));

const baseLineage = (): FamilyLineage =>
  parseFamilyLineages(read("data/lineages.json"), "data/lineages.json")[0] as FamilyLineage;

function loaded() {
  const registry = loadRegistry(ROOT);
  const workbench = loadDiscoveryWorkbench(ROOT, registry);
  const promotions = loadPromotions(ROOT, registry, workbench);
  const lineages = loadLineages(ROOT, registry, workbench, promotions);
  return { registry, workbench, promotions, lineages };
}

const runtime = (
  familyId: string,
  overrides: Partial<LineageRuntimeFamilyEvidence> = {},
): LineageRuntimeFamilyEvidence => ({
  familyId,
  currentPackageHash:
    familyId === "access-token-scope-expansion"
      ? "33cc98364ce2a6b3f9490e54937955d8"
      : "2140032d835a87ff254d01b6b4652f21",
  localEvidencePass: true,
  countedSmokeTrials: 1,
  countedSmokeSolves: 1,
  countedSmokeFailures: 0,
  providerFamilies: ["openai"],
  subjectIds: ["gpt-5.6-sol"],
  fullMatrixReady: false,
  fullMatrixBlocked: true,
  transferDeclared: true,
  smokeDiagnosis: "clean",
  scenarioCount: familyId === "access-token-scope-expansion" ? 384 : 804,
  mutantAxes: 3,
  ...overrides,
});

const runtimeMap = (
  overrides: Record<string, Partial<LineageRuntimeFamilyEvidence>> = {},
): ReadonlyMap<string, LineageRuntimeFamilyEvidence> =>
  new Map([
    [
      "access-token-scope-expansion",
      runtime("access-token-scope-expansion", overrides["access-token-scope-expansion"]),
    ],
    [
      "delegated-wallet-scope-reconciliation",
      runtime("delegated-wallet-scope-reconciliation", overrides["delegated-wallet-scope-reconciliation"]),
    ],
  ]);

function mutateLineage(mutator: (lineage: FamilyLineage) => FamilyLineage): FamilyLineage {
  return mutator(JSON.parse(JSON.stringify(baseLineage())) as FamilyLineage);
}

describe("lineage data and validation", () => {
  it("loads and validates the access-token to delegated-wallet lineage", () => {
    const { lineages } = loaded();

    expect(lineages).toHaveLength(1);
    expect(lineages[0]?.id).toBe("access-token-authority-lineage");
    expect(lineages[0]?.nodes.map((node) => node.familyId)).toEqual([
      "access-token-scope-expansion",
      "delegated-wallet-scope-reconciliation",
    ]);
  });

  it("rejects a lineage with no root node by LINEAGE_NO_ROOT", () => {
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      nodes: lineage.nodes.map((node) => ({ ...node, role: "descendant" })),
    }));

    expect(() => parseFamilyLineage(invalid, "lineage")).toThrowError(
      expect.objectContaining({ code: "LINEAGE_NO_ROOT" }),
    );
  });

  it("rejects an unknown family by LINEAGE_NODE_UNKNOWN_FAMILY", () => {
    const { registry, workbench, promotions } = loaded();
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      rootFamilyId: "unknown-family",
      nodes: lineage.nodes.map((node, index) =>
        index === 0 ? { ...node, familyId: "unknown-family" } : node,
      ),
    }));

    expect(() => assertLineagesValid([invalid], registry, workbench, promotions)).toThrowError(
      expect.objectContaining({ code: "LINEAGE_NODE_UNKNOWN_FAMILY" }),
    );
  });

  it("rejects a dangling parent/child edge by LINEAGE_EDGE_DANGLING_NODE", () => {
    const { registry, workbench, promotions } = loaded();
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      edges: lineage.edges.map((edge) => ({ ...edge, toFamilyId: "missing-child" })),
    }));

    expect(() => assertLineagesValid([invalid], registry, workbench, promotions)).toThrowError(
      expect.objectContaining({ code: "LINEAGE_EDGE_DANGLING_NODE" }),
    );
  });

  it("rejects an edge without fixed mechanism pressure by LINEAGE_NO_FIXED_DELTA", () => {
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      edges: lineage.edges.map((edge) => ({ ...edge, whatStayedFixed: [] })),
    }));

    expect(() => parseFamilyLineage(invalid, "lineage")).toThrowError(
      expect.objectContaining({ code: "LINEAGE_NO_FIXED_DELTA" }),
    );
  });

  it("rejects an edge without changed pressure by LINEAGE_NO_CHANGED_DELTA", () => {
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      edges: lineage.edges.map((edge) => ({ ...edge, whatChanged: [] })),
    }));

    expect(() => parseFamilyLineage(invalid, "lineage")).toThrowError(
      expect.objectContaining({ code: "LINEAGE_NO_CHANGED_DELTA" }),
    );
  });

  it("rejects cross-lab claims from same-provider evidence by LINEAGE_CROSS_LAB_FROM_SAME_PROVIDER", () => {
    const { registry, workbench, promotions } = loaded();
    const invalid = mutateLineage((lineage) => ({ ...lineage, crossLabClaimed: true }));

    expect(() => assertLineagesValid([invalid], registry, workbench, promotions)).toThrowError(
      expect.objectContaining({ code: "LINEAGE_CROSS_LAB_FROM_SAME_PROVIDER" }),
    );
  });

  it("rejects a clean smoke pass that leaves matrix spend open by LINEAGE_MATRIX_AFTER_CLEAN_PASS", () => {
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      nodes: lineage.nodes.map((node, index) => (index === 0 ? { ...node, fullMatrixBlocked: false } : node)),
    }));

    expect(() => parseFamilyLineage(invalid, "lineage")).toThrowError(
      expect.objectContaining({ code: "LINEAGE_MATRIX_AFTER_CLEAN_PASS" }),
    );
  });

  it("rejects unlabelled scoring feedback by LINEAGE_FEEDBACK_UNLABELLED", () => {
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      learning: {
        ...lineage.learning,
        scoringFeedback: lineage.learning.scoringFeedback.map((rule, index) =>
          index === 0 ? { ...rule, evidenceLabel: "silent score tweak" } : rule,
        ),
      },
    }));

    expect(() => parseFamilyLineage(invalid, "lineage")).toThrowError(
      expect.objectContaining({ code: "LINEAGE_FEEDBACK_UNLABELLED" }),
    );
  });

  it("rejects solved lineage data without a reallocation target by LINEAGE_NO_REALLOCATION", () => {
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      learning: {
        ...lineage.learning,
        reallocation: { ...lineage.learning.reallocation, candidateIds: [] },
      },
    }));

    expect(() => parseFamilyLineage(invalid, "lineage")).toThrowError(
      expect.objectContaining({ code: "LINEAGE_NO_REALLOCATION" }),
    );
  });
});

describe("lineage verdicts and portfolio reallocation", () => {
  it("turns parent plus descendant clean smoke passes into solved-twice reallocation", () => {
    const lineage = baseLineage();
    const evaluation = evaluateLineage(lineage, runtimeMap());

    expect(evaluation.verdict).toBe("lineage_solved_twice");
    expect(evaluation.decision).toBe("reallocate");
    expect(evaluation.difficultyIncreased).toBe(false);
    expect(evaluation.crossLabProven).toBe(false);
    expect(evaluation.matrixBlocks).toBe(2);
    expect(evaluation.estimatedMatrixSpendSavedUsd).toBe(97.32);
    expect(evaluation.nextAction).toMatch(/reallocate/);
  });

  it("treats a descendant failure after parent pass as confirmed harder", () => {
    const evaluation = evaluateLineage(
      baseLineage(),
      runtimeMap({
        "delegated-wallet-scope-reconciliation": {
          countedSmokeSolves: 0,
          countedSmokeFailures: 1,
          smokeDiagnosis: "on-target",
        },
      }),
    );

    expect(evaluation.verdict).toBe("lineage_confirmed_harder");
    expect(evaluation.decision).toBe("continue");
    expect(evaluation.difficultyIncreased).toBe(true);
  });

  it("blocks lineage verdicts when a smoke trial is missing", () => {
    const evaluation = evaluateLineage(
      baseLineage(),
      runtimeMap({
        "delegated-wallet-scope-reconciliation": {
          countedSmokeTrials: 0,
          countedSmokeSolves: 0,
          countedSmokeFailures: 0,
          subjectIds: [],
          providerFamilies: [],
          smokeDiagnosis: "none",
        },
      }),
    );

    expect(evaluation.verdict).toBe("lineage_blocked_by_missing_trials");
    expect(evaluation.decision).toBe("run-smoke");
  });

  it("blocks lineage verdicts when package hash evidence is stale", () => {
    const evaluation = evaluateLineage(
      baseLineage(),
      runtimeMap({
        "delegated-wallet-scope-reconciliation": {
          currentPackageHash: "different-current-hash",
        },
      }),
    );

    expect(evaluation.verdict).toBe("lineage_blocked_by_stale_evidence");
    expect(evaluation.decision).toBe("repair");
  });

  it("labels scoring feedback and recommends a different mechanism cluster", () => {
    const { workbench, lineages } = loaded();
    const evaluations = evaluateLineages(lineages, runtimeMap());
    const reallocation = planPortfolioReallocation(lineages, evaluations, workbench);
    const discoveryFeedback = lineageFeedbackForDiscovery(reallocation);

    expect(reallocation.penalized.map((item) => item.candidateId)).toContain("access-token-scope-expansion");
    expect(reallocation.penalized.map((item) => item.candidateId)).toContain(
      "delegated-wallet-scope-reconciliation",
    );
    expect(reallocation.boosted.length).toBeGreaterThanOrEqual(5);
    expect(reallocation.nextRecommendations.length).toBe(5);
    expect(reallocation.nextRecommendations[0]?.mechanismCluster).not.toBe("local-scope-authority");
    expect(reallocation.nextRecommendations.map((item) => item.candidateId)).toContain(
      "deployment-model-alias-rollout-drift",
    );
    expect(
      discoveryFeedback.every((item) => item.sourceId === "lineage:access-token-authority-lineage"),
    ).toBe(true);
    expect(discoveryFeedback.every((item) => /lineage result/.test(item.reason))).toBe(true);
  });

  it("renders the lineage learning report deterministically", () => {
    const { workbench, lineages } = loaded();
    const evaluations = evaluateLineages(lineages, runtimeMap());
    const reallocation = planPortfolioReallocation(lineages, evaluations, workbench);
    const first = renderLineageLearningReport(lineages, evaluations, reallocation);
    const second = renderLineageLearningReport(lineages, evaluations, reallocation);

    expect(first).toBe(second);
    expect(first).toContain("Lineage Kill + Portfolio Reallocation v1");
    expect(first).toContain("lineage_solved_twice");
    expect(first).toContain("estimated matrix spend avoided");
    expect(first).toContain("Two clean same-provider smoke passes are not cross-lab evidence");
  });

  it("surfaces schema errors as stable codes", () => {
    let thrown: unknown;
    try {
      parseFamilyLineage([], "lineage");
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(SchemaError);
    expect((thrown as SchemaError).code).toBe("E_SHAPE");
  });
});
