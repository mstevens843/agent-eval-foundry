// Lane 3 - the sequential agent smoke.
//
// One attempt per invocation, in the registered order, against the registered hashes. Nothing here
// decides anything: the preregistration owns the slot order, the retry rule, the caps and the
// stopping rules, and this file refuses rather than improvises when one of them is violated.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  PHASE14_PROVIDER_IMAGE,
  phase14ProviderCommand,
  phase14ProviderContainerB6,
  stageCodexCredential,
} from "../phase-14/provider-runtime.js";
import { RigInputError } from "../screens/rig-integrity.js";
import { orchestrateTrial } from "../trials/orchestrator.js";
import { gradeCaaRevalidationInContainer, routeFor } from "../trials/router.js";
import { hashChallengeDir } from "../trials/run.js";
import { containerIsolationDetail } from "../trials/runners.js";
import { CAA_FAMILY_ID } from "./package-controls.js";
import { runPhase17Preflight } from "./preflight.js";

export type ProviderFamily = "openai" | "anthropic";

export interface Phase17TrialRegistration {
  readonly registrationId: string;
  readonly frozenInputs: { readonly challengeSha256: string; readonly scenarioSetId: string };
  readonly firstStageCampaign: { readonly trialOrder: readonly string[] };
  readonly retryPolicy: { readonly maximumRetriesPerSlot: number };
  readonly spendCaps: {
    readonly subjectUsd: number;
    readonly labellingUsd: number;
    readonly totalUsd: number;
  };
  readonly providerRuntime: {
    readonly image: string;
    readonly imageDigest: string;
    readonly configurations: readonly {
      readonly providerFamily: ProviderFamily;
      readonly model: string;
      readonly effort: string;
    }[];
  };
}

export interface Phase17AttemptSpec {
  readonly slot: string;
  readonly attemptId: string;
  readonly providerFamily: ProviderFamily;
  readonly model: string;
  readonly effort: string;
}

export const loadPhase17TrialRegistration = (root: string): Phase17TrialRegistration =>
  JSON.parse(
    readFileSync(join(root, "data/phase-17-trial-preregistration.json"), "utf8"),
  ) as Phase17TrialRegistration;

export function phase17AttemptSpecs(root: string): readonly Phase17AttemptSpec[] {
  const registration = loadPhase17TrialRegistration(root);
  return registration.firstStageCampaign.trialOrder.map((entry) => {
    const [slot, providerFamily] = entry.split("/") as [string, ProviderFamily];
    const configuration = registration.providerRuntime.configurations.find(
      (row) => row.providerFamily === providerFamily,
    );
    if (configuration === undefined) throw new RigInputError(`${entry}: no registered provider config`);
    return {
      slot,
      attemptId: `phase17-caa-${slot}-${providerFamily}`,
      providerFamily,
      model: configuration.model,
      effort: configuration.effort,
    };
  });
}

const attemptDirectory = (root: string, attempt: Phase17AttemptSpec, index: number): string =>
  join(root, "trials", CAA_FAMILY_ID, `${attempt.attemptId}-attempt-${index}`);

/** The next slot with no attempt-1 directory. Slots run strictly in registered order. */
export function nextPhase17Attempt(root: string): Phase17AttemptSpec | null {
  return phase17AttemptSpecs(root).find((attempt) => !existsSync(attemptDirectory(root, attempt, 1))) ?? null;
}

