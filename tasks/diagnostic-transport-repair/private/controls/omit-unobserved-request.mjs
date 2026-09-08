import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      record: ({ row: r }) =>
        r.attempt === null ? Promise.resolve({ stored: true }) : api.record({ row: r }),
    });
  },
};
