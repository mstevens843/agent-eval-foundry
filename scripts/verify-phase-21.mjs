#!/usr/bin/env node
// Phase 21's reproducibility and instrumentation gate.
//
// This does not regenerate a canonical report and diff it (Phase 21 has no CLI-rendered report the
// way Phase 17 did) — its real deliverable is code that runs on real data. This script re-runs that
// code, twice, and confirms: the operator schema parses and enforces its own closed-world rules, the
// matched-pair check accepts a clean delta and refuses a confounded one, and the local pilot's output
// is byte-for-byte identical across two independent runs (it is a deterministic computation over
// checked-in mutants and scenarios, so anything else is a bug).

import { readFileSync } from "node:fs";

let failures = 0;
const ok = (label) => console.log(`ok     ${label}`);
const fail = (label, detail) => {
  console.error(`STALE  ${label}${detail ? `: ${detail}` : ""}`);
  failures += 1;
};

const {
  parseOperatorTreatmentSchema,
  operatorTreatment,
  requireMatchedPair,
  assertMatchedPairDiffable,
  mcNemarExact,
  evaluateStoppingRule,
  runPilot,
  toHardnessOperatorEvidence,
} = await import("../dist/index.js");

// ---------------------------------------------------------------- 1. schema

let schema;
try {
  schema = parseOperatorTreatmentSchema(JSON.parse(readFileSync("data/phase-21-operators.json", "utf8")));
  ok(`data/phase-21-operators.json parses (${schema.operators.length} operators)`);
} catch (err) {
  fail("data/phase-21-operators.json", err.message);
}

if (schema !== undefined) {
  if (schema.operators.length === 12) ok("all twelve roadmap operators present");
  else fail("operator count", `expected 12, got ${schema.operators.length}`);

  try {
    operatorTreatment(schema, "not-a-real-operator");
    fail("operatorTreatment unknown-id guard", "did not throw");
  } catch {
    ok("operatorTreatment refuses an unknown operator id");
  }

  const grandfathered = [
    "dao-descendant",
    "trading-reconciliation-recompute",
    "deployment-rollback-recompute",
  ];
  const violations = schema.operators.filter(
    (o) =>
      o.legibilitySensitive &&
      o.id !== "defect-non-legibility-at-edit-site" &&
      o.candidateSubstrates.some((f) => grandfathered.includes(f)),
  );
  if (violations.length === 0) ok("no legibility-sensitive operator claims a grandfathered family as clean");
  else fail("legibility-sensitive substrate check", violations.map((v) => v.id).join(", "));
}

// ---------------------------------------------------------------- 2. matched-pair diffability

if (schema !== undefined) {
  const op = operatorTreatment(schema, "diagnosis-radius");
  try {
    requireMatchedPair(op, {
      sharedComponentDescriptions: { generator: "smoke" },
      baselineDeltaFields: { "scenarios.params.sessionsBetween": 2 },
      treatedDeltaFields: { "scenarios.params.sessionsBetween": 5 },
    });
    ok("matched-pair check accepts a clean, declared delta");
  } catch (err) {
    fail("matched-pair clean-delta smoke", err.message);
  }
  const confounded = assertMatchedPairDiffable(op, {
    sharedComponentDescriptions: { generator: "smoke" },
    baselineDeltaFields: { "scenarios.params.sessionsBetween": 2, undeclaredField: "a" },
    treatedDeltaFields: { "scenarios.params.sessionsBetween": 5, undeclaredField: "b" },
  });
  if (confounded.verdict === "not-matched") ok("matched-pair check refuses an undeclared-field confound");
  else fail("matched-pair confound smoke", "did not refuse");
}

// ---------------------------------------------------------------- 3. McNemar sanity

const nullCase = mcNemarExact([
  { unitId: "a", baseline: 1, treated: 1 },
  { unitId: "b", baseline: 0, treated: 0 },
]);
if (nullCase.pValueTwoSided === 1) ok("McNemar exact: perfectly concordant data returns p=1");
else fail("McNemar null case", `expected p=1, got ${nullCase.pValueTwoSided}`);

const strongCase = mcNemarExact(
  Array.from({ length: 10 }, (_, i) => ({ unitId: `u${i}`, baseline: 0, treated: 1 })),
);
if (strongCase.pValueTwoSided < 0.01) ok("McNemar exact: a strongly asymmetric split is significant");
else fail("McNemar strong-signal case", `expected p<0.01, got ${strongCase.pValueTwoSided}`);

// ---------------------------------------------------------------- 4. stopping rule

const preregSmoke = {
  experimentId: "verify-smoke",
  operatorId: "smoke",
  minimumMatchedPairs: 3,
  alpha: 0.05,
  referenceMustPass: true,
  maximumMatchedPairs: 10,
};
const regression = evaluateStoppingRule(
  preregSmoke,
  Array.from({ length: 5 }, (_, i) => ({ unitId: `u${i}`, baseline: 1, treated: 1 })),
  [{ unitId: "reference", referencePassed: false }],
);
if (regression.kind === "stop-validity-regression") ok("stopping rule stops for validity regression");
else fail("stopping rule regression smoke", regression.kind);

// ---------------------------------------------------------------- 5. local pilot reproducibility

if (schema !== undefined) {
  const first = runPilot(schema);
  const second = runPilot(schema);
  const firstJson = JSON.stringify(first);
  const secondJson = JSON.stringify(second);
  if (firstJson === secondJson) ok("local pilot reproduces byte-for-byte across two independent runs");
  else fail("local pilot reproducibility", "two runs produced different output");

  if (first.shippedSize.referenceCleanUnderBaseline && first.shippedSize.referenceCleanUnderTreated) {
    ok("pilot's reference implementation is clean under both arms (no validity regression)");
  } else {
    fail("pilot reference cleanliness", "reference failed under at least one arm");
  }

  try {
    const record = toHardnessOperatorEvidence({
      operator: operatorTreatment(schema, first.operatorId),
      familyId: "caa-revalidation",
      baselineCount: first.shippedSize.baselineScenarioIds.length,
      treatedCount: first.shippedSize.treatedScenarioIds.length,
      mcNemar: first.shippedSize.mcNemar,
      stoppingRule: first.shippedSize.stoppingRule,
      provenance: ["scripts/verify-phase-21.mjs"],
      extractedOn: "2026-09-05",
    });
    if (record.confidence && record.id.startsWith("phase21-"))
      ok("pilot result bridges to a HardnessOperatorEvidence-shaped record");
    else fail("ledger bridge", "unexpected record shape");
  } catch (err) {
    fail("ledger bridge", err.message);
  }
}

// ---------------------------------------------------------------- 6. the pre-existing defect this phase fixed

const operators = JSON.parse(readFileSync("data/hardness-operators.json", "utf8")).operators;
if (
  operators[8] !== undefined &&
  typeof operators[8].confidence === "string" &&
  operators[8].confidence.length > 0
) {
  ok("data/hardness-operators.json operators[8].confidence is present (pre-existing defect fixed)");
} else {
  fail("hardness-operators.json operators[8]", "confidence still missing");
}

console.log("");
if (failures > 0) {
  console.error(`Phase 21 verification FAILED: ${failures} check(s) stale.`);
  process.exit(1);
}
console.log("Phase 21 verification passed.");
