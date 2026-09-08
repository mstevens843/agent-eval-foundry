import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, { ...api, artifacts: async () => [] });
  },
};
