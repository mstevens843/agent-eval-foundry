import { consume } from "./src/consumer.mjs";
export const subject = { run(view, api) { return consume(view, { ...api, receipts: () => [] }); } };
