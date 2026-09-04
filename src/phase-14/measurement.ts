import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { measurePhase13 } from "../reports/phase-13-transfer.js";
import { profileRun } from "../reports/self-check.js";
import type { SelfCheckProfile } from "../reports/self-check.js";
import { RigInputError, requireShape } from "../screens/rig-integrity.js";
import { readTrialDirectory } from "../trials/directory.js";
import { hashChallengeDir } from "../trials/run.js";
import type { TrialUsage } from "../trials/types.js";
import { PHASE14_READER_FAMILIES, adjudicatePhase14Labels, parsePhase14BlindLabel } from "./blind-labels.js";
import type { Phase14BlindLabel, Phase14LabelDecision } from "./blind-labels.js";
import {
  PHASE14_FAMILIES,
  STARTER_PROFILES,
  buildPhase14PackageLock,
  buildPhase14ScenarioLock,
} from "./packages.js";
import type { Phase14FamilyId, Phase14ScenarioRow, StarterProfile } from "./packages.js";
import { buildPhase14Preflight } from "./preflight.js";
import { exactBinomialInterval } from "./statistics.js";
import type { ExactBinomialInterval } from "./statistics.js";

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
  readonly maximumSubjectTrialUsd: number;
  readonly maximumBlindLabellingUsd: number;
  readonly maximumTotalUsd: number;
}

export interface Phase14ScenarioResult {
  readonly scenarioId: string;
  readonly activation: "target" | "control";
  readonly inBalanced12: boolean;
  readonly failed: readonly string[];
}

export interface Phase14FailureConcentration {
  readonly targetFailed: number;
  readonly targetTotal: 18;
  readonly controlFailed: number;
  readonly controlTotal: 6;
  readonly balancedFailed: number;
  readonly balancedTotal: 12;
  readonly concentratedFailed: number;
  readonly concentratedTotal: 24;
  readonly broadUnrelatedSpread: boolean;
}

export type Phase14ExecutionEligibility =
  | "blocked-preflight"
  | "eligible"
  | "awaiting-prior-cell"
  | "awaiting-expansion-rule"
  | "stopped-by-rule"
  | "attempted";

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
  readonly state: "NOT_RUN" | "COUNTED_SOLVE" | "COUNTED_FAILURE" | "UNCOUNTED";
  executionEligibility: Phase14ExecutionEligibility;
  readonly countability: { readonly counts: boolean; readonly reason: string };
  readonly reward: 0 | 1 | null;
  readonly capabilityAttributedFailure: boolean | null;
  readonly labelDecision: Phase14LabelDecision | null;
  readonly selfCheckGreen: boolean | null;
  readonly selfCheckProfile: SelfCheckProfile | null;
  readonly failedChecks: readonly string[];
  readonly failureConcentration: Phase14FailureConcentration | null;
  readonly scenarioResults: readonly Phase14ScenarioResult[];
  readonly runtimeSeconds: number | null;
  readonly costUsd: number | null;
  readonly usage: TrialUsage | null;
  readonly artifacts: {
    readonly challenge: string | null;
    readonly submission: string | null;
    readonly transcript: string | null;
    readonly metadata: string | null;
    readonly verifierOutput: string | null;
    readonly normalizedResult: string | null;
    readonly countabilityDecision: string | null;
    readonly workspace: string | null;
    readonly selfChecks: string | null;
    readonly blindPacket: string | null;
    readonly blindLabels: readonly string[];
  };
}

export interface Phase14TrialLedger {
  readonly schema: "agent-eval-foundry/phase-14-trial-ledger@2";
  readonly preregistration: Phase14PreregistrationSummary;
  readonly status:
    | "BLOCKED_PREFLIGHT"
    | "READY"
    | "IN_PROGRESS"
    | "PAUSED_FOR_LABELS"
    | "STOPPED_BY_RULE"
    | "COMPLETE";
  readonly blockers: readonly string[];
  readonly nextAttemptId: string | null;
  readonly attempts: readonly Phase14TrialRow[];
  readonly summary: {
    readonly plannedAttempts: number;
    readonly attempted: number;
    readonly countable: number;
    readonly cleanSolves: number;
    readonly rewardZero: number;
    readonly agreedCapabilityFailures: number;
    readonly agreedNoncapabilityFailures: number;
    readonly unresolvedFailures: number;
    readonly spentUsd: number;
    readonly unpricedAttempts: number;
    readonly blindLabelsRun: number;
    readonly blindLabelSpendUsd: number;
    readonly unpricedBlindLabels: number;
    readonly pricedCampaignSpendUsd: number;
    readonly preflightProbeSpendUsd: number;
  };
}

