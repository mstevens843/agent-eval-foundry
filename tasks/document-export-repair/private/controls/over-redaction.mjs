import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, {
      ...api,
      publish: async (r) => {
        const m = JSON.parse(Buffer.from(r.data, "base64"));
        m.subject = "";
        return api.publish({ ...r, data: Buffer.from(JSON.stringify(m)).toString("base64") });
      },
    });
  },
};
