// Three explicit replacements for grading-void attempts. Preparation makes no provider calls.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync, openSync, closeSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import { hash } from "./grade-post-final-supplement.mjs";
import { gradeRemainingPassSupplement } from "./grade-remaining-pass-supplement.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const here = join(root, ".local/three-replacements-2026-09-09");
const auditPath = "reports/screening/evidence/2026-09-09-three-replacement-disposition.json";
const originalPath = "reports/screening/evidence/2026-09-09-final-six-preparation.json";
const preparationPath = "reports/screening/evidence/2026-09-09-three-replacements-preparation.json";
const policyPath = "data/remaining-pass-grading-controls/policy.json";
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const save = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
};
const recordPath = (slot) =>
  join(root, slot.directory, "real-campaign-frozen/jobs/real-provider/records", `${slot.id}-attempt-1`);

export function makeReplacementPlan(disposition) {
  assert.equal(disposition.gradingRevision, "remaining-pass-coverage-v3");
  const packages = disposition.packages.filter((p) => p.remaining > 0);
  assert.equal(packages.length, 2);
  const slots = disposition.replacementSlots.map((s) => ({
    ...s,
    directory: `.local/three-replacements-2026-09-09/${s.id}/trial-${s.trial}`,
    controller: `.local/three-replacements-2026-09-09/${s.id}/trial-${s.trial}/campaign.mjs`,
    analysis: packages.find((p) => p.id === s.id).analysis,
  }));
  assert.deepEqual(
    slots.map((s) => [s.id, s.trial, s.replacesTrial, s.target]),
    [
      ["variant-cache-repair", 8, 6, "codex"],
      ["variant-cache-repair", 9, 7, "codex"],
      ["snapshot-recovery-repair", 8, 4, "codex"],
    ],
  );
  for (const p of packages) {
    assert.equal(p.scored, p.countedAttempts.length);
    assert.equal(p.failures, p.countedAttempts.filter((a) => a.countedReward === 0).length);
    assert.equal(p.remaining, 6 - p.scored);
    const own = slots.filter((s) => s.id === p.id);
    assert.equal(own.length, p.remaining);
    assert.equal(p.attemptsByProvider.codex + own.length, 3);
    assert.equal(p.attemptsByProvider.claude, 3);
    for (const s of own)
      assert(
        p.voidAttempts.some(
          (a) => a.trial === s.replacesTrial && a.provider === s.target && a.countedReward === null,
        ),
      );
  }
  return {
    schemaVersion: 1,
    gradingRevision: disposition.gradingRevision,
    maxConcurrent: 6,
    plannedConcurrentAttempts: 3,
    maxProviderCalls: 3,
    automaticRetries: false,
    allSlotsStartTogether: true,
    packages,
    slots,
  };
}
function generateControllers(plan) {
  const original = read(join(root, originalPath));
  const templateSlot = original.packages
    .find((p) => p.id === "variant-cache-repair")
    .slots.find((s) => s.trial === 7);
  assert.equal(hash(join(root, templateSlot.controller)), templateSlot.controllerSha256);
  const template = readFileSync(join(root, templateSlot.controller), "utf8");
  return plan.slots.map((slot) => {
    const prior = original.packages.find((p) => p.id === slot.id),
      sourceSlot = prior.slots.find((s) => s.trial === 7);
    const oldEvidence = join(root, sourceSlot.directory, "evidence.json");
    assert.equal(hash(oldEvidence), sourceSlot.evidenceSha256);
    const evidence = read(oldEvidence),
      ev = evidence.packages[0];
    if (slot.id === "snapshot-recovery-repair")
      ev.assignedProfile = { ...ev.previousTrial.profile, digest: ev.previousTrial.profileDigest };
    assert.equal(read(join(root, ev.assignedProfile.path)).target, "codex");
    ev.previousTrial.label = "Trial 4";
    ev.retainedAuditNote =
      "Operator-only: a fresh Codex replacement for grading-void Trial " +
      slot.replacesTrial +
      ". Prior raw evidence is retained; the v3 parent applies cumulative grading.";
    let code = template
      .replaceAll("variant-cache-repair", slot.id)
      .replace("reports/screening/fourth-five/19-" + slot.id + ".md", slot.analysis)
      .replaceAll("Trial 7", "Trial " + slot.trial)
      .replaceAll("trial-7", "trial-" + slot.trial)
      .replaceAll(slot.id + "-7", slot.id + "-" + slot.trial)
      .replace("successorAttemptNumber: 6,", "successorAttemptNumber: " + (slot.trial - 1) + ",")
      .replace(
        /    userAuthority: .*\n/,
        "    userAuthority: " +
          JSON.stringify(
            "User authorized exactly one fresh Codex replacement for " +
              slot.id +
              " Trial " +
              slot.replacesTrial +
              " (grading void). New Trial " +
              slot.trial +
              ". No extra attempts, retries, or API billing fallback.",
          ) +
          ",\n",
      );
    mkdirSync(join(root, slot.directory), { recursive: true });
    writeFileSync(join(root, slot.controller), code, { flag: "wx" });
    save(join(root, slot.directory, "evidence.json"), evidence);
    execFileSync(process.execPath, [join(root, slot.controller), "prepare"], {
      cwd: root,
      encoding: "utf8",
      timeout: 30000,
    });
    const ready = read(join(root, slot.directory, "real-campaign-frozen/READY.json")).packages[0];
    return {
      ...slot,
      controllerSha256: hash(join(root, slot.controller)),
      evidenceSha256: hash(join(root, slot.directory, "evidence.json")),
      templateController: templateSlot.controller,
      templateControllerSha256: templateSlot.controllerSha256,
      packageDigest: ready.packageDigest,
      profileDigest: ready.profileDigest,
      instructionSha256: ready.instructionSha256,
    };
  });
}

