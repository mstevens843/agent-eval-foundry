// Prepare only: freeze the current execution source, build it, adapt the operator's
// previously used controller, and verify five immutable exports. Never dispatch.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, lstatSync, readlinkSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const here = join(root,".local/hardened-next-five-trial-two-2026-09-11");
const frozen = join(here,"frozen-source");
const evidencePath = "reports/screening/evidence/2026-09-11-next-five-coverage-v2.json";
const templatePath = ".local/round-two-next-five-2026-09-09/campaign.mjs";
const hash = p => createHash("sha256").update(readFileSync(p)).digest("hex");
const read = p => JSON.parse(readFileSync(p,"utf8"));
const save = (p,v) => writeFileSync(p,JSON.stringify(v,null,2)+"\n",{flag:"wx"});
assert(!existsSync(here),"Preparation already exists; verify it, do not overwrite it");
execFileSync(process.execPath,[join(root,"scripts/verify-next-five-coverage-v2.mjs")],{cwd:root,stdio:"inherit"});
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
const replace=(from,to)=>{assert.equal(code.split(from).length,2,"controller anchor: "+from.slice(0,70));code=code.replace(from,to)};
replace("const frozenRoot = join(liveRepoRoot, '.local/round-two-top-five-2026-09-09/frozen-source');","const frozenRoot = join(here, 'frozen-source');");
replace("const api = await import(pathToFileURL(join(frozenRoot, 'dist/index.js')));",`// Verify the actual bundle bytes before importing the freshly built runtime.\nassert.equal(createHash('sha256').update(readFileSync(join(frozenRoot,'dist/index.js'))).digest('hex'), '${bundleSha256}', 'Frozen runtime bundle changed');\nprocess.chdir(frozenRoot);\nconst api = await import(pathToFileURL(join(frozenRoot, 'dist/index.js')));`);
replace("const EVIDENCE_JSON = join(liveRepoRoot, 'reports/screening/evidence/2026-09-09-next-five-implementation.json');","const EVIDENCE_JSON = join(here, 'evidence.json');");
replace("const EXPORT_ROOT = join(liveRepoRoot, '.local/next-five-implementation-2026-09-09/release-ready');","// Exact per-task export paths are read from the frozen hardening evidence.");
replace("  const exportDir = join(EXPORT_ROOT, taskId, 'export');",`  const ev = read(EVIDENCE_JSON).tasks.find(t => t.id === taskId);\n  assert(ev, taskId + ': missing hardening evidence');\n  const exportDir = join(liveRepoRoot, ev.foundry.directory);\n  assert.equal(hash(join(liveRepoRoot,ev.foundry.assurance.path)),ev.foundry.assurance.sha256);`);
replace("  const assurance = read(join(EXPORT_ROOT, taskId, 'validation/assurance.json'));","  const assurance = read(join(liveRepoRoot, ev.foundry.assurance.path));");
replace("  return pkg;",`  const config = JSON.parse(Buffer.from(readSnapshotFile(pkg.snapshot,'verifier','private/checker-required.json')).toString());\n  assert.equal(config.scenarioCoverage,'all',taskId + ': full hardening coverage required');\n  assert.equal(config.tokenCoverage,'opaque-v1',taskId + ': opaque token coverage required');\n  assert.equal(pkg.scenarioIds.length,ev.reference.total);\n  assert.equal(ev.checker.correct,ev.checker.total);\n  return pkg;`);
replace("  assert.equal(evidence.results.length, 5);","  assert.equal(evidence.tasks.length, 5);");
replace("  const byId = new Map(evidence.results.map((p) => [p.id, {\n    id: p.id, analysisDocument: p.analysis,\n    foundryDigest: p.foundry.digest, nativeDigest: p.native.digest,\n  }]));",`  const byId = new Map(evidence.tasks.map(p => [p.id, {\n    id:p.id,analysisDocument:TASKS.find(t=>t.id===p.id).analysisDocument,\n    foundryDigest:p.foundry.digest,nativeDigest:p.native.digest,\n  }]));`);
replace("      target: task.target,\n      analysisDocument:","      target: task.target,\n      historicalTrial: 4,\n      versionAttempt: 2,\n      taskVersion: '3.0.0',\n      gradingRevision: 'coverage-v2',\n      analysisDocument:");
replace("async function run(approval) {",`async function verify() {\n  assert.equal(api.EVIDENCE_PUBLICATION_BUDGET_BYTES,512*1024*1024);\n  const ready=read(join(runRoot,'READY.json'));\n  assert.equal(ready.sourceDigest,executionSourceIdentity());\n  assert.equal(ready.sourceDigest,authoritySourceDigest(frozenRoot));\n  assert.equal(ready.runnerDigest,hash(fileURLToPath(import.meta.url)));\n  assert.equal(ready.evidenceDigest,hash(EVIDENCE_JSON));\n  for(const plan of ready.packages){\n    verifiedPackage(plan.id,plan.packageDigest);\n    assert.equal(profileDigest(plan.profile),plan.profileDigest);\n  }\n  console.log(JSON.stringify({verified:true,packages:ready.packages.length,sourceDigest:ready.sourceDigest,providerCallsMade:0}));\n}\n\nasync function run(approval) {\n  await verify();`);
replace("  const active = execFileSync('docker', ['ps', '--format', '{{.Names}}'],",`  // Actual launch-time resource observation, not a model or benchmark rule.\n  if(process.platform==='darwin')console.log(execFileSync('memory_pressure',['-Q'],{encoding:'utf8',timeout:15000}));\n  const active = execFileSync('docker', ['ps', '--format', '{{.Names}}'],`);
replace("else if (mode === 'run') await run(approval);","else if (mode === 'verify') await verify();\nelse if (mode === 'run') await run(approval);");
code=code.replaceAll('--user-authorized-five-concurrent-trial-2','--user-authorized-five-concurrent-v3-trial-2')
 .replaceAll('root-user-authorized-round-two','root-user-authorized-hardened-v3-second')
 .replaceAll('root-round-two','root-hardened-v3-second')
 .replaceAll('${plan.id}-round-two','${plan.id}-hardened-v3-second');
