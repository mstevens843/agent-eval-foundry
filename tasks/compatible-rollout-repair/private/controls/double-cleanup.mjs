// Captures the ids to clean once, then sweeps them twice instead of re-reading `stages({})`
// before acting. The second pass calls `cleanup` on ids its own first pass already removed.
export async function cleanup(before, api) {
  const keep = new Set(before.map((x) => x.id));
  const toClean = (await api.stages({})).filter((x) => !keep.has(x.id));
  for (const item of toClean) await api.cleanup({ id: item.id });
  for (const item of toClean) await api.cleanup({ id: item.id });
}
