import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
// Record a stage intent before its RPC: the process may die after the effect lands.
// Multiple own stages (including rollback) must not be mistaken for a newer job.
export function trackProgress(view, api) {
  const path = join(view.storage, "generations-" + Buffer.from(JSON.stringify(view.job)).toString("hex") + ".json");
  const owned = new Map(existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : []);
  return { ...api, ownGeneration: id => owned.get(id), stage: async request => {
    const live = (await api.inventory({})).find(s => s.id === request.service);
    owned.set(request.service, live.deployment.generation + 1);
    writeFileSync(path + ".tmp", JSON.stringify([...owned])); renameSync(path + ".tmp", path);
    return api.stage(request);
  } };
}
