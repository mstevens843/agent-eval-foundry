import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, { ...api, decide: (r) => api.decide({ ...r, payload: {} }) });
  },
};
