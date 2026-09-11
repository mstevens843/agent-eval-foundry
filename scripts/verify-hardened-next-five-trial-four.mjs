// Independent read-only verification before loading the campaign runtime.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, lstatSync, readFileSync, readlinkSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>JSON.parse(readFileSync(join(root,p),"utf8"));
const hash=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const p=read("reports/screening/evidence/2026-09-11-hardened-next-five-trial-four-preparation.json");
for(const item of Object.values(p.files))assert.equal(hash(join(root,item.path)),item.sha256,item.path);
const frozen=join(root,p.runtime.directory);
const runtime=read(p.files.runtimeVerification.path);
const authorityHash=createHash("sha256");
for(const f of runtime.files){
  const bytes=readFileSync(join(frozen,f.path));
  assert.equal(createHash("sha256").update(bytes).digest("hex"),f.sha256,f.path);
  authorityHash.update(f.path).update("\0").update(bytes).update("\0");
}
assert.equal(authorityHash.digest("hex"),p.runtime.sourceDigest);
assert.equal(hash(join(frozen,"dist/index.js")),p.runtime.bundleSha256);
const deps=read(p.files.dependencies.path),dependencyRoot=realpathSync(join(frozen,"node_modules"));
for(const f of deps.files){
  const path=join(dependencyRoot,f.path);
  if(f.link!==undefined){
    assert(lstatSync(path).isSymbolicLink());assert.equal(readlinkSync(path),f.link);
    const rel=relative(dependencyRoot,realpathSync(path));assert(rel!==".."&&!rel.startsWith("../"),f.path+": dependency escapes frozen tree");
  }else assert.equal(hash(path),f.sha256,f.path);
}
const ready=read(p.files.ready.path);
assert.equal(ready.packages.length,5);
assert.equal(ready.packages.filter(x=>x.target==="codex").length,2);
assert.equal(ready.packages.filter(x=>x.target==="claude").length,3);
for(const plan of ready.packages){
  const row=p.packages.find(x=>x.id===plan.id);assert(row);
  for(const key of ["target","packageDigest","profileDigest","historicalTrial","versionAttempt","gradingRevision"])
    assert.equal(plan[key],row[key],row.id+": "+key);
}
const previous=read(p.predecessor.path);
assert.equal(hash(join(root,p.predecessor.path)),p.predecessor.sha256);
assert.notEqual(p.runtime.sourceDigest,previous.runtime.sourceDigest);
assert.notEqual(p.runtime.bundleSha256,previous.runtime.bundleSha256);
assert.equal(ready.concurrency,5);assert.equal(ready.maxProviderCalls,5);assert.equal(ready.automaticRetries,false);
for(const plan of ready.packages){
  const old=previous.packages.find(r=>r.id===plan.id);assert(old);
  for(const key of ["packageDigest","gradingRevision"])assert.deepEqual(plan[key],old[key],plan.id+": "+key);
  assert.equal(plan.target,old.target==="claude"?"codex":"claude");
  assert.equal(plan.profile.limits.memoryMiB,plan.id==="browser-replay-repair"?4096:2048);
  for(const key of ["wallMs","artifactBytes","outputBytes","cpus","pids"])assert.equal(plan.profile.limits[key],old.profile.limits[key]);
  assert.equal(plan.profile.authoring.image,old.profile.authoring.image);
  assert.equal(plan.historicalTrial,6);assert.equal(plan.versionAttempt,4);
}
assert.equal(p.browserMitigation.missingClaudeSlotStillPending,true);
assert.equal(p.browserMitigation.countedReward,null);
assert.equal(p.packageBytesChanged,false);
assert.equal(p.providerAssignmentsChanged,true);
const provenance=read(p.files.provenance.path);
assert(provenance.sourceChanges.some(f=>f.path==="src/execution/authoring-diagnostics.ts"));
// Check the actual frozen source tree has no additions outside the recorded build closure.
function sourcePaths(dir,prefix="") {
  return readdirSync(dir).sort().flatMap(name=>{
    const path=join(dir,name),rel=join(prefix,name),stat=lstatSync(path);
    assert(!stat.isSymbolicLink(),rel);
    return stat.isDirectory()?sourcePaths(path,rel):[rel];
  });
}
const actual=runtime.sourcePaths.flatMap(path=>lstatSync(join(frozen,path)).isDirectory()?sourcePaths(join(frozen,path),path):[path]);
assert.deepEqual(actual,runtime.files.map(f=>f.path));
execFileSync(process.execPath,[join(root,p.files.controller.path),"verify"],{cwd:frozen,stdio:"inherit",timeout:60000});
console.log(JSON.stringify({preparedPackages:5,concurrency:5,maxProviderCalls:5,sourceFilesVerified:runtime.files.length,dependencyEntriesVerified:deps.files.length,dispatchClaimExists:existsSync(join(root,p.runRoot,"DISPATCH-CLAIM")),providerCallsMade:0,pass:true}));
