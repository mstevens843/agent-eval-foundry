import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readFamilyTrials, writeTrialDirectory } from "../trials/directory.js";
import { decideCountability } from "../trials/orchestrator.js";
import { routeFor } from "../trials/router.js";
import { prepareChallenge } from "../trials/run.js";
import { parseTrialRecord } from "../trials/validate.js";
import type { ExternalIntakeImportResult, ExternalIntakeValidationResult } from "./types.js";
import { validateExternalRunPacket } from "./validate.js";

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

export function externalIntakeReceivedRoot(root: string): string {
  return join(root, "external-intake", "received");
}

function copyTree(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const src = join(source, entry.name);
    const dest = join(target, entry.name);
    if (entry.isDirectory()) copyTree(src, dest);
    else {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, readFileSync(src));
    }
  }
}

function packetRunId(validation: ExternalIntakeValidationResult, packetDir: string): string {
  const runId = validation.packet.metadata?.runId;
  if (runId !== null && runId !== undefined && runId.trim().length > 0) return runId;
  return `invalid-${packetDir.split("/").filter(Boolean).pop() ?? "packet"}`;
}

function readSubmissionFiles(dir: string): readonly { readonly path: string; readonly content: string }[] {
  const base = join(dir, "submission");
  if (!existsSync(base)) return [];
  const walk = (
    current: string,
    prefix: string,
  ): readonly { readonly path: string; readonly content: string }[] =>
    readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((entry) => {
        const rel = `${prefix}${entry.name}`;
        const full = join(current, entry.name);
        return entry.isDirectory()
          ? walk(full, `${rel}/`)
          : [{ path: rel, content: readFileSync(full, "utf8") }];
      });
  return walk(base, "");
}

function readTranscript(dir: string): string {
  for (const name of ["transcript.txt", "transcript.json"]) {
    const path = join(dir, name);
    if (existsSync(path) && statSync(path).isFile()) return readFileSync(path, "utf8");
  }
  return "";
}

function preservePacket(root: string, packetDir: string, validation: ExternalIntakeValidationResult): string {
  const runId = packetRunId(validation, packetDir);
  const dest = join(externalIntakeReceivedRoot(root), runId);
  copyTree(packetDir, dest);
  writeFileSync(join(dest, "intake-result.json"), json(validation), "utf8");
  return dest;
}

export function importExternalRunPacket(
  root: string,
  familyId: string,
  packetDir: string,
): ExternalIntakeImportResult {
  const prepared = prepareChallenge(root, familyId);
  const existingRunIds = readFamilyTrials(join(root, "trials"), familyId).map((trial) => trial.runId);
  const validation = validateExternalRunPacket(root, packetDir, {
    familyId,
    currentChallengeHash: prepared.hash,
    expectedScenarioSetId: prepared.scenarioSetId,
    existingRunIds,
  });
  const preservedDir = preservePacket(root, packetDir, validation);
  if (!validation.importedTrialEligible || validation.packet.metadata === null) {
    return { validation, preservedDir, trialDir: null };
  }

  const metadata = validation.packet.metadata;
  const runId = metadata.runId as string;
  const route = routeFor(familyId);
  const submissionPath = join(packetDir, "submission", "subject.mjs");
  const graded = route.grade(submissionPath);
  const countability = decideCountability(
    "completed",
    metadata.notes || "validated external packet",
    graded.cells.length,
  );
  const record = parseTrialRecord({
    runId,
    familyId,
    subjectId: metadata.subjectId ?? metadata.model ?? "external",
    subjectType: "agent",
    model: metadata.model,
    effort: null,
    status: "completed",
    counts: countability.counts,
    countsReason: countability.reason,
    scenarioSetId: prepared.scenarioSetId,
    cells: countability.counts ? graded.cells : [],
    runtimeSeconds: null,
    costUsd: null,
    artifactPath: countability.counts ? join("trials", familyId, runId, "submission") : null,
    isolation: "subprocess",
    notes: `external intake import from ${packetDir}; provider=${metadata.provider ?? "unknown"}`,
  });
  const trialDir = writeTrialDirectory({
    root: join(root, "trials"),
    familyId,
    runId,
    record,
    countability,
    transcript: readTranscript(packetDir),
    challengeFiles: prepared.pkg.files.map((file) => ({ path: file.path, content: file.content })),
    submissionFiles: readSubmissionFiles(packetDir),
    verifierOutput: { runId, challengeHash: prepared.hash, cells: graded.cells, detail: graded.detail },
    metadata: {
      runId,
      familyId,
      providerFamily: metadata.providerFamily,
      provider: metadata.provider,
      model: metadata.model,
      subjectId: metadata.subjectId,
      runtime: metadata.runtime,
      runDate: metadata.runDate,
      scenarioSetId: prepared.scenarioSetId,
      challengeHash: prepared.hash,
      importedFrom: packetDir,
      preservedExternalPacket: preservedDir.replace(`${root}/`, ""),
      classification: "completed",
      notes: metadata.notes,
    },
  });
  return { validation, preservedDir, trialDir };
}
