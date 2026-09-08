import { expand } from "./expand.mjs";
import { apply } from "./changes.mjs";
import { publication } from "./publication.mjs";
export async function run(view, api) {
  const events = apply(expand(view.series, view.zones), view.changes);
  const result = await api.commit(publication(events, view.zones, view.externalBookings));
  if (result.error) throw Error(result.error);
  return { complete: true };
}
