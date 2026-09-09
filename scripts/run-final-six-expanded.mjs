// Explicit concurrency amendment. Preserve the active children and frozen preparation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,openSync,closeSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {gradeSupplement,hash} from './grade-final-six-supplement.mjs';
import {canReachFive,validateSchedule} from './run-final-six.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const here=join(root,'.local/final-six-2026-09-09'), expanded=join(here,'expanded');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const save=(p,v)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});};
const claim=slot=>join(root,slot.directory,'real-campaign-frozen/DISPATCH-CLAIM');
const record=(p,slot)=>join(root,slot.directory,'real-campaign-frozen/jobs/real-provider/records',p.id+'-attempt-1');
export function initialExpandedSlots(plan){
 return plan.packages.flatMap(p=>p.slots.slice(0,p.id==='incremental-build-repair'?2:1).map(slot=>({id:p.id,trial:slot.trial,target:p.target})));
}
function processes(){
 return execFileSync('ps',['-axo','pid=,ppid=,comm=,args='],{encoding:'utf8',timeout:15000}).split('\n').flatMap(line=>{
  const m=line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
  return m?[{pid:Number(m[1]),parent:Number(m[2]),command:m[3],args:m[4]}]:[];
 });
}
function originalParent(){
 const matches=processes().filter(p=>/(^|\/)node$/.test(p.command)&&/\bscripts\/run-final-six\.mjs run --user-authorized-final-six\s*$/.test(p.args));
 assert.equal(matches.length,1,'Expected exactly one original scheduler; do not guess a PID or relaunch a campaign');
 return matches[0].pid;
}
function verified(){
 execFileSync(process.execPath,[join(root,'scripts/run-final-six.mjs'),'verify'],{cwd:root,encoding:'utf8',timeout:60000});
 const p=validateSchedule(read(join(root,'reports/screening/evidence/2026-09-09-final-six-preparation.json')));
 assert.equal(p.maxProviderCalls,11);assert.equal(initialExpandedSlots(p).length,6);return p;
}
function stillPaused(pid){
 const state=execFileSync('ps',['-p',String(pid),'-o','stat='],{encoding:'utf8',timeout:15000}).trim();
 assert(state.includes('T'),'Original scheduler must stay paused while its queue is superseded');
}
async function run(){
 const plan=verified(),parentPid=originalParent();
 assert(process.env.CLAUDE_CODE_OAUTH_TOKEN,'Use the existing inherited Claude token');
 mkdirSync(expanded,{recursive:true});closeSync(openSync(join(expanded,'DISPATCH-CLAIM'),'wx',0o600));
 // Stop only the queue manager. Its children, Docker containers, credentials and jobs continue.
 process.kill(parentPid,'SIGSTOP');
 const pending=new Map();let launched=0,adopted=0;
 try{
  stillPaused(parentPid);
  const children=processes().filter(p=>p.parent===parentPid);
  for(const p of plan.packages)for(const slot of p.slots){
   const path=join(root,slot.controller),child=children.find(c=>c.args.includes(path+' run --user-authorized-final-six-slot'));
   const complete=existsSync(join(record(p,slot),'completion.json'));
   assert(!existsSync(claim(slot))||complete||child,`${p.id} Trial ${slot.trial}: dispatch uncertain; preserve it for investigation`);
   if(child)pending.set(slot.directory,child.pid);
  }
  save(join(expanded,'ADOPTION.json'),{parentPid,created:new Date().toISOString(),maxConcurrent:6,maxProviderCalls:11,parentPaused:true,children:[...pending].map(([directory,pid])=>({directory,pid})),userAuthority:'User explicitly requested six trials at a time. Both remaining incremental-build attempts are unconditional; other packages retain sequential early-stop decisions.'});
 }catch(error){process.kill(parentPid,'SIGCONT');throw error;}
 async function obtain(p,slot){
  const dir=record(p,slot),complete=join(dir,'completion.json');
  if(existsSync(complete))return dir;
  const pid=pending.get(slot.directory);
  if(pid){
   adopted++;const deadline=Date.now()+4*3600000;
   while(!existsSync(complete)){
    assert(Date.now()<deadline,'Adopted job has not completed; do not retry automatically');
    try{process.kill(pid,0);}catch{assert(existsSync(complete),'Adopted controller exited without a complete record');}
    if(!existsSync(complete))await delay(2000);
   }
   return dir;
  }
  stillPaused(parentPid);assert(!existsSync(claim(slot)),'Never duplicate a claimed slot');
  const log=openSync(join(root,slot.directory,'expanded-operator.log'),'wx',0o600);
  launched++;console.log(JSON.stringify({stage:'launch-slot',id:p.id,trial:slot.trial,target:p.target}));
  try{await new Promise((ok,no)=>{
   const c=spawn(process.execPath,[join(root,slot.controller),'run','--user-authorized-final-six-slot'],{cwd:root,env:process.env,stdio:['ignore',log,log]});
   c.once('error',no);c.once('exit',(code,signal)=>code===0?ok():no(Error(`Child exit ${code}, signal ${signal}; ${slot.directory}`)));
  });}finally{closeSync(log);}
  assert(existsSync(complete),'Child has no complete record');return dir;
 }
 function adjudicate(p,slot,dir,failures,scored){
  const completion=read(join(dir,'completion.json')),grade=read(join(dir,'grade.json')),result=read(join(dir,'result.json'));
  assert.equal(completion.complete,true);assert(['semantic-pass','semantic-fail'].includes(result.outcome),'Infrastructure is unscored');
  assert.equal(completion.identity.packageDigest,p.packageDigest);assert.equal(completion.identity.profileDigest,p.profileDigest);
  for(const f of completion.files){assert.equal(readFileSync(join(dir,f.path)).length,f.size);assert.equal(hash(join(dir,f.path)),f.sha256);}
  assert([0,1].includes(grade.reward));
  let supplement=null;
  if(['temporal-capacity-repair','snapshot-recovery-repair'].includes(p.id)){
   const output=join(root,slot.directory,'supplement');
   supplement=existsSync(join(output,'grade.json'))?read(join(output,'grade.json')):gradeSupplement({id:p.id,submission:join(dir,'submission'),output});
   assert.equal(supplement.policySha256,plan.gradingPolicySha256);assert.equal(supplement.checkerSha256,hash(join(dir,'submission/checker.mjs')));
  }
  const effectiveReward=Math.min(grade.reward,supplement===null||supplement.pass?1:0);
  const row={id:p.id,target:p.target,trial:slot.trial,recordedReward:grade.reward,effectiveReward,gradingRevision:plan.gradingRevision,completionSha256:hash(join(dir,'completion.json')),gradeSha256:hash(join(dir,'grade.json')),supplement,failures:failures+(effectiveReward===0?1:0),scored:scored+1};
  row.canStillReachFive=canReachFive(row.failures,row.scored);
  const path=join(root,slot.directory,'ADJUDICATED.json');if(existsSync(path))assert.deepEqual(read(path),row);else save(path,row);
  console.log(JSON.stringify({stage:'scored',id:p.id,trial:slot.trial,effectiveReward,failures:row.failures,scored:row.scored}));return row;
 }
 const outcomes=[],errors=[];
 await Promise.all(plan.packages.map(async p=>{
  let failures=p.failures,scored=p.scored;const attempts=[];
  // Both build slots are required independently of either result: fill the sixth slot.
  const build=p.id==='incremental-build-repair';
  const parallel=build?p.slots.map(slot=>obtain(p,slot).then(dir=>({dir}),error=>({error}))):null;
  try{
   for(let i=0;i<p.slots.length;i++){
    const slot=p.slots[i];if(!canReachFive(failures,scored))break;
    const got=parallel?await parallel[i]:{dir:await obtain(p,slot)};if(got.error)throw got.error;
    const row=adjudicate(p,slot,got.dir,failures,scored);failures=row.failures;scored=row.scored;attempts.push(row);
   }
   const final={id:p.id,target:p.target,failures,scored,qualified:scored===6&&failures>=5,stoppedBelowThreshold:failures+6-scored<5,attempts};
   assert(final.qualified||final.stoppedBelowThreshold);save(join(expanded,'outcomes',p.id+'.json'),final);outcomes.push(final);
  }catch(error){const row={id:p.id,error:String(error),automaticRetries:0,failures,scored,attempts};save(join(expanded,'errors',p.id+'.json'),row);errors.push(row);}
  finally{if(parallel)await Promise.all(parallel);}
 }));
 save(join(expanded,'FINAL.json'),{gradingRevision:plan.gradingRevision,maxConcurrent:6,providerCallsMaximum:11,launchedByExpandedController:launched,adoptedLiveAttempts:adopted,automaticRetries:0,complete:errors.length===0,outcomes,errors,originalScheduler:{pid:parentPid,state:'suspended-superseded'}});
 console.log(JSON.stringify({stage:'expanded-complete',complete:errors.length===0,originalSchedulerPid:parentPid,originalSchedulerMustNotResume:true}));
 if(errors.length)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
const [mode,approval]=process.argv.slice(2);
if(mode==='verify'){
 verified();console.log(JSON.stringify({stage:'expanded-ready',maxConcurrent:6,maximumTotalAttempts:11,originalSchedulerPid:originalParent(),providerCallsMade:0,dispatchClaimExists:existsSync(join(expanded,'DISPATCH-CLAIM'))}));
}else if(mode==='run'){
 assert.equal(approval,'--user-authorized-six-concurrent');await run();
}else throw Error('Usage: node scripts/run-final-six-expanded.mjs verify | run --user-authorized-six-concurrent');
}
