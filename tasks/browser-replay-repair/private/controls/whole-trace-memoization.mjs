import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveTarget } from "./resolver.mjs";
import { submitForm } from "./form.mjs";
export function replay(view, api) {
  const file = join(view.storage, "trace-completed.json");
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  for (const event of view.events) {
    const node = resolveTarget(event, api);
    if (!submitForm(node, event, api)) throw Error("submission incomplete");
  }
  const result = {
    traceId: view.traceId,
    steps: view.events.map((e) => ({ step: e.step, status: "completed" })),
  };
  writeFileSync(file, JSON.stringify(result));
  return result;
}
