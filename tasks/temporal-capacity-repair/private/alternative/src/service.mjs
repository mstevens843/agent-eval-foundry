import { readAll } from "./pages.mjs";
import { select } from "./revisions.mjs";
import { integrate } from "./integral.mjs";
export function run(view, api) {
  const rows = readAll(api);
  for (const q of view.queries) api.record({ id: q.id, total: integrate(select(rows, q), q) });
  return { reports: view.queries.length };
}
