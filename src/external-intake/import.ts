import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  copyArtifactTree,
  publishEvidence,
  regularTree,
  reserveDirectory,
  writeEvidence,
} from "../execution/artifacts.js";
import { unobservedProfile } from "../execution/profiles.js";
import type { PackagePolicyInput } from "../packages/policy.js";
import { canonicalJson } from "../packages/record.js";
import { packageSourceSeed, retainedTreeDigest } from "../packages/source.js";
import { readFamilyTrials, writeTrialDirectory } from "../trials/directory.js";
import { decideCountability } from "../trials/orchestrator.js";
import { evaluateOutcome } from "../trials/outcome.js";
import { assertSafeForCountedAgentTrial, routeFor } from "../trials/router.js";
import { currentChallenge } from "../trials/run.js";
import { parseTrialRecord } from "../trials/validate.js";
import type { ExternalIntakeImportResult, ExternalIntakeValidationResult } from "./types.js";
import { validateExternalRunPacket } from "./validate.js";

export function externalIntakeReceivedRoot(root: string): string {
  return join(root, "external-intake", "received");
}

function packetRunId(validation: ExternalIntakeValidationResult): string {
  const runId = validation.packet.metadata?.runId;
  if (runId && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(runId)) return runId;
  // Malformed IDs are retained as data, never interpreted as destination paths.
  return `invalid-${randomUUID()}`;
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

export function preserveExternalPacket(
  root: string,
  packetDir: string,
  validation: ExternalIntakeValidationResult,
): string {
  const runId = packetRunId(validation);
  const reserved = reserveDirectory(externalIntakeReceivedRoot(root), runId);
  // Keep untrusted packet filenames separate from host-owned receipts/manifests.
  copyArtifactTree(packetDir, join(reserved.stage, "packet"), 64 * 1024 * 1024);
  writeEvidence(join(reserved.stage, "intake-result.json"), validation);
  return publishEvidence(reserved.stage, reserved.destination, {
    runId,
    operation: "external-intake",
    evidenceClass: "historical-import",
  });
}

export function importExternalRunPacket(
  root: string,
  familyId: string,
  packetDir: string,
  packagePolicy?: PackagePolicyInput,
): ExternalIntakeImportResult {
  const prepared = currentChallenge(root, familyId);
  const packetBefore = regularTree(packetDir, 64 * 1024 * 1024);
  const existingRunIds = readFamilyTrials(join(root, "trials"), familyId).map((trial) => trial.runId);
  const validation = validateExternalRunPacket(root, packetDir, {
    familyId,
    currentChallengeHash: prepared.hash,
    expectedScenarioSetId: prepared.scenarioSetId,
    existingRunIds,
    ...(packagePolicy ? { packagePolicy } : {}),
  });
  const preservedDir = preserveExternalPacket(root, packetDir, validation);
  const retainedPacket = join(preservedDir, "packet");
  if (canonicalJson(packetBefore) !== canonicalJson(regularTree(retainedPacket, 64 * 1024 * 1024)))
    throw Error("EXTERNAL_PACKET_CHANGED_DURING_VALIDATION");
  if (!validation.importedTrialEligible || validation.packet.metadata === null) {
    return { validation, preservedDir, trialDir: null };
  }

  // The packet is preserved above regardless — evidence that a submission arrived is never destroyed.
  // What is refused here is COUNTING it: grading an untrusted external submission through a route that
  // still shares one process between the submission and the code that owns the ledger.
  assertSafeForCountedAgentTrial(familyId);
  const snapshot = packagePolicy?.snapshot;
  if (
    !snapshot ||
    packageSourceSeed(root, familyId, snapshot.record.version).record.digest !== snapshot.record.digest
  )
    throw new Error("PACKAGE_IMPORT_GRADER_IDENTITY_MISMATCH");

  const metadata = validation.packet.metadata;
  const runId = metadata.runId as string;
  const route = routeFor(familyId);
  const submissionPath = join(retainedPacket, "submission", "subject.mjs");
  let graded: ReturnType<typeof route.grade>;
  try {
    graded = route.grade(submissionPath);
  } catch (error) {
    graded = { cells: [], hostErrors: 1, detail: `grader failed: ${(error as Error).message}` };
  }
  const evaluation = evaluateOutcome({
    providerStatus: "completed",
    expectedIds: [...route.scenarioParams().keys()],
    expectedCheckIds: route.family.checks,
    cells: graded.cells,
    hostErrors: graded.hostErrors,
    artifactPresent: true,
  });
  const countability = decideCountability(
    "completed",
    metadata.notes || "validated external packet",
    evaluation.complete ? graded.cells.length : 0,
    graded.hostErrors,
  );
  const record = parseTrialRecord({
    runId,
    familyId,
    subjectId: metadata.subjectId ?? metadata.model ?? "external",
    subjectType: "agent",
    model: metadata.model,
    effort: null,
    status: countability.classification,
    counts: countability.counts,
    countsReason: countability.reason,
    scenarioSetId: prepared.scenarioSetId,
    cells: countability.counts ? graded.cells : [],
    runtimeSeconds: null,
    costUsd: null,
    artifactPath: countability.counts ? join("trials", familyId, runId, "submission") : null,
    isolation: graded.isolation ?? "subprocess",
    notes: `external intake import from ${packetDir}; provider=${metadata.provider ?? "unknown"}`,
  });
  const trialDir = writeTrialDirectory({
    root: join(root, "trials"),
    familyId,
    runId,
    record,
    countability,
    transcript: readTranscript(retainedPacket),
    challengeFiles: prepared.pkg.files.map((file) => ({ path: file.path, content: file.content })),
    submissionFiles: readSubmissionFiles(retainedPacket),
    verifierOutput: {
      runId,
      challengeHash: prepared.hash,
      cells: graded.cells,
      detail: graded.detail,
      hostErrors: graded.hostErrors,
      evaluation,
    },
    metadata: {
      runId,
      packageDigest: snapshot.record.digest,
      submissionDigest: retainedTreeDigest(join(retainedPacket, "submission")),
      evaluation,
      authoringIsolation: "external-unknown",
      gradingIsolation: graded.isolation ?? "unknown",
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
      profileObservation: unobservedProfile("historical-import"),
      requestedProfileProvenance: "imported metadata; not a runtime attestation",
      preservedExternalPacket: preservedDir.replace(`${root}/`, ""),
      classification: "completed",
      notes: metadata.notes,
    },
  });
  return { validation, preservedDir, trialDir };
}
