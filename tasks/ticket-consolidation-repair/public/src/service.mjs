import { collect } from "./pages.mjs";
import { select } from "./selection.mjs";
import { settle } from "./update.mjs";
export function migrate(view, api) {
  const rows = select(collect(api), view);
  for (const r of rows) settle(r, view, api);
  return { selected: rows.length };
}
