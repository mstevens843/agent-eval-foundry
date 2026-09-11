// Consolidate completed hardening evidence. This script does not execute submissions.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = ".local/next-five-hardening-2026-09-10";
const ids = ["route-policy-repair", "browser-replay-repair", "recurring-calendar-repair", "workflow-authority-repair", "delegated-budget-repair"];
const releases = ["release-four", "release-browser", "release-calendar-shapes", "release-four", "release-four"];
const authors = ["author-four", "author-browser-approved", "author-calendar-shapes", "author-rest-2", "author-corrections"];
const json = p => JSON.parse(readFileSync(p, "utf8"));
const hash = p => createHash("sha256").update(readFileSync(p)).digest("hex");
const ref = p => ({ path: p, sha256: hash(p), bytes: statSync(p).size });
const integrity = json(join(root, "native-integrity-final/summary.json"));
assert.equal(integrity.results.length, 5);
integrity.results = integrity.results.map(r => r.id === "recurring-calendar-repair"
  ? json(join(root,"native-integrity-calendar-shapes/summary.json")).results[0] : r);
const integrityRoot = id => id === "recurring-calendar-repair" ? "native-integrity-calendar-shapes" : "native-integrity-final";
function nativeJob(agent, id) {
  const parent = join(root, "jobs", id === "recurring-calendar-repair" ? `hardened-calendar-shapes-${agent}` : `hardened-five-final-${agent}`);
  const folder = readdirSync(parent).find(n => n.startsWith(id + "__"));
  assert(folder, `${agent}: ${id}`);
  const directory = join(parent, folder);
  const result = json(join(directory, "result.json"));
  const summary = json(join(directory, "verifier/summary.json"));
  assert(!result.exception_info && !summary.infrastructureError);
  assert.equal(summary.reward, agent === "oracle" ? 1 : 0);
  return { reward: summary.reward, service: summary.service, checker: summary.checker, infrastructureError: false, reason: summary.error ?? null, result: ref(join(directory, "result.json")), summary: ref(join(directory, "verifier/summary.json")) };
}
const tasks = ids.map((id, i) => {
  const base = join(root, releases[i], id);
  const assurance = json(join(base, "validation/assurance.json"));
  const checker = json(join(base, "oracle-checker/grade-summary.json"));
  assert(assurance.results.every(r => r.status === "pass"));
  assert(checker.pass && checker.correct === checker.total);
  const pointer = json(join(base, "export/package.json"));
  const recipientPath = join(root, releases[i], "recipient/result.json");
  const recipient = json(recipientPath).packages.find(r => r.packageId === id);
  assert.equal(recipient.packageDigest, pointer.packageDigest);
  const releaseSummary = json(join(root, releases[i], "summary.json"));
  assert(releaseSummary.recipientReproduction && releaseSummary.results.find(r => r.id === id).releaseExport);
  const native = join(root, "harbor-frozen-v2", id);
  const manifest = json(join(native, "export-manifest.json"));
  const reproduction = json(join(root, "harbor-reproduction-v2", id, "export-manifest.json"));
  assert.equal(manifest.digest, reproduction.digest);
  for (const f of manifest.exportFiles) assert.equal(hash(join(native, f.path)), f.sha256);
  for (const f of manifest.sourceFiles) {
    assert.equal(hash(join("tasks", id, f.path)), f.sha256, `${id}: source ${f.path}`);
    assert.equal(hash(join(base, "export/package", f.path)), f.sha256, `${id}: Foundry ${f.path}`);
  }
  const nativeIntegrity = integrity.results.find(r => r.id === id);
  assert.equal(nativeIntegrity.digest, manifest.digest);
  assert.equal(nativeIntegrity.checkerTotal, checker.total);
  assert.equal(nativeIntegrity.integrity.length, 9);
  assert(nativeIntegrity.integrity.every(r => r.passed));
  const count = kind => {
    const rows = assurance.results.find(r => r.id === kind).detail.statuses;
    return { total: rows.length, passes: rows.filter(r => r.status === "semantic-pass").length, failures: rows.filter(r => r.status === "semantic-fail").length, infrastructureErrors: rows.filter(r => r.error || !r.status.startsWith("semantic-")).length };
  };
  const controls = json(`tasks/${id}/private/control-manifest.json`);
  const baselineControls = json(join(root, "baseline/tasks", id, "private/control-manifest.json"));
  const addedControls = controls.filter(c => !baselineControls.some(b => b.id === c.id));
  // The first grouped author run completed Route before a Calendar development
  // error interrupted the group. Its complete per-candidate rows remain in the log.
  const authorSummary = join(root, authors[i], "summary.json");
  const authorRows = existsSync(authorSummary) ? json(authorSummary).results : readFileSync(join(root, authors[i]+".log"),"utf8").split("\n").filter(line=>line.startsWith("{")).map(line=>JSON.parse(line));
  const local = authorRows.filter(r => r.id === id && r.candidate);
  assert(local.every(r => r.passed));
  assert.equal(json(`tasks/${id}/private/checker-required.json`).scenarioCoverage, "all");
  return {
    id, version: json(`tasks/${id}/public/package.json`).version,
    reference: count("reference"), alternative: count("alternative"), starter: count("starter"),
    positiveVariants: assurance.results.filter(r => r.id.startsWith("variant-")).map(r => ({ id: r.id, ...count(r.id) })),
    assuranceChecks: assurance.results.length,
    checker: { correct: checker.correct, total: checker.total, reasonPolicy: checker.reasonPolicy, scenarioCoverage: "all" },
    addedControls: addedControls.map(({id, check}) => ({id, check})),
    localControlResults: local.map(({candidate,scenarios,maxFrame,maxCalls,passed}) => ({candidate,scenarios,maxPayloadBytes:maxFrame,maxCalls,pass:passed})),
    sourceFiles: manifest.sourceFiles.map(f => ({path:join("tasks",id,f.path),sha256:f.sha256})),
    foundry: { directory: join(base,"export"), digest: pointer.packageDigest, pointer: ref(join(base,"export/package.json")), assurance: ref(join(base,"validation/assurance.json")), checkerEvidence: ref(join(base,"oracle-checker/grade-summary.json")), recipientEvidence: ref(recipientPath), recipient, reproducible: true },
    native: { directory: native, digest: manifest.digest, manifest: ref(join(native,"export-manifest.json")), reproduction: ref(join(root,"harbor-reproduction-v2",id,"export-manifest.json")), reproducible: true, oracle: nativeJob("oracle",id), nop: nativeJob("nop",id), integrity: nativeIntegrity.integrity.map(({name,passed})=>({name,passed})) },
  };
});
const mutations = json(join(root,"mutations-frozen/summary.json"));
assert.equal(mutations.results.filter(r=>r.mutation!=="reference").length,23);
assert(mutations.results.every(r=>r.pass && r.protectedTraceCapture));
const statics = json(join(root,"static-frozen/summary.json"));
assert.equal(statics.results.length,110); assert(statics.results.every(r=>r.passed));
const regressions = json(join(root,"regressions-final.json"));
assert(regressions.success && regressions.numFailedTests===0);
const preserved = json(join(root,"preservation.json")); assert(preserved.pass);
const ingress = json(join(root,"browser-ingress.json")); assert(ingress.pass);
const result = {
  schemaVersion: 1, date: "2026-09-10", purpose: "Pretrial hardening of five 3.0.0 successors against their existing public contracts",
  report: "reports/screening/next-five-hardening-2026-09-10.md",
  coverage: "reports/screening/next-five-hardening-coverage-2026-09-10.md",
  providerCallsMade: 0, modelTrialsLaunched: 0, historicalRewardsChanged: 0,
  finalistStandings: { unchanged: true, count: 5, successorAdditions: 0 },
  tasks,
  validation: {
    assuranceChecks: tasks.reduce((n,t)=>n+t.assuranceChecks,0),
    checkerCandidates: tasks.reduce((n,t)=>n+t.checker.total,0),
    addedNegativeControls: tasks.reduce((n,t)=>n+t.addedControls.length,0),
    oraclePasses: 5, nopZeroes: 5, nativeIntegrityControls: 45, staticChecks: 110,
    regressionTests: regressions.numPassedTests,
    mutations: { total: 23, detected: 23, referencesPassed: 5, checkerExecution: "local replay of protected Docker captures", evidence: ref(join(root,"mutations-frozen/summary.json")), captures: ids.map(id=>ref(join(root,integrityRoot(id),id,"logs/checker-cases.json"))), results: mutations.results.map(r=>({...r,caseSource:relative(process.cwd(),r.caseSource)})) },
    staticEvidence: ref(join(root,"static-frozen/summary.json")),
    integrityEvidence: [ref(join(root,"native-integrity-final/summary.json")),ref(join(root,"native-integrity-calendar-shapes/summary.json"))],
    regressionEvidence: ref(join(root,"regressions-final.json")),
    browserIngress: { ...ingress, evidence: ref(join(root,"browser-ingress.json")) },
    preservation: { ...preserved, evidence: ref(join(root,"preservation.json")), analysisPrefixes: json(join(root,"analysis-prefixes.json")) },
  },
  implementationFiles: ["src/packages/portfolio.ts","tasks/portfolio-runtime/harbor-grade.mjs","scripts/build-harbor-portfolio.mjs","scripts/audit-next-five-checkers.mjs","scripts/audit-browser-ingress.mjs","scripts/verify-harbor-integrity.mjs"].map(ref),
  developmentCorrections: [
    { evidence: ref(join(root,"calendar-shape-before.json")), explanation: "Final contract audit reproduced an unknown source-record kind being stored instead of returning a recoverable shape error. Added structural validation matching the documented types and a correct recovery variant that requires the documented error. Revalidated Calendar exports; the other four package digests are unchanged." },
    { evidence: ref(join(root,"mutations/summary.json")), explanation: "Initial audit left two mutations undetected. Added an isolated owner mismatch and a valid Calendar malformed-request recovery trace; all 23 are now detected." },
    { evidence: ref(join(root,"native-integrity/route-policy-repair/logs/summary.json")), explanation: "Detached-child probe spawned during the first of two checker calls. Its marker could be written during a legitimate live invocation. Corrected the probe to confirm child startup only after the second call, then test post-exit cleanup." },
  ],
  limitations: ["Finite controls are not a proof against every possible implementation or attack.","No model hardness result or paid cheat qualification is claimed by these engineering checks.","Human-authored submission material and benchmark qualification remain separate from exploratory trial readiness."],
};
const output="reports/screening/evidence/2026-09-10-next-five-hardening.json";
writeFileSync(output,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({path:output,tasks:tasks.length,assurance:result.validation.assuranceChecks,candidates:result.validation.checkerCandidates,controlsAdded:result.validation.addedNegativeControls,mutations:23,integrity:45,statics:110,regressions:result.validation.regressionTests}));
