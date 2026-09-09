import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
export function journal(storage) {
  const file = join(storage, "dispatch.json");
  let data = { receipts: {}, wallets: {} };
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  return {
    data,
    save() {
      writeFileSync(`${file}.next`, JSON.stringify(data));
      renameSync(`${file}.next`, file);
    },
  };
}
