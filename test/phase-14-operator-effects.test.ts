import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type Phase14BlindLabel,
  REQUIRED_BLINDING,
  adjudicatePhase14Labels,
  phase14LabelRigIntegrity,
} from "../src/phase-14/blind-labels.js";
import { buildPhase14EffectLedger, buildPhase14TrialLedger } from "../src/phase-14/measurement.js";
import {
  PHASE14_FAMILIES,
  buildPhase14PackageLock,
  buildPhase14ScenarioLock,
  phase14ChallengeVariantRegistrations,
} from "../src/phase-14/packages.js";
import { buildPhase14Preflight, parsePhase14PreflightObservations } from "../src/phase-14/preflight.js";
import { exactBinomialInterval } from "../src/phase-14/statistics.js";
import { renderPhase14OperatorEffects } from "../src/reports/phase-14-operator-effects.js";
import { readFamilyTrials } from "../src/trials/directory.js";
import { evidenceLedger } from "../src/trials/evidence-lifecycle.js";
import { prepareChallenge } from "../src/trials/run.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PREREGISTRATION_SHA256 = "bbc31777883629466cf70eca0a9ce9597f1b78a15d4d65242c24d416c0ee1a56";

const blindLabel = (
  providerFamily: "openai" | "anthropic",
  readerId: string,
  label: Phase14BlindLabel["label"] = "capability",
): Phase14BlindLabel => ({
  runId: "phase14-test-run",
  familyId: "dao-descendant",
  readerId,
  providerFamily,
  label,
  rationale: "The visible specification determines the behavior and the submission violates that rule.",
  evidenceRead: ["challenge/SPEC.md", "submission/subject.mjs", "verifier-output.json"],
  packetPath: `labels/${readerId}/packet.json`,
  packetSha256: createHash("sha256").update(readerId).digest("hex"),
  independentlyProduced: true,
  blindedTo: [...REQUIRED_BLINDING],
});

