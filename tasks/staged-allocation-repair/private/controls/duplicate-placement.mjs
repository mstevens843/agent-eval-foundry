import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      place: async (r) => {
        await api.place(r);
        return api.place(r);
      },
    });
  },
};
