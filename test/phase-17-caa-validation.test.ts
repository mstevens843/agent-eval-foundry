import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CHEAT_ORACLES, INTENDED_CHECK, MUTANTS } from "../src/families/caa-revalidation/mutants.js";
import {
  checkActivation,
  independentFatality,
  referenceFailures,
  runFamily,
} from "../src/families/caa-revalidation/runner.js";
import {
  enumerateSpace,
  isActivated,
  selectMeasuredSet,
} from "../src/families/caa-revalidation/scenarios.js";
import { RULE_CODES, SPEC_MD } from "../src/families/caa-revalidation/spec.js";
import { CHECKS, CHECK_RULES, verify } from "../src/families/caa-revalidation/verify.js";
import { runPhase16Discovery } from "../src/phase-16/discovery.js";
import { buildPhase17TrialLedger, zeroEventUpperBound } from "../src/phase-17/measurement.js";
import { runPhase17PackageControls } from "../src/phase-17/package-controls.js";
import { runPhase16EnforcementScreen, runPhase17ProbeAudit } from "../src/phase-17/probe-audit.js";
import { runPhase17ProbeV2 } from "../src/phase-17/probe-v2-run.js";
import { RigInputError } from "../src/screens/rig-integrity.js";

const root = resolve(import.meta.dirname, "..");

describe("Lane 0 - the Phase 16 probe audit", () => {
  it("leaves every frozen Phase 16 input intact and confirms the 2-of-2 cross-family promotion", () => {
    const audit = runPhase17ProbeAudit(root);
    expect(audit.allFrozenInputsIntact).toBe(true);
    expect(audit.caaPromotedByTwoIndependentFamilies).toBe(true);
    expect(audit.caaReaderVerdicts).toHaveLength(2);
    expect(new Set(audit.caaReaderVerdicts.map((row) => row.providerFamily)).size).toBe(2);
  });

  it("proves structurally that the frozen probe could only ever visit one fixture", () => {
    const audit = runPhase17ProbeAudit(root);
    expect(audit.implemented.runnerAcceptsFixtureParameter).toBe(false);
    expect(audit.implemented.distinctFixtures).toBe(1);
    expect(audit.implemented.oneNameControlsRun).toBe(0);
    expect(audit.implemented.fixtureFreshCount).toBe(0);
    expect(audit.implemented.fixtureAgesInsideDeclaredEnvelope).toBe(false);
    expect(audit.verdict).toBe("partial-procedure-probe-survivor");
  });

  it("shows both Phase 16 isolation controls had no reachable failing branch", () => {
    const audit = runPhase17ProbeAudit(root);
    expect(audit.implemented.sentinelInCaaAuthorityMap).toBe(false);
    expect(audit.implemented.sentinelOccurrencesInContractArtifact).toBe(0);
    expect(audit.implemented.sentinelOccurrencesInPacketArtifact).toBe(0);
  });

  it("finds no fatal defect and no material contract change", () => {
    const audit = runPhase17ProbeAudit(root);
    const classes = new Set(audit.findings.map((row) => row.issueClass));
    expect(classes.has("fatal-candidate-defect")).toBe(false);
    expect(classes.has("material-contract-change")).toBe(false);
    expect(audit.findings.length).toBeGreaterThanOrEqual(13);
  });

  it("catches the five stated-but-unenforced clauses the Phase 16 metric set never metered", () => {
    const rows = runPhase16EnforcementScreen();
    const escaped = rows.filter((row) => row.strategyId !== "reference" && !row.caughtAnywhere);
    expect(escaped.map((row) => row.strategyId).sort()).toEqual([
      "always-refuse",
      "boundary-inclusive-eight",
      "duplicate-same-name-queries",
      "reversed-result-order",
      "wrong-source-labels",
    ]);
    // The reference must never be caught, or the screen is measuring its own bug.
    expect(rows.find((row) => row.strategyId === "reference")?.caughtAnywhere).toBe(false);
    // And the two real defects must be caught, or the screen cannot discriminate at all.
    expect(rows.find((row) => row.strategyId === "first-name-reuse")?.caughtAnywhere).toBe(true);
    expect(rows.find((row) => row.strategyId === "fabricated-no-query")?.caughtAnywhere).toBe(true);
  });
});

