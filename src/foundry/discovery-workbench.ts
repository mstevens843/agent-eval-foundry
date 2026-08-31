import type { AdaptiveFunnel, EvidenceCost } from "./adaptive-funnel.js";
import { evidenceCostRank } from "./adaptive-funnel.js";
import type { Registry } from "./registry.js";
import {
  fail,
  id,
  isRecord,
  mustExist,
  num,
  oneOf,
  requiredList,
  str,
  strArray,
  uniqueIds,
} from "./schema.js";

export const DISCOVERY_NEXT_STEPS = [
  "paper_screen",
  "mechanism_probe",
  "task_shape",
  "hold",
  "kill",
  "evolve_existing",
  "transfer_existing",
] as const;
export type DiscoveryNextStep = (typeof DISCOVERY_NEXT_STEPS)[number];

export const DISCOVERY_RISK_LEVELS = ["low", "medium", "high"] as const;
export type DiscoveryRiskLevel = (typeof DISCOVERY_RISK_LEVELS)[number];

export const SURFACE_COVERAGE_GROUPS = [
  "domains",
  "toolActionTypes",
  "statePatterns",
  "authorityModels",
  "externalSystems",
  "uiApiWorkflowSurfaces",
  "riskCategories",
] as const;
export type SurfaceCoverageGroup = (typeof SURFACE_COVERAGE_GROUPS)[number];

export interface DiscoveryRiskNote {
  readonly level: DiscoveryRiskLevel;
  readonly note: string;
  readonly mitigation: string | null;
}

export interface DiscoveryRiskNotes {
  readonly fairnessRisk: DiscoveryRiskNote;
  readonly verifierRisk: DiscoveryRiskNote;
  readonly cheatRisk: DiscoveryRiskNote;
  readonly alreadySolvedRisk: DiscoveryRiskNote;
  readonly humanSolvabilityRisk: DiscoveryRiskNote;
}

export interface DiscoveryTruthSource {
  readonly name: string;
  readonly whatItSettles: string;
  readonly whyIndependent: string;
}

export interface DiscoveryHiddenRegionSketch {
  readonly samplingStatement: string;
  readonly addsUndeclaredRules: boolean;
}

export interface DiscoveryKnobSketch {
  readonly name: string;
  readonly values: readonly string[];
  readonly purpose: string;
}

export interface DiscoveryTransferPotential {
  readonly targetDomains: readonly string[];
  readonly linkedTransferTests: readonly string[];
  readonly rationale: string;
}

export interface DiscoverySurfaceCoverageTags {
  readonly domains: readonly string[];
  readonly toolActionTypes: readonly string[];
  readonly statePatterns: readonly string[];
  readonly authorityModels: readonly string[];
  readonly externalSystems: readonly string[];
  readonly uiApiWorkflowSurfaces: readonly string[];
  readonly riskCategories: readonly string[];
}

export interface DiscoveryCheapScreen {
  readonly id: string;
  readonly cost: EvidenceCost;
  readonly check: string;
}

export interface DiscoveryReferenceSolvability {
  readonly plausible: boolean;
  readonly sketch: string;
}

export interface DiscoveryCandidate {
  readonly id: string;
  readonly title: string;
  readonly domain: string;
  readonly failureMechanisms: readonly string[];
  readonly taskFamilyHypothesis: string;
  readonly whyAgentsMightFail: string;
  readonly authoritativeTruthSource: DiscoveryTruthSource;
  readonly visibleRulesSketch: readonly string[];
  readonly hiddenRegionSketch: DiscoveryHiddenRegionSketch;
  readonly expectedKnobs: readonly DiscoveryKnobSketch[];
  readonly expectedMutants: readonly string[];
  readonly baselineCheats: readonly string[];
  readonly transferPotential: DiscoveryTransferPotential;
  readonly surfaceCoverageTags: DiscoverySurfaceCoverageTags;
  readonly expectedBuildHours: number;
  readonly expectedTrialCostUsd: number;
  readonly riskNotes: DiscoveryRiskNotes;
  readonly proposedNextStep: DiscoveryNextStep;
  readonly cheapScreens: readonly DiscoveryCheapScreen[];
  readonly promotionCriteria: readonly string[];
  readonly killCriteria: readonly string[];
  readonly referenceSolvability: DiscoveryReferenceSolvability;
  readonly expectedAxisPotential: number;
  readonly mechanismOnlyWordingVariation: boolean;
  readonly requiresPrivateContext: boolean;
  readonly isolationPlan: string | null;
  readonly evolutionOperator: string | null;
}

export interface DiscoveryScoreDimensions {
  readonly expectedAgentDifficulty: number;
  readonly fairness: number;
  readonly referenceSolvability: number;
  readonly verifierFeasibility: number;
  readonly cheatResistance: number;
  readonly transferPotential: number;
  readonly surfaceCoverageValue: number;
  readonly axisPotential: number;
  readonly buildCost: number;
  readonly trialCost: number;
  readonly alreadySolvedRisk: number;
  readonly ambiguityRisk: number;
}

