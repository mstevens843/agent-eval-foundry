import { equal, verdicts } from './checker-utils.mjs';
const entries = m => [...m].sort(([a],[b])=>a<b?-1:a>b?1:0);
const pair = (s,d) => JSON.stringify([s,d.release,d.generation]);
// Once a higher-numbered (later-dispatched) job has staged a service, no lower-numbered job may
// stage, bind or warm that same service afterward: that would be a stale job clobbering a newer,
// already-applied, legitimate result instead of deferring to it. `actions` is raw, ordered,
// cross-job call history — not a private verdict — so this is derived independently of anything
// domain.mjs concluded on its own.
function actionOwnershipOk(actions) {
  const maxJobSoFar = new Map();
  for (const a of actions) {
    const seen = maxJobSoFar.get(a.service);
    if (a.kind === 'stage') {
      if (seen !== undefined && a.job < seen) return false;
      maxJobSoFar.set(a.service, seen === undefined ? a.job : Math.max(seen, a.job));
    } else if ((a.kind === 'bind' || a.kind === 'warm') && seen !== undefined && a.job < seen) return false;
  }
  return true;
}
export function check(c) {
  if (!actionOwnershipOk(c.actions)) return false;
  let state=new Map(c.input.services.map(s=>[s.id,structuredClone(s)]));
  const releases=new Map(c.input.releases.map(r=>[r.id,r]));
  const retained=new Set(c.input.stages.map(s=>s.id)),samplesByJob=new Map(),healthByJob=new Map(),origins=new Map();
  const owners = new Map(c.input.stages.map(s=>[s.id,null]));
  // `knownLive` mirrors which staging record ids the candidate has actually been shown to exist,
  // reconstructed purely from what it has itself observed (seeded from the pre-existing records,
  // then replaced wholesale by every `stages()` read and pruned by every legal `cleanup`) — never
  // from a private id list. A `cleanup` on an id not in this set is illegal regardless of whether
  // it also happens to be pre-existing.
  let knownLive = new Set(c.input.stages.map(s=>s.id));
  // Only a job with an earlier, interrupted fragment of its own (report:null) was ever actually
  // paused mid-flight — only such a job's later, completing run can legitimately have been
  // superseded. An ordinary job that simply ran after an earlier one finished (normal sequential
  // reuse of a service across jobs, which is allowed) was never paused, so a later job's action on
  // the same service is not evidence against it.
  const deferredJobs = new Set(c.runs.filter(r=>r.interrupted===true).map(r=>r.job));
  for(const run of c.runs) {
    if(!equal(entries(state),entries(new Map(run.entry)))) return false;
    if (!origins.has(run.job)) origins.set(run.job, new Map(structuredClone(run.entry)));
    const origin=origins.get(run.job),allowed=new Set(run.requests.map(r=>r.service));
    const samples=samplesByJob.get(run.job)??new Map(); samplesByJob.set(run.job,samples);
    const targets=new Map(run.requests.map(r=>[r.service,c.input.releases
      .filter(x=>x.model===r.model&&x.abi===origin.get(r.service).abi)
      .sort((a,b)=>b.rank-a.rank)[0]??null]));
    const health=healthByJob.get(run.job)??new Map(); healthByJob.set(run.job,health);
    for(const o of run.observations) {
      const r=o.request;
      if(o.method==='inventory'||o.method==='catalog') continue;
      if(o.method==='stages') continue;
      if(o.method==='cleanup') {
        if(!knownLive.has(r.id) || owners.get(r.id)!==run.job) return false;
        knownLive.delete(r.id);
        if(retained.has(r.id)) return false;
        continue;
      }
      const s=state.get(r.service);
      if(!s) return false;
      if(o.method==='telemetry') {
        for(const sample of o.value) {
          const k=pair(sample.service,sample),rows=samples.get(k)??[];
          rows.push(sample);samples.set(k,rows);
        }
        const current=o.value.filter(x=>pair(x.service,x)===pair(s.id,s.deployment))
          .sort((a,b)=>b.sequence-a.sequence).slice(0,2);
        if(s.deployment.release===targets.get(s.id)?.id&&current.length===2)
          health.set(s.id,current.every(x=>x.ok));
        continue;
      }
      if(!allowed.has(s.id)) return false;
      if(o.method==='stage') {
        if(!releases.has(r.release)) return false;
        s.deployment={release:r.release,generation:s.deployment.generation+1};
        if(!equal(s.deployment,o.value)) return false;
        const action=c.actions.find(a=>a.kind==='stage'&&a.job===run.job&&a.service===s.id&&a.release===r.release&&a.generation===s.deployment.generation);
        if(!action || knownLive.has(action.stageId)) return false;
        knownLive.add(action.stageId); owners.set(action.stageId,run.job);
      } else if(o.method==='bind') {
        const deployment={release:r.release,generation:r.generation};
        if(!equal(s.deployment,deployment)||releases.get(r.release)?.abi!==s.abi) return false;
        const fresh=[...(samples.get(pair(s.id,deployment))??[])].sort((a,b)=>b.sequence-a.sequence).slice(0,2);
        if(fresh.length!==2||fresh.some(x=>!x.ok)) return false;
        s.alias=deployment;
      } else if(o.method==='warm') {
        if(s.alias.release!==r.release||s.abi!==r.abi||!equal(s.alias,s.deployment)) return false;
        s.cache={release:r.release,abi:r.abi};
      } else return false;
    }
    if(!equal(entries(state),entries(new Map(run.state)))) return false;
    // A run with no report is an interrupted, non-terminal fragment (its process died before
    // delivering anything back): its observations still had to be legal, and are already fully
    // replayed above, but there is nothing yet to validate a completed job's cleanup or report
    // against — that happens on the run that eventually completes this same job.
    if(run.interrupted===true) {
      if(run.report!==null || !run.observations.some(o=>o.interrupted===true) ||
          !c.runs.some(later=>later.job===run.job&&later.interrupted!==true&&later.report!==null&&c.runs.indexOf(later)>c.runs.indexOf(run))) return false;
      continue;
    }
    if(run.report===null) return false;
    // Scoped to what existed when this job started (raw, supplied per run — see domain.mjs), not
    // the scenario-wide original: a still-pending sibling job's own orphaned record can
    // legitimately still be present when a job that ran and finished around it completes.
    if(!equal(run.stages,run.stagesAtEntry)) return false;
    const expected=[];
    for(const r of run.requests) {
      const s=state.get(r.service),before=origin.get(r.service),target=targets.get(r.service);
      const supersededHere=deferredJobs.has(run.job)&&c.actions.some(a=>a.kind==='stage'&&a.service===r.service&&a.job>run.job);
      let status,release;
      if(supersededHere) {
        status='superseded';release=s.deployment.release;
        if(!equal(s.alias,s.deployment)||!equal(s.cache,{release,abi:s.abi})) return false;
      } else if(!target) {
        status='unavailable';release=before.deployment.release;if(!equal(s,before))return false;
      } else {
        const good=target.id===before.deployment.release?true:health.get(s.id);
        if(good===undefined) return false;
        status=good?'deployed':'rolled-back';release=good?target.id:before.deployment.release;
        if(s.deployment.release!==release||!equal(s.alias,s.deployment)||
          !equal(s.cache,{release,abi:s.abi})) return false;
      }
      expected.push({service:r.service,status,release});
    }
    if(!equal(run.report,{job:run.job,results:expected})) return false;
  }
  return equal(entries(state),entries(new Map(c.state)))&&equal(c.stages,c.input.stages);
}
export const run=({cases})=>verdicts(cases,check);
