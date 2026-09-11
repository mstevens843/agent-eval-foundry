// Standalone reconciliation for verified-installation-repair trial 2.
//
// Links the original unscored infrastructure incident (Docker unreachable during
// grading) to the completed linked-regrade result produced separately by
// regradeExecution. Never modifies the original campaign's events.jsonl, outcomes,
// or the reviewed controller's own files. Never invokes a model. Read-only against
// both the original record and the regrade record; writes only a new reconciliation
// artifact.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const campaign = join(root, ".local/successor-adaptive-trials-2026-09-11");
const frozenRoot = join(campaign, "frozen-source");
const regradeRoot = join(root, ".local/verified-installation-t2-grading-recovery-2026-09-11/grading-only");
const outputPath = join(
  root,
  "reports/pass-audits/verified-installation-trial-two-reconciliation-2026-09-11.json",
);

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

async function main() {
  assert(!existsSync(outputPath), "Reconciliation already written; do not overwrite it");
  const api = await import(pathToFileURL(join(frozenRoot, "dist/index.js")));
  const { verifyEvidence } = api;

  const outcome = read(join(campaign, "outcomes/verified-installation-repair.json"));
  assert.equal(outcome.stopReason, "infrastructure-or-unresolved-grading", "Package was not stopped on an incident");
  assert.equal(outcome.counted, 1, "Expected exactly one counted trial before the incident");
  assert.equal(outcome.attempts.at(-1).trial, 2);
  assert.equal(outcome.attempts.at(-1).outcome, "unscored");

  const originalRecord = join(
    campaign,
    "slots/verified-installation-repair/trial-2/real-campaign-frozen/jobs/real-provider/records",
    "verified-installation-repair-attempt-1",
  );
  const originalCompletion = read(join(originalRecord, "completion.json"));
  const originalGrade = read(join(originalRecord, "grade.json"));
  assert(originalCompletion.complete);
  assert.equal(originalGrade.classification, "invalid-execution");
  assert.equal(originalGrade.stage, "grading");
  const originalCompletionSha256 = hash(join(originalRecord, "completion.json"));
  const originalGradeSha256 = hash(join(originalRecord, "grade.json"));
  verifyEvidence(originalRecord);

  assert(existsSync(regradeRoot), "Linked regrade record is missing; run the recovery command first");
  const regrade = read(join(regradeRoot, "result.json"));
  assert.equal(regrade.kind, "linked-regrade");
  assert.equal(regrade.newAgentAttempts, 0, "Regrade must add zero model attempts");
  assert.equal(regrade.countsAsModelFailure, false);
  assert.equal(regrade.originalCompletionDigest, originalCompletionSha256, "Regrade is linked to a different completion");
  assert.equal(regrade.originalIdentity.id, "verified-installation-repair-attempt-1");
  assert.equal(regrade.originalIdentity.packageDigest, originalCompletion.identity.packageDigest);
  assert.equal(regrade.originalIdentity.profileDigest, originalCompletion.identity.profileDigest);
  assert.equal(regrade.originalIdentity.executionSourceDigest, originalCompletion.identity.executionSourceDigest);
  const regradeResultSha256 = hash(join(regradeRoot, "result.json"));
  verifyEvidence(regradeRoot);

  const recoveredReward = regrade.evaluation.status === "semantic-pass" && regrade.checkerPassed === true ? 1 : 0;
  assert.equal(regrade.reward, recoveredReward);

  // Post-check: the original incident record must be byte-identical to before.
  assert.equal(hash(join(originalRecord, "completion.json")), originalCompletionSha256, "Original completion.json changed");
  assert.equal(hash(join(originalRecord, "grade.json")), originalGradeSha256, "Original grade.json changed");
  assert.equal(originalGrade.classification, "invalid-execution", "Original incident classification changed");

  const reconciliation = {
    schemaVersion: 1,
    at: new Date().toISOString(),
    task: "verified-installation-repair",
    purpose:
      "Link the original trial-2 unscored infrastructure incident to the completed linked-regrade " +
      "grading result. The submitted code and captured provider transcript are unchanged; only the " +
      "interrupted grading stage was rerun offline against the exact retained submission.",
    original: {
      trial: 2,
      target: "claude",
      record: relative(root, originalRecord),
      completionSha256: originalCompletionSha256,
      gradeSha256: originalGradeSha256,
      classification: originalGrade.classification,
      stage: originalGrade.stage,
      error: originalGrade.error,
      preserved: true,
    },
    regrade: {
      record: relative(root, regradeRoot),
      resultSha256: regradeResultSha256,
      kind: regrade.kind,
      newAgentAttempts: regrade.newAgentAttempts,
      countsAsModelFailure: regrade.countsAsModelFailure,
      service: regrade.evaluation.status,
      serviceComplete: regrade.evaluation.complete,
      checkerPassed: regrade.checkerPassed,
      checkerRequired: regrade.checkerRequired,
    },
    recoveredReward,
    reconciledOutcome: recoveredReward === 1 ? "pass" : "clean-fail",
    note:
      "Trial 2's model attempt already happened at original dispatch time; this regrade invoked no " +
      "model and is not counted as an additional provider attempt. For continuation purposes trial 2 " +
      "is treated as a counted clean failure (service passed, checker failed), not as remaining unscored.",
  };
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(reconciliation, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(reconciliation, null, 2));
}

await main();
