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
} from "../src/phase-14/packages.js";
import { buildPhase14Preflight, parsePhase14PreflightObservations } from "../src/phase-14/preflight.js";
import { exactBinomialInterval } from "../src/phase-14/statistics.js";
import { renderPhase14OperatorEffects } from "../src/reports/phase-14-operator-effects.js";

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
});

describe("Phase 14 preflight and blind labels", () => {
  it("blocks measurement instead of substituting the available provider", () => {
    const preflight = buildPhase14Preflight(ROOT);
    expect(preflight.ready).toBe(false);
    expect(preflight.subjectAttemptsRun).toBe(0);
    expect(preflight.spendUsd).toBe(0);
    expect(preflight.blockers).toEqual([
      "anthropic subject execution unavailable",
      "anthropic blind labelling unavailable",
      "provider-agent container execution is not integrated for both provider CLIs",
    ]);
    expect(preflight.b6).toMatchObject({
      usable: true,
      knownGoodPassed: true,
      knownBadFailed: true,
      malformedInputRefused: true,
      packageDeltaRigUsable: true,
      blindLabelRigUsable: true,
      campaignManifestRigUsable: true,
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

  it("writes all frozen cells as NOT_RUN and leaves the ranking empty", () => {
    const trials = buildPhase14TrialLedger(ROOT);
    expect(trials.status).toBe("BLOCKED_PREFLIGHT");
    expect(trials.attempts).toHaveLength(12);
    expect(new Set(trials.attempts.map((attempt) => attempt.attemptId))).toHaveLength(12);
    expect(trials.attempts.every((attempt) => attempt.state === "NOT_RUN")).toBe(true);
    expect(trials.attempts.every((attempt) => attempt.countability.counts === false)).toBe(true);
    expect(trials.summary).toMatchObject({ attempted: 0, countable: 0, spentUsd: 0 });

    const effects = buildPhase14EffectLedger(ROOT);
    expect(effects.status).toBe("NO_AGENT_EFFECTS_MEASURED");
    expect(effects.measuredOperatorRanking).toEqual([]);
    expect(effects.estimates).toHaveLength(6);
    expect(effects.estimates.every((effect) => effect.status === "not-estimable")).toBe(true);
    expect(effects.estimates.every((effect) => effect.exactInterval === null)).toBe(true);
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

  it("renders the blocked result without a difficulty claim", () => {
    const report = renderPhase14OperatorEffects(ROOT);
    expect(report).toContain("**BLOCKED BEFORE MEASUREMENT.**");
    expect(report).toContain("Observed agent attempts: **0**");
    expect(report).toContain("measured operator ranking is therefore **empty**");
    expect(report).toContain("not a measured operator ranking");
  });
});
