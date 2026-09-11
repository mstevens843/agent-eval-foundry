// Operator-only adaptive controller. Five package loops start together and advance independently.
// A package receives another attempt only after its prior attempt is a clean counted failure.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  applyTrialOutcome,
  campaignPlan,
  initialTaskState,
  nextTrial,
} from "./successor-adaptive-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const preparationPath = join(
  root,
  "reports/screening/evidence/2026-09-11-successor-adaptive-trials-preparation.json",
);
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const save = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
};

async function verify() {
  const preparation = read(preparationPath);
  const expected = campaignPlan();
  for (const key of [
    "schemaVersion",
    "tasks",
    "initialCountedTrialsPerTask",
    "maxCountedTrialsPerTask",
    "maxProviderCalls",
    "maxConcurrent",
    "automaticRetries",
    "schedule",
  ]) {
    assert.deepEqual(preparation[key], expected[key], `Preparation policy changed: ${key}`);
  }
  assert.equal(preparation.slots.length, 30);
  assert.equal(new Set(preparation.slots.map((slot) => `${slot.id}/${slot.trial}`)).size, 30);
  assert.equal(hash(preparationPath), read(join(root, preparation.outputRoot, "READY.json")).preparation.sha256);
  for (const record of [
    preparation.audit,
    preparation.runtime.buildLog,
    preparation.files.parentRunner,
    preparation.files.slotRunner,
    preparation.files.policy,
    ...preparation.packages.map((task) => task.assurance),
    ...preparation.slots.flatMap((slot) => [slot.config, slot.ready]),
  ]) {
    assert.equal(hash(join(root, record.path)), record.sha256, `Prepared file changed: ${record.path}`);
  }
  assert.equal(hash(fileURLToPath(import.meta.url)), preparation.files.parentRunner.sha256);
  assert.equal(
    hash(join(root, preparation.runtime.directory, "dist/index.js")),
    preparation.runtime.bundleSha256,
  );
  for (const file of preparation.runtime.files) {
    assert.equal(
      hash(join(root, preparation.runtime.directory, file.path)),
      file.sha256,
      `Frozen source changed: ${file.path}`,
    );
  }
  for (const slot of preparation.slots) {
    const config = read(join(root, slot.config.path));
    assert.equal(config.id, slot.id);
    assert.equal(config.trial, slot.trial);
    assert.equal(config.target, slot.target);
    execFileSync(
      process.execPath,
      [join(root, preparation.files.slotRunner.path), "verify", slot.config.path],
      { cwd: root, stdio: "pipe", timeout: 60_000 },
    );
  }
  return preparation;
}

function score(api, preparation, task, slot) {
  const record = join(
    root,
    slot.runRoot,
    "jobs/real-provider/records",
    `${task.id}-attempt-1`,
  );
  const completion = read(join(record, "completion.json"));
  const manifest = api.verifyEvidence(record);
  assert(completion.complete);
  assert.equal(completion.identity.packageDigest, task.packageDigest);
  assert.equal(completion.identity.executionSourceDigest, preparation.runtime.sourceDigest);
  const ready = read(join(root, slot.ready.path));
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
  const reward =
    grade.evaluation.status === "semantic-pass" && grade.checkerPassed === true ? 1 : 0;
  assert.equal(grade.reward, reward);
  assert.equal(result.outcome, reward === 1 ? "semantic-pass" : "semantic-fail");
  const checkerSummaryPath = join(record, "grading/checker-grade/grade-summary.json");
  const checker = existsSync(checkerSummaryPath) ? read(checkerSummaryPath) : null;
  return {
    id: task.id,
    version: task.version,
    trial: slot.trial,
    target: slot.target,
    countedReward: reward,
    recordedReward: grade.reward,
    service: grade.evaluation.status,
    checkerPassed: grade.checkerPassed,
    checker: checker
      ? {
          correct: checker.correct,
          total: checker.total,
          falsePositives: checker.falsePositives,
          missed: checker.missed,
        }
      : null,
    record: relative(root, record),
    completionSha256: hash(join(record, "completion.json")),
    gradeSha256: hash(join(record, "grade.json")),
    verifiedFiles: manifest.files.length,
  };
}

