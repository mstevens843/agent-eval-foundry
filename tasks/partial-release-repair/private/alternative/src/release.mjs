import { plan } from "./plan.mjs";
import { perform } from "./transport.mjs";
export function run(view, api) {
  const work = plan(api.inspect({}).resources, view.target, view.scope);
  for (const id of work.remove) perform(api, "remove", { id });
  for (const resource of work.create) perform(api, "create", { resource });
  return { complete: true };
}
