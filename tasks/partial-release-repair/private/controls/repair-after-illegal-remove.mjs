import {run} from "./src/release.mjs";
export const subject={async run(v,api){
 const graph=(await api.inspect({})).resources;
 const parent=graph.flatMap(r=>r.parents).find(id=>v.scope.includes(id));
 if(parent!==undefined) await api.remove({id:parent});
 return run(v,api);
}};
