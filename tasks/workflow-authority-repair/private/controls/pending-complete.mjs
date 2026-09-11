import { run } from "./src/service.mjs";
export const subject = {
  run: (v, api) =>
    run(v, {
      ...api,
      outcome: async (r) => {
        const x = await api.outcome(r);
        return x.status === "PENDING" ? { status: "TERMINAL", decision: { id: "invented" } } : x;
      },
    }),
};
