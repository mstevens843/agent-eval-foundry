export async function detectSupersession(service, api) {
  const live = (await api.inventory({})).find(s => s.id === service.id);
  const own = api.ownGeneration?.(service.id) ?? service.deployment.generation;
  return { superseded: live.deployment.generation > own, current: live };
}
