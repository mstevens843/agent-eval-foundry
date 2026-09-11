// Independently verify server bookkeeping in the complete protected checker corpus.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
assert(process.argv[2], 'Usage: verify-partial-release-generation-traces.mjs CORRECTION_OUTPUT');
const out = resolve(process.argv[2]);
const path = join(out, 'reference-checker/cases/cases.json');
const bytes = readFileSync(path), { cases } = JSON.parse(bytes);
assert.equal(cases.length, 22);
let cells = 0, inspectedResources = 0, receiptResponses = 0, suppliedGenerations = 0;
const plain = ({ generation, ...resource }) => resource;
for (const candidate of cases) for (const cell of candidate.cells) {
  cells++;
  const generations = new Map(cell.initialResources.map(resource => [resource.id, 1]));
  const receipts = new Map();
  let graph = cell.initialResources, index = 0;
  for (const resource of [...cell.actual, ...cell.operations.flatMap(operation => operation.before)])
    assert(!Object.hasOwn(resource, 'generation'), 'generation leaked into authoritative content');
  for (const observation of cell.observations) {
    if (observation.method === 'inspect') {
      assert.deepEqual(observation.value.resources.map(plain), graph);
      for (const resource of observation.value.resources) {
        assert.equal(resource.generation, generations.get(resource.id)); inspectedResources++;
      }
    } else if (['create', 'remove'].includes(observation.method)) {
      const operation = cell.operations[index];
      assert.equal(operation.method, observation.method);
      assert.deepEqual(operation.args, observation.request);
      assert.deepEqual(operation.before, graph);
      const after = cell.operations[index + 1]?.before ?? cell.actual;
      const id = operation.method === 'create' ? operation.args.resource?.id : operation.args.id;
      const existed = graph.some(resource => resource.id === id), exists = after.some(resource => resource.id === id);
      if (operation.method === 'create' && !existed && exists) generations.set(id, (generations.get(id) ?? 0) + 1);
      if (operation.method === 'create' && Object.hasOwn(operation.args.resource ?? {}, 'generation')) suppliedGenerations++;
      if (observation.value.status === 'UNKNOWN') {
        assert(!receipts.has(observation.value.token));
        receipts.set(observation.value.token, { method: operation.method,
          generation: exists ? generations.get(id) : (generations.get(id) ?? 0) + 1, terminal: null });
      }
      graph = after; index++;
    } else if (observation.method === 'receipt') {
      receiptResponses++;
      const bound = receipts.get(observation.request.token), value = observation.value;
      if (value.status === 'DONE' && bound?.method === 'create') assert.equal(value.generation, bound.generation);
      else assert(!Object.hasOwn(value, 'generation'));
      if (bound && value.status !== 'PENDING') {
        if (bound.terminal) assert.deepEqual(value, bound.terminal);
        bound.terminal = value;
      }
    } else assert.fail('unexpected service method');
  }
  assert.equal(index, cell.operations.length);
  assert.deepEqual(graph, cell.actual);
}
assert.equal(cells, 22 * 65); assert(suppliedGenerations > 0 && receiptResponses > 0 && inspectedResources > 0);
const summary = { schemaVersion: 1, passed: true, providerCallsMade: 0, protectedCells: cells,
  inspectedResources, receiptResponses, suppliedGenerations,
  counterRule: 'Increment only when an absent resource becomes present; retain counters after removal.',
  storedContentHasNoGeneration: true, receiptsRemainCallBound: true,
  casesSha256: createHash('sha256').update(bytes).digest('hex') };
writeFileSync(join(out, 'generation-traces.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(summary));
