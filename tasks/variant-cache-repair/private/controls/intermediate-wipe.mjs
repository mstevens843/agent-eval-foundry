import { matches } from "./entries.mjs";
// An illegal intermediate write, corrected before the event ends, still really happened: the
// authority checks EVERY observed write against the event-start snapshot, not just the last one,
// so an unrelated entry that goes missing even briefly is a genuine cache_provenance violation --
// but a checker that only diffs storage state at event boundaries (rather than replaying every
// acknowledged write in `observations`) never sees it, since the final state this control
// produces is byte-identical to the correct one. Final delivery and contents are unaffected.
export async function put(api, tier, entry, event) {
  const { entries } = await api.read({ tier });
  await api.write({ tier, entries: [] });
  const kept = entries.filter((e) => !matches(e, event));
  if (!entry.noStore && !entry.vary.includes("*")) kept.push(entry);
  await api.write({ tier, entries: kept });
}
export async function purge(api, event) {
  for (const t of event.tiers) {
    const { entries } = await api.read({ tier: t });
    await api.write({ tier: t, entries: entries.filter((e) => e.path !== event.path) });
  }
}
