// Reviewed controller over the original immutable preparation and single-slot runner.
// Verification replays the campaign ledger and checks the retained grading evidence.
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
  readdirSync,
  readlinkSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { executeCampaign, replayCampaignEvents } from "./successor-campaign-control.mjs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyTrialOutcome, campaignPlan, initialTaskState } from "./successor-adaptive-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const preparationPath = join(
  root,
  "reports/screening/evidence/2026-09-11-successor-adaptive-trials-preparation.json",
);
const reviewPath = join(root, "reports/screening/evidence/2026-09-11-successor-adaptive-trials-review.json");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const save = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
};

function treeDigest(directory) {
  const records = [];
  function walk(path) {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name, "en"),
    )) {
      const file = join(path, entry.name);
      const name = relative(directory, file);
      if (entry.isDirectory()) walk(file);
      else if (entry.isSymbolicLink()) records.push([name, "link", readlinkSync(file)]);
      else {
        assert(entry.isFile(), `Unexpected runtime file: ${file}`);
        records.push([name, "file", hash(file)]);
      }
    }
  }
  walk(directory);
  return {
    entries: records.length,
    sha256: createHash("sha256").update(JSON.stringify(records)).digest("hex"),
  };
}

async function verify({ reviewRequired = true } = {}) {
  const preparation = read(preparationPath);
  if (reviewRequired) {
    const review = read(reviewPath);
    assert.equal(hash(preparationPath), review.preparation.sha256);
    for (const file of review.files)
      assert.equal(hash(join(root, file.path)), file.sha256, `Reviewed file changed: ${file.path}`);
    assert(
      review.files.some((file) => resolve(root, file.path) === fileURLToPath(import.meta.url)),
      "Reviewed controller is not pinned",
    );
    for (const tree of review.runtimeTrees)
      assert.deepEqual(
        treeDigest(join(root, tree.path)),
        { entries: tree.entries, sha256: tree.sha256 },
        `Frozen runtime tree changed: ${tree.path}`,
      );
  }
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
  assert.equal(
    hash(preparationPath),
    read(join(root, preparation.outputRoot, "READY.json")).preparation.sha256,
  );
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
    const task = preparation.packages.find((task) => task.id === slot.id);
    assert(task, "Unexpected slot package");
    assert.equal(slot.target, expected.schedule[slot.trial - 1]?.provider);
    const config = read(join(root, slot.config.path));
    assert.equal(config.id, slot.id);
    assert.equal(config.trial, slot.trial);
    assert.equal(config.target, slot.target);
    assert.equal(config.version, task.version);
    assert.equal(config.packageDigest, task.packageDigest);
    assert.equal(config.packageDirectory, task.packageDirectory);
    assert.equal(config.runRoot, slot.runRoot);
    assert.equal(config.frozenRoot, preparation.runtime.directory);
    execFileSync(
      process.execPath,
      [join(root, preparation.files.slotRunner.path), "verify", slot.config.path],
      { cwd: root, stdio: "pipe", timeout: 60_000 },
    );
  }
  const audit = read(join(root, preparation.audit.path));
  assert.deepEqual(
    preparation.packages.map(({ id, version }) => ({ id, version })),
    expected.tasks.map(({ id, version }) => ({ id, version })),
  );
  for (const task of audit.packages) {
    for (const file of task.sourceFiles) {
      const path = join("tasks", task.id, file.path);
      assert.equal(
        hash(join(root, preparation.runtime.directory, path)),
        file.sha256,
        `Audited source changed: ${path}`,
      );
    }
  }
  return preparation;
}

function score(api, preparation, task, slot) {
  const record = join(root, slot.runRoot, "jobs/real-provider/records", `${task.id}-attempt-1`);
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
  const reward = grade.evaluation.status === "semantic-pass" && grade.checkerPassed === true ? 1 : 0;
  assert.equal(grade.reward, reward);
  assert.equal(result.outcome, reward === 1 ? "semantic-pass" : "semantic-fail");
  const checkerSummaryPath = join(record, "grading/checker-grade/grade-summary.json");
  const checker = existsSync(checkerSummaryPath) ? read(checkerSummaryPath) : null;
  if (grade.checkerPassed) assert(checker, "Passing checker has no protected grading summary");
  if (checker) assert.equal(checker.pass, grade.checkerPassed, "Checker summary contradicts grade");
  assert(existsSync(join(record, "dispatch.started")), "Counted result has no dispatch receipt");
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

function jsonLines(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  assert(!text || text.endsWith("\n"), `Incomplete event write: ${path}`);
  return text.trim()
    ? text
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line))
    : [];
}

