// Never detects supersession: a redelivered attempt always republishes its own original, possibly
// stale plan, even when a later job has already legitimately claimed the service.
export async function detectSupersession(service, api) {
  const live = (await api.inventory({})).find((s) => s.id === service.id);
  return { superseded: false, current: live };
}
