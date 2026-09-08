import { run } from "./src/service.mjs";
export const subject = {
  run: (view, api) =>
    run(view, { ...api, record: ({ row }) => api.record({ row: { ...row, usageIds: [], creditIds: [] } }) }),
};
