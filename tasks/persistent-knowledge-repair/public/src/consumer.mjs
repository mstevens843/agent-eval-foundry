import { openStore } from "./store.mjs";
import { ingest } from "./revisions.mjs";
import { resolve } from "./derive.mjs";
import { authorized } from "./policy.mjs";
import { publish } from "./publication.mjs";
export function consume(view, api) {
  const store = openStore(view.storage);
  ingest(store.records, view.updates);
  store.commit();
  const decisions = view.requests.map((request) => {
    const result = resolve(store.records, request.root);
    const allowed = authorized(request, view.grants, result);
    if (allowed) publish(request, result, api);
    return { id: request.id, outcome: allowed ? "published" : "blocked", lineage: result?.lineage ?? [] };
  });
  return { job: view.job, decisions };
}
