// Separate continuation path for verified-installation-repair only.
//
// Resumes the adaptive successor trial policy from the reconciled trial-2 state
// (see reconcile-verified-installation-trial-two.mjs) using the existing frozen
// package and the unused prepared slots (trial-3..trial-6) already created under
// the successor-adaptive-trials-2026-09-11 campaign. Never writes to that
// campaign's own events.jsonl/outcomes/FINAL.json, never touches its reviewed
// controller process, and never dispatches partial-release-repair or any other
// package. Uses the unmodified successor-adaptive-policy.mjs and the unmodified
// run-successor-trial-slot.mjs as a child process, exactly like the reviewed
// controller does for its own launches.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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
import { applyTrialOutcome, initialTaskState, nextTrial } from "./successor-adaptive-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TASK = "verified-installation-repair";
const campaign = join(root, ".local/successor-adaptive-trials-2026-09-11");
const frozenRoot = join(campaign, "frozen-source");
const continuationRoot = join(root, ".local/verified-installation-continuation-2026-09-11");
const reconciliationPath = join(
  root,
  "reports/pass-audits/verified-installation-trial-two-reconciliation-2026-09-11.json",
);

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const save = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
};

function reconciledStartState() {
  const outcome = read(join(campaign, "outcomes", `${TASK}.json`));
  assert.equal(outcome.stopReason, "infrastructure-or-unresolved-grading");
  assert.equal(outcome.counted, 1);
  assert.equal(outcome.evidence.length, 1);
  const reconciliation = read(reconciliationPath);
  assert.equal(reconciliation.recoveredReward, 0, "This tool only supports a recovered clean failure");
  assert.equal(reconciliation.reconciledOutcome, "clean-fail");
  let state = initialTaskState(TASK);
  // Trial 1: the original, actually-counted clean failure.
  assert.equal(outcome.evidence[0].trial, 1);
  assert.equal(outcome.evidence[0].target, "claude");
  assert.equal(outcome.evidence[0].countedReward, 0);
  state = applyTrialOutcome(state, "clean-fail");
  // Trial 2: reconciled from the linked regrade. Zero new model attempts.
  state = applyTrialOutcome(state, "clean-fail");
  assert.equal(state.counted, 2);
  assert.equal(state.cleanFailures, 2);
  assert.deepEqual(state.providers, { claude: 2, codex: 0 });
  assert.equal(state.stopReason, null);
  assert.equal(state.nextTrial, 3);
  return { state, originalEvidence: outcome.evidence[0], reconciliation };
}

function score(record, config, ready) {
  const completion = read(join(record, "completion.json"));
  const manifest = api.verifyEvidence(record);
  assert(completion.complete);
  assert.equal(completion.identity.packageDigest, config.packageDigest);
  assert.equal(completion.identity.executionSourceDigest, ready.sourceDigest);
  assert.equal(completion.identity.profileDigest, ready.package.profileDigest);
  const result = read(join(record, "result.json"));
  const capture = read(join(record, "capture.json"));
  const grade = read(join(record, "grade.json"));
  assert(["semantic-pass", "semantic-fail"].includes(result.outcome));
  assert.equal(capture.status, "completed");
  assert.equal(capture.error, null);
  assert.equal(capture.exitCode, 0);
  assert(grade.evaluation.complete);
  assert(["semantic-pass", "semantic-fail"].includes(grade.evaluation.status));
  assert.equal(grade.checkerRequired, true);
  assert.equal(typeof grade.checkerPassed, "boolean");
  const reward = grade.evaluation.status === "semantic-pass" && grade.checkerPassed === true ? 1 : 0;
  assert.equal(grade.reward, reward);
  assert.equal(result.outcome, reward === 1 ? "semantic-pass" : "semantic-fail");
  const checkerSummaryPath = join(record, "grading/checker-grade/grade-summary.json");
  const checker = existsSync(checkerSummaryPath) ? read(checkerSummaryPath) : null;
  if (grade.checkerPassed) assert(checker, "Passing checker has no protected grading summary");
  assert(existsSync(join(record, "dispatch.started")), "Counted result has no dispatch receipt");
  return {
    id: config.id,
    version: config.version,
    trial: config.trial,
    target: config.target,
    countedReward: reward,
    recordedReward: grade.reward,
    service: grade.evaluation.status,
    checkerPassed: grade.checkerPassed,
    checker: checker
      ? { correct: checker.correct, total: checker.total, falsePositives: checker.falsePositives, missed: checker.missed }
      : null,
    record: relative(root, record),
    completionSha256: hash(join(record, "completion.json")),
    gradeSha256: hash(join(record, "grade.json")),
    verifiedFiles: manifest.files.length,
  };
}

let api;

