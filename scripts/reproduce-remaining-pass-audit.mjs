import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { gradeRemainingPassSupplement } from "./grade-remaining-pass-supplement.mjs";
import { validationMetadataCurrent } from "../data/remaining-pass-grading-controls/cache-metadata.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  local = join(root, ".local/remaining-pass-audit-2026-09-09");
const out = join(local, "runs", String(Date.now()));
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const save = (p, v) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, typeof v === "string" ? v : JSON.stringify(v, null, 2) + "\n");
};
const sha = (s) => createHash("sha256").update(s).digest("hex");
const frozen = join(root, ".local/round-two-top-five-2026-09-09/frozen-source/dist/index.js");
assert.equal(sha(readFileSync(frozen)), "60695de963e5085dfe8ee4fb09353b1db0169219d9ad9425ac2a997a73b69b26");
const api = await import(frozen);
const prep = read(
  join(root, "reports/screening/evidence/2026-09-09-round-three-failing-five-preparation.json"),
);
const source = (p, c, f) => Buffer.from(api.readSnapshotFile(p.snapshot, c, f)).toString();
const ids = [
  "variant-cache-repair",
  "snapshot-recovery-repair",
  "temporal-capacity-repair",
  "issued-report-repair",
];
const packages = new Map();
for (const id of ids) {
  const spec = prep.packages.find((p) => p.id === id),
    pkg = api.executionPackage(join(root, spec.foundry.export));
  const reference = join(out, id, "reference");
  for (const f of pkg.snapshot.record.components.reference.files)
    if (f.path.startsWith("private/reference/"))
      save(join(reference, f.path.slice(18)), source(pkg, "reference", f.path));
  save(join(out, id, "domain.mjs"), source(pkg, "verifier", "private/domain.mjs"));
  packages.set(id, { pkg, reference });
}
function execute(id, submission, scenario, name) {
  const { pkg } = packages.get(id);
  const files = [
    ...pkg.snapshot.record.components.collector.files,
    ...pkg.snapshot.record.components.verifier.files,
  ]
    .filter((f) => f.path.endsWith(".mjs") && !f.path.endsWith("bootstrap.mjs"))
    .map((f) => ({
      path: f.path.replace(/^(runtime|private)\//, ""),
      text: source(pkg, f.path.startsWith("runtime/") ? "collector" : "verifier", f.path),
    }));
  const raw = execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "none",
      "--read-only",
      "--tmpfs",
      "/tmp:rw,size=512m",
      "--tmpfs",
      "/work:rw,size=128m",
      "--shm-size",
      "256m",
      "--cpus",
      "2",
      "--memory",
      "2g",
      "--pids-limit",
      "256",
      "--cap-drop",
      "ALL",
      "--cap-add",
      "SETUID",
      "--cap-add",
      "SETGID",
      "--cap-add",
      "KILL",
      "--cap-add",
      "CHOWN",
      "--security-opt",
      "no-new-privileges",
      "--mount",
      `type=bind,src=${submission},dst=/submission,readonly`,
      "-i",
      pkg.image,
      "node",
      "--input-type=module",
      "-e",
      source(pkg, "collector", "runtime/bootstrap.mjs"),
    ],
    {
      input: JSON.stringify({ files, scenarios: [scenario] }),
      encoding: "utf8",
      timeout: 90000,
      maxBuffer: 24 * 1024 * 1024,
    },
  );
  const result = JSON.parse(raw);
  save(join(out, id, name + "-trace.json"), result);
  assert.equal(result.cells.length, 1);
  if (result.cells[0].status === "invalid") console.log(JSON.stringify(result));
  assert.notEqual(result.cells[0].status, "invalid");
  return result.cells[0];
}
function checker(id, submission, cases, name) {
  const dir = join(out, id, "checks", name);
  save(join(dir, "input.json"), { cases });
  const bootstrap = `import{readFileSync}from'node:fs';import{isDeepStrictEqual}from'node:util';const m=await import('/subject/checker.mjs');const x=JSON.parse(readFileSync('/cases/input.json'));const original=structuredClone(x);const first=JSON.parse(JSON.stringify(await m.run(x)));const second=JSON.parse(JSON.stringify(await m.run(x)));console.log(JSON.stringify({first,second,mutated:!isDeepStrictEqual(original,x)}));`;
  const raw = execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "none",
      "--read-only",
      "--tmpfs",
      "/tmp:rw,size=256m",
      "--cpus",
      "1",
      "--memory",
      "1g",
      "--pids-limit",
      "128",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--mount",
      `type=bind,src=${submission},dst=/subject,readonly`,
      "--mount",
      `type=bind,src=${dir},dst=/cases,readonly`,
      packages.get(id).pkg.image,
      "node",
      "--input-type=module",
      "-e",
      bootstrap,
    ],
    { encoding: "utf8", timeout: 60000, maxBuffer: 8 * 1024 * 1024 },
  );
  const result = JSON.parse(raw);
  assert.deepEqual(result.first, result.second);
  assert.equal(result.mutated, false);
  save(join(dir, "result.json"), result);
  return result.first.verdicts;
}
function record(id, trial) {
  if (trial >= 6 || (id === "snapshot-recovery-repair" && trial === 5))
    return join(
      root,
      `.local/final-six-2026-09-09/${id}/trial-${trial}/real-campaign-frozen/jobs/real-provider/records/${id}-attempt-1`,
    );
  const campaign =
    trial === 2
      ? id === "temporal-capacity-repair"
        ? "round-two-final-five"
        : id === "snapshot-recovery-repair"
          ? "round-two-third-ranked-five"
          : "round-two-top-five"
      : { 3: "round-three-failing-five", 4: "round-four-failing-five", 5: "round-five-continuing-four" }[
          trial
        ];
  return join(
    root,
    `.local/${campaign}-2026-09-09/real-campaign-frozen/jobs/real-provider/records/${id}-attempt-1`,
  );
}
const get = (id, path, now, tier = "edge-a", headers = {}) => ({ id, kind: "get", tier, path, headers, now });
const cacheScenario = (name, events) => ({
  id: name,
  seed: 0,
  events,
  limits: { maxOriginRequests: 20, maxOriginBytes: 20000 },
});
function snapScenario(name, state) {
  const bytes = Buffer.from(JSON.stringify(state)),
    digest = sha(bytes);
  return {
    id: name,
    tenant: "tenant",
    branch: "main",
    cutoff: 1,
    catalog: [{ id: "cp", tenant: "tenant", branch: "main", at: 1, lsn: 1, digest, size: bytes.length }],
    blobs: { [digest]: bytes.toString("base64") },
    cache: {},
    logs: [],
  };
}
const definitions = [
  {
    id: "snapshot-recovery-repair",
    name: "empty-no-commit",
    ok: true,
    scenario: snapScenario("empty-no-commit", { accounts: [], entries: [], nextId: 1 }),
    entry: `export const subject={async run(view,api){const cp=view.catalog[0];const response=await api.fetch({digest:cp.digest});const s=JSON.parse(Buffer.from(response.bytes,'base64'));await api.archive({bytes:Buffer.from(JSON.stringify({tenant:view.tenant,branch:view.branch,cutoff:view.cutoff,...s})).toString('base64')});return api.publish({});}};`,
  },
  {
    id: "variant-cache-repair",
    name: "stale-304-metadata",
    ok: false,
    scenario: cacheScenario("stale-304-metadata", [get("a", "/revalidate", 0), get("b", "/revalidate", 2)]),
    entry: `import{subject as reference}from'./reference-entry.mjs';export const subject={async run(view,api){let validation=false;return reference.run(view,new Proxy({...api},{get(t,k){if(k==='origin')return async r=>{const x=await t.origin(r);validation=x.status===304;return x};if(k==='write')return async r=>validation?{stored:true}:t.write(r);return t[k]}}));}};`,
  },
  {
    id: "variant-cache-repair",
    name: "fresh-plus-origin",
    ok: true,
    scenario: cacheScenario("fresh-plus-origin", [
      get("a", "/asset", 0, "edge-a", { "accept-language": "en" }),
      get("b", "/asset", 1, "edge-a", { "accept-language": "fr" }),
    ]),
    entry: `import{subject as reference}from'./reference-entry.mjs';export const subject={async run(view,api){let n=0;return reference.run(view,new Proxy({...api},{get(t,k){if(k==='next')return async r=>{const x=await t.next(r);if(x.event&&++n===2)await t.origin({});return x};return t[k]}}));}};`,
  },
  {
    id: "variant-cache-repair",
    name: "copy-other-path",
    ok: true,
    scenario: cacheScenario("copy-other-path", [get("a", "/asset", 0), get("b", "/revalidate", 1)]),
    entry: `import{subject as reference}from'./reference-entry.mjs';export const subject={async run(view,api){let n=0;return reference.run(view,new Proxy({...api},{get(t,k){if(k==='next')return async r=>{const x=await t.next(r);if(x.event&&++n===2){const {entries}=await t.read({tier:'edge-a'});await t.write({tier:'edge-b',entries});}return x};return t[k]}}));}};`,
  },
];
// Broader bounded validation for the two passes which survive the new controls.
const snapshotState = {
  accounts: [
    { id: 1, name: "001" },
    { id: 2, name: "Zoë, (account)" },
  ],
  entries: [
    { id: 7, account: 2, amount: 0 },
    { id: 2, account: 1, amount: -17 },
  ],
  nextId: 99,
};
const snapshotCases = [
  [
    "retry-rolled-back-transaction",
    true,
    `await api.begin({});await api.put({table:'entries',row:{id:150,account:199,amount:1}});const failed=await api.commit({});if(failed.ok)throw Error('expected foreign-key rollback');return reference.run(view,api);`,
  ],
  [
    "replace-staged-archive",
    true,
    `await api.archive({bytes:Buffer.from('{}').toString('base64')});return reference.run(view,api);`,
  ],
  [
    "reverse-archive-row-order",
    true,
    `return reference.run(view,{...api,archive:async r=>{const doc=JSON.parse(Buffer.from(r.bytes,'base64'));doc.accounts.reverse();doc.entries.reverse();return api.archive({bytes:Buffer.from(JSON.stringify(doc)).toString('base64')});}});`,
  ],
  [
    "wrong-allocation",
    false,
    `return reference.run(view,{...api,allocate:async()=>api.allocate({nextId:8})});`,
  ],
  ["no-publication", false, `return reference.run(view,{...api,publish:async()=>({ok:true})});`],
  [
    "missing-backup-row",
    false,
    `return reference.run(view,{...api,archive:async r=>{const doc=JSON.parse(Buffer.from(r.bytes,'base64'));doc.entries.pop();return api.archive({bytes:Buffer.from(JSON.stringify(doc)).toString('base64')});}});`,
  ],
];
for (const [name, ok, body] of snapshotCases)
  definitions.push({
    id: "snapshot-recovery-repair",
    name,
    ok,
    scenario: snapScenario(name, snapshotState),
    entry: `import{subject as reference}from'./reference-entry.mjs';export const subject={async run(view,api){${body}}};`,
  });
