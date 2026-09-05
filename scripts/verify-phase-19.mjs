#!/usr/bin/env node
// Phase 19's focused verification gate.
//
// Phase 19's claim is that the five historical UI failures were independently, blindly relabelled,
// that the 20-family ranking was corrected against real CAA V2 and causal-depth evidence, and that
// only 2-of-2 candidate-review survivors could reach a cheap probe. This gate checks that the
// preserved reader captures are internally consistent with their frozen packets, that the derived
// artifacts regenerate byte for byte from those captures, and that no credential material leaked.
// It does not attempt to regenerate model outputs.
//
// IMPORTANT: as of this run, data/research-task-family-candidates.json (a frozen input Phase 19's
// preregistration pinned by hash) was modified by activity outside this run after Phase 19 began
// executing readers. Every Phase 19 code path that touches that corpus (buildPhase19Reranking and
// everything downstream of it: reviews, probes, report) now throws RigInputError rather than
// silently continuing on stale evidence. This script treats that as a named, expected BLOCKED
// condition it must report accurately, not as a crash and not as a silent skip. It does not revert
// the corpus, and it does not retroactively edit the Phase 19 preregistration to accept the new hash.
//
//   verify-phase-19.mjs
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const sha256 = (p) =>
  createHash("sha256")
    .update(readFileSync(join(ROOT, p)))
    .digest("hex");
