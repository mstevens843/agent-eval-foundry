import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
export function openStore(directory) {
  const path = join(directory, "records.json");
  let records = Object.create(null);
  try {
    records = Object.assign(Object.create(null), JSON.parse(readFileSync(path, "utf8")));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  return {
    records,
    commit() {
      writeFileSync(`${path}.next`, JSON.stringify(records));
      renameSync(`${path}.next`, path);
    },
  };
}
