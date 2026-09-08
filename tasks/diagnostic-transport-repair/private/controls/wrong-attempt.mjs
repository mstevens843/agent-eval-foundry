import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      record: ({ row: r }) => api.record({ row: r.attempt > 1 ? { ...r, attempt: 1 } : r }),
    });
  },
};
