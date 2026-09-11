// Provider-free correction validation. Original packages, submissions and ledgers are read-only inputs.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildHarborTask } from './build-harbor-portfolio.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [phase, destination] = process.argv.slice(2);
assert(['prepare', 'foundry', 'native', 'regrade', 'finish'].includes(phase) && destination,
  'Usage: validate-ticket-directory-correction.mjs prepare|foundry|native|regrade|finish OUTPUT');
const out = resolve(destination), id = 'ticket-consolidation-repair';
const source = join(out, 'source'), build = join(out, 'build');
const campaign = join(repo, '.local/successor-adaptive-trials-2026-09-11');
const frozen = join(campaign, 'frozen-source');
const api = await import(pathToFileURL(join(frozen, 'dist/index.js')));
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const ref = path => ({ path: relative(repo, path), sha256: hash(path) });
const save = (name, value) => writeFileSync(join(out, name + '.json'), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const slots = [1, 2, 3, 4].map(trial => ({ trial,
  ...read(join(campaign, 'slots', id, 'trial-' + trial, 'slot.json')) }));
slots.push({ ...read(join(repo, '.local/ticket-consolidation-continuation-v2-2026-09-11/slots/attempt-5/slot.json')), trial: 5 });
const record = slot => join(repo, slot.runRoot, 'jobs/real-provider/records', id + '-attempt-1');
function originals() {
  return slots.map(slot => {
    const path = record(slot), evidence = api.verifyEvidence(path);
    return { trial: slot.trial, target: slot.target, packageDigest: slot.packageDigest,
      record: relative(repo, path), identity: evidence.identity, verifiedFiles: evidence.files.length,
      completion: ref(join(path, 'completion.json')), grade: ref(join(path, 'grade.json')),
      submission: ['entry.mjs', 'checker.mjs'].map(name => ref(join(path, 'submission', name))) };
  });
}
function tree(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).flatMap(entry => {
    assert(entry.isDirectory() || entry.isFile(), 'Only regular source files are allowed');
    const path = join(directory, entry.name), name = prefix + entry.name;
    return entry.isDirectory() ? tree(path, name + '/') : [{ path: name, sha256: hash(path) }];
  });
}
async function command(executable, args, log, extra = {}) {
  const chunks = [];
  await new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, { stdio: ['ignore', 'pipe', 'pipe'], ...extra });
    child.stdout.on('data', chunk => chunks.push(chunk));
    child.stderr.on('data', chunk => chunks.push(chunk));
    child.on('error', reject);
    child.on('close', code => {
      writeFileSync(log, Buffer.concat(chunks), { flag: 'wx' });
      code === 0 ? resolvePromise() : reject(Error(executable + ' exited ' + code + ': ' + log));
    });
  });
}

