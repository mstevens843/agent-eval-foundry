import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      next: async () => {
        let e;
        while ((e = await api.next({}))?.kind === "idle" || e?.kind === "resume") {}
        return e;
      },
    });
  },
};
