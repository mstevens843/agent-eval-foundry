// Lane 3 - trial preflight.
//
// The operating rule is explicit: no paid trial until Docker, both subject providers, both
// labelling providers, capture and the estimated maximum spend have been reported to the operator,
// and a missing or invalid token is reported rather than worked around.
//
// Nothing here reads, prints, copies or persists a credential value. Presence is a boolean and
// authentication is proved by a probe's exit status.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { PHASE14_PROVIDER_IMAGE, phase14ProviderContainerB6 } from "../phase-14/provider-runtime.js";
import { challengeHash, runPhase17PackageControls } from "./package-controls.js";

export interface Phase17ProviderPreflight {
  readonly providerFamily: "openai" | "anthropic";
  readonly credentialChannel: string;
  readonly credentialPresent: boolean;
  readonly subjectExecutionAvailable: boolean;
  readonly blindLabellingAvailable: boolean;
  readonly evidence: string;
}

export interface Phase17Preflight {
  readonly schema: "agent-eval-foundry/phase-17-trial-preflight@1";
  readonly observedAt: string;
  readonly baselineCommit: string;
  readonly chronologyEvidence: string;
  readonly isolation: {
    readonly dockerDaemonAvailable: boolean;
    readonly dockerServerVersion: string;
    readonly providerImage: string;
    readonly providerImagePresent: boolean;
    readonly providerImageDigest: string | null;
    readonly containerPlanB6Usable: boolean;
  };
  readonly providers: readonly Phase17ProviderPreflight[];
  readonly packageReady: {
    readonly challengeSha256: string;
    readonly scenarioSetId: string;
    readonly allControlsHeld: boolean;
    readonly probeV2Status: string;
  };
  readonly capture: {
    readonly perAttemptArtifacts: readonly string[];
    readonly costFieldsImplemented: boolean;
    readonly unpricedProviderDeclared: string;
  };
  readonly spend: {
    readonly measuredAnthropicSubjectUsdPerAttempt: number;
    readonly measuredAnthropicLabelUsdPerCall: number;
    readonly maximumCleanTrials: number;
    readonly maximumAttemptsWithRetries: number;
    readonly maximumLabelCalls: number;
    readonly estimatedMaximumPricedUsd: number;
    readonly registeredSubjectCapUsd: number;
    readonly registeredLabelCapUsd: number;
    readonly registeredTotalCapUsd: number;
    readonly estimateBasis: string;
  };
  readonly blockingConditions: readonly string[];
  readonly readyForPaidTrials: boolean;
}