function verifySources(plan) {
  assert.equal(hash(join(root, auditPath)), plan.auditSha256);
  assert.equal(hash(join(root, originalPath)), plan.originalPreparationSha256);
  assert.equal(hash(join(root, policyPath)), plan.policySha256);
  assert.equal(hash(join(root, "scripts/grade-remaining-pass-supplement.mjs")), plan.graderSha256);
  assert.equal(hash(fileURLToPath(import.meta.url)), plan.runnerSha256);
  assert.equal(hash(join(root, "scripts/replay-remaining-service-coverage.mjs")), plan.serviceGraderSha256);
  const diagnosis = read(join(root, read(join(root, auditPath)).audit.path));
  assert.equal(hash(join(root, diagnosis.authorityPatch.path)), diagnosis.authorityPatch.sha256);
  const disposition = read(join(root, auditPath));
  assert.equal(hash(join(root, disposition.audit.path)), disposition.audit.sha256);
  let policy = read(join(root, policyPath));
  for (;;) {
    for (const control of policy.controls) assert.equal(hash(join(root, control.fixture)), control.sha256);
    if (!policy.extends) break;
    assert.equal(hash(join(root, policy.extends.path)), policy.extends.sha256);
    policy = read(join(root, policy.extends.path));
  }
  const expected = makeReplacementPlan(disposition);
  for (const key of Object.keys(expected)) if (key !== "slots") assert.deepEqual(plan[key], expected[key]);
  assert.equal(plan.slots.length, expected.slots.length);
  for (let i = 0; i < plan.slots.length; i++)
    for (const key of Object.keys(expected.slots[i]))
      assert.deepEqual(plan.slots[i][key], expected.slots[i][key]);
  for (const slot of plan.slots) {
    assert.equal(hash(join(root, slot.controller)), slot.controllerSha256);
    assert.equal(hash(join(root, slot.directory, "evidence.json")), slot.evidenceSha256);
    // This verifies actual frozen runtime/package/profile bytes with the same
    // one-slot controller used by the successful previous campaign. No prepare.
    execFileSync(process.execPath, [join(root, slot.controller), "verify"], {
      cwd: root,
      encoding: "utf8",
      timeout: 30000,
    });
  }
  return plan;
}

function verifyReady() {
  const plan = verifySources(read(join(root, preparationPath)));
  assert.equal(read(join(here, "READY.json")).preparationSha256, hash(join(root, preparationPath)));
  return plan;
}

function assertUnused(plan) {
  assert(
    !existsSync(join(here, "DISPATCH-CLAIM")),
    "Campaign already claimed; inspect existing records, never relaunch",
  );
  for (const slot of plan.slots) {
    assert(
      !existsSync(join(root, slot.directory, "real-campaign-frozen/DISPATCH-CLAIM")),
      `${slot.id} T${slot.trial} is already claimed`,
    );
    assert(!existsSync(recordPath(slot)), `${slot.id} T${slot.trial} already has a record`);
  }
}

