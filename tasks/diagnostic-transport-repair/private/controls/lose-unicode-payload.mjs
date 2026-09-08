import { run } from "./src/service.mjs";
export const subject = {
  run: (v, api) =>
    run(v, {
      ...api,
      record: ({ row }) => api.record({ row: { ...row, data: row.data.replace(/[^\x00-\x7F]/g, "") } }),
    }),
};
