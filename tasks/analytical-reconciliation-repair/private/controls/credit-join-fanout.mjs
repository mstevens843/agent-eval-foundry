import { run } from "./src/service.mjs";
export const subject = {
  async run(view, api) {
    return run(view, {
      ...api,
      record: ({ row }) => {
        const c = BigInt(row.creditMicrocents) * BigInt(Math.max(1, row.usageIds.length));
        return api.record({
          row: {
            ...row,
            creditMicrocents: String(c),
            balanceMicrocents: String(BigInt(row.chargeMicrocents) - c),
          },
        });
      },
    });
  },
};
