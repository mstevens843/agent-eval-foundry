import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { providerById } from "../trials/provider-registry.js";
import { prepareAdversarialBundle } from "./bundles.js";
import { ISOLATION_PROFILES, isolationSummaryPath, verifyIsolationBundle } from "./isolation.js";
import { runAdversarialHardeningProbes } from "./probes.js";
import { currentAdversarialPackageHash, verifierHashFor } from "./readiness.js";
import { replayAdversarialExploitRecord } from "./replay.js";
import { triageAdversarialAttackRecord } from "./triage.js";
import type {
  AdversarialAttackRecord,
  AdversarialContainerMetadata,
  AdversarialValidationFailure,
} from "./types.js";
import { adversarialAttackFailures, parseAdversarialAttackRecord } from "./validate.js";

export const CONTAINER_IMAGE = "node:22-alpine";
export const CONTAINER_BUNDLE_DIR_TOKEN = "{BUNDLE_DIR}";

export const adversarialContainerBundlePath = (root: string, familyId: string): string =>
  join(root, "bundles", `${familyId}-adversarial-container`);

export interface ContainerRuntimeReadiness {
  readonly runtime: "docker";
  readonly available: boolean;
  readonly detail: string;
}

export interface ContainerIsolationVerification {
  readonly bundleDir: string;
  readonly metadata: AdversarialContainerMetadata;
  readonly verdict: "pass" | "fail";
  readonly failures: readonly string[];
}

export interface PreparedContainerAdversarialBundle {
  readonly familyId: string;
  readonly providerId: string;
  readonly dir: string;
  readonly metadata: AdversarialContainerMetadata;
  readonly isolationVerdict: "pass" | "fail";
  readonly failures: readonly string[];
}

export interface RunContainerAdversarialAuditOptions {
  readonly root: string;
  readonly familyId: string;
  readonly providerId: string;
  readonly runId: string;
  readonly timeoutMs: number;
  readonly outDir?: string;
}

export interface RunContainerAdversarialAuditResult {
  readonly record: AdversarialAttackRecord;
  readonly runDir: string;
  readonly bundleDir: string;
  readonly runtime: ContainerRuntimeReadiness;
}

const json = (v: unknown): string => `${JSON.stringify(v, null, 2)}\n`;

export function containerRuntimeReadiness(): ContainerRuntimeReadiness {
  const version = spawnSync("docker", ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20_000,
  });
  if (version.error !== undefined || version.status !== 0) {
    return {
      runtime: "docker",
      available: false,
      detail: `docker client unavailable: ${version.error?.message ?? version.stderr.trim()}`,
    };
  }
  const info = spawnSync("docker", ["info"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20_000,
  });
  if (info.error !== undefined || info.status !== 0) {
    const detail = `${info.stderr || info.stdout || info.error?.message || "docker daemon unavailable"}`
      .trim()
      .split("\n")[0];
    return { runtime: "docker", available: false, detail: `docker daemon unavailable: ${detail}` };
  }
  return {
    runtime: "docker",
    available: true,
    detail: version.stdout.trim().split("\n")[0] ?? "docker available",
  };
}

export function containerCommand(bundleDir: string): readonly string[] {
  return [
    "docker",
    "run",
    "--rm",
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--user",
    "1000:1000",
    "--workdir",
    "/workspace",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=64m",
    "--mount",
    `type=bind,source=${bundleDir},target=/workspace,readonly`,
    "--mount",
    `type=bind,source=${join(bundleDir, "exploit")},target=/workspace/exploit`,
    "--mount",
    `type=bind,source=${join(bundleDir, "submitted-bypass")},target=/workspace/submitted-bypass`,
    CONTAINER_IMAGE,
    "sh",
    "-lc",
    [
      "test -r challenge/README.md",
      "test ! -e src",
      "test ! -e reports",
      "test -w exploit",
      "test -w submitted-bypass",
      "printf 'container isolation smoke passed\\n'",
    ].join(" && "),
  ];
}

export function containerMetadataFor(
  bundleDir: string,
  readiness: ContainerRuntimeReadiness = containerRuntimeReadiness(),
  commandBundleDir = bundleDir,
): AdversarialContainerMetadata {
  const base = verifyIsolationBundle(bundleDir);
  const failures = [
    ...(readiness.available ? [] : [readiness.detail]),
    ...(base.verdict === "pass" ? [] : base.failures),
    ...(base.profile.id === "container-no-network"
      ? []
      : [`isolation profile is ${base.profile.id}, expected container-no-network`]),
  ];
  return {
    runtime: "docker",
    runtimeAvailable: readiness.available,
    image: CONTAINER_IMAGE,
    command: containerCommand(commandBundleDir),
    networkMode: "none",
    user: "1000:1000",
    readOnlyRootFilesystem: true,
    capDropAll: true,
    noNewPrivileges: true,
    repoRootMounted: false,
    hiddenArtifactsMounted: base.hiddenLeaks.length > 0,
    generatedReportsMounted: base.reportLeaks.length > 0,
    verifierInsideContainer: !base.verifierOutsideAttackerContext,
    publicChallengeReadOnly: true,
    exploitDirPreserved: base.exploitDirWritable,
    submittedBypassDirPreserved: base.submittedBypassDirWritable,
    secretEnvKeysExposed: [],
    readiness: failures.length === 0 ? "pass" : "fail",
    readinessFailures: failures,
  };
}

