// Continuation for partial-release-repair on the corrected, validated v2.0.2
// generation-fix package. Exclusively owns a new campaign root, ledger, and fresh
// slots under .local/partial-release-generation-continuation-2026-09-11/ -- never
// reuses the original campaign's slots or controller.
//
// Trial 2's original pass is a valid, unchanged historical record (not nulled),
// so this continuation deliberately does NOT reuse successor-adaptive-policy.mjs's
// generic applyTrialOutcome/nextTrial (which treats any pass as a permanent stop).
// It uses its own small trial-budget state machine instead: trial 3 (Claude), then
// trials 4-5 (Codex, only while the preceding new trials cleanly fail), then trial 6
// (Codex, only if 3-5 all cleanly failed). Stops immediately on the first NEW pass;
// otherwise stops after a maximum of four new provider attempts.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TASK = "partial-release-repair";
const NEW_VERSION = "2.0.2";
const NEW_PACKAGE_DIGEST = "1422a83d7860f81e2bf9bdb52ce634887f2e8da4edcccbe8870cdcfebaadf897";
const OLD_PACKAGE_DIGEST = "9bd1c3ae996492793bc3f01264c28a3ed327836f2ae16b7353f8f1571cc0a612";
const correctionRoot = ".local/partial-release-generation-correction-2026-09-11";
const packageDirectory = join(correctionRoot, "build");
const assurancePath = join(correctionRoot, "assurance/assurance.json");
const frozenRoot = ".local/successor-adaptive-trials-2026-09-11/frozen-source";
const continuationRoot = join(root, ".local/partial-release-generation-continuation-2026-09-11");
// Trial numbering here is contiguous with the historical record: 1-2 already
// happened (Claude, fail then pass); these are the only new ones authorized.
const NEW_TRIAL_PLAN = [
  { trial: 3, provider: "claude" },
  { trial: 4, provider: "codex" },
  { trial: 5, provider: "codex" },
  { trial: 6, provider: "codex" },
];

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const save = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
};

function slotConfigFor(trial, provider) {
  return {
    schemaVersion: 1,
    id: TASK,
    version: NEW_VERSION,
    trial,
    target: provider,
    condition: "partial-release-generation-correction-v2-continuation",
    analysisDocument: "reports/screening/next-five/08-partial-release-repair.md",
    packageDigest: NEW_PACKAGE_DIGEST,
    packageDirectory,
    assurancePath,
    frozenRoot,
    runRoot: relative(root, join(continuationRoot, "slots", `trial-${trial}`, "real-campaign-frozen")),
    maxProviderCalls: 1,
    automaticRetries: false,
  };
}

function slotPaths(trial) {
  const dir = join(continuationRoot, "slots", `trial-${trial}`);
  return { dir, configPath: join(dir, "slot.json") };
}

function assertCorrectedPackageReady() {
  const ready = read(join(root, correctionRoot, "READY.json"));
  assert.equal(ready.packageDigest, NEW_PACKAGE_DIGEST, "Corrected package digest disagrees with READY.json");
  assert.equal(ready.priorPackageDigest, OLD_PACKAGE_DIGEST);
  assert.equal(ready.verified, true);
  assert.equal(ready.dispatched, false, "Corrected package readiness already shows a dispatch");
  assert.equal(ready.providerCallsMade, 0);
  assert.equal(ready.checkerCandidates, 22);
  assert.equal(ready.historicalTrial2.recordedReward, 1);
  assert.equal(ready.historicalTrial2.auditDisposition, "retain-pass");
  assert.equal(ready.historicalTrial2.originalRecordUnchanged, true);
  const assurance = read(join(root, assurancePath));
  assert.equal(assurance.packageDigest, NEW_PACKAGE_DIGEST, "Assurance is for a different package");
  assert(
    assurance.results.length > 0 && assurance.results.every((r) => r.status === "pass"),
    "Corrected package assurance contains a non-pass result",
  );
  return ready;
}

async function assertPackageIdentity(api) {
  const pkg = api.executionPackage(join(root, packageDirectory));
  assert.equal(pkg.snapshot.record.digest, NEW_PACKAGE_DIGEST, "Package identity mismatch");
  assert.equal(pkg.checkerRequired, true, "Protected checker is required");
  return pkg;
}

