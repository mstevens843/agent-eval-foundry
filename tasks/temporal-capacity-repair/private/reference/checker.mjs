import { equal, sorted, verdicts } from './checker-utils.mjs';

export function check(cell) {
  const {queries, records} = cell.publicInput;
  const expected = queries.map(q => {
    const latest = new Map();
    for (const r of records) if (r.series === q.series && r.knownAt <= q.knownAt) {
      if (!latest.has(r.key) || latest.get(r.key).revision < r.revision) latest.set(r.key, r);
    }
    let total = 0n;
    for (const r of latest.values()) if (r.value !== null) {
      const width = Math.max(0, Math.min(q.to, r.to) - Math.max(q.from, r.from));
      total += BigInt(width) * BigInt(r.value);
    }
    return {id: q.id, total: total.toString()};
  });
  const cursors = new Set([null]), writes = [];
  let exhausted = false;
  for (const o of cell.observations) {
    if (o.method === 'fetch' && cursors.has(o.request.cursor)) {
      if (o.value.next === null) exhausted = true; else cursors.add(o.value.next);
    }
    if (o.method === 'record' && o.value?.stored === true) writes.push(o.request);
  }
  return exhausted && equal(writes, cell.writes) && equal(sorted(writes), sorted(expected));
}
export const run = ({cases}) => verdicts(cases, check);
