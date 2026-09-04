import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RigInputError } from "../screens/rig-integrity.js";
import { orchestrateTrial } from "../trials/orchestrator.js";
import { gradePhase14ContainerSubmission, routeFor } from "../trials/router.js";
import { hashChallengeDir } from "../trials/run.js";
import { containerIsolationDetail } from "../trials/runners.js";
import type { TrialCell } from "../trials/types.js";
import { buildPhase14TrialLedger, loadPhase14Preregistration } from "./measurement.js";
import {
  PHASE14_FAMILIES,
  STARTER_PROFILES,
  buildPhase14PackageLock,
  buildPhase14ScenarioLock,
  phase14ChallengePackage,
  writeChallengePackage,
} from "./packages.js";
import type { Phase14FamilyId, StarterProfile } from "./packages.js";
import { buildPhase14Preflight } from "./preflight.js";
import {
  PHASE14_PROVIDER_IMAGE,
  phase14ProviderCommand,
  phase14ProviderContainerB6,
  stageCodexCredential,
} from "./provider-runtime.js";
import type { Phase14ProviderFamily } from "./provider-runtime.js";

export interface Phase14AttemptSpec {
  readonly attemptId: string;
  readonly stage: "seeded-smoke" | "neutral-expansion";
  readonly familyId: Phase14FamilyId;
  readonly starterProfile: StarterProfile;
  readonly providerFamily: Phase14ProviderFamily;
  readonly providerId: string;
  readonly model: string;
  readonly effort: string;
}

export interface Phase14ExecutionResult {
  readonly attempt: Phase14AttemptSpec;
  readonly directory: string;
  readonly classification: string;
  readonly counts: boolean;
  readonly scenariosFailed: number;
  readonly scenariosGraded: number;
  readonly runtimeSeconds: number | null;
  readonly costUsd: number | null;
}

export const phase14AttemptId = (
  familyId: Phase14FamilyId,
  starterProfile: StarterProfile,
  providerFamily: Phase14ProviderFamily,
): string => `phase14-${familyId}-${starterProfile}-${providerFamily}`;

export function phase14AttemptSpecs(root: string): readonly Phase14AttemptSpec[] {
  const preregistration = loadPhase14Preregistration(root);
  return STARTER_PROFILES.flatMap((starterProfile) =>
    PHASE14_FAMILIES.flatMap((familyId) =>
      preregistration.providerStrata.map(
        (provider): Phase14AttemptSpec => ({
          attemptId: phase14AttemptId(familyId, starterProfile, provider.providerFamily),
          stage: starterProfile === "seeded-recompute" ? "seeded-smoke" : "neutral-expansion",
          familyId,
          starterProfile,
          providerFamily: provider.providerFamily,
          providerId: provider.providerId,
          model: provider.model,
          effort: provider.effort,
        }),
      ),
    ),
  );
}

const attemptDirectory = (root: string, attempt: Phase14AttemptSpec): string =>
  join(root, "trials", attempt.familyId, attempt.attemptId);

/** Stage 1 is immutable and sequential. Later cells are unlocked only by the registered label rule. */
export function nextPhase14SeededAttempt(root: string): Phase14AttemptSpec | null {
  return (
    phase14AttemptSpecs(root)
      .filter((attempt) => attempt.stage === "seeded-smoke")
      .find((attempt) => !existsSync(attemptDirectory(root, attempt))) ?? null
  );
}

