export async function cleanup(before, api) {
  const keep = new Set(before.map((x) => x.id));
  for (const item of await api.stages({})) if (!keep.has(item.id)) await api.cleanup({ id: item.id });
}
