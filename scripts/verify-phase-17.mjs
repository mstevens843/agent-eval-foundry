#!/usr/bin/env node
// Phase 17's dedicated reproducibility gate.
//
// Every structured artifact and the report regenerate from the preserved inputs, byte for byte. The
// challenge package is materialised twice and must hash identically both times: a package whose hash
// moves is a package whose trials no longer mean anything.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const run = (args) =>
  execFileSync("node", ["dist/cli.js", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const artifacts = [
  ["data/phase-17-phase16-probe-audit.json", ["phase17", "audit"]],
  ["data/phase-17-probe-v2-results.json", ["phase17", "probe"]],
  ["data/phase-17-package-controls.json", ["phase17", "controls"]],
  ["data/phase-17-trial-ledger.json", ["phase17", "ledger"]],
  ["reports/PHASE-17-CAA-VALIDATION.md", ["phase17", "report"]],
];

let failures = 0;
for (const [path, args] of artifacts) {
  const generated = run(args);
  if (generated !== readFileSync(path, "utf8")) {
    console.error(`STALE  ${path}`);
    failures += 1;
  } else console.log(`ok     ${path}`);
}

// Challenge reproducibility: the registered hash, recomputed twice from a fresh materialisation.
const controls = JSON.parse(run(["phase17", "controls"]));
const again = JSON.parse(run(["phase17", "controls"]));
const registered = JSON.parse(readFileSync("data/phase-17-trial-preregistration.json", "utf8")).frozenInputs
  .challengeSha256;
for (const [label, value] of [
  ["first materialisation", controls.challengeSha256],
  ["second materialisation", again.challengeSha256],
]) {
  if (value !== registered) {
    console.error(`STALE  challenge hash (${label}): ${value} != registered ${registered}`);
    failures += 1;
  } else console.log(`ok     challenge hash reproduces (${label})`);
}

// Every counted trial must still name the registered challenge and scenario set.
const ledger = JSON.parse(run(["phase17", "ledger"]));
for (const trial of ledger.trials) {
  if (!trial.challengeHashCurrent) {
    console.error(`STALE  ${trial.attemptId} carries challenge ${trial.challengeSha256}`);
    failures += 1;
  } else console.log(`ok     ${trial.attemptId} is bound to the registered challenge`);
}

console.log(
  `\n${artifacts.length + 2 + ledger.trials.length - failures} Phase 17 checks reproducible byte for byte`,
);
process.exit(failures === 0 ? 0 : 1);
