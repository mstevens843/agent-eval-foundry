// files: extracted compatibility command services. Core APIs remain independent of dispatch.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { inspectProviderDeltaArtifact } from "../foundry/provider-delta-diagnosis.js";
import type { familyEvidenceFor } from "../reports/evidence.js";
import { challengeHash } from "../trials/run.js";

export function artifactInspectionForTrial(
  root: string,
  familyId: string,
  record: ReturnType<typeof familyEvidenceFor>["trials"]["records"][number],
  currentChallengeHash: string,
) {
  const trialDir = join(root, "trials", familyId, record.runId);
  const metadata = readJsonObject(join(trialDir, "metadata.json"));
  const artifactPath = record.artifactPath === null ? null : resolveRepoPath(root, record.artifactPath);
  const submissionFiles = artifactPath === null ? [] : listRelativeFiles(artifactPath);
  const subjectPath =
    artifactPath === null
      ? null
      : existsSync(join(artifactPath, "subject.mjs"))
        ? join(artifactPath, "subject.mjs")
        : artifactPath.endsWith(".mjs")
          ? artifactPath
          : null;
  const transcriptPath = join(trialDir, "transcript.txt");
  return inspectProviderDeltaArtifact({
    runId: record.runId,
    artifactPath: record.artifactPath,
    transcriptPath: existsSync(transcriptPath) ? transcriptPath.replace(`${root}/`, "") : null,
    submissionFiles,
    subjectSource: subjectPath === null ? null : readOptionalText(subjectPath),
    transcriptText: readOptionalText(transcriptPath),
    challengeHash: readString(metadata, "challengeHash"),
    currentChallengeHash,
  });
}

export function resolveRepoPath(root: string, path: string): string {
  return path.startsWith("/") ? path : join(root, path);
}

export function readJsonObject(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function readString(value: Record<string, unknown> | null, key: string): string | null {
  const raw = value?.[key];
  return typeof raw === "string" ? raw : null;
}

export function readOptionalText(path: string): string | null {
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

export function listRelativeFiles(dir: string, prefix = ""): readonly string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  return entries.flatMap((entry) => {
    const rel = `${prefix}${entry.name}`;
    const full = join(dir, entry.name);
    return entry.isDirectory() ? listRelativeFiles(full, `${rel}/`) : [rel];
  });
}
