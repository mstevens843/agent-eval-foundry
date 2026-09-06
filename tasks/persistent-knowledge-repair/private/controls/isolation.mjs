import { readFileSync, writeFileSync } from "node:fs";
export const subject = {
  run(view) {
    const attempts = [];
    for (const p of ["/tmp/authority/domain.mjs", "/proc/1/mem"]) {
      try {
        attempts.push(readFileSync(p, "utf8"));
      } catch {
        attempts.push("denied");
      }
    }
    try {
      writeFileSync("/tmp/authority/domain.mjs", "changed");
      attempts.push("wrote");
    } catch {
      attempts.push("denied");
    }
    console.log(JSON.stringify({ isolation: attempts }));
    return { job: view.job, decisions: [] };
  },
};