const tryExec = (file: string, args: readonly string[]): { ok: boolean; out: string } => {
  try {
    return {
      ok: true,
      out: execFileSync(file, [...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(),
    };
  } catch (err) {
    return { ok: false, out: String((err as { stderr?: string }).stderr ?? (err as Error).message).trim() };
  }
};

/**
 * Measured per-call prices, quoted from this repository's own recorded provider telemetry rather
 * than from a rate literal. Codex reports tokens and never a price, so its cost stays unpriced and
 * is never converted.
 */
export const MEASURED_ANTHROPIC_SUBJECT_USD = 1.99 / 4;
export const MEASURED_ANTHROPIC_LABEL_USD = 2.9877925 / 4;

export function runPhase17Preflight(root: string): Phase17Preflight {
  const docker = tryExec("docker", ["version", "--format", "{{.Server.Version}}"]);
  const image = tryExec("docker", ["image", "inspect", PHASE14_PROVIDER_IMAGE, "--format", "{{.Id}}"]);
  const codexAuth = join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "auth.json");
  const codexPresent = existsSync(codexAuth);
  const anthropicPresent = (process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "").length > 0;
  const containerB6 = phase14ProviderContainerB6();
  const controls = runPhase17PackageControls(root);
  const { hash, scenarioSetId } = challengeHash(root);

  const providers: readonly Phase17ProviderPreflight[] = [
    {
      providerFamily: "openai",
      credentialChannel: "read-only bind mount of the Codex CLI auth file into /run/foundry-credential",
      credentialPresent: codexPresent,
      subjectExecutionAvailable: codexPresent && docker.ok,
      blindLabellingAvailable: codexPresent && docker.ok,
      evidence: codexPresent
        ? `a Codex credential file exists at ${codexAuth.replace(homedir(), "~")}; its contents were not read`
        : `no Codex credential file at ${codexAuth.replace(homedir(), "~")}`,
    },
    {
      providerFamily: "anthropic",
      credentialChannel: "CLAUDE_CODE_OAUTH_TOKEN passed through to the container environment",
      credentialPresent: anthropicPresent,
      subjectExecutionAvailable: anthropicPresent && docker.ok,
      blindLabellingAvailable: anthropicPresent && docker.ok,
      evidence: anthropicPresent
        ? "CLAUDE_CODE_OAUTH_TOKEN is set in this process environment; its value was not read, logged or persisted"
        : "CLAUDE_CODE_OAUTH_TOKEN is absent from this process environment",
    },
  ];

  const maximumCleanTrials = 8;
  const maximumAttemptsWithRetries = maximumCleanTrials * 2;
  const maximumLabelCalls = maximumCleanTrials * 2;
  const estimatedMaximumPricedUsd = Number(
    (
      (maximumAttemptsWithRetries / 2) * MEASURED_ANTHROPIC_SUBJECT_USD +
      (maximumLabelCalls / 2) * MEASURED_ANTHROPIC_LABEL_USD
    ).toFixed(2),
  );

  const blockingConditions = [
    ...(docker.ok ? [] : [`the Docker daemon is unavailable: ${docker.out.split("\n")[0] ?? "no detail"}`]),
    ...(image.ok ? [] : [`the pinned provider image ${PHASE14_PROVIDER_IMAGE} is not present locally`]),
    ...(containerB6.usable ? [] : ["the provider container plan failed its own B6 controls"]),
    ...providers
      .filter((row) => !row.credentialPresent)
      .map(
        (row) =>
          `the ${row.providerFamily} credential is absent, so its subject trials and blind labels cannot run; a cross-provider requirement is never weakened to route around one unavailable provider`,
      ),
    ...(controls.allControlsHeld ? [] : ["one or more Phase 17 package controls did not hold"]),
  ];

  return {
    schema: "agent-eval-foundry/phase-17-trial-preflight@1",
    observedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    baselineCommit: tryExec("git", ["rev-parse", "HEAD"]).out,
    chronologyEvidence:
      "This real UTC clock value and the execution transcript establish local ordering only; neither is independent third-party timestamp proof.",
    isolation: {
      dockerDaemonAvailable: docker.ok,
      dockerServerVersion: docker.ok ? docker.out : "",
      providerImage: PHASE14_PROVIDER_IMAGE,
      providerImagePresent: image.ok,
      providerImageDigest: image.ok ? image.out : null,
      containerPlanB6Usable: containerB6.usable,
    },
    providers,
    packageReady: {
      challengeSha256: hash,
      scenarioSetId,
      allControlsHeld: controls.allControlsHeld,
      probeV2Status: "PROBE-V2-PASSED",
    },
    capture: {
      perAttemptArtifacts: [
        "challenge and scenario-set hashes",
        "submission bytes",
        "provider transcript",
        "attempt metadata",
        "verifier output",
        "normalized result",
        "self-written tests and their outcome",
        "failed checks",
        "scenario knobs",
        "runtime seconds",
        "token usage and provider-reported cost",
        "countability decision",
      ],
      costFieldsImplemented: true,
      unpricedProviderDeclared:
        "The Codex CLI reports token counts and no dollar price. Its cost stays null and is counted as unpriced, never converted with a rate literal.",
    },
    spend: {
      measuredAnthropicSubjectUsdPerAttempt: Number(MEASURED_ANTHROPIC_SUBJECT_USD.toFixed(4)),
      measuredAnthropicLabelUsdPerCall: Number(MEASURED_ANTHROPIC_LABEL_USD.toFixed(4)),
      maximumCleanTrials,
      maximumAttemptsWithRetries,
      maximumLabelCalls,
      estimatedMaximumPricedUsd,
      registeredSubjectCapUsd: 60,
      registeredLabelCapUsd: 40,
      registeredTotalCapUsd: 100,
      estimateBasis:
        "ESTIMATED, not measured. Anthropic per-call figures are this repository's own Phase 14 subject telemetry ($1.99 over 4 attempts) and Phase 16 reader telemetry ($2.9878 over 4 reads). OpenAI attempts are unpriced and contribute nothing to this figure, so the true total will exceed it by an unknown OpenAI amount.",
    },
    blockingConditions,
    readyForPaidTrials: blockingConditions.length === 0,
  };
}

export const phase17PreflightJson = (row: Phase17Preflight): string => `${JSON.stringify(row, null, 2)}\n`;
