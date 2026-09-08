import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    return run(view, {
      ...api,
      publish: (r) =>
        api.publish(r.record.version > 1 ? { record: { ...r.record, version: 1, supersedes: null } } : r),
    });
  },
};
