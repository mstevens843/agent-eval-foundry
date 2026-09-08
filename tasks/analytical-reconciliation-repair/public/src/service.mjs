import { readAll } from "./pages.mjs";
import { reconcile } from "./reconcile.mjs";
export async function run(view, api) {
  const names = ["customers", "accounts", "usage", "credits"];
  const values = await Promise.all(names.map((n) => readAll(api, n)));
  const source = Object.fromEntries(names.map((n, i) => [n, values[i]]));
  for (const row of reconcile(source, view)) {
    const r = await api.record({ row });
    if (r.error) throw Error(r.error);
  }
  return { complete: true };
}
