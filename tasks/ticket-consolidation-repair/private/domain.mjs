import { session, checks, equal } from "./adapter.mjs";
import { deliverOnce } from "./redelivery.mjs";
const key = (r) => JSON.stringify([r.tenant, r.id]);
export async function runScenario(s, execute, storage) {
  const actual = new Map(s.rows.map((r) => [key(r), structuredClone(r)])),
    selected = s.rows.filter((r) => s.tenants.includes(r.tenant) && r.status === "open"),
    selectedKeys = new Set(selected.map(key));
  const edits = new Map(),
    calls = [],
    observations = [],
    reports = [],
    cursors = new Map([[null, 0]]),
    interruptions = [],
    flippedKeys = new Set(),
    // Ground truth for the concurrently-injected status drift: key -> the status a selected
    // row was externally forced to. Populated as a side effect of the same mechanism that
    // exposes it to the candidate (a live api.read), never from candidate behavior.
    statusOverrides = new Map();
  let serial = 0,
    expired = false,
    // Total API operations across BOTH the crashed attempt and its redelivery: this counter
    // and `cursors`/`edits`/`actual` above are all declared once per scenario run (not reset
    // when deliverOnce starts a fresh delivery), so pagination position and per-row conflict
    // budgets persist across the crash exactly like the real backing store would.
    opCount = 0,
    attempt = 0;
  const pages = s.rows.map((r) => [r]);
  if (s.emptyPage) pages.splice(1, 0, []);
  if (s.overlap) pages.push([s.rows[0]]);

  // Every scenario obeys the documented 4000-op envelope; a minority additionally set a much
  // smaller s.opBudget to make a from-scratch-every-delivery strategy provably exceed it while
  // an incrementally-correct (or even a naively-resynced-but-selective) one stays comfortably
  // inside it. Exceeding it ends the run the same way any other execution error would.
  const budgeted = (fn) => (request) => {
    opCount++;
    if (opCount > (s.opBudget ?? 4000)) throw Error("ticket-consolidation/operation-budget-exhausted");
    return fn(request);
  };

  const operations = {
    page: budgeted(({ cursor }) => {
      const i = cursors.get(cursor);
      if (i === undefined) return { status: "OK", rows: [], next: null };
      if (s.expire && i === 2 && !expired) {
        expired = true;
        const resume = "cursor-" + ++serial;
        cursors.set(resume, i);
        return { status: "EXPIRED", resume };
      }
      const next = i + 1 < pages.length ? "cursor-" + ++serial : null;
      if (next) cursors.set(next, i + 1);
      return { status: "OK", rows: pages[i] ?? [], next };
    }),
    resolve: budgeted(({ tenant, team }) => ({ owner: tenant + ":" + team })),
    read: budgeted((r) => {
      const k = key(r);
      // A concurrent status flip is exposed the first time ANY delivery reads this row live —
      // "before or during its settlement" — and never through api.page's frozen snapshot.
      if (s.statusFlipKey === k && selectedKeys.has(k) && !flippedKeys.has(k)) {
        flippedKeys.add(k);
        const row = actual.get(k);
        if (row) {
          row.status = "closed";
          statusOverrides.set(k, "closed");
        }
      }
      return structuredClone(actual.get(k) ?? null);
    }),
    batch: budgeted(({ updates }) => ({
      results: updates
        .map((u) => {
          const k = key(u),
            row = actual.get(k),
            count = edits.get(k) ?? 0;
          if (row && selectedKeys.has(k) && count < (s.conflictMap?.[k] ?? s.conflicts)) {
            row.labels = [...new Set([...row.labels, "concurrent-" + count])];
            row.note = "edited-" + count;
            row.revision++;
            edits.set(k, count + 1);
          }
          const before = structuredClone(row),
            status = !row ? "MISSING" : row.revision !== u.revision ? "CONFLICT" : "APPLIED";
          const validPatch =
            u.patch &&
            Object.keys(u.patch).every((k) => ["owner", "labels"].includes(k)) &&
            typeof u.patch.owner === "string" &&
            Array.isArray(u.patch.labels) &&
            u.patch.labels.every((label) => typeof label === "string");
          calls.push({
            request: structuredClone(u),
            before,
            status,
            validPatch,
            selected: selectedKeys.has(k),
          });
          if (status === "APPLIED" && validPatch) {
            Object.assign(row, structuredClone(u.patch));
            row.revision++;
          }
          return { tenant: u.tenant, id: u.id, status };
        })
        .reverse(),
    })),
  };

  let invalidExecution = null;
  try {
    await deliverOnce(
      execute,
      () => {
        const view = { tenants: s.tenants, team: s.team, marker: s.marker, operationBudget: s.opBudget ?? 4000, storage, attempt };
        attempt++;
        return session(view, operations, (r) => reports.push(r), observations);
      },
      s.crashAfterBatch ? { method: "api.batch", count: s.crashAfterBatch, observations } : null,
      interruptions,
    );
  } catch (error) {
    // A thrown execution error (budget exhaustion, or any other candidate fault) is not a
    // second interruption: the run simply ends short, and whatever migration actually landed
    // on `actual`/`calls` is judged as-is by the checks below (and independently by the
    // checker from the same raw facts) — there is no dedicated "budget" check, only the
    // ordinary obligations an incomplete run naturally fails.
    if (error?.kind === "infrastructure") throw error;
    invalidExecution = String(error?.message ?? error);
  }

  return {
    ...checks({
      execution: invalidExecution === null && opCount <= (s.opBudget ?? 4000),
      completion: selected.every(
        (r) =>
          actual.get(key(r)).owner === r.tenant + ":" + s.team &&
          actual.get(key(r)).labels.includes(s.marker),
      ),
      ownership: selected.every((r) => actual.get(key(r)).owner === r.tenant + ":" + s.team),
      labels: calls.filter((c) => c.status === "APPLIED").every((c) =>
        c.validPatch && new Set(c.request.patch.labels).size === c.request.patch.labels.length &&
        c.before.labels.every((label) => c.request.patch.labels.includes(label)),
      ) && selected.every((r) => {
        const expected = [
          ...new Set([
            ...r.labels,
            ...Array.from({ length: edits.get(key(r)) ?? 0 }, (_, i) => "concurrent-" + i),
            s.marker,
          ]),
        ].sort();
        return equal([...actual.get(key(r)).labels].sort(), expected);
      }),
      preservation:
        calls.every((c) => c.selected && c.validPatch) &&
        s.rows.every((r) => {
          const a = actual.get(key(r));
          if (!selectedKeys.has(key(r))) return equal(a, r);
          const expectedStatus = statusOverrides.get(key(r)) ?? r.status;
          return (
            a.status === expectedStatus &&
            a.note ===
              ((edits.get(key(r)) ?? 0) > 0 ? "edited-" + ((edits.get(key(r)) ?? 0) - 1) : r.note)
          );
        }),
      conditional_writes: calls
        .filter((c) => c.status === "APPLIED")
        .every((c) => c.before.revision === c.request.revision),
      // The set of rows the candidate ever attempted to write is exactly the snapshot-frozen
      // selection: every selected row was touched (never silently disqualified by a live
      // re-check of status), and nothing outside the selection was ever touched.
      membership: (() => {
        const touched = new Set(calls.map((c) => key(c.request)));
        return selected.every(r => actual.get(key(r)).owner === r.tenant + ":" + s.team && actual.get(key(r)).labels.includes(s.marker)) && [...touched].every((k) => selectedKeys.has(k));
      })(),
    }),
    actual: [...actual.values()],
    edits: [...edits],
    calls: calls.map(({ request, before, status }) => ({ request, before, status })),
    observations,
    reports,
    interruptions,
    // Raw external facts about mid-run status drift, exactly like `edits` already documents
    // label/note drift: not a verdict, just what an outside actor concurrently did.
    concurrentStatusFlips: [...statusOverrides].map(([k, status]) => {
      const [tenant, id] = JSON.parse(k);
      return { tenant, id, status };
    }),
    execution: { outcome: invalidExecution === null ? "returned" : "threw" },
    invalidExecution,
    operationCount: opCount,
    operationBudget: s.opBudget ?? 4000,
    requestedTeam: s.team,
    requestedMarker: s.marker,
    initialRows: s.rows,
    allowedTenants: s.tenants,
    directory: Object.fromEntries(s.tenants.map((tenant) => [tenant, tenant + ":" + s.team])),
  };
}