export interface Phase14EffectEstimate {
  readonly estimandId: string;
  readonly category: "family" | "genuine-difficulty" | "selection-coverage";
  readonly status: "measured-descriptive" | "not-estimable";
  readonly independentAttempts: number;
  readonly exactInterval: ExactBinomialInterval | null;
  readonly estimate: number | null;
  readonly detail: Readonly<Record<string, unknown>> | null;
  readonly reason: string;
}

export interface Phase14EffectLedger {
  readonly schema: "agent-eval-foundry/phase-14-effect-ledger@2";
  readonly preregistrationSha256: string;
  readonly status: "NO_AGENT_EFFECTS_MEASURED" | "PARTIAL_AGENT_EFFECTS" | "REGISTERED_MATRIX_COMPLETE";
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
  readonly measuredOperatorRanking: readonly {
    readonly rank: number;
    readonly operator: string;
    readonly status: "demonstrated";
    readonly estimate: number;
    readonly basis: string;
  }[];
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
    "maximumSubjectTrialUsd",
    "maximumBlindLabellingUsd",
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
    maximumSubjectTrialUsd: numberValue(
      budgets.maximumSubjectTrialUsd,
      "phase14.budgets.maximumSubjectTrialUsd",
    ),
    maximumBlindLabellingUsd: numberValue(
      budgets.maximumBlindLabellingUsd,
      "phase14.budgets.maximumBlindLabellingUsd",
    ),
    maximumTotalUsd: numberValue(budgets.maximumTotalUsd, "phase14.budgets.maximumTotalUsd"),
  };
}

const attemptId = (
  familyId: Phase14FamilyId,
  starterProfile: StarterProfile,
  providerFamily: "openai" | "anthropic",
): string => `phase14-${familyId}-${starterProfile}-${providerFamily}`;

const rel = (root: string, path: string): string => relative(root, path);

const fileTree = (root: string, paths: readonly string[]): readonly { name: string; source: string }[] =>
  paths.map((name) => ({ name, source: readFileSync(join(root, name), "utf8") }));

const lifecycleState = (status: string, counts: boolean) => {
  if (counts) return "counted" as const;
  if (status === "refused") return "refused" as const;
  if (status === "crashed") return "crashed" as const;
  return "infra" as const;
};

function readBlindLabels(root: string, trialDir: string): readonly Phase14BlindLabel[] {
  const labels: Phase14BlindLabel[] = [];
  for (const providerFamily of PHASE14_READER_FAMILIES) {
    const path = join(trialDir, "blind-labels", providerFamily, "label.json");
    if (!existsSync(path)) continue;
    const label = parsePhase14BlindLabel(JSON.parse(readFileSync(path, "utf8")), rel(root, path));
    const packet = join(trialDir, label.packetPath);
    if (!existsSync(packet)) throw new RigInputError(`${rel(root, path)} names an absent packet`);
    const digest = createHash("sha256").update(readFileSync(packet)).digest("hex");
    if (digest !== label.packetSha256) {
      throw new RigInputError(`${rel(root, path)} packet hash does not match preserved bytes`);
    }
    labels.push(label);
  }
  return labels;
}

const scenarioResults = (
  familyRows: readonly Phase14ScenarioRow[],
  cells: readonly { scenarioId: string; failed: readonly string[] }[],
): readonly Phase14ScenarioResult[] =>
  cells.map((cell) => {
    const locked = familyRows.find((row) => row.scenarioId === cell.scenarioId);
    if (locked === undefined)
      throw new RigInputError(`${cell.scenarioId}: not in the Phase 14 scenario lock`);
    return {
      scenarioId: cell.scenarioId,
      activation: locked.activation,
      inBalanced12: locked.inBalanced12,
      failed: [...cell.failed],
    };
  });

const concentration = (rows: readonly Phase14ScenarioResult[]): Phase14FailureConcentration => {
  const failures = rows.filter((row) => row.failed.length > 0);
  const target = rows.filter((row) => row.activation === "target");
  const controls = rows.filter((row) => row.activation === "control");
  const balanced = rows.filter((row) => row.inBalanced12);
  const allowed = new Set([
    "exactly_once",
    "stable_key_recovered",
    "committed_order_key_recovered",
    "committed_rollback_key_recovered",
    "liveness",
    "report_matches_call_ledger",
    "report_matches_venue_ledger",
    "report_matches_controller_ledger",
    "local_confirmation_green",
  ]);
  return {
    targetFailed: target.filter((row) => row.failed.length > 0).length,
    targetTotal: 18,
    controlFailed: controls.filter((row) => row.failed.length > 0).length,
    controlTotal: 6,
    balancedFailed: balanced.filter((row) => row.failed.length > 0).length,
    balancedTotal: 12,
    concentratedFailed: failures.length,
    concentratedTotal: 24,
    broadUnrelatedSpread: failures.some((row) => row.failed.some((check) => !allowed.has(check))),
  };
};

