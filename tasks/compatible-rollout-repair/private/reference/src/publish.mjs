export function publish(service, deployment, api) {
  api.bind({ service: service.id, ...deployment });
  api.warm({ service: service.id, release: deployment.release, abi: service.abi });
}
