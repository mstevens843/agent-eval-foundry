import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { readTrialDirectory } from "../trials/directory.js";
import { type EvaluationOutcome, evaluateOutcome } from "../trials/outcome.js";
import { hashChallengeDir } from "../trials/run.js";
import type { TrialCell } from "../trials/types.js";
import { type PackagePolicyInput, assertPackageStage } from "./policy.js";
import { type PackageSnapshot, canonicalJson, refreshSnapshot, resolvePackage, sha256 } from "./record.js";
import {
  expectedPackageCheckIds,
  expectedPackageScenarioIds,
  readPackageTree,
  retainedTreeDigest,
  verifyPublicPackage,
} from "./source.js";

/** Read the original observation unchanged; assess its usable scope separately. Never backfill it. */
export function inspectTrialEvidence(
  directory: string,
  options: { readonly store?: string; readonly current?: PackageSnapshot } = {},
) {
  const trial = readTrialDirectory(directory);
  const metadata = JSON.parse(readFileSync(join(directory, "metadata.json"), "utf8"));
  const verifier = JSON.parse(readFileSync(join(directory, "verifier-output.json"), "utf8"));
  const problems: string[] = [];
  const publicHash = hashChallengeDir(join(directory, "challenge"));
  if (publicHash === null) problems.push("retained-public-bytes-unavailable");
  if (metadata.challengeHash && metadata.challengeHash !== publicHash)
    problems.push("declared-public-hash-mismatch");
  let snapshot: PackageSnapshot | undefined;
  let evaluation: EvaluationOutcome | null = null;
  if (typeof metadata.packageDigest === "string" && options.store) {
    try {
      snapshot = resolvePackage(options.store, metadata.packageDigest);
      verifyPublicPackage(snapshot, join(directory, "challenge"));
      const actualSubmission = retainedTreeDigest(join(directory, "submission"));
      if (metadata.submissionDigest !== actualSubmission)
        problems.push("submission-bytes-mismatch-or-identity-absent");
      evaluation = evaluateOutcome({
        providerStatus: metadata.classification ?? trial.record.status,
        expectedIds: expectedPackageScenarioIds(snapshot),
        expectedCheckIds: expectedPackageCheckIds(snapshot),
        ...(verifier.errorStage ? { errorStage: verifier.errorStage } : {}),
        cells: verifier.cells,
        hostErrors: verifier.hostErrors,
        artifactPresent: trial.submissionFiles.length > 0,
      });
      if (canonicalJson(trial.record.cells) !== canonicalJson(verifier.cells) && trial.record.counts)
        problems.push("result-versus-verifier-disagreement");
      if (verifier.evaluation && canonicalJson(verifier.evaluation) !== canonicalJson(evaluation))
        problems.push("declared-evaluation-mismatch");
      if (metadata.evaluation && canonicalJson(metadata.evaluation) !== canonicalJson(evaluation))
        problems.push("metadata-evaluation-mismatch");
      if (trial.countability.counts !== trial.record.counts)
        problems.push("countability-versus-result-disagreement");
    } catch (error) {
      problems.push((error as Error).message);
    }
  } else problems.push("legacy-full-package-identity-unavailable");
  const fullIdentityVerified = snapshot !== undefined && problems.length === 0;
  const current = fullIdentityVerified && options.current?.record.digest === snapshot?.record.digest;
  const semanticComplete = fullIdentityVerified && evaluation?.complete === true;
  return {
    view: options.current ? "current-package" : "historical-package",
    original: { record: trial.record, countability: trial.countability, rootCause: trial.rootCause },
    identity: {
      scope: fullIdentityVerified ? "complete-package-v1" : "legacy-visible-only-or-invalid",
      publicHash,
      packageDigest: snapshot?.record.digest ?? null,
      current,
      problems,
    },
    evaluation,
    usableSemanticObservation: semanticComplete && (!options.current || current),
    capabilityEvidence:
      semanticComplete &&
      (!options.current || current) &&
      evaluation?.status === "semantic-fail" &&
      trial.rootCause.label === "capability" &&
      metadata.executionMode !== "inert-test",
  };
}

/** A linked local evaluation, not a new agent attempt. Publication cannot overwrite the original. */
export function publishRegrade(options: {
  readonly store: string;
  readonly originalDirectory: string;
  readonly policy: PackagePolicyInput;
  readonly grade: (artifact: string) => { readonly cells: readonly TrialCell[]; readonly hostErrors: number };
}) {
  assertPackageStage(options.policy, "trial-eligible");
  if (!options.policy.snapshot) throw new Error("PACKAGE_UNVERIFIED");
  const snapshot = refreshSnapshot(options.policy.snapshot);
  const original = readTrialDirectory(options.originalDirectory);
  const originalResult = readFileSync(join(options.originalDirectory, "result.json"));
  const metadata = JSON.parse(readFileSync(join(options.originalDirectory, "metadata.json"), "utf8"));
  const submissionDirectory = join(options.originalDirectory, "submission");
  const submissionDigest = retainedTreeDigest(submissionDirectory);
  let graded: { readonly cells: readonly TrialCell[]; readonly hostErrors: number };
  const scratch = mkdtempSync(join(tmpdir(), "foundry-linked-regrade-"));
  try {
    for (const file of readPackageTree(submissionDirectory)) {
      const path = join(scratch, file.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, file.bytes, { flag: "wx", mode: file.executable ? 0o755 : 0o644 });
    }
    graded = options.grade(join(scratch, "subject.mjs"));
  } catch {
    graded = { cells: [], hostErrors: 1 };
  } finally {
    rmSync(scratch, { recursive: true });
  }
  if (
    retainedTreeDigest(submissionDirectory) !== submissionDigest ||
    !readFileSync(join(options.originalDirectory, "result.json")).equals(originalResult)
  )
    throw new Error("REGRADE_MUTATED_ORIGINAL");
  const evaluation = evaluateOutcome({
    providerStatus: original.record.status,
    expectedIds: expectedPackageScenarioIds(snapshot),
    expectedCheckIds: expectedPackageCheckIds(snapshot),
    cells: graded.cells,
    hostErrors: graded.hostErrors,
    artifactPresent: original.submissionFiles.length > 0,
  });
  const body = {
    schemaVersion: 1,
    kind: "linked-regrade",
    originalRunId: original.runId,
    originalResultDigest: sha256(originalResult),
    originalPackageDigest: metadata.packageDigest ?? null,
    targetPackageDigest: snapshot.record.digest,
    submissionDigest,
    evaluation,
    cells: graded.cells,
    newAgentAttempts: 0,
    adjudication: "unlabelled",
  };
  const bytes = Buffer.from(canonicalJson(body));
  const digest = sha256(bytes);
  const directory = join(options.store, "evaluations");
  mkdirSync(directory, { recursive: true });
  if (!lstatSync(directory).isDirectory()) throw new Error("REGRADE_STORE_FILE_TYPE");
  const path = join(directory, `${digest}.json`);
  if (existsSync(path)) {
    if (!lstatSync(path).isFile() || !readFileSync(path).equals(bytes))
      throw new Error("REGRADE_IMMUTABLE_CONFLICT");
  } else writeFileSync(path, bytes, { flag: "wx", mode: 0o444 });
  return { ...body, digest, path };
}
