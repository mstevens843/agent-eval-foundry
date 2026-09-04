#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const run = (args) =>
  execFileSync("node", ["dist/cli.js", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

const artifacts = [
  ["data/phase-16-contract-calibration.json", ["phase16", "calibration"]],
  ["data/phase-16-source-results.json", ["phase16", "sources"]],
  ["data/phase-16-candidate-contracts.json", ["phase16", "contracts"]],
  ["data/phase-16-contract-gate-results.json", ["phase16", "gate"]],
  ["data/phase-16-traceability.json", ["phase16", "traceability"]],
  ["data/phase-16-candidate-queue.json", ["phase16", "queue"]],
  ["data/phase-16-reader-packets.json", ["phase16", "packets"]],
  ["data/phase-16-reader-reviews.json", ["phase16", "reviews"]],
  ["data/phase-16-probe-results.json", ["phase16", "probes"]],
  ["data/phase-16-method-comparison.json", ["phase16", "comparison"]],
  ["data/phase-16-input-hashes.json", ["phase16", "hashes"]],
  ["data/phase-16-corrections.json", ["phase16", "corrections"]],
  ["data/phase-16-reader-preflight.json", ["phase16", "preflight"]],
  ["data/phase-16-reader-reviews-final.json", ["phase16", "final-reviews"]],
  ["data/phase-16-probe-results-final.json", ["phase16", "final-probes"]],
  ["data/phase-16-method-comparison-final.json", ["phase16", "final-comparison"]],
  ["data/phase-16-continuation-status.json", ["phase16", "continuation"]],
  ["reports/PHASE-16-DISCOVERY-V3.md", ["phase16", "report"]],
];

let failures = 0;
for (const [path, args] of artifacts) {
  const generated = run(args);
  const committed = readFileSync(path, "utf8");
  if (generated !== committed) {
    console.error(`STALE  ${path}`);
    failures += 1;
  } else {
    console.log(`ok     ${path}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} Phase 16 artifact(s) differ`);
  process.exit(1);
}

console.log(`\n${artifacts.length} Phase 16 artifacts reproducible byte for byte`);
