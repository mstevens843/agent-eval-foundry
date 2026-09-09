import { session, checks, equal } from "./adapter.mjs";
export function expectedRows(s) {
  return s.queries.map((q) => {
    // Truth uses interval breakpoints and per-key maximal eligible revision, not subject modules.
    const keys = [...new Set(s.rows.filter((r) => r.series === q.series).map((r) => r.key))];
    const records = keys
      .map((k) =>
        s.rows
          .filter((r) => r.series === q.series && r.key === k && r.knownAt <= q.knownAt)
          .reduce((a, b) => (!a || b.revision > a.revision ? b : a), null),
      )
      .filter((r) => r && r.value !== null);
    const boundaries = [
      ...new Set([
        q.from,
        q.to,
        ...records.flatMap((r) => [r.from, r.to]).filter((t) => q.from < t && t < q.to),
      ]),
    ].sort((a, b) => a - b);
    let total = 0n;
    for (let i = 1; i < boundaries.length; i++) {
      const l = boundaries[i - 1],
        h = boundaries[i];
      const rate = records.filter((r) => r.from <= l && h <= r.to).reduce((a, r) => a + BigInt(r.value), 0n);
      total += BigInt(h - l) * rate;
    }
    return { id: q.id, total: String(total) };
  });
}
export async function runScenario(s, execute, storage) {
  const observations = [],
    writes = [],
    reports = [],
    expected = expectedRows(s);
  const cursorMap = new Map([[null, 0]]);
  let nextSerial = 0;
  await execute(
    session(
      { queries: s.queries, storage },
      {
        fetch: ({ cursor }) => {
          if (!cursorMap.has(cursor)) return { rows: [], next: null };
          const start = cursorMap.get(cursor),
            end = Math.min(start + s.pageSize, s.rows.length);
          const next = end < s.rows.length ? "cursor-" + ++nextSerial : null;
          if (next) cursorMap.set(next, end);
          return { rows: s.rows.slice(start, end), next };
        },
        record: (r) => {
          writes.push(structuredClone(r));
          return { stored: true };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const cursors = new Set([null]);
  let exhausted = false;
  for (const o of observations) if (o.method === "fetch" && cursors.has(o.request.cursor)) {
    if (o.value.next === null) exhausted = true; else cursors.add(o.value.next);
  }
  return {
    ...checks({
      completion: exhausted && expected.every((e) => writes.some((w) => w.id === e.id)),
      exact_integral: expected.every((e) => writes.some((w) => e.id === w.id && e.total === w.total)),
      population: writes.every((w) => expected.some((e) => e.id === w.id)),
      unique_reports: new Set(writes.map((w) => w.id)).size === writes.length,
    }),
    expected,
    writes,
    reports,
    observations,
    publicInput: { queries: s.queries, records: s.rows },
  };
}
