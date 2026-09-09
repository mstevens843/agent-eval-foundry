import { equal, verdicts } from './checker-utils.mjs';

// Enumerate combinations directly; the service and grader use different search representations.
function choices(node, resources, used, history) {
  const q = node.request, selected = [], answer = [];
  function visit(start) {
    if (selected.length === q.units) {
      const zones = new Set(selected.map(r => r.zone));
      if (zones.size < q.minZones) return;
      if (q.antiWith.some(a => selected.some(r => history.get(a)?.includes(r.id)))) return;
      if (q.shareZoneWith !== null) {
        const allowed = new Set((history.get(q.shareZoneWith) ?? []).map(id => resources.find(r => r.id === id)?.zone));
        if (selected.some(r => !allowed.has(r.zone))) return;
      }
      answer.push(selected.map(r => r.id)); return;
    }
    for (let i = start; i < resources.length; i++) {
      const r = resources[i];
      if (used.get(r.id) >= r.capacity || !q.tags.every(t => r.tags.includes(t))) continue;
      selected.push(r); visit(i + 1); selected.pop();
    }
  }
  visit(0); return answer;
}
function advance(used, allocation) {
  const result = new Map(used);
  for (const id of allocation) result.set(id, result.get(id) + 1);
  return result;
}
function possible(node, resources, used, history) {
  for (const allocation of choices(node, resources, used, history)) {
    const h = new Map(history).set(node.id, allocation), u = advance(used, allocation);
    if (node.children.every(child => possible(child, resources, u, h))) return true;
  }
  return false;
}
export function check(cell) {
  const { resources, tree } = cell.view;
  const nodes = new Map();
  function index(n) { nodes.set(n.id, n); n.children.forEach(index); }
  index(tree);
  let used = new Map(resources.map(r => [r.id, r.used])), history = new Map();
  let current = null, previous = null, placed = false, position = -1;
  const actual = [];
  for (const o of cell.observations) {
    if (o.method === 'next') {
      if (current && !placed) return false;
      position++;
      if (o.value === null) {
        if (!previous || previous.children.length) return false;
        current = null; continue;
      }
      const n = nodes.get(o.value);
      if (!n || (!previous ? n.id !== tree.id : !previous.children.some(c => c.id === n.id))) return false;
      previous = current = n; placed = false;
    } else if (o.method === 'place' && o.value?.stored === true) {
      const { node, resources: allocation } = o.request;
      if (!current || placed || node !== current.id || !Array.isArray(allocation)) return false;
      const legal = choices(current, resources, used, history).some(c => equal([...c].sort(), [...allocation].sort()));
      if (!legal) return false;
      used = advance(used, allocation); history = new Map(history).set(node, allocation);
      if (!current.children.every(c => possible(c, resources, used, history))) return false;
      actual.push({after: position, node, resources: allocation}); placed = true;
    }
  }
  return !!previous && !previous.children.length && placed && equal(actual, cell.actual);
}
export const run = ({cases}) => verdicts(cases, check);