type TrialRowBase = Omit<
  Phase14TrialRow,
  | "state"
  | "executionEligibility"
  | "countability"
  | "reward"
  | "capabilityAttributedFailure"
  | "labelDecision"
  | "selfCheckGreen"
  | "selfCheckProfile"
  | "failedChecks"
  | "failureConcentration"
  | "scenarioResults"
  | "runtimeSeconds"
  | "costUsd"
  | "usage"
  | "artifacts"
>;

function observedRow(
  root: string,
  base: TrialRowBase,
  familyRows: readonly Phase14ScenarioRow[],
  preregistration: Phase14PreregistrationSummary,
): Phase14TrialRow | null {
  const trialDir = join(root, "trials", base.familyId, base.attemptId);
  if (!existsSync(trialDir)) return null;
  const trial = readTrialDirectory(trialDir);
  const metadataPath = join(trialDir, "metadata.json");
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as Record<string, unknown>;
  const actualHash = hashChallengeDir(join(trialDir, "challenge"));
  const gradingB6 = metadata.gradingB6 as Record<string, unknown> | undefined;
  const providerB6 = metadata.providerContainerB6 as Record<string, unknown> | undefined;
  const violations = [
    ...(trial.runId === base.attemptId ? [] : ["run id"]),
    ...(trial.familyId === base.familyId ? [] : ["family"]),
    ...(trial.record.model === base.model ? [] : ["model"]),
    ...(trial.record.effort === base.effort ? [] : ["effort"]),
    ...(trial.record.scenarioSetId === base.scenarioSetId ? [] : ["scenario set"]),
    ...(trial.record.isolation === "container" ? [] : ["provider isolation"]),
    ...(metadata.challengeHash === base.challengeHash && actualHash === base.challengeHash
      ? []
      : ["challenge hash"]),
    ...(metadata.preregistrationSha256 === preregistration.sha256 ? [] : ["preregistration hash"]),
    ...(metadata.starterProfile === base.starterProfile ? [] : ["starter profile"]),
    ...(metadata.providerFamily === base.providerFamily ? [] : ["provider family"]),
    ...(metadata.captureLevel === "full" ? [] : ["capture level"]),
    ...(metadata.verifierProfile === "phase14-host-owned-verifier/container-no-network-submission@1"
      ? []
      : ["artifact isolation profile"]),
    ...(gradingB6?.sameInvocation === true && gradingB6.passed === true ? [] : ["grading B6"]),
    ...(providerB6?.usable === true &&
    providerB6.knownGoodPassed === true &&
    providerB6.knownBadFailed === true &&
    providerB6.malformedInputRefused === true
      ? []
      : ["provider-container B6"]),
  ];
  if (violations.length > 0) {
    throw new RigInputError(`${base.attemptId}: preserved trial mismatches ${violations.join(", ")}`);
  }
  if (trial.record.counts && trial.record.cells.length !== 24) {
    throw new RigInputError(`${base.attemptId}: counted trial graded ${trial.record.cells.length}/24 rows`);
  }
  const results = scenarioResults(familyRows, trial.record.cells);
  const failed = results.filter((row) => row.failed.length > 0);
  const reward = trial.record.counts ? (failed.length === 0 ? 1 : 0) : null;
  const labels = readBlindLabels(root, trialDir);
  const labelDecision = trial.record.counts
    ? adjudicatePhase14Labels(base.attemptId, base.familyId, failed.length > 0, labels)
    : null;
  const submissionFiles = fileTree(join(trialDir, "submission"), trial.submissionFiles);
  const transcriptPath = join(trialDir, "transcript.txt");
  const selfCheckProfile = profileRun({
    runId: base.attemptId,
    familyId: base.familyId,
    subjectId: trial.record.subjectId,
    providerFamily: base.providerFamily,
    state: lifecycleState(trial.record.status, trial.record.counts),
    scenariosFailed: failed.length,
    submissionFiles,
    transcript: readFileSync(transcriptPath, "utf8"),
    gradedArtifact: "subject.mjs",
    harness: "phase14 streamed provider container",
  });
  const blindPacket = join(trialDir, "blind-label-packet.json");
  const blindLabelPaths = labels.map((label) =>
    rel(root, join(trialDir, "blind-labels", label.providerFamily, "label.json")),
  );
  return {
    ...base,
    state: trial.record.counts ? (reward === 1 ? "COUNTED_SOLVE" : "COUNTED_FAILURE") : "UNCOUNTED",
    executionEligibility: "attempted",
    countability: { counts: trial.record.counts, reason: trial.record.countsReason },
    reward,
    capabilityAttributedFailure:
      reward === 0 && labelDecision !== null ? labelDecision.difficultyEvidence : null,
    labelDecision,
    selfCheckGreen: null,
    selfCheckProfile,
    failedChecks: [...new Set(failed.flatMap((row) => row.failed))].sort(),
    failureConcentration: trial.record.counts ? concentration(results) : null,
    scenarioResults: results,
    runtimeSeconds: trial.record.runtimeSeconds,
    costUsd: trial.record.costUsd,
    usage: trial.record.usage ?? null,
    artifacts: {
      challenge: rel(root, join(trialDir, "challenge")),
      submission: rel(root, join(trialDir, "submission")),
      transcript: rel(root, transcriptPath),
      metadata: rel(root, metadataPath),
      verifierOutput: rel(root, join(trialDir, "verifier-output.json")),
      normalizedResult: rel(root, join(trialDir, "result.json")),
      countabilityDecision: rel(root, join(trialDir, "countability.json")),
      workspace: existsSync(join(trialDir, "workspace")) ? rel(root, join(trialDir, "workspace")) : null,
      selfChecks: null,
      blindPacket: existsSync(blindPacket) ? rel(root, blindPacket) : null,
      blindLabels: blindLabelPaths,
    },
  };
}