const temporalRows = [
  { series: "s", key: "a", revision: 1, knownAt: 0, from: -32, to: 64, value: "90071992547409931234567890" },
  { series: "s", key: "a", revision: 2, knownAt: 2, from: 0, to: 3, value: "0007" },
  { series: "s", key: "b", revision: 1, knownAt: 0, from: -1, to: 4, value: "11" },
  { series: "s", key: "b", revision: 2, knownAt: 3, from: -1, to: 4, value: null },
  { series: "other", key: "a", revision: 1, knownAt: 0, from: -32, to: 64, value: "42" },
];
const temporalQueries = [0, 2, 3].map((knownAt, i) => ({
  id: ["__proto__", "constructor", "q"][i],
  series: "s",
  knownAt,
  from: -32,
  to: 64,
}));
const temporalCases = [
  ["large-values-retractions", true, `return reference.run(view,api);`],
  ["restart-and-repeat-pagination", true, `api.fetch({cursor:null});return reference.run(view,api);`],
  [
    "record-before-second-traversal",
    true,
    `const r=reference.run(view,api);let cursor=null;do{cursor=api.fetch({cursor}).next;}while(cursor!==null);return r;`,
  ],
  [
    "wrong-exact-total",
    false,
    `return reference.run(view,{...api,record:r=>api.record({...r,total:String(BigInt(r.total)+1n)})});`,
  ],
  [
    "noncanonical-total",
    false,
    `return reference.run(view,{...api,record:r=>api.record({...r,total:'0'+r.total})});`,
  ],
  [
    "duplicate-report",
    false,
    `return reference.run(view,{...api,record:r=>{api.record(r);return api.record(r);}});`,
  ],
  [
    "missing-report",
    false,
    `let first=true;return reference.run(view,{...api,record:r=>{if(first){first=false;return {stored:true};}return api.record(r);}});`,
  ],
  ["skip-pagination-empty-input", false, `return {};`],
  ["complete-empty-input", true, `return reference.run(view,api);`],
];
for (const [name, ok, body] of temporalCases)
  definitions.push({
    id: "temporal-capacity-repair",
    name,
    ok,
    scenario: {
      id: name,
      rows: name.includes("empty-input") ? [] : temporalRows,
      queries: name.includes("empty-input") ? [] : temporalQueries,
      pageSize: 2,
    },
    entry: `import{subject as reference}from'./reference-entry.mjs';export const subject={run(view,api){${body}}};`,
  });

