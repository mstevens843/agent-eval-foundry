// Provider-free author regression: execute real candidates, then judge each raw cell independently.
// This in-process driver preserves RPC value boundaries but does not establish process isolation.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const [rootArg, outputArg, mode] = process.argv.slice(2);
if (!rootArg || !outputArg) throw Error('Usage: audit-queue-eleven-fifteen.mjs SOURCE_ROOT FRESH_OUTPUT [--baseline]');
const root = resolve(rootArg), output = resolve(outputArg);
mkdirSync(output, { recursive: false });
const ids = ['capacity-maintenance-repair', 'partial-release-repair', 'verified-installation-repair', 'compatible-rollout-repair', 'ticket-consolidation-repair'];
const load = path => import(pathToFileURL(path));
const strip = ({ checks, failures, expected, truth, groundTruth, status, ...raw }) => raw;
const results = [], probes = [], captures = [];
const reverseObjects = x => Array.isArray(x) ? x.map(reverseObjects) : x && typeof x === 'object'
  ? Object.fromEntries(Object.entries(x).reverse().map(([k,v]) => [k, reverseObjects(v)])) : x;

for (const id of ids.filter(id => !process.env.AUDIT_TASKS || process.env.AUDIT_TASKS.split(',').includes(id))) {
  const scratch = mkdtempSync(join(tmpdir(), 'successor-audit-'));
  try {
    const authority = join(scratch, 'authority');
    cpSync(join(root, 'tasks', id, 'private'), authority, { recursive: true });
    cpSync(join(root, 'tasks/portfolio-runtime/adapter.mjs'), join(authority, 'adapter.mjs'));
    const domain = await load(join(authority, 'domain.mjs'));
    const bank = (await load(join(authority, 'scenarios.mjs'))).scenarios();
    assert.equal(new Set(bank.map(s => s.id)).size, bank.length, id + ': scenario ID collision');
    const ref = (await load(join(authority, 'reference/entry.mjs'))).subject;
    const checker = await load(join(authority, 'reference/checker.mjs'));
    async function execute(scenario, program) {
      const storage = mkdtempSync(join(scratch, 'storage-'));
      try {
        const cell = await domain.runScenario(structuredClone(scenario), async adapter => {
          for (let i = 0; i < adapter.count; i++) {
            const frame = adapter.begin(i);
            const api = Object.fromEntries(frame.facades[0].methods.map(method => [method,
              async (...args) => structuredClone(await adapter.invoke('api.' + method, structuredClone(args)))]));
            await adapter.report(await program.run(structuredClone(frame.view), api));
          }
          return adapter.result();
        }, storage);
        return { scenarioId: scenario.id, ...cell };
      } finally { rmSync(storage, { recursive: true, force: true }); }
    }
    async function judge(cell, name, expected) {
      const token = randomUUID(), raw = JSON.parse(JSON.stringify(strip(cell)));
      const input = { cases: [{ token, cells: [raw] }] }, before = structuredClone(input);
      const a = await checker.run(input), b = await checker.run(input);
      assert.deepEqual(input, before, id + ': mutated checker input');
      assert.deepEqual(a, b, id + ': nondeterministic checker');
      const actual = a.verdicts[token].ok;
      const varied = reverseObjects(raw);
      varied.scenarioId = 'opaque-' + randomUUID();
      // Rollout reports are required semantic output; other reports are diagnostics.
      if (id !== 'compatible-rollout-repair') varied.reports = [{ complete: !actual }];
      const v = await checker.run({ cases: [{ token: '__proto__', cells: [varied] }, { token: 'constructor', cells: [raw] }] });
      assert.equal(v.verdicts.__proto__.ok, actual, id + ': metadata/order dependence');
      assert.equal(v.verdicts.constructor.ok, actual, id + ': candidate dependence');
      if (actual !== expected) results.push({ id, name, scenario: cell.scenarioId, expected, actual, serviceFailures: cell.failures });
      return actual;
    }
    const manifest = JSON.parse(readFileSync(join(authority, 'control-manifest.json')));
    const variants = existsSync(join(authority, 'variants')) ? readdirSync(join(authority, 'variants')) : [];
    for (const candidate of [{ name: 'reference' }, { name: 'alternative' }, ...variants.map(name => ({ name: 'variants/' + name })), ...manifest.filter(c => !c.isolation).map(control => ({ name: control.id, control }))]) {
      const dir = join(scratch, 'candidate-' + randomUUID());
      if (candidate.control) {
        cpSync(join(authority, 'reference'), dir, { recursive: true });
        for (const [target, source] of Object.entries(candidate.control.overlay)) {
          mkdirSync(dirname(join(dir, target)), { recursive: true }); cpSync(join(authority, source), join(dir, target));
        }
      } else {
        // Positive variants overlay public, matching the protected harness.
        cpSync(join(root, 'tasks', id, 'public'), dir, { recursive: true });
        cpSync(join(authority, candidate.name), dir, { recursive: true });
      }
      const program = (await load(join(dir, 'entry.mjs'))).subject;
      const cells = [];
      for (const scenario of bank) {
        const cell = await execute(scenario, program);
        cells.push(cell);
        await judge(cell, candidate.name, cell.failures.length === 0);
      }
      if (!candidate.control) assert(cells.every(c => c.failures.length === 0), id + '/' + candidate.name + ': valid strategy rejected by service: ' + JSON.stringify(cells.filter(c => c.failures.length).map(c => [c.scenarioId,c.failures])));
      else {
        assert(cells.some(c => c.failures.includes(candidate.control.check)), id + '/' + candidate.name + ': control does not hit declared check');
        if (candidate.control.clean) assert.equal(cells.find(c => c.scenarioId === candidate.control.clean)?.failures.length, 0, candidate.name + ': clean witness');
      }
      captures.push({ id, name: candidate.name, cells });
      console.log(JSON.stringify({ id, candidate: candidate.name, cells: cells.length, rejected: cells.filter(c => c.failures.length).length }));
    }
    async function probe(name, scenario, program, expected, extra) {
      const cell = await execute(scenario, program);
      const accepted = await judge(cell, name, expected);
      let extraError = null;
      try { extra?.(cell); } catch (e) { extraError = e.message; }
      const row = { id, name, expected, service: cell.failures.length === 0, checker: accepted, serviceFailures: cell.failures, extraError };
      probes.push(row); captures.push({ id, name, cells: [cell] });
      console.log(JSON.stringify(row));
    }
    if (id === 'capacity-maintenance-repair') {
      const s = structuredClone(bank.find(s => s.id === 'case-025'));
      await probe('readiness-with-availability-slack', s, { run: async (v,api) => {
        // Leave one originally active row provisioning after completing the maintenance plan.
        return ref.run(v, { ...api, finish: async x => {
          const p = v.placement.find(p => v.services.find(s => s.id === p.service).min < v.placement.filter(q => q.service === p.service).length);
          await api.remove(p); await api.add(p); return api.finish(x);
        } });
      } }, false, c => assert.deepEqual(c.failures, ['readiness']));
    }
    if (id === 'partial-release-repair') {
      await probe('transient-non-string-resource-payload', bank.find(s=>s.id==='case-trivial-empty'), {run:async (v,api)=> {
        const id=v.scope[0];await api.create({resource:{id,parents:[],payload:42}});await api.remove({id});
      }}, false);
      const s = { id: 'receipt-generation', current: [], scope: ['x'], target: [{id:'x',parents:[],payload:'ok'}], uncertain: 1 };
      await probe('call-bound-generation-receipts', s, { run: async (v,api) => {
        const r = await api.create({resource:v.target[0]});
        await api.receipt({token:r.token}); await api.receipt({token:r.token});
        await api.inspect({});
      } }, true, c => {
        const receipt = c.observations.findLast(o => o.method === 'receipt').value;
        const resource = c.observations.findLast(o => o.method === 'inspect').value.resources[0];
        assert.equal(receipt.generation, resource.generation, 'create receipt reports another generation');
      });
    }
    if (id === 'ticket-consolidation-repair') {
      const s = structuredClone(bank.find(s => s.id === 'case-solo'));
      s.rows[0].owner = 'A:care'; s.rows[0].labels.push(s.marker);
      await probe('already-correct-no-write', s, ref, true);
      await probe('status-drift-without-redundant-write', { ...s, statusFlipKey: JSON.stringify(['A','one']) }, ref, true);
      await probe('completed-then-execution-error', bank.find(s => s.id === 'case-solo'), { run: async (v,api) => { await ref.run(v,api); throw Error('candidate bug after completion'); } }, false);
      await probe('completed-then-budget-exhaustion', { ...bank.find(s => s.id === 'case-solo'), opBudget: 12 }, { run: async (v,api) => { await ref.run(v,api); for (let i=0;i<4001;i++) await api.read({tenant:'A',id:'one'}); } }, false);
    }
    if (id === 'verified-installation-repair') {
      const base = structuredClone(bank.find(s => s.id === 'case-047'));
      base.attempts[0].crash = null;
      const first = base.attempts[0].release;
      await probe('skip-earlier-available-release', base, { run: (v,api) => v.release === first ? {} : ref.run(v,api) }, false);
      await probe('wrong-earlier-digest-list', base, { run: (v,api) => ref.run(v, { ...api, finish: x => api.finish(v.release === first ? {...x,digests:[]} : x) }) }, false);
      await probe('refuse-earlier-available-release', base, { run: (v,api) => v.release === first ? api.finish({status:'unavailable',digests:[]}) : ref.run(v,api) }, false);
      const one = structuredClone(bank[0]);
      one.initial = domain.expected(one.attempts[0]);
      await probe('equal-bytes-without-activation', one, {run: async () => ({})}, false);
    }
    if (id === 'compatible-rollout-repair') {
      for (const method of ['bind','warm','cleanup']) {
        const scenario = structuredClone(bank.find(s => s.id === 'case-crash-rollback-0'));
        scenario.jobs[0].crashAfter = {method,count:1};
        await probe('rollback-redelivery-after-' + method, scenario, ref, true);
      }
      await probe('null-report-is-not-an-interruption', bank[0], {run: async () => null}, false);
      await probe('warm-before-healthy-current-binding', bank[0], {run: async (v,api) => {
        let injected = false;
        return ref.run(v, {...api, stage: async x => {
          const before = (await api.inventory({})).find(s => s.id === x.service);
          const d = await api.stage(x);
          if (!injected) { injected = true; await api.warm({service:x.service,release:before.alias.release,abi:before.abi}); }
          return d;
        }});
      }}, false);
      await probe('cleanup-live-owned-record-without-another-read', bank[0], {run: (v,api) => ref.run(v, {...api, stage: async x => {
        const d = await api.stage(x); await api.cleanup({id:'created-1'}); return d;
      }})}, true);
    }
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}
const summary = { providerCallsMade: 0, protectedExecution: false, cellComparisons: captures.reduce((n,c) => n+c.cells.length,0), discrepancies: results, probes,
  passed: results.length === 0 && probes.every(p => p.service === p.expected && p.checker === p.expected && !p.extraError) };
writeFileSync(join(output,'summary.json'), JSON.stringify(summary,null,2)+'\n');
writeFileSync(join(output,'executed-cells.json'), JSON.stringify(captures)+'\n');
console.log(JSON.stringify(summary));
if (!summary.passed && mode !== '--baseline') process.exitCode = 1;
