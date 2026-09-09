export function publish(request, result, api) {
  return api.publish({
    id: request.id,
    destination: request.destination,
    value: result.value,
    lineage: result.lineage,
  });
}
