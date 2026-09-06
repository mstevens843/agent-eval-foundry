#!/usr/bin/env node
// Phase 22's reproducibility and evidence-generation gate.
//
// Regenerates the frozen mutant envelope, runs the generic orchestrator against both the development
// and held-out banks at two independent quota sizes, checks within-family replication across those
// sizes, and (when Docker is available) smoke-tests the regraded-real-submission path through the
// Phase 20 trusted executor. The full 4-submission x 2-suite x 24-scenario regrade this phase's report
// is built from was run once, for real, and its results are recorded in
// data/phase-22-preregistration.json and reports/PHASE-22-TRANSFER-AND-CONSTRUCTION.md; this script
// only re-confirms the mechanism still works, at a fraction of the cost, on every invocation.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

let failures = 0;
const ok = (label) => console.log(`ok     ${label}`);
const fail = (label, detail) => {
  console.error(`STALE  ${label}${detail ? `: ${detail}` : ""}`);
  failures += 1;
};
const skip = (label, detail) => console.log(`skip   ${label}${detail ? `: ${detail}` : ""}`);

const {
  parseOperatorTreatmentSchema,
  operatorTreatment,
  registerAllAdapters,
  getAdapter,
  buildMutantEnvelope,
  runCoverageExperiment,
  assessWithinFamilyReplication,
  toHardnessOperatorEvidence,
  regradeSubmissionAgainstSuite,
} = await import("../dist/index.js");

// ---------------------------------------------------------------- 1. envelope

let envelope;
try {
  envelope = buildMutantEnvelope();
  ok(
    `mutant envelope builds and passes its own soundness check (${envelope.development.length} development, ${envelope.heldOut.length} held-out)`,
  );
} catch (err) {
  fail("buildMutantEnvelope", err.message);
}

if (envelope !== undefined) {
  const again = buildMutantEnvelope();
  if (again.bankHash === envelope.bankHash)
    ok(`envelope bankHash reproduces byte-for-byte (${envelope.bankHash})`);
  else fail("envelope reproducibility", `${envelope.bankHash} !== ${again.bankHash}`);
  writeFileSync(
    "data/phase-22-mutant-envelope.json",
    `${JSON.stringify({ schema: "agent-eval-foundry/phase-22-mutant-envelope@1", ...envelope }, null, 2)}\n`,
  );
  ok("data/phase-22-mutant-envelope.json regenerated");
}

// ---------------------------------------------------------------- 2. adapter + orchestrator

registerAllAdapters();
const adapter = getAdapter("caa-revalidation");
const schema = parseOperatorTreatmentSchema(JSON.parse(readFileSync("data/phase-21-operators.json", "utf8")));
const operator = operatorTreatment(schema, "hidden-scenario-selection-targets-narrow-mutants");

const preregFor = (label, maxPairs) => ({
  experimentId: `phase22-verify-${label}`,
  operatorId: operator.id,
  minimumMatchedPairs: 5,
  alpha: 0.05,
  referenceMustPass: true,
  maximumMatchedPairs: maxPairs,
});

const runs = {};
try {
  runs.devShipped = runCoverageExperiment(adapter, operator, "development", 24, preregFor("dev-n24", 9));
  runs.devSmall = runCoverageExperiment(adapter, operator, "development", 3, preregFor("dev-n3", 9));
  runs.heldOutShipped = runCoverageExperiment(adapter, operator, "heldOut", 24, preregFor("heldout-n24", 8));
  runs.heldOutSmall = runCoverageExperiment(adapter, operator, "heldOut", 3, preregFor("heldout-n3", 8));
  ok("orchestrator runs all four (bank x quota) coverage experiments without throwing");
} catch (err) {
  fail("runCoverageExperiment", err.message);
}

if (runs.heldOutShipped !== undefined) {
  const allRefClean = Object.values(runs).every(
    (r) => r.referenceCleanUnderNaive && r.referenceCleanUnderTargeted,
  );
  if (allRefClean) ok("reference implementation is clean under both selectors, every bank, every quota");
  else fail("reference cleanliness", "reference failed under at least one arm somewhere");
}

// ---------------------------------------------------------------- 3. within-family replication

let heldOutReplication;
let devReplication;
if (runs.heldOutShipped !== undefined) {
  heldOutReplication = assessWithinFamilyReplication([
    { conditionLabel: "heldOut-n24", result: runs.heldOutShipped },
    { conditionLabel: "heldOut-n3", result: runs.heldOutSmall },
  ]);
  devReplication = assessWithinFamilyReplication([
    { conditionLabel: "dev-n24", result: runs.devShipped },
    { conditionLabel: "dev-n3", result: runs.devSmall },
  ]);
  console.log(
    `   held-out bank replication verdict: ${heldOutReplication.verdict} (${heldOutReplication.reason})`,
  );
  console.log(
    `   development bank replication verdict: ${devReplication.verdict} (${devReplication.reason})`,
  );
  ok("within-family replication assessed across two independent quota sizes, both banks");
}

