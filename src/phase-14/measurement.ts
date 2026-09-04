import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { measurePhase13 } from "../reports/phase-13-transfer.js";
import { RigInputError, requireShape } from "../screens/rig-integrity.js";
import {
  PHASE14_FAMILIES,
  STARTER_PROFILES,
  buildPhase14PackageLock,
  buildPhase14ScenarioLock,
} from "./packages.js";
import type { Phase14FamilyId, StarterProfile } from "./packages.js";
import { buildPhase14Preflight } from "./preflight.js";
import { exactBinomialInterval } from "./statistics.js";

export interface Phase14RegisteredProvider {
  readonly providerFamily: "openai" | "anthropic";
  readonly providerId: string;
  readonly model: string;
  readonly effort: string;
}

export interface Phase14PreregistrationSummary {
  readonly path: "data/phase-14-preregistration.json";
  readonly sha256: string;
  readonly baselineCommit: string;
  readonly registeredAt: string;
  readonly registeredBeforeAgentOutput: true;
  readonly fixedValidityControls: readonly string[];
  readonly providerStrata: readonly Phase14RegisteredProvider[];
  readonly maximumSubjectAttempts: number;
  readonly maximumBlindLabels: number;
  readonly maximumTotalUsd: number;
}

export interface Phase14TrialRow {
  readonly attemptId: string;
  readonly stage: "seeded-smoke" | "neutral-expansion";
  readonly familyId: Phase14FamilyId;
  readonly starterProfile: StarterProfile;
  readonly providerFamily: "openai" | "anthropic";
  readonly providerId: string;
  readonly model: string;
  readonly effort: string;
  readonly challengeHash: string;
  readonly scenarioSetId: string;
  readonly primaryScenarioProfile: "concentrated-24";
  readonly primaryScenarios: 24;
  readonly secondaryScenarioProfile: "balanced-12";
  readonly secondaryScenarios: 12;
  readonly state: "NOT_RUN";
  readonly executionEligibility: "blocked-preflight";
  readonly countability: { readonly counts: false; readonly reason: string };
  readonly reward: null;
  readonly capabilityAttributedFailure: null;
  readonly selfCheckGreen: null;
  readonly failedChecks: readonly [];
  readonly failureConcentration: null;
  readonly scenarioResults: readonly [];
  readonly runtimeSeconds: null;
  readonly costUsd: null;
  readonly usage: null;
  readonly artifacts: {
    readonly challenge: null;
    readonly submission: null;
    readonly transcript: null;
    readonly metadata: null;
    readonly verifierOutput: null;
    readonly normalizedResult: null;
    readonly countabilityDecision: null;
    readonly workspace: null;
    readonly selfChecks: null;
    readonly blindLabels: readonly [];
  };
}

export interface Phase14TrialLedger {
  readonly schema: "agent-eval-foundry/phase-14-trial-ledger@1";
  readonly preregistration: Phase14PreregistrationSummary;
  readonly status: "BLOCKED_PREFLIGHT";
  readonly blockers: readonly string[];
  readonly attempts: readonly Phase14TrialRow[];
  readonly summary: {
    readonly plannedAttempts: number;
    readonly attempted: 0;
    readonly countable: 0;
    readonly cleanSolves: 0;
    readonly rewardZero: 0;
    readonly agreedCapabilityFailures: 0;
    readonly unlabelledFailures: 0;
    readonly spentUsd: 0;
  };
}

export interface Phase14EffectEstimate {
  readonly estimandId: string;
  readonly category: "family" | "genuine-difficulty" | "selection-coverage";
  readonly status: "not-estimable";
  readonly independentAttempts: 0;
  readonly exactInterval: null;
  readonly estimate: null;
  readonly reason: string;
}

export interface Phase14EffectLedger {
  readonly schema: "agent-eval-foundry/phase-14-effect-ledger@1";
  readonly preregistrationSha256: string;
  readonly status: "NO_AGENT_EFFECTS_MEASURED";
  readonly evidenceBoundary: string;
  readonly rawAttemptCells: readonly Phase14TrialRow[];
  readonly validityControls: readonly {
    readonly id: string;
    readonly enabled: true;
    readonly category: "validity-control";
    readonly agentEffectRanked: false;
  }[];
  readonly localCalibration: readonly {
    readonly familyId: Phase14FamilyId;
    readonly referenceFailures: number;
    readonly narrowTargetFailures: number;
    readonly targetScenarios: number;
    readonly narrowControlFailures: number;
    readonly controlScenarios: number;
    readonly concentratedNarrowFailures: number;
    readonly concentratedScenarios: number;
    readonly balancedNarrowFailures: number;
    readonly balancedScenarios: number;
    readonly claim: "local-mutant-discrimination-only";
  }[];
  readonly estimates: readonly Phase14EffectEstimate[];
  readonly measuredOperatorRanking: readonly [];
  readonly model: {
    readonly exactIntervals: "Clopper-Pearson exact at independent-attempt level";
    readonly hierarchicalFit: "not-fit";
    readonly reason: string;
  };
  readonly corrections: readonly string[];
}

