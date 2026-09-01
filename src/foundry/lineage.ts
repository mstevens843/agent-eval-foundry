import { MEASURED_DEFAULTS } from "./budget.js";
import type {
  DiscoveryCandidate,
  DiscoveryCandidateEvidence,
  DiscoveryWorkbench,
} from "./discovery-workbench.js";
import { scoreDiscoveryCandidates } from "./discovery-workbench.js";
import type { ProbeToFamilyPromotion } from "./promotion.js";
import type { Registry } from "./registry.js";
import {
  fail,
  id,
  isRecord,
  num,
  numNullable,
  oneOf,
  requiredList,
  str,
  strArray,
  strNullable,
  uniqueIds,
} from "./schema.js";

export const LINEAGE_NODE_ROLES = ["root", "descendant"] as const;
export type LineageNodeRole = (typeof LINEAGE_NODE_ROLES)[number];

export const LINEAGE_LOCAL_EVIDENCE_STATUSES = ["not-built", "local-pass", "local-fail"] as const;
export type LineageLocalEvidenceStatus = (typeof LINEAGE_LOCAL_EVIDENCE_STATUSES)[number];

export const LINEAGE_SMOKE_STATUSES = [
  "not-run",
  "clean-pass",
  "on-target-failure",
  "off-target-failure",
  "uncounted",
] as const;
export type LineageSmokeStatus = (typeof LINEAGE_SMOKE_STATUSES)[number];

export const LINEAGE_TRANSFER_EVIDENCE = ["none", "declared", "measured"] as const;
export type LineageTransferEvidence = (typeof LINEAGE_TRANSFER_EVIDENCE)[number];

export const LINEAGE_VERDICTS = [
  "lineage_promising",
  "lineage_confirmed_harder",
  "lineage_solved_once",
  "lineage_solved_twice",
  "lineage_killed_for_now",
  "lineage_needs_new_mechanism",
  "lineage_requires_cross_lab_before_more_build",
  "lineage_blocked_by_missing_trials",
  "lineage_blocked_by_stale_evidence",
] as const;
export type LineageVerdict = (typeof LINEAGE_VERDICTS)[number];

export const LINEAGE_DECISIONS = [
  "continue",
  "hold",
  "kill",
  "evolve",
  "reallocate",
  "repair",
  "run-smoke",
  "run-cross-lab",
] as const;
export type LineageDecision = (typeof LINEAGE_DECISIONS)[number];

export interface LineageSmokeRecord {
  readonly status: LineageSmokeStatus;
  readonly runId: string | null;
  readonly provider: string | null;
  readonly model: string | null;
  readonly subjectId: string | null;
  readonly counted: boolean;
  readonly scenariosGraded: number;
  readonly scenariosFailed: number;
  readonly challengeHash: string | null;
  readonly countsReason: string;
}

export interface LineageNode {
  readonly familyId: string;
  readonly role: LineageNodeRole;
  readonly sourceCandidateId: string;
  readonly sourceProbeId: string | null;
  readonly promotionId: string | null;
  readonly packageHash: string | null;
  readonly localEvidenceStatus: LineageLocalEvidenceStatus;
  readonly scenarioCount: number | null;
  readonly mutantAxes: number | null;
  readonly smoke: LineageSmokeRecord;
  readonly fullMatrixBlocked: boolean;
  readonly transferEvidence: LineageTransferEvidence;
  readonly notes: readonly string[];
}

export interface LineageEdge {
  readonly fromFamilyId: string;
  readonly toFamilyId: string;
  readonly sourceProbeId: string;
  readonly operatorsApplied: readonly string[];
  readonly whatStayedFixed: readonly string[];
  readonly whatChanged: readonly string[];
  readonly preRegisteredConfirmSignal: string;
  readonly preRegisteredKillSignal: string;
}

export interface LineageScoringFeedbackRule {
  readonly id: string;
  readonly kind: "penalty" | "boost";
  readonly target: "candidate" | "mechanism" | "domain" | "surface-tag";
  readonly selector: string;
  readonly adjustment: number;
  readonly reason: string;
  readonly evidenceLabel: string;
}

