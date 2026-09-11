export async function publish(service, deployment, api) {
  await api.bind({ service: service.id, ...deployment });
}
