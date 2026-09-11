import { run } from "./src/replay.mjs";
export const subject = {
  async run(view, api) {
    return { report: await run(view, api) };
  },
};
