import { matches, fresh, merge } from "./entries.mjs";
import { put } from "./store.mjs";
export async function resolve(api, event) {
  const edge = (await api.read({ tier: event.tier })).entries.find((e) => matches(e, event));
  if (edge && fresh(edge, event) && event.headers["cache-control"] !== "no-cache") return edge;
  const shield = (await api.read({ tier: "shield" })).entries.find((e) => matches(e, event));
  let entry;
  if (shield && fresh(shield, event) && event.headers["cache-control"] !== "no-cache") {
    entry = { ...shield, storedAt: event.now };
  } else {
    const old = edge ?? shield;
    const response = await api.origin(old ? { ifNoneMatch: old.etag } : {});
    entry = merge(old, response, event);
    await put(api, "shield", entry, event);
  }
  await put(api, event.tier, entry, event);
  return entry;
}
