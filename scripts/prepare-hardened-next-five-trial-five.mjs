// Prepare Round 5 (historical Trial 7). No provider execution during preparation.
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,readlinkSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const previousPath='reports/screening/evidence/2026-09-11-hardened-next-five-trial-four-preparation.json';
const outputPath='reports/screening/evidence/2026-09-11-hardened-next-five-trial-five-preparation.json';
const coveragePath='reports/screening/evidence/2026-09-11-browser-coverage-v3.json';
const dispositionPath='reports/screening/evidence/2026-09-11-browser-round-four-disposition.json';
const here=join(root,'.local/hardened-next-five-trial-five-2026-09-11');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const ref=p=>({path:relative(root,p),sha256:hash(p)});
const save=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
assert(!existsSync(here)&&!existsSync(join(root,outputPath)),'Preparation exists; verify rather than overwrite');
execFileSync(process.execPath,[join(root,'scripts/verify-hardened-next-five-trial-four.mjs')],{cwd:root,stdio:'inherit',timeout:90000});
execFileSync(process.execPath,[join(root,'scripts/verify-browser-coverage-v3.mjs')],{cwd:root,stdio:'inherit',timeout:90000});
const previous=read(join(root,previousPath)),previousReady=read(join(root,previous.files.ready.path));
const completePath=join(root,previous.runRoot,'CAMPAIGN-COMPLETE.json'),complete=read(completePath);
assert.equal(complete.results.length,5);assert(complete.results.every(r=>r.status==='fulfilled'));
assert(complete.jobs.every(j=>j.state==='completed'));
const api=await import(pathToFileURL(join(root,previous.runtime.directory,'dist/index.js')));
const disposition=read(join(root,dispositionPath)),priorRecords=[];
for(const p of previous.packages){
  const record=join(root,previous.runRoot,'jobs/real-provider/records',p.id+'-attempt-1');
  const evidence=api.verifyEvidence(record),grade=read(join(record,'grade.json'));
  const d=disposition.rows.find(r=>r.id===p.id);assert(d);
  assert.equal(hash(join(record,'grade.json')),d.originalGrade.sha256);
  assert.equal(grade.reward,d.recordedReward);
  priorRecords.push({...d,filesVerified:evidence.files.length});
}
mkdirSync(here);
const previousFrozen=join(root,previous.runtime.directory),frozen=join(here,'frozen-source');
cpSync(previousFrozen,frozen,{recursive:true,verbatimSymlinks:true});
function inventory(directory,prefix=''){
  return readdirSync(directory).sort().flatMap(name=>{
    const path=join(directory,name),rel=join(prefix,name),s=lstatSync(path);
    if(s.isSymbolicLink())return [{path:rel,link:readlinkSync(path)}];
    if(s.isDirectory())return inventory(path,rel);
    assert(s.isFile());return [{path:rel,bytes:s.size,sha256:hash(path)}];
  });
}
const copied=inventory(frozen);assert.deepEqual(copied,inventory(previousFrozen));
save(join(here,'runtime-copy.json'),{predecessor:previous.runtime.directory,byteIdentical:true,files:copied});
for(const [key,name]of [['runtimeVerification','runtime-verification.json'],['dependencies','dependencies.json']])cpSync(join(root,previous.files[key].path),join(here,name));
cpSync(join(root,coveragePath),join(here,'evidence.json'));
cpSync(join(root,dispositionPath),join(here,'disposition.json'));
const template=join(root,previous.files.controller.path);cpSync(template,join(here,'previous-controller.mjs'));
let code=readFileSync(template,'utf8');
const change=(from,to)=>{assert.equal(code.split(from).length,2,'Controller anchor: '+from);code=code.replace(from,to);};
change('// Fourth model attempt on five 3.0.0 successors, coverage-v2 (historical Trial 6).','// Round 5 on public 3.0.0 (historical Trial 7): Browser coverage-v3; other four coverage-v2.');
change('// Isolated rebuilt runtime adds bounded authoring diagnostics; task and grader packages are unchanged.','// Runtime copied byte-for-byte from completed Round 4; no rebuild or provider calls during prepare.');
change('// Current source independently copied and built into this campaign\'s frozen-source.','// Completed Round 4 runtime independently verified and copied into this campaign\'s frozen-source.');
change('// Fresh campaign state; completed Trial 5 records and runtime remain unchanged.','// Fresh campaign state; all prior records and runtime remain unchanged.');
change('// Fourth 3.0.0 attempt: all five switch providers, two Codex and three Claude.','// Round 5: retain Round 4 providers, two Codex and three Claude.');
change('      historicalTrial: 6,','      historicalTrial: 7,');
change('      versionAttempt: 4,','      versionAttempt: 5,');
change("      gradingRevision: 'coverage-v2',","      gradingRevision: task.id === 'browser-replay-repair' ? 'coverage-v3' : 'coverage-v2',");
code=code.replaceAll('--user-authorized-five-concurrent-v3-trial-4','--user-authorized-five-concurrent-v3-trial-5').replaceAll('hardened-v3-fourth','hardened-v3-fifth');
code=code.replace(/    userAuthority: .*\n/,`    userAuthority: ${JSON.stringify('User authorized Round 5 on public 3.0.0, historical Trial 7: one fresh attempt per task, all five concurrent. Same providers as Round 4: Route and Browser Codex; Calendar, Workflow and Budget Claude. Browser uses validated private coverage-v3; other four exports are byte-identical coverage-v2. Browser historical Trial 6 is a user-authorized grading void, countedReward null, and this Codex attempt fills that voided slot. Its separate historical Trial 5 Claude interruption remains unscored and the missing Claude slot is not dispatched here. Retain Route Trial 6 reward 1. Subscription-only, no paid API fallback, no automatic retries. Browser authoring memory remains 4096 MiB.')},\n`);
writeFileSync(join(here,'campaign.mjs'),code,{flag:'wx'});
const diff=spawnSync('diff',['-u',join(here,'previous-controller.mjs'),join(here,'campaign.mjs')],{encoding:'utf8'});assert([0,1].includes(diff.status));
writeFileSync(join(here,'controller.diff'),diff.stdout,{flag:'wx'});
save(join(here,'provenance.json'),{predecessor:ref(join(root,previousPath)),previousCompletion:ref(completePath),previousController:ref(template),runtimeRebuilt:false,runtimeByteIdentical:true,changedPackages:['browser-replay-repair'],publicRequirementsChanged:false,providerAssignmentsChanged:false,priorRecords,providerCallsMade:0});
execFileSync(process.execPath,[join(here,'campaign.mjs'),'prepare'],{cwd:frozen,stdio:'inherit',timeout:90000});
const ready=read(join(here,'real-campaign-frozen/READY.json'));
assert.equal(ready.sourceDigest,previous.runtime.sourceDigest);
for(const p of ready.packages){
  const old=previousReady.packages.find(r=>r.id===p.id);assert(old);
  for(const key of ['target','profile','profileDigest','instructionSha256','checks'])assert.deepEqual(p[key],old[key],p.id+': '+key);
  if(p.id==='browser-replay-repair'){assert.notEqual(p.packageDigest,old.packageDigest);assert.equal(p.gradingRevision,'coverage-v3');}
  else for(const key of ['packageDigest','nativeDigest','gradingRevision'])assert.equal(p[key],old[key],p.id+': '+key);
  assert.equal(p.historicalTrial,7);assert.equal(p.versionAttempt,5);
}
const fileMap={controller:'campaign.mjs',ready:'real-campaign-frozen/READY.json',runtimeVerification:'runtime-verification.json',dependencies:'dependencies.json',hardeningEvidence:'evidence.json',disposition:'disposition.json',runtimeCopy:'runtime-copy.json',previousController:'previous-controller.mjs',controllerDiff:'controller.diff',provenance:'provenance.json'};
save(join(root,outputPath),{schemaVersion:1,date:'2026-09-11',purpose:'Round 5 on public 3.0.0, historical Trial 7, same providers as Round 4',concurrency:5,maxProviderCalls:5,automaticRetries:false,billingMode:'subscription-only',wallMsPerTask:10800000,runRoot:relative(root,join(here,'real-campaign-frozen')),files:Object.fromEntries(Object.entries(fileMap).map(([key,path])=>[key,ref(join(here,path))])),runtime:{...previous.runtime,directory:relative(root,frozen)},predecessor:ref(join(root,previousPath)),runtimeRebuilt:false,changedPackages:['browser-replay-repair'],publicRequirementsChanged:false,providerAssignmentsChanged:false,packages:ready.packages.map(({id,target,packageDigest,profileDigest,historicalTrial,versionAttempt,gradingRevision,analysisDocument,profile})=>({id,target,packageDigest,profileDigest,historicalTrial,versionAttempt,gradingRevision,analysisDocument,profile})),priorRecords,browserMissingClaudeSlotStillPending:true,providerCallsMade:0});
execFileSync(process.execPath,[join(root,'scripts/verify-hardened-next-five-trial-five.mjs')],{cwd:root,stdio:'inherit',timeout:90000});
assert(!existsSync(join(here,'real-campaign-frozen/DISPATCH-CLAIM')));
console.log(JSON.stringify({prepared:true,versionRound:5,historicalTrial:7,concurrency:5,providerCallsMade:0}));