function containerRunScript(): string {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'BUNDLE_DIR="$(cd "$(dirname "$0")" && pwd)"',
    "docker run --rm \\",
    "  --network none \\",
    "  --read-only \\",
    "  --cap-drop ALL \\",
    "  --security-opt no-new-privileges \\",
    "  --user 1000:1000 \\",
    "  --workdir /workspace \\",
    "  --tmpfs /tmp:rw,noexec,nosuid,size=64m \\",
    '  --mount "type=bind,source=${BUNDLE_DIR},target=/workspace,readonly" \\',
    '  --mount "type=bind,source=${BUNDLE_DIR}/exploit,target=/workspace/exploit" \\',
    '  --mount "type=bind,source=${BUNDLE_DIR}/submitted-bypass,target=/workspace/submitted-bypass" \\',
    `  ${CONTAINER_IMAGE} \\`,
    "  sh -lc \"test -r challenge/README.md && test ! -e src && test ! -e reports && test -w exploit && test -w submitted-bypass && printf 'container isolation smoke passed\\\\n'\"",
    "",
  ].join("\n");
}

export function prepareContainerAdversarialBundle(
  root: string,
  familyId: string,
  outDir: string,
  providerId = "external",
): PreparedContainerAdversarialBundle {
  const bundle = prepareAdversarialBundle(root, familyId, outDir, providerId, "container-no-network");
  const metadata = containerMetadataFor(
    bundle.dir,
    {
      runtime: "docker",
      available: false,
      detail: "container smoke not run during deterministic bundle preparation",
    },
    CONTAINER_BUNDLE_DIR_TOKEN,
  );
  writeFileSync(join(bundle.dir, "CONTAINER.json"), json(metadata), "utf8");
  writeFileSync(join(bundle.dir, "container-run.sh"), containerRunScript(), {
    encoding: "utf8",
    mode: 0o755,
  });
  return {
    familyId,
    providerId,
    dir: bundle.dir,
    metadata,
    isolationVerdict: metadata.readiness === "pass" ? "pass" : "fail",
    failures: metadata.readinessFailures,
  };
}

export function verifyContainerIsolationBundle(bundleDir: string): ContainerIsolationVerification {
  const manifest = join(bundleDir, "CONTAINER.json");
  const metadata = existsSync(manifest)
    ? (JSON.parse(readFileSync(manifest, "utf8")) as AdversarialContainerMetadata)
    : containerMetadataFor(bundleDir);
  const failures = [
    ...(metadata.runtimeAvailable ? [] : [metadata.readinessFailures[0] ?? "container runtime unavailable"]),
    ...(metadata.networkMode === "none" ? [] : [`network mode is ${metadata.networkMode}`]),
    ...(metadata.repoRootMounted ? ["repository root mounted"] : []),
    ...(metadata.hiddenArtifactsMounted ? ["hidden artifacts mounted"] : []),
    ...(metadata.generatedReportsMounted ? ["generated reports mounted"] : []),
    ...(metadata.verifierInsideContainer ? ["verifier runs inside attacker context"] : []),
    ...(metadata.publicChallengeReadOnly ? [] : ["public challenge is not read-only"]),
    ...(metadata.exploitDirPreserved && metadata.submittedBypassDirPreserved
      ? []
      : ["writable exploit/submitted-bypass directories are not preserved"]),
    ...(metadata.secretEnvKeysExposed.length === 0
      ? []
      : [`secret env exposed: ${metadata.secretEnvKeysExposed.join(", ")}`]),
    ...(metadata.readOnlyRootFilesystem ? [] : ["container root filesystem is writable"]),
    ...(metadata.capDropAll ? [] : ["container capabilities were not dropped"]),
    ...(metadata.noNewPrivileges ? [] : ["no-new-privileges was not set"]),
  ];
  return {
    bundleDir,
    metadata,
    verdict: failures.length === 0 ? "pass" : "fail",
    failures,
  };
}

export function runContainerIsolationSmoke(bundleDir: string): ContainerIsolationVerification {
  const readiness = containerRuntimeReadiness();
  const metadata = containerMetadataFor(bundleDir, readiness);
  if (!readiness.available) {
    return {
      bundleDir,
      metadata,
      verdict: "fail",
      failures: metadata.readinessFailures,
    };
  }
  const [bin, ...args] = metadata.command;
  const result = spawnSync(bin ?? "docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
    env: { PATH: process.env.PATH ?? "" },
  });
  const failures = [
    ...(result.status === 0 ? [] : [`container smoke exited ${result.status ?? "null"}: ${result.stderr}`]),
  ];
  const updated = {
    ...metadata,
    readiness: failures.length === 0 ? ("pass" as const) : ("fail" as const),
    readinessFailures: failures,
  };
  writeFileSync(join(bundleDir, "CONTAINER.json"), json(updated), "utf8");
  return {
    bundleDir,
    metadata: updated,
    verdict: failures.length === 0 ? "pass" : "fail",
    failures,
  };
}

