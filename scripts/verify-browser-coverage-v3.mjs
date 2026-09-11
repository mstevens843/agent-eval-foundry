// Read-only byte and accounting verification. No Docker or provider dispatch.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const hash=p=>createHash('sha256').update(readFileSync(join(root,p))).digest('hex');
const ev=read('reports/screening/evidence/2026-09-11-browser-coverage-v3.json');
const verifyRef=r=>assert.equal(hash(r.path),r.sha256,r.path);
verifyRef(ev.previousCoverage);verifyRef(ev.disposition);
for(const r of Object.values(ev.evidence))verifyRef(r);
const old=read(ev.previousCoverage.path);
const prep=read('reports/screening/evidence/2026-09-11-hardened-next-five-trial-four-preparation.json');
assert.equal(hash(join(prep.runtime.directory,'dist/index.js')),prep.runtime.bundleSha256);
const api=await import(pathToFileURL(join(root,prep.runtime.directory,'dist/index.js')));
assert.equal(ev.tasks.length,5);assert.deepEqual(ev.changedPackages,['browser-replay-repair']);
for(const t of ev.tasks){
 for(const r of [t.foundry.pointer,t.foundry.assurance,t.foundry.checkerEvidence,t.native.manifest,t.native.oracle.result,t.native.oracle.summary,t.native.nop.result,t.native.nop.summary])verifyRef(r);
 const pkg=api.executionPackage(join(root,t.foundry.directory));assert.equal(pkg.snapshot.record.digest,t.foundry.digest);
 assert.equal(read(t.foundry.assurance.path).packageDigest,t.foundry.digest);
 assert(read(t.foundry.assurance.path).results.every(r=>r.status==='pass'));
 const native=read(t.native.manifest.path);assert.equal(native.digest,t.native.digest);
 for(const f of native.exportFiles)assert.equal(hash(join(t.native.directory,f.path)),f.sha256,f.path);
 assert.equal(t.native.oracle.reward,1);assert.equal(t.native.nop.reward,0);assert(t.native.integrity.every(r=>r.passed));
 if(t.id!=='browser-replay-repair')assert.deepEqual(t,old.tasks.find(x=>x.id===t.id));
 else {
   assert.equal(t.gradingRevision,'coverage-v3');assert.equal(t.reference.total,22);assert.equal(t.reference.passes,22);
   assert.equal(t.alternative.passes,22);assert.equal(t.starter.failures,22);assert.equal(t.checker.correct,14);
   assert(t.savedSubmissionReplay.service.pass&&!t.savedSubmissionReplay.checker.pass);
   for(const f of native.sourceFiles){assert.equal(hash(join('tasks',t.id,f.path)),f.sha256);assert.equal(hash(join(t.foundry.directory,'package',f.path)),f.sha256);}
 }
}
const d=read(ev.disposition.path),b=d.rows.find(r=>r.id==='browser-replay-repair');
assert.equal(b.recordedReward,1);assert.equal(b.countedReward,null);assert.equal(b.diagnosticReward,0);assert(b.userAuthorizedVoid);
assert.equal(d.rows.find(r=>r.id==='route-policy-repair').countedReward,1);
assert.equal(d.rows.filter(r=>r.countedReward===0).length,3);
assert.equal(d.separateUnscoredInterruption.countedReward,null);
for(const row of d.rows){verifyRef(row.originalGrade);verifyRef(row.originalCompletion);}
console.log(JSON.stringify({pass:true,packages:5,browserScenarios:22,otherFourExportsUnchanged:true,routePassRetained:true,browserTrial6CountedReward:null,providerCallsMade:0}));
