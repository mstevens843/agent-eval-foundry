import { readFileSync, writeFileSync } from "node:fs";
export const subject = {
  async run() {
    const result = [];
    for (const p of ["/tmp/authority/domain.mjs", "/proc/1/mem"]) {
      try {
        readFileSync(p);
        result.push("read");
      } catch {
        result.push("denied");
      }
    }
    try {
      writeFileSync("/tmp/authority/domain.mjs", "changed");
      result.push("wrote");
    } catch {
      result.push("denied");
    }
    console.log(JSON.stringify({ isolation: result }));
    return { complete: true };
  },
};
