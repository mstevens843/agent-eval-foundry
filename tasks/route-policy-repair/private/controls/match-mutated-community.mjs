import { plan } from "./plan.mjs";
export async function change(v, api) {
  const w = structuredClone(v);
  if (w.request.match.communities)
    w.request.match.communities = w.request.match.communities.map((c) => (c === "tagged" ? "changed" : c));
  return api.publish({ config: plan(w) });
}