describe("Phase 14 frozen packages and scenarios", () => {
  it("preserves the preregistration and Phase 13 seeded package hashes", () => {
    const bytes = readFileSync(`${ROOT}/data/phase-14-preregistration.json`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(PREREGISTRATION_SHA256);

    const lock = buildPhase14PackageLock(ROOT);
    expect(lock.preregistrationSha256).toBe(PREREGISTRATION_SHA256);
    expect(lock.rows).toHaveLength(6);
    expect(lock.phase13PreregistrationPreserved).toBe(true);
    expect(lock.phase13PreregistrationCurrentSha256).toBe(lock.phase13PreregistrationExpectedSha256);
    expect(lock.phase13SeededHashesPreserved).toBe(true);
    expect(lock.b6).toEqual({
      usable: true,
      malformedInputRefused: true,
      knownGoodPassed: true,
      knownBadFailed: true,
    });
    for (const familyId of PHASE14_FAMILIES) {
      const seeded = lock.rows.find(
        (row) => row.familyId === familyId && row.starterProfile === "seeded-recompute",
      );
      const neutral = lock.rows.find(
        (row) => row.familyId === familyId && row.starterProfile === "neutral-skeleton",
      );
      expect(seeded).toBeDefined();
      expect(neutral).toBeDefined();
      expect(seeded?.challengeHash).toBe(seeded?.phase13ChallengeHash);
      expect(neutral?.challengeHash).not.toBe(seeded?.challengeHash);
      expect(neutral?.changedFromSeeded).toEqual(["README.md", "starter/subject.mjs"]);
      expect(neutral?.onlyRegisteredDelta).toBe(true);
      expect(neutral?.packageGatePassed).toBe(true);
      expect(neutral?.starterHostErrors).toBe(0);
    }
  });

  it("freezes concentrated and balanced views without multiplying agent samples", () => {
    const lock = buildPhase14ScenarioLock(ROOT);
    expect(lock.preregistrationSha256).toBe(PREREGISTRATION_SHA256);
    expect(lock.rows).toHaveLength(72);
    for (const familyId of PHASE14_FAMILIES) {
      const rows = lock.rows.filter((row) => row.familyId === familyId);
      expect(rows).toHaveLength(24);
      expect(rows.filter((row) => row.activation === "target")).toHaveLength(18);
      expect(rows.filter((row) => row.activation === "control")).toHaveLength(6);
      expect(rows.filter((row) => row.inBalanced12)).toHaveLength(12);
      expect(rows.filter((row) => row.inBalanced12 && row.activation === "target")).toHaveLength(6);
    }
  });

  it("keeps registered starter variants visible without calling them package migrations", () => {
    const variants = phase14ChallengeVariantRegistrations(ROOT);
    expect(variants).toHaveLength(3);
    const familyId = "dao-descendant";
    const ledger = evidenceLedger(
      familyId,
      prepareChallenge(ROOT, familyId).hash,
      readFamilyTrials(`${ROOT}/trials`, familyId),
      variants,
    );
    const variantRuns = ledger.registeredVariants ?? [];
    expect([...variantRuns].sort()).toEqual([
      "phase14-dao-descendant-neutral-skeleton-anthropic",
      "phase14-dao-descendant-neutral-skeleton-openai",
    ]);
    expect(ledger.superseded).not.toEqual(expect.arrayContaining([...variantRuns]));
    expect(
      ledger.entries
        .filter((entry) => variantRuns.includes(entry.runId))
        .every((entry) => entry.variantId === "dao-descendant/neutral-skeleton"),
    ).toBe(true);
  });
});

describe("Phase 14 preflight and blind labels", () => {
  it("unlocks measurement only after both provider families and the container rig pass", () => {
    const preflight = buildPhase14Preflight(ROOT);
    expect(preflight.ready).toBe(true);
    expect(preflight.subjectAttemptsRun).toBe(0);
    expect(preflight.spendUsd).toBe(0);
    expect(preflight.preflightProbeSpendUsd).toBeCloseTo(0.279485, 6);
    expect(preflight.unpricedPreflightCalls).toBe(1);
    expect(preflight.blockers).toEqual([]);
    expect(preflight.b6).toMatchObject({
      usable: true,
      knownGoodPassed: true,
      knownBadFailed: true,
      malformedInputRefused: true,
      packageDeltaRigUsable: true,
      blindLabelRigUsable: true,
      campaignManifestRigUsable: true,
      providerContainerPlanRigUsable: true,
    });
    expect(preflight.phase13Campaigns).toHaveLength(3);
    expect(
      preflight.phase13Campaigns.every(
        (campaign) =>
          campaign.hashCurrent &&
          campaign.scenarioSetCurrent &&
          campaign.slotsNotRun === 2 &&
          campaign.auditFailures.length === 0,
      ),
    ).toBe(true);
    expect(() => parsePhase14PreflightObservations({})).toThrow(/absent|empty|missing/);
  });

  it("requires two blind provider families before capability counts", () => {
    const openai = blindLabel("openai", "reader-openai");
    const anthropic = blindLabel("anthropic", "reader-anthropic");
    expect(
      adjudicatePhase14Labels("phase14-test-run", "dao-descendant", true, [openai, anthropic]),
    ).toMatchObject({ status: "agreed-capability", difficultyEvidence: true });
    expect(
      adjudicatePhase14Labels("phase14-test-run", "dao-descendant", true, [
        openai,
        blindLabel("anthropic", "reader-anthropic", "spec-underspecified"),
      ]),
    ).toMatchObject({ status: "disagreed", difficultyEvidence: false });
    expect(adjudicatePhase14Labels("phase14-test-run", "dao-descendant", true, [openai])).toMatchObject({
      status: "pending",
      labelsReceived: 1,
      labels: ["capability"],
      difficultyEvidence: false,
    });
    expect(() => adjudicatePhase14Labels("phase14-test-run", "dao-descendant", true, [{}])).toThrow(
      /empty|missing/,
    );
    expect(() => adjudicatePhase14Labels("phase14-test-run", "dao-descendant", false, [openai])).toThrow(
      /clean trial/,
    );
    expect(() =>
      adjudicatePhase14Labels("phase14-test-run", "dao-descendant", true, [
        openai,
        blindLabel("openai", "reader-two"),
      ]),
    ).toThrow(/two provider families/);
    expect(phase14LabelRigIntegrity()).toEqual({
      usable: true,
      knownGoodPassed: true,
      knownBadFailed: true,
      malformedInputRefused: true,
    });
  });
});

describe("Phase 14 effect analysis", () => {
  it("computes exact attempt-level intervals and refuses zero-observation precision", () => {
    expect(exactBinomialInterval(0, 0)).toBeNull();
    expect(exactBinomialInterval(0, 6)).toMatchObject({
      estimate: 0,
      lower: 0,
      method: "Clopper-Pearson exact",
    });
    expect(exactBinomialInterval(0, 6)?.upper).toBeCloseTo(0.4592581264, 9);
    expect(exactBinomialInterval(6, 6)?.lower).toBeCloseTo(0.5407418736, 9);
    expect(() => exactBinomialInterval(7, 6)).toThrow(/must not exceed/);
  });

  it("preserves the registered stop after eight clean counted attempts", () => {
    const trials = buildPhase14TrialLedger(ROOT);
    expect(trials.status).toBe("STOPPED_BY_RULE");
    expect(trials.attempts).toHaveLength(12);
    expect(new Set(trials.attempts.map((attempt) => attempt.attemptId))).toHaveLength(12);
    expect(trials.attempts.filter((attempt) => attempt.state === "COUNTED_SOLVE")).toHaveLength(8);
    expect(trials.attempts.filter((attempt) => attempt.state === "COUNTED_FAILURE")).toHaveLength(0);
    expect(trials.attempts.filter((attempt) => attempt.state === "NOT_RUN")).toHaveLength(4);
    expect(
      trials.attempts
        .filter((attempt) => attempt.state === "NOT_RUN")
        .every((attempt) => attempt.executionEligibility === "stopped-by-rule"),
    ).toBe(true);
    expect(trials.summary).toMatchObject({
      attempted: 8,
      countable: 8,
      cleanSolves: 8,
      rewardZero: 0,
      agreedCapabilityFailures: 0,
      blindLabelsRun: 0,
    });
    expect(trials.summary.spentUsd).toBeCloseTo(1.9917585, 7);
    expect(trials.nextAttemptId).toBeNull();

    const effects = buildPhase14EffectLedger(ROOT);
    expect(effects.status).toBe("REGISTERED_MATRIX_COMPLETE");
    expect(effects.measuredOperatorRanking).toEqual([]);
    expect(effects.estimates).toHaveLength(6);
    expect(effects.estimates.find((effect) => effect.estimandId === "E1-family")).toMatchObject({
      status: "measured-descriptive",
      independentAttempts: 8,
      estimate: 0,
      exactInterval: { successes: 0, trials: 8 },
    });
    expect(effects.estimates.find((effect) => effect.estimandId === "E2-starter")).toMatchObject({
      status: "measured-descriptive",
      independentAttempts: 4,
      estimate: 0,
    });
    expect(effects.estimates.find((effect) => effect.estimandId === "E5-family-by-starter")).toMatchObject({
      status: "not-estimable",
      independentAttempts: 0,
    });
    expect(effects.localCalibration).toHaveLength(3);
    expect(
      effects.localCalibration.every(
        (row) =>
          row.referenceFailures === 0 &&
          row.narrowTargetFailures === 18 &&
          row.narrowControlFailures === 0 &&
          row.balancedNarrowFailures === 6,
      ),
    ).toBe(true);
  });

  it("renders the preregistered stop without manufacturing a difficulty claim", () => {
    const report = renderPhase14OperatorEffects(ROOT);
    expect(report).toContain("**MEASUREMENT STOPPED BY THE PREREGISTERED RULE.**");
    expect(report).toContain("Observed agent attempts: **8**");
    expect(report).toContain("Clean solves: **8**");
    expect(report).toContain("No blind labels ran because no counted subject artifact failed");
    expect(report).toContain(
      "Measured operator ranking: empty; the DAO starter contrast was measured at 0.000",
    );
    expect(report).toContain("registered variants now remain visible");
    expect(report).toContain("Reward zero and capability difficulty remain separate quantities");
  });
});