const stringValue = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value.trim() === "") throw new RigInputError(`${path} must be a string`);
  return value;
};

const numberValue = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new RigInputError(`${path} must be numeric`);
  return value;
};

const stringArray = (value: unknown, path: string): readonly string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new RigInputError(`${path} must be an array of strings`);
  }
  return value;
};

export function loadPhase14Preregistration(root: string): Phase14PreregistrationSummary {
  const path = "data/phase-14-preregistration.json" as const;
  const bytes = readFileSync(join(root, path), "utf8");
  const top = requireShape(JSON.parse(bytes), "phase14.preregistration", [
    "schema",
    "registeredAt",
    "registeredBeforeAgentOutput",
    "baselineCommit",
    "fixedValidityControls",
    "providerStrata",
    "design",
    "budgets",
  ]);
  if (top.schema !== "agent-eval-foundry/phase-14-operator-effects-preregistration@1") {
    throw new RigInputError("phase14.preregistration.schema is unsupported");
  }
  if (top.registeredBeforeAgentOutput !== true) {
    throw new RigInputError("Phase 14 must be registered before agent output");
  }
  if (!Array.isArray(top.providerStrata) || top.providerStrata.length !== 2) {
    throw new RigInputError("phase14.preregistration.providerStrata must contain two providers");
  }
  const providerStrata = top.providerStrata.map((raw, index) => {
    const row = requireShape(raw, `phase14.preregistration.providerStrata[${index}]`, [
      "providerFamily",
      "providerId",
      "model",
      "effort",
    ]);
    const providerFamilyRaw = stringValue(
      row.providerFamily,
      `phase14.providerStrata[${index}].providerFamily`,
    );
    if (providerFamilyRaw !== "openai" && providerFamilyRaw !== "anthropic") {
      throw new RigInputError(`phase14.providerStrata[${index}].providerFamily is unsupported`);
    }
    const providerFamily: "openai" | "anthropic" = providerFamilyRaw;
    return {
      providerFamily,
      providerId: stringValue(row.providerId, `phase14.providerStrata[${index}].providerId`),
      model: stringValue(row.model, `phase14.providerStrata[${index}].model`),
      effort: stringValue(row.effort, `phase14.providerStrata[${index}].effort`),
    };
  });
  if (new Set(providerStrata.map((provider) => provider.providerFamily)).size !== 2) {
    throw new RigInputError("phase14.preregistration.providerStrata must contain distinct provider families");
  }
  const design = requireShape(top.design, "phase14.preregistration.design", [
    "maximumSubjectAttempts",
    "attemptRows",
  ]);
  const budgets = requireShape(top.budgets, "phase14.preregistration.budgets", [
    "maximumSubjectAttempts",
    "maximumBlindLabels",
    "maximumTotalUsd",
  ]);
  const designMaximum = numberValue(design.maximumSubjectAttempts, "phase14.design.maximumSubjectAttempts");
  const budgetMaximum = numberValue(budgets.maximumSubjectAttempts, "phase14.budgets.maximumSubjectAttempts");
  if (designMaximum !== 12 || budgetMaximum !== designMaximum) {
    throw new RigInputError("Phase 14 must preserve the registered 12-attempt ceiling");
  }
  const registeredAttemptRows = stringArray(design.attemptRows, "phase14.design.attemptRows");
  const expectedAttemptRows = STARTER_PROFILES.flatMap((starterProfile) =>
    PHASE14_FAMILIES.flatMap((familyId) =>
      providerStrata.map((provider) => `${familyId}/${starterProfile}/${provider.providerFamily}`),
    ),
  );
  if (registeredAttemptRows.join("\n") !== expectedAttemptRows.join("\n")) {
    throw new RigInputError(
      "Phase 14 attempt rows must match the registered family x starter x provider order",
    );
  }
  return {
    path,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    baselineCommit: stringValue(top.baselineCommit, "phase14.preregistration.baselineCommit"),
    registeredAt: stringValue(top.registeredAt, "phase14.preregistration.registeredAt"),
    registeredBeforeAgentOutput: true,
    fixedValidityControls: stringArray(
      top.fixedValidityControls,
      "phase14.preregistration.fixedValidityControls",
    ),
    providerStrata,
    maximumSubjectAttempts: designMaximum,
    maximumBlindLabels: numberValue(budgets.maximumBlindLabels, "phase14.budgets.maximumBlindLabels"),
    maximumTotalUsd: numberValue(budgets.maximumTotalUsd, "phase14.budgets.maximumTotalUsd"),
  };
}