describe("Lane 1 - the exact Probe V2", () => {
  const probe = runPhase17ProbeV2(root);

  it("matches every registered cell under the registered implementation hash", () => {
    expect(probe.verdict.status).toBe("PROBE-V2-PASSED");
    expect(probe.verdict.matrixMismatches).toEqual([]);
    expect(probe.verdict.killReasons).toEqual([]);
    expect(probe.verdict.implementationHashMatches).toBe(true);
    expect(probe.run.cells).toHaveLength(72);
  });

  it("runs the declared one-name controls the frozen probe never reached", () => {
    const ids = probe.run.fixtures.map((row) => row.id);
    expect(ids).toContain("one-name-stale-allow");
    expect(ids).toContain("one-name-stale-deny");
    const mutantOnOneName = probe.run.cells.filter(
      (row) =>
        row.subjectId === "first-name-reuse-mutant" &&
        (row.fixtureId === "one-name-stale-allow" || row.fixtureId === "one-name-stale-deny"),
    );
    expect(mutantOnOneName).toHaveLength(2);
    for (const cell of mutantOnOneName) expect(cell.failures).toEqual([]);
  });

  it("discriminates both sides of the eight-hour boundary", () => {
    const eight = probe.run.cells.find(
      (row) => row.subjectId === "boundary-inclusive-mutant" && row.fixtureId === "age-boundary-eight",
    );
    const nine = probe.run.cells.find(
      (row) => row.subjectId === "boundary-lenient-mutant" && row.fixtureId === "age-boundary-nine",
    );
    expect(eight?.failures).toContain("check-caa-applicable-answer");
    expect(nine?.failures).toContain("check-caa-safe-issuance");
  });

  it("isolates the witness AND proves the detector can fail", () => {
    expect(probe.run.isolation.witnessAbsentFromEverySurface).toBe(true);
    expect(probe.run.isolation.leakCanaryDetected).toBe(true);
    expect(probe.run.isolation.challengeCarriesNoWitness).toBe(true);
    expect(probe.run.isolation.challengeLeakCanaryDetected).toBe(true);
    expect(probe.run.isolation.ledgerReachableFromSubject).toBe(false);
    expect(probe.run.isolation.staleNamesWhereCacheDisagreesWithCurrent).toBeGreaterThan(0);
  });

  it("refuses every malformed report twice, replays deterministically, and leaves no check unfired", () => {
    expect(probe.run.malformedAllRefusedTwice).toBe(true);
    expect(probe.run.malformed.length).toBeGreaterThanOrEqual(10);
    expect(probe.run.deterministicReplay).toBe(true);
    expect(probe.run.repetitions).toBe(2);
    expect(probe.run.neverFiringChecks).toEqual([]);
    expect(probe.run.b6).toMatchObject({ sameInvocation: true, usable: true, nondegenerate: true });
  });
});

describe("Lane 2 - the runnable candidate package", () => {
  const run = runFamily();

  it("passes its reference on every graded scenario and keeps its rig usable", () => {
    expect(referenceFailures(run)).toEqual([]);
    expect(run.rigUsable).toBe(true);
    expect(run.malformedInputRefused).toBe(true);
    expect(run.witnessIsolated).toBe(true);
    expect(run.leakCanaryDetected).toBe(true);
  });

  it("makes every mutant independently fatal and every check fire", () => {
    for (const row of independentFatality(run)) expect(row.fatalIn).toBeGreaterThan(0);
    const activation = checkActivation(run);
    for (const check of CHECKS) expect(activation[check] ?? 0).toBeGreaterThan(0);
    expect(MUTANTS).toHaveLength(9);
    expect(CHEAT_ORACLES.length).toBeGreaterThanOrEqual(4);
  });

  it("activates the incident mechanism on the activated stratum and nowhere else", () => {
    const own = run.cells.filter((cell) => cell.subjectId === "first-name-reuse");
    const activated = own.filter((cell) => cell.activated);
    const controls = own.filter((cell) => !cell.activated);
    expect(activated.length).toBe(18);
    expect(controls.length).toBe(6);
    expect(activated.every((cell) => cell.failures.length > 0)).toBe(true);
    expect(controls.every((cell) => cell.failures.length === 0)).toBe(true);
  });

  it("publishes every rule it grades, and grades every rule it publishes", () => {
    for (const code of RULE_CODES) expect(SPEC_MD).toContain(code);
    for (const check of CHECKS) expect(RULE_CODES).toContain(CHECK_RULES[check]);
    for (const code of RULE_CODES) {
      expect(CHECKS.some((check) => CHECK_RULES[check] === code)).toBe(true);
    }
    for (const mutantId of Object.keys(INTENDED_CHECK)) {
      expect(CHECKS).toContain(INTENDED_CHECK[mutantId] as (typeof CHECKS)[number]);
    }
  });

  it("refuses a wrong-shaped verification input rather than grading it", () => {
    expect(() => verify({})).toThrow(RigInputError);
    expect(() => verify(null)).toThrow(RigInputError);
    expect(() =>
      verify({ scenario: { view: {}, current: {}, params: {} }, report: { decision: "MAYBE" }, queries: [] }),
    ).toThrow();
  });

  it("covers every declared knob value in the measured set", () => {
    const space = enumerateSpace();
    const measured = selectMeasuredSet(space);
    expect(space).toHaveLength(192);
    expect(measured).toHaveLength(24);
    expect(measured.filter(isActivated)).toHaveLength(18);
    for (const knob of ["seed", "domainCount", "agePattern", "denyPosition"] as const) {
      const present = new Set(measured.map((row) => String(row[knob])));
      expect(present.size).toBeGreaterThan(1);
    }
  });

  it("holds all twelve package controls", () => {
    const controls = runPhase17PackageControls(root);
    expect(controls.allControlsHeld).toBe(true);
    expect(controls.controls).toHaveLength(12);
    expect(controls.neverFiringChecks).toEqual([]);
    expect(controls.starter.fraction).toBeGreaterThanOrEqual(0.2);
    for (const control of controls.controls) expect(control.held).toBe(true);
  });
});