export interface LineageReallocationPlan {
  readonly reason: string;
  readonly candidateIds: readonly string[];
  readonly forbiddenClusters: readonly string[];
  readonly exactNextBuildRecommendation: string;
}

export interface LineageLearning {
  readonly summary: string;
  readonly whatScoringShouldLearn: readonly string[];
  readonly scoringFeedback: readonly LineageScoringFeedbackRule[];
  readonly reallocation: LineageReallocationPlan;
}

export interface FamilyLineage {
  readonly id: string;
  readonly rootCandidateId: string;
  readonly rootProbeId: string;
  readonly rootFamilyId: string;
  readonly preservedMechanism: string;
  readonly nodes: readonly LineageNode[];
  readonly edges: readonly LineageEdge[];
  readonly learning: LineageLearning;
  readonly crossLabClaimed: boolean;
}

export interface LineageRuntimeFamilyEvidence {
  readonly familyId: string;
  readonly currentPackageHash: string | null;
  readonly localEvidencePass: boolean;
  readonly countedSmokeTrials: number;
  readonly countedSmokeSolves: number;
  readonly countedSmokeFailures: number;
  readonly providerFamilies: readonly string[];
  readonly subjectIds: readonly string[];
  readonly fullMatrixReady: boolean;
  readonly fullMatrixBlocked: boolean;
  readonly transferDeclared: boolean;
  readonly smokeDiagnosis:
    | "none"
    | "clean"
    | "on-target"
    | "off-target"
    | "provider-refusal"
    | "infrastructure-error";
  readonly scenarioCount: number | null;
  readonly mutantAxes: number | null;
}

export interface LineageNodeEvaluation {
  readonly familyId: string;
  readonly stale: boolean;
  readonly localEvidenceStatus: LineageLocalEvidenceStatus;
  readonly smokeStatus: LineageSmokeStatus;
  readonly countedSmokeTrials: number;
  readonly countedSmokeSolves: number;
  readonly countedSmokeFailures: number;
  readonly providerFamilies: readonly string[];
  readonly subjectIds: readonly string[];
  readonly fullMatrixBlocked: boolean;
  readonly transferDeclared: boolean;
  readonly packageHash: string | null;
  readonly currentPackageHash: string | null;
  readonly scenarioCount: number | null;
  readonly mutantAxes: number | null;
}

export interface LineageEvaluation {
  readonly lineageId: string;
  readonly verdict: LineageVerdict;
  readonly decision: LineageDecision;
  readonly reason: string;
  readonly nodes: readonly LineageNodeEvaluation[];
  readonly difficultyIncreased: boolean;
  readonly axisDiversityIncreased: boolean;
  readonly crossLabProven: boolean;
  readonly matrixBlocks: number;
  readonly estimatedMatrixSpendSavedUsd: number;
  readonly nextAction: string;
}

export interface PortfolioFeedbackApplication {
  readonly candidateId: string;
  readonly title: string;
  readonly domain: string;
  readonly baseScore: number;
  readonly adjustedScore: number;
  readonly totalAdjustment: number;
  readonly mechanismCluster: string;
  readonly recommendedAction: string;
  readonly appliedFeedback: readonly LineageScoringFeedbackRule[];
}

export interface PortfolioReallocation {
  readonly lineageId: string;
  readonly verdict: LineageVerdict;
  readonly matrixSpendSavedUsd: number;
  readonly feedback: readonly PortfolioFeedbackApplication[];
  readonly penalized: readonly PortfolioFeedbackApplication[];
  readonly boosted: readonly PortfolioFeedbackApplication[];
  readonly nextRecommendations: readonly PortfolioFeedbackApplication[];
  readonly exactNextBuildRecommendation: string;
}

const obj = (v: unknown, path: string): Record<string, unknown> =>
  isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");

const bool = (v: unknown, path: string): boolean =>
  typeof v === "boolean" ? v : fail("E_TYPE", path, "expected a boolean");

