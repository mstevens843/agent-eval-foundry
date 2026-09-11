import { run } from "./src/service.mjs";
export const subject = { run: (view, api) => run(view, api, { reverse: true, recover: true }) };
