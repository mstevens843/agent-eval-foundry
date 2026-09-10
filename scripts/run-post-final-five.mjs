// Operator-only continuation over five unused, already-frozen child controllers.
// All five attempts start together; all four packages use cumulative v2 grading.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, openSync, closeSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { gradePostFinalSupplement, hash } from './grade-post-final-supplement.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const here = join(root, '.local/post-final-five-2026-09-09');
const auditPath = 'reports/screening/evidence/2026-09-09-post-final-pass-audit.json';
const originalPath = 'reports/screening/evidence/2026-09-09-final-six-preparation.json';
const preparationPath = 'reports/screening/evidence/2026-09-09-post-final-five-preparation.json';
const policyPath = 'data/post-final-grading-controls/policy.json';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
};
const recordPath = slot => join(root, slot.directory, 'real-campaign-frozen/jobs/real-provider/records', `${slot.id}-attempt-1`);

export function makePostFinalPlan(audit, original) {
  assert.equal(audit.gradingRevision, 'post-final-coverage-v2');
  const packages = audit.classifications.filter(p => p.classification === 'reopened');
  assert.deepEqual(packages.map(p => p.id).sort(), [
    'variant-cache-repair', 'issued-report-repair', 'temporal-capacity-repair', 'snapshot-recovery-repair',
  ].sort());
  const slots = packages.flatMap(current => {
    const prior = original.packages.find(p => p.id === current.id);
    assert(prior);
    const target = current.id === 'snapshot-recovery-repair' ? 'claude' : 'codex';
    assert.equal(prior.target, target);
    assert.equal(current.scored, current.effectiveHistory.length);
    assert.equal(current.failures, current.effectiveHistory.filter(r => r === 0).length);
    assert.equal(current.remaining, 6 - current.scored);
    assert.equal(current.attemptsByProvider[target] + current.remaining, 3);
    assert.equal(current.attemptsByProvider[target === 'claude' ? 'codex' : 'claude'], 3);
    return Array.from({ length: current.remaining }, (_, i) => {
      const trial = current.scored + 2 + i;
      const slot = prior.slots.find(s => s.trial === trial);
      assert(slot, 'No frozen controller for an unrun slot');
      return { ...slot, id: current.id, target, analysis: current.analysis,
        packageDigest: prior.packageDigest, profileDigest: prior.profileDigest,
        instructionSha256: prior.instructionSha256 };
    });
  });
  assert.equal(slots.length, 5);
  assert.equal(new Set(slots.map(s => `${s.id}:${s.trial}`)).size, 5);
  assert.equal(slots.filter(s => s.target === 'codex').length, 3);
  assert.equal(slots.filter(s => s.target === 'claude').length, 2);
  return { schemaVersion: 1, gradingRevision: audit.gradingRevision,
    maxConcurrent: 6, plannedConcurrentAttempts: 5, maxProviderCalls: 5,
    automaticRetries: false, allSlotsStartTogether: true,
    snapshotTrialsIndependentAndUnconditional: true, packages, slots };
}

function verifySources(plan) {
  assert.equal(hash(join(root, auditPath)), plan.auditSha256);
  assert.equal(hash(join(root, originalPath)), plan.originalPreparationSha256);
  assert.equal(hash(join(root, policyPath)), plan.policySha256);
  assert.equal(hash(join(root, 'scripts/grade-post-final-supplement.mjs')), plan.graderSha256);
  assert.equal(hash(fileURLToPath(import.meta.url)), plan.runnerSha256);
  const policy = read(join(root, policyPath));
  assert.equal(hash(join(root, policy.extends.path)), policy.extends.sha256);
  for (const control of [...read(join(root, policy.extends.path)).controls, ...policy.controls])
    assert.equal(hash(join(root, control.fixture)), control.sha256);
  const expected = makePostFinalPlan(read(join(root, auditPath)), read(join(root, originalPath)));
  for (const key of Object.keys(expected)) assert.deepEqual(plan[key], expected[key]);
  for (const slot of plan.slots) {
    assert.equal(hash(join(root, slot.controller)), slot.controllerSha256);
    assert.equal(hash(join(root, slot.directory, 'evidence.json')), slot.evidenceSha256);
    // This verifies actual frozen runtime/package/profile bytes with the same
    // one-slot controller used by the successful previous campaign. No prepare.
    execFileSync(process.execPath, [join(root, slot.controller), 'verify'], {
      cwd: root, encoding: 'utf8', timeout: 30000,
    });
  }
  return plan;
}

