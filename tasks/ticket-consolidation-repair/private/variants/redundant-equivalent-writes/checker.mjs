import { equal, verdicts } from './checker-utils.mjs';
const key = r => JSON.stringify([r.tenant, r.id]);
const labels = xs => [...xs].sort();
export function check(c) {
  const initial = new Map(c.initialRows.map(r => [key(r), r]));
  const wanted = new Set(c.initialRows.filter(r => c.allowedTenants.includes(r.tenant) && r.status === 'open').map(key));
  // Every row the candidate ever attempted to write must be a member of the frozen selection,
  // and every member of the frozen selection must have been attempted at least once — a live
  // status re-read must never have been used to silently drop a row from the population.
  const touched = new Set((c.calls || []).map(call => key(call.request)));
  if (![...touched].every(k => wanted.has(k))) return false;
  if (c.execution?.outcome !== 'returned' || c.operationCount > c.operationBudget) return false;
  // Concurrent status drift is an external fact (like `edits` below), not a candidate verdict:
  // it records what a selected row's status was externally forced to, independent of anything
  // the candidate did. Absent an entry, the row's expected final status is its original one.
  const flips = new Map((c.concurrentStatusFlips || []).map(f => [key(f), f.status]));
  const state = new Map(c.initialRows.map(r => [key(r), structuredClone(r)]));
  const edits = new Map(c.edits);
  for (const call of c.calls) {
    const u = call.request, k = key(u), before = call.before;
    if (!wanted.has(k) || !before || !u.patch ||
        !Object.keys(u.patch).every(k => ['owner','labels'].includes(k)) ||
        typeof u.patch.owner !== 'string' || !Array.isArray(u.patch.labels) ||
        !u.patch.labels.every(label => typeof label === 'string')) return false;
    const status = before.revision === u.revision ? 'APPLIED' : 'CONFLICT';
    if (call.status !== status) return false;
    if (status === 'APPLIED') {
      if (new Set(u.patch.labels).size !== u.patch.labels.length ||
          !before.labels.every(x => u.patch.labels.includes(x))) return false;
      state.set(k, {...before, ...u.patch, revision:before.revision + 1});
    } else state.set(k, before);
  }
  // A live read can expose a host status edit even when an already-correct row needs no write.
  for (const [k, status] of flips) if (state.has(k)) state.get(k).status = status;
  const actual = new Map(c.actual.map(r => [key(r), r]));
  if (actual.size !== c.actual.length || actual.size !== initial.size) return false;
  for (const [k, before] of initial) {
    const after = actual.get(k);
    if (!after) return false;
    if (!wanted.has(k)) { if (!equal(before,after)) return false; continue; }
    const count = edits.get(k) ?? 0;
    const keep = new Set([...before.labels,c.requestedMarker]);
    for(let i=0;i<count;i++) keep.add(`concurrent-${i}`);
    const expectedStatus = flips.get(k) ?? before.status;
    if (after.owner !== c.directory[before.tenant] ||
        !equal(labels(after.labels),labels([...keep])) || after.status !== expectedStatus ||
        after.note !== (count ? `edited-${count-1}` : before.note) ||
        !equal(after,state.get(k))) return false;
  }
  return true;
}
export const run = ({cases}) => verdicts(cases,check);
