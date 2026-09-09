import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {canReachFive,validateSchedule} from '../scripts/run-final-six.mjs';
const plan=validateSchedule(JSON.parse(readFileSync('reports/screening/evidence/2026-09-09-final-six-preparation.json','utf8')));
describe('final six continuation budget',()=>{
 it('prepares the corrected histories and exactly the missing provider slots',()=>{
  expect(validateSchedule(plan).packages).toHaveLength(5);
  expect(plan.packages.reduce((n,p)=>n+p.remaining,0)).toBe(11);
 });
 it('always completes both build slots, including a pass in the first slot',()=>{
  for(const first of [0,1]){const failures=4+(first===0?1:0);expect(canReachFive(failures,5)).toBe(true);}
 });
 it('stops every other candidate at its next pass and completes all-zero continuations',()=>{
  for(const p of plan.packages.filter(p=>p.id!=='incremental-build-repair')){
   for(let offset=0;offset<p.remaining;offset++)expect(canReachFive(p.failures+offset,p.scored+offset+1)).toBe(false);
   expect(canReachFive(p.failures+p.remaining-1,5)).toBe(true);
   expect(canReachFive(p.failures+p.remaining,6)).toBe(false);
   expect(p.failures+p.remaining).toBe(5);
  }
 });
 it('applies coverage repairs to all historical attempts and preserves original grades',()=>{
  const audit: {rows:{id:string;trial:number;recordedReward:number;effectiveReward:number;supplement:{pass:boolean}}[];oracles:{pass:boolean}[]} = JSON.parse(readFileSync('reports/screening/evidence/2026-09-09-final-six-pass-audit.json','utf8'));
  expect(audit.rows).toHaveLength(7);expect(audit.oracles.every(o=>o.pass)).toBe(true);
  for(const row of audit.rows)expect(row.effectiveReward).toBe(Math.min(row.recordedReward,row.supplement.pass?1:0));
  expect(audit.rows.filter(r=>r.recordedReward!==r.effectiveReward).map(r=>[r.id,r.trial])).toEqual([['temporal-capacity-repair',3],['snapshot-recovery-repair',3]]);
 });
});
