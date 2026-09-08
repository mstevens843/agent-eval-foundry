import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      publish: (r) => api.publish({ record: { ...r.record, payload: { ...r.record.payload, sources: [] } } }),
    });
  },
};