function assertNoConflictingContinuation() {
  assert(
    !existsSync(join(continuationRoot, "DISPATCH-CLAIM")),
    "This continuation already dispatched; monitor it, do not relaunch",
  );
  let running;
  try {
    running = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8", timeout: 15_000 });
  } catch {
    running = "";
  }
  assert(
    !running.split("\n").some((name) => name.includes(TASK)),
    "Another partial-release-repair container is already running",
  );
}

async function verify() {
  const ready = assertCorrectedPackageReady();
  const api = await import(pathToFileURL(join(root, frozenRoot, "dist/index.js")));
  await assertPackageIdentity(api);
  assertNoConflictingContinuation();
  const slots = NEW_TRIAL_PLAN.map(({ trial, provider }) => {
    const { dir, configPath } = slotPaths(trial);
    const prepared = existsSync(configPath);
    let readyStatus = null;
    if (prepared) {
      const out = execFileSync(
        process.execPath,
        [join(root, "scripts/run-successor-trial-slot.mjs"), "verify", configPath],
        { cwd: root, encoding: "utf8", timeout: 60_000 },
      );
      readyStatus = JSON.parse(out);
    }
    return { trial, provider, prepared, dir: relative(root, dir), readyStatus };
  });
  return {
    verified: true,
    task: TASK,
    newVersion: NEW_VERSION,
    newPackageDigest: NEW_PACKAGE_DIGEST,
    oldPackageDigest: OLD_PACKAGE_DIGEST,
    historicalTrial2Retained: ready.historicalTrial2.auditDisposition === "retain-pass",
    correctedPackageReady: ready.verified,
    dispatched: existsSync(join(continuationRoot, "DISPATCH-CLAIM")),
    slots,
  };
}

async function prepare() {
  assertCorrectedPackageReady();
  assertNoConflictingContinuation();
  for (const { trial, provider } of NEW_TRIAL_PLAN) {
    const { dir, configPath } = slotPaths(trial);
    if (existsSync(configPath)) continue;
    mkdirSync(dir, { recursive: true });
    save(configPath, slotConfigFor(trial, provider));
    execFileSync(process.execPath, [join(root, "scripts/run-successor-trial-slot.mjs"), "prepare", configPath], {
      cwd: root,
      stdio: "inherit",
      timeout: 60_000,
    });
  }
  console.log(JSON.stringify(await verify(), null, 2));
}

function score(record, api) {
  const completion = read(join(record, "completion.json"));
  const manifest = api.verifyEvidence(record);
  assert(completion.complete);
  assert.equal(completion.identity.packageDigest, NEW_PACKAGE_DIGEST);
  const result = read(join(record, "result.json"));
  const capture = read(join(record, "capture.json"));
  const grade = read(join(record, "grade.json"));
  if (grade.classification === "invalid-execution") {
    return { unscored: true, classification: grade.classification, stage: grade.stage, error: grade.error };
  }
  assert(["semantic-pass", "semantic-fail"].includes(result.outcome));
  assert.equal(capture.status, "completed");
  assert.equal(capture.exitCode, 0);
  assert(grade.evaluation.complete);
  assert.equal(grade.checkerRequired, true);
  const reward = grade.evaluation.status === "semantic-pass" && grade.checkerPassed === true ? 1 : 0;
  assert.equal(grade.reward, reward);
  const checkerSummaryPath = join(record, "grading/checker-grade/grade-summary.json");
  const checker = existsSync(checkerSummaryPath) ? read(checkerSummaryPath) : null;
  return {
    unscored: false,
    countedReward: reward,
    service: grade.evaluation.status,
    checkerPassed: grade.checkerPassed,
    checker: checker
      ? { correct: checker.correct, total: checker.total, falsePositives: checker.falsePositives, missed: checker.missed }
      : null,
    verifiedFiles: manifest.files.length,
  };
}

