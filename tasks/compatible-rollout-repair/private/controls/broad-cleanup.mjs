export async function cleanup(_before, api) {
  for (const item of await api.stages({})) await api.cleanup({ id: item.id });
}
