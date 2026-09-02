import { spawnSync } from "node:child_process";
import {
  constants,
  accessSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import type { AdversarialIsolationProfile, IsolationProfileId } from "./types.js";

export const ISOLATION_PROFILES: Readonly<Record<IsolationProfileId, AdversarialIsolationProfile>> = {
  subprocess: {
    id: "subprocess",
    publicChallengeReadable: true,
    hiddenArtifactsExcluded: false,
    submissionWritable: true,
    noRepoRoot: false,
    noGeneratedReports: false,
    verifierOutsideAttackerContext: true,
    networkDisabled: false,
    containerized: false,
    adequateForCountedNoBypass: false,
    notes:
      "Current-process runner profile. Useful for preserving attempts, not adequate for counted v2 no-bypass evidence.",
  },
  "fs-sandbox": {
    id: "fs-sandbox",
    publicChallengeReadable: true,
    hiddenArtifactsExcluded: true,
    submissionWritable: true,
    noRepoRoot: true,
    noGeneratedReports: true,
    verifierOutsideAttackerContext: true,
    networkDisabled: false,
    containerized: false,
    adequateForCountedNoBypass: true,
    notes:
      "Prepared public bundle only: challenge files are copied, exploit/submitted-bypass are writable, hidden source and reports are absent. Network is not mechanically disabled.",
  },
  "container-planned": {
    id: "container-planned",
    publicChallengeReadable: true,
    hiddenArtifactsExcluded: true,
    submissionWritable: true,
    noRepoRoot: true,
    noGeneratedReports: true,
    verifierOutsideAttackerContext: true,
    networkDisabled: true,
    containerized: false,
    adequateForCountedNoBypass: false,
    notes:
      "Planned profile: mount public challenge read-only, mount submission/exploit writable, disable network, run verifier outside the container.",
  },
  "container-no-network": {
    id: "container-no-network",
    publicChallengeReadable: true,
    hiddenArtifactsExcluded: true,
    submissionWritable: true,
    noRepoRoot: true,
    noGeneratedReports: true,
    verifierOutsideAttackerContext: true,
    networkDisabled: true,
    containerized: true,
    adequateForCountedNoBypass: true,
    notes:
      "Container/no-network profile: public challenge mounted read-only, writable exploit/submission mounts, no network, no repo root, verifier outside attacker context.",
  },
  container: {
    id: "container",
    publicChallengeReadable: true,
    hiddenArtifactsExcluded: true,
    submissionWritable: true,
    noRepoRoot: true,
    noGeneratedReports: true,
    verifierOutsideAttackerContext: true,
    networkDisabled: true,
    containerized: true,
    adequateForCountedNoBypass: true,
    notes:
      "Containerized profile: public challenge mounted read-only, writable exploit/submission mount, no network, verifier runs outside attacker context.",
  },
};

/**
 * The image and the runtime probe are shared by every containerized runner in this repository.
 *
 * They live here, beside the isolation ladder, rather than in `container.ts`, because
 * `src/trials/runners.ts` needs them too and `container.ts` reaches back into `trials/run.ts` — one
 * home for the concept, and no import cycle.
 */
export const CONTAINER_IMAGE = "node:22-alpine";

export interface ContainerRuntimeReadiness {
  readonly runtime: "docker";
  readonly available: boolean;
  readonly detail: string;
}

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

export interface IsolationVerification {
  readonly bundleDir: string;
  readonly profile: AdversarialIsolationProfile;
  readonly files: readonly string[];
  readonly publicChallengePresent: boolean;
  readonly exploitDirWritable: boolean;
  readonly submittedBypassDirWritable: boolean;
  readonly hiddenLeaks: readonly string[];
  readonly repoRootLeaks: readonly string[];
  readonly reportLeaks: readonly string[];
  readonly verifierOutsideAttackerContext: boolean;
  readonly verdict: "pass" | "fail";
  readonly failures: readonly string[];
}

const HIDDEN_NAME_PATTERNS = [
  "verify.ts",
  "reference.ts",
  "mutants.ts",
  "runner.ts",
  "policy.ts",
  "matrix.json",
  "scenarios.json",
  "answer-matrix",
  "hidden",
] as const;

const collectFiles = (dir: string, prefix = ""): readonly string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const next = join(dir, entry.name);
    const rel = `${prefix}${entry.name}`;
    return entry.isDirectory() ? collectFiles(next, `${rel}/`) : [rel];
  });

