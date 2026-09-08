import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      record: async (r) => {
        await api.record(r);
        return api.record(r);
      },
    });
  },
};
