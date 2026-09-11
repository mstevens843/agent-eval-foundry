import { trackProgress } from "./progress.mjs";
import { origin } from "./origin.mjs";
import { choose } from "./catalog.mjs";
import { healthy } from "./health.mjs";
import { publish } from "./publish.mjs";
import { cleanup } from "./cleanup.mjs";
import { detectSupersession } from "./supersession.mjs";
export async function rollout(view, api) {
  api = trackProgress(view, api);
  const saved = await origin(view, api), services = saved.services,
    before = saved.stages,
    results = [];
  for (const request of view.requests) {
    const service = services.find((s) => s.id === request.service),
      target = choose(await api.catalog({ model: request.model }), service);
    if (!target) {
      results.push({ service: service.id, status: "unavailable", release: service.deployment.release });
      continue;
    }
    const { superseded, current } = await detectSupersession(service, api);
    if (superseded) {
      results.push({ service: service.id, status: "superseded", release: current.deployment.release });
      continue;
    }
    let deployment = await api.stage({ service: service.id, release: target.id }),
      status = "deployed";
    if (!healthy(await api.telemetry({ service: service.id }), service, deployment)) {
      deployment = await api.stage({ service: service.id, release: service.deployment.release });
      status = "rolled-back";
      if (!healthy(await api.telemetry({ service: service.id }), service, deployment))
        throw Error("restored release not healthy");
    }
    await publish(service, deployment, api);
    results.push({ service: service.id, status, release: deployment.release });
  }
  await cleanup(before, api);
  return { job: view.job, results };
}
