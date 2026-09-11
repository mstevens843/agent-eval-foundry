// Author-only API regressions. Uses real domain logic with copied RPC values;
// protected execution and isolation are validated separately by the package runner.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [sourceArg, previousArg, outputArg] = process.argv.slice(2);
assert(sourceArg && previousArg && outputArg, 'Usage: regress-partial-release-generation.mjs SOURCE PREVIOUS_SOURCE FRESH_OUTPUT');
const source = resolve(sourceArg), previous = resolve(previousArg), out = resolve(outputArg);
mkdirSync(out, { recursive: false });
const scratch = mkdtempSync(join(tmpdir(), 'partial-generation-regression-'));
const load = path => import(pathToFileURL(path));
const resource = { id: 'item', parents: ['root'], payload: 'kept' };
const fixture = (uncertain, present = true) => ({ id: 'generation-' + uncertain + '-' + present,
  scope: ['item'], target: [structuredClone(resource)], uncertain,
  current: [{ id: 'root', parents: [], payload: 'outside' }, ...(present ? [structuredClone(resource)] : [])] });
const captures = [], mutations = [];
const strip = ({ checks, failures, expected, truth, groundTruth, status, ...raw }) => raw;
try {
  async function domain(root, name, transform = value => value) {
    const directory = join(scratch, name);
    cpSync(join(root, 'tasks/partial-release-repair/private'), directory, { recursive: true });
    cpSync(join(root, 'tasks/portfolio-runtime/adapter.mjs'), join(directory, 'adapter.mjs'));
    const path = join(directory, 'domain.mjs');
    writeFileSync(path, transform(readFileSync(path, 'utf8')));
    return load(path);
  }
  const current = await domain(source, 'current'), old = await domain(previous, 'previous');
  const checker = await load(join(source, 'tasks/partial-release-repair/private/reference/checker.mjs'));
  const oldChecker = await load(join(previous, 'tasks/partial-release-repair/private/reference/checker.mjs'));
  async function execute(authority, scenario, program) {
    const storage = mkdtempSync(join(scratch, 'storage-'));
    try {
      return { scenarioId: scenario.id, ...await authority.runScenario(structuredClone(scenario), async adapter => {
        for (let i = 0; i < adapter.count; i++) {
          const frame = adapter.begin(i);
          const api = Object.fromEntries(frame.facades[0].methods.map(method => [method,
            async (...args) => structuredClone(await adapter.invoke('api.' + method, structuredClone(args)))]));
          await adapter.report(await program(structuredClone(frame.view), api));
        }
        return adapter.result();
      }, storage) };
    } finally { rmSync(storage, { recursive: true, force: true }); }
  }
  const accepted = async (judge, cells) => (await judge.run({ cases: [{ token: '__proto__', cells: cells.map(strip) }] })).verdicts.__proto__.ok;
  for (const uncertain of [0, 1, 2]) {
    const program = async (_view, api) => {
      const item = (await api.inspect({})).resources.find(row => row.id === 'item');
      await api.create({ resource: item });
    };
    const before = await execute(old, fixture(uncertain), program);
    const after = await execute(current, fixture(uncertain), program);
    assert(before.failures.includes('dependency_order'));
    assert.equal(after.failures.length, 0); assert(await accepted(checker, [after]));
    assert.equal(await accepted(oldChecker, [after]), false);
    captures.push({ kind: 'exact-reproducer', uncertain, before, after });
  }
  async function generations(_view, api) {
    const receipts = [];
    const item = async () => (await api.inspect({})).resources.find(row => row.id === 'item');
    async function settle(method, args, generation) {
      for (let retry = 0; retry < 2; retry++) {
        const response = await api[method](args);
        if (response.status === 'DONE') return;
        assert.equal(response.status, 'UNKNOWN', 'legal generation-bearing request was rejected');
        let terminal;
        for (let poll = 0; poll < 3; poll++) {
          const receipt = await api.receipt({ token: response.token });
          if (receipt.status === 'PENDING') { assert(!Object.hasOwn(receipt, 'generation')); continue; }
          terminal = receipt; break;
        }
        assert(terminal && ['DONE', 'ABSENT'].includes(terminal.status));
        if (method === 'create' && terminal.status === 'DONE') assert.equal(terminal.generation, generation);
        else assert(!Object.hasOwn(terminal, 'generation'));
        receipts.push({ token: response.token, terminal });
        if (terminal.status === 'DONE') return;
      }
      throw Error('legal operation did not settle');
    }
    if (!await item()) await settle('create', { resource: { ...resource, generation: 1000 } }, 1);
    const saved = await item(); assert.equal(saved.generation, 1);
    for (const supplied of [saved.generation, 0, -25, 1000, Number.MAX_SAFE_INTEGER]) {
      await settle('create', { resource: { ...saved, generation: supplied, parents: ['root', 'root'] } }, 1);
      assert.equal((await item()).generation, 1, 'idempotent create changed the server counter');
    }
    for (const next of [2, 3]) {
      await settle('remove', { id: 'item' }); assert.equal(await item(), undefined);
      await settle('create', { resource: { ...saved, generation: 1000 + next } }, next);
      assert.equal((await item()).generation, next, 'recreation trusted caller generation');
      await settle('create', { resource: saved }, next);
      assert.equal((await item()).generation, next, 'stale no-op create reset generation');
    }
    for (const receipt of receipts) assert.deepEqual(await api.receipt({ token: receipt.token }), receipt.terminal,
      'old call receipt changed after a later incarnation');
    return { receiptsChecked: receipts.length };
  }
  async function checkCounterCases(authority, retain = false) {
    for (const uncertain of [0, 1, 2]) for (const present of [false, true]) {
      const cell = await execute(authority, fixture(uncertain, present), generations);
      assert.deepEqual(cell.failures, []);
      for (const row of [...cell.actual, ...cell.operations.flatMap(op => op.before)])
        assert(!Object.hasOwn(row, 'generation'), 'caller bookkeeping leaked into stored content');
      assert(await accepted(checker, [cell]));
      if (retain) captures.push({ kind: 'counter-and-receipts', uncertain, present, cell });
    }
  }
  await checkCounterCases(current, true);
  const changes = [
    ['compare-generation-as-content', [['...content(r), parents:', '...r, parents:']]],
    ['store-caller-generation', [['actual.set(id, structuredClone(content(resource)))', 'actual.set(id, structuredClone(resource))']]],
    ['trust-caller-counter', [['generationOf.set(id, (generationOf.get(id) || 0) + 1)', 'generationOf.set(id, resource.generation ?? ((generationOf.get(id) || 0) + 1))']]],
    ['increment-counter-on-noop', [['if (!wasPresent) generationOf.set', 'if (true) generationOf.set']]],
    ['receipt-follows-current-incarnation', [
      ['tokens.set(token, { left: 1,', 'tokens.set(token, { id, left: 1,'],
      ['generation: r.generation }', 'generation: generationOf.get(r.id) }']]],
  ];
  for (const [name, replacements] of changes) {
    const mutant = await domain(source, name, text => {
      for (const [from, to] of replacements) { assert.equal(text.split(from).length, 2, name + ': mutation anchor'); text = text.replace(from, to); }
      return text;
    });
    let error = null;
    try { await checkCounterCases(mutant); } catch (failure) { error = failure.message; }
    assert(error, name + ' escaped the API regression');
    mutations.push({ name, caught: true, error });
  }
  for (const mode of ['wrong-payload', 'missing-parent', 'outside']) for (const uncertain of [0, 1, 2]) {
    const cell = await execute(current, fixture(uncertain), async (_view, api) => {
      const rows = (await api.inspect({})).resources;
      const request = { ...rows.find(row => row.id === (mode === 'outside' ? 'root' : 'item')), generation: 1000 };
      if (mode === 'wrong-payload') request.payload = 'illegal';
      if (mode === 'missing-parent') request.parents = ['absent-parent'];
      await api.create({ resource: request });
    });
    assert(cell.failures.includes(mode === 'outside' ? 'preservation' : 'dependency_order'));
    assert.equal(await accepted(checker, [cell]), false);
    const weakened = structuredClone(cell);
    weakened.operations = weakened.operations.filter(op => !Object.hasOwn(op.args.resource ?? {}, 'generation'));
    assert.equal(await accepted(checker, [weakened]), true, 'negative candidate does not expose generation-based request skipping');
    captures.push({ kind: 'illegal-request-still-rejected', mode, uncertain, cell });
  }
  mutations.push({ name: 'checker-compares-generation-as-content', caught: true, witnesses: 3 });
  mutations.push({ name: 'checker-skips-generation-bearing-requests', caught: true, witnesses: 9 });
  const summary = { schemaVersion: 1, providerCallsMade: 0, protectedExecution: false, passed: true,
    exactOldFailures: 3, exactCorrectedPasses: 3, counterAndReceiptScenarios: 6,
    illegalGenerationRequestsRejected: 9, mutations, originalPassDisposition: 'retain-pass' };
  writeFileSync(join(out, 'executed-cells.json'), JSON.stringify(captures) + '\n', { flag: 'wx' });
  writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(summary));
} finally { rmSync(scratch, { recursive: true, force: true }); }
