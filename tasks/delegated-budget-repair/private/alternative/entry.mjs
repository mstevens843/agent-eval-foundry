import { run } from "./src/dispatcher.mjs";
export const subject = { run: (v, a) => run(v, a, { retry: true, recover: true }) };