code=code.replace(/\/\/ Round-two[\s\S]*?(?=import assert)/,`// Second model attempt on five 3.0.0 successors, coverage-v2 (historical Trial 4).\n// Adapted from the same operator's completed next-five campaign. See controller.diff.\n// Fresh runtime is built from current repository source; no provider calls during prepare.\n`);
code=code.replace(/\/\/ Reuse the isolated runtime[\s\S]*?(?=const frozenRoot)/,`// Current hardening runtime, copied and built in this campaign's frozen-source.\n// Live src/scripts changes cannot change the execution or grading used by this run.\n`);
code=code.replace('// Trial 2 assignments:','// Second 3.0.0 attempt assignments:');
code=code.replace(/    userAuthority: .*\n/,`    userAuthority: ${JSON.stringify("User authorized one fresh standard trial for each corrected 3.0.0 task under coverage-v2: Route and Browser on Claude; Calendar, Workflow and Budget on Codex. Five concurrently, subscription-only, no retries, no paid API fallback. This is historical Trial 4, the second attempt on the unchanged public 3.0.0 contract, and first on these corrected private package bytes.")},\n`);
writeFileSync(join(here,"campaign.mjs"),code,{flag:"wx"});
const diff=spawnSync("diff",["-u",join(here,"previous-controller.mjs"),join(here,"campaign.mjs")],{encoding:"utf8"});
assert([0,1].includes(diff.status));writeFileSync(join(here,"controller.diff"),diff.stdout);
save(join(here,"provenance.json"),{template:{path:templatePath,sha256:hash(join(root,templatePath))},controllerSha256:hash(join(here,"campaign.mjs")),evidence:{path:evidencePath,sha256:hash(join(here,"evidence.json"))},runtime:{path:join(here,"runtime-verification.json"),sha256:hash(join(here,"runtime-verification.json")),sourceDigest:builtIdentity,bundleSha256},providerCallsMade:0});
execFileSync(process.execPath,[join(here,"campaign.mjs"),"prepare"],{cwd:root,stdio:"inherit",timeout:60000});
execFileSync(process.execPath,[join(here,"campaign.mjs"),"verify"],{cwd:root,stdio:"inherit",timeout:60000});
assert(!existsSync(join(here,"real-campaign-frozen/DISPATCH-CLAIM")));
console.log(JSON.stringify({ready:join(here,"real-campaign-frozen/READY.json"),controller:join(here,"campaign.mjs"),sourceDigest:builtIdentity,bundleSha256,providerCallsMade:0}));

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
const preparation={schemaVersion:1,date:"2026-09-11",purpose:"Historical Trial 4; unchanged public 3.0.0 requirements, corrected coverage-v2 grading",concurrency:5,maxProviderCalls:5,automaticRetries:false,billingMode:"subscription-only",wallMsPerTask:10800000,runRoot:relative(root,join(here,"real-campaign-frozen")),files:Object.fromEntries(Object.entries({controller:"campaign.mjs",ready:"real-campaign-frozen/READY.json",runtimeVerification:"runtime-verification.json",dependencies:"dependencies.json",provenance:"provenance.json",controllerDiff:"controller.diff",previousController:"previous-controller.mjs",hardeningEvidence:"evidence.json"}).map(([k,v])=>[k,ref(join(here,v))])),runtime:{directory:relative(root,frozen),sourceDigest:builtIdentity,bundleSha256},packages:ready.packages.map(p=>({id:p.id,target:p.target,packageDigest:p.packageDigest,profileDigest:p.profileDigest,historicalTrial:p.historicalTrial,versionAttempt:p.versionAttempt,gradingRevision:p.gradingRevision,analysisDocument:p.analysisDocument,profile:p.profile})),providerCallsMade:0};
save(join(root,"reports/screening/evidence/2026-09-11-hardened-next-five-trial-two-preparation.json"),preparation);
