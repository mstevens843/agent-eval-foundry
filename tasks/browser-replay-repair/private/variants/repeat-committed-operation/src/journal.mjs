import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
export function journal(storage) {
  const file = join(storage, "completed.json");
  let completed = [];
  try {
    completed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return {
    has: (key) => completed.includes(key),
    mark(key) {
      completed.push(key);
      writeFileSync(file, JSON.stringify(completed));
    },
  };
}
