import { plan } from "./src/planner.mjs";
export const subject = {
  async run(v, api) {
    const p = plan(v, await api.state({})),
      last = p.findLastIndex((a) => a.kind === "maintain");
    for (const { kind, ...x } of p.slice(0, last + 1)) await api[kind](x);
    return api.finish({});
  },
};