export interface DiscoveryBlockingReason {
  readonly code: string;
  readonly severity: "hold" | "kill" | "repair";
  readonly reason: string;
}

export interface DiscoveryCandidateScore {
  readonly candidateId: string;
  readonly totalScore: number;
  readonly confidence: number;
  readonly recommendedAction: DiscoveryNextStep;
  readonly blockingReasons: readonly DiscoveryBlockingReason[];
  readonly cheapestNextEvidence: EvidenceCost;
  readonly promotionCriteria: readonly string[];
  readonly killCriteria: readonly string[];
  readonly dimensions: DiscoveryScoreDimensions;
}

export interface SurfaceCoverageSummary {
  readonly totalCandidates: number;
  readonly defectMechanisms: readonly string[];
  readonly groups: Readonly<Record<SurfaceCoverageGroup, readonly string[]>>;
  readonly warnings: readonly string[];
}

export interface DiscoveryWorkbench {
  readonly candidates: readonly DiscoveryCandidate[];
}

export interface DiscoveryWorkbenchSummary {
  readonly totalCandidates: number;
  readonly byDomain: Readonly<Record<string, number>>;
  readonly byMechanism: Readonly<Record<string, number>>;
  readonly byRecommendedAction: Readonly<Record<DiscoveryNextStep, number>>;
  readonly scores: readonly DiscoveryCandidateScore[];
  readonly topBuildOrProbeCandidates: readonly DiscoveryCandidateScore[];
  readonly killedCheaply: readonly DiscoveryCandidateScore[];
  readonly needingRepair: readonly DiscoveryCandidateScore[];
  readonly transferOpportunities: readonly DiscoveryCandidateScore[];
  readonly expectedNextBatchHours: number;
  readonly expectedNextBatchTrialCostUsd: number;
  readonly expectedNextBatchAxes: number;
  readonly warnings: readonly string[];
  readonly surfaceCoverage: SurfaceCoverageSummary;
}

export interface DiscoveryTaskShapeDraft {
  readonly familyId: string;
  readonly sourceCandidateId: string;
  readonly visibleRulesDraft: readonly string[];
  readonly behaviorSpaceDraft: string;
  readonly knobs: readonly DiscoveryKnobSketch[];
  readonly hiddenRegionDraft: string;
  readonly authoritativeSource: DiscoveryTruthSource;
  readonly expectedMutants: readonly string[];
  readonly baselineCheats: readonly string[];
  readonly humanSolvabilityNotes: readonly string[];
  readonly adversarialAuditNotes: readonly string[];
  readonly transferLinks: readonly string[];
}

const obj = (v: unknown, path: string): Record<string, unknown> =>
  isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");

const bool = (v: unknown, path: string): boolean =>
  typeof v === "boolean" ? v : fail("E_TYPE", path, "expected a boolean");

const nullableText = (v: unknown, path: string): string | null =>
  v === null || v === undefined ? null : str(v, path);

const clamp = (n: number, min = 0, max = 10): number => Math.max(min, Math.min(max, n));

const riskPenalty = (level: DiscoveryRiskLevel): number =>
  ({
    low: 1,
    medium: 5,
    high: 9,
  })[level];

const inverseRiskScore = (level: DiscoveryRiskLevel): number =>
  ({
    low: 9,
    medium: 6,
    high: 2,
  })[level];

const parseRiskNote = (v: unknown, path: string): DiscoveryRiskNote => {
  const o = obj(v, path);
  return {
    level: oneOf(o.level, `${path}.level`, DISCOVERY_RISK_LEVELS),
    note: str(o.note, `${path}.note`),
    mitigation: nullableText(o.mitigation, `${path}.mitigation`),
  };
};

const parseRiskNotes = (v: unknown, path: string): DiscoveryRiskNotes => {
  const o = obj(v, path);
  return {
    fairnessRisk: parseRiskNote(o.fairnessRisk, `${path}.fairnessRisk`),
    verifierRisk: parseRiskNote(o.verifierRisk, `${path}.verifierRisk`),
    cheatRisk: parseRiskNote(o.cheatRisk, `${path}.cheatRisk`),
    alreadySolvedRisk: parseRiskNote(o.alreadySolvedRisk, `${path}.alreadySolvedRisk`),
    humanSolvabilityRisk: parseRiskNote(o.humanSolvabilityRisk, `${path}.humanSolvabilityRisk`),
  };
};

const parseTruthSource = (v: unknown, path: string): DiscoveryTruthSource => {
  if (!isRecord(v)) {
    fail(
      "DISCOVERY_CANDIDATE_NO_TRUTH_SOURCE",
      path,
      "a discovery candidate needs an authoritative source independent of the subject",
    );
  }
  return {
    name: str(v.name, `${path}.name`),
    whatItSettles: str(v.whatItSettles, `${path}.whatItSettles`),
    whyIndependent: str(v.whyIndependent, `${path}.whyIndependent`),
  };
};

