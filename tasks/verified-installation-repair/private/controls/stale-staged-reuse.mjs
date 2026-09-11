import { content } from "./content.mjs";
import { assemble } from "./layers.mjs";
import { stage } from "./staging.mjs";
// BUG: trusts ANY durable staged content as already-finished work for the CURRENT release,
// without checking it actually belongs to this release (and without checking api.status().active
// at all, so a plain redelivery of an already-active release just redoes the work and re-lands
// it a second time instead of recognizing it is already done).
export async function install(view, api) {
  const status = await api.status({});
  if (status.staged !== null) {
    return await api.finish({ status: "installed", digests: view.descriptors.map((d) => d.digest) });
  }
  const layers = [];
  for (const d of view.descriptors) {
    const layer = await content(api, d);
    if (!layer) return await api.finish({ status: "unavailable", digests: [] });
    layers.push(layer);
  }
  await stage(api, assemble(layers));
  return await api.finish({ status: "installed", digests: view.descriptors.map((d) => d.digest) });
}