const blankArtifacts = (): Phase14TrialRow["artifacts"] => ({
  challenge: null,
  submission: null,
  transcript: null,
  metadata: null,
  verifierOutput: null,
  normalizedResult: null,
  countabilityDecision: null,
  workspace: null,
  selfChecks: null,
  blindPacket: null,
  blindLabels: [],
});

const failureNeedsLabels = (row: Phase14TrialRow): boolean =>
  row.state === "COUNTED_FAILURE" && (row.labelDecision === null || row.labelDecision.status === "pending");

const labelRunCosts = (
  root: string,
  attempts: readonly Phase14TrialRow[],
): readonly { costUsd: number | null }[] =>
  attempts.flatMap((attempt) =>
    PHASE14_READER_FAMILIES.flatMap((providerFamily) => {
      const path = join(
        root,
        "trials",
        attempt.familyId,
        attempt.attemptId,
        "blind-labels",
        providerFamily,
        "metadata.json",
      );
      if (!existsSync(path)) return [];
      const metadata = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
      const costUsd = metadata.costUsd;
      if (costUsd !== null && (typeof costUsd !== "number" || !Number.isFinite(costUsd))) {
        throw new RigInputError(`${rel(root, path)}.costUsd must be numeric or null`);
      }
      return [{ costUsd: costUsd as number | null }];
    }),
  );

