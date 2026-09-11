import { expand } from "./expand.mjs";
import { apply } from "./changes.mjs";
import { publication } from "./publication.mjs";
import { sync } from "./sync.mjs";
export const run = (view, api) =>
  sync(view, api, (v) =>
    publication(apply(expand(v.series, v.zones), v.changes), v.zones, v.externalBookings),
  );
