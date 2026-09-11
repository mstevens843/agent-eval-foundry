import { install } from "./src/install.mjs";
export const subject = { async run(v, api) {
  const state = await api.status({});
  // Alpha is the durable multi-attempt fixture; corrupt only its first commitment.
  const first = state.active === null && state.staged === null && v.descriptors[0]?.url === "repo/alpha";
  return install(v,{...api,finish: x => api.finish(first && x.status === "installed" ? {...x,digests:[]} : x)});
} };
