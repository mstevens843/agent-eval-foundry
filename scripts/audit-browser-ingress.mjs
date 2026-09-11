// Exercise the real HTTP authority independently of the DOM driver. No provider calls.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startApplication } from "../tasks/browser-replay-repair/private/application/server.mjs";
const event={step:0,entity:"1",field:"title",value:"",path:"/records/1",selector:"#old"};
const token=randomUUID(),app=await startApplication({traceId:"ingress",events:[event]},{authorizationToken:token});
const rows=[];
try {
 for(const path of ["/","/facts?path=/records/1","/debug","/submit","/confirm","/advance","/renew","/operation"]){
  const get=path==="/"||path.startsWith("/facts")||path==="/debug";
  const response=await fetch(app.url+path,{method:get?"GET":"POST",...(get?{}:{body:JSON.stringify({operationId:'["ingress",0]',entity:"1",field:"title",value:""})})});
  rows.push({path,status:response.status});assert.equal(response.status,401);await response.text();
 }
 assert.equal(app.state.effects.length,0);assert.equal(app.state.actions.length,0);assert.equal(app.state.tick,0);
 const allowed=await fetch(app.url+"/debug",{headers:{"x-replay-authority":token}});assert.equal(allowed.status,200);await allowed.text();
 console.log(JSON.stringify({providerCallsMade:0,unauthenticated:rows,authenticatedStatus:200,effects:0,pass:true}));
} finally {await app.close()}
