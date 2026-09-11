// Operator-only continuation. No writes to Round 5 or its frozen runtime.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {appendFileSync,closeSync,existsSync,mkdirSync,openSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {applyOutcome,classify,initialState,makeContinuationPlan,nextSlot} from './hardened-continuation-policy.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const preparationPath='reports/screening/evidence/2026-09-11-hardened-six-continuation-preparation.json';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const save=(p,v)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});};

function verify(){
  const plan=read(join(root,preparationPath)),here=join(root,plan.outputRoot);
  const check=r=>assert.equal(hash(join(root,r.path)),r.sha256,r.path);
  check(plan.runner);check(plan.policy);check(plan.round5);check(plan.ledger);
  assert.equal(plan.runner.path,relative(root,fileURLToPath(import.meta.url)));
  const ready=read(join(here,'READY.json'));check(ready.preparation);
  const prior=read(join(root,plan.round5.path)),ledger=read(join(root,plan.ledger.path));
  for(const p of ledger.packages)for(const r of p.history){check(r.source);if(r.basis)check(r.basis);}
  const expected=makeContinuationPlan(ledger,prior);for(const key of Object.keys(expected))assert.deepEqual(plan[key],expected[key],key);
  assert.deepEqual(plan.runtime,prior.runtime);
  execFileSync(process.execPath,[join(root,'scripts/verify-hardened-next-five-trial-five.mjs')],{cwd:root,stdio:'pipe',timeout:90000});
  const desired=expected.packages.flatMap(p=>p.slots.filter(s=>!s.adoptExisting));
  assert.equal(plan.slots.length,desired.length);
  for(const [i,slot]of plan.slots.entries()){
    for(const k of Object.keys(desired[i]))assert.equal(slot[k],desired[i][k]);
    for(const k of ['controller','ready','evidence','diff'])check(slot[k]);
    const r=read(join(root,slot.ready.path)),task=r.packages[0];
    assert.equal(r.maxProviderCalls,1);assert.equal(r.concurrency,1);assert.equal(r.sourceDigest,plan.runtime.sourceDigest);
    assert.equal(task.target,slot.target);assert.equal(task.historicalTrial,slot.historicalTrial);
    assert.equal(task.profileDigest,slot.profileDigest);assert.equal(task.packageDigest,slot.packageDigest);
    execFileSync(process.execPath,[join(root,slot.controller.path),'verify'],{cwd:root,stdio:'pipe',timeout:60000});
  }
  return {plan,here,prior};
}