const parseHiddenRegion = (v: unknown, path: string): DiscoveryHiddenRegionSketch => {
  const o = obj(v, path);
  const addsUndeclaredRules = bool(o.addsUndeclaredRules, `${path}.addsUndeclaredRules`);
  if (addsUndeclaredRules) {
    fail(
      "DISCOVERY_CANDIDATE_HIDDEN_RULES_UNDECLARED",
      `${path}.addsUndeclaredRules`,
      "hidden regions may sample declared behavior, but may not introduce rules absent from the public sketch",
    );
  }
  return {
    samplingStatement: str(o.samplingStatement, `${path}.samplingStatement`),
    addsUndeclaredRules,
  };
};

const parseKnob = (v: unknown, path: string): DiscoveryKnobSketch => {
  const o = obj(v, path);
  return {
    name: id(o.name, `${path}.name`),
    values: requiredList(
      o.values,
      `${path}.values`,
      "DISCOVERY_CANDIDATE_NO_CHEAP_SCREEN",
      "a knob must name at least one sampled value before it can support a cheap screen",
    ),
    purpose: str(o.purpose, `${path}.purpose`),
  };
};

const parseTransferPotential = (v: unknown, path: string): DiscoveryTransferPotential => {
  const o = obj(v, path);
  return {
    targetDomains: requiredList(
      o.targetDomains,
      `${path}.targetDomains`,
      "DISCOVERY_CANDIDATE_NO_TRANSFER",
      "a candidate with no transfer target is not ready for the adaptive funnel",
    ),
    linkedTransferTests: strArray(o.linkedTransferTests, `${path}.linkedTransferTests`),
    rationale: str(o.rationale, `${path}.rationale`),
  };
};

const parseSurfaceTags = (v: unknown, path: string): DiscoverySurfaceCoverageTags => {
  const o = obj(v, path);
  return {
    domains: requiredList(
      o.domains,
      `${path}.domains`,
      "DISCOVERY_CANDIDATE_NO_CHEAP_SCREEN",
      "surface coverage cannot be measured if the candidate names no domain surface",
    ),
    toolActionTypes: requiredList(
      o.toolActionTypes,
      `${path}.toolActionTypes`,
      "DISCOVERY_CANDIDATE_NO_CHEAP_SCREEN",
      "surface coverage cannot be measured if the candidate names no tool/action type",
    ),
    statePatterns: requiredList(
      o.statePatterns,
      `${path}.statePatterns`,
      "DISCOVERY_CANDIDATE_NO_CHEAP_SCREEN",
      "surface coverage cannot be measured if the candidate names no state pattern",
    ),
    authorityModels: requiredList(
      o.authorityModels,
      `${path}.authorityModels`,
      "DISCOVERY_CANDIDATE_NO_TRUTH_SOURCE",
      "surface coverage needs the authority model as well as the domain",
    ),
    externalSystems: requiredList(
      o.externalSystems,
      `${path}.externalSystems`,
      "DISCOVERY_CANDIDATE_NO_TRUTH_SOURCE",
      "surface coverage needs the external system or verifier-owned authority",
    ),
    uiApiWorkflowSurfaces: requiredList(
      o.uiApiWorkflowSurfaces,
      `${path}.uiApiWorkflowSurfaces`,
      "DISCOVERY_CANDIDATE_NO_CHEAP_SCREEN",
      "surface coverage needs to distinguish UI, API and workflow surfaces",
    ),
    riskCategories: requiredList(
      o.riskCategories,
      `${path}.riskCategories`,
      "DISCOVERY_CANDIDATE_NO_CHEAP_SCREEN",
      "surface coverage needs risk categories so breadth is not only noun diversity",
    ),
  };
};

const parseCheapScreen = (v: unknown, path: string): DiscoveryCheapScreen => {
  const o = obj(v, path);
  return {
    id: id(o.id, `${path}.id`),
    cost: oneOf(o.cost, `${path}.cost`, ["paper", "static", "local", "mutant"] as const),
    check: str(o.check, `${path}.check`),
  };
};

const parseReferenceSolvability = (v: unknown, path: string): DiscoveryReferenceSolvability => {
  const o = obj(v, path);
  return {
    plausible: bool(o.plausible, `${path}.plausible`),
    sketch: str(o.sketch, `${path}.sketch`),
  };
};

