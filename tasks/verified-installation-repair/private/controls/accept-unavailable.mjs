import { content } from "./content.mjs";
import { assemble } from "./layers.mjs";
import { stage } from "./staging.mjs";
export async function install(v, api) {
  const layers = [];
  for (const d of v.descriptors) {
    const l = await content(api, d);
    if (l) layers.push(l);
  }
  await stage(api, assemble(layers));
  return api.finish({ status: "installed", digests: v.descriptors.map((d) => d.digest) });
}
