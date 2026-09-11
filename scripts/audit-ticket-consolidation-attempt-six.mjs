// Offline retained-pass audit. No providers, campaign mutations, or package rebuilds.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { names } from '../data/ticket-consolidation-trial-four-pass-audit/strategies.mjs';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] ?? join(repo, '.local/ticket-attempt-six-pass-audit-' + Date.now()));
assert(!existsSync(out), 'Use a fresh output directory'); mkdirSync(out, { recursive: true });
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const ref = p => ({ path: relative(repo, p), sha256: hash(p) });
const save = (name, value) => { const p = join(out, name + '.json'); writeFileSync(p, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); return ref(p); };
const campaign = join(repo, '.local/successor-adaptive-trials-2026-09-11');
const slot = read(join(repo, '.local/ticket-consolidation-continuation-v3-2026-09-11/slots/attempt-6/slot.json'));
const record = join(repo, slot.runRoot, 'jobs/real-provider/records/ticket-consolidation-repair-attempt-1');
const submission = join(record, 'submission');
const api = await import(pathToFileURL(join(repo, slot.frozenRoot, 'dist/index.js')));
const before = api.verifyEvidence(record), grade = read(join(record, 'grade.json'));
assert.equal(grade.reward, 1); assert.equal(grade.checkerPassed, true);
const pkg = api.executionPackage(join(repo, slot.packageDirectory)); assert.equal(pkg.snapshot.record.digest, slot.packageDigest);
const get = (part, path) => Buffer.from(api.readSnapshotFile(pkg.snapshot, part, path)).toString();
const runtime = JSON.parse(get('dependencies', 'runtime.json')), files = [], issuedContracts = [];
const authority = join(out, 'authority'), reference = join(out, 'reference'); mkdirSync(authority); mkdirSync(reference);
for (const [component, part] of Object.entries(pkg.snapshot.record.components)) for (const f of part.files) {
  if (/^public\/(SEMANTICS\.md|instruction\.md|CHECKER-INPUT\.md|api\.d\.ts)$/.test(f.path)) { assert.equal(hash(join(submission, f.path.slice(7))), f.sha256); issuedContracts.push(f); }
  if (['collector', 'verifier'].includes(component) && f.path.endsWith('.mjs') && !f.path.endsWith('/bootstrap.mjs')) {
    const path = f.path.replace(/^(runtime|private)\//, ''), text = get(component, f.path); files.push({ path, text });
    const target = join(authority, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, text);
  }
  if (f.path.startsWith('private/reference/')) {
    const target = join(reference, f.path.slice('private/reference/'.length)); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, get(component, f.path));
  }
}
const bootstrap = get('collector', 'runtime/bootstrap.mjs');
function docker(args, code, stdin, timeout = 300000) {
  const name = 'foundry-ticket-t6-audit-' + randomUUID();
  try { return execFileSync('docker', ['run', '--name', name, '--pull=never', '--network=none', '--read-only', '--cpus=1', '--memory=1g', '--pids-limit=128', '--cap-drop=ALL', '--security-opt=no-new-privileges', ...args, '-i', runtime.image, 'node', '--input-type=module', '-e', code], { input: stdin, encoding: 'utf8', timeout, maxBuffer: 128 * 1024 * 1024 }); }
  finally { try { execFileSync('docker', ['rm', '-f', name], { stdio: 'ignore' }); } catch {} }
}
function replay(source, scenarios, label) {
  const result = JSON.parse(docker(['--tmpfs=/tmp:rw,size=256m', '--tmpfs=/work:rw,size=128m', '--cap-add=SETUID', '--cap-add=SETGID', '--cap-add=KILL', '--cap-add=CHOWN', '--mount', `type=bind,src=${source},dst=/submission,readonly`], bootstrap, JSON.stringify({ files, scenarios })));
  const evidence = save(label, result), summary = { label, total: result.cells.length, passed: result.cells.filter(c => c.status === 'semantic-pass').length, failed: result.cells.filter(c => c.status === 'semantic-fail').length, invalid: result.cells.filter(c => c.status === 'invalid').length, evidence };
  console.log(JSON.stringify({ phase: 'protected-replay', ...summary })); assert.equal(summary.invalid, 0); return { result, summary };
}
const copy = x => JSON.parse(JSON.stringify(x));
const key = r => JSON.stringify([r.tenant, r.id]);
const sortedLabels = xs => JSON.stringify([...xs].sort());
const canonical = v => JSON.stringify(Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))));
// Independent oracle from published snapshot membership, allowed patch schema,
// operation pre-states, concurrent edits and final state. No grader verdict inputs.
function independent(c) {
  const errors = [], initial = new Map(c.initialRows.map(r => [key(r), r])), actual = new Map(c.actual.map(r => [key(r), r]));
  const selected = new Set(c.initialRows.filter(r => c.allowedTenants.includes(r.tenant) && r.status === 'open').map(key));
  const edits = new Map(c.edits), flips = new Map(c.concurrentStatusFlips.map(r => [key(r), r.status])), applied = new Map();
  if (c.execution.outcome !== 'returned' || c.operationCount > c.operationBudget) errors.push('execution');
  for (const call of c.calls) {
    const r = call.request, k = key(r), patch = r.patch;
    if (!selected.has(k)) errors.push('nonselected-write-attempt');
    const valid = patch && typeof patch === 'object' && !Array.isArray(patch) && Object.keys(patch).every(k => ['owner', 'labels'].includes(k)) && typeof patch.owner === 'string' && Array.isArray(patch.labels);
    if (!valid) errors.push('forbidden-or-malformed-patch');
    if (call.status === 'APPLIED') {
      applied.set(k, (applied.get(k) ?? 0) + (valid ? 1 : 0));
      if (!call.before || r.revision !== call.before.revision) errors.push('conditional-write');
      if (!valid || new Set(patch.labels).size !== patch.labels.length || !call.before.labels.every(x => patch.labels.includes(x))) errors.push('label-loss');
    }
  }
  if (actual.size !== initial.size || actual.size !== c.actual.length) errors.push('population');
  for (const [k, r] of initial) {
    const a = actual.get(k); if (!a) { errors.push('missing-row'); continue; }
    if (!selected.has(k)) { if (canonical(a) !== canonical(r)) errors.push('unselected-mutation'); continue; }
    const count = edits.get(k) ?? 0;
    const expectedLabels = [...new Set([...r.labels, ...Array.from({ length: count }, (_, i) => 'concurrent-' + i), c.requestedMarker])];
    if (a.owner !== c.directory[r.tenant]) errors.push('owner');
    if (sortedLabels(a.labels) !== sortedLabels(expectedLabels)) errors.push('labels');
    if (a.note !== (count ? 'edited-' + (count - 1) : r.note) || a.status !== (flips.get(k) ?? r.status)) errors.push('collateral-change');
    if (a.revision !== r.revision + count + (applied.get(k) ?? 0)) errors.push('revision');
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
const strip = ({ checks, failures, status, expected, truth, groundTruth, ...raw }) => copy(raw);
console.log(JSON.stringify({ phase: 'verified-original', files: before.files.length, packageDigest: slot.packageDigest }));
const base = JSON.parse(get('scenarios', 'private/scenarios.json'));
const fresh = [];
for (let seed = 0; seed < 144; seed++) {
  const tenants = seed % 3 === 0 ? ['__proto__', '', 'constructor'] : ['A', 'B', 'C'];
  const n = [1, 3, 16, 17, 24, 26][seed % 6], marker = ['migrated', 'concurrent-0', '', '__proto__'][seed % 4], team = ['care', 'constructor', ''][seed % 3];
  const rows = Array.from({ length: n }, (_, i) => ({ tenant: tenants[i % tenants.length], id: 'ticket-' + Math.floor(i / tenants.length), status: 'open', revision: 1 + i % 5, owner: i % 5 === 0 ? tenants[i % tenants.length] + ':' + team : 'old', labels: [...new Set(['keep-' + i, ...(i % 5 === 0 ? [marker] : [])])], note: 'original-' + i }));
  rows.push({ tenant: tenants[0], id: 'closed', status: 'closed', revision: 7, owner: 'old', labels: ['keep-closed'], note: 'private' }, { tenant: 'outside', id: 'private', status: 'open', revision: 5, owner: 'old', labels: [], note: 'private' });
  if (seed % 2) rows.reverse();
  fresh.push({ id: 'fresh-' + seed, rows, tenants, marker, team, emptyPage: !!(seed & 1), overlap: !!(seed & 2), expire: !!(seed & 4), conflicts: 0, conflictMap: Object.fromEntries(rows.filter(r => r.status === 'open' && tenants.includes(r.tenant)).map((r, i) => [key(r), (i + seed) % 3])), crashAfterBatch: seed % 4 ? 1 + seed % 3 : null, statusFlipKey: key(rows.find(r => r.status === 'open' && tenants.includes(r.tenant))), opBudget: 4000 });
  assert(rows.length + Number(!!(seed & 1)) + Number(!!(seed & 2)) <= 30);
}
const collisionScenarios = [];
for (let seed = 0; seed < 48; seed++) {
  const team = ['care', '', 'constructor'][Math.floor(seed / 4) % 3];
  const tenants = [['A', '__proto__', '', 'literal[]'][seed % 4]];
  for (let depth = 0; depth < 1 + seed % 3; depth++) tenants.push(JSON.stringify([tenants.at(-1), team]));
  const rows = tenants.flatMap((tenant, i) => [0, 1].map(j => ({ tenant, id: 'ticket-' + j, status: 'open',
    revision: 1 + i + j, owner: (seed + j) % 4 === 0 ? tenant + ':' + team : 'old',
    labels: ['keep-' + j, ...((seed + j) % 4 === 0 ? ['migrated'] : [])], note: 'original' })));
  rows.push({ tenant: tenants[0], id: 'closed', status: 'closed', revision: 1, owner: 'old', labels: ['private'], note: 'original' });
  if (tenants.length < 4) rows.push({ tenant: 'unrelated', id: 'outside', status: 'open',
    revision: 1, owner: 'old', labels: [], note: 'original' });
  assert(new Set(rows.map(row => row.tenant)).size <= 4);
  assert(rows.length + Number(!!(seed & 1)) + Number(!!(seed & 4)) <= 30);
  if (seed % 2) rows.reverse();
  collisionScenarios.push({ id: 'directory-collision-' + seed, rows, tenants, team, marker: 'migrated',
    conflicts: seed % 3, emptyPage: !!(seed & 1), expire: !!(seed & 2), overlap: !!(seed & 4),
    crashAfterBatch: seed % 2 ? 1 : null, statusFlipKey: key(rows.find(r => r.status === 'open' && tenants.includes(r.tenant))), opBudget: 4000 });
}
save('collision-scenarios', collisionScenarios);
fresh.push(...collisionScenarios);
const service = replay(submission, [...base, ...fresh], 'submitted-service');
const originalCases = read(join(record, 'grading/checker-grade/cases/cases.json')).cases;
const originalDetails = read(join(record, 'grading/checker-grade/grade-summary.json')).details;
const cases = [], truth = [], variants = [], discrepancies = [];
function addCase(label, cells, expected) {
  const computed = cells.map(independent);
  if (expected !== undefined) assert.equal(computed.every(x => x.ok), expected, label);
  for (let i = 0; i < cells.length; i++) if (cells[i].failures && computed[i].ok !== (cells[i].failures.length === 0)) discrepancies.push({ label, id: cells[i].scenarioId, independent: computed[i], authority: cells[i].failures });
  const token = 'audit:' + cases.length;
  cases.push({ token, cells: cells.map(strip) }); truth.push({ token, label, expected: computed.every(x => x.ok), cellTruth: computed });
}
for (let i = 0; i < originalCases.length; i++) addCase('original:' + originalDetails[i].candidateId, originalCases[i].cells, originalDetails[i].expectedFailingCheck === null);
for (const c of service.result.cells) addCase('submitted-service:' + c.scenarioId, [c]);
const fixture = {
  id: 'witness', tenants: ['A'], team: 'care', marker: 'migrated', conflicts: 0,
  rows: [
    { tenant: 'A', id: 'selected', status: 'open', revision: 10, owner: 'old', labels: ['keep'], note: 'original' },
    { tenant: 'A', id: 'closed', status: 'closed', revision: 10, owner: 'old', labels: ['private'], note: 'original' },
    { tenant: 'X', id: 'outside', status: 'open', revision: 10, owner: 'old', labels: ['private'], note: 'original' },
  ],
};
const validNames = ['sequential', 'two-stage', 'redundant', 'conflict-valid-patch', 'stale-valid-labels', 'temporary-owner'];
for (const name of names) {
  const source = join(out, 'candidates', name); mkdirSync(source, { recursive: true });
  cpSync(join(repo, 'data/ticket-consolidation-trial-four-pass-audit/strategies.mjs'), join(source, 'strategies.mjs'));
  writeFileSync(join(source, 'entry.mjs'), `import { strategy } from './strategies.mjs'; export const subject = strategy(${JSON.stringify(name)});\n`);
  const scenarios = [0, 1, 2].map(conflicts => ({ ...copy(fixture), conflicts, id: name + '-' + conflicts, statusFlipKey: key(fixture.rows[0]), opBudget: name === 'complete-then-budget' ? 40 : 4000 }));
  const replayed = replay(source, scenarios, name); variants.push(replayed.summary);
  addCase(name, replayed.result.cells, validNames.includes(name));
  // Judge each execution independently so an unrelated failing cell cannot mask a miss.
  for (const c of replayed.result.cells) addCase(name + ':' + c.scenarioId, [c], validNames.includes(name));
}
// Recheck both earlier request obligations against the complete frozen bank.
// Reference-backed controls finish correctly, then add one bad non-landed request.
// The tiny-budget scenario is kept clean to isolate this from budget failure.
const fullBankControls = [];
for (const name of ['closed-conflict', 'conflict-forbidden-note']) {
  const source = join(out, 'candidates', 'full-bank-' + name); mkdirSync(source, { recursive: true });
  cpSync(reference, join(source, 'reference'), { recursive: true });
  cpSync(join(repo, 'data/ticket-consolidation-trial-four-pass-audit/strategies.mjs'), join(source, 'strategies.mjs'));
  writeFileSync(join(source, 'entry.mjs'), `import {subject as correct} from './reference/entry.mjs'; import {collect} from './strategies.mjs';
export const subject={async run(view,api){await correct.run(view,api);if(view.operationBudget<100)return;const rows=await collect(api);
const candidate=rows.find(r=>view.tenants.includes(r.tenant)&&r.status===${JSON.stringify(name === 'closed-conflict' ? 'closed' : 'open')});if(!candidate)return;
const row=await api.read({tenant:candidate.tenant,id:candidate.id});const patch={owner:row.owner,labels:row.labels};
${name === 'conflict-forbidden-note' ? "patch.note='forbidden';" : ''}
await api.batch({updates:[{tenant:row.tenant,id:row.id,revision:row.revision-1,patch}]});}};\n`);
  const replayed = replay(source, base, 'full-bank-' + name); fullBankControls.push(replayed.summary);
  addCase('full-bank-' + name, replayed.result.cells, false);
  for (const c of replayed.result.cells) addCase('full-bank-' + name + ':' + c.scenarioId, [c]);
}
// A second namespace is a real tenant name, never a directory schema hint.
const pairedSource = join(out, 'candidates', 'paired-directory-owner'); mkdirSync(pairedSource, { recursive: true });
cpSync(reference, pairedSource, { recursive: true });
cpSync(join(repo, 'data/ticket-consolidation-trial-four-pass-audit/strategies.mjs'), join(pairedSource, 'strategies.mjs'));
writeFileSync(join(pairedSource, 'entry.mjs'), `import {migrate} from './src/service.mjs'; import {collect} from './strategies.mjs';
export const subject={async run(view,api){await migrate(view,api);if(view.operationBudget<100)return;
for(const original of await collect(api)){
  if(!view.tenants.includes(original.tenant)||original.status!=='open')continue;
  const alternate=JSON.stringify([original.tenant,view.team]);if(!view.tenants.includes(alternate))continue;
  const owner=(await api.resolve({tenant:alternate,team:view.team})).owner;
  for(let retry=0;retry<4;retry++){
    const row=await api.read({tenant:original.tenant,id:original.id});
    const result=await api.batch({updates:[{tenant:row.tenant,id:row.id,revision:row.revision,patch:{owner,labels:[...row.labels]}}]});
    if(result.results[0].status==='APPLIED')break;
  }
} return {complete:true};}};\n`);
const paired = replay(pairedSource, [...base, ...collisionScenarios], 'paired-directory-owner');
fullBankControls.push(paired.summary); addCase('paired-directory-owner', paired.result.cells, false);
for (const cell of paired.result.cells) addCase('paired-directory-owner:' + cell.scenarioId, [cell]);
// Explicit opaque-token coverage and candidate/cell order independence.
const positive = cases.find((c, i) => truth[i].label === 'sequential');
const negative = cases.find((c, i) => truth[i].label === 'closed-conflict');
for (const [token, sample] of [['__proto__', positive], ['constructor', negative], ['', positive]]) {
  const expected = sample.cells.every(c => independent(c).ok); cases.push({ token, cells: copy(sample.cells) }); truth.push({ token, label: 'opaque-token:' + token, expected });
}
save('checker-input', { cases }); save('checker-truth', truth);
const code = `import {readFileSync} from 'node:fs'; function freeze(x){if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x)}return x;} const input=freeze(JSON.parse(readFileSync('/input/checker-input.json'))); const before=JSON.stringify(input); const {run}=await import('/submitted/checker.mjs'); const started=performance.now(), first=await run(input), second=await run(input); const milliseconds=performance.now()-started; const varied=freeze({cases:[...input.cases].reverse().map(c=>({...c,cells:[...c.cells].reverse().map(cell=>({...cell,scenarioId:'opaque',reports:[{complete:true}]}))}))}); const reordered=await run(varied); process.stdout.write(JSON.stringify({first,second,reordered,mutated:before!==JSON.stringify(input),milliseconds}));`;
function judge(source, label) {
  const result = JSON.parse(docker(['--user=1000:1000', '--tmpfs=/tmp:rw,size=256m', '--mount', `type=bind,src=${source},dst=/submitted,readonly`, '--mount', `type=bind,src=${out},dst=/input,readonly`], code, undefined, 60000));
  const evidence = save(label, result); assert.equal(result.mutated, false); assert.deepEqual(result.first, result.second); assert.equal(Object.keys(result.first.verdicts).length, cases.length);
  const mismatches = [];
  for (const t of truth) { const verdict = result.first.verdicts[t.token]; assert.equal(typeof verdict?.ok, 'boolean'); assert.equal(result.reordered.verdicts[t.token]?.ok, verdict.ok); if (verdict.ok !== t.expected) mismatches.push({ ...t, actual: verdict.ok, reasons: verdict.reasons }); }
  return { total: cases.length, correct: cases.length - mismatches.length, milliseconds: result.milliseconds, mismatches, deterministic: true, inputUnchanged: true, evidence };
}
const submittedChecker = judge(submission, 'submitted-checker'), referenceChecker = judge(reference, 'reference-checker');
const after = api.verifyEvidence(record);
const result = {
  schemaVersion: 1, providerCallsMade: 0, packageDigest: slot.packageDigest, record: relative(repo, record), originalReward: grade.reward,
  filesVerifiedBefore: before.files.length, filesVerifiedAfter: after.files.length, issuedContracts,
  originalGrade: ref(join(record, 'grade.json')), originalCompletion: ref(join(record, 'completion.json')),
  submission: ['entry.mjs', 'checker.mjs'].map(p => ref(join(submission, p))),
  sources: ['scripts/audit-ticket-consolidation-attempt-six.mjs', 'data/ticket-consolidation-trial-four-pass-audit/strategies.mjs'].map(p => ref(join(repo, p))),
  service: service.summary, freshServiceScenarios: fresh.length, collisionScenarios: collisionScenarios.length, variants, fullBankControls, submittedChecker, referenceChecker, independentAuthorityDiscrepancies: discrepancies,
};
save('summary', result);
console.log(JSON.stringify({ phase: 'complete', output: relative(repo, out), service: service.summary, submittedFalseAccepts: submittedChecker.mismatches.filter(m => m.actual).map(m => m.label), submittedFalseRejects: submittedChecker.mismatches.filter(m => !m.actual).map(m => m.label), referenceMismatches: referenceChecker.mismatches.length, authorityDiscrepancies: discrepancies }));
