// Provider-free mutation audit of saved, actually executed candidate traces.
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [destination, ...inputs] = process.argv.slice(2);
if (!destination || inputs.length !== 5) throw Error("Usage: audit-next-five-checkers.mjs FRESH_OUT FIVE_AUTHOR_OR_NATIVE_INTEGRITY_TASK_DIRS");
const out=resolve(destination);mkdirSync(out,{recursive:false});
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const summary=[];
for(const input of inputs){
 const directory=resolve(input),id=directory.split("/").at(-1),source=join("tasks",id,"private");
 const controls=read(join(source,"control-manifest.json")).filter(c=>!c.isolation);
 const variants=existsSync(join(source,"variants"))?readdirSync(join(source,"variants")).sort().map(n=>"variant-"+n):[];
 const nativePath=join(directory,"logs/checker-cases.json");
 const native=existsSync(nativePath)?read(nativePath):null;
 const names=native?native.cases.map(c=>c.token):["reference","alternative",...variants,...controls.map(c=>c.id)];
 const cases=native?native.cases:names.map((name,i)=>({token:"audit-"+i,cells:read(join(directory,name,"cells.json")).map(({checks,failures,expected,browserTrace,...raw})=>raw)}));
 const labels=native?cases.map(c=>native.labels[c.token]):names.map(n=>n==="reference"||n==="alternative"||n.startsWith("variant-"));
 const edits=[];
 const change=(name,file,from,to)=>edits.push({name,file,apply:s=>{assert(s.includes(from),name+": anchor");return s.replace(from,to)}});
 const omit=(name,from,to)=>change(name,"checker.mjs",from,to);
 if(id==="workflow-authority-repair"){
  omit("ignore-superseded-admissions","for (const a of authorizations)","for (const a of authorizations.filter(a=>decisions.some(d=>d.authorizationId===a.id)))");
  omit("ignore-payload","!equal(record.payload, job.payload)","false");
  omit("ignore-origin","record.principal !== root.principal","false");
 }
 if(id==="recurring-calendar-repair"){
  omit("final-generation-only","c.publications.filter((p) => p.deliveryId === d.id)","[]");
  edits.push({name:"ignore-source-records",file:"checker.mjs",apply:s=>s.replace("!equal(sorted(prefix.records), sorted(records))","false").replace("!equal(sorted(p.records), sorted(records))","false")});
  omit("ignore-attendees","attendees: sorted(e.attendees)","attendees: []");
  omit("forbid-republication","function check(c) {","function check(c) { if(new Set(c.publications.map(p=>p.deliveryId)).size!==c.publications.length)return false;");
 }
 if(id==="delegated-budget-repair"){
  change("ignore-owner","src/dispatcher.mjs","w?.owner !== r.owner ||","");
  change("ignore-grant-version","src/dispatcher.mjs","g.version !== r.grantVersion ||","");
  change("ignore-delegate","src/dispatcher.mjs","g.delegate !== r.delegate ||","");
  change("allow-reservation-reuse","src/dispatcher.mjs","      hold ||","");
  change("capture-frees-allowance","src/dispatcher.mjs",'x.kind === "release"','["release","capture"].includes(x.kind)');
 }
 if(id==="route-policy-repair"){
  omit("sampled-routes-only","if (!equivalent(cell.config, cell.request, published, interpret)) return false;","");
  omit("ignore-publish-after-success"," || successful[0] !== calls.at(-1)","");
  omit("forbid-failed-publications","const successful = calls.filter","if(calls.some(c=>c.value?.ok!==true))return false;\n  const successful = calls.filter");
 }
 if(id==="browser-replay-repair"){
  omit("ignore-accepted-actions","c.actions.every((a)","[].every((a)");
  omit("ignore-report-content","return c.reports.every((r)","return [].every((r)");
  omit("forbid-idempotent-submissions","function check(c) {","function check(c) { const xs=c.actions.filter(a=>a.kind==='submit');if(new Set(xs.map(a=>a.operationId)).size!==xs.length)return false;");
 }
 const entry=readFileSync(join(source,"reference/checker.mjs"),"utf8");
 const fn=entry.includes("function check(c)")?"function check(c) {":entry.includes("function check(cell)")?"function check(cell) {":"function valid(cell) {";
 const param=fn.includes("check(c)")?"c":"cell";
 omit("forbid-corrected-api-errors",fn,fn+` if(${param}.observations.some(o=>o.value?.error||o.value?.ok===false))return false;`);
 const taskResults=[];
 for(const edit of [{name:"reference"},...edits]){
  const folder=join(out,id,edit.name);cpSync(join(source,"reference"),folder,{recursive:true});
  if(edit.file){const path=join(folder,edit.file);writeFileSync(path,edit.apply(readFileSync(path,"utf8")));}
  const {run}=await import(pathToFileURL(join(folder,"checker.mjs")));
  const begin=performance.now();const result=await run({cases});
  const errors=cases.flatMap((c,i)=>result.verdicts[c.token]?.ok===labels[i]?[]:[{candidate:names[i],expected:labels[i],actual:result.verdicts[c.token]?.ok}]);
  const row={id,mutation:edit.name,candidates:cases.length,protectedTraceCapture:Boolean(native),caseSource:native?nativePath:directory,correct:cases.length-errors.length,errors,elapsedMs:performance.now()-begin,pass:edit.name==="reference"?errors.length===0:errors.length>0};
  taskResults.push(row);console.log(JSON.stringify(row));
 }
 summary.push(...taskResults);
 writeFileSync(join(out,"summary.json"),JSON.stringify({providerCallsMade:0,protectedExecution:false,results:summary},null,2)+"\n");
}
if(summary.some(r=>!r.pass))process.exitCode=1;
