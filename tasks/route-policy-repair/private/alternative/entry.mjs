import { plan } from "./src/plan.mjs";
export const subject = {
  async run(v, api) {
    await api.publish({ config: {} });
    const config = plan(v);
    for (const rows of Object.values(config.egresses)) rows.reverse();
    return api.publish({ config });
  },
};
