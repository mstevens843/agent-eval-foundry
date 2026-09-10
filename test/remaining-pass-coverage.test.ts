import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {validationMetadataCurrent} from '../data/remaining-pass-grading-controls/cache-metadata.mjs';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
describe('304 metadata coverage on genuine retained traces',()=>{
  const policy=read('data/remaining-pass-grading-controls/policy.json');
  const c=policy.controls.find((c:any)=>c.id==='variant-cache-repair');
  const fixture=read(c.fixture);
  const byName=(name:string)=>fixture.cases.find((x:any)=>x.token===c.expected.find((e:any)=>e.name===name).token).cells[0];
  it('catches unchanged stale metadata that the original service grader accepted',()=>{
    expect(validationMetadataCurrent(byName('stale-304-metadata-control'))).toBe(false);
    expect(validationMetadataCurrent(byName('stale-304-metadata-baseline'))).toBe(true);
  });
  it('does not reject extra origin requests or legitimate copies and preserves evidence',()=>{
    for(const name of ['copy-other-path-control','fresh-plus-origin-control']){
      const cell=byName(name),before=structuredClone(cell);
      expect(validationMetadataCurrent(cell)).toBe(true);
      expect(cell).toEqual(before);
    }
  });
  it('allows removal instead of retaining stale metadata',()=>{
    const cell=structuredClone(byName('stale-304-metadata-control'));
    const last=cell.observations.map((o:any)=>o.method).lastIndexOf('deliver');
    cell.observations.splice(last,0,...['edge-a','shield'].map(tier=>({method:'write',request:{tier,entries:[]},value:{stored:true}})));
    expect(validationMetadataCurrent(cell)).toBe(true);
  });
});
