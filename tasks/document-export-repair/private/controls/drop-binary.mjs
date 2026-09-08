import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, {
      ...api,
      read: async (r) => {
        const x = await api.read(r);
        x.ticket.parts = x.ticket.parts.filter((p) => p.media !== "application/octet-stream");
        return x;
      },
    });
  },
};
