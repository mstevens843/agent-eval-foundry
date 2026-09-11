import { run } from "./src/release.mjs";
export const subject={async run(v,api) {
  await run(v,api);
  const current=(await api.inspect({})).resources;
  const id=v.scope.find(id=>!current.some(r=>r.id===id));
  if(id!==undefined) {await api.create({resource:{id,parents:[],payload:42}});await api.remove({id});}
  return {};
}};