export function buildPhase14TrialLedger(root: string): Phase14TrialLedger {
  const preregistration = loadPhase14Preregistration(root);
  const packageLock = buildPhase14PackageLock(root);
  const scenarioLock = buildPhase14ScenarioLock(root);
  const preflight = buildPhase14Preflight(root);
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
        const common: TrialRowBase = {
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
        };
        const observed = observedRow(root, common, familyScenarios, preregistration);
        attempts.push(
          observed ?? {
            ...common,
            state: "NOT_RUN",
            executionEligibility: preflight.ready ? "awaiting-prior-cell" : "blocked-preflight",
            countability: {
              counts: false,
              reason: preflight.ready
                ? "not run: awaiting the frozen sequential rule"
                : `not run: ${preflight.blockers.join("; ")}`,
            },
            reward: null,
            capabilityAttributedFailure: null,
            labelDecision: null,
            selfCheckGreen: null,
            selfCheckProfile: null,
            failedChecks: [],
            failureConcentration: null,
            scenarioResults: [],
            runtimeSeconds: null,
            costUsd: null,
            usage: null,
            artifacts: blankArtifacts(),
          },
        );
      }
    }
  }
  if (attempts.length !== preregistration.maximumSubjectAttempts) {
    throw new Error(`Phase 14 ledger produced ${attempts.length} rows, expected 12`);
  }

  const seeded = attempts.filter((row) => row.stage === "seeded-smoke");
  const neutral = attempts.filter((row) => row.stage === "neutral-expansion");
  const firstSeeded = seeded.find((row) => row.state === "NOT_RUN");
  let nextAttemptId: string | null = null;
  let pausedForLabels = false;
  let stoppedByRule = false;
  if (preflight.ready && firstSeeded !== undefined) {
    firstSeeded.executionEligibility = "eligible";
    nextAttemptId = firstSeeded.attemptId;
  } else if (preflight.ready) {
    const seededFailures = seeded.filter((row) => row.state === "COUNTED_FAILURE");
    pausedForLabels = seededFailures.some(failureNeedsLabels);
    const anyCapability = seededFailures.some((row) => row.labelDecision?.status === "agreed-capability");
    const anyUnresolved = seededFailures.some(
      (row) => row.labelDecision?.status === "disagreed" || row.labelDecision?.status === "pending",
    );
    const allSeededClean = seeded.every((row) => row.state === "COUNTED_SOLVE");
    let eligibleNeutral: Phase14TrialRow | undefined;
    if (!pausedForLabels && anyCapability) {
      eligibleNeutral = neutral.find((row) => row.state === "NOT_RUN");
    } else if (!pausedForLabels && allSeededClean) {
      const sentinels = neutral.filter((row) => row.familyId === "dao-descendant");
      eligibleNeutral = sentinels.find((row) => row.state === "NOT_RUN");
      if (eligibleNeutral === undefined) {
        const sentinelsClean = sentinels.every((row) => row.state === "COUNTED_SOLVE");
        stoppedByRule = sentinelsClean;
        const sentinelCapability = sentinels.some((row) => row.labelDecision?.status === "agreed-capability");
        const sentinelUnresolved = sentinels.some(
          (row) => row.state === "COUNTED_FAILURE" && row.labelDecision?.status !== "agreed-capability",
        );
        pausedForLabels = sentinelUnresolved;
        if (sentinelCapability) eligibleNeutral = neutral.find((row) => row.state === "NOT_RUN");
      }
    } else if (anyUnresolved) {
      pausedForLabels = true;
    }
    if (eligibleNeutral !== undefined) {
      eligibleNeutral.executionEligibility = "eligible";
      nextAttemptId = eligibleNeutral.attemptId;
    }
  }
  for (const row of attempts) {
    if (row.state !== "NOT_RUN" || row.executionEligibility === "eligible") continue;
    row.executionEligibility = stoppedByRule
      ? "stopped-by-rule"
      : row.stage === "neutral-expansion"
        ? "awaiting-expansion-rule"
        : row.executionEligibility;
  }

  const observed = attempts.filter((row) => row.state !== "NOT_RUN");
  const countable = observed.filter((row) => row.countability.counts);
  const failures = countable.filter((row) => row.reward === 0);
  const labelCosts = labelRunCosts(root, attempts);
  const subjectSpendUsd = observed.reduce((sum, row) => sum + (row.costUsd ?? 0), 0);
  const blindLabelSpendUsd = labelCosts.reduce((sum, row) => sum + (row.costUsd ?? 0), 0);
  const status: Phase14TrialLedger["status"] = !preflight.ready
    ? "BLOCKED_PREFLIGHT"
    : pausedForLabels
      ? "PAUSED_FOR_LABELS"
      : stoppedByRule
        ? "STOPPED_BY_RULE"
        : observed.length === 0
          ? "READY"
          : nextAttemptId === null && observed.length === attempts.length
            ? "COMPLETE"
            : "IN_PROGRESS";
  return {
    schema: "agent-eval-foundry/phase-14-trial-ledger@2",
    preregistration,
    status,
    blockers: preflight.blockers,
    nextAttemptId,
    attempts,
    summary: {
      plannedAttempts: attempts.length,
      attempted: observed.length,
      countable: countable.length,
      cleanSolves: countable.filter((row) => row.reward === 1).length,
      rewardZero: failures.length,
      agreedCapabilityFailures: failures.filter((row) => row.labelDecision?.status === "agreed-capability")
        .length,
      agreedNoncapabilityFailures: failures.filter(
        (row) => row.labelDecision?.status === "agreed-noncapability",
      ).length,
      unresolvedFailures: failures.filter(
        (row) =>
          row.labelDecision === null ||
          row.labelDecision.status === "pending" ||
          row.labelDecision.status === "disagreed",
      ).length,
      spentUsd: subjectSpendUsd,
      unpricedAttempts: observed.filter((row) => row.usage !== null && row.costUsd === null).length,
      blindLabelsRun: labelCosts.length,
      blindLabelSpendUsd,
      unpricedBlindLabels: labelCosts.filter((row) => row.costUsd === null).length,
      pricedCampaignSpendUsd: subjectSpendUsd + blindLabelSpendUsd,
      preflightProbeSpendUsd: preflight.preflightProbeSpendUsd,
    },
  };
}

