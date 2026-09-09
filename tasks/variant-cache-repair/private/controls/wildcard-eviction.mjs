import { matches } from "./entries.mjs";
// A wildcard-vary response can never be matched/reused (SEMANTICS.md: "a wildcard is never
// reusable"), so per domain.mjs's own authoritative logic it is ALWAYS classified as an
// "unrelated" entry relative to any current request -- and unrelated entries must always
// survive a write, exactly like any other entry for a different path. A plausible, easy
// mistake: choosing to store wildcard responses (nothing forbids it) but treating a new
// same-path wildcard response as replacing the old one, the same way non-wildcard variants
// legitimately replace their same-path predecessor. Deliveries stay correct throughout --
// a wildcard entry can never be delivered from cache anyway -- only the stored history is
// wrong, an authoritative cache_provenance violation invisible to any checker that only
// diffs event-start/event-end storage contents rather than replaying every write.
export async function put(api, tier, entry, event) {
  const { entries } = await api.read({ tier });
  const supersededWildcard = (e) =>
    e.vary.includes("*") && entry.vary.includes("*") && e.path === event.path;
  const kept = entries.filter((e) => !matches(e, event) && !supersededWildcard(e));
  if (!entry.noStore) kept.push(entry);
  await api.write({ tier, entries: kept });
}
export async function purge(api, event) {
  for (const t of event.tiers) {
    const { entries } = await api.read({ tier: t });
    await api.write({ tier: t, entries: entries.filter((e) => e.path !== event.path) });
  }
}