async function child(slot) {
  const log = join(here, "logs", `${slot.id}-trial-${slot.trial}.log`);
  mkdirSync(dirname(log), { recursive: true });
  const fd = openSync(log, "wx", 0o600);
  const launchedAt = new Date().toISOString();
  try {
    await new Promise((ok, no) => {
      const process = spawn(
        globalThis.process.execPath,
        [join(root, slot.controller), "run", "--user-authorized-final-six-slot"],
        {
          cwd: root,
          env: globalThis.process.env,
          stdio: ["ignore", fd, fd],
        },
      );
      save(join(here, "launches", `${slot.id}-trial-${slot.trial}.json`), {
        id: slot.id,
        trial: slot.trial,
        target: slot.target,
        pid: process.pid ?? null,
        launchedAt,
      });
      console.log(
        JSON.stringify({ stage: "launch", id: slot.id, trial: slot.trial, target: slot.target, launchedAt }),
      );
      process.once("error", no);
      process.once("exit", (code, signal) =>
        code === 0 ? ok() : no(Error(`Child exit ${code}, signal ${signal}; inspect ${log}`)),
      );
    });
  } finally {
    closeSync(fd);
  }
}

async function adjudicate(plan, slot) {
  const record = recordPath(slot);
  const completion = read(join(record, "completion.json"));
  const grade = read(join(record, "grade.json")),
    result = read(join(record, "result.json"));
  assert.equal(completion.complete, true);
  assert(["semantic-pass", "semantic-fail"].includes(result.outcome), "Infrastructure is unscored");
  assert.equal(completion.identity.packageDigest, slot.packageDigest);
  assert.equal(completion.identity.profileDigest, slot.profileDigest);
  let bytes = 0;
  for (const file of completion.files) {
    const path = resolve(record, file.path);
    assert(path.startsWith(resolve(record) + "/"));
    assert.equal(readFileSync(path).length, file.size);
    assert.equal(hash(path), file.sha256);
    bytes += file.size;
  }
  assert([0, 1].includes(grade.reward));
  const supplement = gradeRemainingPassSupplement({
    id: slot.id,
    submission: join(record, "submission"),
    output: join(here, "supplements", `${slot.id}-trial-${slot.trial}`),
  });
  assert.equal(supplement.policySha256, plan.policySha256);
  const { replayRemainingServiceCoverage } = await import("./replay-remaining-service-coverage.mjs");
  const serviceSupplement = await replayRemainingServiceCoverage({
    id: slot.id,
    submission: join(record, "submission"),
    output: join(here, "service-supplements", `${slot.id}-trial-${slot.trial}`),
  });
  const row = {
    id: slot.id,
    trial: slot.trial,
    target: slot.target,
    packageDigest: slot.packageDigest,
    profileDigest: slot.profileDigest,
    recordedReward: grade.reward,
    effectiveReward: Math.min(grade.reward, supplement.pass && serviceSupplement.pass ? 1 : 0),
    gradingRevision: plan.gradingRevision,
    supplement,
    serviceSupplement,
    replacesTrial: slot.replacesTrial,
    completionSha256: hash(join(record, "completion.json")),
    gradeSha256: hash(join(record, "grade.json")),
    resultSha256: hash(join(record, "result.json")),
    manifestFilesVerified: completion.files.length,
    manifestBytesVerified: bytes,
  };
  save(join(here, "adjudicated", `${slot.id}-trial-${slot.trial}.json`), row);
  console.log(
    JSON.stringify({
      stage: "scored",
      id: row.id,
      trial: row.trial,
      recordedReward: row.recordedReward,
      effectiveReward: row.effectiveReward,
    }),
  );
  return row;
}