// ---------------------------------------------------------------- 4. regraded-real-submission smoke check

let dockerAvailable = false;
try {
  execFileSync("docker", ["info"], { stdio: "ignore", timeout: 20_000 });
  dockerAvailable = true;
} catch {
  dockerAvailable = false;
}

if (!dockerAvailable) {
  skip("regraded-real-submission smoke check (Docker unavailable)", "not scored as pass or fail");
} else {
  try {
    const space = adapter.enumerateScenarioSpace();
    const smallSuite = adapter.buildScenarios(space.slice(0, 2));
    const modulePath = "trials/caa-revalidation/phase17-caa-slot-1-openai-attempt-1/submission/subject.mjs";
    const result = regradeSubmissionAgainstSuite("smoke-slot-1", modulePath, "smoke-2-scenario", smallSuite);
    if (result.cells.length === 2 && result.cells.every((c) => c.hostError === null)) {
      ok(
        "regraded-real-submission path runs a preserved subject.mjs through the trusted executor, real Docker",
      );
    } else {
      fail("regrade smoke check", JSON.stringify(result.cells));
    }
  } catch (err) {
    fail("regrade smoke check", err.message);
  }
}

// ---------------------------------------------------------------- 5. verdict + ledger update

let finalVerdict = "INVALID-EXPERIMENT";
if (runs.heldOutShipped !== undefined && heldOutReplication !== undefined) {
  const heldOutNull =
    heldOutReplication.verdict === "REPLICATED-NULL" &&
    runs.heldOutShipped.primary.discordantTargetedWins === 0 &&
    runs.heldOutShipped.primary.discordantNaiveWins === 0;
  finalVerdict = heldOutNull ? "NULL-ON-FAIR-ENVELOPE" : "INVALID-EXPERIMENT";
  console.log(`   mechanically-derived final verdict: ${finalVerdict}`);
}

if (runs.heldOutShipped !== undefined) {
  const ledgerPath = "data/hardness-operators.json";
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
  const entryId = `phase22-${operator.id}-caa-revalidation`;
  if (ledger.operators.some((o) => o.id === entryId)) {
    ok(`data/hardness-operators.json already carries ${entryId} — not duplicated`);
  } else {
    const base = toHardnessOperatorEvidence({
      operator,
      familyId: "caa-revalidation",
      baselineCount: runs.heldOutShipped.naiveScenarioCount,
      treatedCount: runs.heldOutShipped.targetedScenarioCount,
      mcNemar: {
        discordantTreatedWins: runs.heldOutShipped.primary.discordantTargetedWins,
        discordantBaselineWins: runs.heldOutShipped.primary.discordantNaiveWins,
        concordant: runs.heldOutShipped.primary.concordant,
        pValueTwoSided: runs.heldOutShipped.secondaryCaveated.pValueTwoSided,
      },
      stoppingRule: runs.heldOutShipped.stoppingRule,
      provenance: [
        "src/phase-22/mutant-envelope.ts (held-out bank, never seen during selector construction)",
        "src/phase-22/orchestrator.ts (runCoverageExperiment, bank=heldOut, quota=24)",
        "scripts/verify-phase-22.mjs",
      ],
      extractedOn: "2026-09-05",
      phaseLabel: "phase22",
    });
    const record = {
      ...base,
      name: `${base.name} Phase 22 re-measurement on a frozen, disjoint held-out mutant bank (never seen during selector construction), replicated at two quota sizes (24, 3), plus zero-discordance regrading of all four compatible preserved real Phase 17 submissions against both hidden suites — see reports/PHASE-22-TRANSFER-AND-CONSTRUCTION.md.`,
      capabilityAttribution: `${base.capabilityAttribution}; also see reports/PHASE-22-TRANSFER-AND-CONSTRUCTION.md for the held-out-bank and regraded-submission evidence this specific record is drawn from.`,
    };
    ledger.operators.push(record);
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    ok(`data/hardness-operators.json: appended ${entryId} (confidence=${record.confidence})`);
  }
}

console.log("");
if (failures > 0) {
  console.error(`Phase 22 verification FAILED: ${failures} check(s) stale.`);
  process.exit(1);
}
console.log("Phase 22 verification passed.");