const imageId = (): string =>
  execFileSync("docker", ["image", "inspect", "--format={{.Id}}", PHASE14_PROVIDER_IMAGE], {
    encoding: "utf8",
    timeout: 20_000,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

export interface Phase17ExecutionResult {
  readonly attempt: Phase17AttemptSpec;
  readonly attemptIndex: number;
  readonly directory: string;
  readonly classification: string;
  readonly counts: boolean;
  readonly reward: number | null;
  readonly scenariosFailed: number;
  readonly scenariosGraded: number;
  readonly failedChecks: readonly string[];
  readonly runtimeSeconds: number | null;
  readonly costUsd: number | null;
}

export function executePhase17Attempt(
  root: string,
  requestedAttemptId: string,
  attemptIndex = 1,
): Phase17ExecutionResult {
  const preflight = runPhase17Preflight(root);
  if (!preflight.readyForPaidTrials) {
    throw new RigInputError(`Phase 17 preflight is blocked: ${preflight.blockingConditions.join("; ")}`);
  }
  const providerB6 = phase14ProviderContainerB6();
  if (!providerB6.usable) throw new RigInputError("the provider-container plan is not B6-usable");

  const registration = loadPhase17TrialRegistration(root);
  if (attemptIndex > 1 + registration.retryPolicy.maximumRetriesPerSlot) {
    throw new RigInputError(`attempt ${attemptIndex} exceeds the registered retry allowance`);
  }
  const next = nextPhase17Attempt(root);
  const requested = phase17AttemptSpecs(root).find((row) => row.attemptId === requestedAttemptId);
  if (requested === undefined) throw new RigInputError(`${requestedAttemptId}: not a registered attempt id`);
  if (attemptIndex === 1 && next?.attemptId !== requestedAttemptId) {
    throw new RigInputError(
      `the registered order requires ${next?.attemptId ?? "no further attempt"}, not ${requestedAttemptId}`,
    );
  }
  const outDir = attemptDirectory(root, requested, attemptIndex);
  if (existsSync(outDir)) throw new RigInputError(`${outDir}: attempt directory already exists`);

  const route = routeFor(CAA_FAMILY_ID);
  const scenarioSetId = route.scenarioSetId();
  if (scenarioSetId !== registration.frozenInputs.scenarioSetId) {
    throw new RigInputError(
      `scenario set ${scenarioSetId} differs from the registered ${registration.frozenInputs.scenarioSetId}`,
    );
  }

  const family = route.family;
  const typesSource = readFileSync(join(root, family.typesPath), "utf8");
  const challenge = family.challenge(typesSource, scenarioSetId);
  const challengeDir = mkdtempSync(join(tmpdir(), "phase17-caa-challenge-"));
  for (const file of challenge.files) {
    const target = join(challengeDir, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, "utf8");
  }
  const materializedHash = hashChallengeDir(challengeDir);
  if (materializedHash !== registration.frozenInputs.challengeSha256) {
    rmSync(challengeDir, { recursive: true, force: true });
    throw new RigInputError(
      `materialized challenge ${materializedHash ?? "none"} differs from the registered ${registration.frozenInputs.challengeSha256}`,
    );
  }

  let credentialDir: string | undefined;
  let gradedHostErrors: number | null = null;
  const metadata: Record<string, unknown> = {
    phase17AttemptId: requested.attemptId,
    phase17Slot: requested.slot,
    phase17AttemptIndex: attemptIndex,
    providerFamily: requested.providerFamily,
    registrationId: registration.registrationId,
    registeredChallengeSha256: registration.frozenInputs.challengeSha256,
    scenarioSetId,
    verifierProfile: "phase17-host-owned-exact-fqdn-ledger/container-no-network-submission@1",
    providerImage: PHASE14_PROVIDER_IMAGE,
    providerImageId: imageId(),
    providerContainerB6: providerB6,
  };

  try {
    if (requested.providerFamily === "openai") credentialDir = stageCodexCredential();
    if (
      requested.providerFamily === "anthropic" &&
      (process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "").trim().length === 0
    ) {
      throw new RigInputError("CLAUDE_CODE_OAUTH_TOKEN is absent from the execution process");
    }
    const command = phase14ProviderCommand(requested.providerFamily, credentialDir);
    metadata.providerIsolation = containerIsolationDetail(command);
    metadata.artifactIsolation =
      "The family host and the submitted module ran together in a fresh --network=none container for every graded scenario; only JSON report and query-ledger bytes crossed back to the host-owned verifier.";

    const result = orchestrateTrial({
      familyId: CAA_FAMILY_ID,
      runId: `${requested.attemptId}-attempt-${attemptIndex}`,
      challengeDir,
      trialsRoot: join(root, "trials"),
      instruction: route.instruction,
      provider: "docker",
      model: requested.model,
      effort: requested.effort,
      subjectId: `${requested.providerFamily}-${requested.model.split("/").pop() ?? requested.providerFamily}`,
      scenarioSetId,
      timeoutMs: 1_800_000,
      command,
      inheritEnv: true,
      grade(modulePath) {
        const graded = gradeCaaRevalidationInContainer(modulePath);
        gradedHostErrors = graded.hostErrors;
        metadata.gradingB6 = {
          sameInvocation: true,
          passed: graded.hostErrors === 0 && graded.cells.length === 24,
          controls: ["known-good-reference", "known-bad-first-name-reuse", "wrong-shaped-report-refusal"],
        };
        return graded;
      },
      disqualify(cells) {
        if (gradedHostErrors !== 0) {
          return `grading host errors=${gradedHostErrors ?? "unknown"}; the run is void rather than failing`;
        }
        if (cells.length !== 24)
          return `graded ${cells.length}/24 frozen scenarios; incomplete runs never count`;
        return null;
      },
      extraMetadata: metadata,
    });

    const preservedHash = hashChallengeDir(join(result.directory, "challenge"));
    const cells = result.record.cells;
    return {
      attempt: requested,
      attemptIndex,
      directory: result.directory,
      classification: preservedHash === null ? result.record.status : `${result.record.status}`,
      counts: result.record.counts,
      reward: result.record.counts ? (cells.every((cell) => cell.failed.length === 0) ? 1 : 0) : null,
      scenariosFailed: cells.filter((cell) => cell.failed.length > 0).length,
      scenariosGraded: cells.length,
      failedChecks: [...new Set(cells.flatMap((cell) => cell.failed))].sort(),
      runtimeSeconds: result.record.runtimeSeconds,
      costUsd: result.record.costUsd,
    };
  } finally {
    rmSync(challengeDir, { recursive: true, force: true });
    if (credentialDir !== undefined) rmSync(credentialDir, { recursive: true, force: true });
  }
}

export const renderPhase17ExecutionResult = (result: Phase17ExecutionResult): string =>
  `${JSON.stringify(result, null, 2)}\n`;