export function parseDiscoveryCandidate(v: unknown, path: string): DiscoveryCandidate {
  const o = obj(v, path);
  const proposedNextStep = oneOf(o.proposedNextStep, `${path}.proposedNextStep`, DISCOVERY_NEXT_STEPS);
  const riskNotes = parseRiskNotes(o.riskNotes, `${path}.riskNotes`);
  const referenceSolvability = parseReferenceSolvability(
    o.referenceSolvability,
    `${path}.referenceSolvability`,
  );
  const expectedAxisPotential = num(o.expectedAxisPotential, `${path}.expectedAxisPotential`);
  const expectedBuildHours = num(o.expectedBuildHours, `${path}.expectedBuildHours`);
  const mechanismOnlyWordingVariation = bool(
    o.mechanismOnlyWordingVariation,
    `${path}.mechanismOnlyWordingVariation`,
  );
  const requiresPrivateContext = bool(o.requiresPrivateContext, `${path}.requiresPrivateContext`);
  const isolationPlan = nullableText(o.isolationPlan, `${path}.isolationPlan`);
  const evolutionOperator = nullableText(o.evolutionOperator, `${path}.evolutionOperator`);

  if (mechanismOnlyWordingVariation) {
    fail(
      "DISCOVERY_CANDIDATE_WORDING_ONLY",
      `${path}.mechanismOnlyWordingVariation`,
      "renaming the nouns without changing mechanism pressure is not a discovery candidate",
    );
  }
  if (requiresPrivateContext) {
    fail(
      "DISCOVERY_CANDIDATE_REQUIRES_PRIVATE_CONTEXT",
      `${path}.requiresPrivateContext`,
      "a discovery candidate must be solvable from public rules, not author memory",
    );
  }
  if (!referenceSolvability.plausible && proposedNextStep !== "kill") {
    fail(
      "DISCOVERY_CANDIDATE_NO_REFERENCE_PATH",
      `${path}.referenceSolvability.plausible`,
      "a candidate with no plausible reference path should die cheaply instead of entering validation",
    );
  }
  if (riskNotes.cheatRisk.level === "high" && isolationPlan === null && proposedNextStep !== "kill") {
    fail(
      "DISCOVERY_CANDIDATE_HIGH_CHEAT_NO_ISOLATION",
      `${path}.isolationPlan`,
      "high-cheat-risk candidates need an isolation plan before any promotion",
    );
  }
  if (expectedBuildHours > 48 && expectedAxisPotential < 2 && !["hold", "kill"].includes(proposedNextStep)) {
    fail(
      "DISCOVERY_CANDIDATE_LOW_AXIS_HIGH_BUILD",
      `${path}.expectedAxisPotential`,
      "expensive low-axis candidates should be held or killed before validation-mode build work",
    );
  }
  if (
    riskNotes.alreadySolvedRisk.level === "high" &&
    evolutionOperator === null &&
    proposedNextStep !== "kill"
  ) {
    fail(
      "DISCOVERY_CANDIDATE_SOLVED_NO_EVOLUTION",
      `${path}.evolutionOperator`,
      "already-solved risk needs an evolution operator or a cheap kill decision",
    );
  }

  const cheapScreens = Array.isArray(o.cheapScreens)
    ? o.cheapScreens.map((x, i) => parseCheapScreen(x, `${path}.cheapScreens[${i}]`))
    : fail("E_TYPE", `${path}.cheapScreens`, "expected an array");
  if (cheapScreens.length === 0) {
    fail(
      "DISCOVERY_CANDIDATE_NO_CHEAP_SCREEN",
      `${path}.cheapScreens`,
      "the workbench exists to spend cheap evidence before model trials",
    );
  }

  return {
    id: id(o.id, `${path}.id`),
    title: str(o.title, `${path}.title`),
    domain: str(o.domain, `${path}.domain`),
    failureMechanisms: requiredList(
      o.failureMechanisms,
      `${path}.failureMechanisms`,
      "DISCOVERY_CANDIDATE_WORDING_ONLY",
      "a candidate with no mechanism is only a surface idea",
    ),
    taskFamilyHypothesis: str(o.taskFamilyHypothesis, `${path}.taskFamilyHypothesis`),
    whyAgentsMightFail: str(o.whyAgentsMightFail, `${path}.whyAgentsMightFail`),
    authoritativeTruthSource: parseTruthSource(
      o.authoritativeTruthSource,
      `${path}.authoritativeTruthSource`,
    ),
    visibleRulesSketch: requiredList(
      o.visibleRulesSketch,
      `${path}.visibleRulesSketch`,
      "DISCOVERY_CANDIDATE_REQUIRES_PRIVATE_CONTEXT",
      "without public rules the task can only be solved from private context",
    ),
    hiddenRegionSketch: parseHiddenRegion(o.hiddenRegionSketch, `${path}.hiddenRegionSketch`),
    expectedKnobs: requiredKnobs(o.expectedKnobs, `${path}.expectedKnobs`),
    expectedMutants: requiredList(
      o.expectedMutants,
      `${path}.expectedMutants`,
      "DISCOVERY_CANDIDATE_NO_EXPECTED_MUTANTS",
      "a candidate with no known-bad implementation cannot prove its verifier works",
    ),
    baselineCheats: requiredList(
      o.baselineCheats,
      `${path}.baselineCheats`,
      "DISCOVERY_CANDIDATE_NO_BASELINE_CHEAT",
      "a candidate needs at least one baseline cheat so cheap screens know what must fail",
    ),
    transferPotential: parseTransferPotential(o.transferPotential, `${path}.transferPotential`),
    surfaceCoverageTags: parseSurfaceTags(o.surfaceCoverageTags, `${path}.surfaceCoverageTags`),
    expectedBuildHours,
    expectedTrialCostUsd: num(o.expectedTrialCostUsd, `${path}.expectedTrialCostUsd`),
    riskNotes,
    proposedNextStep,
    cheapScreens,
    promotionCriteria: requiredList(
      o.promotionCriteria,
      `${path}.promotionCriteria`,
      "DISCOVERY_CANDIDATE_NO_PROMOTION_CRITERIA",
      "promotion criteria must be stated before seeing probe results",
    ),
    killCriteria: requiredList(
      o.killCriteria,
      `${path}.killCriteria`,
      "DISCOVERY_CANDIDATE_NO_PROMOTION_CRITERIA",
      "kill criteria are the negative half of a promotion rule",
    ),
    referenceSolvability,
    expectedAxisPotential,
    mechanismOnlyWordingVariation,
    requiresPrivateContext,
    isolationPlan,
    evolutionOperator,
  };
}

