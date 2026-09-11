import { rollout } from "./src/controller.mjs";
export const subject = {
  async run(view, api) {
    const result = await rollout(view, api);
    if (view.requests.length > 1) {
      const service = (await api.inventory({})).find((s) => s.id === view.requests[0].service);
      await api.bind({ service: service.id, release: "old-3", generation: service.deployment.generation });
    }
    return result;
  },
};
