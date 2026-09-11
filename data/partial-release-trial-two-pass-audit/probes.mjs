// Runs offline inside Docker. The broad sweep shares a process with the candidate;
// the driver separately replays selected witnesses through the protected RPC host.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runScenario } from '/authority/domain.mjs';
import { subject } from '/submitted/entry.mjs';
import { run as checker } from '/submitted/checker.mjs';
import { strategy, faults } from './strategies.mjs';
const copy = x => JSON.parse(JSON.stringify(x));
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const stripped = ({ checks, failures, expected, status, truth, groundTruth, ...raw }) => copy(raw);
let rngState = 0x20260911;
const random = () => ((rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const canon = r => r && JSON.stringify([r.id, [...new Set(r.parents)].sort(), r.payload]);
const same = (a, b) => !!a && !!b && canon(a) === canon(b);
// Independent contract oracle: no reference checker, host checks, reports, or scenario IDs.
function verdict(c) {
  const scope = new Set(c.requestedScope), actual = new Map(c.actual.map(r => [r.id, r]));
  const initial = new Map(c.initialResources.map(r => [r.id, r])), target = new Map(c.requestedTarget.map(r => [r.id, r]));
  const errors = [];
  for (const id of scope) {
    if (actual.has(id) !== target.has(id)) errors.push('presence');
    else if (target.has(id) && !same(target.get(id), actual.get(id))) errors.push('content');
  }
  for (const id of new Set([...initial.keys(), ...actual.keys()])) if (!scope.has(id) && !same(initial.get(id), actual.get(id))) errors.push('preservation');
  for (const op of c.operations) {
    const before = new Map(op.before.map(r => [r.id, r]));
    const r = op.args.resource, id = op.method === 'create' ? r?.id : op.args.id;
    if (!scope.has(id)) errors.push('scope');
    if (op.method === 'create') {
      if (!r || typeof r.id !== 'string' || typeof r.payload !== 'string' || !Array.isArray(r.parents)) { errors.push('schema'); continue; }
      if (!r.parents.every(p => typeof p === 'string' && before.has(p))) errors.push('create-dependency');
      if (before.has(id) && !same(before.get(id), r)) errors.push('immutable-edit');
    } else if (op.method === 'remove') {
      if (op.before.some(r => r.parents.includes(id))) errors.push('remove-dependency');
    } else errors.push('method');
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
async function execute(s, program) {
  return { scenarioId: s.id, ...await runScenario(copy(s), async adapter => {
    for (let i = 0; i < adapter.count; i++) {
      const frame = adapter.begin(i);
      const api = Object.fromEntries(frame.facades[0].methods.map(method => [method, async x => copy(await adapter.invoke('api.' + method, [copy(x)]))]));
      await adapter.report(await program.run(copy(frame.view), api));
    }
    return adapter.result();
  }, '/tmp/audit-storage') };
}
function validateScenario(s) {
  const ids = new Set([...s.current, ...s.target].map(r => r.id));
  assert(ids.size <= 40);
  function graph(resources) {
    const m = new Map(resources.map(r => [r.id, r])); assert.equal(m.size, resources.length);
    function depth(id, seen = new Set()) {
      assert(m.has(id), 'dangling parent'); assert(!seen.has(id), 'cyclic input');
      const next = new Set([...seen, id]);
      return 1 + Math.max(0, ...m.get(id).parents.map(p => depth(p, next)));
    }
    for (const id of m.keys()) assert(depth(id) <= 8, 'depth');
  }
  graph(s.current); graph([...s.current.filter(r => !s.scope.includes(r.id)), ...s.target]);
}
const scenarios = [];
function add(base) { validateScenario(base); for (const uncertain of [0, 1, 2]) scenarios.push({ ...copy(base), id: base.id + '-u' + uncertain, uncertain }); }
// Every old/new three-node DAG with this topological order; all 8 payload-change masks.
for (let before = 0; before < 8; before++) for (let after = 0; after < 8; after++) for (let mask = 0; mask < 8; mask++) {
  const ids = ['__proto__', '', 'constructor'];
  function graph(bits, changed) { let edge = 0; return ids.map((id, i) => ({ id, parents: ids.slice(0, i).filter(() => (bits >> edge++) & 1), payload: changed && ((mask >> i) & 1) ? '\u0000new' : '' })); }
  add({ id: `exhaustive-${before}-${after}-${mask}`, current: shuffle(graph(before, false)), scope: shuffle(ids), target: shuffle(graph(after, true)) });
}
// Feasible mixed-scope DAGs, presence changes, reverse topological orders, diamonds,
// duplicates in parent sets, and full 40-resource/depth-8 inputs.
for (let seed = 0; seed < 160; seed++) {
  const n = seed < 32 ? 37 : 2 + seed % 16;
  const outside = { id: 'outside', parents: [], payload: 'fixed' }, hub = { id: 'hub', parents: [], payload: 'hub' }, child = { id: 'untouched', parents: ['hub'], payload: 'fixed' };
  const ids = Array.from({ length: n }, (_, i) => `r:${i}:\u03bb`);
  function make() {
    const order = shuffle(ids), resources = [], levels = new Map([['outside', 1], ['hub', 1]]);
    for (const id of order) {
      if (random() < .2) continue;
      const eligible = [...levels.keys()].filter(id => levels.get(id) < 8);
      const parents = shuffle(eligible).slice(0, Math.floor(random() * Math.min(4, eligible.length + 1)));
      levels.set(id, 1 + Math.max(0, ...parents.map(p => levels.get(p))));
      if (parents.length && random() < .3) parents.push(parents[0]);
      resources.push({ id, parents, payload: ['', 'A', 'B', '\u0000\ud83d\ude80'][Math.floor(random() * 4)] });
    }
    return resources;
  }
  add({ id: 'random-' + seed, scope: shuffle(['hub', ...ids]), current: shuffle([outside, hub, child, ...make()]), target: shuffle([hub, ...make()]) });
}
add({ id: 'empty-scope', current: [{ id: '__proto__', parents: [], payload: '' }], scope: [], target: [] });
add({ id: 'empty-everything', current: [], scope: [], target: [] });
add({ id: 'remove-all', current: [{ id: '', parents: [], payload: '' }, { id: 'x', parents: [''], payload: '' }], scope: ['', 'x'], target: [] });
{
  const ids = Array.from({ length: 40 }, (_, i) => 'boundary:' + i);
  const graph = order => order.map((id, i) => ({ id, parents: i < 5 ? [] : order.slice((Math.floor(i / 5) - 1) * 5, Math.floor(i / 5) * 5), payload: '' }));
  add({ id: 'boundary-40-depth-8', current: graph(ids), scope: shuffle(ids), target: graph([...ids].reverse()) });
}
const faultBase = {
  id: 'fresh-fault', scope: ['parent', 'child', 'spare'],
  current: [{ id: 'outside', parents: [], payload: 'fixed' }, { id: 'parent', parents: ['outside'], payload: 'old' }, { id: 'child', parents: ['parent'], payload: '' }],
  target: [{ id: 'parent', parents: ['outside'], payload: 'new' }, { id: 'child', parents: ['parent'], payload: '' }],
};
validateScenario(faultBase);
const comparisons = [], disagreements = [], selected = [], labels = {};
function record(label, c, expected) {
  const wanted = verdict(c); if (expected !== undefined) assert.equal(wanted.ok, expected, label);
  const authority = c.failures?.length === 0;
  if (authority !== wanted.ok) disagreements.push({ label, id: c.scenarioId, authority, independent: wanted, failures: c.failures });
  comparisons.push({ label, raw: stripped(c), expected: wanted.ok });
  labels[label] = (labels[label] ?? 0) + 1;
}
const original = read('/record/grading/result.json');
for (const c of original.cells) record('recorded-service', c, true);
const baseline = read('/record/grading/checker-grade/cases/cases.json');
for (let i = 0; i < baseline.cases.length; i++) for (const c of baseline.cases[i].cells) {
  comparisons.push({ label: 'recorded-checker-cell', raw: c, expected: verdict(c).ok });
  labels['recorded-checker-cell'] = (labels['recorded-checker-cell'] ?? 0) + 1;
}
for (const [i, s] of scenarios.entries()) {
  record('submitted-fresh', await execute(s, subject), true);
  if (i % 9 === 0) for (const name of ['planned', 'broad', 'idempotent']) record('valid-' + name, await execute(s, strategy(name)), true);
  if (i % 51 === 0 || s.id.startsWith('empty') || s.id.startsWith('boundary-')) selected.push(s);
}
for (const uncertain of [0, 1, 2]) for (const name of faults) {
  const s = { ...copy(faultBase), uncertain, id: `${name}-u${uncertain}` };
  record('fault-' + name, await execute(s, strategy(name)), name === 'abandon-absent-restore' ? uncertain !== 2 : false);
}
// Independent synchronous API: uncertainty is per call/incarnation, mixed within a run;
// both retryable non-landing calls and landed UNKNOWN occur, with 0..2 pending receipts.
async function independent(s, program) {
  const state = new Map(s.current.map(r => [r.id, copy(r)])), gens = new Map(s.current.map(r => [r.id, 1]));
  const receipts = new Map(), operations = [], observations = [], counters = new Map();
  let calls = 0, serial = 0;
  const view = { scope: copy(s.scope), target: copy(s.target), storage: '/tmp/independent-storage' };
  async function invoke(method, args) {
    assert(++calls <= 4000, 'public API budget'); args = copy(args); let value;
    if (method === 'inspect') value = { resources: shuffle([...state.values()]).map(r => ({ ...copy(r), parents: shuffle(r.parents), generation: gens.get(r.id) })) };
    else if (method === 'receipt') {
      const receipt = receipts.get(args.token); assert(receipt, 'unknown audit receipt');
      value = receipt.left-- > 0 ? { status: 'PENDING', token: args.token } : copy(receipt.value);
    } else {
      const op = { method, args, before: copy([...state.values()]) }; operations.push(op);
      // Legality derives from the standalone oracle, with a no-op target matching pre-state.
      const legality = verdict({ requestedScope: s.scope, requestedTarget: op.before.filter(r => s.scope.includes(r.id)), initialResources: op.before, actual: op.before, operations: [op] });
      if (!legality.ok) value = { status: 'REJECTED' };
      else {
        const r = args.resource, id = method === 'create' ? r.id : args.id;
        const key = method + ':' + id + ':' + (gens.get(id) ?? 0) + ':' + state.has(id);
        const attempt = counters.get(key) ?? 0; counters.set(key, attempt + 1);
        const landed = attempt >= 2 || random() > .45;
        if (landed) { if (method === 'remove') state.delete(id); else { if (!state.has(id)) gens.set(id, (gens.get(id) ?? 0) + 1); state.set(id, copy(r)); } }
        if (landed && random() < .3) value = { status: 'DONE' };
        else {
          const token = 'call-' + ++serial;
          const result = landed ? { status: 'DONE', ...(method === 'create' ? { generation: gens.get(id) } : {}) } : { status: 'ABSENT' };
          receipts.set(token, { left: Math.floor(random() * 3), value: result }); value = { status: 'UNKNOWN', token };
        }
      }
    }
    observations.push({ seq: observations.length, method, request: args, value: copy(value) }); return copy(value);
  }
  const api = Object.fromEntries(['inspect', 'create', 'remove', 'receipt'].map(method => [method, args => invoke(method, args)]));
  const report = await program.run(view, api);
  const cell = { scenarioId: s.id, requestedScope: s.scope, requestedTarget: s.target, initialResources: s.current, actual: [...state.values()], operations, observations, reports: [report] };
  const expected = verdict(cell); assert.equal(expected.ok, true, 'independent API ' + s.id);
  comparisons.push({ label: 'independent-API', raw: copy(cell), expected: expected.ok }); labels['independent-API'] = (labels['independent-API'] ?? 0) + 1;
}
for (const s of scenarios.filter((_, i) => i % 17 === 0)) for (const p of [subject, strategy('planned'), strategy('broad')]) await independent(s, p);
const generationProbes = [];
for (const uncertain of [0, 1, 2]) {
  const c = await execute({ ...copy(faultBase), uncertain, id: 'generation-roundtrip-' + uncertain }, strategy('generation-roundtrip'));
  const wanted = verdict(c), actual = await checker({ cases: [{ token: 'generation-probe', cells: [stripped(c)] }] });
  generationProbes.push({ uncertain, independent: wanted, authorityFailures: c.failures, submittedChecker: actual.verdicts['generation-probe'].ok, cell: c });
}
function freeze(x) { if (x && typeof x === 'object' && !Object.isFrozen(x)) { for (const v of Object.values(x)) freeze(v); Object.freeze(x); } return x; }
const mismatches = [], checkerTimes = [];
let judgements = 0;
const specials = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', '', '0', 'prototype', '\u0000', '\ud83d\ude80'];
const selectedCases = [], selectedWanted = [];
for (let start = 0; start < comparisons.length; start += 64) {
  const batch = comparisons.slice(start, start + 64);
  const cases = batch.map((row, i) => ({ token: i < specials.length ? specials[i] : 'opaque:' + i, cells: [copy(row.raw)] }));
  const input = freeze({ cases }), before = JSON.stringify(input), began = performance.now();
  const a = await checker(input), b = await checker(input);
  assert.equal(JSON.stringify(input), before, 'input mutation'); assert.deepEqual(a, b, 'nondeterministic');
  const elapsed = performance.now() - began; assert(elapsed < 60000); checkerTimes.push(elapsed);
  assert.equal(Object.keys(a.verdicts).length, cases.length);
  const varied = freeze({ cases: [...cases].reverse().map(c => ({ token: c.token, cells: c.cells.map(cell => ({ ...copy(cell), scenarioId: 'opaque', reports: [{ complete: false }], actual: shuffle(cell.actual).map(r => ({ ...r, parents: shuffle(r.parents) })), initialResources: shuffle(cell.initialResources), requestedTarget: shuffle(cell.requestedTarget) })) })) });
  const v = await checker(varied);
  for (let i = 0; i < batch.length; i++) {
    const ok = a.verdicts[cases[i].token]?.ok;
    assert.equal(v.verdicts[cases[i].token]?.ok, ok, 'metadata/order dependence');
    if (ok !== batch[i].expected) mismatches.push({ index: start + i, label: batch[i].label, scenarioId: batch[i].raw.scenarioId, expected: batch[i].expected, actual: ok, reasons: a.verdicts[cases[i].token]?.reasons });
    judgements += 3;
  }
  if (start === 0 || batch.some(x => x.label.startsWith('fault-'))) for (let i = 0; i < cases.length; i++) { selectedCases.push({ ...cases[i], token: 'protected:' + selectedCases.length }); selectedWanted.push(batch[i].expected); }
}
// Single-candidate grouping must reject for one bad cell in any position, while
// candidates that happen to pass some cells must retain those per-cell true verdicts.
const good = comparisons.find(x => x.label === 'submitted-fresh').raw;
const bad = comparisons.find(x => x.label === 'fault-extra-scoped').raw;
for (const cells of [[good, bad], [bad, good], [good, good, bad], [good, good]]) {
  const expected = cells.every(c => verdict(c).ok), input = freeze({ cases: [{ token: '__proto__', cells: copy(cells) }] });
  assert.equal((await checker(input)).verdicts.__proto__.ok, expected); judgements++;
}
const preservedBaseline = await checker(freeze(copy(baseline)));
const baselineCorrect = baseline.cases.filter(c => preservedBaseline.verdicts[c.token]?.ok === c.cells.every(cell => verdict(cell).ok)).length;
assert.equal(baselineCorrect, baseline.cases.length);
const result = {
  seed: '0x20260911', providerCallsMade: 0, freshScenarios: scenarios.length, labels,
  cellComparisons: comparisons.length, checkerJudgements: judgements, positiveCells: comparisons.filter(x => x.expected).length,
  negativeCells: comparisons.filter(x => !x.expected).length, baselineCandidatesCorrect: baselineCorrect,
  maxSubmittedApiCalls: Math.max(...comparisons.filter(x => x.label === 'submitted-fresh').map(x => x.raw.observations.length)),
  maxCheckerDoubleInvocationMs: Math.max(...checkerTimes), mismatches, authorityDisagreements: disagreements,
  generationProbes, faultBase, faultNames: faults,
  fixtures: { scenarios: selected, cases: selectedCases, wanted: selectedWanted },
};
process.stdout.write(JSON.stringify(result));
