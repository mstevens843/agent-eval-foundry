// Mutation-test semantic checks against actually executed, author-owned traces.
// Synthetic checker changes are not submitted solutions or model difficulty evidence.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [rootArg, outputArg, ...inputs] = process.argv.slice(2);
if (!rootArg || !outputArg || !inputs.length) throw Error('Usage: mutate-queue-eleven-fifteen-checkers.mjs SOURCE_ROOT FRESH_OUTPUT EXECUTED_CELLS_JSON...');
const root=resolve(rootArg), output=resolve(outputArg);
mkdirSync(output,{recursive:false});
const bank=new Map();
for(const input of inputs) {
  const data=JSON.parse(readFileSync(input));
  if(Array.isArray(data)) for(const candidate of data) bank.set(candidate.id+'/'+candidate.name,candidate);
  else {
    const id=['capacity-maintenance-repair','partial-release-repair','verified-installation-repair','compatible-rollout-repair','ticket-consolidation-repair'].find(id=>input.includes(id));
    assert(id && data.cases && data.labels, 'unrecognized native capture');
    for(const c of data.cases) bank.set(id+'/'+c.token,{id,name:c.token,caseCells:c.cells,expected:data.labels[c.token]});
  }
}
const mutations=[];
const edit=(id,name,from,to,kind='missing-obligation')=>mutations.push({id,name,kind,apply:s=>{
  assert(s.includes(from),id+'/'+name+': stale mutation anchor');return s.replace(from,to);
}});
const capacity='capacity-maintenance-repair', partial='partial-release-repair', install='verified-installation-repair', rollout='compatible-rollout-repair', ticket='ticket-consolidation-repair';
edit(capacity,'ignore-weighted-capacity','if (load > host.capacity) return false;','');
edit(capacity,'count-provisioning-as-active','p.service === service.id && p.phase === "active"','p.service === service.id');
edit(capacity,'ignore-eligibility','if (rows.some((p) => !v.services.find((s) => s.id === p.service).eligible.includes(p.host))) return false;','');
edit(capacity,'ignore-zone-limits','if ([...zones.values()].some((n) => n > service.perZone)) return false;','');
edit(capacity,'ignore-readiness','rows.every((p) => p.phase === "active") &&','');
edit(capacity,'ignore-required-maintenance','equal([...done].sort(), [...v.requests].sort()) &&','');
edit(capacity,'ignore-restoration','equal(pairs(rows), pairs(v.placement)) &&','');
edit(capacity,'ignore-illegal-attempts','if (closed || value?.ok !== true) return false;','if (value?.ok !== true) continue; if (closed) return false;');
edit(partial,'ignore-final-payload','if (target.has(id) && !same(actual.get(id), target.get(id))) return false;','');
edit(partial,'ignore-scope-completion','if (actual.has(id) !== target.has(id)) return false;','');
edit(partial,'ignore-remove-dependencies','if (before.some(r => r.parents.includes(id))) return false;','');
edit(partial,'ignore-create-dependencies','if (resource.parents.some(p => !before.some(r => r.id === p))) return false;','');
edit(partial,'ignore-resource-schema','typeof resource.payload !== "string" || ','');
edit(partial,'forbid-idempotent-creates','if (current && !same(current, resource)) return false;','if (current) return false;','overly-strict');
edit(install,'only-check-final-commitment',"if (call.request.status === 'installed' && !equal(call.request.digests, a.descriptors.map(d => d.digest))) return false;", "if (index === c.attempts.length-1 && call.request.status === 'installed' && !equal(call.request.digests, a.descriptors.map(d => d.digest))) return false;");
edit(install,'only-check-final-availability',"if (call.request.status !== (required === null ? 'unavailable' : 'installed')) return false;", "if (index === c.attempts.length-1 && call.request.status !== (required === null ? 'unavailable' : 'installed')) return false;");
edit(install,'skip-earlier-completion',"if (finishCalls.length !== 1) return false;", "if (finishCalls.length === 0 && index < c.attempts.length-1) continue; if (finishCalls.length !== 1) return false;");
edit(install,'ignore-post-finish-writes','if (closed) return false;','');
edit(install,'forbid-recoverable-write-errors','function legalObservations(observations) {','function legalObservations(observations) { if(observations.some(o=>o.value?.ok===false))return false;','overly-strict');
edit(rollout,'null-reports-look-interrupted','if(run.report===null) return false;','if(run.report===null) continue;');
edit(rollout,'ignore-dead-record-cleanup','if(!knownLive.has(r.id) || owners.get(r.id)!==run.job) return false;','if(owners.get(r.id)!==run.job) return false;');
edit(rollout,'allow-warming-stale-alias','||!equal(s.alias,s.deployment)','');
edit(rollout,'ignore-bind-health-evidence','if(fresh.length!==2||fresh.some(x=>!x.ok)) return false;','');
edit(rollout,'forbid-additional-telemetry',"if(o.method==='telemetry') {", "if(o.method==='telemetry') { if(samples.has(pair(s.id,s.deployment)))return false;",'overly-strict');
edit(ticket,'ignore-execution-failure',"if (c.execution?.outcome !== 'returned' || c.operationCount > c.operationBudget) return false;",'');
edit(ticket,'require-write-for-every-selected-row','const touched = new Set((c.calls || []).map(call => key(call.request)));','const touched = new Set((c.calls || []).map(call => key(call.request))); if([...wanted].some(k=>!touched.has(k)))return false;','overly-strict');
edit(ticket,'forbid-equivalent-rewrites','const touched = new Set((c.calls || []).map(call => key(call.request)));','const touched = new Set((c.calls || []).map(call => key(call.request))); if(c.calls.filter(c=>c.status==="APPLIED").length>touched.size)return false;','overly-strict');
edit(ticket,'ignore-transient-label-loss','!before.labels.every(x => u.patch.labels.includes(x))','false');

