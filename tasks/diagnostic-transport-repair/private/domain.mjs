import { session, checks, equal, canonical } from "./adapter.mjs";
const sort = (rows) => [...rows].sort((a, b) => canonical(a).localeCompare(canonical(b)));
export function expected(s) {
  return s.requests.map((request) => {
    const records = s.records.filter((r) => r.request === request),
      attempt = records.reduce((n, r) => Math.max(n, r.attempt), 0);
    const active = records.filter((r) => r.attempt === attempt),
      finish = active.find((r) => r.kind === "finish"),
      values = {};
    for (const r of active) if (r.kind === "chunk") values[r.seq] = r.value;
    const sorted = Object.keys(values)
      .map(Number)
      .sort((a, b) => a - b);
    let data = "",
      length = 0;
    for (const index of sorted) {
      if (index !== length) break;
      data += values[index];
      length++;
    }
    const code = !attempt
      ? "MISSING"
      : finish?.status === "error"
        ? finish.code
        : !finish
          ? "TRUNCATED"
          : length !== finish.next
            ? "GAP"
            : null;
    return {
      request,
      attempt: attempt || null,
      data,
      status: finish?.status === "error" ? "error" : code ? "incomplete" : "ok",
      error: code ? { code, retryable: finish?.status === "error" ? finish.retryable : true } : null,
    };
  });
}
export async function runScenario(s, execute, storage) {
  const observations = [],
    reports = [],
    rows = [];
  let index = 0;
  await execute(
    session(
      { requests: s.requests, storage },
      {
        next: () => s.chunks[index++] ?? null,
        record: ({ row }) => {
          if (!row || typeof row.request !== "string") return { error: "shape" };
          rows.push(row);
          return { stored: true };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const want = expected(s),
    get = (id) => rows.find((r) => r.request === id);
  // SEMANTICS.md: "After exhausting input, publish..." -- exhaustion and requested-population
  // completion must happen in THAT order, not merely both eventually be true. `observations`
  // is the real, ordered next/record call log (adapter.mjs), so it can see what the two static
  // booleans below cannot: a candidate that records rows before ever draining input to null.
  const drainedAt = observations.findIndex((o) => o.method === "next" && o.value === null);
  const publishedAfterExhaustion = observations
    .filter((o) => o.method === "record")
    .every((o) => drainedAt !== -1 && o.seq > drainedAt);
  return {
    ...checks({
      completion:
        index > s.chunks.length &&
        publishedAfterExhaustion &&
        equal(rows.map((r) => r.request).sort(), s.requests.toSorted()),
      content: want.every((r) => get(r.request)?.data === r.data),
      attempt_identity: want.every((r) => get(r.request)?.attempt === r.attempt),
      error_semantics: want.every(
        (r) => get(r.request)?.status === r.status && equal(get(r.request)?.error ?? null, r.error),
      ),
      exact_rows: equal(sort(rows), sort(want)),
    }),
    actual: rows,
    // Legitimate problem data, identical to what the candidate's own `view.requests` already
    // hands it — not an answer. Without it, a checker has no reliable way to tell a request with
    // zero wire footprint (which must still be published as MISSING) from a request that was
    // never actually requested at all; both look identical in a single candidate's own trace.
    // (External review reproduced this ambiguity concretely: two legal inputs — no requested
    // jobs, correctly publishing nothing, versus one unobserved requested job, incorrectly
    // publishing nothing — produce identical exposed evidence without this field.)
    requests: s.requests,
    input: { chunks: s.chunks },
    expected: want,
    observations,
    reports,
  };
}
