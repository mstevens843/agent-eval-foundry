import { rollout } from "./src/controller.mjs";
export const subject = { async run(view, api) {
  return rollout(view, { ...api, stage: async request => {
    const before = (await api.inventory({})).find(s => s.id === request.service);
    const result = await api.stage(request);
    await api.warm({service:before.id,release:before.alias.release,abi:before.abi});
    return result;
  } });
} };
