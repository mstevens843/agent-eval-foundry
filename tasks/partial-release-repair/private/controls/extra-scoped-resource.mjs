import {run} from "./src/release.mjs";
import {perform} from "./src/transport.mjs";
export const subject={async run(v,api){
 await run(v,api);
 const id=v.scope.find(id=>!v.target.some(r=>r.id===id));
 if(id!==undefined) await perform(api,"create",{resource:{id,parents:[],payload:"unrequested leftover"}});
 return {};
}};
