// Publish verified engineering evidence; no model calls or historical grade edits.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = ".local/next-five-coverage-v2-2026-09-11";
const ids = ["route-policy-repair","browser-replay-repair","recurring-calendar-repair","workflow-authority-repair","delegated-budget-repair"];
const read = p => JSON.parse(readFileSync(p,"utf8"));
const hash = p => createHash("sha256").update(readFileSync(p)).digest("hex");
const ref = p => ({path:p,sha256:hash(p),bytes:statSync(p).size});
const integrity = read(join(root,"integrity/summary.json"));
const replays = read(join(root,"saved-submission-replay-v2/summary.json"));
const preserved = read(join(root,"public-baseline.json"));
for(const f of preserved) assert.equal(hash(f.path),f.sha256,f.path);
const release = read(join(root,"release/summary.json"));
assert(release.recipientReproduction && release.results.length===5);
function nativeJob(id,agent) {
  const parent=join(root,"jobs","coverage-v2-"+agent);
  const dir=join(parent,readdirSync(parent).find(n=>n.startsWith(id+"__")));
  const result=read(join(dir,"result.json")), summary=read(join(dir,"verifier/summary.json"));
  assert(!result.exception_info&&!summary.infrastructureError);
  assert.equal(summary.reward,agent==="oracle"?1:0);
  return {reward:summary.reward,service:summary.service,checker:summary.checker,result:ref(join(dir,"result.json")),summary:ref(join(dir,"verifier/summary.json"))};
}
const tasks=ids.map(id=>{
  const base=join(root,"release",id), native=join(root,"harbor",id);
  const assurance=read(join(base,"validation/assurance.json")), checker=read(join(base,"oracle-checker/grade-summary.json"));
  assert(assurance.results.every(r=>r.status==="pass"));assert(checker.pass&&checker.correct===checker.total);
  const pointer=read(join(base,"export/package.json")),manifest=read(join(native,"export-manifest.json"));
  assert.equal(manifest.digest,read(join(root,"harbor-reproduction",id,"export-manifest.json")).digest);
  for(const f of manifest.sourceFiles) {
    assert.equal(hash(join("tasks",id,f.path)),f.sha256);
    assert.equal(hash(join(base,"export/package",f.path)),f.sha256);
  }
  for(const f of manifest.exportFiles)assert.equal(hash(join(native,f.path)),f.sha256);
  const count=name=>{
    const rows=assurance.results.find(r=>r.id===name).detail.statuses;
    assert(rows.every(r=>!r.error&&["semantic-pass","semantic-fail"].includes(r.status)));
    return {total:rows.length,passes:rows.filter(r=>r.status==="semantic-pass").length,failures:rows.filter(r=>r.status==="semantic-fail").length};
  };
  const i=integrity.results.find(r=>r.id===id),replay=replays.results.find(r=>r.id===id);
  assert(i.integrity.every(r=>r.passed)&&i.digest===manifest.digest&&i.checkerTotal===checker.total);
  assert(replay.service.pass&&!replay.checker.pass&&replay.replayReward===0);
  return {id,version:"3.0.0",gradingRevision:"coverage-v2",publicRequirementsChanged:false,reference:count("reference"),alternative:count("alternative"),starter:count("starter"),assuranceChecks:assurance.results.length,checker:{correct:checker.correct,total:checker.total,scenarioCoverage:"all",tokenCoverage:"opaque-v1",reasonPolicy:"diagnostic-only"},foundry:{directory:join(base,"export"),digest:pointer.packageDigest,pointer:ref(join(base,"export/package.json")),assurance:ref(join(base,"validation/assurance.json")),checkerEvidence:ref(join(base,"oracle-checker/grade-summary.json")),reproducible:true},native:{directory:native,digest:manifest.digest,manifest:ref(join(native,"export-manifest.json")),reproducible:true,oracle:nativeJob(id,"oracle"),nop:nativeJob(id,"nop"),integrity:i.integrity.map(({name,passed})=>({name,passed}))},savedSubmissionReplay:replay};
});
const statics=read(join(root,"static/summary.json"));assert.equal(statics.results.length,110);assert(statics.results.every(r=>r.passed));
const mutations=read(join(root,"mutations/summary.json"));assert(mutations.results.every(r=>r.pass));
const regressions=read(join(root,"regressions-focused.json"));assert(regressions.success&&regressions.numFailedTests===0);
const result={schemaVersion:1,date:"2026-09-11",purpose:"Integrate independently reproduced Trial 3 grading gaps under the unchanged public 3.0.0 contracts",gradingRevision:"coverage-v2",providerCallsMade:0,historicalRewardsChanged:0,newModelTrials:0,tasks,validation:{assuranceChecks:tasks.reduce((n,t)=>n+t.assuranceChecks,0),checkerCandidates:tasks.reduce((n,t)=>n+t.checker.total,0),nativeOraclePasses:5,nativeNopZeroes:5,nativeIntegrityControls:integrity.results.reduce((n,t)=>n+t.integrity.length,0),staticChecks:110,mutationsDetected:mutations.results.filter(r=>r.mutation!=="reference").length,regressionTests:regressions.numPassedTests},evidence:{integrity:ref(join(root,"integrity/summary.json")),statics:ref(join(root,"static/summary.json")),mutations:ref(join(root,"mutations/summary.json")),regressions:ref(join(root,"regressions-focused.json")),replays:ref(join(root,"saved-submission-replay-v2/summary.json")),publicPreservation:ref(join(root,"public-baseline.json")),recipientReproduction:ref(join(root,"release/recipient/result.json"))},publicFiles:preserved,accounting:{originalRecordedRewards:[1,1,0,0,0],originalWorkflowCause:"host defect; independent legal-retry checker defect reproduced with host corrected",replayRewards:[0,0,0,0,0],replaysAreNewTrials:false,recoveredCalendarAndBudget:"Original completed, graded evidence published after storage-limit repair; no model rerun",previousFiveFinalistsUnchanged:true},changes:["Browser: missing report following genuine interruption and wrongly wrapped report controls","Workflow: validate terminal dispatch token before returning PENDING; accept legal terminal retry variant","All five: private opaque-token output coverage in Foundry and Harbor","Runtime: retain scoped 512 MiB evidence publication budget and lossless gzip process logs"],limitations:["Finite test coverage does not prove absence of all remaining defects.","Provider-free replays are diagnostic evidence, not additional trials or new six-run qualification."]};
writeFileSync("reports/screening/evidence/2026-09-11-next-five-coverage-v2.json",JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify(result.validation));