function requiredKnobs(v: unknown, path: string): readonly DiscoveryKnobSketch[] {
  const knobs = Array.isArray(v)
    ? v.map((x, i) => parseKnob(x, `${path}[${i}]`))
    : fail("E_TYPE", path, "expected an array");
  if (knobs.length < 2) {
    fail(
      "DISCOVERY_CANDIDATE_NO_CHEAP_SCREEN",
      path,
      "a promotable candidate needs at least two meaningful knobs before it earns build time",
    );
  }
  return knobs;
}

export function parseDiscoveryCandidates(v: unknown, path = "candidate-pool"): readonly DiscoveryCandidate[] {
  const list = Array.isArray(v)
    ? v.map((x, i) => parseDiscoveryCandidate(x, `${path}[${i}]`))
    : fail("E_TYPE", path, "expected an array");
  uniqueIds(
    list.map((c) => c.id),
    path,
  );
  return list;
}

export function assertDiscoveryWorkbenchValid(
  workbench: DiscoveryWorkbench,
  registry?: Registry,
  funnel?: AdaptiveFunnel,
): void {
  uniqueIds(
    workbench.candidates.map((c) => c.id),
    "discovery-workbench.candidates",
  );
  if (registry !== undefined) {
    const mechanismIds = new Set(registry.mechanisms.map((m) => m.id));
    mustExist(
      workbench.candidates.flatMap((c) => c.failureMechanisms),
      mechanismIds,
      "discovery-workbench.candidates.failureMechanisms",
      "mechanism",
    );
  }
  if (funnel !== undefined) {
    const transferIds = new Set(funnel.transfers.map((t) => t.id));
    const linked = workbench.candidates.flatMap((c) => c.transferPotential.linkedTransferTests);
    mustExist(linked, transferIds, "discovery-workbench.candidates.transferPotential", "transfer");
  }
}

export function scoreDiscoveryCandidate(candidate: DiscoveryCandidate): DiscoveryCandidateScore {
  const dimensions = scoreDimensions(candidate);
  const blockingReasons = cheapScreenFindings(candidate, dimensions);
  const totalScore = clamp(
    dimensions.expectedAgentDifficulty * 1.1 +
      dimensions.fairness * 1.25 +
      dimensions.referenceSolvability * 1.1 +
      dimensions.verifierFeasibility * 1.15 +
      dimensions.cheatResistance +
      dimensions.transferPotential * 0.85 +
      dimensions.surfaceCoverageValue * 0.85 +
      dimensions.axisPotential * 1.1 +
      dimensions.buildCost * 0.65 +
      dimensions.trialCost * 0.45 -
      dimensions.alreadySolvedRisk * 0.85 -
      dimensions.ambiguityRisk * 1.05,
    0,
    100,
  );
  const recommendedAction = chooseAction(candidate, dimensions, blockingReasons, totalScore);
  return {
    candidateId: candidate.id,
    totalScore: Math.round(totalScore * 10) / 10,
    confidence: confidenceFor(candidate, dimensions, blockingReasons),
    recommendedAction,
    blockingReasons,
    cheapestNextEvidence: cheapestEvidence(candidate, recommendedAction),
    promotionCriteria: candidate.promotionCriteria,
    killCriteria: candidate.killCriteria,
    dimensions,
  };
}

export function scoreDiscoveryCandidates(
  candidates: readonly DiscoveryCandidate[],
): readonly DiscoveryCandidateScore[] {
  return candidates
    .map(scoreDiscoveryCandidate)
    .sort((a, b) => b.totalScore - a.totalScore || a.candidateId.localeCompare(b.candidateId));
}

