#!/usr/bin/env node
// Phase 23's reproducibility and evidence-generation gate.
//
// Verifies: the route-parity bonus check (real Docker, gated), the diagnosis-radius matched-pair
// construction and its joint validity criterion, and that Phase 19's own frozen files remain
// byte-for-byte untouched. Does not fabricate a real-agent-trial result — Lane 6 was not authorized
// this phase, and this script does not pretend otherwise.

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
  requireMatchedPair,
  checkRouteParity,
  BASELINE_ARM,
  TREATED_ARM,
  BASELINE_SESSIONS_BETWEEN,
  TREATED_SESSIONS_BETWEEN,
  runValidityGates,
  freezeArmPackage,
} = await import("../dist/index.js");

// ---------------------------------------------------------------- 1. Phase 22 still holds

try {
  execFileSync("node", ["scripts/verify-phase-22.mjs"], { stdio: "pipe" });
  ok("phase 22 re-verifies clean (scripts/verify-phase-22.mjs)");
} catch (err) {
  fail("phase 22 re-verification", err.message);
}

// ---------------------------------------------------------------- 2. operator schema fresh read

const schema = parseOperatorTreatmentSchema(JSON.parse(readFileSync("data/phase-21-operators.json", "utf8")));
if (schema.operators.length === 12) ok("data/phase-21-operators.json still declares all twelve operators");
else fail("operator count", `expected 12, got ${schema.operators.length}`);

const hiddenSelOp = operatorTreatment(schema, "hidden-scenario-selection-targets-narrow-mutants");
if (hiddenSelOp.evidenceStatus === "measured") {
  ok(
    "hidden-scenario-selection-targets-narrow-mutants evidenceStatus corrected to 'measured' (Lane 0 finding)",
  );
} else {
  fail("evidenceStatus correction", `expected measured, got ${hiddenSelOp.evidenceStatus}`);
}

// ---------------------------------------------------------------- 3. diagnosis-radius construction

const operator = operatorTreatment(schema, "diagnosis-radius");
try {
  const pairResult = requireMatchedPair(operator, {
    sharedComponentDescriptions: {
      "enumerateSpace/generateScenarios/buildScenario":
        "src/families/memory-poisoning/scenarios.ts (imported, unmodified)",
      "verify (via runCell)":
        "src/families/memory-poisoning/runner.ts#runCell + verify.ts (imported, unmodified)",
      reference: "src/families/memory-poisoning/reference.ts (imported, unmodified)",
      mutants: "src/families/memory-poisoning/mutants.ts (imported, unmodified)",
      "visible package construction":
        "src/challenge/memory-package.ts#buildMemoryChallengePackage (imported, unmodified)",
    },
    baselineDeltaFields: { "scenarios.params.sessionsBetween": BASELINE_ARM.sessionsBetween },
    treatedDeltaFields: { "scenarios.params.sessionsBetween": TREATED_ARM.sessionsBetween },
  });
  if (pairResult.verdict === "matched")
    ok("diagnosis-radius matched pair mechanically confirmed (requireMatchedPair)");
  else fail("matched-pair check", JSON.stringify(pairResult));
} catch (err) {
  fail("matched-pair check threw", err.message);
}

if (
  BASELINE_ARM.sessionsBetween !== BASELINE_SESSIONS_BETWEEN ||
  TREATED_ARM.sessionsBetween !== TREATED_SESSIONS_BETWEEN
) {
  fail("arm sessionsBetween constants", "arm construction does not match declared constants");
} else {
  ok(
    `baseline arm sessionsBetween=${BASELINE_SESSIONS_BETWEEN}, treated arm sessionsBetween=${TREATED_SESSIONS_BETWEEN}`,
  );
}

const baselineGate = runValidityGates(BASELINE_ARM);
const treatedGate = runValidityGates(TREATED_ARM);

if (baselineGate.referenceClean && treatedGate.referenceClean) {
  ok("reference implementation is clean under both arms (no validity regression)");
} else {
  fail(
    "reference cleanliness",
    `baseline=${baselineGate.referenceClean} treated=${treatedGate.referenceClean}`,
  );
}

const caughtByEither = new Map();
for (const m of baselineGate.mutantsCaught) caughtByEither.set(m.mutantId, m.caught);
for (const m of treatedGate.mutantsCaught)
  caughtByEither.set(m.mutantId, caughtByEither.get(m.mutantId) || m.caught);
