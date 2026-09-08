import { plan } from "./src/planner.mjs";
export const subject = {
  async run(v, api) {
    for (const { kind, ...x } of plan(v, await api.state({}))) {
      await api[kind](x);
      if (kind === "maintain") await api.maintain(x);
    }
    return api.finish({});
  },
};