async function run() {
  assert.equal(
    process.argv[3],
    "--user-authorized-partial-release-generation-v2-continuation",
    "Missing exact continuation authorization",
  );
  await verify();
  mkdirSync(continuationRoot, { recursive: true });
  closeSync(openSync(join(continuationRoot, "DISPATCH-CLAIM"), "wx", 0o600));
  const emit = (value) => {
    const row = { at: new Date().toISOString(), ...value };
    appendFileSync(join(continuationRoot, "events.jsonl"), JSON.stringify(row) + "\n");
    console.log(JSON.stringify(row));
  };
  const api = await import(pathToFileURL(join(root, frozenRoot, "dist/index.js")));
  emit({
    stage: "continuation-started",
    task: TASK,
    newPackageDigest: NEW_PACKAGE_DIGEST,
    oldPackageDigest: OLD_PACKAGE_DIGEST,
    historical: [
      { trial: 1, provider: "claude", outcome: "clean-fail", packageDigest: OLD_PACKAGE_DIGEST },
      { trial: 2, provider: "claude", outcome: "pass", packageDigest: OLD_PACKAGE_DIGEST },
    ],
  });

  let newCleanFailures = 0;
  const evidence = [];
  let stopReason = null;
  for (const { trial, provider } of NEW_TRIAL_PLAN) {
    if (newCleanFailures >= 4) break; // Should not happen: loop plan is exactly 4 entries.
    const { configPath } = slotPaths(trial);
    const config = read(configPath);
    const runRoot = join(root, config.runRoot);
    assert(!existsSync(join(runRoot, "DISPATCH-CLAIM")), `Trial ${trial} slot was already dispatched`);
    emit({ stage: "launch", task: TASK, trial, target: provider, packageDigest: NEW_PACKAGE_DIGEST });
    const log = join(continuationRoot, "logs", `trial-${trial}.log`);
    mkdirSync(dirname(log), { recursive: true });
    const fd = openSync(log, "wx", 0o600);
    let launchError;
    try {
      await new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(
          process.execPath,
          [join(root, "scripts/run-successor-trial-slot.mjs"), "run", configPath, "--user-authorized-successor-slot"],
          { cwd: root, env: process.env, stdio: ["ignore", fd, fd] },
        );
        child.once("error", rejectPromise);
        child.once("exit", (code, signal) => {
          if (code === 0) resolvePromise();
          else rejectPromise(Error(`Child exit ${code}, signal ${signal}; inspect ${relative(root, log)}`));
        });
      });
    } catch (error) {
      launchError = error;
    } finally {
      closeSync(fd);
    }
    let outcome;
    let failure = launchError ? String(launchError) : undefined;
    if (!failure) {
      try {
        const record = join(runRoot, "jobs/real-provider/records", `${TASK}-attempt-1`);
        outcome = score(record, api);
      } catch (error) {
        failure = String(error);
      }
    }
    if (failure !== undefined || outcome.unscored) {
      const incident = {
        task: TASK,
        trial,
        target: provider,
        packageDigest: NEW_PACKAGE_DIGEST,
        countedReward: null,
        error: failure ?? outcome,
        automaticRetries: 0,
      };
      save(join(continuationRoot, "incidents", `trial-${trial}.json`), incident);
      emit({ stage: "task-stopped-unscored", ...incident });
      stopReason = "infrastructure-or-unresolved-grading";
      break;
    }
    const row = { task: TASK, trial, target: provider, packageDigest: NEW_PACKAGE_DIGEST, ...outcome };
    evidence.push(row);
    save(join(continuationRoot, "adjudicated", `trial-${trial}.json`), row);
    emit({ stage: "trial-result", ...row });
    if (outcome.countedReward === 1) {
      stopReason = "solver-pass";
      break;
    }
    newCleanFailures++;
    if (newCleanFailures >= 4) stopReason = "six-total-trials";
  }
  const outcomeSummary = {
    id: TASK,
    historicalTrial1: "clean-fail",
    historicalTrial2: "pass (retained, valid)",
    newCleanFailures,
    stopReason,
    evidence,
  };
  save(join(continuationRoot, "outcome.json"), outcomeSummary);
  const final = {
    at: new Date().toISOString(),
    task: TASK,
    newPackageDigest: NEW_PACKAGE_DIGEST,
    oldPackageDigest: OLD_PACKAGE_DIGEST,
    historicalOriginalProviderAttempts: 2, // trial 1 (Claude, fail) + trial 2 (Claude, pass), both old digest.
    newProviderAttempts: evidence.length + (stopReason === "infrastructure-or-unresolved-grading" ? 1 : 0),
    outcome: outcomeSummary,
  };
  save(join(continuationRoot, "FINAL.json"), final);
  emit({ stage: "continuation-finished", task: TASK, stopReason, newCleanFailures });
  console.log(JSON.stringify(final, null, 2));
}

const direct = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const [mode] = process.argv.slice(2);
  if (mode === "prepare") await prepare();
  else if (mode === "verify") console.log(JSON.stringify(await verify(), null, 2));
  else if (mode === "run") await run();
  else
    throw Error(
      "Use: run-partial-release-generation-v2-continuation.mjs prepare | verify | run --user-authorized-partial-release-generation-v2-continuation",
    );
}