if (phase === 'prepare') {
  mkdirSync(out, { recursive: false });
  const before = originals();
  for (const path of ['tasks/portfolio-runtime', 'scripts/secure', 'src/packages/portfolio.ts',
    'src/packages/policy.ts', 'dist/packages/local-cli.js']) {
    mkdirSync(dirname(join(source, path)), { recursive: true });
    cpSync(join(frozen, path), join(source, path), { recursive: true });
  }
  cpSync(join(repo, 'tasks', id), join(source, 'tasks', id), { recursive: true });
  await command(process.execPath, [join(repo, 'scripts/audit-queue-eleven-fifteen.mjs'), source, join(out, 'fast')],
    join(out, 'fast.log'), { env: { ...process.env, AUDIT_TASKS: id } });
  assert(read(join(out, 'fast/summary.json')).passed);
  const old = api.executionPackage(join(repo, slots[4].packageDirectory)).snapshot.record;
  const pkg = await api.buildPortfolioTask(source, { directory: join(source, 'tasks', id), id,
    familyId: old.familyId, version: '2.0.3' }, build,
    join(repo, '.local/next-five-successors-2026-09-10/runtime'));
  assert.notEqual(pkg.digest, old.digest);
  const native = buildHarborTask(source, id, join(out, 'native/export'));
  const prepared = { schemaVersion: 1, id, version: '2.0.3', packageDigest: pkg.digest,
    priorPackageDigest: old.digest, packageDirectory: relative(repo, build), nativeDigest: native.digest,
    sourceFiles: tree(source), originals: before, validationSource: ref(fileURLToPath(import.meta.url)),
    providerCallsMade: 0 };
  assert.deepEqual(originals(), before);
  save('PREPARED', prepared);
  console.log(JSON.stringify({ phase, packageDigest: pkg.digest, nativeDigest: native.digest }));
} else {
  const prepared = read(join(out, 'PREPARED.json'));
  assert.deepEqual(tree(source), prepared.sourceFiles, 'Frozen corrected source changed');
  assert.deepEqual(originals(), prepared.originals, 'Original evidence changed');
  assert.equal(api.executionPackage(build).snapshot.record.digest, prepared.packageDigest);
  if (phase === 'foundry') {
    const assurance = await api.validatePortfolioPackage(build, join(out, 'assurance'));
    assert(assurance.results.every(result => result.status === 'pass'));
    await api.verifyPortfolioReceipt(build, join(out, 'assurance/assurance.json'));
    console.log(JSON.stringify({ phase: 'foundry-assurance', passed: assurance.results.length }));
    const checker = await api.gradeChecker(build, join(out, 'assurance/variants/reference'), join(out, 'reference-checker'));
    assert.equal(checker.total, 32); assert.equal(checker.pass, true);
    save('foundry', { providerCallsMade: 0, assurance: assurance.results.length, checker,
      receipt: ref(join(out, 'assurance/assurance.json')) });
    console.log(JSON.stringify({ phase, assurance: assurance.results.length, checker: checker.correct + '/' + checker.total }));
  }
  if (phase === 'native') {
    const image = 'foundry-ticket-directory-correction:' + randomUUID();
    await command('docker', ['build', '-t', image, join(out, 'native/export/tests')], join(out, 'native/build.log'));
    const results = [];
    for (const kind of ['oracle', 'nop']) {
      const submission = join(out, 'native', kind), logs = join(out, 'native', kind + '-results');
      mkdirSync(logs);
      cpSync(join(out, 'native/export/environment/submission'), submission, { recursive: true });
      if (kind === 'oracle') cpSync(join(out, 'native/export/solution/reference'), submission, { recursive: true });
      await command('docker', ['run', '--rm', '--network=none', '--cpus=2', '--memory=2g', '--pids-limit=256',
        '--mount', `type=bind,source=${submission},target=/app/submission,readonly`,
        '--mount', `type=bind,source=${logs},target=/logs/verifier`, image,
        'node', '/tests/harbor-grade.mjs', ...(kind === 'oracle' ? ['--validate'] : [])], join(out, 'native', kind + '.log'));
      const summary = read(join(logs, 'summary.json'));
      assert.equal(summary.reward, kind === 'oracle' ? 1 : 0);
      assert.notEqual(summary.infrastructureError, true);
      if (kind === 'oracle') {
        assert.equal(summary.checkerTotal, 32); assert.equal(summary.checkerCorrect, 32);
        assert.equal(summary.integrity.length, 8); assert(summary.integrity.every(row => row.passed));
      }
      results.push({ kind, ...summary });
      console.log(JSON.stringify({ phase, kind, reward: summary.reward, integrity: summary.integrity?.length }));
    }
    save('native', { providerCallsMade: 0, image, digest: prepared.nativeDigest, results });
  }
  if (phase === 'regrade') {
    const linked = [];
    for (const slot of slots) {
      const path = join(out, 'regrades', 'trial-' + slot.trial);
      assert(!existsSync(path), 'Regrades are never overwritten or silently repeated');
      await api.regradeExecution(record(slot), build, join(out, 'regrades'), 'trial-' + slot.trial);
      const result = read(join(path, 'result.json'));
      api.verifyEvidence(path);
      assert.equal(result.kind, 'linked-regrade'); assert.equal(result.newAgentAttempts, 0);
      assert.equal(result.countsAsModelFailure, false);
      assert.equal(result.targetPackageDigest, prepared.packageDigest);
      assert.equal(result.reward, 0); assert.equal(result.checkerPassed, false);
      assert.equal(result.evaluation.status, 'semantic-pass');
      assert.equal(result.evaluation.complete, true);
      linked.push({ trial: slot.trial, path: relative(repo, path), result: ref(join(path, 'result.json')), ...result });
      console.log(JSON.stringify({ phase, trial: slot.trial, service: result.evaluation.status,
        reward: result.reward, checker: result.checkerPassed }));
    }
    save('regrades', { providerCallsMade: 0, linked });
  }
  if (phase === 'finish') {
    const foundry = read(join(out, 'foundry.json')), native = read(join(out, 'native.json'));
    const regrades = read(join(out, 'regrades.json')), regressions = read(join(out, 'regressions.json'));
    assert.equal(foundry.checker.pass, true); assert(regressions.passed);
    assert.equal(regrades.linked.length, 5);
    const trial4 = read(join(out, 'regrades/trial-4/grading/checker-grade/grade-summary.json'));
    const missingRequests = ['closed-conflict', 'outside-conflict', 'outside-missing',
      'conflict-forbidden-note', 'conflict-forbidden-status', 'conflict-forbidden-revision',
      'conflict-invalid-owner', 'conflict-invalid-labels'];
    for (const name of missingRequests) assert(trial4.details.some(row =>
      row.candidateId === name && row.outcome === 'missed'), 'Saved checker no longer reproduces omission: ' + name);
    assert(trial4.details.some(row => row.candidateId === 'variant-temporary-owner' && row.outcome === 'false-positive'));
    assert.equal(trial4.total, 32);
    const trial5 = read(join(out, 'regrades/trial-5/grading/checker-grade/grade-summary.json'));
    assert.equal(trial5.total, 32);
    assert(trial5.details.some(row => row.candidateId === 'paired-directory-owner' && row.outcome === 'missed'));
    assert(trial5.details.some(row => row.candidateId === 'reference' && row.outcome === 'false-positive'));
    const failedDetails = trial5.details.filter(row => row.outcome !== 'correct');
    assert.equal(trial5.correct, 25);
    assert.equal(failedDetails.filter(row => row.outcome === 'missed').length, 1);
    assert.equal(failedDetails.filter(row => row.outcome === 'false-positive').length, 6);
    await api.verifyPortfolioReceipt(build, join(out, 'assurance/assurance.json'));
    for (const linked of regrades.linked) api.verifyEvidence(join(repo, linked.path));
    save('READY', { ...prepared, validationSource: ref(fileURLToPath(import.meta.url)),
      verified: true, providerCallsMade: 0, dispatched: false,
      assuranceChecks: foundry.assurance, checkerCandidates: foundry.checker.total,
      nativeIntegrityChecks: native.results[0].integrity.length,
      checkerMutationsCaught: regressions.mutations.length, linkedRegrades: regrades.linked.map(r => r.path),
      savedTrial4Checker: { correct: trial4.correct, total: trial4.total },
      savedAttempt5Checker: { correct: trial5.correct, total: trial5.total,
        invalidCandidatesAccepted: 1, validCandidatesRejected: 6 },
      evidence: ['PREPARED', 'foundry', 'native', 'regrades', 'regressions'].map(n => ref(join(out, n + '.json'))),
      historicalTrial4: { recordedReward: 1, auditDisposition: 'false-pass', auditedReward: null,
        countsAsCleanPass: false, countsAsCleanFailure: false, originalRecordUnchanged: true },
      historicalAttempt5: { recordedReward: 1, auditDisposition: 'false-pass', auditedReward: null,
        countsAsCleanPass: false, countsAsCleanFailure: false, originalRecordUnchanged: true },
      continuation: 'New trials must use this corrected digest in a separate prepared campaign. No trials dispatched by this validation.' });
    console.log(JSON.stringify({ phase, verified: true, packageDigest: prepared.packageDigest, providerCallsMade: 0 }));
  }
  assert.deepEqual(originals(), prepared.originals, 'Original evidence changed');
  assert.deepEqual(tree(source), prepared.sourceFiles, 'Frozen corrected source changed');
}
