import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runPhase16Continuation } from "../src/phase-16/continuation.js";
import {
  loadPhase16ContinuationPreregistration,
  nextPhase16Review,
  phase16ReviewNormalizerB6,
} from "../src/phase-16/review-execution.js";

const root = resolve(import.meta.dirname, "..");

describe("Phase 16 frozen-packet continuation", () => {
  it("binds the continuation to all four original packet hashes", () => {
    const registration = loadPhase16ContinuationPreregistration(root);
    expect(registration.packets).toHaveLength(4);
    expect(new Set(registration.packets.map((packet) => packet.packetSha256)).size).toBe(4);
    expect(registration.reviewPlan.maximumSemanticReviews).toBe(8);
    expect(registration.reviewPlan.paidSubjectTrials).toBe(0);
  });

  it("runs good, stale, malformed and nondegenerate normalizer controls together", () => {
    expect(phase16ReviewNormalizerB6()).toEqual({
      usable: true,
      sameInvocation: true,
      knownGoodPassed: true,
      knownBadFailed: true,
      malformedInputRefused: true,
      nondegenerate: true,
    });
  });

  it("closes the exact review sequence and runs only the unanimously eligible probe", () => {
    expect(nextPhase16Review(root)).toBeNull();
    const run = runPhase16Continuation(root);
    expect(run.summary).toMatchObject({
      reviewsRequired: 8,
      reviewsCompleted: 8,
      readerSurvivors: 1,
      probesRun: 1,
      probeSurvivors: 1,
      independentIncidentSurvivors: 1,
      causalAxisSurvivors: 1,
      decision: "REPEAT-DISCOVERY",
    });
    const caa = run.probes.find((probe) => probe.candidateId === "multi-name-caa-revalidation-reconciler");
    expect(caa).toMatchObject({
      status: "survived",
      result: {
        status: "survived",
        expectedMutantFailures: ["check-caa-per-name-binding", "check-caa-safe-issuance"],
        observedMutantFailures: ["check-caa-per-name-binding", "check-caa-safe-issuance"],
        mechanismActivated: true,
        witnessIsolated: true,
        deterministicReplay: true,
        challengeNonleakage: true,
        b6: {
          sameInvocation: true,
          usable: true,
          knownGoodPassed: true,
          knownBadFailed: true,
          malformedInputRefused: true,
          nondegenerate: true,
        },
      },
    });
    expect(run.probes.filter((probe) => probe.status === "not-run-reader-killed")).toHaveLength(3);
  });
});
