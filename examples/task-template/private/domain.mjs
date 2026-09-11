import { checks, equal, session } from "./adapter.mjs";

export async function runScenario(s, execute) {
  const publications = [], observations = [], reports = [];
  await execute(session({ records: s.records }, {
    publish: ({ rows }) => { publications.push(structuredClone(rows)); return { received: true }; },
  }, r => reports.push(r), observations));
  // The oracle selects each key independently; it does not import either solution.
  const keys = [...new Set(s.records.map(r => r.key))].sort();
  const expected = keys.map(key => s.records.filter(r => r.key === key)
    .toSorted((a, b) => b.revision - a.revision)[0]);
  const rows = publications[0];
  const rowShape = Array.isArray(rows) && rows.every(r => r && typeof r === "object" &&
    !Array.isArray(r) && equal(Object.keys(r).sort(), ["key", "revision", "value"]) &&
    typeof r.key === "string" && Number.isSafeInteger(r.revision) && typeof r.value === "string");
  return {
    ...checks({
      completion: publications.length === 1,
      key_scope: rowShape && equal(rows.map(r => r.key).sort(), keys),
      latest_value: rowShape && rows.every(r => expected.some(e => equal(e, r))),
    }),
    input: { records: s.records }, actual: { publications }, expected, observations, reports,
  };
}
