import { equal, sorted, verdicts } from './checker-utils.mjs';

export function check(cell) {
  const {partitions, width, lateness} = cell.view;
  const state = new Map(partitions.map(p => [p, {mark: -1000, idle: false, ended: false}]));
  const seen = new Set(), windows = new Map(), rows = [], late = [];
  let frontier = -1000;
  for (const [after, event] of cell.input.events.entries()) {
    const p = state.get(event.partition);
    if (event.kind === 'data') {
      const identity = JSON.stringify([event.partition, event.id]);
      if (seen.has(identity)) continue;
      seen.add(identity);
      const start = Math.floor(event.time / width) * width;
      if (start + width + lateness <= frontier) late.push({after, event});
      else {
        const id = JSON.stringify([start, event.key]);
        const row = windows.get(id) ?? {start, key: event.key, total: 0, count: 0};
        row.total += event.delta; row.count++; windows.set(id, row);
      }
    } else {
      if (event.kind === 'watermark') p.mark = event.value;
      else if (event.kind === 'idle') p.idle = true;
      else if (event.kind === 'resume') p.idle = false;
      else if (event.kind === 'end') p.ended = true;
      const remaining = [...state.values()].filter(s => !s.ended);
      const active = remaining.filter(s => !s.idle);
      if (!remaining.length) frontier = Infinity;
      else if (active.length) frontier = Math.max(frontier, Math.min(...active.map(s => s.mark)));
      for (const [id, row] of windows) if (row.start + width + lateness <= frontier) {
        rows.push({after, row}); windows.delete(id);
      }
    }
  }
  // Independently bind publication boundaries to the actual stream reads.
  let cursor = -1, exhausted = false;
  const actualRows = [], actualLate = [];
  for (const o of cell.observations) {
    if (o.method === 'next') {
      cursor++;
      if (!equal(o.value, cell.input.events[cursor] ?? null)) return false;
      if (o.value === null) exhausted = true;
    }
    if (o.method === 'emit' && o.value?.stored) actualRows.push({after:cursor, row:o.request.row});
    if (o.method === 'late' && o.value?.stored) actualLate.push({after:cursor, event:o.request.event});
  }
  return exhausted && equal(actualRows, cell.actual.rows) && equal(actualLate, cell.actual.late)
    && equal(sorted(actualRows), sorted(rows)) && equal(sorted(actualLate), sorted(late));
}
export const run = ({cases}) => verdicts(cases, check);
