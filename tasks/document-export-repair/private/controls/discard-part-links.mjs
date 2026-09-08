import { run } from "./src/service.mjs";
export const subject = {
  run: (view, api) =>
    run(view, {
      ...api,
      publish: (r) => {
        const ticket = JSON.parse(Buffer.from(r.data, "base64"));
        for (const p of ticket.parts) p.links = [];
        return api.publish({ ...r, data: Buffer.from(JSON.stringify(ticket)).toString("base64") });
      },
    }),
};
