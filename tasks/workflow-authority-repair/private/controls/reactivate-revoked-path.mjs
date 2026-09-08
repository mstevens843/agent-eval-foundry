import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, {
      ...api,
      policy: async (r) => {
        const p = await api.policy(r);
        return { ...p, grants: p.grants.map((g) => ({ ...g, active: true })) };
      },
    });
  },
};