const requiredNumbers = (v: unknown, path: string): number => {
  const n = num(v, path);
  if (n < 0) fail("E_TYPE", path, "expected a non-negative number");
  return n;
};

const parseSmoke = (v: unknown, path: string): LineageSmokeRecord => {
  const o = obj(v, path);
  return {
    status: oneOf(o.status, `${path}.status`, LINEAGE_SMOKE_STATUSES),
    runId: strNullable(o.runId, `${path}.runId`),
    provider: strNullable(o.provider, `${path}.provider`),
    model: strNullable(o.model, `${path}.model`),
    subjectId: strNullable(o.subjectId, `${path}.subjectId`),
    counted: bool(o.counted, `${path}.counted`),
    scenariosGraded: requiredNumbers(o.scenariosGraded, `${path}.scenariosGraded`),
    scenariosFailed: requiredNumbers(o.scenariosFailed, `${path}.scenariosFailed`),
    challengeHash: strNullable(o.challengeHash, `${path}.challengeHash`),
    countsReason: str(o.countsReason, `${path}.countsReason`),
  };
};

const parseNode = (v: unknown, path: string): LineageNode => {
  const o = obj(v, path);
  const smoke = parseSmoke(o.smoke, `${path}.smoke`);
  const fullMatrixBlocked = bool(o.fullMatrixBlocked, `${path}.fullMatrixBlocked`);
  if (smoke.status === "clean-pass" && smoke.counted && !fullMatrixBlocked) {
    fail(
      "LINEAGE_MATRIX_AFTER_CLEAN_PASS",
      `${path}.fullMatrixBlocked`,
      "a clean counted smoke pass must block matrix spend unless a separate matrix reason exists",
    );
  }
  return {
    familyId: id(o.familyId, `${path}.familyId`),
    role: oneOf(o.role, `${path}.role`, LINEAGE_NODE_ROLES),
    sourceCandidateId: id(o.sourceCandidateId, `${path}.sourceCandidateId`),
    sourceProbeId: strNullable(o.sourceProbeId, `${path}.sourceProbeId`),
    promotionId: strNullable(o.promotionId, `${path}.promotionId`),
    packageHash: strNullable(o.packageHash, `${path}.packageHash`),
    localEvidenceStatus: oneOf(
      o.localEvidenceStatus,
      `${path}.localEvidenceStatus`,
      LINEAGE_LOCAL_EVIDENCE_STATUSES,
    ),
    scenarioCount: numNullable(o.scenarioCount, `${path}.scenarioCount`),
    mutantAxes: numNullable(o.mutantAxes, `${path}.mutantAxes`),
    smoke,
    fullMatrixBlocked,
    transferEvidence: oneOf(o.transferEvidence, `${path}.transferEvidence`, LINEAGE_TRANSFER_EVIDENCE),
    notes: strArray(o.notes, `${path}.notes`),
  };
};

const parseEdge = (v: unknown, path: string): LineageEdge => {
  const o = obj(v, path);
  const fixed = requiredList(
    o.whatStayedFixed,
    `${path}.whatStayedFixed`,
    "LINEAGE_NO_FIXED_DELTA",
    "a lineage edge must say what mechanism pressure survived",
  );
  const changed = requiredList(
    o.whatChanged,
    `${path}.whatChanged`,
    "LINEAGE_NO_CHANGED_DELTA",
    "a lineage edge must say how the descendant changed the parent",
  );
  return {
    fromFamilyId: id(o.fromFamilyId, `${path}.fromFamilyId`),
    toFamilyId: id(o.toFamilyId, `${path}.toFamilyId`),
    sourceProbeId: id(o.sourceProbeId, `${path}.sourceProbeId`),
    operatorsApplied: requiredList(
      o.operatorsApplied,
      `${path}.operatorsApplied`,
      "LINEAGE_NO_CHANGED_DELTA",
      "lineage edges must record evolution operators",
    ),
    whatStayedFixed: fixed,
    whatChanged: changed,
    preRegisteredConfirmSignal: str(o.preRegisteredConfirmSignal, `${path}.preRegisteredConfirmSignal`),
    preRegisteredKillSignal: str(o.preRegisteredKillSignal, `${path}.preRegisteredKillSignal`),
  };
};