const hash = (p) => sha(readFileSync(p));
const pin = (p, v) => {
  if (existsSync(p)) assert.deepEqual(read(p), v, "Pinned artifact changed: " + p);
  else save(p, v);
};
function verifyManifest(id, trial) {
  const dir = record(id, trial),
    c = read(join(dir, "completion.json"));
  assert.equal(c.complete, true);
  let bytes = 0;
  for (const f of c.files) {
    const p = resolve(dir, f.path);
    assert(p.startsWith(dir + "/"));
    const data = readFileSync(p);
    assert.equal(data.length, f.size);
    assert.equal(sha(data), f.sha256);
    bytes += data.length;
  }
  return { id, trial, files: c.files.length, bytes, completionSha256: hash(join(dir, "completion.json")) };
}
const manifests = ids.flatMap((id) => [2, 3, 4, 5, 6, 7].map((trial) => verifyManifest(id, trial)));
const previousAudit = read(join(root, "reports/screening/evidence/2026-09-09-post-final-pass-audit.json"));
const previousCampaign = read(join(root, "reports/screening/evidence/2026-09-09-post-final-five.json"));
const priorHistories = new Map(
  previousAudit.classifications.map((c) => [
    c.id,
    { ...c, recordedHistory: [...c.recordedHistory], effectiveHistory: [...c.effectiveHistory] },
  ]),
);
for (const p of previousCampaign.packages)
  for (const a of p.attempts) {
    const h = priorHistories.get(p.id);
    h.recordedHistory[a.trial - 2] = a.recordedReward;
    h.effectiveHistory[a.trial - 2] = a.effectiveReward;
  }
