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
    const prior = api.receipts({}).find((r) => r.id === request.id);
    if (prior) return { id: request.id, outcome: "published", lineage: prior.lineage };
    const value = resolve(store.records, request.root);
    const allowed = authorized(request, view.grants, value);
    if (allowed) publish(request, value, api);
    return { id: request.id, outcome: allowed ? "published" : "blocked", lineage: value?.lineage ?? [] };
  });
  return { job: view.job, decisions };
}
