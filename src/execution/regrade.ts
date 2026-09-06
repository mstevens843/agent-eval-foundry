import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson, sha256 } from "../packages/record.js";
import {
  publishEvidence,
  regularTree,
  reserveDirectory,
  verifyEvidence,
  writeEvidence,
} from "./artifacts.js";
import { executionSourceIdentity } from "./execute.js";
import { executionPackage, gradeExecutionPackage } from "./package-route.js";

/** New evaluator, new linked immutable record. Never a new agent trial or an original rewrite. */
export async function regradeExecution(
  original: string,
  packageDirectory: string,
  outputRoot: string,
  id: string,
) {
  const manifest = verifyEvidence(original);
  const originalDigest = sha256(readFileSync(join(original, "completion.json")));
  const pkg = executionPackage(packageDirectory);
  const reserved = reserveDirectory(outputRoot, id);
  const submission = join(original, "submission");
  const before = regularTree(submission);
  const grading = await gradeExecutionPackage(pkg, submission, join(reserved.stage, "grading"));
  if (
    canonicalJson(before) !== canonicalJson(regularTree(submission)) ||
    sha256(readFileSync(join(original, "completion.json"))) !== originalDigest
  )
    throw Error("REGRADE_MUTATED_SOURCE");
  verifyEvidence(original);
  writeEvidence(join(reserved.stage, "result.json"), {
    schemaVersion: 1,
    kind: "linked-regrade",
    originalCompletionDigest: originalDigest,
    originalIdentity: manifest.identity,
    targetPackageDigest: pkg.snapshot.record.digest,
    executionSourceDigest: executionSourceIdentity(),
    newAgentAttempts: 0,
    countsAsModelFailure: false,
    ...grading,
  });
  return publishEvidence(reserved.stage, reserved.destination, {
    kind: "linked-regrade",
    originalCompletionDigest: originalDigest,
    targetPackageDigest: pkg.snapshot.record.digest,
  });
}
