import { content } from "./content.mjs";
import { assemble } from "./layers.mjs";
import { stage } from "./staging.mjs";
export async function install(view, api) {
  const layers = [];
  for (const d of view.descriptors) {
    const layer = await content(api, d);
    if (!layer) return await api.finish({ status: "unavailable", digests: [] });
    layers.push(layer);
  }
  await stage(api, assemble(layers));
  return await api.finish({ status: "installed", digests: view.descriptors.map((d) => d.digest) });
}
