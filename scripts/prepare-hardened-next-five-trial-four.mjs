// Prepare only: freeze the current execution source, build it, adapt the operator's
// previously used controller, and verify five immutable exports. Never dispatch.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, lstatSync, readlinkSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const here = join(root,".local/hardened-next-five-trial-four-2026-09-11");
const frozen = join(here,"frozen-source");
const evidencePath = "reports/screening/evidence/2026-09-11-next-five-coverage-v2.json";
const templatePath = ".local/hardened-next-five-trial-three-2026-09-11/campaign.mjs";
const hash = p => createHash("sha256").update(readFileSync(p)).digest("hex");
const read = p => JSON.parse(readFileSync(p,"utf8"));
const save = (p,v) => writeFileSync(p,JSON.stringify(v,null,2)+"\n",{flag:"wx"});
assert(!existsSync(here),"Preparation already exists; verify it, do not overwrite it");
execFileSync(process.execPath,[join(root,"scripts/verify-next-five-coverage-v2.mjs")],{cwd:root,stdio:"inherit"});
const previousPath="reports/screening/evidence/2026-09-11-hardened-next-five-trial-three-preparation.json";
const previous=read(join(root,previousPath));
const previousReady=read(join(root,previous.files.ready.path));
const completed=read(join(root,previous.runRoot,"CAMPAIGN-COMPLETE.json"));
assert.equal(completed.results.length,5);
assert(completed.results.every(r=>r.status==="fulfilled" && r.outcome===(r.id==="browser-replay-repair"?"invalid-execution":"semantic-fail")));
const priorApi=await import(new URL("../"+previous.runtime.directory+"/dist/index.js",import.meta.url));
const priorRecords=[];
for(const row of previous.packages){
 const record=join(root,previous.runRoot,"jobs/real-provider/records",row.id+"-attempt-1");
 const evidence=priorApi.verifyEvidence(record);
 const completion=join(record,"completion.json");
 priorRecords.push({id:row.id,completion:{path:relative(root,completion),sha256:hash(completion)},files:evidence.files.length,countsAsModelFailure:read(join(record,"result.json")).countsAsModelFailure});
}
mkdirSync(frozen,{recursive:true});
const sourcePaths = ["src","scripts","data","package.json","pnpm-lock.yaml","tsconfig.json","tsup.config.ts"];
const files=[];
function capture(path) {
  const source=join(root,path), target=join(frozen,path), stat=lstatSync(source);
  assert(!stat.isSymbolicLink(),"Unexpected source symlink: "+path);
  if(stat.isDirectory()) for(const name of readdirSync(source).sort())capture(join(path,name));
  else {
    mkdirSync(dirname(target),{recursive:true});cpSync(source,target);
    const sha256=hash(source);assert.equal(hash(target),sha256);
    files.push({path,sha256,bytes:stat.size});
  }
}
for(const path of sourcePaths)capture(path);
// Dependency cache is copied, not linked to the live workspace. It does not
// contain provider credentials. No installation or provider call is necessary.
cpSync(join(root,"node_modules"),join(frozen,"node_modules"),{recursive:true,verbatimSymlinks:true});
const build=spawnSync("pnpm",["build"],{cwd:frozen,encoding:"utf8",timeout:180000,maxBuffer:8*1024*1024});
writeFileSync(join(here,"build.log"),`${build.stdout??""}\n${build.stderr??""}`);
assert.equal(build.status,0,build.error?.message??build.stderr);
for(const f of files)assert.equal(hash(join(frozen,f.path)),f.sha256);
const bundleSha256=hash(join(frozen,"dist/index.js"));
const builtIdentity=execFileSync(process.execPath,["--input-type=module","-e",`const a=await import('./dist/index.js'); if(a.executionSourceIdentity()!==a.authoritySourceDigest(process.cwd()))throw Error('build identity mismatch');console.log(a.executionSourceIdentity())`],{cwd:frozen,encoding:"utf8"}).trim();
const identity={sourcePaths,sourceDigest:builtIdentity,bundleSha256,files,buildLogSha256:hash(join(here,"build.log")),dependencies:"copied local pnpm dependency tree; no live source or dist links",providerCallsMade:0};
save(join(here,"runtime-verification.json"),identity);
cpSync(join(root,evidencePath),join(here,"evidence.json"));
cpSync(join(root,templatePath),join(here,"previous-controller.mjs"));
let code=readFileSync(join(root,templatePath),"utf8");
const change=(from,to)=>{assert.equal(code.split(from).length,2,"Controller anchor: "+from);code=code.replace(from,to);};
change(previous.runtime.bundleSha256,bundleSha256);
change("// Third model attempt on five 3.0.0 successors, coverage-v2 (historical Trial 5).","// Fourth model attempt on five 3.0.0 successors, coverage-v2 (historical Trial 6).");
change("// Runtime is a verified byte-identical copy of completed Trial 4; no rebuild or provider calls during prepare.","// Isolated rebuilt runtime adds bounded authoring diagnostics; task and grader packages are unchanged.");
change("// Trial 4 runtime copied byte-for-byte into this campaign's frozen-source.","// Current source independently copied and built into this campaign's frozen-source.");
change("// Fresh campaign state; completed Trial 4 records and runtime remain unchanged.","// Fresh campaign state; completed Trial 5 records and runtime remain unchanged.");
change("// Third 3.0.0 attempt assignments: same three Codex and two Claude providers.","// Fourth 3.0.0 attempt: all five switch providers, two Codex and three Claude.");
code=code.replace(/"target": "(claude|codex)"/g,(_,target)=>'"target": "'+(target==="claude"?"codex":"claude")+'"');
change("      historicalTrial: 5,","      historicalTrial: 6,");
change("      versionAttempt: 3,","      versionAttempt: 4,");
change("    profile.limits.wallMs = WALL_MS;","    profile.limits.wallMs = WALL_MS;\n    if (task.id === 'browser-replay-repair') profile.limits.memoryMiB = 4096;");
change("plans.filter((x) => x.target === 'codex').length, 3","plans.filter((x) => x.target === 'codex').length, 2");
change("plans.filter((x) => x.target === 'claude').length, 2","plans.filter((x) => x.target === 'claude').length, 3");
change("machine.cpus >= 10 && machine.memory >= 12 * 1024 ** 3", "machine.cpus >= 10 && machine.memory >= (ready.packages.reduce((sum,p)=>sum+p.profile.limits.memoryMiB,0)+2048) * 1024 ** 2");
code=code.replaceAll("--user-authorized-five-concurrent-v3-trial-3","--user-authorized-five-concurrent-v3-trial-4").replaceAll("hardened-v3-third","hardened-v3-fourth");
code=code.replace(/    userAuthority: .*\n/,`    userAuthority: ${JSON.stringify("User authorized one fresh attempt on each unchanged 3.0.0 / coverage-v2 task, switching all providers: Route and Browser on Codex; Calendar, Workflow and Budget on Claude. Five concurrent, subscription-only, no paid API fallback, no automatic retries. Historical Trial 6; fourth version attempt. Browser has 4096 MiB authoring memory as an infrastructure mitigation; its interrupted Trial 5 Claude attempt remains unscored and its missing Claude slot is not filled by this campaign.")},\n`);
writeFileSync(join(here,"campaign.mjs"),code,{flag:"wx"});
const diff=spawnSync("diff",["-u",join(here,"previous-controller.mjs"),join(here,"campaign.mjs")],{encoding:"utf8"});
assert([0,1].includes(diff.status));writeFileSync(join(here,"controller.diff"),diff.stdout);
const sourceChanges=[];
const oldFiles=new Map(read(join(root,previous.files.runtimeVerification.path)).files.map(f=>[f.path,f.sha256]));
for(const f of files)if(oldFiles.get(f.path)!==f.sha256)sourceChanges.push({path:f.path,beforeSha256:oldFiles.get(f.path)??null,afterSha256:f.sha256});
save(join(here,"provenance.json"),{predecessor:{path:previousPath,sha256:hash(join(root,previousPath))},runtimeRebuilt:true,packageBytesChanged:false,providerAssignmentsChanged:true,sourceChanges,priorRecords,providerCallsMade:0});
execFileSync(process.execPath,[join(here,"campaign.mjs"),"prepare"],{cwd:root,stdio:"inherit",timeout:60000});
execFileSync(process.execPath,[join(here,"campaign.mjs"),"verify"],{cwd:root,stdio:"inherit",timeout:60000});
assert(!existsSync(join(here,"real-campaign-frozen/DISPATCH-CLAIM")));
const depFiles=[];
const depRoot=realpathSync(join(frozen,"node_modules"));
function dependencies(directory,prefix="") {
  for(const name of readdirSync(directory).sort()) {
    const path=join(directory,name),rel=join(prefix,name),stat=lstatSync(path);
    if(stat.isSymbolicLink()) {
      const target=relative(depRoot,realpathSync(path));
      assert(target!==".."&&!target.startsWith("../"),"Dependency escapes frozen tree: "+rel);
      depFiles.push({path:rel,link:readlinkSync(path)});
    } else if(stat.isDirectory()) dependencies(path,rel);
    else depFiles.push({path:rel,sha256:hash(path),bytes:stat.size});
  }
}
dependencies(depRoot);
save(join(here,"dependencies.json"),{files:depFiles,providerCallsMade:0});

