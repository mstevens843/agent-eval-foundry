import { equal, verdicts } from './checker-utils.mjs';
const key = (p,e) => JSON.stringify([p,e]);
const pairs = m => [...m].sort(([a],[b])=>a<b?-1:a>b?1:0);
export function check(c) {
  const partitions = new Set(c.partitions);
  const generation = new Map(c.partitions.map(p=>[p,0]));
  const finalGeneration = new Map(generation), expected = new Map();
  const required = new Map(c.partitions.map(p=>[p,new Set()]));
  for(const e of c.inputEvents) {
    if(!partitions.has(e.partition)) continue;
    if(e.kind==='assignment') {finalGeneration.set(e.partition,e.generation);continue;}
    if(e.generation!==finalGeneration.get(e.partition)) continue;
    required.get(e.partition).add(e.offset);
    const k=key(e.partition,e.record.entity),old=expected.get(k);
    if(!old||old.version<e.record.version) expected.set(k,e.record);
  }
  const records=new Map(),delivered=new Map(),done=new Map(c.partitions.map(p=>[p,new Set()]));
  const checkpoint=new Map(c.partitions.map(p=>[p,-1]));
  let consumed=0;
  for(const o of c.observations) {
    const r=o.request;
    if(o.method==='next') {
      const e=o.value;
      if(!equal(e,c.inputEvents[consumed++]??null)) return false;
      if(!e||!partitions.has(e.partition)) continue;
      if(e.kind==='assignment') generation.set(e.partition,e.generation);
      else if(e.generation===generation.get(e.partition)) delivered.set(e.eventId,e);
      continue;
    }
    if(o.method==='read') continue;
    if(!['put','complete','commit'].includes(o.method)) return false;
    if(!partitions.has(r.partition)||r.generation!==generation.get(r.partition)) return false;
    if(o.method==='put') {
      const k=key(r.partition,r.entity),old=records.get(k);
      const row={entity:r.entity,version:r.version,body:r.body};
      if(old&&old.version>r.version) return false;
      if(![...delivered.values()].some(e=>e.partition===r.partition&&equal(e.record,row))) return false;
      records.set(k,row);
    } else if(o.method==='complete') {
      const e=delivered.get(r.eventId),a=e&&records.get(key(e.partition,e.record.entity));
      if(!e||e.partition!==r.partition||e.offset!==r.offset||!a||a.version<e.record.version) return false;
      done.get(r.partition).add(r.offset);
    } else {
      let prefix=-1;while(done.get(r.partition).has(prefix+1)) prefix++;
      if(!Number.isInteger(r.offset)||r.offset<checkpoint.get(r.partition)||r.offset>prefix) return false;
      checkpoint.set(r.partition,r.offset);
    }
  }
  if(consumed<c.inputEvents.length||!equal(pairs(records),pairs(expected))||
      !equal(pairs(records),pairs(new Map(c.actual)))||!equal(pairs(checkpoint),pairs(new Map(c.checkpoints)))) return false;
  for(const [p,offsets] of required) {
    let prefix=-1;while(offsets.has(prefix+1)) prefix++;
    if(checkpoint.get(p)!==prefix||[...offsets].some(o=>!done.get(p).has(o))) return false;
  }
  return true;
}
export const run=({cases})=>verdicts(cases,check);