async function run() {
  const plan = verifyReady();
  assertUnused(plan);
  const active = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
    encoding: "utf8",
    timeout: 15000,
  });
  assert(
    !active.split("\n").some((name) => name.startsWith("foundry-real-")),
    "Another provider campaign is running",
  );
  const resources = JSON.parse(
    execFileSync("docker", ["info", "--format", '{"cpus":{{.NCPU}},"memory":{{.MemTotal}}}'], {
      encoding: "utf8",
      timeout: 15000,
    }),
  );
  assert(
    resources.cpus >= 6 && resources.memory >= 6 * 1024 ** 3,
    "Three unchanged 2-CPU/2-GiB profiles need the corresponding Docker capacity",
  );
  closeSync(openSync(join(here, "DISPATCH-CLAIM"), "wx", 0o600));
  save(join(here, "STARTED.json"), {
    at: new Date().toISOString(),
    maxConcurrent: 6,
    attempts: 3,
    resources,
    automaticRetries: false,
    userAuthority:
      "User requested three same-provider replacements for the three newly voided false passes; all three start together, cap six.",
  });
  // Three independent replacement workspaces; all start before outcomes are known.
  const completed = await Promise.allSettled(plan.slots.map(child));
  const rows = [],
    errors = [];
  // Supplemental grading starts after the provider children exit, avoiding an
  // additional grader container competing with the three authoring containers.
  for (const [i, completion] of completed.entries()) {
    const slot = plan.slots[i];
    try {
      if (completion.status === "rejected") throw completion.reason;
      rows.push(await adjudicate(plan, slot));
    } catch (error) {
      const issue = {
        id: slot.id,
        trial: slot.trial,
        error: String(error),
        scored: false,
        automaticRetries: 0,
      };
      errors.push(issue);
      save(join(here, "errors", `${slot.id}-trial-${slot.trial}.json`), issue);
    }
  }
  const outcomes = plan.packages.map((previous) => {
    const attempts = rows.filter((row) => row.id === previous.id).sort((a, b) => a.trial - b.trial);
    const providerCounts = { ...previous.attemptsByProvider };
    for (const attempt of attempts) providerCounts[attempt.target]++;
    const failures = previous.failures + attempts.filter((row) => row.effectiveReward === 0).length;
    const scored = previous.scored + attempts.length;
    const classification =
      scored !== 6 ? "unresolved-infrastructure" : failures >= 5 ? "meets-5-of-6" : "below-5-of-6";
    if (scored === 6) assert.deepEqual(providerCounts, { claude: 3, codex: 3 });
    return {
      id: previous.id,
      failures,
      scored,
      providerCounts,
      classification,
      previousCountedAttempts: previous.countedAttempts,
      voidAttempts: previous.voidAttempts,
      attempts,
    };
  });
  save(join(here, "FINAL.json"), {
    complete: errors.length === 0,
    gradingRevision: plan.gradingRevision,
    maxConcurrent: 6,
    plannedAttempts: 3,
    automaticRetries: 0,
    outcomes,
    errors,
  });
  console.log(JSON.stringify({ stage: "complete", complete: errors.length === 0, outcomes, errors }));
  if (errors.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, approval] = process.argv.slice(2);
  if (mode === "prepare") {
    const plan = {
      ...makeReplacementPlan(read(join(root, auditPath))),
      providerCallsMadeByPreparation: 0,
      auditSha256: hash(join(root, auditPath)),
      originalPreparationSha256: hash(join(root, originalPath)),
      policySha256: hash(join(root, policyPath)),
      graderSha256: hash(join(root, "scripts/grade-remaining-pass-supplement.mjs")),
      serviceGraderSha256: hash(join(root, "scripts/replay-remaining-service-coverage.mjs")),
      runnerSha256: hash(fileURLToPath(import.meta.url)),
    };
    plan.slots = generateControllers(plan);
    verifySources(plan);
    assertUnused(plan);
    save(join(root, preparationPath), plan);
    save(join(here, "READY.json"), {
      preparationSha256: hash(join(root, preparationPath)),
      providerCallsMade: 0,
    });
    console.log(JSON.stringify({ stage: "prepared", maxConcurrent: 6, attempts: 3, providerCallsMade: 0 }));
  } else if (mode === "verify") {
    const plan = verifyReady();
    assertUnused(plan);
    console.log(
      JSON.stringify({
        stage: "ready",
        maxConcurrent: plan.maxConcurrent,
        plannedConcurrentAttempts: plan.plannedConcurrentAttempts,
        providerCallsMade: 0,
        slots: plan.slots.map(({ id, trial, target }) => ({ id, trial, target })),
      }),
    );
  } else if (mode === "run") {
    assert.equal(approval, "--user-authorized-three-replacements-up-to-six-concurrent");
    await run();
  } else
    throw Error(
      "Usage: node scripts/run-three-replacements.mjs prepare | verify | run --user-authorized-three-replacements-up-to-six-concurrent",
    );
}
