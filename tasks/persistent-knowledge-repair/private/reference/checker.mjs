import { equal, sorted, verdicts } from './checker-utils.mjs';

function normalized(effect) { return {...effect, lineage: sorted(effect.lineage)}; }
// Resolve all available nodes to a fixed point, independently of the grader's recursive walk.
function values(records) {
  const out = new Map();
  for (let pass = 0; pass <= records.size; pass++) for (const [id, r] of records) {
    if (r.retracted || out.has(id)) continue;
    if (r.kind === 'source') out.set(id, {value:r.value, approved:r.authority === 'approved', lineage:[{id, revision:r.revision}]});
    else if (r.parents.every(p => out.has(p))) {
      const parents = r.parents.map(p => out.get(p));
      const lineage = new Map([[id, r.revision]]);
      for (const p of parents) for (const l of p.lineage) lineage.set(l.id, l.revision);
      out.set(id, {value:parents.map(p => p.value).join(r.separator), approved:parents.every(p => p.approved), lineage:[...lineage].map(([id, revision]) => ({id, revision}))});
    }
  }
  return out;
}
export function check(cell) {
  const records = new Map(), expected = new Map(), observedEffects = [], observedReports = [];
  if (cell.runs.length !== cell.jobs.length) return false;
  for (const [i, input] of cell.jobs.entries()) {
    for (const r of input.updates) if (!records.has(r.id) || records.get(r.id).revision < r.revision) records.set(r.id, r);
    const resolved = values(records), decisions = [], execution = cell.runs[i];
    if (execution.job !== input.job) return false;
    for (const request of input.requests) {
      const prior = expected.get(request.id), value = resolved.get(request.root);
      const allowed = !!prior || !!value?.approved && input.grants.some(g => g.destination === request.destination && g.version === request.grantVersion && g.allowed);
      const lineage = sorted(prior?.lineage ?? value?.lineage ?? []);
      if (allowed && !prior) expected.set(request.id, {id:request.id, destination:request.destination, value:value.value, lineage});
      decisions.push({id:request.id, outcome:allowed ? 'published' : 'blocked', lineage});
    }
    for (const o of execution.observations) {
      if (o.method === 'publish') observedEffects.push(o.request);
      if (o.method === 'receipts' && !equal(o.value, observedEffects)) return false;
    }
    if (!equal(observedEffects, execution.effects)) return false;
    if (!equal(sorted(observedEffects.map(normalized)), sorted([...expected.values()].map(normalized)))) return false;
    const reports = execution.reports.map(r => ({...r, decisions:r.decisions.map(d => ({...d, lineage:sorted(d.lineage)}))}));
    if (!equal(reports, [{job:input.job, decisions}])) return false;
    observedReports.push(...execution.reports);
  }
  return equal(observedEffects, cell.effects) && equal(observedReports, cell.reports);
}
export const run = ({cases}) => verdicts(cases, check);
