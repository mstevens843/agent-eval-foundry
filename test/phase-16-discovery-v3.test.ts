import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { phase16Sha256 } from "../src/phase-16/calibration.js";
import {
  PHASE16_CALIBRATION_SHA256,
  PHASE16_PREREGISTRATION_SHA256,
  PHASE16_SOURCE_LEDGER_SHA256,
  loadPhase16Preregistration,
  loadPhase16Sources,
  phase16PacketsArtifact,
  runPhase16Discovery,
} from "../src/phase-16/discovery.js";

const root = resolve(import.meta.dirname, "..");

describe("Phase 16 prospective discovery V3", () => {
  it("loads only the twelve frozen prospective sources and verifies their bytes", () => {
    const registration = loadPhase16Preregistration(root);
    const sources = loadPhase16Sources(root);
    expect(registration.sourceCorpus).toHaveLength(12);
    expect(sources).toHaveLength(12);
    expect(new Set(sources.map((row) => row.sourceUnitId)).size).toBe(12);
    expect(sources.some((row) => /outbox|cloudflare-2019/i.test(row.sourceUnitId))).toBe(false);
  });

  it("keeps immutable registration and calibration hashes explicit", () => {
    const run = runPhase16Discovery(root);
    expect(run.preregistrationSha256).toBe(PHASE16_PREREGISTRATION_SHA256);
    expect(run.calibrationSha256).toBe(PHASE16_CALIBRATION_SHA256);
    expect(run.sourceLedgerSha256).toBe(PHASE16_SOURCE_LEDGER_SHA256);
  });

  it("measures the funnel without converting blocked review into zero yield", () => {
    const run = runPhase16Discovery(root);
    expect(run.summary).toMatchObject({
      sourceUnits: 12,
      canonicalExtractions: 12,
      validityOnlyDeaths: 4,
      belowContractCap: 2,
      contractAttempts: 6,
      contractComplete: 6,
      semanticUniquesFound: 6,
      semanticUniquesAdmitted: 4,
      readerPackets: 4,
      readerReviews: 0,
      readerSurvivors: null,
      probeSurvivors: null,
      prospectiveYield: null,
      promotionBlocked: true,
      decision: "BLOCKED",
    });
  });

  it("creates blinded packets without score, author rationale, or predicted yield", () => {
    const run = runPhase16Discovery(root);
    const artifact = phase16PacketsArtifact(run);
    const bytes = JSON.stringify(artifact);
    expect(bytes).not.toContain("engineScore");
    expect(bytes).not.toContain("scoreBreakdown");
    expect(bytes).not.toContain('"predictions"');
    expect(bytes).not.toContain('"predictedYield"');
    expect(bytes).not.toContain("evidenceChain");
    expect(run.packets.every((packet) => /^[a-f0-9]{64}$/.test(packet.packetSha256))).toBe(true);
  });

  it("does not weaken the two-provider threshold or execute ineligible probes", () => {
    const run = runPhase16Discovery(root);
    expect(run.reviews).toEqual([]);
    expect(run.readerDecisions.every((decision) => decision.status === "blocked")).toBe(true);
    expect(run.probes.every((probe) => probe.status === "not-run-reader-blocked")).toBe(true);
    expect(run.probes.every((probe) => probe.b6Invocation === null)).toBe(true);
    expect(run.packetSetSha256).toBe(phase16Sha256(run.packets));
    expect(run.rawReviewSetSha256).toBe(phase16Sha256([]));
    expect(run.normalizedReviewSetSha256).toBe(phase16Sha256(run.readerDecisions));
  });

  it("uses no measured operator uplift after Phase 14's clean solves", () => {
    const run = runPhase16Discovery(root);
    expect(run.candidates.every((candidate) => candidate.scoreBreakdown.measuredOperatorUplift === 0)).toBe(
      true,
    );
    expect(
      run.candidates.every((candidate) => candidate.operatorEvidence === "no-measured-positive-agent-effect"),
    ).toBe(true);
  });

  it("enforces the frozen semantic-unique cap before packet creation", () => {
    const run = runPhase16Discovery(root);
    expect(run.candidates.filter((candidate) => candidate.queueStatus === "reader-packet")).toHaveLength(4);
    expect(
      run.candidates.filter((candidate) => candidate.queueStatus === "below-semantic-unique-cap"),
    ).toHaveLength(2);
  });
});
