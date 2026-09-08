import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, {
      ...api,
      decide: async (r) => {
        const x = await api.decide(r);
        return x.stale ? { decision: { id: "not-recorded" } } : x;
      },
    });
  },
};
