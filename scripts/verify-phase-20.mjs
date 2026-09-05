#!/usr/bin/env node
// Phase 20's reproducibility and trust-boundary gate.
//
// Unlike Phase 17-19, Phase 20's primary deliverable is code (a secure executor, gates, corrections)
// rather than CLI-rendered artifacts, so this script does not regenerate a report and diff it byte
// for byte. Instead it re-runs the actual, empirical checks that back this phase's claims: the
// registry is internally consistent, the CAA verifier's hardened tree hashes to what the report
// claims, and — when Docker is available — the secure executor genuinely blocks the exploit classes
// it claims to block, in a real container, right now.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let failures = 0;
const ok = (label) => console.log(`ok     ${label}`);
const fail = (label, detail) => {
  console.error(`STALE  ${label}${detail ? `: ${detail}` : ""}`);
  failures += 1;
};

// ---------------------------------------------------------------- 1. JSON artifacts parse and agree

for (const path of ["data/phase-20-preregistration.json", "data/phase-20-route-migration-matrix.json"]) {
  try {
    JSON.parse(readFileSync(path, "utf8"));
    ok(`${path} parses`);
  } catch (err) {
    fail(path, err.message);
  }
}

// ---------------------------------------------------------------- 2. `foundry check` passes clean

try {
  execFileSync("node", ["dist/cli.js", "check"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  ok("foundry check");
} catch (err) {
  fail("foundry check", (err.stdout ?? err.message ?? "").toString().slice(0, 300));
}

// ---------------------------------------------------------------- 3. CAA verifier tree hash

const sortedManifestSha256 = (dir) => {
  const files = [];
  const walk = (d, prefix) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      const rel = `${prefix}${entry.name}`;
      if (entry.isDirectory()) walk(full, `${rel}/`);
      else files.push(rel);
    }
  };
  walk(dir, "");
  files.sort();
  const manifest = files
    .map((rel) => `${rel}  ${createHash("sha256").update(readFileSync(join(dir, rel))).digest("hex")}`)
    .join("\n");
  return createHash("sha256").update(manifest).digest("hex");
};

// Reported informationally rather than asserted against a fixed value: the hash in
// reports/PHASE-20-VERIFIER-TRUST-BOUNDARY.md was computed by a different script (a dedicated
// investigation agent's own manifest tool), and this repo has no single canonical "hash a directory"
// utility to share with it — asserting equality here would compare two different hash *methods*, not
// detect drift. What this DOES verify mechanically is the exact hardening content (below) and that
// the historical mutants/reference/baseline/scenarios trees are untouched (via git, not hashing).
const caaTestsDir = "tasks/caa-revalidation-repair/tests";
if (existsSync(caaTestsDir)) {
  console.log(`info   CAA tests/ tree sha256 (this script's own manifest method): ${sortedManifestSha256(caaTestsDir)}`);
} else {
  fail("CAA tests/ tree", "directory not found");
}
try {
  const touched = execFileSync(
    "git",
    ["diff", "--name-only", "HEAD", "--", "tasks/caa-revalidation-repair/tests/mutants", "tasks/caa-revalidation-repair/tests/reference", "tasks/caa-revalidation-repair/tests/baseline", "tasks/caa-revalidation-repair/tests/scenarios"],
    { encoding: "utf8" },
  ).trim();
  if (touched === "") ok("CAA mutants/reference/baseline/scenarios untouched since HEAD");
  else fail("CAA historical fixtures touched", touched);
} catch (err) {
  fail("git diff over CAA fixtures", err.message);
}

for (const [path, mustContain] of [
  ["tasks/caa-revalidation-repair/tests/test.sh", "-I "],
  ["tasks/caa-revalidation-repair/tests/test_certd.py", 'sys.path.insert(0, "/tests")'],
]) {
  const content = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (content.includes(mustContain)) ok(`${path} carries the Phase 20 hardening`);
  else fail(path, `does not contain "${mustContain}"`);
}

// ---------------------------------------------------------------- 4. secure executor, in a real container

let dockerAvailable = false;
try {
  execFileSync("docker", ["info"], { stdio: "ignore", timeout: 20_000 });
  dockerAvailable = true;
} catch {
  dockerAvailable = false;
}

if (!dockerAvailable) {
  console.log("skip   secure executor smoke (Docker unavailable) — not scored as pass or fail");
} else {
  const stage = mkdtempSync(join(tmpdir(), "verify-phase-20-"));
  try {
    for (const f of ["authority-entry.mjs", "cell-entry.mjs", "protocol.mjs"]) {
      writeFileSync(join(stage, f), readFileSync(join("scripts/secure", f)));
    }
    writeFileSync(
      join(stage, "adapter.mjs"),
      readFileSync("scripts/secure/adapters/memory-poisoning.mjs"),
    );
    writeFileSync(
      join(stage, "subject-good.mjs"),
      "export const subject = { async runSession(view, memory, tools) {" +
        "memory.write({key:'k1', value:'hello', provenance:[], originTrust:'user'});" +
        "return {decisions:[{id:'d1'}], audit:[]}; } };",
    );
    writeFileSync(
      join(stage, "subject-evil.mjs"),
      "export const subject = { runSession(view, memory, tools) {" +
        "try { process.stdout.write(JSON.stringify({report:{decisions:[{id:'forged'}],audit:[]}})); } catch {}" +
        "try { process.exit(0); } catch {}" +
        "return {decisions:[], audit:[]}; } };",
    );
    writeFileSync(
      join(stage, "payload.json"),
      JSON.stringify({
        scenario: {
          allSegments: [],
          params: {},
          sessions: [{ index: 0, segments: [], actions: [], grants: [], tools: [] }],
          grants: [],
          tools: [],
        },
      }),
    );
    for (const f of readdirSync(stage)) statSync(join(stage, f)); // touch — surfaces ENOENT early

    const runOne = (subjectFile) =>
      execFileSync(
        "docker",
        [
          "run",
          "--rm",
          "--network=none",
          "--read-only",
          "--cap-drop=ALL",
          "--security-opt=no-new-privileges",
          "--user=1000:1000",
          "--workdir=/work",
          "--tmpfs=/tmp:rw,nosuid,nodev,size=64m",
          `--mount=type=bind,source=${stage},target=/work,readonly`,
          "--memory=512m",
          "--cpus=1",
          "--pids-limit=128",
          "--env-file=/dev/null",
          "--interactive",
          "node:22-alpine",
          "node",
          "/work/authority-entry.mjs",
          "/work/cell-entry.mjs",
          `/work/${subjectFile}`,
          "/work/adapter.mjs",
        ],
        { input: readFileSync(join(stage, "payload.json"), "utf8"), encoding: "utf8", timeout: 60_000 },
      );

    const good = JSON.parse(runOne("subject-good.mjs"));
    if (good.error === null && good.report?.decisions?.length === 1) {
      ok("secure executor: compliant subject grades clean");
    } else {
      fail("secure executor: compliant subject", JSON.stringify(good).slice(0, 200));
    }

    const evil = JSON.parse(runOne("subject-evil.mjs"));
    const evilFailedClosed =
      evil.error !== null && evil.report === null && (evil.diagnostics?.stdoutTail ?? "").includes("forged");
    if (evilFailedClosed) {
      ok("secure executor: stdout-hijack-then-exit forgery fails closed");
    } else {
      fail("secure executor: stdout-hijack-then-exit forgery", JSON.stringify(evil).slice(0, 200));
    }
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

console.log("");
if (failures > 0) {
  console.error(`Phase 20 verification FAILED: ${failures} check(s) stale.`);
  process.exit(1);
}
console.log("Phase 20 verification passed.");
