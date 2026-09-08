import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, {
      ...api,
      publish: async (r) => {
        await api.publish(r);
        return api.publish(r);
      },
    });
  },
};