const parseFeedbackRule = (v: unknown, path: string): LineageScoringFeedbackRule => {
  const o = obj(v, path);
  const evidenceLabel = str(o.evidenceLabel, `${path}.evidenceLabel`);
  if (!/lineage/i.test(evidenceLabel)) {
    fail(
      "LINEAGE_FEEDBACK_UNLABELLED",
      `${path}.evidenceLabel`,
      "portfolio scoring feedback must be explicitly labelled as lineage-derived evidence",
    );
  }
  return {
    id: id(o.id, `${path}.id`),
    kind: oneOf(o.kind, `${path}.kind`, ["penalty", "boost"] as const),
    target: oneOf(o.target, `${path}.target`, ["candidate", "mechanism", "domain", "surface-tag"] as const),
    selector: str(o.selector, `${path}.selector`),
    adjustment: num(o.adjustment, `${path}.adjustment`),
    reason: str(o.reason, `${path}.reason`),
    evidenceLabel,
  };
};

const parseReallocation = (v: unknown, path: string): LineageReallocationPlan => {
  const o = obj(v, path);
  const candidateIds = requiredList(
    o.candidateIds,
    `${path}.candidateIds`,
    "LINEAGE_NO_REALLOCATION",
    "a solved lineage must name a different branch to receive the next build budget",
  );
  return {
    reason: str(o.reason, `${path}.reason`),
    candidateIds,
    forbiddenClusters: strArray(o.forbiddenClusters, `${path}.forbiddenClusters`),
    exactNextBuildRecommendation: str(o.exactNextBuildRecommendation, `${path}.exactNextBuildRecommendation`),
  };
};

const parseLearning = (v: unknown, path: string): LineageLearning => {
  const o = obj(v, path);
  return {
    summary: str(o.summary, `${path}.summary`),
    whatScoringShouldLearn: requiredList(
      o.whatScoringShouldLearn,
      `${path}.whatScoringShouldLearn`,
      "LINEAGE_NO_REALLOCATION",
      "lineage learning must say what scoring should learn",
    ),
    scoringFeedback: Array.isArray(o.scoringFeedback)
      ? o.scoringFeedback.map((item, i) => parseFeedbackRule(item, `${path}.scoringFeedback[${i}]`))
      : fail("E_TYPE", `${path}.scoringFeedback`, "expected an array"),
    reallocation: parseReallocation(o.reallocation, `${path}.reallocation`),
  };
};

export function parseFamilyLineage(v: unknown, path: string): FamilyLineage {
  const o = obj(v, path);
  const nodes = Array.isArray(o.nodes)
    ? o.nodes.map((item, i) => parseNode(item, `${path}.nodes[${i}]`))
    : fail("E_TYPE", `${path}.nodes`, "expected an array");
  if (!nodes.some((node) => node.role === "root")) {
    fail("LINEAGE_NO_ROOT", `${path}.nodes`, "a lineage must include one root node");
  }
  const edges = Array.isArray(o.edges)
    ? o.edges.map((item, i) => parseEdge(item, `${path}.edges[${i}]`))
    : fail("E_TYPE", `${path}.edges`, "expected an array");
  return {
    id: id(o.id, `${path}.id`),
    rootCandidateId: id(o.rootCandidateId, `${path}.rootCandidateId`),
    rootProbeId: id(o.rootProbeId, `${path}.rootProbeId`),
    rootFamilyId: id(o.rootFamilyId, `${path}.rootFamilyId`),
    preservedMechanism: str(o.preservedMechanism, `${path}.preservedMechanism`),
    nodes,
    edges,
    learning: parseLearning(o.learning, `${path}.learning`),
    crossLabClaimed: bool(o.crossLabClaimed, `${path}.crossLabClaimed`),
  };
}

