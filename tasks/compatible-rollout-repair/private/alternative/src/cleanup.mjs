export function cleanup(before, api) {
  const keep = new Set(before.map((x) => x.id));
  for (const item of api.stages({})) if (!keep.has(item.id)) api.cleanup({ id: item.id });
}
