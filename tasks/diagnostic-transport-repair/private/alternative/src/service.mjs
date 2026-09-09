import { decode } from "./decoder.mjs";
import { select } from "./attempts.mjs";
import { outcome } from "./outcome.mjs";
export async function run(view, api) {
  const records = await decode(api);
  for (const id of view.requests) await api.record({ row: outcome(id, select(records, id)) });
  return { complete: true };
}
