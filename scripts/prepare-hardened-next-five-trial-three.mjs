// Prepare five fresh records using Trial 4's exact runtime/packages. Never dispatch.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const previousManifest="reports/screening/evidence/2026-09-11-hardened-next-five-trial-two-preparation.json";
const outputManifest="reports/screening/evidence/2026-09-11-hardened-next-five-trial-three-preparation.json";
const here=join(root,".local/hardened-next-five-trial-three-2026-09-11");
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const hash=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const ref=p=>({path:relative(root,p),sha256:hash(p)});
const save=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+"\n",{flag:"wx"});
assert(!existsSync(here)&&!existsSync(join(root,outputManifest)),"Preparation exists; verify it instead");
execFileSync(process.execPath,[join(root,"scripts/verify-hardened-next-five-trial-two.mjs")],{cwd:root,stdio:"inherit",timeout:60000});
const previous=read(join(root,previousManifest));
const previousReady=read(join(root,previous.files.ready.path));
const completedPath=join(root,previous.runRoot,"CAMPAIGN-COMPLETE.json");
const completed=read(completedPath);
assert.equal(completed.results.length,5);
assert(completed.results.every(r=>r.status==="fulfilled"&&r.outcome==="semantic-fail"));
assert(completed.jobs.every(j=>j.state==="completed"));
const api=await import(pathToFileURL(join(root,previous.runtime.directory,"dist/index.js")));
const priorRecords=[];
for(const row of previous.packages) {
  const record=join(root,previous.runRoot,"jobs/real-provider/records",row.id+"-attempt-1");
  const evidence=api.verifyEvidence(record);
  priorRecords.push({id:row.id,completion:ref(join(record,"completion.json")),files:evidence.files.length,gradeSummaryPresent:existsSync(join(record,"grading/checker-grade/grade-summary.json"))});
}
mkdirSync(here);
const previousFrozen=join(root,previous.runtime.directory),frozen=join(here,"frozen-source");
cpSync(previousFrozen,frozen,{recursive:true,verbatimSymlinks:true});
function inventory(directory,prefix="") {
  return readdirSync(directory).sort().flatMap(name=>{
    const file=join(directory,name),path=join(prefix,name),stat=lstatSync(file);
    if(stat.isSymbolicLink())return [{path,link:readlinkSync(file)}];
    if(stat.isDirectory())return inventory(file,path);
    assert(stat.isFile());return [{path,bytes:stat.size,sha256:hash(file)}];
  });
}
const previousFiles=inventory(previousFrozen),copiedFiles=inventory(frozen);
assert.deepEqual(copiedFiles,previousFiles,"Frozen runtime copy changed bytes");
save(join(here,"runtime-copy.json"),{predecessor:previous.runtime.directory,files:copiedFiles,byteIdentical:true});
for(const [key,name] of [["runtimeVerification","runtime-verification.json"],["dependencies","dependencies.json"],["hardeningEvidence","evidence.json"]])cpSync(join(root,previous.files[key].path),join(here,name));
const template=join(root,previous.files.controller.path);
cpSync(template,join(here,"previous-controller.mjs"));
let code=readFileSync(template,"utf8");
const change=(from,to)=>{assert.equal(code.split(from).length,2,"Controller anchor: "+from);code=code.replace(from,to);};
change("// Second model attempt on five 3.0.0 successors, coverage-v2 (historical Trial 4).","// Third model attempt on five 3.0.0 successors, coverage-v2 (historical Trial 5).");
change("// Fresh runtime is built from current repository source; no provider calls during prepare.","// Runtime is a verified byte-identical copy of completed Trial 4; no rebuild or provider calls during prepare.");
change("// Current hardening runtime, copied and built in this campaign's frozen-source.","// Trial 4 runtime copied byte-for-byte into this campaign's frozen-source.");
change("// Fresh campaign state; the completed top-five campaign and its runtime remain unchanged.","// Fresh campaign state; completed Trial 4 records and runtime remain unchanged.");
change("// Second 3.0.0 attempt assignments: three Codex and two Claude attempts.","// Third 3.0.0 attempt assignments: same three Codex and two Claude providers.");
change("      historicalTrial: 4,","      historicalTrial: 5,");
change("      versionAttempt: 2,","      versionAttempt: 3,");
code=code.replaceAll("--user-authorized-five-concurrent-v3-trial-2","--user-authorized-five-concurrent-v3-trial-3").replaceAll("hardened-v3-second","hardened-v3-third");
change("This is historical Trial 4, the second attempt on the unchanged public 3.0.0 contract, and first on these corrected private package bytes.","This is historical Trial 5, the third attempt on the public 3.0.0 contract, using the exact packages, runtime and providers from Trial 4. Opposite-provider attempts are not authorized in this campaign.");
writeFileSync(join(here,"campaign.mjs"),code,{flag:"wx"});
const diff=spawnSync("diff",["-u",join(here,"previous-controller.mjs"),join(here,"campaign.mjs")],{encoding:"utf8"});
assert([0,1].includes(diff.status));writeFileSync(join(here,"controller.diff"),diff.stdout,{flag:"wx"});
save(join(here,"provenance.json"),{predecessor:ref(join(root,previousManifest)),previousCompletion:ref(completedPath),previousController:ref(template),runtimeRebuilt:false,runtimeByteIdentical:true,packageBytesChanged:false,providerAssignmentsChanged:false,priorRecords,providerCallsMade:0});
execFileSync(process.execPath,[join(here,"campaign.mjs"),"prepare"],{cwd:root,stdio:"inherit",timeout:60000});
const ready=read(join(here,"real-campaign-frozen/READY.json"));
assert.equal(ready.sourceDigest,previous.runtime.sourceDigest);
assert.equal(ready.evidenceDigest,previousReady.evidenceDigest);
assert.equal(ready.concurrency,5);assert.equal(ready.maxProviderCalls,5);
for(const p of ready.packages) {
  const old=previousReady.packages.find(r=>r.id===p.id);assert(old);
  for(const key of ["target","packageDigest","nativeDigest","profileDigest","instructionSha256","profile","checks","gradingRevision"])assert.deepEqual(p[key],old[key],p.id+": "+key);
  assert.equal(p.historicalTrial,5);assert.equal(p.versionAttempt,3);
}
const fileMap={controller:"campaign.mjs",ready:"real-campaign-frozen/READY.json",runtimeVerification:"runtime-verification.json",dependencies:"dependencies.json",hardeningEvidence:"evidence.json",runtimeCopy:"runtime-copy.json",previousController:"previous-controller.mjs",controllerDiff:"controller.diff",provenance:"provenance.json"};
save(join(root,outputManifest),{schemaVersion:1,date:"2026-09-11",purpose:"Historical Trial 5; third 3.0.0 attempt, identical to Trial 4 packages and providers",concurrency:5,maxProviderCalls:5,automaticRetries:false,billingMode:"subscription-only",wallMsPerTask:10800000,runRoot:relative(root,join(here,"real-campaign-frozen")),files:Object.fromEntries(Object.entries(fileMap).map(([key,path])=>[key,ref(join(here,path))])),runtime:{...previous.runtime,directory:relative(root,frozen)},predecessor:ref(join(root,previousManifest)),runtimeRebuilt:false,packageBytesChanged:false,providerAssignmentsChanged:false,packages:ready.packages.map(({id,target,packageDigest,profileDigest,historicalTrial,versionAttempt,gradingRevision,analysisDocument,profile})=>({id,target,packageDigest,profileDigest,historicalTrial,versionAttempt,gradingRevision,analysisDocument,profile})),priorRecords,providerCallsMade:0});
execFileSync(process.execPath,[join(root,"scripts/verify-hardened-next-five-trial-three.mjs")],{cwd:root,stdio:"inherit",timeout:60000});
assert(!existsSync(join(here,"real-campaign-frozen/DISPATCH-CLAIM")));
console.log(JSON.stringify({prepared:true,historicalTrial:5,versionAttempt:3,packages:5,concurrency:5,sourceDigest:ready.sourceDigest,providerCallsMade:0}));
