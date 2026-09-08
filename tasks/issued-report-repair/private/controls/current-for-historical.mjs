import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    let step = null;
    return run(view, {
      ...api,
      next: async () => (step = await api.next({})),
      answer: async (r) => {
        const q = step.queries.find((q) => q.id === r.id),
          s = await api.snapshot({}),
          row = s.history.filter((x) => x.report === q.report).toSorted((a, b) => b.version - a.version)[0];
        return api.answer({ ...r, payload: row.payload });
      },
    });
  },
};
