import { content } from "./content.mjs";
import { assemble } from "./layers.mjs";
import { stage } from "./staging.mjs";
export async function install(view, api) {
  // The durable line may already hold the answer to THIS exact request: a prior invocation for
  // the identical release may have landed successfully and reconciled (nothing left staged), in
  // which case there is nothing left to do -- re-verifying would be wasted work at best, and a
  // second real "installed" landing at worst (disallowed: finish never re-commits a generation
  // that is already the active one). Checking first, before touching any source, also means an
  // already-satisfied redelivery succeeds even once its own origin/cache copies are long gone.
  const status = await api.status({});
  if (status.active === view.release && status.staged === null) return {};
  const layers = [];
  for (const d of view.descriptors) {
    const layer = await content(api, d);
    if (!layer) {
      // This exact release may have been fully verified and staged by an earlier, interrupted
      // attempt whose durable bytes are still sitting on disk (api.status().staged names it) --
      // trust that already-committed-to-disk work instead of declaring unavailable just because
      // THIS invocation's own origin/cache copies happen to be gone.
      if (status.staged === view.release) return await api.finish({ status: "installed", digests: view.descriptors.map((d) => d.digest) });
      return await api.finish({ status: "unavailable", digests: [] });
    }
    layers.push(layer);
  }
  await stage(api, assemble(layers));
  return await api.finish({ status: "installed", digests: view.descriptors.map((d) => d.digest) });
}