async function run(){
  const {plan,here,prior}=verify();
  // Round 5 belongs to the other controller. Never adopt or alter its live jobs.
  const finished=join(root,prior.runRoot,'CAMPAIGN-COMPLETE.json');
  assert(existsSync(finished),'Round 5 is still running. Let its controller finish; no continuation has been dispatched.');
  const campaign=read(finished);assert.equal(campaign.results.length,5);
  const active=execFileSync('docker',['ps','--format','{{.Names}}'],{encoding:'utf8',timeout:15000});
  assert(!active.split('\n').some(n=>n.startsWith('foundry-real-')),'A provider campaign is still active; do not overlap controllers');
  assert(!existsSync(join(here,'DISPATCH-CLAIM')),'Continuation already claimed. Inspect it; never relaunch.');
  for(const slot of plan.slots)assert(!existsSync(join(root,slot.directory,'real-campaign-frozen/DISPATCH-CLAIM')),'Conditional slot was already dispatched');
  closeSync(openSync(join(here,'DISPATCH-CLAIM'),'wx',0o600));
  const api=await import(pathToFileURL(join(root,plan.runtime.directory,'dist/index.js')));
  const events=join(here,'events.jsonl'),finals=[];let newCalls=0;
  const emit=v=>{const row={at:new Date().toISOString(),...v};appendFileSync(events,JSON.stringify(row)+'\n');console.log(JSON.stringify(row));};
  function score(p,slot,record,profileDigest){
    const verified=api.verifyEvidence(record),completion=read(join(record,'completion.json'));
    assert(completion.complete);assert.equal(completion.identity.packageDigest,p.packageDigest);
    assert.equal(completion.identity.profileDigest,profileDigest);assert.equal(completion.identity.executionSourceDigest,plan.runtime.sourceDigest);
    const result=read(join(record,'result.json')),capture=read(join(record,'capture.json'));
    assert(['semantic-pass','semantic-fail'].includes(result.outcome),'Infrastructure or incomplete execution is unscored');
    assert(capture.status==='completed'&&capture.error===null&&capture.exitCode===0,'Authoring did not complete cleanly');
    const grade=read(join(record,'grade.json'));
    assert(grade.evaluation.complete&&['semantic-pass','semantic-fail'].includes(grade.evaluation.status));
    assert.equal(grade.checkerRequired,true);assert.equal(typeof grade.checkerPassed,'boolean');
    const reward=grade.evaluation.status==='semantic-pass'&&grade.checkerPassed?1:0;
    assert.equal(grade.reward,reward);assert.equal(result.outcome,reward===1?'semantic-pass':'semantic-fail');
    const summaryPath=join(record,'grading/checker-grade/grade-summary.json');
    const checker=existsSync(summaryPath)?read(summaryPath):null;
    return {id:p.id,...slot,countedReward:reward,recordedReward:grade.reward,service:grade.evaluation.status,checkerPassed:grade.checkerPassed,checker:checker?{correct:checker.correct,total:checker.total,falsePositives:checker.falsePositives,missed:checker.missed}:null,checkerSummaryPresent:checker!==null,authoringMilliseconds:capture.milliseconds,record:relative(root,record),completionSha256:hash(join(record,'completion.json')),gradeSha256:hash(join(record,'grade.json')),verifiedFiles:verified.files.length};
  }
  async function launch(slot){
    assert(newCalls<plan.maxNewProviderCalls,'New provider-call cap reached');newCalls++;
    const log=join(here,'logs',slot.id+'-trial-'+slot.historicalTrial+'.log');mkdirSync(dirname(log),{recursive:true});
    const fd=openSync(log,'wx',0o600);
    emit({stage:'launch-next-trial',id:slot.id,provider:slot.target,historicalTrial:slot.historicalTrial,versionRound:slot.versionRound,newSlotLaunches:newCalls});
    try{
      await new Promise((ok,no)=>{
        const child=spawn(process.execPath,[join(root,slot.controller.path),'run','--user-authorized-hardened-continuation-slot'],{cwd:root,env:process.env,stdio:['ignore',fd,fd]});
        save(join(here,'launches',slot.id+'-trial-'+slot.historicalTrial+'.json'),{...slot,pid:child.pid??null,at:new Date().toISOString(),log:relative(root,log)});
        child.once('error',no);child.once('exit',(code,signal)=>code===0?ok():no(Error(`Child exit ${code}, signal ${signal}; inspect ${relative(root,log)}`)));
      });
    }finally{closeSync(fd);}
  }
  emit({stage:'continuation-started',adoptingAlreadyCompletedRound5:5,maxFurtherCalls:7,maxConcurrent:5});
  await Promise.all(plan.packages.map(async p=>{
    let state=initialState(p);const evidence=[];
    while(nextSlot(p,state)){
      const wanted=nextSlot(p,state);let scored;
      try{
        if(wanted.adoptExisting){
          const old=prior.packages.find(x=>x.id===p.id);
          const status=campaign.results.find(x=>x.id===p.id);assert(status?.status==='fulfilled','Round 5 dispatch/publication was unresolved');
          scored=score(p,wanted,join(root,prior.runRoot,'jobs/real-provider/records',p.id+'-attempt-1'),old.profileDigest);
        }else{
          const slot=plan.slots.find(s=>s.id===wanted.id&&s.historicalTrial===wanted.historicalTrial);assert(slot);
          await launch(slot);
          scored=score(p,wanted,join(root,slot.directory,'real-campaign-frozen/jobs/real-provider/records',p.id+'-attempt-1'),slot.profileDigest);
        }
        state=applyOutcome(p,state,wanted,scored.countedReward);evidence.push(scored);
        save(join(here,'adjudicated',p.id+'-trial-'+wanted.historicalTrial+'.json'),{...scored,standings:classify(state)});
        emit({stage:'trial-result',...scored,failures:state.failures,scored:state.scored,providers:state.providers,stopReason:state.stopReason});
      }catch(error){
        state=applyOutcome(p,state,wanted,null);
        const incident={id:p.id,...wanted,error:String(error),countedReward:null,automaticRetries:0,failures:state.failures,scored:state.scored};
        save(join(here,'incidents',p.id+'-trial-'+wanted.historicalTrial+'.json'),incident);
        emit({stage:'task-stopped-unscored',...incident});break;
      }
    }
    const result={...classify(state),evidence,unusedSlots:p.slots.slice(state.cursor)};
    save(join(here,'outcomes',p.id+'.json'),result);finals.push(result);
    emit({stage:'task-finished',id:p.id,failures:state.failures,scored:state.scored,providers:state.providers,stopReason:state.stopReason,meetsFiveOfSix:result.meetsFiveOfSix,unusedSlots:result.unusedSlots.length});
  }));
  const result={at:new Date().toISOString(),maxNewProviderCalls:7,newSlotLaunches:newCalls,automaticRetries:0,adoptedRound5Attempts:5,outcomes:finals};
  save(join(here,'FINAL.json'),result);emit({stage:'continuation-finished',newSlotLaunches:newCalls,outcomes:finals.map(({id,failures,scored,stopReason,meetsFiveOfSix})=>({id,failures,scored,stopReason,meetsFiveOfSix}))});
  if(finals.some(p=>p.stopReason==='infrastructure-or-unresolved-grading'))process.exitCode=1;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [mode,approval]=process.argv.slice(2);
  if(mode==='verify'){
    const {plan,here,prior}=verify();
    console.log(JSON.stringify({verified:true,maxFurtherCalls:plan.maxNewProviderCalls,maxConcurrent:plan.maxConcurrent,round5Finished:existsSync(join(root,prior.runRoot,'CAMPAIGN-COMPLETE.json')),continuationClaimed:existsSync(join(here,'DISPATCH-CLAIM')),providerCallsMade:0}));
  }else if(mode==='run'){
    assert.equal(approval,'--user-authorized-hardened-six-continuation');await run();
  }else throw Error('Use: verify | run --user-authorized-hardened-six-continuation');
}
