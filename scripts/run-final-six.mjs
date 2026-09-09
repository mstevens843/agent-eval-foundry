// Operator-only continuation. Frozen task exports and the previously used runtime stay intact.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,openSync,closeSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawn} from 'node:child_process';
import {gradeSupplement,hash} from './grade-final-six-supplement.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const here=join(root,'.local/final-six-2026-09-09');
const evidence=join(root,'reports/screening/evidence/2026-09-09-final-six-preparation.json');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const save=(p,v)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});};
export function canReachFive(failures,scored){return scored<6 && failures+(6-scored)>=5;}
export function validateSchedule(plan){
 assert.equal(plan.maxProviderCalls,11); assert.equal(plan.maxConcurrent,3);
 assert.equal(new Set(plan.packages.map(p=>p.id)).size,5);
 assert.equal(plan.packages.reduce((n,p)=>n+p.remaining,0),11);
 for(const p of plan.packages){
  assert.equal(p.scored,p.effectiveHistory.length);assert.equal(p.failures,p.effectiveHistory.filter(r=>r===0).length);
  assert.equal(p.remaining,6-p.scored);assert.equal(p.slots.length,p.remaining);
  assert(canReachFive(p.failures,p.scored));assert.equal(p.scored===3?p.remaining:p.remaining+1,3);
  assert.equal(p.target,p.id==='incremental-build-repair'||p.id==='snapshot-recovery-repair'?'claude':'codex');
  for(let i=0;i<p.slots.length;i++){assert.equal(p.slots[i].trial,p.scored+i+2);assert.equal(p.slots[i].successorAttempt,p.scored+i+1);}
 }
 return plan;
}
function verify(){
 const plan=validateSchedule(read(evidence));
 assert.equal(hash(join(root,'data/final-six-grading-controls/policy.json')),plan.gradingPolicySha256);
 assert.equal(hash(join(root,'scripts/grade-final-six-supplement.mjs')),plan.supplementRunnerSha256);
 const policy=read(join(root,'data/final-six-grading-controls/policy.json'));
 for(const control of policy.controls)assert.equal(hash(join(root,control.fixture)),control.sha256);
 for(const p of plan.packages)for(const slot of p.slots){
  assert.equal(hash(join(root,slot.controller)),slot.controllerSha256);
  assert.equal(hash(join(root,slot.directory,'evidence.json')),slot.evidenceSha256);
  execFileSync(process.execPath,[join(root,slot.controller),'verify'],{cwd:root,stdio:'pipe',timeout:30000});
 }
 return plan;
}
async function child(slot){
 const out=join(root,slot.directory,'operator.log'),fd=openSync(out,'wx',0o600);
 try{await new Promise((ok,no)=>{
  const p=spawn(process.execPath,[join(root,slot.controller),'run','--user-authorized-final-six-slot'],{cwd:root,env:process.env,stdio:['ignore',fd,fd]});
  p.once('error',no);p.once('exit',(code,signal)=>code===0?ok():no(Error(`Slot failed: ${slot.controller}; exit ${code}; signal ${signal}; inspect ${out}`)));
 });}finally{closeSync(fd);}
}
async function run(){
 const plan=verify(),ready=read(join(here,'READY.json'));
 assert.equal(ready.runnerSha256,hash(fileURLToPath(import.meta.url)));assert.equal(ready.evidenceSha256,hash(evidence));
 assert(process.env.CLAUDE_CODE_OAUTH_TOKEN,'Claude token must be inherited from the established Keychain login setup');
 const active=execFileSync('docker',['ps','--format','{{.Names}}'],{encoding:'utf8',timeout:15000});
 assert(!active.split('\n').some(n=>n.startsWith('foundry-real-')),'Finish the other provider campaign before starting this one');
 closeSync(openSync(join(here,'DISPATCH-CLAIM'),'wx',0o600));
 let cursor=0;const outcomes=[],errors=[];
 async function worker(){
  while(cursor<plan.packages.length){
   const p=plan.packages[cursor++];let failures=p.failures,scored=p.scored;const attempts=[];
   try{
    for(const slot of p.slots){
     if(!canReachFive(failures,scored))break;
     console.log(JSON.stringify({stage:'launch-slot',id:p.id,target:p.target,trial:slot.trial}));
     await child(slot);
     const record=join(root,slot.directory,'real-campaign-frozen/jobs/real-provider/records',p.id+'-attempt-1');
     const completion=read(join(record,'completion.json')),grade=read(join(record,'grade.json')),result=read(join(record,'result.json'));
     assert.equal(completion.complete,true);assert(['semantic-pass','semantic-fail'].includes(result.outcome),'Infrastructure is unscored');
     assert.equal(completion.identity.packageDigest,p.packageDigest);assert.equal(completion.identity.profileDigest,p.profileDigest);
     for(const f of completion.files){assert.equal(readFileSync(join(record,f.path)).length,f.size);assert.equal(hash(join(record,f.path)),f.sha256);}
     assert([0,1].includes(grade.reward));
     const supplement=['temporal-capacity-repair','snapshot-recovery-repair'].includes(p.id)
      ?gradeSupplement({id:p.id,submission:join(record,'submission'),output:join(root,slot.directory,'supplement')}):null;
     const effectiveReward=Math.min(grade.reward,supplement===null||supplement.pass?1:0);
     scored++;if(effectiveReward===0)failures++;
     const row={id:p.id,target:p.target,trial:slot.trial,recordedReward:grade.reward,effectiveReward,gradingRevision:plan.gradingRevision,completionSha256:hash(join(record,'completion.json')),gradeSha256:hash(join(record,'grade.json')),supplement,failures,scored,canStillReachFive:canReachFive(failures,scored)};
     save(join(root,slot.directory,'ADJUDICATED.json'),row);attempts.push(row);console.log(JSON.stringify({stage:'scored',id:p.id,trial:slot.trial,effectiveReward,failures,scored}));
    }
    const final={id:p.id,target:p.target,failures,scored,qualified:scored===6&&failures>=5,stoppedBelowThreshold:failures+6-scored<5,attempts};
    assert(final.qualified||final.stoppedBelowThreshold);save(join(here,'outcomes',p.id+'.json'),final);outcomes.push(final);
   }catch(error){const row={id:p.id,error:String(error),automaticRetries:0,failures,scored,attempts};save(join(here,'errors',p.id+'.json'),row);errors.push(row);}
  }
 }
 await Promise.all(Array.from({length:plan.maxConcurrent},worker));
 save(join(here,'FINAL.json'),{gradingRevision:plan.gradingRevision,providerCallsMaximum:11,automaticRetries:0,complete:errors.length===0,outcomes,errors});
 if(errors.length)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,approval]=process.argv.slice(2);
 if(mode==='prepare'){
  const plan=validateSchedule(read(evidence));
  for(const p of plan.packages)for(const slot of p.slots)execFileSync(process.execPath,[join(root,slot.controller),'prepare'],{cwd:root,stdio:'pipe',timeout:30000});
  verify();save(join(here,'READY.json'),{created:new Date().toISOString(),runnerSha256:hash(fileURLToPath(import.meta.url)),evidenceSha256:hash(evidence),packages:5,slots:11,providerCallsMade:0,maxConcurrent:3});
  console.log(JSON.stringify({stage:'ready',packages:5,slots:11,providerCallsMade:0}));
 }else if(mode==='verify'){
  verify();const ready=read(join(here,'READY.json'));assert.equal(ready.runnerSha256,hash(fileURLToPath(import.meta.url)));assert.equal(ready.evidenceSha256,hash(evidence));
  console.log(JSON.stringify({...ready,stage:'verified',dispatchClaimExists:existsSync(join(here,'DISPATCH-CLAIM'))}));
 }else if(mode==='run'){
  assert.equal(approval,'--user-authorized-final-six');await run();
 }else throw Error('Usage: node scripts/run-final-six.mjs prepare | verify | run --user-authorized-final-six');
}