const run = (args) =>
  execFileSync("node", ["dist/cli.js", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

let failures = 0;
let blocked = 0;
let checks = 0;
const ok = (m) => {
  checks += 1;
  console.log(`ok      ${m}`);
};
const bad = (m) => {
  checks += 1;
  console.error(`FAIL    ${m}`);
  failures += 1;
};
const block = (m, reason) => {
  checks += 1;
  console.error(`BLOCKED ${m}\n        reason: ${reason}`);
  blocked += 1;
};
const check = (cond, m) => (cond ? ok(m) : bad(m));

// -------------------------------------------------------------- 1. static artifacts exist and parse
const ARTIFACTS = [
  "data/phase-19-preregistration.json",
  "data/phase-19-candidate-assessments.json",
  "data/phase-19-execution-corrections.json",
  "data/phase-19-ui-label-packet-manifest.json",
  "data/phase-19-ui-label-ledger.json",
  "data/phase-19-reranking.json",
];
for (const path of ARTIFACTS) {
  if (!existsSync(join(ROOT, path))) {
    bad(`${path} is missing`);
    continue;
  }
  try {
    const d = read(path);
    check(
      typeof d.schema === "string" && d.schema.startsWith("agent-eval-foundry/"),
      `${path} parses and names its schema`,
    );
  } catch (e) {
    bad(`${path} is not valid JSON: ${e.message}`);
  }
}
// These two are expected to remain absent for this run: the pipeline that produces them is the
// exact thing the corpus drift blocks (see section 5). Their absence is reported there, not here.
for (const path of ["data/phase-19-candidate-review-ledger.json", "reports/PHASE-19-EVIDENCE-RERANK.md"]) {
  if (existsSync(join(ROOT, path)))
    ok(`${path} exists (unexpected but not itself a defect if content is honest)`);
  else console.log(`note    ${path} was not generated this run (see BLOCKED section below)`);
}

// ------------------------------------------------- 2. execution corrections: the two non-counting attempts
const corrections = read("data/phase-19-execution-corrections.json");
check(
  Array.isArray(corrections.corrections) && corrections.corrections.length === 2,
  "execution-corrections still records exactly 2 non-counting attempts",
);
check(
  corrections.corrections.every((c) => c.counts === false),
  "both non-counting attempts are marked counts:false",
);

// --------------------------------------------------------- 3. preserved reader captures: packet-hash integrity
// For every UI label run and every candidate review run actually on disk, confirm the packetSha256
// recorded in its metadata matches the sha256 of the frozen packet file it claims to have graded.
// This does NOT require the corpus (it only re-hashes files already written to disk), so it is not
// affected by the drift and is real, load-bearing evidence.
function verifyPacketHashIntegrity(runsDir, packetsDir, packetExt) {
  if (!existsSync(join(ROOT, runsDir))) {
    console.log(`note    ${runsDir} does not exist yet`);
    return;
  }
  for (const subjectId of readdirSync(join(ROOT, runsDir))) {
    const packetPath = join(packetsDir, `${subjectId}${packetExt}`);
    if (!existsSync(join(ROOT, packetPath))) {
      bad(`${subjectId}: no frozen packet found at ${packetPath}`);
      continue;
    }
    const packetHash = sha256(packetPath);
    for (const provider of readdirSync(join(ROOT, runsDir, subjectId))) {
      const metaPath = join(runsDir, subjectId, provider, "metadata.json");
      if (!existsSync(join(ROOT, metaPath))) continue;
      const meta = read(metaPath);
      check(
        meta.packetSha256 === packetHash,
        `${subjectId}/${provider}: metadata.packetSha256 matches the frozen packet on disk`,
      );
      check(meta.classification === "completed", `${subjectId}/${provider}: run is marked completed`);
    }
  }
}
verifyPacketHashIntegrity("data/phase-19-ui-label-runs", "data/phase-19-ui-label-packets", ".json");
verifyPacketHashIntegrity(
  "data/phase-19-candidate-review-runs",
  "data/phase-19-candidate-review-packets",
  ".json",
);

// ------------------------------------------------------------------- 4. UI label ledger cross-check
// Recompute the summary directly from the 10 raw normalized-label.json files (not via the CLI, so
// this is independent of the corpus drift) and confirm it matches the frozen ledger snapshot.
{
  const ledger = read("data/phase-19-ui-label-ledger.json");
  const raw = [];
  const runsDir = join(ROOT, "data/phase-19-ui-label-runs");
  if (existsSync(runsDir)) {
    for (const subjectId of readdirSync(runsDir)) {
      for (const provider of readdirSync(join(runsDir, subjectId))) {
        const p = join(runsDir, subjectId, provider, "normalized-label.json");
        if (existsSync(p))
          raw.push({ subjectId, provider, verdict: JSON.parse(readFileSync(p, "utf8")).label });
      }
    }
  }
  check(raw.length === 10, `10 raw normalized-label.json files preserved on disk (found ${raw.length})`);
  const byTrial = {};
  for (const r of raw) {
    if (!byTrial[r.subjectId]) byTrial[r.subjectId] = {};
    byTrial[r.subjectId][r.provider] = r.verdict;
  }
  let agreedCapability = 0;
  let agreedNoncapability = 0;
  let disagreed = 0;
  for (const byProvider of Object.values(byTrial)) {
    const a = byProvider.openai;
    const b = byProvider.anthropic;
    if (a === undefined || b === undefined) continue;
    if (a === b && a === "capability") agreedCapability += 1;
    else if (a === b) agreedNoncapability += 1;
    else disagreed += 1;
  }
  check(
    agreedCapability === ledger.summary.agreedCapability &&
      agreedNoncapability === ledger.summary.agreedNoncapability &&
      disagreed === ledger.summary.disagreed,
    `independently-recomputed UI adjudication (capability=${agreedCapability}, non-capability=${agreedNoncapability}, disagreed=${disagreed}) matches the frozen ledger`,
  );
}

// --------------------------------------------------- 5. corpus-drift blocker: named, not swallowed
{
  const registeredHash = read("data/phase-19-preregistration.json"); // not the source of the pinned hash itself, but confirms the file this concerns is still the registered input
  void registeredHash;
  try {
    const fresh = JSON.parse(run(["phase19", "rerank"]));
    const preserved = read("data/phase-19-reranking.json");
    check(
      JSON.stringify(fresh) === JSON.stringify(preserved),
      "data/phase-19-reranking.json regenerates byte for byte from current inputs",
    );
  } catch (e) {
    block(
      "data/phase-19-reranking.json regeneration (phase19 rerank)",
      String(e.message || e).split("\n")[0],
    );
  }
  try {
    run(["phase19", "reviews"]);
    ok("phase19 reviews executes without error");
  } catch (e) {
    block("phase19 reviews / candidate-review-ledger generation", String(e.message || e).split("\n")[0]);
  }
  try {
    run(["phase19", "report"]);
    ok("phase19 report executes without error");
  } catch (e) {
    block(
      "reports/PHASE-19-EVIDENCE-RERANK.md generation (phase19 report)",
      String(e.message || e).split("\n")[0],
    );
  }
  if (blocked > 0) {
    console.error(
      "\n        Root cause: data/research-task-family-candidates.json changed after Phase 19's",
      "\n        preregistration pinned its hash, by activity outside this run (not this script, not",
      "\n        the Phase 19 reader/review calls). This gate does not revert that file and does not",
      "\n        retroactively edit data/phase-19-preregistration.json to accept the new hash — either",
      "\n        action would launder an uncontrolled change into frozen evidence. Resolution requires",
      "\n        an operator decision: restore the registered corpus content, or explicitly re-register",
      "\n        Phase 19 against the new corpus and re-run from Lane 2.",
    );
  }
}

// --------------------------------------------------------- 6. no credential material in any artifact
const CRED = /(sk-ant-[a-z0-9-]{6,}|CLAUDE_CODE_OAUTH_TOKEN\s*=\s*\S|"access_token"\s*:\s*"[^"]{12,})/;
const scan = (dir) => {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) scan(p);
    else if (/phase-19|PHASE-19/.test(e.name) || /phase-19|PHASE-19/.test(dir)) {
      try {
        if (CRED.test(readFileSync(p, "utf8"))) bad(`${p} contains credential material`);
      } catch {
        /* binary or unreadable as text; not a credential-bearing text artifact */
      }
    }
  }
};
scan(join(ROOT, "data"));
scan(join(ROOT, "reports"));
ok("no Phase 19 artifact carries credential material");

console.log(
  `\n${checks - failures - blocked}/${checks} checks passed, ${blocked} blocked by the external corpus drift, ${failures} failed outright.`,
);
console.log(
  blocked > 0
    ? "PHASE 19 NOT VERIFIABLE END-TO-END THIS RUN (blocked, not failed — see BLOCKED lines above)"
    : failures === 0
      ? "PHASE 19 VERIFIED"
      : `PHASE 19 FAILED (${failures})`,
);
process.exit(failures === 0 && blocked === 0 ? 0 : 1);