describe("Lanes 3 and 5 - the campaign and the decision", () => {
  const ledger = buildPhase17TrialLedger(root);

  it("counted four clean cross-family trials against the registered hashes", () => {
    expect(ledger.summary.attempted).toBe(4);
    expect(ledger.summary.countable).toBe(4);
    expect(ledger.summary.cleanSolves).toBe(4);
    expect(ledger.summary.rewardZero).toBe(0);
    expect(ledger.summary.retries).toBe(0);
    expect(new Set(ledger.trials.map((row) => row.providerFamily))).toEqual(new Set(["openai", "anthropic"]));
    for (const trial of ledger.trials) {
      expect(trial.challengeHashCurrent).toBe(true);
      expect(trial.gradingB6Passed).toBe(true);
      expect(trial.scenariosGraded).toBe(24);
    }
  });

  it("fires the registered stopping rule and returns VALID-BUT-EASY", () => {
    expect(ledger.stoppingRuleFired).toMatch(/^S1 /);
    expect(ledger.decision).toBe("VALID-BUT-EASY");
    expect(ledger.summary.blindLabelsRequired).toBe(0);
    expect(ledger.summary.blindLabelsRun).toBe(0);
    expect(ledger.summary.agreedCapabilityFailures).toBe(0);
  });

  it("never converts a zero observation into a zero rate, and never prices an unpriced call", () => {
    expect(ledger.interval95.rewardZeroHigh).toBeGreaterThan(0.5);
    expect(zeroEventUpperBound(4)).toBeCloseTo(0.5271, 3);
    expect(ledger.summary.unpricedAttempts).toBe(2);
    for (const trial of ledger.trials) {
      if (trial.providerFamily === "openai") expect(trial.costUsd).toBeNull();
    }
  });

  it("never reads a self-check outcome out of model prose", () => {
    for (const trial of ledger.trials) {
      expect(trial.selfCheck.wroteSelfCheck).toBe(true);
      expect(trial.selfCheck.selfCheckOutcomeCaptured).toBe(false);
    }
  });

  it("keeps the campaign inside its registered spend caps", () => {
    const caps = JSON.parse(readFileSync(resolve(root, "data/phase-17-trial-preregistration.json"), "utf8"))
      .spendCaps as { subjectUsd: number; totalUsd: number };
    expect(ledger.summary.pricedSubjectSpendUsd).toBeLessThan(caps.subjectUsd);
    expect(ledger.summary.pricedCampaignSpendUsd).toBeLessThan(caps.totalUsd);
  });
});

describe("the frozen-evidence repair", () => {
  it("reproduces every Phase 16 reader packet hash after a new family was added", () => {
    // The registration is the fixed point: a regenerated packet must still equal the hash the two
    // blind readers reviewed, or their promotion no longer refers to anything that exists.
    const registered = JSON.parse(
      readFileSync(resolve(root, "data/phase-16-review-continuation-preregistration.json"), "utf8"),
    ) as { packets: readonly { candidateId: string; packetSha256: string }[] };
    const regenerated = runPhase16Discovery(root).packets as readonly {
      candidateId: string;
      packetSha256: string;
    }[];
    expect(regenerated.length).toBeGreaterThanOrEqual(registered.packets.length);
    for (const row of registered.packets) {
      const fresh = regenerated.find((entry) => entry.candidateId === row.candidateId);
      expect(fresh?.packetSha256, `${row.candidateId} packet drifted`).toBe(row.packetSha256);
    }
  });

  it("reads the novelty baseline from the recorded snapshot rather than the live registry", () => {
    const baseline = JSON.parse(
      readFileSync(resolve(root, "data/phase-novelty-baseline-2026-09.json"), "utf8"),
    ) as { families: readonly { familyId: string }[] };
    expect(baseline.families).toHaveLength(21);
    expect(baseline.families.some((row) => row.familyId === "caa-revalidation")).toBe(false);
  });
});
