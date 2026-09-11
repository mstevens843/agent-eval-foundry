// Mutation regression over real protected Foundry executions; no provider calls.
// Synthetic weakened checkers transform private copies, never retained evidence.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert(process.argv[2], 'Usage: regress-ticket-directory-correction.mjs CORRECTION_OUTPUT');
const out = resolve(process.argv[2]);
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const { cases } = read(join(out, 'reference-checker/cases/cases.json'));
const details = read(join(out, 'reference-checker/grade-summary.json')).details;
assert.equal(cases.length, 32); assert.equal(details.length, cases.length);
const { check, run } = await import(pathToFileURL(join(out, 'source/tasks/ticket-consolidation-repair/private/reference/checker.mjs')));
const key = row => JSON.stringify([row.tenant, row.id]);
const canonical = value => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
const sameLabels = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
function independent(cell) {
  const initial = new Map(cell.initialRows.map(row => [key(row), row]));
  const actual = new Map(cell.actual.map(row => [key(row), row]));
  const selected = new Set(cell.initialRows.filter(row => cell.allowedTenants.includes(row.tenant) && row.status === 'open').map(key));
  const edits = new Map(cell.edits), flips = new Map(cell.concurrentStatusFlips.map(row => [key(row), row.status]));
  const writes = new Map();
  if (cell.execution.outcome !== 'returned' || cell.operationCount > cell.operationBudget) return false;
  for (const call of cell.calls) {
    const request = call.request, identity = key(request), patch = request.patch;
    if (!selected.has(identity) || !patch || !Object.keys(patch).every(k => k === 'owner' || k === 'labels') ||
      typeof patch.owner !== 'string' || !Array.isArray(patch.labels)) return false;
    if (call.status === 'APPLIED') {
      if (!call.before || request.revision !== call.before.revision ||
        new Set(patch.labels).size !== patch.labels.length || !call.before.labels.every(label => patch.labels.includes(label))) return false;
      writes.set(identity, (writes.get(identity) ?? 0) + 1);
    }
  }
  if (actual.size !== initial.size || actual.size !== cell.actual.length) return false;
  for (const [identity, before] of initial) {
    const after = actual.get(identity); if (!after) return false;
    if (!selected.has(identity)) { if (canonical(before) !== canonical(after)) return false; continue; }
    const count = edits.get(identity) ?? 0;
    const labels = [...new Set([...before.labels, cell.requestedMarker, ...Array.from({ length: count }, (_, i) => 'concurrent-' + i)])];
    if (after.owner !== cell.directory[before.tenant] || !sameLabels(after.labels, labels) ||
      after.note !== (count ? 'edited-' + (count - 1) : before.note) ||
      after.status !== (flips.get(identity) ?? before.status) ||
      after.revision !== before.revision + count + (writes.get(identity) ?? 0)) return false;
  }
  return true;
}
const expected = details.map(row => row.expectedFailingCheck === null);
let cellsCompared = 0;
for (let i = 0; i < cases.length; i++) {
  assert.equal(cases[i].cells.length, 73);
  const verdicts = cases[i].cells.map(cell => {
    assert(new Set(cell.initialRows.map(row => row.tenant)).size <= 4, 'Public tenant bound');
    assert(cell.initialRows.length <= 100, 'Public row bound');
    const correct = independent(cell);
    assert.equal(check(cell), correct, details[i].candidateId + '/' + cell.scenarioId);
    cellsCompared++; return correct;
  });
  assert.equal(verdicts.every(Boolean), expected[i], details[i].candidateId);
}
const mutations = [];
function evaluate(name, checker, target, direction) {
  const mismatches = cases.flatMap((candidate, index) => {
    const accepted = candidate.cells.every(cell => checker(structuredClone(cell)));
    return accepted === expected[index] ? [] : [{ candidate: details[index].candidateId, expected: expected[index], accepted }];
  });
  assert(mismatches.some(row => row.candidate === target && row.accepted === (direction === 'false-accept')),
    name + ' did not expose its intended regression');
  mutations.push({ name, target, direction, caught: true, mismatches });
}
for (const mode of ['closed-conflict', 'outside-conflict', 'outside-missing']) {
  evaluate('ignore-' + mode, cell => {
    const initial = new Map(cell.initialRows.map(row => [key(row), row]));
    cell.calls = cell.calls.filter(call => {
      if (mode === 'outside-missing') return call.status !== 'MISSING';
      if (call.status !== 'CONFLICT') return true;
      const row = initial.get(key(call.request));
      return mode === 'closed-conflict'
        ? !(row && cell.allowedTenants.includes(row.tenant) && row.status === 'closed')
        : !(row && !cell.allowedTenants.includes(row.tenant));
    });
    return check(cell);
  }, mode, 'false-accept');
}
for (const field of ['note', 'status', 'revision', 'owner', 'labels']) {
  const mode = ['owner', 'labels'].includes(field) ? 'conflict-invalid-' + field : 'conflict-forbidden-' + field;
  evaluate('ignore-' + mode, cell => {
    for (const call of cell.calls) if (call.status === 'CONFLICT' && call.before) {
      if (field === 'owner' && typeof call.request.patch?.owner !== 'string') call.request.patch.owner = call.before.owner;
      else if (field === 'labels' && !Array.isArray(call.request.patch?.labels)) call.request.patch.labels = call.before.labels;
      else if (!['owner', 'labels'].includes(field) && call.request.patch) delete call.request.patch[field];
    }
    return check(cell);
  }, mode, 'false-accept');
}
evaluate('reject-all-conflicts', cell => !cell.calls.some(call => call.status === 'CONFLICT') && check(cell),
  'variant-selected-conflict', 'false-reject');
