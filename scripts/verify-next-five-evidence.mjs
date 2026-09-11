import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
const file="reports/screening/evidence/2026-09-10-next-five-successors.json";
const manifest=JSON.parse(readFileSync(file,"utf8"));
let hashes=0,links=0;
function walk(x){
 if(!x||typeof x!=="object")return;
 if(typeof x.path==="string"&&typeof x.sha256==="string"){
  assert.equal(createHash("sha256").update(readFileSync(x.path)).digest("hex"),x.sha256,x.path);hashes++;
 }
 for(const v of Object.values(x))walk(v);
}
walk(manifest);
const docs=[manifest.report,manifest.contractPlan,"docs/next-five-implementation.md",...manifest.preservation.analysisPrefixes.map(r=>r.path)];
for(const path of docs){
 const text=readFileSync(path,"utf8");
 for(const match of text.matchAll(/\]\(([^)]+)\)/g)){
  const target=match[1].split("#")[0];if(!target||/^[a-z]+:/.test(target))continue;
  assert(existsSync(resolve(dirname(path),target)),path+" -> "+target);links++;
 }
}
for(const t of manifest.tasks){
 assert.equal(t.version,"3.0.0");assert.equal(t.reference.passes,t.reference.count);
 assert.equal(t.alternative.passes,t.alternative.count);assert.equal(t.starter.infrastructureErrors,0);
 assert.equal(t.checker.correct,t.checker.total);assert.equal(t.native.oracle.reward,1);
 assert.equal(t.native.nop.reward,0);assert(t.native.integrity.every(c=>c.passed));
}
assert.equal(manifest.providerCallsMade,0);assert.equal(manifest.finalistStandings.successorAdditions,0);
console.log(JSON.stringify({hashesVerified:hashes,localLinksVerified:links,tasks:manifest.tasks.length,pass:true}));
