// Local deterministic audit only. No provider imports, calls, credentials or solver launches.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gradePostFinalSupplement, hash } from './grade-post-final-supplement.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const local = join(root, '.local/post-final-pass-audit-2026-09-09');
const here = join(local, 'runs', String(Date.now()));
const revision = 'post-final-coverage-v2';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
};
const pin = (path, value) => {
  if (existsSync(path)) assert.deepEqual(read(path), value, `Pinned artifact changed: ${path}`);
  else write(path, value);
};
const frozen = join(root, '.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js');
assert.equal(hash(frozen), '60695de963e5085dfe8ee4fb09353b1db0169219d9ad9425ac2a997a73b69b26');
const api = await import(frozen);
const prep = read(join(root, 'reports/screening/evidence/2026-09-09-round-three-failing-five-preparation.json'));
const priorPath = 'reports/screening/evidence/2026-09-09-final-six.json';
const prior = read(join(root, priorPath));
const source = (pkg, component, path) => Buffer.from(api.readSnapshotFile(pkg.snapshot, component, path)).toString();
const definitions = [
  { id: 'variant-cache-repair', controlOk: true },
  { id: 'issued-report-repair', controlOk: true },
  { id: 'temporal-capacity-repair', controlOk: true },
  { id: 'snapshot-recovery-repair', controlOk: false },
];

function stageReference(pkg, id, name, control = false) {
  const dir = join(here, id, name);
  for (const file of pkg.snapshot.record.components.reference.files) {
    if (file.path.startsWith('private/reference/')) {
      write(join(dir, file.path.slice('private/reference/'.length)), source(pkg, 'reference', file.path));
    }
  }
  if (control) {
    cpSync(join(dir, 'entry.mjs'), join(dir, 'reference-entry.mjs'));
    cpSync(join(root, 'data/post-final-grading-controls/sources', id, 'entry.mjs'), join(dir, 'entry.mjs'));
  }
  return dir;
}

