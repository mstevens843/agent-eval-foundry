// Publish new Browser grading evidence; retain the other four exports exactly.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(repo,'.local/browser-coverage-v3-2026-09-11'),id='browser-replay-repair';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const ref=p=>({path:relative(repo,p),sha256:hash(p),bytes:statSync(p).size});
const previousPath=join(repo,'reports/screening/evidence/2026-09-11-next-five-coverage-v2.json');
const previous=read(previousPath),base=join(out,'release',id),native=join(out,'harbor',id);
const release=read(join(out,'release/summary.json'));assert(release.recipientReproduction&&release.results.length===1);
const assurance=read(join(base,'validation/assurance.json')),checker=read(join(base,'oracle-checker/grade-summary.json'));
assert(assurance.results.every(r=>r.status==='pass'));assert(checker.pass&&checker.correct===14&&checker.total===14);
const pointer=read(join(base,'export/package.json')),manifest=read(join(native,'export-manifest.json'));
assert.equal(pointer.packageDigest,assurance.packageDigest);
assert.equal(manifest.digest,read(join(out,'harbor-reproduction',id,'export-manifest.json')).digest);
const oldManifest=read(join(repo,previous.tasks.find(t=>t.id===id).native.manifest.path));
assert.deepEqual(manifest.sourceFiles.map(f=>f.path),oldManifest.sourceFiles.map(f=>f.path));
const changes=manifest.sourceFiles.flatMap((f,i)=>f.sha256===oldManifest.sourceFiles[i].sha256?[]:[{path:f.path,beforeSha256:oldManifest.sourceFiles[i].sha256,afterSha256:f.sha256}]);
assert.deepEqual(changes.map(f=>f.path),['private/scenarios.mjs']);
for(const f of manifest.sourceFiles){
  assert.equal(hash(join(repo,'tasks',id,f.path)),f.sha256);
  assert.equal(hash(join(base,'export/package',f.path)),f.sha256);
}
for(const f of manifest.exportFiles)assert.equal(hash(join(native,f.path)),f.sha256);
const integrity=read(join(out,'integrity/summary.json')).results[0];
assert(integrity.id===id&&integrity.integrity.length===9&&integrity.integrity.every(r=>r.passed));
const rawReplay=read(join(out,'saved-submission-replay/summary.json'));
const {details:diagnosticDetails,...checkerReplay}=rawReplay.checker;
const replay={...rawReplay,checker:checkerReplay};
assert(replay.service.pass&&!replay.checker.pass&&replay.countedReward===null&&replay.diagnosticReward===0);
const statics=read(join(out,'static/summary.json'));assert.equal(statics.results.length,22);assert(statics.results.every(r=>r.passed));
const regressions=read(join(out,'regressions.json'));assert(regressions.success&&regressions.numFailedTests===0);
function count(name){
 const statuses=assurance.results.find(r=>r.id===name).detail.statuses;
 assert(statuses.every(r=>!r.error&&['semantic-pass','semantic-fail'].includes(r.status)));
 return {total:statuses.length,passes:statuses.filter(r=>r.status==='semantic-pass').length,failures:statuses.filter(r=>r.status==='semantic-fail').length};
}
function nativeJob(agent){
 const parent=join(out,'jobs','browser-v3-'+agent),dir=join(parent,readdirSync(parent).find(n=>n.startsWith(id+'__')));
 const result=read(join(dir,'result.json')),summary=read(join(dir,'verifier/summary.json'));
 assert(!result.exception_info&&!summary.infrastructureError);assert.equal(summary.reward,agent==='oracle'?1:0);
 return {reward:summary.reward,service:summary.service,checker:summary.checker,result:ref(join(dir,'result.json')),summary:ref(join(dir,'verifier/summary.json'))};
}
const browser={id,version:'3.0.0',gradingRevision:'coverage-v3',publicRequirementsChanged:false,reference:count('reference'),alternative:count('alternative'),starter:count('starter'),assuranceChecks:assurance.results.length,checker:{correct:checker.correct,total:checker.total,scenarioCoverage:'all',tokenCoverage:'opaque-v1',reasonPolicy:'diagnostic-only'},foundry:{directory:relative(repo,join(base,'export')),digest:pointer.packageDigest,pointer:ref(join(base,'export/package.json')),assurance:ref(join(base,'validation/assurance.json')),checkerEvidence:ref(join(base,'oracle-checker/grade-summary.json')),reproducible:true},native:{directory:relative(repo,native),digest:manifest.digest,manifest:ref(join(native,'export-manifest.json')),reproducible:true,oracle:nativeJob('oracle'),nop:nativeJob('nop'),integrity:integrity.integrity},savedSubmissionReplay:replay};
const tasks=previous.tasks.map(t=>t.id===id?browser:t);
const evidence={schemaVersion:1,date:'2026-09-11',purpose:'Round 5 mixed grading manifest: Browser coverage-v3, other four immutable coverage-v2 exports',providerCallsMade:0,newModelTrials:0,previousCoverage:ref(previousPath),disposition:ref(join(repo,'reports/screening/evidence/2026-09-11-browser-round-four-disposition.json')),tasks,changes,publicRequirementsChanged:false,changedPackages:[id],validation:{scope:[id],assuranceChecks:assurance.results.length,referenceServiceScenarios:22,checkerCandidates:14,nativeOraclePasses:1,nativeNopZeroes:1,nativeIntegrityControls:9,staticChecks:22,regressionTests:regressions.numPassedTests,otherFourEvidenceRetained:true},evidence:{integrity:ref(join(out,'integrity/summary.json')),statics:ref(join(out,'static/summary.json')),regressions:ref(join(out,'regressions.json')),replay:ref(join(out,'saved-submission-replay/summary.json')),publicPreservation:ref(join(out,'public-baseline.json')),recipientReproduction:ref(join(out,'release/recipient/result.json'))},accounting:{browserHistoricalTrial6:{recordedReward:1,diagnosticReward:0,countedReward:null,disposition:'grading-void'},routeHistoricalTrial6:{recordedReward:1,countedReward:1,disposition:'retained'},browserHistoricalTrial5:{countedReward:null,disposition:'infrastructure-interrupted',missingClaudeSlotStillPending:true},previousFiveFinalistsUnchanged:true}};
writeFileSync(join(repo,'reports/screening/evidence/2026-09-11-browser-coverage-v3.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({published:true,...evidence.validation,providerCallsMade:0}));
