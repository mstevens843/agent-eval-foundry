import { equal, verdicts } from './checker-utils.mjs';
const entries = m => [...m].sort(([a],[b])=>a<b?-1:a>b?1:0);
const pair = (s,d) => JSON.stringify([s,d.release,d.generation]);
export function check(c) {
  let state=new Map(c.input.services.map(s=>[s.id,structuredClone(s)]));
  const releases=new Map(c.input.releases.map(r=>[r.id,r]));
  const retained=new Set(c.input.stages.map(s=>s.id)),samples=new Map();
  for(const run of c.runs) {
    if(!equal(entries(state),entries(new Map(run.entry)))) return false;
    const origin=new Map(run.entry),allowed=new Set(run.requests.map(r=>r.service));
    const targets=new Map(run.requests.map(r=>[r.service,c.input.releases
      .filter(x=>x.model===r.model&&x.abi===origin.get(r.service).abi)
      .sort((a,b)=>b.rank-a.rank)[0]??null]));
    const health=new Map();
    for(const o of run.observations) {
      const r=o.request;
      if(o.method==='inventory'||o.method==='catalog'||o.method==='stages') continue;
      if(o.method==='cleanup') {if(retained.has(r.id))return false;continue;}
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
      } else if(o.method==='bind') {
        const deployment={release:r.release,generation:r.generation};
        if(!equal(s.deployment,deployment)||releases.get(r.release)?.abi!==s.abi) return false;
        const fresh=[...(samples.get(pair(s.id,deployment))??[])].sort((a,b)=>b.sequence-a.sequence).slice(0,2);
        if(fresh.length!==2||fresh.some(x=>!x.ok)) return false;
        s.alias=deployment;
      } else if(o.method==='warm') {
        if(s.alias.release!==r.release||s.abi!==r.abi) return false;
        s.cache={release:r.release,abi:r.abi};
      } else return false;
    }
    if(!equal(entries(state),entries(new Map(run.state)))||!equal(run.stages,c.input.stages)) return false;
    const expected=[];
    for(const r of run.requests) {
      const s=state.get(r.service),before=origin.get(r.service),target=targets.get(r.service);
      let status,release;
      if(!target) {status='unavailable';release=before.deployment.release;if(!equal(s,before))return false;}
      else {
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