const revision = "remaining-pass-coverage-v3",
  results = [],
  caseMap = new Map(ids.map((id) => [id, []])),
  expectedMap = new Map(ids.map((id) => [id, []]));
for (const d of definitions) {
  const { reference } = packages.get(d.id),
    stage = join(out, d.id, d.name);
  cpSync(reference, stage, { recursive: true });
  cpSync(join(stage, "entry.mjs"), join(stage, "reference-entry.mjs"));
  save(join(stage, "entry.mjs"), d.entry);
  const sourceRoot = join(root, "data/remaining-pass-grading-controls/sources", d.id, d.name);
  if (existsSync(join(sourceRoot, "entry.mjs")))
    assert.equal(readFileSync(join(sourceRoot, "entry.mjs"), "utf8"), d.entry);
  else save(join(sourceRoot, "entry.mjs"), d.entry);
  pin(join(sourceRoot, "scenario.json"), d.scenario);
  const baseline = execute(d.id, reference, d.scenario, d.name + "-baseline"),
    control = execute(d.id, stage, d.scenario, d.name + "-control");
  assert.equal(baseline.status, "semantic-pass");
  const correctedOk = (cell) =>
    cell.status === "semantic-pass" && (d.id !== "variant-cache-repair" || validationMetadataCurrent(cell));
  assert.equal(correctedOk(baseline), true);
  assert.equal(correctedOk(control), d.ok, d.name + " contract classification");
  const strip = ({ checks, status, failures, expected, truth, groundTruth, ...cell }) => cell;
  for (const [cell, ok, suffix] of [
    [baseline, true, "baseline"],
    [control, d.ok, "control"],
  ]) {
    const token = sha(`${revision}:${d.id}:${d.name}:${suffix}`).slice(0, 24);
    caseMap.get(d.id).push({ token, cells: [strip(cell)] });
    expectedMap.get(d.id).push({ token, ok, name: d.name + "-" + suffix });
  }
  const row = {
    id: d.id,
    name: d.name,
    expectedOk: d.ok,
    originalBaselineStatus: baseline.status,
    originalControlStatus: control.status,
    correctedServiceStatus: correctedOk(control) ? "semantic-pass" : "semantic-fail",
    originalControlFailures: control.failures,
    sourcePath: sourceRoot.slice(root.length + 1) + "/entry.mjs",
    sourceSha256: hash(join(sourceRoot, "entry.mjs")),
    scenarioPath: sourceRoot.slice(root.length + 1) + "/scenario.json",
    scenarioSha256: hash(join(sourceRoot, "scenario.json")),
    baselineTraceSha256: hash(join(out, d.id, d.name + "-baseline-trace.json")),
    controlTraceSha256: hash(join(out, d.id, d.name + "-control-trace.json")),
  };
  results.push(row);
  console.log(
    JSON.stringify({
      stage: "control",
      id: d.id,
      name: d.name,
      original: control.status,
      corrected: row.correctedServiceStatus,
    }),
  );
}
const controls = [];
for (const id of ids) {
  if (!caseMap.get(id).length) continue;
  const fixture = `data/remaining-pass-grading-controls/${id}.json`;
  pin(join(root, fixture), { cases: caseMap.get(id) });
  controls.push({ id, fixture, sha256: hash(join(root, fixture)), expected: expectedMap.get(id) });
}
const extendsPath = "data/post-final-grading-controls/policy.json",
  policyPath = "data/remaining-pass-grading-controls/policy.json";
