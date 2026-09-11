import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "./src/replay.mjs";
export const subject = {
  async run(view, api) {
    const started = join(view.storage, "attempt-started-" + view.attempt);
    const recovered = join(view.storage, "recovered");
    // A repeated entry to the same delivery establishes an actual lost response.
    if (existsSync(started)) writeFileSync(recovered, "1");
    writeFileSync(started, "1");
    const report = await run(view, api);
    return view.attempt > 0 && existsSync(recovered) ? null : report;
  },
};