function recordPaths(slot, workspace = root) {
  const jobs = join(workspace, slot.runRoot, "jobs/real-provider");
  return [join(jobs, "records", `${slot.id}-attempt-1`), join(jobs, ".incomplete", `${slot.id}-attempt-1`)];
}

export async function inspectCampaign(preparation, { workspace = root, scoreEvidence = score } = {}) {
  const output = join(workspace, preparation.outputRoot);
  const dispatched = existsSync(join(output, "DISPATCH-CLAIM"));
  const events = jsonLines(join(output, "events.jsonl"));
  const replay = replayCampaignEvents(preparation, events);
  const launched = events.filter((event) => event.stage === "launch");
  let providerCallsMade = 0;
  for (const slot of preparation.slots) {
    const launches = launched.filter((event) => event.id === slot.id && event.trial === slot.trial);
    assert(launches.length <= 1, "Duplicate slot launch");
    const claimed = existsSync(join(workspace, slot.runRoot, "DISPATCH-CLAIM"));
    const receipts = recordPaths(slot, workspace).filter((path) =>
      existsSync(join(path, "dispatch.started")),
    );
    assert(receipts.length <= 1, "Duplicate dispatch receipt");
    if (claimed || receipts.length) assert(dispatched && launches.length === 1, "Orphan slot dispatch");
    if (receipts.length) {
      assert(claimed, "Dispatch without a slot claim");
      providerCallsMade++;
    }
    if (launches.length) {
      assert(dispatched, "Launch without campaign claim");
      const launchPath = join(output, "launches", slot.id, `trial-${slot.trial}.json`);
      if (existsSync(launchPath)) {
        const receipt = read(launchPath);
        for (const key of ["id", "trial", "target"]) assert.equal(receipt[key], slot[key]);
      }
    }
  }
  const api = await import(pathToFileURL(join(workspace, preparation.runtime.directory, "dist/index.js")));
  const evidence = new Map(preparation.packages.map(({ id }) => [id, []]));
  for (const event of events) {
    if (!["trial-result", "task-stopped-unscored"].includes(event.stage)) continue;
    const task = preparation.packages.find((task) => task.id === event.id);
    const slot = preparation.slots.find((slot) => slot.id === event.id && slot.trial === event.trial);
    if (event.stage === "trial-result") {
      const scored = scoreEvidence(api, preparation, task, slot);
      const stored = read(join(output, "adjudicated", task.id, `trial-${slot.trial}.json`));
      for (const [key, value] of Object.entries(scored)) {
        assert.deepEqual(event[key], value, `Event disagrees with protected grade: ${key}`);
        assert.deepEqual(stored[key], value, `Adjudication disagrees with protected grade: ${key}`);
      }
      const prior = evidence.get(task.id);
      let state = initialTaskState(task.id);
      for (const item of [...prior, scored])
        state = applyTrialOutcome(state, item.countedReward === 1 ? "pass" : "clean-fail");
      assert.deepEqual(stored.state, state);
      prior.push(scored);
    } else {
      const stored = read(join(output, "incidents", task.id, `trial-${slot.trial}.json`));
      const { at, stage, ...incident } = event;
      assert.deepEqual(stored, incident);
    }
  }
  const outcomes = [];
  for (const state of replay.states) {
    const finished = events.some((event) => event.stage === "task-finished" && event.id === state.id);
    if (finished) {
      const outcome = read(join(output, "outcomes", `${state.id}.json`));
      assert.deepEqual(outcome, { ...state, evidence: evidence.get(state.id) });
      outcomes.push(outcome);
    }
  }
  const finalPath = join(output, "FINAL.json");
  const complete = existsSync(finalPath);
  if (complete) {
    assert.equal(replay.finished, preparation.packages.length);
    assert.equal(replay.active, 0);
    const final = read(finalPath);
    for (const [key, value] of Object.entries({
      attemptsLaunched: replay.attemptsLaunched,
      providerCallsMade,
      peakConcurrent: replay.peakConcurrent,
      maxConcurrent: preparation.maxConcurrent,
      maxProviderCalls: preparation.maxProviderCalls,
      automaticRetries: 0,
      outcomes,
    })) {
      assert.deepEqual(final[key], value, `Final campaign summary disagrees with evidence: ${key}`);
    }
    if (replay.ended) assert.equal(events.at(-1).providerCallsMade, providerCallsMade);
  } else assert(!replay.ended, "Campaign finish has no FINAL.json");
  if (!dispatched) assert.equal(events.length, 0, "Undispatched campaign has execution events");
  return {
    verified: true,
    tasks: preparation.packages.length,
    slots: preparation.slots.length,
    maxConcurrent: preparation.maxConcurrent,
    dispatched,
    complete,
    status: complete ? "complete" : dispatched ? "in-progress-or-interrupted" : "ready",
    attemptsLaunched: replay.attemptsLaunched,
    providerCallsMade,
    peakConcurrent: replay.peakConcurrent,
    activeUnadjudicated: replay.active,
    finishedTasks: replay.finished,
  };
}

