import { capture, empty } from "./snapshot.mjs";
import { merge } from "./merge.mjs";
export function reconcile(view, api) {
  const snapshots = capture(view, api);
  for (const document of view.documents) {
    const state = merge(view.replicas.map((r) => snapshots.get(r)[document] ?? empty()));
    for (const replica of view.replicas) api.replace({ replica, document, state });
  }
  return { documents: view.documents.length };
}
