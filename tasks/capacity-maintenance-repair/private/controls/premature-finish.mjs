import { plan } from "./src/planner.mjs";
export const subject = {
  async run(v, api) {
    // Executes a full correct plan except for exactly one "activate" step (the LAST one, if any):
    // that one relocation's replacement is left sitting in provisioning phase forever. Every
    // other step (including the matching "remove" of the old placement it was meant to replace)
    // still runs, so restoration's host/service-pair equality is untouched -- only readiness (no
    // placement may remain provisioning at finish) is violated. On scenarios with no services at
    // all (no "activate" step ever appears) this behaves exactly like a correct run.
    const actions = plan(v, await api.state({}));
    const last = actions.findLastIndex((a) => a.kind === "activate");
    for (let i = 0; i < actions.length; i++) {
      if (i === last) continue;
      const { kind, ...x } = actions[i];
      await api[kind](x);
    }
    return api.finish({});
  },
};
