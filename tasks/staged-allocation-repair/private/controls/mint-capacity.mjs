import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    const v = structuredClone(view);
    v.resources.forEach((r) => {
      r.used = 0;
      r.capacity += 2;
    });
    return run(v, api);
  },
};