export function runContainerAdversarialAudit(
  options: RunContainerAdversarialAuditOptions,
): RunContainerAdversarialAuditResult {
  const provider = providerById(options.providerId);
  if (provider.family === "anthropic") {
    throw new Error("Anthropic/Claude adversarial runs are disabled for this phase; prepare/import only");
  }
  const bundleDir = options.outDir ?? adversarialContainerBundlePath(options.root, options.familyId);
  const prepared = prepareContainerAdversarialBundle(options.root, options.familyId, bundleDir, provider.id);
  const runtime = containerRuntimeReadiness();
  const container = containerMetadataFor(bundleDir, runtime);
  const transcript = [
    `runId: ${options.runId}`,
    `family: ${options.familyId}`,
    `provider: ${provider.id}`,
    "isolation: container-no-network",
    `container runtime: ${runtime.available ? "available" : "unavailable"}`,
    `detail: ${runtime.detail}`,
    "",
    provider.family === "openai"
      ? "Remote OpenAI/Codex execution was not started because the declared container profile disables network access."
      : "Provider was not executed locally under the container profile.",
  ].join("\n");
  const template = parseAdversarialAttackRecord(
    JSON.parse(readFileSync(join(prepared.dir, "metadata.json"), "utf8")),
    join(prepared.dir, "metadata.json"),
  );
  const base: AdversarialAttackRecord = {
    ...template,
    attackId: options.runId,
    status: "infrastructure-error",
    counts: false,
    countabilityReason:
      "infrastructure-error: container/no-network adversarial provider execution is unavailable locally",
    challengeHash: currentAdversarialPackageHash(options.root, options.familyId),
    verifierHash: verifierHashFor(options.root, options.familyId),
    attacker: {
      provider: provider.id,
      model: provider.model,
      subjectId: provider.subjectId,
    },
    transcriptPath: "transcript.txt",
    verifier: {
      status: "infrastructure-error",
      command: `foundry adversarial verify ${options.runId}`,
      outputPath: "verifier-output.json",
      detail:
        provider.family === "openai"
          ? "Codex/OpenAI requires network access, which is forbidden by the container-no-network profile"
          : "container/no-network provider execution did not produce countable verifier-integrity evidence",
    },
    executionProfile: {
      kind: "provider-model",
      command: `foundry adversarial run-container ${options.familyId} --provider ${provider.id} --run-id ${options.runId}`,
      providerRunnable: false,
      attemptedBypass: false,
      submittedNormalSolution: false,
      theoreticalOnly: false,
      notes:
        "container/no-network preflight was recorded; no model bypass attempt was counted because the runtime/provider could not execute under the declared isolation profile",
    },
    isolationProfile: ISOLATION_PROFILES["container-no-network"],
    container,
    notes: `container/no-network audit preflight; runtime=${runtime.available ? "available" : "unavailable"}`,
  };
  const replay = replayAdversarialExploitRecord(options.root, prepared.dir, base);
  const triage = triageAdversarialAttackRecord(base, replay);
  const record: AdversarialAttackRecord = {
    ...base,
    exploitReplay: replay,
    triage,
    container,
  };
  const runDir = join(options.root, "adversarial-audits", "runs", options.runId);
  mkdirSync(runDir, { recursive: true });
  const verifierOutput = json({
    attackId: record.attackId,
    familyId: record.familyId,
    status: "infrastructure-error",
    failures: adversarialAttackFailures(record, {
      currentChallengeHash: currentAdversarialPackageHash(options.root, record.familyId),
      transcriptText: transcript,
      verifierText: "container preflight verifier output",
      hardeningProbesPass: runAdversarialHardeningProbes(options.root, record.familyId).every(
        (probe) => probe.status === "pass",
      ),
    }).map((failure: AdversarialValidationFailure) => ({
      code: failure.code,
      path: failure.path,
      detail: failure.detail,
    })),
    container,
    replay,
    triage,
  });
  writeFileSync(join(runDir, "metadata.json"), json(record), "utf8");
  writeFileSync(join(runDir, "transcript.txt"), transcript, "utf8");
  writeFileSync(join(runDir, "verifier-output.json"), verifierOutput, "utf8");
  writeFileSync(join(runDir, "exploit-replay-output.json"), json(replay), "utf8");
  writeFileSync(join(runDir, "CONTAINER.json"), json(container), "utf8");
  return { record, runDir, bundleDir: isolationSummaryPath(options.root, prepared.dir), runtime };
}
