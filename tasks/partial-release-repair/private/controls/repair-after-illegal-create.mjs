import {run} from "./src/release.mjs";
export const subject={async run(v,api){
 const graph=(await api.inspect({})).resources;
 const id=v.scope.find(id=>!graph.some(r=>r.id===id));
 if(id!==undefined) await api.create({resource:{id,parents:["absent-parent-for-probe"],payload:"probe"}});
 return run(v,api);
}};
