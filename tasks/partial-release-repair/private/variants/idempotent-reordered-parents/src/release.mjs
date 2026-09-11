import { plan } from "./plan.mjs";
import { perform } from "./transport.mjs";
export async function run(view, api) {
  const work = plan((await api.inspect({})).resources, view.target, view.scope);
  for (const id of work.remove) await perform(api, "remove", { id });
  for (const resource of work.create) await perform(api, "create", { resource });
  return { complete: true };
}
