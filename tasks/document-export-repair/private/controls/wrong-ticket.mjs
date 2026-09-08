import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, { ...api, publish: (r) => api.publish({ ...r, id: r.id + "-copy" }) });
  },
};
