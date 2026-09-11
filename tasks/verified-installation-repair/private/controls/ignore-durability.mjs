import { content } from "./content.mjs";
import { assemble } from "./layers.mjs";
import { stage } from "./staging.mjs";
// BUG: never consults api.status() at all -- always starts completely fresh, re-verifying THIS
// invocation's own origin/cache copies from scratch every time. Correct exactly as long as those
// copies happen to still be available; once a redelivery's own sources have vanished, it wrongly
// declares the release unavailable even though it is already durably active or fully staged.
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
