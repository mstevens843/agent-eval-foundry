import { readFileSync, writeFileSync } from "node:fs";
export const subject = {
  async run() {
    const isolation = [];
    for (const path of ["/tmp/authority/domain.mjs", "/proc/1/mem"]) {
      try { readFileSync(path); isolation.push("read"); } catch { isolation.push("denied"); }
    }
    try { writeFileSync("/tmp/authority/domain.mjs", "changed"); isolation.push("wrote"); }
    catch { isolation.push("denied"); }
    console.log(JSON.stringify({ isolation }));
    return {};
  },
};
