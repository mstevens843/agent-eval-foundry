// Additional provider-free interface, transport and representability evidence.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { scenarios } from "../tasks/route-policy-repair/private/scenarios.mjs";
import { plan } from "../tasks/route-policy-repair/private/reference/src/plan.mjs";
import { validateTarget } from "../tasks/route-policy-repair/private/target.mjs";
import { vocabulary, equivalent, prefixWitnesses } from "../tasks/route-policy-repair/private/equivalence.mjs";
const base = ".local/next-five-successors-2026-09-10";
const ids = ["route-policy-repair", "browser-replay-repair", "recurring-calendar-repair", "workflow-authority-repair", "delegated-budget-repair"];
const { evaluate } = await import(resolve(base, "author-four/route-policy-repair/private/domain.mjs"));
const failures = [], syntax = [], declarations = [];
function files(root) { return readdirSync(root, {withFileTypes:true}).flatMap(e => e.isDirectory() ? files(join(root,e.name)) : [join(root,e.name)]); }
const hash = p => createHash("sha256").update(readFileSync(p)).digest("hex");
for (const id of ids) {
  for (const file of files("tasks/"+id)) if(file.endsWith(".mjs")) {
    const r = spawnSync(process.execPath, ["--check",file], {encoding:"utf8"});
    syntax.push({file,passed:r.status===0}); if(r.status!==0) failures.push({file,error:r.stderr});
  }
  declarations.push(...files("tasks/"+id+"/public").filter(p=>p.endsWith(".d.ts")));
}
const tsc=spawnSync("pnpm",["exec","tsc","--noEmit","--skipLibCheck","--target","es2022","--module","nodenext","--moduleResolution","nodenext",...declarations],{encoding:"utf8"});
if(tsc.status!==0)failures.push({declarations,error:tsc.stdout+tsc.stderr});
const route = scenarios().map(s => {
  const config=plan(s); validateTarget(config,vocabulary(s.config,s.request));
  const equivalentToSource=equivalent(s.config,s.request,config,evaluate);
  if(!equivalentToSource)failures.push({scenario:s.id,error:"translation"});
  const rs=Object.values(config.egresses).flat();
  return {id:s.id,egresses:Object.keys(config.egresses).length,rules:rs.length,atoms:rs.reduce((n,r)=>n+r.when.all.length+r.when.none.length,0),bytes:Buffer.byteLength(JSON.stringify({config})),communities:vocabulary(s.config,s.request).length,prefixClasses:prefixWitnesses(s.config,s.request,config).length,equivalentToSource};
});
const native=ids.map(id=>{
  const a=JSON.parse(readFileSync(join(base,"harbor-final",id,"export-manifest.json")));
  const b=JSON.parse(readFileSync(join(base,"harbor-rebuild",id,"export-manifest.json")));
  const sourceMatches=a.sourceFiles.every(f=>hash(join("tasks",id,f.path))===f.sha256);
  const reproducible=a.digest===b.digest;
  if(!sourceMatches||!reproducible)failures.push({id,sourceMatches,reproducible});
  return {id,digest:a.digest,sourceMatches,reproducible};
});
const browserCopies=["server.mjs","page.mjs","driver.mjs"].map(name=>{
  const equal=hash("tasks/browser-replay-repair/public/app/"+name)===hash("tasks/browser-replay-repair/private/application/"+name);
  if(!equal)failures.push({name,error:"app drift"});return {name,equal};
});
const result={syntax,declarations:{files:declarations,pass:tsc.status===0},route,native,browserCopies,failures,pass:failures.length===0,providerCallsMade:0};
writeFileSync(join(base,"interface-capacity.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({syntax:syntax.length,declarations:declarations.length,route:route.length,maxRules:Math.max(...route.map(r=>r.rules)),maxAtoms:Math.max(...route.map(r=>r.atoms)),maxBytes:Math.max(...route.map(r=>r.bytes)),pass:result.pass,failures}));
if(!result.pass)process.exitCode=1;