const ref=path=>({path:relative(root,path),sha256:hash(path)});
const ready=read(join(here,"real-campaign-frozen/READY.json"));
for(const plan of ready.packages){
 const old=previousReady.packages.find(p=>p.id===plan.id);assert(old);
 for(const key of ["packageDigest","nativeDigest","instructionSha256","checks","gradingRevision"])assert.deepEqual(plan[key],old[key],plan.id+": "+key);
 assert.equal(plan.target,old.target==="claude"?"codex":"claude");
 assert.equal(plan.profile.limits.memoryMiB,plan.id==="browser-replay-repair"?4096:2048);
}
const preparation={schemaVersion:1,date:"2026-09-11",purpose:"Historical Trial 6; fourth 3.0.0 attempt; all five providers switched; identical coverage-v2 packages",concurrency:5,maxProviderCalls:5,automaticRetries:false,billingMode:"subscription-only",wallMsPerTask:10800000,runRoot:relative(root,join(here,"real-campaign-frozen")),files:Object.fromEntries(Object.entries({controller:"campaign.mjs",ready:"real-campaign-frozen/READY.json",runtimeVerification:"runtime-verification.json",dependencies:"dependencies.json",provenance:"provenance.json",controllerDiff:"controller.diff",previousController:"previous-controller.mjs",hardeningEvidence:"evidence.json",buildLog:"build.log"}).map(([k,v])=>[k,ref(join(here,v))])),runtime:{directory:relative(root,frozen),sourceDigest:builtIdentity,bundleSha256},predecessor:ref(join(root,previousPath)),runtimeRebuilt:true,packageBytesChanged:false,providerAssignmentsChanged:true,browserMitigation:{previousMemoryMiB:2048,memoryMiB:4096,confirmedCrashCause:false,resourceDiagnostics:true,interruptedTrial:5,interruptedTarget:"claude",countedReward:null,missingClaudeSlotStillPending:true},priorRecords,packages:ready.packages.map(p=>({id:p.id,target:p.target,packageDigest:p.packageDigest,profileDigest:p.profileDigest,historicalTrial:p.historicalTrial,versionAttempt:p.versionAttempt,gradingRevision:p.gradingRevision,analysisDocument:p.analysisDocument,profile:p.profile})),providerCallsMade:0};
save(join(root,"reports/screening/evidence/2026-09-11-hardened-next-five-trial-four-preparation.json"),preparation);
execFileSync(process.execPath,[join(root,"scripts/verify-hardened-next-five-trial-four.mjs")],{cwd:root,stdio:"inherit",timeout:60000});
console.log(JSON.stringify({prepared:true,packages:5,concurrency:5,sourceDigest:builtIdentity,providerCallsMade:0}));