export function summarizeDiscoveryWorkbench(workbench: DiscoveryWorkbench): DiscoveryWorkbenchSummary {
  const scores = scoreDiscoveryCandidates(workbench.candidates);
  const byDomain = countBy(workbench.candidates.map((c) => c.domain));
  const byMechanism = countBy(workbench.candidates.flatMap((c) => c.failureMechanisms));
  const byRecommendedAction = DISCOVERY_NEXT_STEPS.reduce(
    (acc, action) => {
      acc[action] = scores.filter((s) => s.recommendedAction === action).length;
      return acc;
    },
    {} as Record<DiscoveryNextStep, number>,
  );
  const topBuildOrProbeCandidates = scores
    .filter((s) =>
      ["mechanism_probe", "task_shape", "transfer_existing", "evolve_existing"].includes(s.recommendedAction),
    )
    .slice(0, 10);
  const surfaceCoverage = summarizeSurfaceCoverage(workbench.candidates);
  const warnings = workbenchWarnings(workbench.candidates, scores, surfaceCoverage);
  return {
    totalCandidates: workbench.candidates.length,
    byDomain,
    byMechanism,
    byRecommendedAction,
    scores,
    topBuildOrProbeCandidates,
    killedCheaply: scores.filter((s) => s.recommendedAction === "kill"),
    needingRepair: scores.filter((s) => s.recommendedAction === "hold" || s.blockingReasons.length > 0),
    transferOpportunities: scores.filter(
      (s) =>
        s.recommendedAction === "transfer_existing" ||
        workbench.candidates.find((c) => c.id === s.candidateId)?.transferPotential.linkedTransferTests
          .length !== 0,
    ),
    expectedNextBatchHours: sumCandidateField(
      workbench.candidates,
      topBuildOrProbeCandidates,
      "expectedBuildHours",
    ),
    expectedNextBatchTrialCostUsd: sumCandidateField(
      workbench.candidates,
      topBuildOrProbeCandidates,
      "expectedTrialCostUsd",
    ),
    expectedNextBatchAxes: Math.round(
      sumCandidateField(workbench.candidates, topBuildOrProbeCandidates, "expectedAxisPotential"),
    ),
    warnings,
    surfaceCoverage,
  };
}

export function summarizeSurfaceCoverage(candidates: readonly DiscoveryCandidate[]): SurfaceCoverageSummary {
  const groups = SURFACE_COVERAGE_GROUPS.reduce(
    (acc, group) => {
      acc[group] = [...new Set(candidates.flatMap((c) => c.surfaceCoverageTags[group]))].sort();
      return acc;
    },
    {
      domains: [],
      toolActionTypes: [],
      statePatterns: [],
      authorityModels: [],
      externalSystems: [],
      uiApiWorkflowSurfaces: [],
      riskCategories: [],
    } as Record<SurfaceCoverageGroup, string[]>,
  );
  const defectMechanisms = [...new Set(candidates.flatMap((c) => c.failureMechanisms))].sort();
  const warnings = surfaceWarnings(candidates, groups, defectMechanisms);
  return {
    totalCandidates: candidates.length,
    defectMechanisms,
    groups,
    warnings,
  };
}

export function candidateToTaskShapeDraft(candidate: DiscoveryCandidate): DiscoveryTaskShapeDraft {
  return {
    familyId: candidate.id,
    sourceCandidateId: candidate.id,
    visibleRulesDraft: candidate.visibleRulesSketch,
    behaviorSpaceDraft: candidate.taskFamilyHypothesis,
    knobs: candidate.expectedKnobs,
    hiddenRegionDraft: candidate.hiddenRegionSketch.samplingStatement,
    authoritativeSource: candidate.authoritativeTruthSource,
    expectedMutants: candidate.expectedMutants,
    baselineCheats: candidate.baselineCheats,
    humanSolvabilityNotes: [
      candidate.riskNotes.humanSolvabilityRisk.note,
      "A clean-room reviewer must solve from the public rules and examples without source internals.",
    ],
    adversarialAuditNotes: [
      candidate.riskNotes.cheatRisk.note,
      candidate.isolationPlan ?? "No isolation plan recorded; do not promote until repaired.",
    ],
    transferLinks: [
      ...candidate.transferPotential.targetDomains,
      ...candidate.transferPotential.linkedTransferTests.map((t) => `transfer:${t}`),
    ],
  };
}

