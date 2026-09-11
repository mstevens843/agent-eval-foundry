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
const p=read("reports/screening/evidence/2026-09-11-hardened-next-five-trial-three-preparation.json");
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
assert.equal(ready.packages.filter(x=>x.target==="codex").length,3);
assert.equal(ready.packages.filter(x=>x.target==="claude").length,2);
for(const plan of ready.packages){
  const row=p.packages.find(x=>x.id===plan.id);assert(row);
  for(const key of ["target","packageDigest","profileDigest","historicalTrial","versionAttempt","gradingRevision"])
    assert.equal(plan[key],row[key],row.id+": "+key);
}
const previous=read(p.predecessor.path);
assert.equal(hash(join(root,p.predecessor.path)),p.predecessor.sha256);
assert.equal(p.runtime.sourceDigest,previous.runtime.sourceDigest);
assert.equal(p.runtime.bundleSha256,previous.runtime.bundleSha256);
assert.equal(ready.concurrency,5);assert.equal(ready.maxProviderCalls,5);assert.equal(ready.automaticRetries,false);
for(const plan of ready.packages){
  const old=previous.packages.find(r=>r.id===plan.id);assert(old);
  for(const key of ["target","packageDigest","profileDigest","profile","gradingRevision"])assert.deepEqual(plan[key],old[key],plan.id+": "+key);
  assert.equal(plan.historicalTrial,5);assert.equal(plan.versionAttempt,3);
}
const copy=read(p.files.runtimeCopy.path);
function inventory(directory,prefix="") {
  return readdirSync(directory).sort().flatMap(name=>{
    const file=join(directory,name),path=join(prefix,name),stat=lstatSync(file);
    if(stat.isSymbolicLink())return [{path,link:readlinkSync(file)}];
    if(stat.isDirectory())return inventory(file,path);
    assert(stat.isFile());return [{path,bytes:stat.size,sha256:hash(file)}];
  });
}
assert.deepEqual(inventory(frozen),copy.files,"Frozen runtime differs from copied Trial 4 bytes");
execFileSync(process.execPath,[join(root,p.files.controller.path),"verify"],{cwd:frozen,stdio:"inherit",timeout:60000});
console.log(JSON.stringify({preparedPackages:5,concurrency:5,maxProviderCalls:5,sourceFilesVerified:runtime.files.length,dependencyEntriesVerified:deps.files.length,dispatchClaimExists:existsSync(join(root,p.runRoot,"DISPATCH-CLAIM")),providerCallsMade:0,pass:true}));