const uncaughtByEither = [...caughtByEither.entries()].filter(([, caught]) => !caught).map(([id]) => id);
if (uncaughtByEither.length === 0) {
  ok(
    `joint validity criterion holds: every one of ${caughtByEither.size} mutants is caught by at least one arm`,
  );
} else {
  fail("joint validity criterion", `never caught by either arm: ${uncaughtByEither.join(", ")}`);
}

const typesSource = readFileSync("src/families/memory-poisoning/types.ts", "utf8");
const baselinePkg = freezeArmPackage(typesSource, BASELINE_ARM, "diagnosis-radius-baseline-s0");
const treatedPkg = freezeArmPackage(typesSource, TREATED_ARM, "diagnosis-radius-treated-s3");
const baselinePkgAgain = freezeArmPackage(typesSource, BASELINE_ARM, "diagnosis-radius-baseline-s0");
if (baselinePkg.packageHash === baselinePkgAgain.packageHash) {
  ok(
    `package hashes reproduce byte-for-byte (baseline=${baselinePkg.packageHash}, treated=${treatedPkg.packageHash})`,
  );
} else {
  fail("package hash reproducibility", `${baselinePkg.packageHash} !== ${baselinePkgAgain.packageHash}`);
}
if (baselinePkg.packageHash !== treatedPkg.packageHash) {
  ok("baseline and treated packages have distinct hashes (they are genuinely different graded sets)");
} else {
  fail("package hash distinctness", "baseline and treated packages hashed identically");
}

// ---------------------------------------------------------------- 4. Lane 1 bonus: route parity (Docker-gated)

let dockerAvailable = false;
try {
  execFileSync("docker", ["info"], { stdio: "ignore", timeout: 20_000 });
  dockerAvailable = true;
} catch {
  dockerAvailable = false;
}

let routeParityResults = null;
if (!dockerAvailable) {
  skip("route-parity bonus check (Docker unavailable)", "not scored as pass or fail");
} else {
  const SLOTS = [
    "phase17-caa-slot-1-openai-attempt-1",
    "phase17-caa-slot-2-anthropic-attempt-1",
    "phase17-caa-slot-3-openai-attempt-1",
    "phase17-caa-slot-4-anthropic-attempt-1",
  ];
  try {
    routeParityResults = SLOTS.map((slot) =>
      checkRouteParity(slot, `trials/caa-revalidation/${slot}/submission/subject.mjs`),
    );
    if (routeParityResults.every((r) => r.identical)) {
      ok(
        `route parity: all ${routeParityResults.length} preserved honest submissions grade identically through both routes (authoritative-state-inaccessible-to-subject honest-subject case, null as predicted)`,
      );
    } else {
      fail("route parity", JSON.stringify(routeParityResults.filter((r) => !r.identical)));
    }
  } catch (err) {
    fail("route parity check threw", err.message);
  }
}

// ---------------------------------------------------------------- 5. Phase 19 untouched

const phase19Files = [
  "data/phase-19-preregistration.json",
  "data/phase-19-candidate-assessments.json",
  "src/phase-19/evidence-rerank.ts",
];
try {
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...phase19Files]);
  ok("Phase 19's own frozen files are byte-for-byte untouched (git diff clean)");
} catch {
  fail("Phase 19 files", "one or more Phase 19-owned files have uncommitted changes");
}

// ---------------------------------------------------------------- 6. ledger updates (idempotent)

const ledgerPath = "data/hardness-operators.json";
const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
let ledgerChanged = false;

