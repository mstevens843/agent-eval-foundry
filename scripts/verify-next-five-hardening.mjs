// Read-only preflight for the recorded frozen exports. No Docker/provider calls.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const evidence = "reports/screening/evidence/2026-09-10-next-five-hardening.json";
const read = p => JSON.parse(readFileSync(p,"utf8"));
const hash = p => createHash("sha256").update(readFileSync(p)).digest("hex");
const m = read(evidence);
let hashes = 0, links = 0;
function checkRefs(value) {
  if (!value || typeof value !== "object") return;
  if (typeof value.path === "string" && typeof value.sha256 === "string") {
    assert.equal(hash(value.path),value.sha256,value.path); hashes++;
  }
  for (const [key,child] of Object.entries(value)) {
    // Analysis files are append-only; their recorded prefix is checked below.
    if (key !== "analysisPrefixes") checkRefs(child);
  }
}
checkRefs(m);
assert.deepEqual(m.tasks.map(t=>t.id),["route-policy-repair","browser-replay-repair","recurring-calendar-repair","workflow-authority-repair","delegated-budget-repair"]);
for (const t of m.tasks) {
  assert.equal(t.reference.passes,t.reference.total);
  assert.equal(t.alternative.passes,t.alternative.total);
  assert(t.positiveVariants.length > 0 && t.positiveVariants.every(v=>v.passes===v.total));
  assert.equal(t.starter.infrastructureErrors,0); assert(t.starter.failures>0);
  assert.equal(t.checker.correct,t.checker.total);
  assert.equal(t.checker.reasonPolicy,"diagnostic-only");
  assert.equal(t.checker.scenarioCoverage,"all");
  const native = read(t.native.manifest.path);
  const reproduced = read(t.native.reproduction.path);
  assert.equal(native.digest,t.native.digest); assert.equal(reproduced.digest,native.digest);
  assert.equal(createHash("sha256").update(JSON.stringify(native.exportFiles)).digest("hex"),native.digest);
  for (const file of native.exportFiles) {
    assert.equal(hash(join(t.native.directory,file.path)),file.sha256); hashes++;
  }
  for (const file of native.sourceFiles) {
    assert.equal(hash(join(t.foundry.directory,"package",file.path)),file.sha256); hashes++;
  }
  assert.equal(read(t.foundry.pointer.path).packageDigest,t.foundry.digest);
  assert.equal(t.foundry.recipient.packageDigest,t.foundry.digest);
  assert.equal(t.native.oracle.reward,1); assert.equal(t.native.nop.reward,0);
  assert(!t.native.oracle.infrastructureError && !t.native.nop.infrastructureError);
  assert.equal(t.native.integrity.length,9); assert(t.native.integrity.every(c=>c.passed));
}
for (const prefix of m.validation.preservation.analysisPrefixes) {
  assert.equal(createHash("sha256").update(readFileSync(prefix.path).subarray(0,prefix.bytes)).digest("hex"),prefix.sha256,prefix.path+": historical prefix"); hashes++;
}
assert.equal(m.validation.mutations.results.filter(r=>r.mutation!=="reference").length,23);
assert(m.validation.mutations.results.every(r=>r.pass && r.protectedTraceCapture));
assert.equal(m.validation.assuranceChecks,88);
assert.equal(m.validation.checkerCandidates,73);
assert.equal(m.validation.nativeIntegrityControls,45);
assert.equal(m.validation.staticChecks,110);
assert.equal(m.providerCallsMade,0); assert.equal(m.historicalRewardsChanged,0);
assert(m.finalistStandings.unchanged && m.finalistStandings.successorAdditions===0);
const docs=[m.report,m.coverage,"docs/next-five-implementation.md",...m.validation.preservation.analysisPrefixes.map(r=>r.path)];
for (const path of docs) {
  const text=readFileSync(path,"utf8");
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target=match[1].split("#")[0];
    if (!target || /^[a-z]+:/.test(target)) continue;
    assert(existsSync(resolve(dirname(path),target)),path+" -> "+target); links++;
  }
}
console.log(JSON.stringify({tasks:5,hashesVerified:hashes,localLinksVerified:links,assurance:88,checkerCandidates:73,mutationsDetected:23,nativeIntegrity:45,providerCallsMade:0,pass:true}));
