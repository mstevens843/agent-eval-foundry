import { choose } from "./catalog.mjs";
import { healthy } from "./health.mjs";
import { publish } from "./publish.mjs";
import { detectSupersession } from "./supersession.mjs";
// Planning (choose a target, confirm it hasn't already been superseded, stage it) is kept
// separate from finalizing (confirm health, roll back if needed, publish) so entry.mjs can run
// every request's plan before finalizing any of them — a batched two-pass shape, rather than
// reference/src/controller.mjs's single pass that plans and finalizes one request at a time.
export async function plan(request, inventory, api) {
  const service = inventory.get(request.service),
    catalog = await api.catalog({ model: request.model }),
    target = choose(catalog, service);
  if (!target) return { service, target: null };
  const { superseded, current } = await detectSupersession(service, api);
  if (superseded) return { service, target, superseded: true, current };
  return { service, target, deployment: await api.stage({ service: service.id, release: target.id }) };
}
export async function finalize(item, api) {
  const { service, target } = item;
  if (!target) return { service: service.id, status: "unavailable", release: service.deployment.release };
  if (item.superseded) return { service: service.id, status: "superseded", release: item.current.deployment.release };
  let { deployment } = item,
    status = "deployed";
  if (!healthy(await api.telemetry({ service: service.id }), service, deployment)) {
    deployment = await api.stage({ service: service.id, release: service.deployment.release });
    status = "rolled-back";
    if (!healthy(await api.telemetry({ service: service.id }), service, deployment))
      throw Error("rollback unavailable");
  }
  await publish(service, deployment, api);
  return { service: service.id, status, release: deployment.release };
}
