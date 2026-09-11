import { run } from "./src/release.mjs";
export const subject = { async run(v, api) {
  await run(v,api);
  for (const resource of v.target) await api.create({resource:{...resource,parents:[...resource.parents].reverse()}});
  for (const id of v.scope) if (!v.target.some(r=>r.id===id)) await api.remove({id});
  return {};
} };
