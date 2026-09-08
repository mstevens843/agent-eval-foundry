import { matches } from "./entries.mjs";
export async function put(api, tier, entry, event) {
  const { entries } = await api.read({ tier });
  const kept = entries.filter((e) => !matches(e, event));
  kept.push(entry);
  await api.write({ tier, entries: kept });
}
export async function purge(api, event) {
  for (const tier of event.tiers) {
    const { entries } = await api.read({ tier });
    await api.write({ tier, entries: entries.filter((e) => e.path !== event.path) });
  }
}