export function parseFamilyLineages(v: unknown, path = "lineages"): readonly FamilyLineage[] {
  const list = Array.isArray(v)
    ? v.map((item, i) => parseFamilyLineage(item, `${path}[${i}]`))
    : fail("E_TYPE", path, "expected an array");
  uniqueIds(
    list.map((lineage) => lineage.id),
    path,
  );
  return list;
}

export function assertLineagesValid(
  lineages: readonly FamilyLineage[],
  registry: Registry,
  workbench: DiscoveryWorkbench,
  promotions: readonly ProbeToFamilyPromotion[] = [],
): void {
  const familyIds = new Set(registry.shapes.map((shape) => shape.familyId));
  const candidateIds = new Set(workbench.candidates.map((candidate) => candidate.id));
  const promotionIds = new Set(promotions.map((promotion) => promotion.id));
  const knownProbeIds = new Set(promotions.map((promotion) => promotion.sourceProbeId));
  for (const [i, lineage] of lineages.entries()) {
    const path = `lineages[${i}]`;
    const nodeIds = new Set(lineage.nodes.map((node) => node.familyId));
    if (!nodeIds.has(lineage.rootFamilyId)) {
      fail("LINEAGE_NO_ROOT", `${path}.rootFamilyId`, "rootFamilyId must identify a node in the lineage");
    }
    if (!candidateIds.has(lineage.rootCandidateId)) {
      fail("LINEAGE_NO_ROOT", `${path}.rootCandidateId`, "root candidate must exist in the discovery pool");
    }
    if (!knownProbeIds.has(lineage.rootProbeId)) {
      fail("LINEAGE_NO_ROOT", `${path}.rootProbeId`, "root probe must exist in promotion data");
    }
    for (const node of lineage.nodes) {
      if (!familyIds.has(node.familyId)) {
        fail("LINEAGE_NODE_UNKNOWN_FAMILY", `${path}.nodes`, `unknown family "${node.familyId}"`);
      }
      if (!candidateIds.has(node.sourceCandidateId)) {
        fail(
          "LINEAGE_NO_ROOT",
          `${path}.nodes.${node.familyId}.sourceCandidateId`,
          "source candidate must exist in the discovery pool",
        );
      }
      if (node.promotionId !== null && !promotionIds.has(node.promotionId)) {
        fail(
          "LINEAGE_NODE_UNKNOWN_FAMILY",
          `${path}.nodes.${node.familyId}.promotionId`,
          `unknown promotion "${node.promotionId}"`,
        );
      }
    }
    for (const edge of lineage.edges) {
      if (!nodeIds.has(edge.fromFamilyId) || !nodeIds.has(edge.toFamilyId)) {
        fail(
          "LINEAGE_EDGE_DANGLING_NODE",
          `${path}.edges`,
          "lineage edge endpoints must both appear as nodes in the same lineage",
        );
      }
    }
    if (lineage.crossLabClaimed) {
      const providers = new Set(
        lineage.nodes.flatMap((node) =>
          node.smoke.counted && node.smoke.provider !== null ? [node.smoke.provider] : [],
        ),
      );
      if (providers.size < 2) {
        fail(
          "LINEAGE_CROSS_LAB_FROM_SAME_PROVIDER",
          `${path}.crossLabClaimed`,
          "same-provider smoke solves cannot be reported as cross-lab evidence",
        );
      }
    }
  }
}

