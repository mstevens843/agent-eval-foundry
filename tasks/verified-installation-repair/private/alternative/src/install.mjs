import { content } from "./content.mjs";
import { assemble } from "./layers.mjs";
import { stage } from "./staging.mjs";
// A differently-shaped strategy from the reference: verify THIS invocation's own descriptors
// first (unconditionally spending the fetch/cache calls, regardless of durable state), and
// only consult api.status() afterward to decide what the verification result actually means --
// the reference checks status() first and short-circuits before ever touching a source.
export async function install(view, api) {
  const layers = [];
  let verified = true;
  for (const d of view.descriptors) {
    const layer = await content(api, d);
    if (!layer) {
      verified = false;
      break;
    }
    layers.push(layer);
  }
  const status = await api.status({});
  if (status.active === view.release) {
    // This exact release is already the durably active generation with nothing outstanding --
    // whatever we just did or didn't manage to re-verify, there is nothing left to commit.
    return {};
  }
  if (!verified) {
    // Our own copies are gone, but an earlier, interrupted attempt for this SAME release may
    // have already fully verified and staged it durably before losing its own commit.
    if (status.staged === view.release)
      return await api.finish({ status: "installed", digests: view.descriptors.map((d) => d.digest) });
    return await api.finish({ status: "unavailable", digests: [] });
  }
  await stage(api, assemble(layers));
  return await api.finish({ status: "installed", digests: view.descriptors.map((d) => d.digest) });
}
