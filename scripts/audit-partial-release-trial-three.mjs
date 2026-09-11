// Offline audit only. Never calls providers or changes the frozen campaign/record.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] ?? join(repo, '.local/partial-release-trial-three-pass-audit-' + Date.now()));
assert(!existsSync(out), 'Use a fresh output directory; retained evidence is immutable');
mkdirSync(out, { recursive: true });
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const ref = p => ({ path: relative(repo, p), sha256: hash(p) });
const campaign = join(repo, '.local/successor-adaptive-trials-2026-09-11');
const slot = read(join(repo, '.local/partial-release-generation-continuation-2026-09-11/slots/trial-3/slot.json'));
const record = join(repo, slot.runRoot, 'jobs/real-provider/records/partial-release-repair-attempt-1');
const submission = join(record, 'submission');
const api = await import(pathToFileURL(join(repo, slot.frozenRoot, 'dist/index.js')));
const verifiedBefore = api.verifyEvidence(record);
const grade = read(join(record, 'grade.json'));
assert.equal(grade.reward, 1); assert.equal(grade.checkerPassed, true);
const pkg = api.executionPackage(join(repo, slot.packageDirectory));
assert.equal(pkg.snapshot.record.digest, slot.packageDigest);
const get = (part, path) => Buffer.from(api.readSnapshotFile(pkg.snapshot, part, path)).toString();
const runtime = JSON.parse(get('dependencies', 'runtime.json'));
const authority = join(out, 'authority'); mkdirSync(authority);
const files = [], issuedContracts = [];
for (const [component, part] of Object.entries(pkg.snapshot.record.components)) for (const f of part.files) {
  if (/^public\/(SEMANTICS\.md|instruction\.md|CHECKER-INPUT\.md|api\.d\.ts)$/.test(f.path)) {
    assert.equal(hash(join(submission, f.path.slice(7))), f.sha256); issuedContracts.push(f);
  }
  if (['collector', 'verifier'].includes(component) && f.path.endsWith('.mjs') && !f.path.endsWith('/bootstrap.mjs')) {
    const path = f.path.replace(/^(runtime|private)\//, ''), text = get(component, f.path);
    files.push({ path, text }); const target = join(authority, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, text);
  }
}
const bootstrap = get('collector', 'runtime/bootstrap.mjs');
// The public API is synchronous. The broad in-process sweep uses an equivalent
// synchronous facade; protected replays below retain all frozen authority bytes.
const sweepAuthority = join(out, 'sweep-authority'); cpSync(authority, sweepAuthority, { recursive: true });
const adapterPath = join(sweepAuthority, 'adapter.mjs');
const adapter = readFileSync(adapterPath, 'utf8');
assert(adapter.includes('async invoke(name, args)') && adapter.includes('await operations[key](request)'));
writeFileSync(adapterPath, adapter.replace('async invoke(name, args)', 'invoke(name, args)').replace('await operations[key](request)', 'operations[key](request)'));
const probesDir = join(repo, 'data/partial-release-trial-three-pass-audit');
function docker(args, input, timeout = 300000) {
  const name = 'foundry-partial-t3-audit-' + randomUUID();
  try {
    return execFileSync('docker', ['run', '--name', name, '--pull=never', '--network=none', '--read-only', '--cpus=1', '--memory=1g', '--pids-limit=128', '--cap-drop=ALL', '--security-opt=no-new-privileges', ...args, '-i', runtime.image, 'node', '--input-type=module', '-e', input.code], { input: input.stdin, encoding: 'utf8', timeout, maxBuffer: 128 * 1024 * 1024 });
  } finally { try { execFileSync('docker', ['rm', '-f', name], { stdio: 'ignore' }); } catch {} }
}
function save(name, value) { const p = join(out, name + '.json'); writeFileSync(p, JSON.stringify(value, null, 2) + '\n'); return ref(p); }
console.log(JSON.stringify({ phase: 'verified-original', files: verifiedBefore.files.length, packageDigest: slot.packageDigest }));
const broad = JSON.parse(docker([
  '--user=1000:1000', '--tmpfs=/tmp:rw,size=256m',
  '--mount', `type=bind,src=${submission},dst=/submitted,readonly`,
  '--mount', `type=bind,src=${sweepAuthority},dst=/authority,readonly`,
  '--mount', `type=bind,src=${record},dst=/record,readonly`,
  '--mount', `type=bind,src=${probesDir},dst=/probes,readonly`,
], { code: 'await import("/probes/probes.mjs")' }));
const { fixtures, generationProbes, faultBase, faultNames, ...counts } = broad;
assert.equal(counts.authorityDisagreements.length, 0);
for (const row of generationProbes) { assert(row.independent.ok); assert.equal(row.authorityFailures.length, 0); assert(row.submittedChecker); }
save('sweep', counts); save('fixtures', fixtures); save('generation-probes', generationProbes);
console.log(JSON.stringify({ phase: 'sweep', ...counts }));
function replay(source, scenarios, label) {
  const result = JSON.parse(docker([
    '--tmpfs=/tmp:rw,size=256m', '--tmpfs=/work:rw,size=128m',
    '--cap-add=SETUID', '--cap-add=SETGID', '--cap-add=KILL', '--cap-add=CHOWN',
    '--mount', `type=bind,src=${source},dst=/submission,readonly`,
  ], { code: bootstrap, stdin: JSON.stringify({ files, scenarios }) }));
  const evidence = save(label, result);
  const summary = { label, total: result.cells.length, passed: result.cells.filter(c => c.status === 'semantic-pass').length, failed: result.cells.filter(c => c.status === 'semantic-fail').length, invalid: result.cells.filter(c => c.status === 'invalid').length, evidence };
  console.log(JSON.stringify({ phase: 'protected-replay', ...summary })); return { result, summary };
}
const baseScenarios = JSON.parse(get('scenarios', 'private/scenarios.json'));
const service = replay(submission, [...baseScenarios, ...fixtures.scenarios], 'protected-submitted-service');
assert.equal(service.summary.total, service.summary.passed);
const freshReplays = [], checkerCases = [...fixtures.cases], expected = [...fixtures.wanted];
for (const name of ['planned', 'broad', 'idempotent', ...faultNames, 'generation-roundtrip']) {
  const path = join(out, 'candidates', name); mkdirSync(path, { recursive: true });
  cpSync(join(probesDir, 'strategies.mjs'), join(path, 'strategies.mjs'));
  writeFileSync(join(path, 'entry.mjs'), `import { strategy } from './strategies.mjs'; export const subject = strategy(${JSON.stringify(name)});\n`);
  const scenarios = [0, 1, 2].map(uncertain => ({ ...faultBase, uncertain, id: name + '-u' + uncertain }));
  const row = replay(path, scenarios, 'protected-' + name); freshReplays.push(row.summary);
  assert.equal(row.summary.invalid, 0);
  if (['planned', 'broad', 'idempotent', 'generation-roundtrip'].includes(name)) assert.equal(row.summary.passed, 3);
  else if (name === 'abandon-absent-restore') assert.equal(row.summary.passed, 2);
  else if (name !== 'generation-roundtrip') assert.equal(row.summary.failed, 3);
  for (const c of row.result.cells) {
    const { checks, failures, status, expected: target, truth, groundTruth, ...raw } = c;
    checkerCases.push({ token: 'protected-replay:' + checkerCases.length, cells: [raw] }); expected.push(status === 'semantic-pass');
  }
}
save('protected-checker-input', { cases: checkerCases });
const checkerCode = `import {readFileSync} from 'node:fs'; function freeze(x){if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x)}return x;} const input=freeze(JSON.parse(readFileSync('/input/protected-checker-input.json'))), before=JSON.stringify(input); const {run}=await import('/submitted/checker.mjs'); const first=await run(input), second=await run(input); process.stdout.write(JSON.stringify({first,second,mutated:JSON.stringify(input)!==before}));`;
const judged = JSON.parse(docker([
  '--user=1000:1000', '--tmpfs=/tmp:rw,size=256m',
  '--mount', `type=bind,src=${submission},dst=/submitted,readonly`,
  '--mount', `type=bind,src=${out},dst=/input,readonly`,
], { code: checkerCode }, 60000));
save('protected-checker-output', judged);
assert.equal(judged.mutated, false); assert.deepEqual(judged.first, judged.second);
assert.equal(Object.keys(judged.first.verdicts).length, checkerCases.length);
const wrong = checkerCases.flatMap((c, i) => judged.first.verdicts[c.token]?.ok === expected[i] ? [] : [{ token: c.token, expected: expected[i], actual: judged.first.verdicts[c.token] }]);
assert.equal(wrong.length, 0, JSON.stringify(wrong));
const verifiedAfter = api.verifyEvidence(record);
const result = {
  schemaVersion: 1, providerCallsMade: 0, packageDigest: pkg.snapshot.record.digest,
  record: relative(repo, record), filesVerifiedBefore: verifiedBefore.files.length, filesVerifiedAfter: verifiedAfter.files.length,
  issuedContracts, grade: ref(join(record, 'grade.json')), completion: ref(join(record, 'completion.json')),
  submission: ['entry.mjs', 'checker.mjs'].map(p => ref(join(submission, p))),
  auditSources: ['scripts/audit-partial-release-trial-three.mjs', 'data/partial-release-trial-three-pass-audit/probes.mjs', 'data/partial-release-trial-three-pass-audit/strategies.mjs'].map(p => ref(join(repo, p))),
  sweepAdapter: { synchronousPublicApi: true, copiedAdapter: ref(adapterPath), protectedReplaysUseFrozenAdapter: true },
  sweep: counts, protectedService: service.summary, protectedStrategies: freshReplays,
  protectedChecker: { total: checkerCases.length, correct: checkerCases.length - wrong.length, inputUnchanged: !judged.mutated, deterministic: true },
  generationRoundtrip: generationProbes.map(({ cell, ...row }) => row),
};
save('summary', result);
console.log(JSON.stringify({ phase: 'complete', output: relative(repo, out), falseAccepts: counts.mismatches.filter(m => m.actual === true).length, falseRejects: counts.mismatches.filter(m => m.actual === false).length, protectedChecker: result.protectedChecker, generationRoundtrip: result.generationRoundtrip }));
