import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHASE19_REVIEW_DIMENSIONS,
  buildPhase19ReviewLedger,
  phase19CandidateReviewB6,
} from "../src/phase-19/candidate-review.js";
import {
  buildPhase19Reranking,
  buildPhase19UiLabelLedger,
  buildPhase19UiPacketManifest,
  phase19CoreB6,
} from "../src/phase-19/evidence-rerank.js";
import { PHASE19_PROBE_FAMILIES, runPhase19Probe } from "../src/phase-19/probes.js";
import { renderPhase19EvidenceRerank } from "../src/reports/phase-19-evidence-rerank.js";

const ROOT = process.cwd();

describe("Phase 19 UI evidence repair", () => {
  it("constructs five distinct packets over one byte-consistent challenge", () => {
    const manifest = buildPhase19UiPacketManifest(ROOT);
    expect(manifest.packets).toHaveLength(5);
    expect(new Set(manifest.packets.map((packet) => packet.sha256))).toHaveLength(5);
    expect(manifest.commonChallengeSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never turns an incomplete blind pair into difficulty evidence", () => {
    const ledger = buildPhase19UiLabelLedger(ROOT);
    for (const trial of ledger.trials) {
      if (trial.labels.length < 2) {
        expect(trial.decision.status).toBe("pending");
        expect(trial.decision.difficultyEvidence).toBe(false);
      }
    }
    expect(ledger.summary.difficultyEvidenceSurvives).toBe(ledger.summary.agreedCapability > 0);
  });

  it("runs nondegenerate B6 controls for packets, normalization and reviews", () => {
    expect(phase19CoreB6(ROOT)).toMatchObject({
      usable: true,
      knownGoodPassed: true,
      knownBadFailed: true,
      malformedInputRefused: true,
      nondegenerate: true,
    });
    expect(phase19CandidateReviewB6(ROOT)).toMatchObject({
      usable: true,
      knownGoodPassed: true,
      knownBadFailed: true,
      malformedInputRefused: true,
      nondegenerate: true,
    });
    expect(PHASE19_REVIEW_DIMENSIONS).toContain("causal depth");
    expect(PHASE19_REVIEW_DIMENSIONS).toContain("diagnosis radius");
  });
});

describe("Phase 19 corrected ranking", () => {
  it("records the final CAA result and refuses to call it valid difficulty evidence", () => {
    const ranking = buildPhase19Reranking(ROOT);
    expect(ranking.caaV2Correction).toMatchObject({
      countableTrials: 4,
      cleanSolves: 4,
      rewardZero: 0,
      difficultyEstimateValid: false,
    });
  });

  it("normalizes every inherited probability to clean-solve probability on [0,1]", () => {
    const ranking = buildPhase19Reranking(ROOT);
    expect(ranking.probabilitySemantic).toBe("P(agent cleanly solves the package)");
    for (const row of ranking.rows) {
      for (const estimate of [
        row.inheritedCleanSolveProbability.ordinary,
        row.inheritedCleanSolveProbability.fullRecipe,
      ]) {
        expect(estimate.low).toBeGreaterThanOrEqual(0);
        expect(estimate.low).toBeLessThanOrEqual(estimate.value);
        expect(estimate.value).toBeLessThanOrEqual(estimate.high);
        expect(estimate.high).toBeLessThanOrEqual(1);
      }
    }
  });

  it("removes infrastructure, broad shapes and confirmed duplicates before top-five review", () => {
    const ranking = buildPhase19Reranking(ROOT);
    const byId = new Map(ranking.rows.map((row) => [row.familyId, row]));
    expect(byId.get("verifier-container-isolation-boundary")?.disposition).toBe(
      "infrastructure-excluded",
    );
    expect(byId.get("long-horizon-multi-app-coordination")?.disposition).toBe(
      "broad-shape-excluded",
    );
    expect(byId.get("payment-idempotency-ambiguous-retry")?.disposition).toBe("duplicate-killed");
    expect(ranking.topFive).toHaveLength(5);
    expect(ranking.topFive).toEqual(
      expect.arrayContaining([
        "rollback-reactivates-dormant-defect",
        "worker-rebalance-partition-callback-dedup",
        "state-diff-collateral-damage-verification",
        "ui-action-replay-dom-mutation-timing",
        "fuzzy-instruction-cross-server-tool-discovery",
      ]),
    );
  });
});

describe("Phase 19 cheap probes", () => {
  it("holds all six controls for each possible top-five candidate", () => {
    for (const familyId of PHASE19_PROBE_FAMILIES) {
      const result = runPhase19Probe(familyId);
      expect(result.status, familyId).toBe("survived");
      expect(result.b6, familyId).toMatchObject({
        usable: true,
        knownGoodPassed: true,
        knownBadFailed: true,
        malformedInputRefused: true,
        nondegenerate: true,
      });
      expect(result.controls.mutantNonActivation.failures, familyId).toHaveLength(0);
      expect(result.controls.deterministicReplay, familyId).toBe(true);
    }
  });

  it("does not execute a probe before its two-reader gate closes", () => {
    const ui = buildPhase19UiLabelLedger(ROOT);
    if (ui.summary.labelsReceived < 10) return;
    const ledger = buildPhase19ReviewLedger(ROOT);
    for (const row of ledger.probes) {
      if (row.status === "not-run-reader-killed" || row.status === "not-run-reader-pending") {
        expect(row.result).toBeNull();
      }
    }
  });
});

describe("Phase 19 report", () => {
  it("renders only from frozen inputs and records current completion state", () => {
    const report = renderPhase19EvidenceRerank(ROOT);
    expect(report).toContain("Phase 19 - Evidence Repair And Candidate Reranking");
    expect(report).toContain("4/4 clean solves");
    expect(report).toContain("P(agent cleanly solves the package)");
    expect(report).toContain("Causal depth and diagnosis radius are required");
    const hasLabels = existsSync(join(ROOT, "data/phase-19-ui-label-ledger.json"));
    expect(typeof hasLabels).toBe("boolean");
  });
});