pin(join(root, policyPath), {
  schemaVersion: 1,
  revision,
  image: packages.values().next().value.pkg.image,
  extends: { path: extendsPath, sha256: hash(join(root, extendsPath)) },
  combination:
    "effectiveReward = min(recordedReward, cumulativeSupplementPass ? 1 : 0); same coverage for all retained attempts, original records unchanged",
  controls,
});
const rows = [],
  oracles = [],
  services = [];
for (const id of ids) {
  const { reference } = packages.get(id);
  let originalOracle = null;
  if (id === "variant-cache-repair") {
    originalOracle = checker(id, reference, caseMap.get(id), "original-oracle");
    cpSync(join(reference, "checker.mjs"), join(reference, "original-checker.mjs"));
    cpSync(
      join(root, "data/remaining-pass-grading-controls/cache-metadata.mjs"),
      join(reference, "cache-metadata.mjs"),
    );
    save(
      join(reference, "checker.mjs"),
      `import{run as original}from'./original-checker.mjs';import{validationMetadataCurrent}from'./cache-metadata.mjs';export async function run(input){const result=await original(input);for(const c of input.cases)if(!c.cells.every(validationMetadataCurrent))result.verdicts[c.token]={ok:false};return result;}`,
    );
  }
  const oracle = gradeRemainingPassSupplement({
    id,
    submission: reference,
    output: join(out, id, "oracle-cumulative"),
  });
  assert.equal(oracle.pass, true, "Oracle classifications");
  oracles.push({
    id,
    pass: oracle.pass,
    correct: oracle.correct,
    total: oracle.total,
    originalOracle,
    checkerSha256: oracle.checkerSha256,
  });
  const h = priorHistories.get(id);
  for (const trial of [2, 3, 4, 5, 6, 7]) {
    const dir = record(id, trial),
      result = read(join(dir, "result.json")),
      grade = read(join(dir, "grade.json")),
      profile = read(join(dir, "profile.json"));
    assert.equal(grade.reward, h.recordedHistory[trial - 2]);
    assert.equal(result.packageDigest, prep.packages.find((p) => p.id === id).foundry.digest);
    const supplement = gradeRemainingPassSupplement({
      id,
      submission: join(dir, "submission"),
      output: join(out, id, `trial-${trial}`),
    });
    const row = {
      id,
      trial,
      provider: profile.target,
      packageDigest: result.packageDigest,
      recordedReward: grade.reward,
      previousEffectiveReward: h.effectiveHistory[trial - 2],
      effectiveReward: Math.min(grade.reward, supplement.pass ? 1 : 0),
      checkerSha256: supplement.checkerSha256,
      gradeSha256: hash(join(dir, "grade.json")),
      resultSha256: hash(join(dir, "result.json")),
      completionSha256: hash(join(dir, "completion.json")),
      publicContractSha256: hash(join(dir, "public/public/SEMANTICS.md")),
      instructionSha256: hash(join(dir, "public/public/instruction.md")),
      supplement: {
        pass: supplement.pass,
        correct: supplement.correct,
        total: supplement.total,
        deterministic: supplement.deterministic,
        exactTokens: supplement.exactTokens,
        details: supplement.details,
        observed: supplement.observed.first,
      },
    };
    assert(row.effectiveReward <= row.previousEffectiveReward);
    rows.push(row);
    console.log(
      JSON.stringify({
        stage: "regrade",
        id,
        trial,
        previous: row.previousEffectiveReward,
        current: row.effectiveReward,
      }),
    );
    if (row.previousEffectiveReward === 1)
      for (const d of definitions.filter((d) => d.id === id)) {
        const cell = execute(id, join(dir, "submission"), d.scenario, `trial-${trial}-${d.name}-service`);
        const pass =
          cell.status === "semantic-pass" &&
          (id !== "variant-cache-repair" || validationMetadataCurrent(cell));
        services.push({
          id,
          trial,
          scenario: d.name,
          status: cell.status,
          correctedStatus: pass ? "semantic-pass" : "semantic-fail",
          failures: cell.failures,
        });
      }
  }
}
for (const m of manifests) assert.deepEqual(verifyManifest(m.id, m.trial), m);
const correctedPasses = rows
  .filter((r) => r.previousEffectiveReward !== r.effectiveReward)
  .map(({ id, trial, provider, recordedReward, previousEffectiveReward, effectiveReward }) => ({
    id,
    trial,
    provider,
    recordedReward,
    previousEffectiveReward,
    effectiveReward,
  }));
