import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {makeReplacementPlan} from '../scripts/run-three-replacements.mjs';
const disposition=()=>JSON.parse(readFileSync('reports/screening/evidence/2026-09-09-three-replacement-disposition.json','utf8'));
describe('explicit grading-void replacements',()=>{
  it('replaces the original providers in fresh slots without rerunning completed packages',()=>{
    const p=makeReplacementPlan(disposition());
    expect(p.maxConcurrent).toBe(6);expect(p.maxProviderCalls).toBe(3);
    expect(p.allSlotsStartTogether).toBe(true);
    expect(p.slots.map(s=>[s.id,s.trial,s.replacesTrial,s.target])).toEqual([
      ['variant-cache-repair',8,6,'codex'],['variant-cache-repair',9,7,'codex'],['snapshot-recovery-repair',8,4,'codex'],
    ]);
    expect(p.packages.map(p=>[p.failures,p.scored])).toEqual([[4,4],[4,5]]);
  });
  it('rejects provider substitution and duplicate replacement slots',()=>{
    const a=disposition();a.replacementSlots[2].target='claude';
    expect(()=>makeReplacementPlan(a)).toThrow();
    const b=disposition();b.replacementSlots[1]={...b.replacementSlots[0]};
    expect(()=>makeReplacementPlan(b)).toThrow();
  });
  it('does not allow a void to remain counted or replace a retained pass',()=>{
    const a=disposition();a.packages.find((p:any)=>p.id==='snapshot-recovery-repair').voidAttempts[0].countedReward=0;
    expect(()=>makeReplacementPlan(a)).toThrow();
    const b=disposition();b.replacementSlots[2].replacesTrial=7;
    expect(()=>makeReplacementPlan(b)).toThrow();
  });
});
