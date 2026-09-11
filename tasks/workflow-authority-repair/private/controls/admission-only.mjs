import { run } from "./src/service.mjs";
export const subject = {
  async run(v, api) {
    const fake = new Map();
    return run(v, {
      ...api,
      admit: async (r) => {
        const x = await api.admit(r);
        if (x.authorization) fake.set(r.jobId, { id: x.authorization.id });
        return x;
      },
      dispatch: async () => ({ status: "PENDING" }),
      outcome: async (r) =>
        fake.has(r.jobId) ? { status: "TERMINAL", decision: fake.get(r.jobId) } : api.outcome(r),
    });
  },
};