const classifications = [...priorHistories.values()].map((h) => {
  const changed = rows.filter((r) => r.id === h.id),
    effectiveHistory = changed.length ? changed.map((r) => r.effectiveReward) : h.effectiveHistory;
  const failures = effectiveHistory.filter((x) => x === 0).length;
  assert.equal(effectiveHistory.length, 6);
  const attemptsByProvider = changed.length
    ? Object.fromEntries(["claude", "codex"].map((p) => [p, changed.filter((r) => r.provider === p).length]))
    : { claude: 3, codex: 3 };
  assert.deepEqual(attemptsByProvider, { claude: 3, codex: 3 });
  return {
    id: h.id,
    analysis: h.analysis,
    recordedHistory: h.recordedHistory,
    previousEffectiveHistory: h.effectiveHistory,
    effectiveHistory,
    failures,
    scored: 6,
    attemptsByProvider,
    classification: failures >= 5 ? "meets-5-of-6-complete" : "below-5-of-6",
  };
});
const evidence = {
  schemaVersion: 1,
  gradingRevision: revision,
  providerCallsMade: 0,
  previousEvidence: {
    path: "reports/screening/evidence/2026-09-09-post-final-five.json",
    sha256: hash(join(root, "reports/screening/evidence/2026-09-09-post-final-five.json")),
  },
  policy: { path: policyPath, sha256: hash(join(root, policyPath)) },
  runnerSha256: hash(join(root, "scripts/grade-remaining-pass-supplement.mjs")),
  reproductionSha256: hash(fileURLToPath(import.meta.url)),
  authorityPatch: {
    path: "data/remaining-pass-grading-controls/cache-metadata.mjs",
    sha256: hash(join(root, "data/remaining-pass-grading-controls/cache-metadata.mjs")),
  },
  frozenRuntimeSha256: hash(frozen),
  generated: results,
  oracles,
  rows,
  serviceChecks: services,
  correctedPasses,
  classifications,
  manifests: {
    recordsVerified: manifests.length,
    filesVerified: manifests.reduce((n, x) => n + x.files, 0),
    bytesVerified: manifests.reduce((n, x) => n + x.bytes, 0),
    verifiedBeforeAndAfter: true,
    errors: [],
  },
  successorTotals: {
    ...previousAudit.successorTotals,
    attempts: previousAudit.successorTotals.attempts + previousCampaign.providerCallsMade,
    scored: previousAudit.successorTotals.scored + previousCampaign.providerCallsMade,
    recordedZeroRewards:
      previousAudit.successorTotals.recordedZeroRewards +
      previousCampaign.packages.flatMap((p) => p.attempts).filter((a) => a.recordedReward === 0).length,
    recordedPasses:
      previousAudit.successorTotals.recordedPasses +
      previousCampaign.packages.flatMap((p) => p.attempts).filter((a) => a.recordedReward === 1).length,
    effectiveFailures:
      previousAudit.successorTotals.effectiveFailures +
      previousCampaign.packages.flatMap((p) => p.attempts).filter((a) => a.effectiveReward === 0).length +
      correctedPasses.length,
    effectivePasses:
      previousAudit.successorTotals.effectivePasses +
      previousCampaign.packages.flatMap((p) => p.attempts).filter((a) => a.effectiveReward === 1).length -
      correctedPasses.length,
  },
};
save(join(out, "evidence.json"), evidence);
save(join(local, "LATEST.json"), { out, evidence: join(out, "evidence.json") });
console.log(JSON.stringify({ complete: true, out, correctedPasses, classifications }));
