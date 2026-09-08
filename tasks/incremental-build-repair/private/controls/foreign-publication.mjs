import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      publish: (r) => api.publish({ ...r, outputs: r.outputs.map((o) => ({ ...o, target: "unrequested" })) }),
    });
  },
};