const notEstimable = (
  estimandId: string,
  category: Phase14EffectEstimate["category"],
  reason: string,
): Phase14EffectEstimate => ({
  estimandId,
  category,
  status: "not-estimable",
  independentAttempts: 0,
  exactInterval: null,
  estimate: null,
  detail: null,
  reason,
});

const rawRate = (
  estimandId: string,
  category: Phase14EffectEstimate["category"],
  rows: readonly Phase14TrialRow[],
  outcome: (row: Phase14TrialRow) => boolean,
  reason: string,
): Phase14EffectEstimate => {
  const countable = rows.filter((row) => row.countability.counts);
  if (countable.length === 0) return notEstimable(estimandId, category, "No countable agent attempt exists.");
  const successes = countable.filter(outcome).length;
  return {
    estimandId,
    category,
    status: "measured-descriptive",
    independentAttempts: countable.length,
    exactInterval: exactBinomialInterval(successes, countable.length),
    estimate: successes / countable.length,
    detail: { successes, trials: countable.length },
    reason,
  };
};

const mean = (values: readonly number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

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
  const countable = trials.attempts.filter((row) => row.countability.counts);
  const activationRows = countable.filter((row) => row.failureConcentration !== null);
  const activationEstimate: Phase14EffectEstimate =
    activationRows.length === 0
      ? notEstimable(
          "E3-activation",
          "genuine-difficulty",
          "No agent artifact exists to score by activation.",
        )
      : {
          estimandId: "E3-activation",
          category: "genuine-difficulty",
          status: "measured-descriptive",
          independentAttempts: activationRows.length,
          exactInterval: null,
          estimate: mean(
            activationRows.map((row) => {
              const c = row.failureConcentration as Phase14FailureConcentration;
              return c.targetFailed / c.targetTotal - c.controlFailed / c.controlTotal;
            }),
          ),
          detail: {
            pairedClusterContrasts: activationRows.map((row) => ({
              attemptId: row.attemptId,
              targetFailureFraction:
                (row.failureConcentration as Phase14FailureConcentration).targetFailed / 18,
              controlFailureFraction:
                (row.failureConcentration as Phase14FailureConcentration).controlFailed / 6,
            })),
          },
          reason:
            "Paired within-artifact target minus control failure fraction; scenario rows are not independent trials and receive no binomial interval.",
        };
  const selectionEstimate: Phase14EffectEstimate =
    activationRows.length === 0
      ? notEstimable("E4-selection", "selection-coverage", "No agent artifact exists to rescore.")
      : {
          estimandId: "E4-selection",
          category: "selection-coverage",
          status: "measured-descriptive",
          independentAttempts: activationRows.length,
          exactInterval: null,
          estimate: mean(
            activationRows.map((row) => {
              const c = row.failureConcentration as Phase14FailureConcentration;
              return c.concentratedFailed / 24 - c.balancedFailed / 12;
            }),
          ),
          detail: {
            pairedRescores: activationRows.map((row) => ({
              attemptId: row.attemptId,
              concentratedReward: (row.failureConcentration as Phase14FailureConcentration).concentratedFailed
                ? 0
                : 1,
              balancedReward: (row.failureConcentration as Phase14FailureConcentration).balancedFailed
                ? 0
                : 1,
            })),
          },
          reason:
            "Deterministic concentrated-minus-balanced scenario-failure fraction on the same artifact; a coverage effect, not an agent-behavior effect.",
        };
  const paired = PHASE14_FAMILIES.flatMap((familyId) =>
    (["openai", "anthropic"] as const).flatMap((providerFamily) => {
      const seeded = countable.find(
        (row) =>
          row.familyId === familyId &&
          row.providerFamily === providerFamily &&
          row.starterProfile === "seeded-recompute",
      );
      const neutral = countable.find(
        (row) =>
          row.familyId === familyId &&
          row.providerFamily === providerFamily &&
          row.starterProfile === "neutral-skeleton",
      );
      return seeded === undefined || neutral === undefined
        ? []
        : [{ familyId, providerFamily, seeded, neutral }];
    }),
  );
  const starterEstimate: Phase14EffectEstimate =
    paired.length === 0
      ? notEstimable("E2-starter", "genuine-difficulty", "No matched seeded-versus-neutral attempt pair ran.")
      : {
          estimandId: "E2-starter",
          category: "genuine-difficulty",
          status: "measured-descriptive",
          independentAttempts: paired.length * 2,
          exactInterval: null,
          estimate: mean(
            paired.map((pair) => Number(pair.neutral.reward === 0) - Number(pair.seeded.reward === 0)),
          ),
          detail: {
            matchedContrasts: paired.map((pair) => ({
              familyId: pair.familyId,
              providerFamily: pair.providerFamily,
              seededReward: pair.seeded.reward,
              neutralReward: pair.neutral.reward,
            })),
          },
          reason:
            "Matched neutral-minus-seeded failure contrast. One stochastic attempt per cell limits causal precision.",
        };
  const rawFamilyEstimate = rawRate(
    "E1-family",
    "family",
    countable,
    (row) => row.reward === 0,
    "Raw reward-zero association across observed family strata; root-cause attribution is reported separately.",
  );
  const capabilityFailures = countable.filter(
    (row) => row.labelDecision?.status === "agreed-capability",
  ).length;
  const familyEstimate: Phase14EffectEstimate = {
    ...rawFamilyEstimate,
    detail:
      countable.length === 0
        ? null
        : {
            ...(rawFamilyEstimate.detail ?? {}),
            capabilityFailures,
            capabilityFailureRate: capabilityFailures / countable.length,
            capabilityExactInterval: exactBinomialInterval(capabilityFailures, countable.length),
            byFamily: PHASE14_FAMILIES.map((familyId) => {
              const rows = countable.filter((row) => row.familyId === familyId);
              const rewardZero = rows.filter((row) => row.reward === 0).length;
              const capability = rows.filter(
                (row) => row.labelDecision?.status === "agreed-capability",
              ).length;
              return {
                familyId,
                attempts: rows.length,
                rewardZero,
                rewardZeroRate: rows.length === 0 ? null : rewardZero / rows.length,
                rewardZeroExactInterval: exactBinomialInterval(rewardZero, rows.length),
                capabilityFailures: capability,
                capabilityFailureRate: rows.length === 0 ? null : capability / rows.length,
                capabilityExactInterval: exactBinomialInterval(capability, rows.length),
              };
            }),
            observedStrata: PHASE14_FAMILIES.flatMap((familyId) =>
              STARTER_PROFILES.flatMap((starterProfile) =>
                trials.preregistration.providerStrata.map((provider) => {
                  const rows = countable.filter(
                    (row) =>
                      row.familyId === familyId &&
                      row.starterProfile === starterProfile &&
                      row.providerFamily === provider.providerFamily,
                  );
                  const rewardZero = rows.filter((row) => row.reward === 0).length;
                  const capability = rows.filter(
                    (row) => row.labelDecision?.status === "agreed-capability",
                  ).length;
                  return {
                    familyId,
                    starterProfile,
                    providerFamily: provider.providerFamily,
                    attempts: rows.length,
                    rewardZero,
                    rewardZeroExactInterval: exactBinomialInterval(rewardZero, rows.length),
                    capabilityFailures: capability,
                    capabilityExactInterval: exactBinomialInterval(capability, rows.length),
                  };
                }),
              ),
            ),
          },
  };
  const effects: Phase14EffectEstimate[] = [
    familyEstimate,
    starterEstimate,
    activationEstimate,
    selectionEstimate,
    paired.length === 6
      ? {
          estimandId: "E5-family-by-starter",
          category: "genuine-difficulty",
          status: "measured-descriptive",
          independentAttempts: 12,
          exactInterval: null,
          estimate: null,
          detail: {
            byFamily: PHASE14_FAMILIES.map((familyId) => ({
              familyId,
              meanMatchedFailureContrast: mean(
                paired
                  .filter((pair) => pair.familyId === familyId)
                  .map((pair) => Number(pair.neutral.reward === 0) - Number(pair.seeded.reward === 0)),
              ),
            })),
          },
          reason: "Difference in matched starter contrasts by family, descriptive at smoke resolution.",
        }
      : notEstimable(
          "E5-family-by-starter",
          "genuine-difficulty",
          "All six family/provider matched starter pairs are required.",
        ),
    activationRows.length === countable.length && countable.length > 0
      ? {
          estimandId: "E6-family-by-activation",
          category: "genuine-difficulty",
          status: "measured-descriptive",
          independentAttempts: countable.length,
          exactInterval: null,
          estimate: null,
          detail: {
            byFamily: PHASE14_FAMILIES.map((familyId) => ({
              familyId,
              meanTargetMinusControl: mean(
                activationRows
                  .filter((row) => row.familyId === familyId)
                  .map((row) => {
                    const c = row.failureConcentration as Phase14FailureConcentration;
                    return c.targetFailed / 18 - c.controlFailed / 6;
                  }),
              ),
            })),
          },
          reason:
            "Within-artifact activation contrast split by family; descriptive, not an independent scenario model.",
        }
      : notEstimable(
          "E6-family-by-activation",
          "genuine-difficulty",
          "No complete activation contrasts exist.",
        ),
  ];
  const twoProviderMatched = new Set(paired.map((pair) => pair.providerFamily)).size === 2;
  const allFailureLabelsResolved = countable
    .filter((row) => row.reward === 0)
    .every(
      (row) =>
        row.labelDecision?.status === "agreed-capability" ||
        row.labelDecision?.status === "agreed-noncapability",
    );
  const measuredOperatorRanking =
    twoProviderMatched &&
    allFailureLabelsResolved &&
    starterEstimate.estimate !== null &&
    starterEstimate.estimate !== 0
      ? [
          {
            rank: 1,
            operator: "starter-profile-seeding",
            status: "demonstrated" as const,
            estimate: starterEstimate.estimate,
            basis: "matched neutral-minus-seeded attempt failure contrast in both provider families",
          },
        ]
      : [];
  return {
    schema: "agent-eval-foundry/phase-14-effect-ledger@2",
    preregistrationSha256: trials.preregistration.sha256,
    status:
      countable.length === 0
        ? "NO_AGENT_EFFECTS_MEASURED"
        : trials.status === "COMPLETE" || trials.status === "STOPPED_BY_RULE"
          ? "REGISTERED_MATRIX_COMPLETE"
          : "PARTIAL_AGENT_EFFECTS",
    evidenceBoundary:
      "Reward zero is reported separately from difficulty. Only a counted failure with two independently produced cross-provider labels agreeing on capability enters the capability rate or an operator ranking.",
    rawAttemptCells: trials.attempts,
    validityControls: trials.preregistration.fixedValidityControls.map((id) => ({
      id,
      enabled: true,
      category: "validity-control",
      agentEffectRanked: false,
    })),
    localCalibration,
    estimates: effects,
    measuredOperatorRanking,
    model: {
      exactIntervals: "Clopper-Pearson exact at independent-attempt level",
      hierarchicalFit: "not-fit",
      reason:
        "The registered maximum has one stochastic attempt per family x starter x provider cell. Stable hierarchical variance components would be unidentifiable and prior-dominated, so raw cells and stratified descriptive contrasts are reported instead.",
    },
    corrections: [
      "Phase 13's 24 scenario rows are one submission cluster, not 24 independent agent trials.",
      "The frozen 24-scenario suite has no U0C0 row. Activation is therefore a paired target-versus-nonactivation description, not the local Phase 13 2x2 agent design.",
      "The starter contrast changes starter code and the README row that accurately describes it; it is a registered package-profile effect, not a pure one-line code effect.",
      "Phase 13 campaigns used subprocess grading. Phase 14 executes provider agents in pinned containers and re-runs submitted modules in separate no-network containers before host-owned verification.",
      "Codex reports token usage but no dollar price. Its measured cost stays null and is counted as unpriced, never converted with a rate literal.",
      "A self-check is not marked green from model prose. The field remains null unless a machine-readable result survives capture.",
      "A cross-provider starter contrast measured at zero is retained as a measured null result and is not promoted into the demonstrated-operator ranking.",
      "Phase 12 made recipe profiles first-class in shape and evolution data but not in challenge-hash evidence lifecycle. The first neutral trial exposed the gap; registered variants now remain visible and are excluded from canonical family banks without being misclassified as package migrations.",
    ],
  };
}

export const renderPhase14TrialLedger = (ledger: Phase14TrialLedger): string =>
  `${JSON.stringify(ledger, null, 2)}\n`;

export const renderPhase14EffectLedger = (ledger: Phase14EffectLedger): string =>
  `${JSON.stringify(ledger, null, 2)}\n`;