const results=[];
for(const id of [capacity,partial,install,rollout,ticket]) {
  const candidates=[...bank.values()].filter(c=>c.id===id);
  const cases=candidates.flatMap(c=>c.caseCells ? [{token:c.name,cells:c.caseCells,expected:c.expected,name:c.name,scenario:'complete-bank'}] : c.cells.map((cell,i)=>{
    const {checks,failures,expected,truth,groundTruth,status,...raw}=cell;
    return {token:c.name+'/'+i,cells:[raw],expected:failures.length===0,name:c.name,scenario:cell.scenarioId};
  }));
  for(const mutation of [{name:'reference',id,kind:'baseline'},...mutations.filter(m=>m.id===id)]) {
    const dir=join(output,id,mutation.name);cpSync(join(root,'tasks',id,'private/reference'),dir,{recursive:true});
    const file=join(dir,'checker.mjs');if(mutation.apply)writeFileSync(file,mutation.apply(readFileSync(file,'utf8')));
    const checker=await import(pathToFileURL(file));
    const result=await checker.run({cases:cases.map(({token,cells})=>({token,cells}))});
    const errors=cases.filter(c=>result.verdicts[c.token]?.ok!==c.expected).map(c=>({candidate:c.name,scenario:c.scenario,expected:c.expected,actual:result.verdicts[c.token]?.ok}));
    const falseAccepts=errors.filter(e=>e.expected===false).length, falseRejects=errors.filter(e=>e.expected===true).length;
    const passed=mutation.name==='reference'?errors.length===0:mutation.kind==='overly-strict'?falseRejects>0:falseAccepts>0;
    const row={id,mutation:mutation.name,kind:mutation.kind,cells:cases.length,falseAccepts,falseRejects,passed,witnesses:errors.slice(0,8)};
    results.push(row);console.log(JSON.stringify(row));
  }
}
writeFileSync(join(output,'summary.json'),JSON.stringify({providerCallsMade:0,protectedExecution:false,passed:results.every(r=>r.passed),results},null,2)+'\n');
if(results.some(r=>!r.passed))process.exitCode=1;
