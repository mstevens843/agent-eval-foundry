import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      record: ({ row: r }) =>
        r.status === "ok" && r.data === "" ? Promise.resolve({ stored: true }) : api.record({ row: r }),
    });
  },
};