const attemptId = (
  familyId: Phase14FamilyId,
  starterProfile: StarterProfile,
  providerFamily: "openai" | "anthropic",
): string => `phase14-${familyId}-${starterProfile}-${providerFamily}`;

export function buildPhase14TrialLedger(root: string): Phase14TrialLedger {
  const preregistration = loadPhase14Preregistration(root);
  const packageLock = buildPhase14PackageLock(root);
  const scenarioLock = buildPhase14ScenarioLock(root);
  const preflight = buildPhase14Preflight(root);
  if (preflight.ready) {
    throw new Error(
      "Phase 14 preflight is now ready; execute the frozen sequential campaign before regenerating a NOT_RUN ledger",
    );
  }
  const attempts: Phase14TrialRow[] = [];
  for (const starterProfile of STARTER_PROFILES) {
    for (const familyId of PHASE14_FAMILIES) {
      const packageRow = packageLock.rows.find(
        (row) => row.familyId === familyId && row.starterProfile === starterProfile,
      );
      if (packageRow === undefined)
        throw new Error(`missing Phase 14 package lock for ${familyId}/${starterProfile}`);
      const familyScenarios = scenarioLock.rows.filter((row) => row.familyId === familyId);
      if (familyScenarios.length !== 24 || familyScenarios.filter((row) => row.inBalanced12).length !== 12) {
        throw new Error(`invalid Phase 14 scenario lock for ${familyId}`);
      }
      for (const provider of preregistration.providerStrata) {
        attempts.push({
          attemptId: attemptId(familyId, starterProfile, provider.providerFamily),
          stage: starterProfile === "seeded-recompute" ? "seeded-smoke" : "neutral-expansion",
          familyId,
          starterProfile,
          providerFamily: provider.providerFamily,
          providerId: provider.providerId,
          model: provider.model,
          effort: provider.effort,
          challengeHash: packageRow.challengeHash,
          scenarioSetId: packageRow.scenarioSetId,
          primaryScenarioProfile: "concentrated-24",
          primaryScenarios: 24,
          secondaryScenarioProfile: "balanced-12",
          secondaryScenarios: 12,
          state: "NOT_RUN",
          executionEligibility: "blocked-preflight",
          countability: {
            counts: false,
            reason: `not run: ${preflight.blockers.join("; ")}`,
          },
          reward: null,
          capabilityAttributedFailure: null,
          selfCheckGreen: null,
          failedChecks: [],
          failureConcentration: null,
          scenarioResults: [],
          runtimeSeconds: null,
          costUsd: null,
          usage: null,
          artifacts: {
            challenge: null,
            submission: null,
            transcript: null,
            metadata: null,
            verifierOutput: null,
            normalizedResult: null,
            countabilityDecision: null,
            workspace: null,
            selfChecks: null,
            blindLabels: [],
          },
        });
      }
    }
  }
  if (attempts.length !== preregistration.maximumSubjectAttempts) {
    throw new Error(`Phase 14 ledger produced ${attempts.length} rows, expected 12`);
  }
  return {
    schema: "agent-eval-foundry/phase-14-trial-ledger@1",
    preregistration,
    status: "BLOCKED_PREFLIGHT",
    blockers: preflight.blockers,
    attempts,
    summary: {
      plannedAttempts: attempts.length,
      attempted: 0,
      countable: 0,
      cleanSolves: 0,
      rewardZero: 0,
      agreedCapabilityFailures: 0,
      unlabelledFailures: 0,
      spentUsd: 0,
    },
  };
}

const notEstimable = (
  estimandId: string,
  category: Phase14EffectEstimate["category"],
  reason: string,
): Phase14EffectEstimate => {
  const exactInterval = exactBinomialInterval(0, 0);
  if (exactInterval !== null) throw new Error("an exact interval must not be emitted for zero observations");
  return {
    estimandId,
    category,
    status: "not-estimable",
    independentAttempts: 0,
    exactInterval,
    estimate: null,
    reason,
  };
};

