import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, {
      ...api,
      record: async (r) => {
        await api.record(r);
        return api.record(r);
      },
    });
  },
};
