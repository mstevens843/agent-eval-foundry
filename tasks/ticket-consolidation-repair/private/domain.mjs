import { session, checks, equal } from "./adapter.mjs";
const key = (r) => JSON.stringify([r.tenant, r.id]);
export async function runScenario(s, execute, storage) {
  const actual = new Map(s.rows.map((r) => [key(r), structuredClone(r)])),
    selected = s.rows.filter((r) => s.tenants.includes(r.tenant) && r.status === "open"),
    selectedKeys = new Set(selected.map(key));
  const edits = new Map(),
    calls = [],
    observations = [],
    reports = [],
    cursors = new Map([[null, 0]]);
  let serial = 0,
    expired = false;
  const pages = s.rows.map((r) => [r]);
  if (s.emptyPage) pages.splice(1, 0, []);
  if (s.overlap) pages.push([s.rows[0]]);
  await execute(
    session(
      { tenants: s.tenants, team: s.team, marker: s.marker, storage },
      {
        page: ({ cursor }) => {
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
        },
        resolve: ({ tenant, team }) => ({ owner: tenant + ":" + team }),
        read: (r) => structuredClone(actual.get(key(r)) ?? null),
        batch: ({ updates }) => ({
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
                Array.isArray(u.patch.labels);
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
        }),
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  return {
    ...checks({
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
          return selectedKeys.has(key(r))
            ? a.status === r.status &&
                a.note ===
                  ((edits.get(key(r)) ?? 0) > 0 ? "edited-" + ((edits.get(key(r)) ?? 0) - 1) : r.note)
            : equal(a, r);
        }),
      conditional_writes: calls
        .filter((c) => c.status === "APPLIED")
        .every((c) => c.before.revision === c.request.revision),
    }),
    actual: [...actual.values()],
    edits: [...edits],
    calls: calls.map(({ request, before, status }) => ({ request, before, status })),
    observations,
    reports,
    requestedTeam: s.team,
    requestedMarker: s.marker,
    initialRows: s.rows,
    allowedTenants: s.tenants,
    directory: Object.fromEntries(s.tenants.map((tenant) => [tenant, tenant + ":" + s.team])),
  };
}
