export function publish(service, deployment, api) {
  api.bind({ service: service.id, ...deployment });
}
