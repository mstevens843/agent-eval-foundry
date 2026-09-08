import { run } from "./src/service.mjs";
export const subject = {
  run: (v, api) =>
    run(v, {
      ...api,
      late: async (r) => {
        await api.late(r);
        return api.late(r);
      },
    }),
};