function scoreDimensions(candidate: DiscoveryCandidate): DiscoveryScoreDimensions {
  const difficulty = clamp(
    3 +
      candidate.failureMechanisms.length * 0.75 +
      candidate.expectedAxisPotential * 0.85 +
      Math.min(2, candidate.expectedKnobs.length * 0.35) +
      (candidate.riskNotes.alreadySolvedRisk.level === "low" ? 1 : 0),
  );
  const fairness = clamp(
    inverseRiskScore(candidate.riskNotes.fairnessRisk.level) -
      (candidate.hiddenRegionSketch.addsUndeclaredRules ? 4 : 0) -
      (candidate.requiresPrivateContext ? 5 : 0),
  );
  const referenceSolvability = clamp(
    (candidate.referenceSolvability.plausible ? 8 : 2) +
      (candidate.authoritativeTruthSource.whyIndependent.length > 20 ? 1 : 0),
  );
  const verifierFeasibility = clamp(
    inverseRiskScore(candidate.riskNotes.verifierRisk.level) +
      Math.min(2, candidate.expectedMutants.length * 0.25) +
      (candidate.authoritativeTruthSource.whyIndependent.length > 20 ? 1 : 0),
  );
  const cheatResistance = clamp(
    inverseRiskScore(candidate.riskNotes.cheatRisk.level) +
      (candidate.isolationPlan === null ? -3 : 2) +
      Math.min(1, candidate.baselineCheats.length * 0.2),
  );
  const transferPotential = clamp(
    candidate.transferPotential.targetDomains.length * 2.3 +
      candidate.transferPotential.linkedTransferTests.length * 1.4,
  );
  const surfaceCoverageValue = clamp(
    SURFACE_COVERAGE_GROUPS.reduce(
      (n, group) => n + Math.min(2, candidate.surfaceCoverageTags[group].length),
      0,
    ) / 1.25,
  );
  const axisPotential = clamp(
    candidate.expectedAxisPotential * 1.8 +
      Math.min(2, candidate.failureMechanisms.length * 0.4) +
      Math.min(2, candidate.expectedKnobs.length * 0.35) +
      Math.min(2, candidate.expectedMutants.length * 0.25),
  );
  const buildCost =
    candidate.expectedBuildHours <= 8
      ? 10
      : candidate.expectedBuildHours <= 16
        ? 8
        : candidate.expectedBuildHours <= 28
          ? 6
          : candidate.expectedBuildHours <= 44
            ? 4
            : 1;
  const trialCost =
    candidate.expectedTrialCostUsd <= 10
      ? 10
      : candidate.expectedTrialCostUsd <= 40
        ? 8
        : candidate.expectedTrialCostUsd <= 90
          ? 6
          : candidate.expectedTrialCostUsd <= 150
            ? 4
            : 2;
  const alreadySolvedRisk = riskPenalty(candidate.riskNotes.alreadySolvedRisk.level);
  const ambiguityRisk = clamp(
    riskPenalty(candidate.riskNotes.fairnessRisk.level) +
      (candidate.requiresPrivateContext ? 4 : 0) +
      (candidate.hiddenRegionSketch.addsUndeclaredRules ? 5 : 0) +
      (candidate.visibleRulesSketch.length < 2 ? 2 : 0),
  );
  return {
    expectedAgentDifficulty: Math.round(difficulty * 10) / 10,
    fairness: Math.round(fairness * 10) / 10,
    referenceSolvability: Math.round(referenceSolvability * 10) / 10,
    verifierFeasibility: Math.round(verifierFeasibility * 10) / 10,
    cheatResistance: Math.round(cheatResistance * 10) / 10,
    transferPotential: Math.round(transferPotential * 10) / 10,
    surfaceCoverageValue: Math.round(surfaceCoverageValue * 10) / 10,
    axisPotential: Math.round(axisPotential * 10) / 10,
    buildCost,
    trialCost,
    alreadySolvedRisk,
    ambiguityRisk: Math.round(ambiguityRisk * 10) / 10,
  };
}

function cheapScreenFindings(
  candidate: DiscoveryCandidate,
  dimensions: DiscoveryScoreDimensions,
): readonly DiscoveryBlockingReason[] {
  const findings: DiscoveryBlockingReason[] = [];
  if (!candidate.referenceSolvability.plausible) {
    findings.push({
      code: "no-reference-path",
      severity: "kill",
      reason: "no plausible reference solution is recorded",
    });
  }
  if (candidate.riskNotes.fairnessRisk.level === "high" || dimensions.fairness < 5) {
    findings.push({
      code: "low-fairness",
      severity: "hold",
      reason: "difficulty cannot promote a candidate whose public rules are not yet fair",
    });
  }
  if (candidate.riskNotes.verifierRisk.level === "high" || dimensions.verifierFeasibility < 5) {
    findings.push({
      code: "weak-verifier-plan",
      severity: "hold",
      reason: "high surface coverage does not help if no independent verifier can grade it",
    });
  }
  if (candidate.riskNotes.cheatRisk.level === "high" && candidate.isolationPlan === null) {
    findings.push({
      code: "high-cheat-no-isolation",
      severity: "hold",
      reason: "cheat-prone candidates need an isolation plan before promotion",
    });
  }
  if (candidate.expectedBuildHours > 36 && candidate.expectedAxisPotential < 3) {
    findings.push({
      code: "expensive-low-axis",
      severity: "hold",
      reason: "expected build hours are too high for the stated axis potential",
    });
  }
  if (candidate.riskNotes.alreadySolvedRisk.level === "high" && candidate.evolutionOperator === null) {
    findings.push({
      code: "already-solved-no-evolution",
      severity: candidate.proposedNextStep === "kill" ? "kill" : "hold",
      reason: "already-solved risk is high and no evolution operator is named",
    });
  }
  if (candidate.mechanismOnlyWordingVariation) {
    findings.push({
      code: "wording-only",
      severity: "kill",
      reason: "the candidate varies wording rather than mechanism pressure",
    });
  }
  if (candidate.transferPotential.targetDomains.length === 0) {
    findings.push({
      code: "no-transfer-target",
      severity: "hold",
      reason: "no transfer target is recorded",
    });
  }
  return findings;
}