function execute(pkg, submission, scenario, destination) {
  const files = [...pkg.snapshot.record.components.collector.files, ...pkg.snapshot.record.components.verifier.files]
    .filter(file => file.path.endsWith('.mjs') && !file.path.endsWith('bootstrap.mjs'))
    .map(file => ({
      path: file.path.replace(/^(runtime|private)\//, ''),
      text: source(pkg, file.path.startsWith('runtime/') ? 'collector' : 'verifier', file.path),
    }));
  const raw = execFileSync('docker', [
    'run', '--rm', '--network', 'none', '--read-only', '--tmpfs', '/tmp:rw,size=512m',
    '--tmpfs', '/work:rw,size=128m', '--shm-size', '256m', '--cpus', '2', '--memory', '2g',
    '--pids-limit', '256', '--cap-drop', 'ALL', '--cap-add', 'SETUID', '--cap-add', 'SETGID',
    '--cap-add', 'KILL', '--cap-add', 'CHOWN', '--security-opt', 'no-new-privileges',
    '--mount', `type=bind,src=${submission},dst=/submission,readonly`, '-i', pkg.image,
    'node', '--input-type=module', '-e', source(pkg, 'collector', 'runtime/bootstrap.mjs'),
  ], { input: JSON.stringify({ files, scenarios: [scenario] }), encoding: 'utf8', timeout: 90000, maxBuffer: 24 * 1024 * 1024 });
  const result = JSON.parse(raw);
  assert.equal(result.cells.length, 1);
  assert.notEqual(result.cells[0].status, 'invalid', 'Infrastructure is not a solver failure');
  write(destination, result);
  return result.cells[0];
}

function recordDirectory(id, trial) {
  if ((trial === 6) || (id === 'snapshot-recovery-repair' && trial === 5)) {
    return join(root, `.local/final-six-2026-09-09/${id}/trial-${trial}/real-campaign-frozen/jobs/real-provider/records/${id}-attempt-1`);
  }
  let campaign;
  if (trial === 2) campaign = id === 'temporal-capacity-repair' ? 'round-two-final-five'
    : id === 'snapshot-recovery-repair' ? 'round-two-third-ranked-five' : 'round-two-top-five';
  else campaign = { 3: 'round-three-failing-five', 4: 'round-four-failing-five', 5: 'round-five-continuing-four' }[trial];
  assert(campaign);
  return join(root, `.local/${campaign}-2026-09-09/real-campaign-frozen/jobs/real-provider/records/${id}-attempt-1`);
}

function verifyManifest(dir) {
  const completion = read(join(dir, 'completion.json'));
  assert.equal(completion.complete, true);
  let bytes = 0;
  for (const file of completion.files) {
    const path = resolve(dir, file.path);
    assert(path.startsWith(resolve(dir) + '/'));
    const content = readFileSync(path);
    assert.equal(content.length, file.size);
    assert.equal(createHash('sha256').update(content).digest('hex'), file.sha256, `Manifest drift: ${file.path}`);
    bytes += content.length;
  }
  return { files: completion.files.length, bytes, completionSha256: hash(join(dir, 'completion.json')) };
}

const controls = [], generated = [], packages = new Map();
for (const definition of definitions) {
  const { id, controlOk } = definition;
  const spec = prep.packages.find(pkg => pkg.id === id);
  const pkg = api.executionPackage(join(root, spec.foundry.export));
  const scenarioPath = `data/post-final-grading-controls/sources/${id}/scenario.json`;
  const sourcePath = `data/post-final-grading-controls/sources/${id}/entry.mjs`;
  const scenario = read(join(root, scenarioPath));
  const reference = stageReference(pkg, id, 'reference');
  const control = stageReference(pkg, id, 'control', true);
  const baselineCell = execute(pkg, reference, scenario, join(here, id, 'baseline-trace.json'));
  const controlCell = execute(pkg, control, scenario, join(here, id, 'control-trace.json'));
  assert.equal(baselineCell.status, 'semantic-pass');
  assert.equal(controlCell.status, controlOk ? 'semantic-pass' : 'semantic-fail');
  const strip = ({ checks, status, failures, expected, truth, groundTruth, ...rest }) => rest;
  const expected = [true, controlOk].map((ok, i) => ({
    token: createHash('sha256').update(`${revision}:${id}:${i}`).digest('hex').slice(0, 24), ok,
  }));
  const fixture = `data/post-final-grading-controls/${id}.json`;
  pin(join(root, fixture), { cases: [baselineCell, controlCell].map((cell, i) => ({ token: expected[i].token, cells: [strip(cell)] })) });
  controls.push({ id, fixture, sha256: hash(join(root, fixture)), expected });
  generated.push({ id, packageDigest: spec.foundry.digest,
    sourcePath, sourceSha256: hash(join(root, sourcePath)), scenarioPath, scenarioSha256: hash(join(root, scenarioPath)),
    baselineStatus: baselineCell.status, controlStatus: controlCell.status, controlFailures: controlCell.failures,
    baselineTraceSha256: hash(join(here, id, 'baseline-trace.json')), controlTraceSha256: hash(join(here, id, 'control-trace.json')) });
  packages.set(id, { pkg, reference, scenario });
  console.log(JSON.stringify({ stage: 'genuine-trace', id, baseline: baselineCell.status, control: controlCell.status }));
}

const previousPolicy = 'data/final-six-grading-controls/policy.json';
const policyPath = 'data/post-final-grading-controls/policy.json';
pin(join(root, policyPath), {
  schemaVersion: 1, revision, image: packages.values().next().value.pkg.image,
  extends: { path: previousPolicy, sha256: hash(join(root, previousPolicy)) },
  combination: 'effectiveReward = min(recordedReward, cumulativeSupplementPass ? 1 : 0); apply the same controls to every retained and future attempt of each affected immutable package',
  controls,
});

const oracles = [], rows = [], manifests = [], serviceChecks = [];
for (const { id } of definitions) {
  const { pkg, reference, scenario } = packages.get(id);
  const oracle = gradePostFinalSupplement({ id, submission: reference, output: join(here, id, 'oracle-grade') });
  assert.equal(oracle.pass, true, 'Private oracle failed a cumulative control');
  oracles.push({ id, checkerSha256: oracle.checkerSha256, correct: oracle.correct, total: oracle.total, pass: oracle.pass });
  const previous = prior.packages.find(pkg => pkg.id === id);
  for (let i = 0; i < previous.recordedHistory.length; i++) {
    const trial = i + 2, dir = recordDirectory(id, trial);
    const manifest = verifyManifest(dir);
    const result = read(join(dir, 'result.json')), grade = read(join(dir, 'grade.json'));
    const profile = read(join(dir, 'profile.json'));
    const spec = generated.find(pkg => pkg.id === id);
    assert.equal(result.packageDigest, spec.packageDigest);
    assert.equal(grade.reward, previous.recordedHistory[i]);
    const supplement = gradePostFinalSupplement({ id, submission: join(dir, 'submission'), output: join(here, id, `trial-${trial}-grade`) });
    const row = { id, trial, provider: profile.target, packageDigest: result.packageDigest,
      recordedReward: grade.reward, previousEffectiveReward: previous.effectiveHistory[i],
      effectiveReward: Math.min(grade.reward, supplement.pass ? 1 : 0),
      checkerSha256: supplement.checkerSha256, gradeSha256: hash(join(dir, 'grade.json')),
      resultSha256: hash(join(dir, 'result.json')), completionSha256: manifest.completionSha256,
      publicContractSha256: hash(join(dir, 'public/public/SEMANTICS.md')),
      instructionSha256: hash(join(dir, 'public/public/instruction.md')),
      supplement: { correct: supplement.correct, total: supplement.total, pass: supplement.pass,
        deterministic: supplement.deterministic, exactTokens: supplement.exactTokens, details: supplement.details },
    };
    assert.equal(row.effectiveReward <= row.previousEffectiveReward, true, 'Existing zero must remain zero');
    // Separately replay each previously effective passing SERVICE on this new scenario.
    // This distinguishes a checker defect from an unsupported service-defect claim.
    if (row.previousEffectiveReward === 1) {
      const cell = execute(pkg, join(dir, 'submission'), scenario, join(here, id, `trial-${trial}-service.json`));
      serviceChecks.push({ id, trial, status: cell.status, failures: cell.failures });
    }
    assert.equal(hash(join(dir, 'completion.json')), manifest.completionSha256);
    manifests.push({ id, trial, ...manifest });
    rows.push(row);
    console.log(JSON.stringify({ stage: 'regrade', id, trial, recorded: row.recordedReward,
      previous: row.previousEffectiveReward, current: row.effectiveReward }));
  }
}
// Reverify every original record after all isolated reads and replays.
for (const manifest of manifests) assert.deepEqual(verifyManifest(recordDirectory(manifest.id, manifest.trial)), {
  files: manifest.files, bytes: manifest.bytes, completionSha256: manifest.completionSha256,
});
const classifications = prior.packages.map(previous => {
  const changed = rows.filter(row => row.id === previous.id);
  const effectiveHistory = changed.length ? changed.map(row => row.effectiveReward) : previous.effectiveHistory;
  const failures = effectiveHistory.filter(reward => reward === 0).length;
  const scored = effectiveHistory.length;
  const remaining = 6 - scored;
  return { id: previous.id, analysis: previous.analysis, recordedHistory: previous.recordedHistory,
    previousEffectiveHistory: previous.effectiveHistory, effectiveHistory, failures, scored, remaining,
    attemptsByProvider: previous.attemptsByProvider,
    classification: scored === 6 && failures >= 5 ? 'meets-5-of-6-complete'
      : failures + remaining >= 5 ? 'reopened' : 'cannot-reach-5-of-6',
    failuresNeeded: Math.max(0, 5 - failures),
  };
});
const correctedPasses = rows.filter(row => row.previousEffectiveReward !== row.effectiveReward)
  .map(({ id, trial, provider, recordedReward, previousEffectiveReward, effectiveReward }) => ({ id, trial, provider, recordedReward, previousEffectiveReward, effectiveReward }));
const evidence = {
  schemaVersion: 1, gradingRevision: revision, providerCallsMade: 0,
  previousEvidence: { path: priorPath, sha256: hash(join(root, priorPath)) },
  policy: { path: policyPath, sha256: hash(join(root, policyPath)) },
  runnerSha256: hash(join(root, 'scripts/grade-post-final-supplement.mjs')),
  reproductionSha256: hash(fileURLToPath(import.meta.url)),
  frozenRuntimeSha256: hash(frozen), generated, oracles, rows, serviceChecks, correctedPasses, classifications,
  manifests: { recordsVerified: manifests.length, filesVerified: manifests.reduce((n, r) => n + r.files, 0),
    bytesVerified: manifests.reduce((n, r) => n + r.bytes, 0), verifiedBeforeAndAfter: true, errors: [] },
  successorTotals: { ...prior.successorTotals,
    effectiveFailures: prior.successorTotals.effectiveFailures + correctedPasses.length,
    effectivePasses: prior.successorTotals.effectivePasses - correctedPasses.length },
};
write(join(here, 'evidence.json'), evidence);
write(join(local, 'LATEST.json'), { directory: here, evidence: join(here, 'evidence.json') });
console.log(JSON.stringify({ complete: true, providerCallsMade: 0, evidence: join(here, 'evidence.json'),
  correctedPasses: correctedPasses.length, classifications }));