evaluate('require-preserved-labels-on-conflicts', cell => !cell.calls.some(call => call.status === 'CONFLICT' &&
  !call.before.labels.every(label => call.request.patch.labels.includes(label))) && check(cell),
  'variant-stale-selected-conflict', 'false-reject');
evaluate('require-target-or-prior-owner-on-every-write', cell => !cell.calls.some(call => call.status === 'APPLIED' &&
  call.request.patch.owner !== call.before.owner && call.request.patch.owner !== cell.directory[call.request.tenant]) && check(cell),
  'variant-temporary-owner', 'false-reject');

// Simulate alternate directory schemas and normalization against the same real traces.
// Each mutant must both accept its wrong-owner candidate and reject a valid one.
for (const mode of ['paired', 'case-folded', 'trimmed', 'numeric']) {
  evaluate('reinterpret-directory-' + mode, cell => {
    const original = structuredClone(cell.directory);
    for (const tenant of Object.keys(original)) {
      const alias = mode === 'paired' ? JSON.stringify([tenant, cell.requestedTeam])
        : mode === 'case-folded' ? tenant.toLowerCase()
        : mode === 'trimmed' ? tenant.trim()
        : /^\d+$/.test(tenant) ? String(Number(tenant)) : tenant;
      if (alias !== tenant && Object.hasOwn(original, alias)) cell.directory[tenant] = original[alias];
    }
    return check(cell);
  }, mode + '-directory-owner', 'false-accept');
  assert(mutations.at(-1).mismatches.some(row => row.candidate === 'reference' && !row.accepted));
}

// Opaque identifiers, order and diagnostic fields must not carry correctness labels.
const original = structuredClone(cases), first = await run({ cases }), second = await run({ cases });
assert.deepEqual(first, second); assert.deepEqual(cases, original);
const varied = [...cases].reverse().map((candidate, i) => ({ token: ['__proto__', 'constructor', '', '0'][i] ?? 'opaque-' + i,
  cells: [...candidate.cells].reverse().map(cell => ({ ...cell, scenarioId: 'opaque', reports: [{ complete: true }] })) }));
const reordered = await run({ cases: varied });
for (let i = 0; i < varied.length; i++) assert.equal(reordered.verdicts[varied[i].token].ok, expected.at(-1 - i));
assert.deepEqual(cases, original);
const summary = { schemaVersion: 1, packageDigest: read(join(out, 'PREPARED.json')).packageDigest,
  providerCallsMade: 0, passed: true, candidates: cases.length, protectedCellsCompared: cellsCompared,
  positiveCandidates: expected.filter(Boolean).length, negativeCandidates: expected.filter(value => !value).length,
  independentDiscrepancies: 0, mutations, inputUnchanged: true, deterministic: true, opaqueAndOrderInvariant: true,
  sourceSha256: hash(fileURLToPath(import.meta.url)), casesSha256: hash(join(out, 'reference-checker/cases/cases.json')) };
writeFileSync(join(out, 'regressions.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, cells: cellsCompared, mutationsCaught: mutations.length, providerCallsMade: 0 }));
