import { choose } from "./catalog.mjs";
import { healthy } from "./health.mjs";
import { publish } from "./publish.mjs";
import { cleanup } from "./cleanup.mjs";
export function rollout(view, api) {
  const services = api.inventory({}),
    before = api.stages({}),
    results = [];
  for (const request of view.requests) {
    const service = services.find((s) => s.id === request.service),
      target = choose(api.catalog({ model: request.model }), service);
    if (!target) {
      results.push({ service: service.id, status: "unavailable", release: service.deployment.release });
      continue;
    }
    let deployment = api.stage({ service: service.id, release: target.id }),
      status = "deployed";
    if (!healthy(api.telemetry({ service: service.id }), service, deployment)) {
      deployment = api.stage({ service: service.id, release: services[0].deployment.release });
      status = "rolled-back";
    }
    publish(service, deployment, api);
    results.push({ service: service.id, status, release: deployment.release });
  }
  cleanup(before, api);
  return { job: view.job, results };
}
