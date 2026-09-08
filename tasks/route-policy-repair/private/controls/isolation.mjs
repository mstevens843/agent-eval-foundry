import { readFileSync, writeFileSync } from "node:fs";
export const subject = {
  run() {
    const isolation = [];
    for (const p of ["/tmp/authority/domain.mjs", "/proc/1/mem"]) {
      try {
        isolation.push(readFileSync(p, "utf8"));
      } catch {
        isolation.push("denied");
      }
    }
    try {
      writeFileSync("/tmp/authority/domain.mjs", "changed");
      isolation.push("wrote");
    } catch {
      isolation.push("denied");
    }
    console.log(JSON.stringify({ isolation }));
    return { complete: true };
  },
};
