import { rollout } from "./src/controller.mjs";
export const subject = {
  run(view, api) {
    const result = rollout(view, api);
    if (view.requests.length > 1) {
      const service = api.inventory({}).find((s) => s.id === view.requests[0].service);
      api.bind({ service: service.id, release: "old-3", generation: service.deployment.generation });
    }
    return result;
  },
};