export function evaluateLineage(
  lineage: FamilyLineage,
  runtime: ReadonlyMap<string, LineageRuntimeFamilyEvidence> = new Map(),
): LineageEvaluation {
  const nodes = lineage.nodes.map((node) => evaluateNode(node, runtime.get(node.familyId)));
  const root = nodes.find((node) => node.familyId === lineage.rootFamilyId) ?? nodes[0];
  const descendants = nodes.filter((node) => node.familyId !== lineage.rootFamilyId);
  const latest = descendants[descendants.length - 1] ?? null;
  const stale = nodes.some((node) => node.stale);
  const cleanCount = nodes.filter(
    (node) => node.smokeStatus === "clean-pass" && node.countedSmokeTrials > 0,
  ).length;
  const failedDescendant = latest !== null && latest.countedSmokeFailures > 0;
  const providerFamilies = new Set(nodes.flatMap((node) => node.providerFamilies));
  const subjectIds = new Set(nodes.flatMap((node) => node.subjectIds));
  const sameSubjectAcrossCleanLineage =
    subjectIds.size === 1 && cleanCount >= 2 && nodes.every((node) => node.countedSmokeTrials > 0);
  const matrixBlocks = nodes.filter((node) => node.fullMatrixBlocked).length;
  const axisDiversityIncreased =
    root?.mutantAxes !== null &&
    latest?.mutantAxes !== null &&
    root !== undefined &&
    latest !== null &&
    latest.mutantAxes > root.mutantAxes;
  let verdict: LineageVerdict;
  let decision: LineageDecision;
  let reason: string;
  let nextAction: string;
  if (stale) {
    verdict = "lineage_blocked_by_stale_evidence";
    decision = "repair";
    reason = "at least one lineage node was recorded against a stale package hash";
    nextAction = "reissue package hash and rerun or supersede affected smoke evidence";
  } else if (nodes.some((node) => node.countedSmokeTrials === 0)) {
    verdict = "lineage_blocked_by_missing_trials";
    decision = "run-smoke";
    reason = "at least one lineage node lacks a counted smoke trial";
    nextAction = "run one current-hash smoke trial before judging the lineage";
  } else if (root?.smokeStatus === "clean-pass" && failedDescendant) {
    verdict = "lineage_confirmed_harder";
    decision = "continue";
    reason = "the descendant failed on counted smoke where the parent passed cleanly";
    nextAction = "diagnose failure, then consider transfer evidence before any full matrix";
  } else if (cleanCount >= 2 && sameSubjectAcrossCleanLineage) {
    verdict = "lineage_solved_twice";
    decision = "reallocate";
    reason = "the same subject/provider solved both parent and descendant cleanly";
    nextAction = "pause this lineage and reallocate build budget to a different mechanism cluster";
  } else if (cleanCount >= 2) {
    verdict =
      providerFamilies.size < 2 ? "lineage_requires_cross_lab_before_more_build" : "lineage_killed_for_now";
    decision = providerFamilies.size < 2 ? "run-cross-lab" : "reallocate";
    reason =
      providerFamilies.size < 2
        ? "multiple clean solves exist, but only one provider family is represented"
        : "clean solves across the available lineage make further local hardening low priority";
    nextAction =
      providerFamilies.size < 2
        ? "import a non-OpenAI current-hash smoke before building another descendant"
        : "reallocate budget to a different mechanism cluster";
  } else if (cleanCount === 1) {
    verdict = "lineage_solved_once";
    decision = "evolve";
    reason = "one clean smoke pass should trigger hardening rather than matrix spend";
    nextAction = "build or smoke-test one harder descendant";
  } else {
    verdict = "lineage_promising";
    decision = "continue";
    reason = "lineage has not yet produced repeated clean solves";
    nextAction = "continue validation-mode evidence in the cheapest available step";
  }
  return {
    lineageId: lineage.id,
    verdict,
    decision,
    reason,
    nodes,
    difficultyIncreased: root?.smokeStatus === "clean-pass" && failedDescendant,
    axisDiversityIncreased,
    crossLabProven: providerFamilies.size >= 2,
    matrixBlocks,
    estimatedMatrixSpendSavedUsd: Math.round(matrixBlocks * MEASURED_DEFAULTS.usdPerMatrix * 100) / 100,
    nextAction,
  };
}

export function evaluateLineages(
  lineages: readonly FamilyLineage[],
  runtime: ReadonlyMap<string, LineageRuntimeFamilyEvidence> = new Map(),
): readonly LineageEvaluation[] {
  return lineages
    .map((lineage) => evaluateLineage(lineage, runtime))
    .sort((a, b) => a.lineageId.localeCompare(b.lineageId));
}

