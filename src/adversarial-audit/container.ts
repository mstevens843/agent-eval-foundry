import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prepareAdversarialBundle } from "./bundles.js";
import {
  CONTAINER_IMAGE,
  type ContainerRuntimeReadiness,
  containerRuntimeReadiness,
  verifyIsolationBundle,
} from "./isolation.js";
import type { AdversarialContainerMetadata } from "./types.js";

// Re-exported so every existing importer keeps its path; the definitions moved to `isolation.js`
// because `src/trials/runners.ts` shares them and this module cannot be imported from there.
export { CONTAINER_IMAGE, containerRuntimeReadiness } from "./isolation.js";
export type { ContainerRuntimeReadiness } from "./isolation.js";

export const CONTAINER_BUNDLE_DIR_TOKEN = "{BUNDLE_DIR}";

export const adversarialContainerBundlePath = (root: string, familyId: string): string =>
  join(root, "bundles", `${familyId}-adversarial-container`);

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

const json = (v: unknown): string => `${JSON.stringify(v, null, 2)}\n`;

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
