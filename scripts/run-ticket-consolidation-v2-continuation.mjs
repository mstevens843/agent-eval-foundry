// Continuation for ticket-consolidation-repair on the corrected, validated v2.0.2
// package only. Exclusively owns a new campaign root, new ledger, and new slots
// under .local/ticket-consolidation-continuation-v2-2026-09-11/ -- never reuses the
// original campaign's slots and never touches its controller/ledger (that shared-
// slot pattern is what caused the earlier orphan-dispatch error). Reuses the
// existing, unmodified run-successor-trial-slot.mjs for every dispatch, so each
// solver sees only the corrected public task materials and standard instructions --
// never prior submissions, audit findings, private controls, or grader internals.
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
const TASK = "ticket-consolidation-repair";
const NEW_VERSION = "2.0.2";
const NEW_PACKAGE_DIGEST = "f01f00452514cce2527710420055fd93994f115d7bae7b1008a8ca598d3fad33";
const OLD_PACKAGE_DIGEST = "39f2a285b88072ca203ca0ad1998517269e0a376daa00b52cc252dffa79916cb";
const correctionRoot = ".local/ticket-checker-correction-2026-09-11-validated";
const packageDirectory = join(correctionRoot, "build");
const assurancePath = join(correctionRoot, "assurance/assurance.json");
const frozenRoot = ".local/successor-adaptive-trials-2026-09-11/frozen-source";
const continuationRoot = join(root, ".local/ticket-consolidation-continuation-v2-2026-09-11");
const ATTEMPT_NUMBERS = [5, 6, 7]; // 1-3 = original Claude, 4 = excluded null Codex attempt.
const MAX_NEW_CLEAN_FAILURES = 3;

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const save = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
};

function slotConfigFor(attemptNumber) {
  return {
    schemaVersion: 1,
    id: TASK,
    version: NEW_VERSION,
    trial: attemptNumber, // Physical dispatch identity, not the counted-trial number.
    target: "codex",
    condition: "ticket-consolidation-checker-correction-v2-continuation",
    analysisDocument: "reports/screening/next-five/09-ticket-consolidation-repair.md",
    packageDigest: NEW_PACKAGE_DIGEST,
    packageDirectory,
    assurancePath,
    frozenRoot,
    runRoot: relative(
      root,
      join(continuationRoot, "slots", `attempt-${attemptNumber}`, "real-campaign-frozen"),
    ),
    maxProviderCalls: 1,
    automaticRetries: false,
  };
}

function slotPaths(attemptNumber) {
  const dir = join(continuationRoot, "slots", `attempt-${attemptNumber}`);
  return { dir, configPath: join(dir, "slot.json") };
}

function assertCorrectedPackageReady() {
  const ready = read(join(root, correctionRoot, "READY.json"));
  assert.equal(ready.packageDigest, NEW_PACKAGE_DIGEST, "Corrected package digest disagrees with READY.json");
  assert.equal(ready.priorPackageDigest, OLD_PACKAGE_DIGEST);
  assert.equal(ready.verified, true);
  assert.equal(ready.dispatched, false, "Corrected package readiness already shows a dispatch");
  assert.equal(ready.providerCallsMade, 0);
  assert.equal(ready.checkerCandidates, 28);
  assert.equal(ready.historicalTrial4.recordedReward, 1);
  assert.equal(ready.historicalTrial4.auditDisposition, "false-pass");
  assert.equal(ready.historicalTrial4.countsAsCleanPass, false);
  assert.equal(ready.historicalTrial4.countsAsCleanFailure, false);
  assert.equal(ready.historicalTrial4.originalRecordUnchanged, true);
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
    "Another ticket-consolidation-repair container is already running",
  );
}

