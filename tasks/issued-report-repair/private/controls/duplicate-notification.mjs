import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      deliver: async (r) => {
        await api.deliver(r);
        return api.deliver(r);
      },
    });
  },
};