async function run() {
  const preparation = await verify();
  const [approval] = process.argv.slice(3);
  assert.equal(
    approval,
    "--user-authorized-successor-adaptive-trials",
    "Missing exact adaptive-campaign authorization",
  );
  const outputRoot = join(root, preparation.outputRoot);
  assert(!existsSync(join(outputRoot, "DISPATCH-CLAIM")), "Campaign was already dispatched");
  assert(!existsSync(join(outputRoot, "FINAL.json")), "Campaign already completed");
  const active = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
    encoding: "utf8",
    timeout: 15_000,
  });
  assert(
    !active.split("\n").some((name) => name.startsWith("foundry-real-")),
    "Another provider campaign is active",
  );
  const machine = JSON.parse(
    execFileSync(
      "docker",
      ["info", "--format", '{"cpus":{{.NCPU}},"memory":{{.MemTotal}}}'],
      { encoding: "utf8", timeout: 15_000 },
    ),
  );
  assert(machine.cpus >= 10 && machine.memory >= 12 * 1024 ** 3, "Five-job envelope unavailable");
  const disk = statfsSync(outputRoot);
  assert(disk.bavail * disk.bsize > 8 * 1024 ** 3, "Eight GiB campaign reserve required");
  assert(process.env.CLAUDE_CODE_OAUTH_TOKEN, "Claude OAuth unavailable in this process env");
  for (const slot of preparation.slots) {
    assert(!existsSync(join(root, slot.runRoot, "DISPATCH-CLAIM")), "A slot is already claimed");
  }
  closeSync(openSync(join(outputRoot, "DISPATCH-CLAIM"), "wx", 0o600));
  const api = await import(
    pathToFileURL(join(root, preparation.runtime.directory, "dist/index.js"))
  );
  const eventPath = join(outputRoot, "events.jsonl");
  let providerCallsMade = 0;
  let inFlight = 0;
  let peakConcurrent = 0;
  const emit = (value) => {
    const row = { at: new Date().toISOString(), ...value };
    appendFileSync(eventPath, JSON.stringify(row) + "\n");
    console.log(JSON.stringify(row));
  };

  async function launch(task, slot) {
    assert(providerCallsMade < preparation.maxProviderCalls, "Provider-call cap reached");
    assert(inFlight < preparation.maxConcurrent, "Concurrency cap reached");
    providerCallsMade++;
    inFlight++;
    peakConcurrent = Math.max(peakConcurrent, inFlight);
    const log = join(outputRoot, "logs", task.id, `trial-${slot.trial}.log`);
    mkdirSync(dirname(log), { recursive: true });
    const fd = openSync(log, "wx", 0o600);
    emit({
      stage: "launch",
      id: task.id,
      trial: slot.trial,
      target: slot.target,
      providerCallsMade,
      inFlight,
    });
    try {
      await new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(
          process.execPath,
          [
            join(root, preparation.files.slotRunner.path),
            "run",
            slot.config.path,
            "--user-authorized-successor-slot",
          ],
          { cwd: root, env: process.env, stdio: ["ignore", fd, fd] },
        );
        save(join(outputRoot, "launches", task.id, `trial-${slot.trial}.json`), {
          id: task.id,
          trial: slot.trial,
          target: slot.target,
          pid: child.pid ?? null,
          at: new Date().toISOString(),
          log: relative(root, log),
        });
        child.once("error", rejectPromise);
        child.once("exit", (code, signal) => {
          if (code === 0) resolvePromise();
          else rejectPromise(Error(`Child exit ${code}, signal ${signal}; inspect ${relative(root, log)}`));
        });
      });
    } finally {
      inFlight--;
      closeSync(fd);
    }
  }

  emit({
    stage: "campaign-started",
    tasks: preparation.tasks.length,
    maxConcurrent: preparation.maxConcurrent,
    maxProviderCalls: preparation.maxProviderCalls,
    schedule: preparation.schedule,
  });
  const outcomes = await Promise.all(
    preparation.packages.map(async (task) => {
      let state = initialTaskState(task.id);
      const evidence = [];
      while (nextTrial(state)) {
        const wanted = nextTrial(state);
        const slot = preparation.slots.find(
          (candidate) => candidate.id === task.id && candidate.trial === wanted.trial,
        );
        assert(slot);
        assert.equal(slot.target, wanted.provider);
        try {
          await launch(task, slot);
          const scored = score(api, preparation, task, slot);
          const outcome = scored.countedReward === 1 ? "pass" : "clean-fail";
          state = applyTrialOutcome(state, outcome);
          evidence.push(scored);
          save(join(outputRoot, "adjudicated", task.id, `trial-${slot.trial}.json`), {
            ...scored,
            state,
          });
          emit({
            stage: "trial-result",
            ...scored,
            counted: state.counted,
            cleanFailures: state.cleanFailures,
            stopReason: state.stopReason,
          });
        } catch (error) {
          state = applyTrialOutcome(state, "unscored");
          const incident = {
            id: task.id,
            trial: slot.trial,
            target: slot.target,
            countedReward: null,
            error: String(error),
            automaticRetries: 0,
            state,
          };
          save(join(outputRoot, "incidents", task.id, `trial-${slot.trial}.json`), incident);
          emit({ stage: "task-stopped-unscored", ...incident });
        }
      }
      const outcome = { ...state, evidence };
      save(join(outputRoot, "outcomes", `${task.id}.json`), outcome);
      emit({
        stage: "task-finished",
        id: task.id,
        counted: state.counted,
        cleanFailures: state.cleanFailures,
        providers: state.providers,
        stopReason: state.stopReason,
      });
      return outcome;
    }),
  );
  const final = {
    at: new Date().toISOString(),
    providerCallsMade,
    peakConcurrent,
    maxConcurrent: preparation.maxConcurrent,
    maxProviderCalls: preparation.maxProviderCalls,
    automaticRetries: 0,
    outcomes,
  };
  save(join(outputRoot, "FINAL.json"), final);
  emit({
    stage: "campaign-finished",
    providerCallsMade,
    peakConcurrent,
    outcomes: outcomes.map(({ id, counted, cleanFailures, providers, stopReason }) => ({
      id,
      counted,
      cleanFailures,
      providers,
      stopReason,
    })),
  });
  if (outcomes.some((outcome) => outcome.stopReason === "infrastructure-or-unresolved-grading")) {
    process.exitCode = 1;
  }
}

const [mode] = process.argv.slice(2);
if (mode === "verify") {
  const preparation = await verify();
  console.log(
    JSON.stringify({
      verified: true,
      tasks: preparation.tasks.length,
      slots: preparation.slots.length,
      maxConcurrent: preparation.maxConcurrent,
      initialSchedule: "3 Claude then 2 Codex per task",
      sixth: "Codex only after five clean failures",
      dispatched: existsSync(join(root, preparation.outputRoot, "DISPATCH-CLAIM")),
      providerCallsMade: 0,
    }),
  );
} else if (mode === "run") await run();
else throw Error("Use: run-successor-adaptive-trials.mjs verify | run --user-authorized-successor-adaptive-trials");
