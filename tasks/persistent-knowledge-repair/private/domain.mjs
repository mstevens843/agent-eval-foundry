import { session, equal, checks } from "./adapter.mjs";
const norm = (xs) => [...xs].sort((a, b) => a.id.localeCompare(b.id));
// Independent graph walk over authoritative revisions; not imported from either solution.
function evaluate(records, id, path = []) {
  const r = records.get(id);
  if (!r || r.retracted || path.includes(id)) return null;
  const parents = r.kind === "source" ? [] : r.parents.map((p) => evaluate(records, p, [...path, id]));
  if (parents.some((p) => !p)) return null;
  const lineage = new Map([[id, r.revision]]);
  for (const parent of parents) for (const row of parent.lineage) lineage.set(row.id, row.revision);
  return {
    value: r.kind === "source" ? r.value : parents.map((p) => p.value).join(r.separator),
    approved: r.kind === "source" ? r.authority === "approved" : parents.every((p) => p.approved),
    lineage: norm([...lineage].map(([id, revision]) => ({ id, revision }))),
  };
}
export async function runScenario(s, execute, storage) {
  const records = new Map(),
    effects = [],
    observations = [],
    reports = [],
    expected = [],
    expectedReports = [],
    prefixes = [];
  for (const [job, input] of s.jobs.entries()) {
    for (const r of input.updates) records.set(r.id, structuredClone(r));
    const decisions = [];
    for (const request of input.requests) {
      const prior = expected.find((e) => e.id === request.id),
        result = evaluate(records, request.root);
      const allowed =
        !!prior ||
        (!!result?.approved &&
          input.grants.some(
            (g) => g.destination === request.destination && g.version === request.grantVersion && g.allowed,
          ));
      if (allowed && !prior)
        expected.push({
          id: request.id,
          destination: request.destination,
          value: result.value,
          lineage: result.lineage,
        });
      decisions.push({
        id: request.id,
        outcome: allowed ? "published" : "blocked",
        lineage: prior?.lineage ?? result?.lineage ?? [],
      });
    }
    expectedReports.push({ job, decisions });
    await execute(
      session(
        { storage, job, ...input },
        {
          publish: (value) => {
            const copy = structuredClone(value);
            effects.push(copy);
            return copy;
          },
          receipts: () => structuredClone(effects),
        },
        (r) => reports.push(r),
        observations,
      ),
    );
    prefixes.push({ actual: structuredClone(effects), expected: structuredClone(expected) });
  }
  const normalizedEffects = effects.map((e) => ({
    ...e,
    lineage: Array.isArray(e.lineage) ? norm(e.lineage) : [],
  }));
  const normalizedReports = reports.map((r) => ({
    ...r,
    decisions: r.decisions?.map((d) => ({ ...d, lineage: Array.isArray(d.lineage) ? norm(d.lineage) : [] })),
  }));
  return {
    ...checks({
      completion: expected.every((e) => effects.some((a) => a.id === e.id)),
      authority: prefixes.every((p) => p.actual.every((e) => p.expected.some((a) => a.id === e.id))),
      values: effects.every((e) =>
        expected.some((a) => a.id === e.id && a.value === e.value && a.destination === e.destination),
      ),
      lineage: normalizedEffects.every((e) =>
        expected.some((a) => a.id === e.id && equal(a.lineage, e.lineage)),
      ),
      history:
        new Set(effects.map((e) => e.id)).size === effects.length &&
        prefixes.every((p) =>
          equal(norm(p.actual.map((e) => ({ ...e, lineage: norm(e.lineage ?? []) }))), norm(p.expected)),
        ),
      decisions: equal(normalizedReports, expectedReports),
      preservation: expected
        .filter((e) => e.id.includes("retained"))
        .every((e) => effects.some((a) => equal({ ...a, lineage: norm(a.lineage ?? []) }, e))),
    }),
    observations,
    effects,
    reports,
    expected,
    expectedReports,
    prefixes,
  };
}
