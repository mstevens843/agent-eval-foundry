export function cleanup(_before, api) {
  for (const item of api.stages({})) api.cleanup({ id: item.id });
}
