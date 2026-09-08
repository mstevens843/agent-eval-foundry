import { session, checks, equal, canonical } from "./adapter.mjs";
export function expected(s) {
  const marks = Object.fromEntries(s.view.partitions.map((p) => [p, -1000])),
    idle = new Set(),
    ended = new Set(),
    seen = new Set(),
    pending = [],
    rows = [],
    late = [];
  let frontier = -1000;
  for (let index = 0; index < s.events.length; index++) {
    const e = s.events[index];
    if (e.kind === "data") {
      const id = JSON.stringify([e.partition, e.id]);
      if (seen.has(id)) continue;
      seen.add(id);
      const start = Math.floor(e.time / s.view.width) * s.view.width;
      if (start + s.view.width + s.view.lateness <= frontier) late.push({ after: index, event: e });
      else pending.push({ start, key: e.key, delta: e.delta });
    } else {
      if (e.kind === "watermark") marks[e.partition] = e.value;
      if (e.kind === "idle") idle.add(e.partition);
      if (e.kind === "resume") idle.delete(e.partition);
      if (e.kind === "end") ended.add(e.partition);
      const remaining = s.view.partitions.filter((p) => !ended.has(p));
      const candidates = remaining.filter((p) => !idle.has(p)).map((p) => marks[p]);
      frontier = !remaining.length
        ? Infinity
        : candidates.length
          ? Math.max(
              frontier,
              candidates.reduce((a, b) => (a < b ? a : b)),
            )
          : frontier;
      const closing = pending.filter((r) => r.start + s.view.width + s.view.lateness <= frontier);
      const keys = [...new Set(closing.map((r) => JSON.stringify([r.start, r.key])))];
      for (const k of keys) {
        const [start, key] = JSON.parse(k),
          members = closing.filter((r) => r.start === start && r.key === key);
        rows.push({
          after: index,
          row: { start, key, total: members.reduce((n, r) => n + r.delta, 0), count: members.length },
        });
      }
      for (let i = pending.length - 1; i >= 0; i--)
        if (pending[i].start + s.view.width + s.view.lateness <= frontier) pending.splice(i, 1);
    }
  }
  return { rows, late };
}
const sorted = (a) => [...a].sort((a, b) => canonical(a).localeCompare(canonical(b)));
export async function runScenario(s, execute, storage) {
  const observations = [],
    reports = [],
    rows = [],
    late = [];
  let index = -1;
  await execute(
    session(
      { ...s.view, storage },
      {
        next: () => {
          index++;
          return s.events[index] ?? null;
        },
        emit: ({ row }) => {
          if (!row || typeof row.key !== "string") return { error: "shape" };
          rows.push({ after: index, row });
          return { stored: true };
        },
        late: ({ event }) => {
          if (!event || event.kind !== "data") return { error: "shape" };
          late.push({ after: index, event });
          return { stored: true };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const want = expected(s);
  return {
    ...checks({
      completion:
        index >= s.events.length && rows.length === want.rows.length && late.length === want.late.length,
      window_values: equal(sorted(rows.map((x) => x.row)), sorted(want.rows.map((x) => x.row))),
      publication_boundary: equal(sorted(rows), sorted(want.rows)),
      late_output: equal(sorted(late), sorted(want.late)),
      unique_windows: new Set(rows.map((x) => JSON.stringify([x.row.start, x.row.key]))).size === rows.length,
    }),
    actual: { rows, late },
    input: { events: s.events },
    expected: want,
    // The view (partitions/width/lateness) is already given to the subject directly via
    // adapter.begin(index) -- it is not secret -- but begin() calls are not logged into
    // `observations` (only invoke() calls are), so without this explicit field a checker-required
    // checker consuming only this return value would have no way to see it.
    view: s.view,
    observations,
    reports,
  };
}
