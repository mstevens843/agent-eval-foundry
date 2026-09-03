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
      ? "8ae0950dea093d35d98b12d1c8c1bde5"
      : "45f27b644a84364e3d3855f68cd243a2",
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

/**
 * The lineage as it read BEFORE the package leak was found: two counted clean passes, no
 * withdrawal, live scoring rules. The real record is now a withdrawn one, and the solved-twice /
 * confirmed-harder / stale / missing-trial branches still need a subject to exercise them.
 */
const informativeLineage = (): FamilyLineage =>
  mutateLineage((lineage) => ({
    ...lineage,
    nodes: lineage.nodes.map((node) => ({
      ...node,
      evidenceWithdrawn: null,
      smoke: { ...node.smoke, status: "clean-pass", counted: true },
    })),
    learning: {
      ...lineage.learning,
      scoringFeedback: lineage.learning.scoringFeedback.map((rule) => ({
        ...rule,
        status: "active",
        withdrawnReason: null,
      })),
      reallocation: { ...lineage.learning.reallocation, status: "active", withdrawnReason: null },
    },
  }));

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
    const live = informativeLineage();
    const invalid: FamilyLineage = {
      ...live,
      nodes: live.nodes.map((node, index) => (index === 0 ? { ...node, fullMatrixBlocked: false } : node)),
    };

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

  // ---------------------------------------------------------- withdrawn evidence
  //
  // The defect these pin: `access-token-2026-08-o1` and `delegated-wallet-2026-08-o1` were recorded
  // as counted clean passes and read as "already solved". Both were graded against packages whose
  // shipped starter was a complete passing solution — 0 failures out of 384 and out of 804 — so
  // neither pass could have come out any other way, and neither says anything about the mechanism.

  it("refuses a node that admits its package leaked and still reports a counted clean pass", () => {
    // The exact shape of the shipped bug, expressed in one record.
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      nodes: lineage.nodes.map((node) => ({
        ...node,
        smoke: { ...node.smoke, status: "clean-pass", counted: true, scenariosFailed: 0 },
      })),
    }));

    expect(() => parseFamilyLineage(invalid, "lineage")).toThrowError(
      expect.objectContaining({ code: "LINEAGE_WITHDRAWN_EVIDENCE_CLAIMED_INFORMATIVE" }),
    );
  });

  it("refuses a node that reports a counted uncounted-status solve alongside a withdrawal", () => {
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      nodes: lineage.nodes.map((node, index) =>
        index === 0 ? { ...node, smoke: { ...node.smoke, counted: true } } : node,
      ),
    }));

    expect(() => parseFamilyLineage(invalid, "lineage")).toThrowError(
      expect.objectContaining({ code: "LINEAGE_WITHDRAWN_EVIDENCE_CLAIMED_INFORMATIVE" }),
    );
  });

  it("refuses a withdrawn smoke status with no written withdrawal by LINEAGE_WITHDRAWAL_UNREASONED", () => {
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      nodes: lineage.nodes.map((node) => ({ ...node, evidenceWithdrawn: null })),
    }));

    expect(() => parseFamilyLineage(invalid, "lineage")).toThrowError(
      expect.objectContaining({ code: "LINEAGE_WITHDRAWAL_UNREASONED" }),
    );
  });

  it("refuses a withdrawal whose explanation is too short to be one", () => {
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      nodes: lineage.nodes.map((node) =>
        node.evidenceWithdrawn === null
          ? node
          : { ...node, evidenceWithdrawn: { ...node.evidenceWithdrawn, explanation: "leaked" } },
      ),
    }));

    expect(() => parseFamilyLineage(invalid, "lineage")).toThrowError(
      expect.objectContaining({ code: "LINEAGE_WITHDRAWAL_UNREASONED" }),
    );
  });

  it("refuses a withdrawn scoring rule with no stated reason by LINEAGE_FEEDBACK_WITHDRAWN_UNREASONED", () => {
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      learning: {
        ...lineage.learning,
        scoringFeedback: lineage.learning.scoringFeedback.map((rule, index) =>
          index === 0 ? { ...rule, withdrawnReason: null } : rule,
        ),
      },
    }));

    expect(() => parseFamilyLineage(invalid, "lineage")).toThrowError(
      expect.objectContaining({ code: "LINEAGE_FEEDBACK_WITHDRAWN_UNREASONED" }),
    );
  });

  it("refuses to leave lineage-derived scoring active once the lineage evidence is withdrawn", () => {
    // The half-fix that would have been worse than no fix: retract the verdict in the lineage
    // record while 22 penalties and 66 boosts derived from it keep moving the discovery ranking.
    const { registry, workbench, promotions } = loaded();
    const invalid = mutateLineage((lineage) => ({
      ...lineage,
      learning: {
        ...lineage.learning,
        scoringFeedback: lineage.learning.scoringFeedback.map((rule) => ({
          ...rule,
          status: "active",
          withdrawnReason: null,
        })),
      },
    }));

    expect(() => assertLineagesValid([invalid], registry, workbench, promotions)).toThrowError(
      expect.objectContaining({ code: "LINEAGE_REALLOCATION_ON_WITHDRAWN_EVIDENCE" }),
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
  // This test previously ran against the SHIPPED record and asserted:
  //   const lineage = baseLineage();
  //   expect(evaluation.verdict).toBe("lineage_solved_twice");
  //   expect(evaluation.decision).toBe("reallocate");
  //   expect(evaluation.estimatedMatrixSpendSavedUsd).toBe(123.69);
  // Those three lines were the bug, not a check on it: the record's two clean passes were graded
  // against packages containing their own solution. The solved-twice branch is still worth
  // covering, so it now runs against a lineage that explicitly has NOT withdrawn its evidence.
  it("turns two informative clean smoke passes into solved-twice reallocation", () => {
    const evaluation = evaluateLineage(informativeLineage(), runtimeMap());

    expect(evaluation.verdict).toBe("lineage_solved_twice");
    expect(evaluation.decision).toBe("reallocate");
    expect(evaluation.difficultyIncreased).toBe(false);
    expect(evaluation.crossLabProven).toBe(false);
    expect(evaluation.matrixBlocks).toBe(2);
    expect(evaluation.informedMatrixBlocks).toBe(2);
    expect(evaluation.estimatedMatrixSpendSavedUsd).toBe(123.69);
    expect(evaluation.estimatedMatrixSpendDeferredUsd).toBe(0);
    expect(evaluation.nextAction).toMatch(/reallocate/);
  });

  it("reads the shipped record as evidence withdrawn, not as solved", () => {
    const evaluation = evaluateLineage(baseLineage());

    expect(evaluation.verdict).toBe("lineage_evidence_withdrawn");
    expect(evaluation.decision).toBe("re-measure");
    expect(evaluation.reason).toMatch(/unknown/);
    expect(evaluation.nodes.map((node) => node.smokeStatus)).toEqual(["withdrawn", "withdrawn"]);
    expect(evaluation.nodes.every((node) => node.informativeSmokeEvidence)).toBe(false);
    expect(evaluation.nodes.map((node) => node.evidenceWithdrawn?.reason)).toEqual([
      "package-leak",
      "package-leak",
    ]);
    expect(evaluation.crossLabProven).toBe(false);
  });

  it("does not credit a saving to a matrix blocked on uninformative evidence", () => {
    // $123.69 = 2 x $61.85 was a count of nodes with `fullMatrixBlocked`, and never read whether the
    // smoke that justified the block said anything. Both blocks rest on withdrawn passes, so the
    // matrix was not avoided: it is deferred, and owed as soon as the families are re-measured.
    //
    // The per-matrix figure has moved twice, both times toward measurement. It was a $48.66 constant
    // from a single 2026-08 matrix; then 6 x $9.95 from the mean of 19 real trials; and now
    // $61.85, which is 6 VERDICTS at the $9.62 mean of the 28 recorded runs that produced one,
    // divided by (1 - 0.0667) because 2 of 30 runs are bought and never return. A plan that prices
    // only the runs that finished is the error this figure exists to stop repeating.
    const evaluation = evaluateLineage(baseLineage(), runtimeMap({}));

    expect(evaluation.matrixBlocks).toBe(2);
    expect(evaluation.informedMatrixBlocks).toBe(0);
    expect(evaluation.deferredMatrixBlocks).toBe(2);
    expect(evaluation.estimatedMatrixSpendSavedUsd).toBe(0);
    expect(evaluation.estimatedMatrixSpendDeferredUsd).toBe(123.69);
    expect(evaluation.nodes.every((node) => node.matrixSpendDeferred)).toBe(true);
  });

  it("treats a descendant failure after parent pass as confirmed harder", () => {
    const evaluation = evaluateLineage(
      informativeLineage(),
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
      informativeLineage(),
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
      informativeLineage(),
      runtimeMap({
        "delegated-wallet-scope-reconciliation": {
          currentPackageHash: "different-current-hash",
        },
      }),
    );

    expect(evaluation.verdict).toBe("lineage_blocked_by_stale_evidence");
    expect(evaluation.decision).toBe("repair");
  });

  // This test previously asserted, against the SHIPPED record:
  //   expect(reallocation.penalized...).toContain("access-token-scope-expansion");
  //   expect(reallocation.boosted.length).toBeGreaterThanOrEqual(5);
  //   expect(reallocation.nextRecommendations.length).toBe(5);
  //   expect(reallocation.nextRecommendations.map(...)).toContain("deployment-model-alias-rollout-drift");
  // Every one of those adjustments was derived from the two withdrawn passes. The mechanism is
  // still worth covering, so the "feedback applies" case moved to a lineage with live evidence
  // below, and this test now pins that the shipped record moves no score at all.
  it("withdraws every scoring adjustment derived from the withdrawn lineage verdict", () => {
    const { workbench, lineages } = loaded();
    const evaluations = evaluateLineages(lineages, runtimeMap());
    const reallocation = planPortfolioReallocation(lineages, evaluations, workbench);
    const discoveryFeedback = lineageFeedbackForDiscovery(reallocation);

    expect(reallocation.verdict).toBe("lineage_evidence_withdrawn");
    expect(reallocation.penalized).toEqual([]);
    expect(reallocation.boosted).toEqual([]);
    expect(reallocation.feedback).toEqual([]);
    expect(reallocation.nextRecommendations).toEqual([]);
    expect(discoveryFeedback).toEqual([]);
    expect(reallocation.matrixSpendSavedUsd).toBe(0);
    expect(reallocation.matrixSpendDeferredUsd).toBe(123.69);
    // Withdrawn, not deleted: all eight rules stay on the record with a stated reason.
    expect(reallocation.reallocationStatus).toBe("withdrawn");
    expect(reallocation.withdrawnFeedback).toHaveLength(8);
    expect(reallocation.withdrawnFeedback.map((rule) => rule.id)).toContain(
      "penalize-permission-boundary-only",
    );
    expect(reallocation.withdrawnFeedback.every((rule) => (rule.withdrawnReason ?? "").length >= 40)).toBe(
      true,
    );
  });

  it("still labels and applies scoring feedback while the lineage evidence stands", () => {
    const { workbench, lineages } = loaded();
    const live = [informativeLineage()];
    const evaluations = evaluateLineages(live, runtimeMap());
    const reallocation = planPortfolioReallocation(live, evaluations, workbench);
    const discoveryFeedback = lineageFeedbackForDiscovery(reallocation);

    expect(reallocation.penalized.map((item) => item.candidateId)).toContain("access-token-scope-expansion");
    expect(reallocation.penalized.map((item) => item.candidateId)).toContain(
      "delegated-wallet-scope-reconciliation",
    );
    expect(reallocation.boosted.length).toBeGreaterThanOrEqual(5);
    expect(reallocation.nextRecommendations.length).toBe(5);
    expect(reallocation.nextRecommendations.map((item) => item.candidateId)).toContain(
      "deployment-model-alias-rollout-drift",
    );
    expect(
      discoveryFeedback.every((item) => item.sourceId === "lineage:access-token-authority-lineage"),
    ).toBe(true);
    expect(discoveryFeedback.every((item) => /lineage result/.test(item.reason))).toBe(true);
    expect(lineages).toHaveLength(1);
  });

  it("renders the lineage learning report deterministically", () => {
    const { workbench, lineages } = loaded();
    const evaluations = evaluateLineages(lineages, runtimeMap());
    const reallocation = planPortfolioReallocation(lineages, evaluations, workbench);
    const first = renderLineageLearningReport(lineages, evaluations, reallocation);
    const second = renderLineageLearningReport(lineages, evaluations, reallocation);

    expect(first).toBe(second);
    expect(first).toContain("Lineage Kill + Portfolio Reallocation v1");
    // Previously: expect(first).toContain("lineage_solved_twice") — the report's headline verdict.
    expect(first).toContain("lineage_evidence_withdrawn");
    expect(first).toContain("matrix spend deferred and still owed | $123.69");
    expect(first).toContain("matrix spend avoided | $0.00");
    expect(first).toContain("evidence withdrawn (`package-leak`)");
    expect(first).toContain("### Withdrawn Adjustments");
    expect(first).toContain("access-token-2026-08-o1");
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
