import { run } from "./src/replay.mjs";
export const subject = { run: (v, a) => run(v, a, { fillProof: true, retry: true, recover: true }) };
