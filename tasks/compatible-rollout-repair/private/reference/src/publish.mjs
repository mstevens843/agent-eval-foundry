export async function publish(service, deployment, api) {
  await api.bind({ service: service.id, ...deployment });
  await api.warm({ service: service.id, release: deployment.release, abi: service.abi });
}