function preflight(preparation) {
  const active = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
    encoding: "utf8",
    timeout: 15_000,
  });
  assert(
    !active.split("\n").some((name) => name.startsWith("foundry-real-")),
    "Another provider campaign is active",
  );
  const machine = JSON.parse(
    execFileSync("docker", ["info", "--format", '{"cpus":{{.NCPU}},"memory":{{.MemTotal}}}'], {
      encoding: "utf8",
      timeout: 15_000,
    }),
  );
  assert(machine.cpus >= 10 && machine.memory >= 12 * 1024 ** 3, "Five-job envelope unavailable");
  const disk = statfsSync(join(root, preparation.outputRoot));
  assert(disk.bavail * disk.bsize > 8 * 1024 ** 3, "Eight GiB campaign reserve required");
  assert(process.env.CLAUDE_CODE_OAUTH_TOKEN, "Claude OAuth unavailable in this process env");
  const authPath = join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "auth.json");
  const auth = read(authPath);
  assert(
    auth.auth_mode === "chatgpt" && !auth.OPENAI_API_KEY && auth.tokens?.access_token,
    "Codex subscription credential unavailable",
  );
  const images = new Set(
    preparation.slots.map((slot) => read(join(root, slot.ready.path)).package.profile.authoring.image),
  );
  for (const image of images)
    execFileSync("docker", ["image", "inspect", image], { stdio: "pipe", timeout: 15_000 });
  return {
    preflight: true,
    credentialPresenceChecked: true,
    authenticationNetworkTested: false,
    cpus: machine.cpus,
    memoryBytes: machine.memory,
    availableDiskBytes: disk.bavail * disk.bsize,
    providerCallsMade: 0,
  };
}

