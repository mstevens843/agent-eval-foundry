import { cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { rigIntegrity } from "../screens/rig-integrity.js";
import { type ContainerLimits, containerTrialCommand } from "../trials/runners.js";

export const PHASE14_PROVIDER_IMAGE = "agent-eval-foundry/provider-agent:claude-2.1.260-codex-0.152.1";

export const PHASE14_PROVIDER_LIMITS: ContainerLimits = {
  memory: "2g",
  cpus: "2",
  pids: "256",
  nofile: "1024",
  wallClockMs: 1_800_000,
};

export type Phase14ProviderFamily = "openai" | "anthropic";

export interface Phase14ProviderContainerB6 {
  readonly usable: boolean;
  readonly knownGoodPassed: boolean;
  readonly knownBadFailed: boolean;
  readonly malformedInputRefused: boolean;
}

/** Copy only Codex authentication, never its sessions, logs, skills or repository configuration. */
export function stageCodexCredential(): string {
  const source = join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "auth.json");
  if (!existsSync(source)) throw new Error(`Codex authentication is unavailable at ${source}`);
  const dir = mkdtempSync(join(tmpdir(), "phase14-codex-credential-"));
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  cpSync(source, join(dir, "auth.json"));
  writeFileSync(join(dir, "config.toml"), 'model = "gpt-5.6-sol"\nmodel_reasoning_effort = "xhigh"\n', {
    encoding: "utf8",
    mode: 0o600,
  });
  return dir;
}

export function phase14ProviderCommand(
  providerFamily: Phase14ProviderFamily,
  codexCredentialDir?: string,
): readonly string[] {
  if (providerFamily === "anthropic") {
    return containerTrialCommand({
      envPassthrough: ["CLAUDE_CODE_OAUTH_TOKEN"],
      image: PHASE14_PROVIDER_IMAGE,
      limits: PHASE14_PROVIDER_LIMITS,
      agentCommand: [
        "claude",
        "--model",
        "opus",
        "--effort",
        "max",
        "--output-format",
        "stream-json",
        "--verbose",
        "-p",
        "{instruction}",
        "--permission-mode",
        "bypassPermissions",
      ],
    });
  }
  if (codexCredentialDir === undefined) {
    throw new Error("Codex container execution requires a staged credential directory");
  }
  return containerTrialCommand({
    credentialDir: codexCredentialDir,
    credentialTarget: "/run/foundry-credential",
    image: PHASE14_PROVIDER_IMAGE,
    limits: PHASE14_PROVIDER_LIMITS,
    agentCommand: [
      "codex-with-credential",
      "exec",
      "--json",
      "--dangerously-bypass-approvals-and-sandbox",
      "--skip-git-repo-check",
      "{instruction}",
    ],
  });
}

export function phase14ProviderPlanFailures(
  command: readonly string[],
  providerFamily: Phase14ProviderFamily,
): readonly string[] {
  const mounts = command.filter((arg) => arg.startsWith("--mount="));
  const credentialMounts = mounts.filter((arg) => arg.includes("target=/run/foundry-credential"));
  const envKeys = command.filter((arg) => arg.startsWith("--env=")).map((arg) => arg.slice("--env=".length));
  return [
    ...(command[0] === "docker" && command[1] === "run" ? [] : ["not-a-docker-run"]),
    ...(command.includes("--network=bridge") ? [] : ["provider-network-not-explicit"]),
    ...(command.includes("--read-only") ? [] : ["root-not-read-only"]),
    ...(command.includes("--cap-drop=ALL") ? [] : ["capabilities-not-dropped"]),
    ...(command.includes("--security-opt=no-new-privileges") ? [] : ["new-privileges-not-disabled"]),
    ...(command.includes("--user=1000:1000") ? [] : ["provider-runs-as-unexpected-user"]),
    ...(mounts.some((arg) => arg.includes("source={dir},target=/work") && !arg.endsWith(",readonly"))
      ? []
      : ["trial-workspace-not-writable"]),
    ...(mounts.includes("--mount=type=bind,source={dir}/challenge,target=/work/challenge,readonly")
      ? []
      : ["challenge-not-overmounted-read-only"]),
    ...(command.includes("--env-file=/dev/null") ? [] : ["host-environment-not-cleared"]),
    ...(command.includes(PHASE14_PROVIDER_IMAGE) ? [] : ["provider-image-not-pinned"]),
    ...(providerFamily === "anthropic" &&
    envKeys.length === 1 &&
    envKeys[0] === "CLAUDE_CODE_OAUTH_TOKEN" &&
    credentialMounts.length === 0
      ? []
      : providerFamily === "openai" && envKeys.length === 0 && credentialMounts.length === 1
        ? []
        : ["credential-channel-does-not-match-provider"]),
  ];
}

export function phase14ProviderContainerB6(): Phase14ProviderContainerB6 {
  const anthropic = phase14ProviderCommand("anthropic");
  const openai = phase14ProviderCommand("openai", "/tmp/b6-codex-credential");
  const goodFailures = [
    ...phase14ProviderPlanFailures(anthropic, "anthropic"),
    ...phase14ProviderPlanFailures(openai, "openai"),
  ];
  const writableChallenge = anthropic.filter(
    (arg) => arg !== "--mount=type=bind,source={dir}/challenge,target=/work/challenge,readonly",
  );
  const badFailures = phase14ProviderPlanFailures(writableChallenge, "anthropic");
  let malformedInputRefused = false;
  try {
    containerTrialCommand({
      credentialDir: "/tmp/incomplete",
      agentCommand: ["false"],
    });
  } catch {
    malformedInputRefused = true;
  }
  const knownGoodPassed = goodFailures.length === 0;
  const knownBadFailed = badFailures.includes("challenge-not-overmounted-read-only");
  const integrity = rigIntegrity(
    "phase-14-provider-container-plan",
    [
      { id: "registered-provider-commands", expect: "pass", observedFailures: goodFailures },
      { id: "writable-challenge-mutant", expect: "fail", observedFailures: badFailures },
    ],
    [goodFailures, badFailures],
  );
  return {
    usable: integrity.usable && malformedInputRefused,
    knownGoodPassed,
    knownBadFailed,
    malformedInputRefused,
  };
}
