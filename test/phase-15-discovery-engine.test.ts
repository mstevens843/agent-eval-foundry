import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PHASE15_PREREGISTRATION_SHA256,
  PHASE15_READER_REVIEWS_SHA256,
  PHASE15_SOURCE_CORPUS_SHA256,
  auditPhase15Source,
  loadPhase15Preregistration,
  loadPhase15SourceCorpus,
} from "../src/phase-15/corpus.js";
import { runPhase15Discovery } from "../src/phase-15/discovery.js";
import { runLayeredContractProbe, runRegexComplexityProbe } from "../src/phase-15/probes.js";
import { DISCOVERY_CHANNELS } from "../src/phase-15/types.js";
import { renderPhase15DiscoveryEngine } from "../src/reports/phase-15-discovery-engine.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("Phase 15 frozen corpus and adapters", () => {
  it("pins the preregistration before prospective source acquisition", () => {
    const bytes = readFileSync(`${ROOT}/data/phase-15-preregistration.json`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(PHASE15_PREREGISTRATION_SHA256);
    expect(
      createHash("sha256")
        .update(readFileSync(`${ROOT}/data/phase-15-source-corpus.json`))
        .digest("hex"),
    ).toBe(PHASE15_SOURCE_CORPUS_SHA256);
    expect(
      createHash("sha256")
        .update(readFileSync(`${ROOT}/data/phase-15-reader-reviews.json`))
        .digest("hex"),
    ).toBe(PHASE15_READER_REVIEWS_SHA256);
    const registration = loadPhase15Preregistration(ROOT);
    expect(registration.immutability.runId).toBe("phase15-bounded-corpus-v1");
    expect(new Set(registration.channelsImplemented)).toEqual(new Set(DISCOVERY_CHANNELS));
    expect(registration.sourceCorpus).toHaveLength(6);
    expect(registration.sourceCorpus.filter((source) => source.role === "prospective")).toHaveLength(4);
    expect(registration.limits).toMatchObject({
      patternsPerSourceUnit: 1,
      readerReviewsPerCandidate: 2,
      paidSubjectTrials: 0,
    });
  });

  it("normalizes all source channels without coupling adapters to ranking", () => {
    const registration = loadPhase15Preregistration(ROOT);
    const corpus = loadPhase15SourceCorpus(ROOT, registration);
    expect(new Set(registration.sourceCorpus.map((source) => source.channel))).toEqual(
      new Set([
        "benchmark-trajectory-solve-patch",
        "verifier-repair-bypass",
        "agent-self-check-failure",
        "known-hard-benchmark",
        "authoritative-incident-upstream-fix",
      ]),
    );
    expect(registration.schema).toBe("agent-eval-foundry/phase-15-discovery-preregistration@1");
    expect(corpus.sources.every((source) => auditPhase15Source(ROOT, source).valid)).toBe(true);
    const trialAudits = corpus.sources
      .filter((source) => source.adapter === "trial-directory-snapshot")
      .map((source) => auditPhase15Source(ROOT, source));
    expect(trialAudits.map((audit) => audit.sourceFamilyId)).toEqual([
      "ui-replay-live-dom",
      "checker-required-memory-poisoning",
    ]);
  });

  it("rejects stale local and incident evidence snapshots", () => {
    const corpus = loadPhase15SourceCorpus(ROOT);
    for (const sourceUnitId of ["outbox-verifier-repairs", "cloudflare-2019-regex-outage"]) {
      const source = corpus.sources.find((row) => row.sourceUnitId === sourceUnitId);
      expect(source).toBeDefined();
      if (source === undefined) continue;
      expect(
        auditPhase15Source(ROOT, {
          ...source,
          provenance: { ...source.provenance, contentDigest: "0".repeat(64) },
        }).valid,
      ).toBe(false);
    }
  });
});