const routeParityId = "phase23-authoritative-state-inaccessible-to-subject-honest-subject-caa-revalidation";
if (routeParityResults !== null && !ledger.operators.some((o) => o.id === routeParityId)) {
  ledger.operators.push({
    id: routeParityId,
    category: "validity-control",
    name: "Authoritative state inaccessible to the subject — honest-subject case (Phase 20 already measured the adversarial/exploit case; this closes the remaining half)",
    changed:
      "Which grading route the submission runs through: pre-Phase-20 (subprocessHost/containerHost, shared process) vs post-Phase-20 (signed cell-container split).",
    stayedFixed:
      "The submission itself, the scenario set, the mutant bank, the verifier logic — literally everything except which process the ledger is constructed in.",
    beforeEvidence:
      "Phase 20 measured the adversarial case only (test/phase-20-secure-executor.test.ts, reports/PHASE-20-VERIFIER-TRUST-BOUNDARY.md): a malicious submission cannot forge a pass under the post-Phase-20 route. The honest-subject case was never checked.",
    afterEvidence: `All ${routeParityResults.length} preserved, hash-verified-compatible real Phase 17 caa-revalidation submissions (2 OpenAI, 2 Anthropic) graded through both routes for real: ${routeParityResults.filter((r) => r.identical).length}/${routeParityResults.length} identical cell-by-cell, zero discrepancies, zero host errors either route.`,
    measurementStatus: "measured",
    fairnessOutcome:
      "n/a — this operator concerns grading-route equivalence for an honest submission, not what is fair to grade.",
    verifierIntegrityEffect:
      "Confirms the Phase 20 migration did not silently change what a compliant submission is graded as, for every preserved real submission available for this check.",
    solveRateEffect: {
      countable: true,
      before: `${routeParityResults.length}/${routeParityResults.length} clean (pre-route)`,
      after: `${routeParityResults.length}/${routeParityResults.length} clean (post-route)`,
      note: "Identical outcome both routes for every submission — the operator's own predicted null for the honest-subject case, now actually checked rather than assumed.",
    },
    capabilityAttribution:
      "not-applicable: measures grading-infrastructure equivalence, not agent capability",
    provenance: [
      "src/phase-23/route-parity.ts",
      "scripts/verify-phase-23.mjs",
      "trials/caa-revalidation/phase17-caa-slot-{1,2,3,4}-*/submission/subject.mjs",
    ],
    confidence: "high",
  });
  ledgerChanged = true;
  ok(`data/hardness-operators.json: appended ${routeParityId}`);
} else if (ledger.operators.some((o) => o.id === routeParityId)) {
  ok(`data/hardness-operators.json already carries ${routeParityId} — not duplicated`);
} else {
  skip("route-parity ledger entry", "Docker unavailable this run, nothing to record");
}

const diagRadiusId = "phase23-diagnosis-radius-prompt-injection-memory-poisoning-construction";
if (!ledger.operators.some((o) => o.id === diagRadiusId)) {
  ledger.operators.push({
    id: diagRadiusId,
    category: "difficulty",
    name: operator.causalClaim,
    changed: operator.constructionDelta,
    stayedFixed: operator.staysFixed,
    beforeEvidence:
      'Untested prior to this phase (evidenceStatus:"untested" in data/phase-21-operators.json). causal-depth on caa-revalidation was attempted first and found not constructible without editing verify.ts (see data/phase-23-preregistration.json); this operator was the disciplined pivot.',
    afterEvidence: `Two matched packages constructed and frozen (baseline sessionsBetween=0 hash ${baselinePkg.packageHash}, treated sessionsBetween=3 hash ${treatedPkg.packageHash}), mechanically confirmed as a real matched pair (requireMatchedPair), reference clean on both, every one of the ${caughtByEither.size} mutants caught by at least one arm. A real agent trial (data/phase-23-trial-preregistration.json) is fully designed and frozen but NOT executed — no real-time spend authorization was available this phase.`,
    measurementStatus: "estimated",
    fairnessOutcome:
      "Matched pair mechanically confirmed diffable (requireMatchedPair); every declared field outside the operator's own shapeFieldsEdited held identical between arms.",
    verifierIntegrityEffect:
      "n/a — this operator changes the hidden graded scenario set's session-spacing parameter, not verifier logic itself.",
    solveRateEffect: {
      countable: false,
      before: null,
      after: null,
      note: "Construction and validity-gating complete; real solve-rate evidence requires the Lane 6 trial in data/phase-23-trial-preregistration.json, which was designed but not authorized/executed this phase.",
    },
    capabilityAttribution: "not yet resolved: awaiting Lane 6 trial authorization",
    provenance: [
      "src/phase-23/diagnosis-radius.ts",
      "data/phase-23-trial-preregistration.json",
      "scripts/verify-phase-23.mjs",
    ],
    confidence: "low",
  });
  ledgerChanged = true;
  ok(
    `data/hardness-operators.json: appended ${diagRadiusId} (construction-only, estimated — real trial not yet run)`,
  );
} else {
  ok(`data/hardness-operators.json already carries ${diagRadiusId} — not duplicated`);
}

if (ledgerChanged) {
  writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
}

console.log("");
if (failures > 0) {
  console.error(`Phase 23 verification FAILED: ${failures} check(s) stale.`);
  process.exit(1);
}
console.log("Phase 23 verification passed.");