function verifyReady() {
  const plan = verifySources(read(join(root, preparationPath)));
  assert.equal(read(join(here, 'READY.json')).preparationSha256, hash(join(root, preparationPath)));
  return plan;
}

function assertUnused(plan) {
  assert(!existsSync(join(here, 'DISPATCH-CLAIM')), 'Campaign already claimed; inspect existing records, never relaunch');
  for (const slot of plan.slots) {
    assert(!existsSync(join(root, slot.directory, 'real-campaign-frozen/DISPATCH-CLAIM')), `${slot.id} T${slot.trial} is already claimed`);
    assert(!existsSync(recordPath(slot)), `${slot.id} T${slot.trial} already has a record`);
  }
}

async function child(slot) {
  const log = join(here, 'logs', `${slot.id}-trial-${slot.trial}.log`);
  mkdirSync(dirname(log), { recursive: true });
  const fd = openSync(log, 'wx', 0o600);
  const launchedAt = new Date().toISOString();
  try {
    await new Promise((ok, no) => {
      const process = spawn(globalThis.process.execPath, [join(root, slot.controller), 'run', '--user-authorized-final-six-slot'], {
        cwd: root, env: globalThis.process.env, stdio: ['ignore', fd, fd],
      });
      save(join(here, 'launches', `${slot.id}-trial-${slot.trial}.json`), {
        id: slot.id, trial: slot.trial, target: slot.target, pid: process.pid ?? null, launchedAt,
      });
      console.log(JSON.stringify({ stage: 'launch', id: slot.id, trial: slot.trial, target: slot.target, launchedAt }));
      process.once('error', no);
      process.once('exit', (code, signal) => code === 0 ? ok() : no(Error(`Child exit ${code}, signal ${signal}; inspect ${log}`)));
    });
  } finally { closeSync(fd); }
}

function adjudicate(plan, slot) {
  const record = recordPath(slot);
  const completion = read(join(record, 'completion.json'));
  const grade = read(join(record, 'grade.json')), result = read(join(record, 'result.json'));
  assert.equal(completion.complete, true);
  assert(['semantic-pass', 'semantic-fail'].includes(result.outcome), 'Infrastructure is unscored');
  assert.equal(completion.identity.packageDigest, slot.packageDigest);
  assert.equal(completion.identity.profileDigest, slot.profileDigest);
  let bytes = 0;
  for (const file of completion.files) {
    const path = resolve(record, file.path);
    assert(path.startsWith(resolve(record) + '/'));
    assert.equal(readFileSync(path).length, file.size);
    assert.equal(hash(path), file.sha256);
    bytes += file.size;
  }
  assert([0, 1].includes(grade.reward));
  const supplement = gradePostFinalSupplement({ id: slot.id, submission: join(record, 'submission'),
    output: join(here, 'supplements', `${slot.id}-trial-${slot.trial}`) });
  assert.equal(supplement.policySha256, plan.policySha256);
  const row = { id: slot.id, trial: slot.trial, target: slot.target,
    packageDigest: slot.packageDigest, profileDigest: slot.profileDigest,
    recordedReward: grade.reward, effectiveReward: Math.min(grade.reward, supplement.pass ? 1 : 0),
    gradingRevision: plan.gradingRevision, supplement,
    completionSha256: hash(join(record, 'completion.json')), gradeSha256: hash(join(record, 'grade.json')),
    resultSha256: hash(join(record, 'result.json')),
    manifestFilesVerified: completion.files.length, manifestBytesVerified: bytes };
  save(join(here, 'adjudicated', `${slot.id}-trial-${slot.trial}.json`), row);
  console.log(JSON.stringify({ stage: 'scored', id: row.id, trial: row.trial,
    recordedReward: row.recordedReward, effectiveReward: row.effectiveReward }));
  return row;
}