describe("Phase 15 prospective discovery run", () => {
  it("does not inflate candidates from retrospective, mixed or uncountable evidence", () => {
    const run = runPhase15Discovery(ROOT);
    expect(run.summary).toMatchObject({
      sourceUnits: 6,
      prospectiveSourceUnits: 4,
      prospectivePatterns: 4,
      candidateDrafts: 2,
      semanticDuplicates: 1,
      readerCandidates: 1,
    });
    expect(run.provenance.map((source) => [source.sourceUnitId, source.extractionStatus])).toEqual([
      ["outbox-verifier-repairs", "retrospective-excluded"],
      ["outbox-self-check-trajectories", "retrospective-excluded"],
      ["live-dom-counted-failure", "deduplicated-existing"],
      ["checker-required-counted-failure", "ineligible-evidence"],
      ["terminal-bench-rs-archive-clone", "ineligible-evidence"],
      ["cloudflare-2019-regex-outage", "candidate-drafted"],
    ]);
    const duplicate = run.candidates.find(
      (candidate) => candidate.candidateId === "controller-rebinding-replay",
    );
    expect(duplicate).toMatchObject({
      semanticNovelty: false,
      duplicateOf: "ui-replay-live-dom",
      queueStatus: "deduplicated",
    });
    expect(
      run.provenance.find((source) => source.sourceUnitId === "live-dom-counted-failure")
        ?.existingFamilyEquivalence,
    ).toMatchObject({
      familyId: "ui-replay-live-dom",
      sameFailureAxis: true,
      sameSubjectActionContract: true,
    });
  });

  it("uses Phase 14 nulls as zero uplift rather than inherited hardness", () => {
    const run = runPhase15Discovery(ROOT);
    const assessments = run.candidates.flatMap((candidate) => candidate.applicableOperators);
    expect(assessments.filter((row) => row.status === "phase14-measured-positive")).toEqual([]);
    expect(
      assessments
        .filter((row) => row.status === "phase14-measured-null")
        .every((row) => row.estimate === 0 && row.rankingDelta === 0),
    ).toBe(true);
    expect(
      run.candidates.find((candidate) => candidate.candidateId === "waf-semantic-complexity-repair"),
    ).toMatchObject({ engineScore: 90, semanticNovelty: true, queueStatus: "reader-review" });
  });

  it("keeps scores, rationale, predictions and peer verdicts out of reader packets", () => {
    const run = runPhase15Discovery(ROOT);
    expect(run.readerPackets).toHaveLength(1);
    const packet = run.readerPackets[0];
    expect(packet?.packetSha256).toBe("da42ce85b2f4159a1fc3505134d0a66ccf5475f86086b99af131244305f1e296");
    expect(packet?.noveltyBaseline.length).toBeGreaterThan(10);
    const bytes = JSON.stringify(packet);
    expect(bytes).not.toContain("engineScore");
    expect(bytes).not.toContain("authorRationale");
    expect(bytes).not.toContain("predictions");
    expect(bytes).not.toContain("reader-a");
    expect(bytes).not.toContain("reader-b");
  });

  it("honors the unanimous-reader gate and does not probe a rejected candidate", () => {
    const run = runPhase15Discovery(ROOT);
    expect(run.reviews).toHaveLength(2);
    expect(run.readerDecisions).toEqual([
      expect.objectContaining({
        candidateId: "waf-semantic-complexity-repair",
        reviewsReceived: 2,
        providerFamilies: ["openai"],
        unanimous: false,
        verdict: "killed",
      }),
    ]);
    expect(run.probes).toEqual([
      expect.objectContaining({
        candidateId: "waf-semantic-complexity-repair",
        status: "not-run",
        mechanismActivated: false,
      }),
    ]);
    expect(run.summary.predictionOutcomes).toEqual({
      patternsExtracted: "met",
      candidateDrafts: "falsified",
      unanimousReaderSurvivors: "falsified",
      probeSurvivors: "falsified",
    });
    expect(run.summary).toMatchObject({ domainBreadth: 4, failureAxisBreadth: 4 });
    expect(run.comparison.find((row) => row.method === "evidence-mined-v2")).toMatchObject({
      domainBreadth: 2,
      failureAxes: 2,
    });
    expect(run.comparison.find((row) => row.method === "author-generation")).toMatchObject({
      domainBreadth: 5,
      failureAxes: 1,
    });
    expect(run.comparison.find((row) => row.method === "author-generation")?.modelReads).toBe(7);
    expect(run.conclusion).toMatch(/screening instrument/);
  });
});

describe("Phase 15 cheap-probe rigs", () => {
  it("makes the incident-derived complexity mechanism falsifiable under B6", () => {
    const result = runRegexComplexityProbe("waf-semantic-complexity-repair");
    expect(result).toMatchObject({
      status: "survived",
      mechanismActivated: true,
      witnessIsolated: true,
      b6: {
        usable: true,
        knownGoodPassed: true,
        knownBadFailed: true,
        malformedInputRefused: true,
        sameInvocation: true,
      },
    });
    expect(result.observations.mutantHeldOutOperations).toBeGreaterThan(
      result.observations.referenceHeldOutOperations as number,
    );
    expect(result.observations.heldOutConformsToPublicGrammar).toBe(true);
  });

  it("distinguishes composed contracts from isolated single-layer examples", () => {
    expect(runLayeredContractProbe("wal-recovery-cleanroom-clone")).toMatchObject({
      status: "survived",
      mechanismActivated: true,
      witnessIsolated: true,
      b6: {
        usable: true,
        knownGoodPassed: true,
        knownBadFailed: true,
        malformedInputRefused: true,
      },
    });
  });
});

describe("Phase 15 generated report", () => {
  it("reports zero prospective yield without erasing the useful failure", () => {
    const report = renderPhase15DiscoveryEngine(ROOT);
    expect(report).toContain("The foundry remains a screening instrument on this run");
    expect(report).toContain("fairness");
    expect(report).toContain("0.0%");
    expect(report).toContain("not finite: no probe survivor");
    expect(report).toContain("one provider family");
    expect(report).toContain("no agent difficulty or shipped-family claim");
  });
});
