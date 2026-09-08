import { plan } from "./src/planner.mjs";
export const subject = {
  async run(v, api) {
    let upgraded = false;
    for (const { kind, ...x } of plan(v, await api.state({}))) {
      if (kind === "maintain") {
        if (upgraded) continue;
        upgraded = true;
      }
      await api[kind](x);
    }
    return api.finish({});
  },
};