async function run() {
  const plan = verifyReady();
  assertUnused(plan);
  assert(process.env.CLAUDE_CODE_OAUTH_TOKEN, 'Use the existing inherited Claude token from the normal login setup');
  const active = execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8', timeout: 15000 });
  assert(!active.split('\n').some(name => name.startsWith('foundry-real-')), 'Another provider campaign is running');
  const resources = JSON.parse(execFileSync('docker', ['info', '--format', '{"cpus":{{.NCPU}},"memory":{{.MemTotal}}}'], { encoding: 'utf8', timeout: 15000 }));
  assert(resources.cpus >= 10 && resources.memory >= 10 * 1024 ** 3, 'Five unchanged 2-CPU/2-GiB profiles need the corresponding Docker capacity');
  closeSync(openSync(join(here, 'DISPATCH-CLAIM'), 'wx', 0o600));
  save(join(here, 'STARTED.json'), { at: new Date().toISOString(), maxConcurrent: 6,
    attempts: 5, resources, automaticRetries: false,
    userAuthority: 'User requested finishing the remaining slots with concurrency up to six; all five independent attempts, including both snapshot trials, start together.' });
  // Independent children have separate JobStores/workspaces. Both snapshot slots
  // are dispatched before either result is known; no adaptive cancellation.
  const completed = await Promise.allSettled(plan.slots.map(child));
  const rows = [], errors = [];
  // Supplemental grading starts after the provider children exit, avoiding an
  // additional grader container competing with the five authoring containers.
  for (const [i, completion] of completed.entries()) {
    const slot = plan.slots[i];
    try {
      if (completion.status === 'rejected') throw completion.reason;
      rows.push(adjudicate(plan, slot));
    } catch (error) {
      const issue = { id: slot.id, trial: slot.trial, error: String(error), scored: false, automaticRetries: 0 };
      errors.push(issue);
      save(join(here, 'errors', `${slot.id}-trial-${slot.trial}.json`), issue);
    }
  }
  const outcomes = plan.packages.map(previous => {
    const attempts = rows.filter(row => row.id === previous.id).sort((a, b) => a.trial - b.trial);
    const providerCounts = { ...previous.attemptsByProvider };
    for (const attempt of attempts) providerCounts[attempt.target]++;
    const failures = previous.failures + attempts.filter(row => row.effectiveReward === 0).length;
    const scored = previous.scored + attempts.length;
    const classification = scored !== 6 ? 'unresolved-infrastructure'
      : failures >= 5 ? 'meets-5-of-6' : 'below-5-of-6';
    if (scored === 6) assert.deepEqual(providerCounts, { claude: 3, codex: 3 });
    return { id: previous.id, failures, scored, providerCounts, classification,
      previousEffectiveHistory: previous.effectiveHistory, attempts };
  });
  save(join(here, 'FINAL.json'), { complete: errors.length === 0,
    gradingRevision: plan.gradingRevision, maxConcurrent: 6, plannedAttempts: 5,
    automaticRetries: 0, outcomes, errors });
  console.log(JSON.stringify({ stage: 'complete', complete: errors.length === 0, outcomes, errors }));
  if (errors.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, approval] = process.argv.slice(2);
  if (mode === 'prepare') {
    const plan = { ...makePostFinalPlan(read(join(root, auditPath)), read(join(root, originalPath))),
      providerCallsMadeByPreparation: 0,
      auditSha256: hash(join(root, auditPath)), originalPreparationSha256: hash(join(root, originalPath)),
      policySha256: hash(join(root, policyPath)), graderSha256: hash(join(root, 'scripts/grade-post-final-supplement.mjs')),
      runnerSha256: hash(fileURLToPath(import.meta.url)) };
    verifySources(plan);
    assertUnused(plan);
    save(join(root, preparationPath), plan);
    save(join(here, 'READY.json'), { preparationSha256: hash(join(root, preparationPath)), providerCallsMade: 0 });
    console.log(JSON.stringify({ stage: 'prepared', maxConcurrent: 6, attempts: 5, providerCallsMade: 0 }));
  } else if (mode === 'verify') {
    const plan = verifyReady();
    assertUnused(plan);
    console.log(JSON.stringify({ stage: 'ready', maxConcurrent: plan.maxConcurrent,
      plannedConcurrentAttempts: plan.plannedConcurrentAttempts, providerCallsMade: 0,
      slots: plan.slots.map(({ id, trial, target }) => ({ id, trial, target })) }));
  } else if (mode === 'run') {
    assert.equal(approval, '--user-authorized-five-remaining-up-to-six-concurrent');
    await run();
  } else throw Error('Usage: node scripts/run-post-final-five.mjs prepare | verify | run --user-authorized-five-remaining-up-to-six-concurrent');
}