const isWritable = (path: string): boolean => {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

function readProfile(bundleDir: string): AdversarialIsolationProfile {
  const path = join(bundleDir, "ISOLATION.json");
  if (!existsSync(path)) return ISOLATION_PROFILES.subprocess;
  const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<AdversarialIsolationProfile>;
  const base = ISOLATION_PROFILES[raw.id ?? "subprocess"];
  return { ...base, ...raw };
}

export function verifyIsolationBundle(bundleDir: string): IsolationVerification {
  const files = existsSync(bundleDir) ? [...collectFiles(bundleDir)].sort() : [];
  const profile = readProfile(bundleDir);
  const publicChallengePresent = existsSync(join(bundleDir, "challenge", "README.md"));
  const exploitDir = join(bundleDir, "exploit");
  const submittedBypassDir = join(bundleDir, "submitted-bypass");
  const hiddenLeaks = files.filter((file: string) => {
    const lower = file.toLowerCase();
    return (
      lower.startsWith("src/") ||
      lower.includes("/src/") ||
      HIDDEN_NAME_PATTERNS.some((pattern) => lower.includes(pattern))
    );
  });
  const repoRootLeaks = files.filter(
    (file: string) => file.startsWith(".git/") || file === "package.json" || file === "pnpm-lock.yaml",
  );
  const reportLeaks = files.filter(
    (file: string) => file.startsWith("reports/") || file.includes("/reports/"),
  );
  const exploitDirWritable =
    existsSync(exploitDir) && statSync(exploitDir).isDirectory() && isWritable(exploitDir);
  const submittedBypassDirWritable =
    existsSync(submittedBypassDir) &&
    statSync(submittedBypassDir).isDirectory() &&
    isWritable(submittedBypassDir);
  const verifierOutsideAttackerContext = !files.some(
    (file: string) => file.startsWith("verifier/") || file.includes("/verify.ts"),
  );
  const failures = [
    ...(publicChallengePresent ? [] : ["public challenge directory is missing"]),
    ...(profile.hiddenArtifactsExcluded && hiddenLeaks.length > 0
      ? [`hidden artifacts leaked: ${hiddenLeaks.join(", ")}`]
      : []),
    ...(profile.noRepoRoot && repoRootLeaks.length > 0
      ? [`repository root leaked: ${repoRootLeaks.join(", ")}`]
      : []),
    ...(profile.noGeneratedReports && reportLeaks.length > 0
      ? [`generated reports leaked: ${reportLeaks.join(", ")}`]
      : []),
    ...(profile.submissionWritable && !exploitDirWritable ? ["exploit directory is not writable"] : []),
    ...(profile.submissionWritable && !submittedBypassDirWritable
      ? ["submitted-bypass directory is not writable"]
      : []),
    ...(profile.verifierOutsideAttackerContext && !verifierOutsideAttackerContext
      ? ["verifier implementation is present in attacker context"]
      : []),
  ];
  return {
    bundleDir,
    profile,
    files,
    publicChallengePresent,
    exploitDirWritable,
    submittedBypassDirWritable,
    hiddenLeaks,
    repoRootLeaks,
    reportLeaks,
    verifierOutsideAttackerContext,
    verdict: failures.length === 0 ? "pass" : "fail",
    failures,
  };
}

export function writeIsolationManifest(
  bundleDir: string,
  profileId: IsolationProfileId,
): AdversarialIsolationProfile {
  const profile = ISOLATION_PROFILES[profileId];
  mkdirSync(dirname(join(bundleDir, "ISOLATION.json")), { recursive: true });
  writeFileSync(join(bundleDir, "ISOLATION.json"), `${JSON.stringify(profile, null, 2)}\n`, "utf8");
  return profile;
}

export function isolationSummaryPath(root: string, bundleDir: string): string {
  const rel = relative(root, bundleDir);
  return rel.startsWith("..") ? bundleDir : rel;
}
