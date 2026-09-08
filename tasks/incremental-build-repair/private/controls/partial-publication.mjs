import { run } from "./src/service.mjs";
export const subject = {
  run: (v, api) =>
    run(v, {
      ...api,
      publish: (r) => api.publish(r.outputs.length > 1 ? { ...r, outputs: r.outputs.slice(1) } : r),
    }),
};