function imageId(): string {
  return execFileSync("docker", ["image", "inspect", "--format={{.Id}}", PHASE14_PROVIDER_IMAGE], {
    encoding: "utf8",
    timeout: 20_000,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const broadFailureSpread = (cells: readonly TrialCell[]): boolean => {
  const permitted = new Set([
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
  return cells.some((cell) => cell.failed.some((check) => !permitted.has(check)));
};

/** Execute exactly the next cell unlocked by the frozen sequential rule. */
export function executePhase14Attempt(root: string, requestedAttemptId: string): Phase14ExecutionResult {
  const preflight = buildPhase14Preflight(root);
  if (!preflight.ready) {
    throw new RigInputError(`Phase 14 preflight is blocked: ${preflight.blockers.join("; ")}`);
  }
  const providerB6 = phase14ProviderContainerB6();
  if (!providerB6.usable) throw new RigInputError("Phase 14 provider-container B6 is not usable");

  const ledger = buildPhase14TrialLedger(root);
  const preregistration = loadPhase14Preregistration(root);
  if (ledger.summary.attempted >= preregistration.maximumSubjectAttempts) {
    throw new RigInputError("Phase 14 subject-attempt ceiling has been reached");
  }
  if (ledger.summary.spentUsd >= preregistration.maximumSubjectTrialUsd) {
    throw new RigInputError("Phase 14 subject-trial dollar ceiling has been reached");
  }
  if (ledger.summary.pricedCampaignSpendUsd >= preregistration.maximumTotalUsd) {
    throw new RigInputError("Phase 14 total campaign dollar ceiling has been reached");
  }
  const next = phase14AttemptSpecs(root).find((attempt) => attempt.attemptId === ledger.nextAttemptId);
  if (next === undefined) {
    throw new RigInputError(`no Phase 14 attempt is currently eligible (campaign status ${ledger.status})`);
  }
  if (next.attemptId !== requestedAttemptId) {
    throw new RigInputError(
      `registered execution order requires ${next.attemptId}, not ${requestedAttemptId}`,
    );
  }
  const outDir = attemptDirectory(root, next);
  if (existsSync(outDir)) throw new RigInputError(`${next.attemptId}: trial directory already exists`);

  const packageLock = buildPhase14PackageLock(root);
  const packageRow = packageLock.rows.find(
    (row) => row.familyId === next.familyId && row.starterProfile === next.starterProfile,
  );
  if (packageRow === undefined || !packageRow.packageGatePassed || !packageRow.onlyRegisteredDelta) {
    throw new RigInputError(`${next.attemptId}: frozen package row is absent or invalid`);
  }
  const scenarioLock = buildPhase14ScenarioLock(root);
  const lockedScenarios = scenarioLock.rows.filter((row) => row.familyId === next.familyId);
  if (lockedScenarios.length !== 24)
    throw new RigInputError(`${next.familyId}: scenario lock is not 24 rows`);

  const challenge = phase14ChallengePackage(root, next.familyId, next.starterProfile);
  const challengeDir = mkdtempSync(join(tmpdir(), `phase14-challenge-${next.familyId}-`));
  writeChallengePackage(challenge, challengeDir);
  const actualHash = hashChallengeDir(challengeDir);
  if (actualHash !== packageRow.challengeHash) {
    rmSync(challengeDir, { recursive: true, force: true });
    throw new RigInputError(
      `${next.attemptId}: materialized challenge ${actualHash ?? "none"} differs from lock ${packageRow.challengeHash}`,
    );
  }

  let credentialDir: string | undefined;
  const gradeMetadata: Record<string, unknown> = {
    phase14AttemptId: next.attemptId,
    phase14Stage: next.stage,
    starterProfile: next.starterProfile,
    providerFamily: next.providerFamily,
    preregistrationSha256: preregistration.sha256,
    challengeHash: packageRow.challengeHash,
    primaryScenarioProfile: "concentrated-24",
    secondaryScenarioProfile: "balanced-12",
    verifierProfile: "phase14-host-owned-verifier/container-no-network-submission@1",
    providerImage: PHASE14_PROVIDER_IMAGE,
    providerImageId: imageId(),
    providerContainerB6: providerB6,
  };
  try {
    if (next.providerFamily === "openai") credentialDir = stageCodexCredential();
    if (
      next.providerFamily === "anthropic" &&
      (process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "").trim().length === 0
    ) {
      throw new RigInputError("CLAUDE_CODE_OAUTH_TOKEN is absent from the execution process");
    }
    const command = phase14ProviderCommand(next.providerFamily, credentialDir);
    gradeMetadata.providerIsolation = containerIsolationDetail(command);
    gradeMetadata.artifactIsolation =
      "The family host and submitted module ran together in a fresh --network=none container for each B6 control and each measured scenario; only JSON calls/effects/reports crossed back to the host-owned verifier.";

    let gradedHostErrors: number | null = null;
    const result = orchestrateTrial({
      familyId: next.familyId,
      runId: next.attemptId,
      challengeDir,
      trialsRoot: join(root, "trials"),
      instruction: routeFor(next.familyId).instruction,
      provider: "docker",
      model: next.model,
      effort: next.effort,
      subjectId: `${next.providerId}-${next.model.split("/").pop() ?? next.providerFamily}`,
      scenarioSetId: packageRow.scenarioSetId,
      timeoutMs: 1_800_000,
      command,
      inheritEnv: true,
      grade(modulePath) {
        const graded = gradePhase14ContainerSubmission(next.familyId, modulePath);
        gradedHostErrors = graded.hostErrors;
        gradeMetadata.gradingB6 = {
          sameInvocation: true,
          passed: graded.hostErrors === 0 && graded.cells.length === 24,
          controls: ["known-good-reference", "known-bad-recompute", "wrong-shaped-input-refusal"],
        };
        gradeMetadata.broadFailureSpread = broadFailureSpread(graded.cells);
        return graded;
      },
      disqualify(cells) {
        if (gradedHostErrors !== 0)
          return `grading host errors=${gradedHostErrors ?? "unknown"}; run is void`;
        if (cells.length !== 24)
          return `graded ${cells.length}/24 frozen scenarios; incomplete runs do not count`;
        return null;
      },
      extraMetadata: gradeMetadata,
    });

    const preservedHash = hashChallengeDir(join(result.directory, "challenge"));
    if (preservedHash !== packageRow.challengeHash) {
      throw new RigInputError(`${next.attemptId}: preserved challenge hash drifted after execution`);
    }
    const scenariosFailed = result.record.cells.filter((cell) => cell.failed.length > 0).length;
    return {
      attempt: next,
      directory: result.directory,
      classification: result.record.status,
      counts: result.record.counts,
      scenariosFailed,
      scenariosGraded: result.record.cells.length,
      runtimeSeconds: result.record.runtimeSeconds,
      costUsd: result.record.costUsd,
    };
  } finally {
    rmSync(challengeDir, { recursive: true, force: true });
    if (credentialDir !== undefined) rmSync(credentialDir, { recursive: true, force: true });
  }
}

/** Compatibility name retained for the pre-measurement CLI assembled before neutral cells unlocked. */
export const executePhase14SeededAttempt = executePhase14Attempt;

export const renderPhase14ExecutionResult = (result: Phase14ExecutionResult): string =>
  `${JSON.stringify(result, null, 2)}\n`;

export function parsePhase14AttemptId(root: string, value: string): Phase14AttemptSpec {
  const attempt = phase14AttemptSpecs(root).find((candidate) => candidate.attemptId === value);
  if (attempt === undefined) throw new RigInputError(`${value}: not a registered Phase 14 attempt id`);
  return attempt;
}

export function phase14ExecutionStatus(root: string): {
  readonly status: ReturnType<typeof buildPhase14TrialLedger>["status"];
  readonly nextAttempt: string | null;
  readonly attemptsCompleted: number;
  readonly attemptsPlanned: number;
  readonly blindLabelsCompleted: number;
} {
  const ledger = buildPhase14TrialLedger(root);
  return {
    status: ledger.status,
    nextAttempt: ledger.nextAttemptId,
    attemptsCompleted: ledger.summary.attempted,
    attemptsPlanned: ledger.summary.plannedAttempts,
    blindLabelsCompleted: ledger.summary.blindLabelsRun,
  };
}

export const renderPhase14ExecutionStatus = (root: string): string =>
  `${JSON.stringify(phase14ExecutionStatus(root), null, 2)}\n`;

/** Read-only helper used by tests to prove an existing attempt was preserved under its locked hash. */
export function assertPhase14AttemptHash(root: string, attemptId: string): void {
  const attempt = parsePhase14AttemptId(root, attemptId);
  const metadataPath = join(attemptDirectory(root, attempt), "metadata.json");
  if (!existsSync(metadataPath)) throw new RigInputError(`${attemptId}: metadata is absent`);
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as Record<string, unknown>;
  const locked = buildPhase14PackageLock(root).rows.find(
    (row) => row.familyId === attempt.familyId && row.starterProfile === attempt.starterProfile,
  );
  if (locked === undefined || metadata.challengeHash !== locked.challengeHash) {
    throw new RigInputError(`${attemptId}: metadata challenge hash does not match its frozen cell`);
  }
}
