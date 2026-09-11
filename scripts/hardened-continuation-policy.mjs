import assert from 'node:assert/strict';

export function makeContinuationPlan(ledger, preparation) {
  assert.equal(ledger.packages.length, 5);
  assert.equal(new Set(ledger.packages.map(p=>p.id)).size, 5);
  const packages=ledger.packages.map(p=>{
    const prior=preparation.packages.find(x=>x.id===p.id);assert(prior);
    const counted=p.history.filter(r=>r.countedReward!==null);
    assert(counted.every(r=>[0,1].includes(r.countedReward)&&['codex','claude'].includes(r.provider)));
    assert.equal(new Set(p.history.map(r=>r.historicalTrial)).size,p.history.length);
    const providers={codex:0,claude:0};for(const r of counted)providers[r.provider]++;
    assert(providers.codex<=3&&providers.claude<=3&&counted.length<6);
    const other=prior.target==='codex'?'claude':'codex';
    const targets=[...Array(3-providers[prior.target]).fill(prior.target),...Array(3-providers[other]).fill(other)];
    assert.equal(targets[0],prior.target,'Running Round 5 must fill an available provider slot');
    const slots=targets.map((target,i)=>({id:p.id,target,historicalTrial:7+i,versionRound:5+i,adoptExisting:i===0}));
    return {id:p.id,analysis:p.analysis,history:p.history,failures:counted.filter(r=>r.countedReward===0).length,scored:counted.length,providers,packageDigest:prior.packageDigest,gradingRevision:prior.gradingRevision,slots};
  });
  const all=packages.flatMap(p=>p.slots);
  assert.equal(all.filter(s=>s.adoptExisting).length,5);
  assert.equal(all.length,12);assert.equal(all.filter(s=>!s.adoptExisting).length,7);
  return {schemaVersion:1,maxConcurrent:5,maxNewProviderCalls:7,adoptExistingAttempts:5,automaticRetries:false,stopOnNextPass:true,maxCountedPerTask:6,providersPerCompletedTask:{codex:3,claude:3},packages};
}

export function initialState(p) {
  return {id:p.id,failures:p.failures,scored:p.scored,providers:{...p.providers},cursor:0,stopReason:null,attempts:[]};
}

export function nextSlot(p,state) {
  assert.equal(p.id,state.id);
  if(state.stopReason!==null||state.scored===6)return null;
  assert(state.scored<6&&state.providers.codex<=3&&state.providers.claude<=3);
  const slot=p.slots[state.cursor];assert(slot,'No authorized slot remains');
  assert(state.providers[slot.target]<3,'Provider already has three counted trials');
  return slot;
}

export function applyOutcome(p,state,slot,reward) {
  assert.deepEqual(slot,nextSlot(p,state),'Unexpected, duplicate, or out-of-order result');
  assert([0,1,null].includes(reward));
  const next=structuredClone(state);next.cursor++;
  next.attempts.push({...slot,countedReward:reward});
  if(reward===null){next.stopReason='infrastructure-or-unresolved-grading';return next;}
  next.scored++;next.providers[slot.target]++;if(reward===0)next.failures++;
  assert(next.scored<=6&&next.providers.codex<=3&&next.providers.claude<=3);
  if(next.scored===6){
    assert.deepEqual(next.providers,{codex:3,claude:3});next.stopReason='six-counted';
  } else if(reward===1)next.stopReason='solver-pass';
  return next;
}

export function classify(state) {
  return {...state,completeSix:state.scored===6,meetsFiveOfSix:state.scored===6&&state.failures>=5,
    canStillReachFive:state.failures+(6-state.scored)>=5};
}
