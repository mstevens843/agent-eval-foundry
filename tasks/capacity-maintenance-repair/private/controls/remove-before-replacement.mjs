import { plan } from "./src/planner.mjs";
export const subject = {
  async run(v, api) {
    const actions = plan(v, await api.state({}));
    for (let i = 0; i < actions.length - 1; i++)
      if (
        actions[i].kind === "add" &&
        actions[i + 1].kind === "remove" &&
        actions[i].service === actions[i + 1].service
      ) {
        [actions[i], actions[i + 1]] = [actions[i + 1], actions[i]];
        break;
      }
    for (const { kind, ...x } of actions) await api[kind](x);
    return api.finish({});
  },
};