export function buildPhase14EffectLedger(root: string): Phase14EffectLedger {
  const trials = buildPhase14TrialLedger(root);
  const phase13 = measurePhase13(root);
  const scenarioLock = buildPhase14ScenarioLock(root);
  const localCalibration = phase13.substrates.map((substrate) => {
    const balanced = scenarioLock.rows.filter((row) => row.familyId === substrate.id && row.inBalanced12);
    const balancedTargets = balanced.filter((row) => row.activation === "target").length;
    if (
      substrate.selected.narrowTargetFailures !== substrate.selected.targetScenarios ||
      substrate.selected.narrowControlFailures !== 0
    ) {
      throw new Error(
        `${substrate.id}: balanced local failures cannot be derived unless every frozen target fails and every control passes`,
      );
    }
    return {
      familyId: substrate.id,
      referenceFailures: substrate.selected.referenceFailures,
      narrowTargetFailures: substrate.selected.narrowTargetFailures,
      targetScenarios: substrate.selected.targetScenarios,
      narrowControlFailures: substrate.selected.narrowControlFailures,
      controlScenarios: substrate.selected.controls,
      concentratedNarrowFailures: substrate.selected.narrowFailures,
      concentratedScenarios: substrate.selected.scenarios,
      balancedNarrowFailures: balancedTargets,
      balancedScenarios: balanced.length,
      claim: "local-mutant-discrimination-only" as const,
    };
  });
  return {
    schema: "agent-eval-foundry/phase-14-effect-ledger@1",
    preregistrationSha256: trials.preregistration.sha256,
    status: "NO_AGENT_EFFECTS_MEASURED",
    evidenceBoundary:
      "All effect estimates remain empty because the cross-provider preflight failed. Phase 13 mutant outcomes calibrate the verifier and scenario design; they are not agent effects.",
    rawAttemptCells: trials.attempts,
    validityControls: trials.preregistration.fixedValidityControls.map((id) => ({
      id,
      enabled: true,
      category: "validity-control",
      agentEffectRanked: false,
    })),
    localCalibration,
    estimates: [
      notEstimable("E1-family", "family", "No independent agent attempt ran in any family stratum."),
      notEstimable("E2-starter", "genuine-difficulty", "No matched seeded-versus-neutral attempt pair ran."),
      notEstimable(
        "E3-activation",
        "genuine-difficulty",
        "No agent artifact exists to compare activated targets with nonactivation controls.",
      ),
      notEstimable(
        "E4-selection",
        "selection-coverage",
        "No agent verifier output exists to rescore under both frozen scenario profiles.",
      ),
      notEstimable(
        "E5-family-by-starter",
        "genuine-difficulty",
        "No family contains a matched starter contrast.",
      ),
      notEstimable(
        "E6-family-by-activation",
        "genuine-difficulty",
        "No within-artifact activation contrast exists for an agent attempt.",
      ),
    ],
    measuredOperatorRanking: [],
    model: {
      exactIntervals: "Clopper-Pearson exact at independent-attempt level",
      hierarchicalFit: "not-fit",
      reason:
        "Zero observations cannot estimate an effect. Even the registered maximum n=12 has one attempt per family, starter and provider cell, so stable hierarchical variance components would be unidentifiable and prior-dominated.",
    },
    corrections: [
      "Phase 13's 24 scenario rows are one submission cluster, not 24 independent agent trials.",
      "The frozen 24-scenario suite has no U0C0 row. Activation is therefore a paired target-versus-nonactivation description, not the local Phase 13 2x2 agent design.",
      "The starter contrast changes starter code and the README row that accurately describes it; it is a registered package-profile effect, not a pure one-line code effect.",
      "Existing Phase 13 campaigns declare subprocess isolation. They do not satisfy Phase 14's container prerequisite.",
      "The generic container command defaults to an image without either provider CLI. Docker availability and artifact isolation do not establish provider-agent container execution.",
      "The existing one-sidecar root-cause format cannot establish two-reader agreement. Phase 14 added a distinct cross-provider blind-label contract and B6 controls.",
    ],
  };
}

export const renderPhase14TrialLedger = (ledger: Phase14TrialLedger): string =>
  `${JSON.stringify(ledger, null, 2)}\n`;

export const renderPhase14EffectLedger = (ledger: Phase14EffectLedger): string =>
  `${JSON.stringify(ledger, null, 2)}\n`;