function evaluateNode(
  node: LineageNode,
  runtime: LineageRuntimeFamilyEvidence | undefined,
): LineageNodeEvaluation {
  const currentPackageHash = runtime?.currentPackageHash ?? node.packageHash;
  const packageHash = node.packageHash;
  const stale = packageHash !== null && currentPackageHash !== null && packageHash !== currentPackageHash;
  const countedSmokeTrials = runtime?.countedSmokeTrials ?? (node.smoke.counted ? 1 : 0);
  const countedSmokeSolves =
    runtime?.countedSmokeSolves ?? (node.smoke.counted && node.smoke.scenariosFailed === 0 ? 1 : 0);
  const countedSmokeFailures =
    runtime?.countedSmokeFailures ?? (node.smoke.counted && node.smoke.scenariosFailed > 0 ? 1 : 0);
  const smokeStatus =
    runtime === undefined
      ? node.smoke.status
      : countedSmokeTrials === 0
        ? "not-run"
        : countedSmokeFailures > 0
          ? runtime.smokeDiagnosis === "on-target"
            ? "on-target-failure"
            : "off-target-failure"
          : "clean-pass";
  return {
    familyId: node.familyId,
    stale,
    localEvidenceStatus:
      runtime === undefined
        ? node.localEvidenceStatus
        : runtime.localEvidencePass
          ? "local-pass"
          : "local-fail",
    smokeStatus,
    countedSmokeTrials,
    countedSmokeSolves,
    countedSmokeFailures,
    providerFamilies:
      runtime?.providerFamilies ?? (node.smoke.provider === null ? [] : [node.smoke.provider]),
    subjectIds: runtime?.subjectIds ?? (node.smoke.subjectId === null ? [] : [node.smoke.subjectId]),
    fullMatrixBlocked: runtime?.fullMatrixBlocked ?? node.fullMatrixBlocked,
    transferDeclared: runtime?.transferDeclared ?? node.transferEvidence !== "none",
    packageHash,
    currentPackageHash,
    scenarioCount: runtime?.scenarioCount ?? node.scenarioCount,
    mutantAxes: runtime?.mutantAxes ?? node.mutantAxes,
  };
}

export function planPortfolioReallocation(
  lineages: readonly FamilyLineage[],
  evaluations: readonly LineageEvaluation[],
  workbench: DiscoveryWorkbench,
): PortfolioReallocation {
  const lineage = lineages[0];
  const evaluation = evaluations[0];
  if (lineage === undefined || evaluation === undefined) {
    return {
      lineageId: "none",
      verdict: "lineage_blocked_by_missing_trials",
      matrixSpendSavedUsd: 0,
      feedback: [],
      penalized: [],
      boosted: [],
      nextRecommendations: [],
      exactNextBuildRecommendation: "No lineage is recorded yet.",
    };
  }
  const scores = new Map(
    scoreDiscoveryCandidates(workbench.candidates).map((score) => [score.candidateId, score]),
  );
  const applications = workbench.candidates
    .map((candidate) =>
      applyFeedback(candidate, lineage.learning.scoringFeedback, scores.get(candidate.id)?.totalScore ?? 0),
    )
    .sort(
      (a, b) =>
        b.adjustedScore - a.adjustedScore ||
        b.totalAdjustment - a.totalAdjustment ||
        a.candidateId.localeCompare(b.candidateId),
    );
  const forbidden = new Set(lineage.learning.reallocation.forbiddenClusters);
  const nextRecommendations = distinctClusterRecommendations(
    applications.filter((item) => item.totalAdjustment >= 0 && !forbidden.has(item.mechanismCluster)),
    lineage.learning.reallocation.candidateIds,
  );
  return {
    lineageId: lineage.id,
    verdict: evaluation.verdict,
    matrixSpendSavedUsd: evaluation.estimatedMatrixSpendSavedUsd,
    feedback: applications.filter((item) => item.appliedFeedback.length > 0),
    penalized: applications.filter((item) => item.totalAdjustment < 0),
    boosted: applications.filter((item) => item.totalAdjustment > 0),
    nextRecommendations,
    exactNextBuildRecommendation: lineage.learning.reallocation.exactNextBuildRecommendation,
  };
}