async function verify() {
  api = await import(pathToFileURL(join(frozenRoot, "dist/index.js")));
  const { state } = reconciledStartState();
  const wanted = nextTrial(state);
  assert.deepEqual(wanted, { trial: 3, provider: "claude" });
  const remaining = [];
  for (const trial of [3, 4, 5, 6]) {
    const slotDir = join(campaign, "slots", TASK, `trial-${trial}`);
    const configPath = join(slotDir, "slot.json");
    const config = read(configPath);
    assert.equal(config.trial, trial);
    assert.equal(config.id, TASK);
    const runRoot = join(root, config.runRoot);
    const readyPath = join(runRoot, "READY.json");
    assert(existsSync(readyPath), `Slot ${trial} is not prepared`);
    const ready = read(readyPath);
    assert.equal(ready.sourceDigest, ready.sourceAuthorityDigest, "Frozen runtime build is stale");
    const dispatched = existsSync(join(runRoot, "DISPATCH-CLAIM"));
    remaining.push({ trial, target: config.target, dispatched, configPath: relative(root, configPath) });
  }
  assert(!remaining[0].dispatched, "Trial 3 slot was already dispatched");
  return {
    verified: true,
    task: TASK,
    reconciledCounted: state.counted,
    reconciledCleanFailures: state.cleanFailures,
    reconciledProviders: state.providers,
    reconciledStopReason: state.stopReason,
    nextTrial: wanted,
    originalProviderAttempts: 2, // trial 1 dispatch + trial 2 dispatch (regraded, not re-dispatched)
    reconciliationPath: relative(root, reconciliationPath),
    slots: remaining,
    continuationDispatched: existsSync(join(continuationRoot, "DISPATCH-CLAIM")),
  };
}

async function run() {
  assert.equal(
    process.argv[3],
    "--user-authorized-verified-installation-continuation",
    "Missing exact continuation authorization",
  );
  const status = await verify();
  assert(!status.continuationDispatched, "Continuation already dispatched; monitor it, do not relaunch");
  assert(process.env.CLAUDE_CODE_OAUTH_TOKEN, "Claude OAuth unavailable in this process env");
  mkdirSync(continuationRoot, { recursive: true });
  closeSync(openSync(join(continuationRoot, "DISPATCH-CLAIM"), "wx", 0o600));
  const emit = (value) => {
    const row = { at: new Date().toISOString(), ...value };
    appendFileSync(join(continuationRoot, "events.jsonl"), JSON.stringify(row) + "\n");
    console.log(JSON.stringify(row));
  };
  emit({ stage: "continuation-started", task: TASK, reconciliation: status.reconciliationPath });

  let { state } = reconciledStartState();
  const evidence = [];
  let attemptsLaunched = 0;
  while (nextTrial(state)) {
    const wanted = nextTrial(state);
    const slotDir = join(campaign, "slots", TASK, `trial-${wanted.trial}`);
    const configPath = join(slotDir, "slot.json");
    const config = read(configPath);
    assert.equal(config.target, wanted.provider, "Slot provider disagrees with policy");
    const runRoot = join(root, config.runRoot);
    assert(!existsSync(join(runRoot, "DISPATCH-CLAIM")), `Trial ${wanted.trial} slot was already dispatched`);
    attemptsLaunched++;
    emit({ stage: "launch", task: TASK, trial: wanted.trial, target: wanted.provider, attemptsLaunched });
    const log = join(continuationRoot, "logs", `trial-${wanted.trial}.log`);
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
    let scored;
    let failure = launchError ? String(launchError) : undefined;
    if (!failure) {
      try {
        const record = join(runRoot, "jobs/real-provider/records", `${TASK}-attempt-1`);
        const ready = read(join(runRoot, "READY.json"));
        scored = score(record, config, ready);
        assert([0, 1].includes(scored.countedReward));
      } catch (error) {
        failure = String(error);
      }
    }
    if (failure !== undefined) {
      state = applyTrialOutcome(state, "unscored");
      const incident = {
        task: TASK,
        trial: wanted.trial,
        target: wanted.provider,
        countedReward: null,
        error: failure,
        automaticRetries: 0,
        state,
      };
      save(join(continuationRoot, "incidents", `trial-${wanted.trial}.json`), incident);
      emit({ stage: "task-stopped-unscored", ...incident });
      break;
    }
    state = applyTrialOutcome(state, scored.countedReward === 1 ? "pass" : "clean-fail");
    evidence.push(scored);
    save(join(continuationRoot, "adjudicated", `trial-${wanted.trial}.json`), { ...scored, state });
    emit({
      stage: "trial-result",
      ...scored,
      counted: state.counted,
      cleanFailures: state.cleanFailures,
      stopReason: state.stopReason,
    });
  }
  const outcome = { ...state, evidence };
  save(join(continuationRoot, "outcome.json"), outcome);
  const final = {
    at: new Date().toISOString(),
    task: TASK,
    reconciliation: status.reconciliationPath,
    originalProviderAttempts: status.originalProviderAttempts,
    continuationAttemptsLaunched: attemptsLaunched,
    outcome,
  };
  save(join(continuationRoot, "FINAL.json"), final);
  emit({ stage: "continuation-finished", task: TASK, stopReason: state.stopReason, counted: state.counted });
  console.log(JSON.stringify(final, null, 2));
}

const direct = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const [mode] = process.argv.slice(2);
  if (mode === "verify") {
    console.log(JSON.stringify(await verify(), null, 2));
  } else if (mode === "run") await run();
  else
    throw Error(
      "Use: run-verified-installation-continuation.mjs verify | run --user-authorized-verified-installation-continuation",
    );
}
