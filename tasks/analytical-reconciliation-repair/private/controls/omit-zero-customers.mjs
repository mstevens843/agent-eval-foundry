import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, {
      ...api,
      record: (r) =>
        r.row.usageUs === "0" && r.row.creditMicrocents === "0"
          ? Promise.resolve({ stored: true })
          : api.record(r),
    });
  },
};