export function lineageFeedbackForDiscovery(
  reallocation: PortfolioReallocation,
): readonly DiscoveryCandidateEvidence[] {
  return reallocation.feedback.map((item) => ({
    candidateId: item.candidateId,
    status: item.totalAdjustment > 0 ? "lineage-boosted" : "lineage-penalized",
    sourceId: `lineage:${reallocation.lineageId}`,
    verdict: reallocation.verdict,
    rankBoost: item.totalAdjustment,
    reason: `${item.totalAdjustment > 0 ? "boost" : "penalty"} from lineage result: ${item.appliedFeedback
      .map((feedback) => feedback.reason)
      .join("; ")}`,
  }));
}

function applyFeedback(
  candidate: DiscoveryCandidate,
  rules: readonly LineageScoringFeedbackRule[],
  baseScore: number,
): PortfolioFeedbackApplication {
  const appliedFeedback = rules.filter((rule) => feedbackMatches(candidate, rule));
  const totalAdjustment =
    Math.round(appliedFeedback.reduce((sum, rule) => sum + rule.adjustment, 0) * 10) / 10;
  const adjustedScore = Math.round((baseScore + totalAdjustment) * 10) / 10;
  return {
    candidateId: candidate.id,
    title: candidate.title,
    domain: candidate.domain,
    baseScore,
    adjustedScore,
    totalAdjustment,
    mechanismCluster: mechanismCluster(candidate),
    recommendedAction:
      totalAdjustment <= -6
        ? "pause-or-kill-lineage"
        : totalAdjustment < 0
          ? "deprioritize"
          : totalAdjustment > 0
            ? "reallocate-build-budget-here"
            : "unchanged",
    appliedFeedback,
  };
}

function feedbackMatches(candidate: DiscoveryCandidate, rule: LineageScoringFeedbackRule): boolean {
  if (rule.target === "candidate") return candidate.id === rule.selector;
  if (rule.target === "mechanism") return candidate.failureMechanisms.includes(rule.selector);
  if (rule.target === "domain") return candidate.domain.toLowerCase().includes(rule.selector.toLowerCase());
  return Object.values(candidate.surfaceCoverageTags).some((values) => values.includes(rule.selector));
}

function mechanismCluster(candidate: DiscoveryCandidate): string {
  const mechanisms = new Set(candidate.failureMechanisms);
  if (mechanisms.has("model-alias-drift")) return "deployment-model-alias-rollout-drift";
  if (mechanisms.has("uncertain-external-effects")) return "external-receipt-partial-effect";
  if (mechanisms.has("ui-replay-mismatch")) return "browser-live-state-replay";
  if (mechanisms.has("prompt-injection-via-retrieval")) return "persistent-prompt-injection";
  if (mechanisms.has("hidden-environment-dependency")) return "hidden-dependency-discovery";
  if (mechanisms.has("false-audit-history")) return "audit-truth-external-ledger";
  if (mechanisms.has("permission-boundary")) return "local-scope-authority";
  return candidate.failureMechanisms[0] ?? "unknown";
}

function distinctClusterRecommendations(
  applications: readonly PortfolioFeedbackApplication[],
  preferredCandidateIds: readonly string[],
): readonly PortfolioFeedbackApplication[] {
  const preferred = new Set(preferredCandidateIds);
  const ordered = [
    ...applications.filter((item) => preferred.has(item.candidateId)),
    ...applications.filter((item) => !preferred.has(item.candidateId)),
  ];
  const seen = new Set<string>();
  const out: PortfolioFeedbackApplication[] = [];
  for (const item of ordered) {
    if (item.recommendedAction === "pause-or-kill-lineage") continue;
    if (seen.has(item.mechanismCluster)) continue;
    seen.add(item.mechanismCluster);
    out.push(item);
    if (out.length >= 5) break;
  }
  return out;
}
