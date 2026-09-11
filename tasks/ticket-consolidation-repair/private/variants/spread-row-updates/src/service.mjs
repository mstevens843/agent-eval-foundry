import { collect } from "./pages.mjs";
import { select } from "./selection.mjs";
import { settle } from "./update.mjs";
export async function migrate(view, api) {
  const rows = select(await collect(api), view);
  for (const r of rows) await settle(r, view, api);
  return { selected: rows.length };
}
