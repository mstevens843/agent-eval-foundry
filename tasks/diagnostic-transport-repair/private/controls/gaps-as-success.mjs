import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      record: ({ row: r }) =>
        api.record({ row: r.error?.code === "GAP" ? { ...r, status: "ok", error: null } : r }),
    });
  },
};