function chooseAction(
  candidate: DiscoveryCandidate,
  dimensions: DiscoveryScoreDimensions,
  blockingReasons: readonly DiscoveryBlockingReason[],
  totalScore: number,
): DiscoveryNextStep {
  if (candidate.proposedNextStep === "kill") return "kill";
  if (blockingReasons.some((b) => b.severity === "kill")) return "kill";
  if (blockingReasons.length > 0 || totalScore < 48) return "hold";
  if (candidate.proposedNextStep === "evolve_existing") return "evolve_existing";
  if (candidate.proposedNextStep === "transfer_existing") return "transfer_existing";
  if (candidate.proposedNextStep === "task_shape" && dimensions.verifierFeasibility >= 6) return "task_shape";
  if (candidate.proposedNextStep === "paper_screen") return "paper_screen";
  return "mechanism_probe";
}

function cheapestEvidence(candidate: DiscoveryCandidate, action: DiscoveryNextStep): EvidenceCost {
  if (action === "kill" || action === "hold" || action === "paper_screen") return "paper";
  if (action === "task_shape") return "local";
  if (action === "transfer_existing" || action === "evolve_existing") return "static";
  return (
    candidate.cheapScreens.map((c) => c.cost).sort((a, b) => evidenceCostRank(a) - evidenceCostRank(b))[0] ??
    "static"
  );
}

function confidenceFor(
  candidate: DiscoveryCandidate,
  dimensions: DiscoveryScoreDimensions,
  blockingReasons: readonly DiscoveryBlockingReason[],
): number {
  const base =
    0.42 +
    Math.min(0.18, candidate.cheapScreens.length * 0.04) +
    Math.min(0.15, candidate.expectedMutants.length * 0.025) +
    Math.min(0.12, candidate.transferPotential.targetDomains.length * 0.035) +
    (candidate.referenceSolvability.plausible ? 0.08 : -0.08) -
    blockingReasons.length * 0.06 -
    Math.max(0, dimensions.ambiguityRisk - 6) * 0.02;
  return Math.round(clamp(base, 0.05, 0.95) * 100) / 100;
}

function countBy(items: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item] = (counts[item] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function sumCandidateField(
  candidates: readonly DiscoveryCandidate[],
  scores: readonly DiscoveryCandidateScore[],
  field: "expectedBuildHours" | "expectedTrialCostUsd" | "expectedAxisPotential",
): number {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  return scores.reduce((sum, score) => sum + (byId.get(score.candidateId)?.[field] ?? 0), 0);
}

function surfaceWarnings(
  candidates: readonly DiscoveryCandidate[],
  groups: Readonly<Record<SurfaceCoverageGroup, readonly string[]>>,
  defectMechanisms: readonly string[],
): readonly string[] {
  const warnings: string[] = [];
  const domainCounts = Object.values(countBy(candidates.map((c) => c.domain)));
  const maxDomainShare = candidates.length === 0 ? 0 : Math.max(...domainCounts) / candidates.length;
  const surfaceBreadth = SURFACE_COVERAGE_GROUPS.reduce((n, group) => n + groups[group].length, 0);
  if (maxDomainShare > 0.3)
    warnings.push("many candidates sit in the same domain; surface coverage is concentrated");
  if (defectMechanisms.length >= 8 && surfaceBreadth < 24) {
    warnings.push("defect-axis diversity is broad, but product/API surface coverage is narrow");
  }
  if (surfaceBreadth >= 45 && defectMechanisms.length < 6) {
    warnings.push("surface coverage is broad, but defect-axis diversity is low");
  }
  const highSurfaceWeakVerifier = candidates.filter(
    (c) => scoreDimensions(c).surfaceCoverageValue >= 8 && scoreDimensions(c).verifierFeasibility < 5,
  );
  if (highSurfaceWeakVerifier.length > 0) {
    warnings.push("some broad-surface candidates have weak verifier feasibility and should not promote");
  }
  return warnings;
}

function workbenchWarnings(
  candidates: readonly DiscoveryCandidate[],
  scores: readonly DiscoveryCandidateScore[],
  surfaceCoverage: SurfaceCoverageSummary,
): readonly string[] {
  const warnings = [...surfaceCoverage.warnings];
  const top = scores.slice(0, 10);
  const topMechanismCounts = countBy(
    top.flatMap((s) => candidates.find((c) => c.id === s.candidateId)?.failureMechanisms ?? []),
  );
  const maxMechanismShare =
    top.length === 0 ? 0 : Math.max(0, ...Object.values(topMechanismCounts)) / Math.max(1, top.length);
  if (maxMechanismShare >= 0.7) {
    warnings.push("top-ranked candidates over-concentrate on one mechanism; run a surface-diversity pass");
  }
  const topDomains = new Set(top.map((s) => candidates.find((c) => c.id === s.candidateId)?.domain));
  if (topDomains.size <= 3 && surfaceCoverage.defectMechanisms.length >= 8) {
    warnings.push(
      "top-ranked defect axes are broad but the immediate build queue has narrow surface coverage",
    );
  }
  return [...new Set(warnings)].sort();
}