async function verify() {
  const ready = assertCorrectedPackageReady();
  const api = await import(pathToFileURL(join(root, frozenRoot, "dist/index.js")));
  await assertPackageIdentity(api);
  assertNoConflictingContinuation();
  const slots = ATTEMPT_NUMBERS.map((attemptNumber) => {
    const { dir, configPath } = slotPaths(attemptNumber);
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
    return { attemptNumber, prepared, dir: relative(root, dir), readyStatus };
  });
  return {
    verified: true,
    task: TASK,
    newVersion: NEW_VERSION,
    newPackageDigest: NEW_PACKAGE_DIGEST,
    oldPackageDigest: OLD_PACKAGE_DIGEST,
    correctedPackageReady: ready.verified,
    dispatched: existsSync(join(continuationRoot, "DISPATCH-CLAIM")),
    slots,
  };
}

async function prepare() {
  assertCorrectedPackageReady();
  assertNoConflictingContinuation();
  for (const attemptNumber of ATTEMPT_NUMBERS) {
    const { dir, configPath } = slotPaths(attemptNumber);
    if (existsSync(configPath)) continue;
    mkdirSync(dir, { recursive: true });
    save(configPath, slotConfigFor(attemptNumber));
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
    "--user-authorized-ticket-consolidation-v2-continuation",
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
  });

  let cleanFailures = 0;
  let countedTrial = 4; // 1-3 = original Claude clean failures; trial 4 (old, null) does not consume a slot.
  const evidence = [];
  let stopReason = null;
  for (const attemptNumber of ATTEMPT_NUMBERS) {
    if (cleanFailures >= MAX_NEW_CLEAN_FAILURES) break;
    const { configPath } = slotPaths(attemptNumber);
    const config = read(configPath);
    const runRoot = join(root, config.runRoot);
    assert(!existsSync(join(runRoot, "DISPATCH-CLAIM")), `Attempt ${attemptNumber} slot was already dispatched`);
    emit({ stage: "launch", task: TASK, attemptNumber, target: "codex", packageDigest: NEW_PACKAGE_DIGEST });
    const log = join(continuationRoot, "logs", `attempt-${attemptNumber}.log`);
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
        attemptNumber,
        target: "codex",
        packageDigest: NEW_PACKAGE_DIGEST,
        countedReward: null,
        error: failure ?? outcome,
        automaticRetries: 0,
      };
      save(join(continuationRoot, "incidents", `attempt-${attemptNumber}.json`), incident);
      emit({ stage: "task-stopped-unscored", ...incident });
      stopReason = "infrastructure-or-unresolved-grading";
      break;
    }
    countedTrial++;
    const row = {
      task: TASK,
      attemptNumber,
      countedTrial,
      target: "codex",
      packageDigest: NEW_PACKAGE_DIGEST,
      ...outcome,
    };
    evidence.push(row);
    save(join(continuationRoot, "adjudicated", `attempt-${attemptNumber}.json`), row);
    emit({ stage: "trial-result", ...row });
    if (outcome.countedReward === 1) {
      stopReason = "solver-pass";
      break;
    }
    cleanFailures++;
    if (cleanFailures >= MAX_NEW_CLEAN_FAILURES) stopReason = "three-new-clean-failures";
  }
  const outcomeSummary = { id: TASK, cleanFailures, countedTrial, stopReason, evidence };
  save(join(continuationRoot, "outcome.json"), outcomeSummary);
  const final = {
    at: new Date().toISOString(),
    task: TASK,
    newPackageDigest: NEW_PACKAGE_DIGEST,
    oldPackageDigest: OLD_PACKAGE_DIGEST,
    historicalOriginalProviderAttempts: 4, // trials 1-3 Claude + trial 4 Codex (null), all on the old digest.
    newProviderAttempts: evidence.length + (stopReason === "infrastructure-or-unresolved-grading" ? 1 : 0),
    outcome: outcomeSummary,
  };
  save(join(continuationRoot, "FINAL.json"), final);
  emit({ stage: "continuation-finished", task: TASK, stopReason, countedTrial });
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
      "Use: run-ticket-consolidation-v2-continuation.mjs prepare | verify | run --user-authorized-ticket-consolidation-v2-continuation",
    );
}