async function run() {
  assert.equal(
    process.argv[3],
    "--user-authorized-successor-adaptive-trials",
    "Missing exact adaptive-campaign authorization",
  );
  const preparation = await verify();
  const status = await inspectCampaign(preparation);
  assert(!status.dispatched && !status.complete, "Campaign already dispatched; monitor it, do not relaunch");
  preflight(preparation);
  const outputRoot = join(root, preparation.outputRoot);
  closeSync(openSync(join(outputRoot, "DISPATCH-CLAIM"), "wx", 0o600));
  const api = await import(pathToFileURL(join(root, preparation.runtime.directory, "dist/index.js")));
  const emit = (value) => {
    const row = { at: new Date().toISOString(), ...value };
    appendFileSync(join(outputRoot, "events.jsonl"), JSON.stringify(row) + "\n");
    console.log(JSON.stringify(row));
  };
  try {
    const final = await executeCampaign(preparation, {
      emit,
      save: (path, value) => save(join(outputRoot, path), value),
      score: (task, slot) => score(api, preparation, task, slot),
      launch: async (task, slot) => {
        const log = join(outputRoot, "logs", task.id, `trial-${slot.trial}.log`);
        mkdirSync(dirname(log), { recursive: true });
        const fd = openSync(log, "wx", 0o600);
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
            let receiptError;
            child.once("error", rejectPromise);
            child.once("exit", (code, signal) => {
              if (receiptError) rejectPromise(receiptError);
              else if (code === 0) resolvePromise();
              else
                rejectPromise(Error(`Child exit ${code}, signal ${signal}; inspect ${relative(root, log)}`));
            });
            try {
              save(join(outputRoot, "launches", task.id, `trial-${slot.trial}.json`), {
                id: task.id,
                trial: slot.trial,
                target: slot.target,
                pid: child.pid ?? null,
                at: new Date().toISOString(),
                log: relative(root, log),
              });
            } catch (error) {
              // The child may already be live. Wait for its exit before stopping this package.
              receiptError = error;
            }
          });
        } finally {
          closeSync(fd);
        }
      },
    });
    const status = await inspectCampaign(preparation);
    save(join(outputRoot, "FINAL.json"), {
      at: new Date().toISOString(),
      ...final,
      providerCallsMade: status.providerCallsMade,
    });
    emit({
      stage: "campaign-finished",
      attemptsLaunched: final.attemptsLaunched,
      providerCallsMade: status.providerCallsMade,
      peakConcurrent: final.peakConcurrent,
    });
    console.log(JSON.stringify(await inspectCampaign(preparation)));
    if (final.outcomes.some((outcome) => outcome.stopReason === "infrastructure-or-unresolved-grading"))
      process.exitCode = 1;
  } catch (error) {
    save(join(outputRoot, "CONTROLLER-ERROR.json"), {
      at: new Date().toISOString(),
      error: String(error),
      causes: error instanceof AggregateError ? error.errors.map(String) : [],
      automaticRetries: 0,
    });
    throw error;
  }
}

const direct = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const [mode] = process.argv.slice(2);
  if (mode === "prepare-review") {
    assert(!existsSync(reviewPath), "Review already sealed; verify it");
    const preparation = await verify({ reviewRequired: false });
    const status = await inspectCampaign(preparation);
    assert(
      !status.dispatched && status.providerCallsMade === 0 && status.attemptsLaunched === 0,
      "Cannot change a dispatched campaign",
    );
    const files = [
      "scripts/run-successor-adaptive-trials-reviewed.mjs",
      "scripts/successor-campaign-control.mjs",
      "scripts/successor-campaign-control.d.mts",
      "test/successor-adaptive-controller.test.ts",
      "test/successor-adaptive-policy.test.ts",
      "test/successor-adaptive-evidence.test.ts",
      "scripts/run-successor-adaptive-trials-reviewed.d.mts",
    ];
    save(reviewPath, {
      schemaVersion: 1,
      at: new Date().toISOString(),
      preparation: { path: relative(root, preparationPath), sha256: hash(preparationPath) },
      purpose:
        "Reviewed scheduler, evidence-backed completion verification and credential preflight over unchanged prepared task bytes, profiles and READY files",
      files: files.map((path) => ({ path, sha256: hash(join(root, path)) })),
      runtimeTrees: ["dist", "node_modules"].map((path) => {
        const directory = join(preparation.runtime.directory, path);
        return { path: directory, ...treeDigest(join(root, directory)) };
      }),
      providerCallsMade: 0,
    });
    console.log(JSON.stringify(await inspectCampaign(await verify())));
  } else if (mode === "verify" || mode === "preflight") {
    const preparation = await verify();
    console.log(JSON.stringify(await inspectCampaign(preparation)));
    if (mode === "preflight") console.log(JSON.stringify(preflight(preparation)));
  } else if (mode === "run") await run();
  else
    throw Error(
      "Use: run-successor-adaptive-trials-reviewed.mjs prepare-review | verify | preflight | run --user-authorized-successor-adaptive-trials",
    );
}
