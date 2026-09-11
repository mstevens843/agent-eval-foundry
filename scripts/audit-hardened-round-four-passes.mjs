// Reproduce the two Round 4 pass audits. Offline Docker only; no provider entry point.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(process.argv[2]??join(repo,'.local/hardened-round-four-pass-audit-reproduction-'+Date.now()));
assert(!existsSync(out),'Use a fresh output directory; prior evidence is immutable');mkdirSync(out,{recursive:true});
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const ref=p=>({path:relative(repo,p),sha256:hash(p)});
const prep=read(join(repo,'reports/screening/evidence/2026-09-11-hardened-next-five-trial-four-preparation.json'));
assert.equal(hash(join(repo,prep.runtime.directory,'dist/index.js')),prep.runtime.bundleSha256);
const api=await import(pathToFileURL(join(repo,prep.runtime.directory,'dist/index.js')));
cpSync(join(repo,'data/hardened-round-four-pass-audit/replay.mjs'),join(out,'run-local.mjs'));
cpSync(join(repo,'data/hardened-round-four-pass-audit/route-fuzz.mjs'),join(out,'route-fuzz.mjs'));
const {replay,check}=await import(pathToFileURL(join(out,'run-local.mjs')));
const records=[];
for(const id of ['route-policy-repair','browser-replay-repair']){
 const plan=prep.packages.find(p=>p.id===id),record=join(repo,prep.runRoot,'jobs/real-provider/records',id+'-attempt-1');
 const retained=api.verifyEvidence(record),grade=read(join(record,'grade.json'));
 assert.equal(grade.reward,1);assert.equal(grade.checkerPassed,true);
 const pkg=api.executionPackage(join(repo,'.local/next-five-coverage-v2-2026-09-11/release',id,'export'));
 assert.equal(pkg.snapshot.record.digest,plan.packageDigest);
 const directory=join(out,id);mkdirSync(directory);
 const files=[];
 for(const [component,part]of Object.entries(pkg.snapshot.record.components))for(const f of part.files){
  if(['collector','verifier'].includes(component)&&f.path.endsWith('.mjs')&&!f.path.endsWith('bootstrap.mjs')){
   const text=Buffer.from(api.readSnapshotFile(pkg.snapshot,component,f.path)).toString(),path=f.path.replace(/^(runtime|private)\//,'');
   files.push({path,text});const target=join(directory,'authority',path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,text);
  }
  if(f.path.startsWith('private/reference/')){
   const target=join(directory,'reference',f.path.slice('private/reference/'.length));mkdirSync(dirname(target),{recursive:true});writeFileSync(target,Buffer.from(api.readSnapshotFile(pkg.snapshot,component,f.path)));
  }
 }
 const get=(part,path)=>Buffer.from(api.readSnapshotFile(pkg.snapshot,part,path)).toString();
 const authority={files,runtime:JSON.parse(get('dependencies','runtime.json')),scenarios:JSON.parse(get('scenarios','private/scenarios.json')),bootstrap:get('collector','runtime/bootstrap.mjs')};
 writeFileSync(join(directory,'authority.json'),JSON.stringify(authority));
 records.push({id,record,packageDigest:plan.packageDigest,filesVerified:retained.files.length,completion:ref(join(record,'completion.json')),grade:ref(join(record,'grade.json'))});
}
const id='browser-replay-repair',browser=records.find(r=>r.id===id),authority=read(join(out,id,'authority.json'));
const scenarios=[-1,-2,0].map(first=>{
 const s=structuredClone(authority.scenarios.find(s=>s.confirmation&&s.competing));
 s.id='signed-step-'+first;s.traceId='signed-step';s.events[0].step=first;s.attempts=2;delete s.interrupt;return s;
});
const reference=join(out,id,'reference'),submitted=join(browser.record,'submission');
const cells=replay(id,reference,scenarios,'signed-steps-reference');
assert(cells.every(c=>c.status==='semantic-pass'&&c.failures.length===0));
const original=read(join(browser.record,'grading/checker-grade/cases/cases.json')).cases;
const truth=read(join(browser.record,'grading/checker-grade/grade-summary.json')).details;
assert.equal(truth.length,original.length);
const cases=[...original,...cells.map(c=>({token:c.scenarioId,cells:[c]}))];
const expected=[...truth.map(d=>d.expectedFailingCheck===null),true,true,true];
function assess(result){
 const shape=v=>v?.verdicts&&Object.keys(v.verdicts).length===cases.length&&cases.every(c=>Object.hasOwn(v.verdicts,c.token)&&typeof v.verdicts[c.token]?.ok==='boolean');
 const complete=Boolean(shape(result.first)&&shape(result.second));
 const deterministic=complete&&!result.mutated&&cases.every(c=>result.first.verdicts[c.token].ok===result.second.verdicts[c.token].ok);
 const errors=cases.flatMap((c,i)=>result.first.verdicts[c.token]?.ok===expected[i]?[]:[{token:c.token,expected:expected[i],actual:result.first.verdicts[c.token]?.ok,reasons:result.first.verdicts[c.token]?.reasons}]);
 return{complete,deterministic,total:cases.length,correct:cases.length-errors.length,errors};
}
const submittedChecker=assess(check(id,submitted,cases,'augmented-submitted-checker'));
const referenceChecker=assess(check(id,reference,cases,'augmented-reference-checker'));
assert.equal(referenceChecker.correct,cases.length);assert(referenceChecker.deterministic);
assert.deepEqual(submittedChecker.errors.map(e=>e.token),['signed-step--1']);assert(submittedChecker.deterministic);
const savedService=replay(id,submitted,scenarios,'signed-steps-submitted-service');assert(savedService.every(c=>c.status==='semantic-pass'));
const rid='route-policy-repair',route=records.find(r=>r.id===rid),runtime=read(join(out,rid,'authority.json')).runtime;
const routeRaw=execFileSync('docker',['run','--rm','--pull=never','--network=none','--read-only','--user=1000:1000','--cpus=1','--memory=1g','--pids-limit=128','--cap-drop=ALL','--security-opt=no-new-privileges','--tmpfs=/tmp:rw,size=256m',
 '--mount',`type=bind,src=${join(route.record,'submission')},dst=/submitted,readonly`,
 '--mount',`type=bind,src=${join(out,rid,'authority')},dst=/authority,readonly`,
 '--mount',`type=bind,src=${join(out,rid,'reference')},dst=/reference,readonly`,
 '--mount',`type=bind,src=${join(out,'route-fuzz.mjs')},dst=/audit.mjs,readonly`,runtime.image,'node','/audit.mjs'],{encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
writeFileSync(join(out,'route-fuzz-result.json'),routeRaw);const routeResult=JSON.parse(routeRaw);
assert.equal(routeResult.validCases,299);assert.equal(routeResult.failures.length,0);
for(const record of records)api.verifyEvidence(record.record);
const summary={schemaVersion:1,providerCallsMade:0,records,route:routeResult,browser:{baseCandidates:original.length,extraPositiveScenarios:3,referenceServicePasses:3,submittedServicePasses:3,submittedChecker,referenceChecker},historicalRewardsChanged:0};
writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({output:relative(repo,out),routeFailuresFound:0,browserCheckerDefects:1,providerCallsMade:0}));
