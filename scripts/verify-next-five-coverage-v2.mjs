// Read-only verification of actual export/evidence bytes. No runtime import or model call.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>JSON.parse(readFileSync(join(root,p),"utf8"));
const hash=p=>createHash("sha256").update(readFileSync(join(root,p))).digest("hex");
const e=read("reports/screening/evidence/2026-09-11-next-five-coverage-v2.json");
assert.equal(e.tasks.length,5);assert.equal(e.providerCallsMade,0);
for(const r of Object.values(e.evidence))assert.equal(hash(r.path),r.sha256,r.path);
for(const f of e.publicFiles)assert.equal(hash(f.path),f.sha256,f.path);
for(const t of e.tasks){
  for(const r of [t.foundry.pointer,t.foundry.assurance,t.foundry.checkerEvidence,t.native.manifest,t.native.oracle.result,t.native.oracle.summary,t.native.nop.result,t.native.nop.summary])assert.equal(hash(r.path),r.sha256,r.path);
  const m=read(t.native.manifest.path);
  assert.equal(m.digest,t.native.digest);
  for(const f of m.exportFiles)assert.equal(hash(join(t.native.directory,f.path)),f.sha256,f.path);
  for(const f of m.sourceFiles){assert.equal(hash(join("tasks",t.id,f.path)),f.sha256,f.path);assert.equal(hash(join(t.foundry.directory,"package",f.path)),f.sha256,f.path);}
  assert(t.checker.correct===t.checker.total&&t.native.oracle.reward===1&&t.native.nop.reward===0);
}
console.log(JSON.stringify({pass:true,packages:5,publicRequirementsChanged:false,providerCallsMade:0}));
