import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseHardnessOperatorLedger } from "../foundry/hardness-ledger.js";
import { loadRegistry } from "../foundry/load.js";
import { frozenNoveltyBaseline } from "../phase-17/frozen-novelty-baseline.js";
import {
  PHASE15_PREREGISTRATION_SHA256,
  PHASE15_READER_REVIEWS_SHA256,
  PHASE15_SOURCE_CORPUS_SHA256,
  auditPhase15Source,
  loadPhase15Preregistration,
  loadPhase15ReaderReviews,
  loadPhase15SourceCorpus,
  phase15Sha256,
} from "./corpus.js";
import { runPhase15Probe } from "./probes.js";
import type {
  CandidateReaderDecision,
  DiscoveryMethodComparison,
  OperatorAssessment,
  Phase15Candidate,
  Phase15DiscoveryRun,
  Phase15ProbeResult,
  Phase15ProvenanceRecord,
  Phase15ReaderPacket,
  Phase15ReaderReview,
  SourceCorpusRow,
} from "./types.js";

interface Phase14Estimate {
  readonly estimandId: string;
  readonly status: string;
  readonly estimate: number | null;
}

interface Phase14EffectInput {
  readonly estimates: readonly Phase14Estimate[];
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8")) as unknown;

const object = (value: unknown, path: string): Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path}: expected object`);
  }
  return value as Record<string, unknown>;
};

const array = (value: unknown, path: string): readonly unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${path}: expected array`);
  return value;
};

const number = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${path}: expected number`);
  return value;
};

const integer = (value: unknown, path: string): number => {
  const parsed = number(value, path);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${path}: expected non-negative integer`);
  return parsed;
};

const text = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${path}: expected text`);
  return value;
};

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const semanticFingerprint = (source: SourceCorpusRow): string =>
  createHash("sha256")
    .update(
      [normalize(source.extraction.failureAxis), normalize(source.extraction.subjectActionContract)].join(
        "|",
      ),
    )
    .digest("hex");

const candidateId = (source: SourceCorpusRow): string =>
  ({
    "live-dom-counted-failure": "controller-rebinding-replay",
    "checker-required-counted-failure": "dual-implementation-protocol-repair",
    "terminal-bench-rs-archive-clone": "wal-recovery-cleanroom-clone",
    "cloudflare-2019-regex-outage": "waf-semantic-complexity-repair",
  })[source.sourceUnitId] ?? normalize(source.extraction.candidateSubstrate ?? source.sourceUnitId);

const title = (source: SourceCorpusRow): string =>
  ({
    "live-dom-counted-failure": "Controller replay across resource replacement",
    "checker-required-counted-failure": "Dual-implementation protocol repair",
    "terminal-bench-rs-archive-clone": "Page-and-WAL recovery cleanroom clone",
    "cloudflare-2019-regex-outage": "WAF semantic and complexity repair",
  })[source.sourceUnitId] ??
  source.extraction.candidateSubstrate ??
  source.sourceUnitId;

const loadPhase14Effects = (root: string): Phase14EffectInput => {
  const path = join(root, "data", "phase-14-effect-ledger.json");
  const top = object(readJson(path), path);
  const estimates = array(top.estimates, `${path}.estimates`).map((item, index): Phase14Estimate => {
    const row = object(item, `${path}.estimates[${index}]`);
    return {
      estimandId: text(row.estimandId, `${path}.estimates[${index}].estimandId`),
      status: text(row.status, `${path}.estimates[${index}].status`),
      estimate: row.estimate === null ? null : number(row.estimate, `${path}.estimates[${index}].estimate`),
    };
  });
  return { estimates };
};

const OPERATOR_ESTIMANDS: Readonly<Record<string, string>> = {
  "narrow-recompute-starter": "E2-starter",
  "committed-idempotency-authority": "E3-activation",
  "recompute-activation-concentration": "E4-selection",
  "fuzz-controlling-parameter": "E4-selection",
};

const operatorAssessments = (
  source: SourceCorpusRow,
  effects: Phase14EffectInput,
  operatorCategories: ReadonlyMap<string, string>,
): readonly OperatorAssessment[] =>
  source.extraction.applicableOperators.map((operatorId) => {
    const category = operatorCategories.get(operatorId);
    if (category === undefined) throw new Error(`Phase 15 source references unknown operator ${operatorId}`);
    if (category === "validity-control") {
      return {
        operatorId,
        status: "validity-control-only" as const,
        phase14Estimand: null,
        estimate: null,
        rankingDelta: 0,
        reason:
          "Validity controls determine whether reward means anything; they never receive difficulty uplift.",
      };
    }
    const estimandId = OPERATOR_ESTIMANDS[operatorId];
    if (estimandId === undefined) {
      return {
        operatorId,
        status: "unmeasured-hypothesis" as const,
        phase14Estimand: null,
        estimate: null,
        rankingDelta: 0,
        reason: "No Phase 14 agent-effect estimand maps to this operator.",
      };
    }
    const effect = effects.estimates.find((row) => row.estimandId === estimandId);
    if (effect === undefined || effect.estimate === null || effect.status === "not-estimable") {
      return {
        operatorId,
        status: "phase14-not-estimable" as const,
        phase14Estimand: estimandId,
        estimate: null,
        rankingDelta: 0,
        reason: "Phase 14 registered this contrast but did not identify an agent effect.",
      };
    }
    const status =
      effect.estimate > 0
        ? ("phase14-measured-positive" as const)
        : effect.estimate < 0
          ? ("phase14-measured-negative" as const)
          : ("phase14-measured-null" as const);
    return {
      operatorId,
      status,
      phase14Estimand: estimandId,
      estimate: effect.estimate,
      rankingDelta: Math.max(-10, Math.min(10, effect.estimate * 10)),
      reason:
        effect.estimate === 0
          ? `Phase 14 ${estimandId} measured a descriptive 0.000 effect; no difficulty credit is awarded.`
          : `Phase 14 ${estimandId} measured ${effect.estimate.toFixed(3)}; ranking delta is capped at +/-10.`,
    };
  });

const candidateFrom = (
  source: SourceCorpusRow,
  duplicateOf: string | null,
  effects: Phase14EffectInput,
  operatorCategories: ReadonlyMap<string, string>,
): Phase15Candidate => {
  if (source.extraction.candidateSubstrate === null || source.extraction.cheapProbe === null) {
    throw new Error(`${source.sourceUnitId}: eligible candidate lacks substrate or cheap probe`);
  }
  const applicableOperators = operatorAssessments(source, effects, operatorCategories);
  const measuredOperatorUplift = applicableOperators.reduce((sum, row) => sum + row.rankingDelta, 0);
  const semanticNovelty = duplicateOf === null;
  const scoreBreakdown = {
    sourceEvidence: source.evidence.countable ? 25 : 10,
    causalSpecificity: source.evidence.observedFailure.length > 0 ? 20 : 0,
    structuralBoundary: source.extraction.authorityBoundary.subjectCanCross ? 0 : 15,
    naturalContract: source.extraction.subjectActionContract.length > 0 ? 10 : 0,
    cheapProbe: 10,
    novelty: semanticNovelty ? 10 : 0,
    measuredOperatorUplift,
  };
  const engineScore = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
  return {
    candidateId: candidateId(source),
    sourceUnitId: source.sourceUnitId,
    channel: source.channel,
    title: title(source),
    domain: source.extraction.candidateSubstrate,
    affectedLayer: source.extraction.affectedLayer,
    failureAxis: source.extraction.failureAxis,
    observedFailure: source.evidence.observedFailure,
    transferableMechanism: source.extraction.transferableMechanism,
    subjectActionContract: source.extraction.subjectActionContract,
    authorityBoundary: source.extraction.authorityBoundary,
    applicableOperators,
    validityRisks: source.extraction.validityRisks,
    cheapProbe: source.extraction.cheapProbe,
    semanticFingerprint: semanticFingerprint(source),
    semanticNovelty,
    duplicateOf,
    engineScore,
    scoreBreakdown,
    queueStatus: semanticNovelty ? "reader-review" : "deduplicated",
    queueReason: semanticNovelty
      ? "Eligible source evidence, structural boundary and a new causal axis; independent reading required."
      : `The proposal carries the same causal axis and action contract as ${duplicateOf}; a new domain is not novelty.`,
  };
};

interface ExtractionBuild {
  readonly provenance: readonly Phase15ProvenanceRecord[];
  readonly candidates: readonly Phase15Candidate[];
}

const buildExtractions = (root: string): ExtractionBuild => {
  const preregistration = loadPhase15Preregistration(root);
  const corpus = loadPhase15SourceCorpus(root, preregistration);
  const effects = loadPhase14Effects(root);
  const ledger = parseHardnessOperatorLedger(readJson(join(root, "data", "hardness-operators.json")));
  const operatorCategories = new Map(ledger.operators.map((operator) => [operator.id, operator.category]));
  const registeredFamilyIds = new Set(loadRegistry(root).shapes.map((shape) => shape.familyId));
  const drafts: Phase15Candidate[] = [];
  const provenance: Phase15ProvenanceRecord[] = [];
  const fingerprints = new Map<string, string>();

  for (const source of corpus.sources) {
    const adapterAudit = auditPhase15Source(root, source);
    const fingerprint = semanticFingerprint(source);
    let duplicateOf: string | null = null;
    let extractionStatus: Phase15ProvenanceRecord["extractionStatus"];
    let extractionReason: string;

    if (source.role !== "prospective") {
      extractionStatus = "retrospective-excluded";
      extractionReason = source.extraction.eligibility.reason;
    } else if (
      !adapterAudit.valid ||
      !source.extraction.eligibility.eligible ||
      source.extraction.candidateSubstrate === null ||
      source.extraction.cheapProbe === null
    ) {
      extractionStatus = "ineligible-evidence";
      extractionReason = !adapterAudit.valid
        ? `Source adapter failed: ${adapterAudit.checks.join("; ")}`
        : source.extraction.eligibility.reason;
    } else {
      const equivalence = source.extraction.existingFamilyEquivalence;
      if (equivalence !== null) {
        if (!registeredFamilyIds.has(equivalence.familyId)) {
          throw new Error(`${source.sourceUnitId}: semantic equivalence names an unknown family`);
        }
        if (equivalence.sameFailureAxis && equivalence.sameSubjectActionContract) {
          duplicateOf = equivalence.familyId;
        }
      }
      if (duplicateOf === null) duplicateOf = fingerprints.get(fingerprint) ?? null;
      const candidate = candidateFrom(source, duplicateOf, effects, operatorCategories);
      drafts.push(candidate);
      if (candidate.semanticNovelty) {
        fingerprints.set(fingerprint, candidate.candidateId);
        extractionStatus = "candidate-drafted";
        extractionReason = candidate.queueReason;
      } else {
        extractionStatus = "deduplicated-existing";
        extractionReason = candidate.queueReason;
      }
    }

    provenance.push({
      sourceUnitId: source.sourceUnitId,
      role: source.role,
      channel: source.channel,
      sourceLocator: source.provenance.locator,
      sourceRevision: source.provenance.revision,
      sourceDigest: source.provenance.contentDigest,
      digestAlgorithm: source.provenance.digestAlgorithm,
      sourceSnapshotPath: source.provenance.snapshotPath,
      primarySource: source.provenance.primary,
      evidenceClass: source.evidence.class,
      countable: source.evidence.countable,
      countabilityReason: source.evidence.countabilityReason,
      observedFailure: source.evidence.observedFailure,
      measurements: source.evidence.measurements,
      evidenceLocations: source.evidence.locations,
      affectedLayer: source.extraction.affectedLayer,
      failureAxis: source.extraction.failureAxis,
      transferableMechanism: source.extraction.transferableMechanism,
      candidateSubstrate: source.extraction.candidateSubstrate,
      existingFamilyEquivalence: source.extraction.existingFamilyEquivalence,
      applicableOperators: source.extraction.applicableOperators,
      validityRisks: source.extraction.validityRisks,
      cheapProbe: source.extraction.cheapProbe,
      adapterAudit,
      extractionStatus,
      extractionReason,
      semanticFingerprint: fingerprint,
      duplicateOf,
    });
  }
  if (drafts.length > preregistration.limits.prospectiveCandidateDrafts) {
    throw new Error("Phase 15 exceeded the registered candidate-draft cap");
  }
  return { provenance, candidates: drafts };
};

const packetFor = (
  candidate: Phase15Candidate,
  source: Phase15ProvenanceRecord,
  blindedTo: readonly string[],
  requiredDimensions: readonly string[],
  noveltyBaseline: Phase15ReaderPacket["noveltyBaseline"],
): Phase15ReaderPacket => {
  const base = {
    schema: "agent-eval-foundry/phase-15-reader-packet@1" as const,
    candidateId: candidate.candidateId,
    blindedTo,
    reviewQuestion:
      "Would this evidence-backed proposal be fair, natural, structurally witness-isolated, semantically novel, and worth its registered cheap probe? Kill on the earliest failed dimension.",
    requiredDimensions,
    noveltyBaseline,
    source: {
      channel: source.channel,
      locator: source.sourceLocator,
      revision: source.sourceRevision,
      evidenceClass: source.evidenceClass,
      countable: source.countable,
      countabilityReason: source.countabilityReason,
      observedFailure: source.observedFailure,
      measurements: source.measurements,
      evidenceLocations: source.evidenceLocations,
    },
    proposal: {
      title: candidate.title,
      domain: candidate.domain,
      affectedLayer: candidate.affectedLayer,
      failureAxis: candidate.failureAxis,
      transferableMechanism: candidate.transferableMechanism,
      subjectActionContract: candidate.subjectActionContract,
      authorityBoundary: candidate.authorityBoundary,
      applicableOperators: candidate.applicableOperators.map((operator) => ({
        operatorId: operator.operatorId,
        evidenceStatus: operator.status,
      })),
      validityRisks: candidate.validityRisks,
      cheapProbe: candidate.cheapProbe,
    },
  };
  return { ...base, packetSha256: phase15Sha256(base) };
};

const validateReviews = (
  root: string,
  reviews: readonly Phase15ReaderReview[],
  packets: readonly Phase15ReaderPacket[],
  preregistration: ReturnType<typeof loadPhase15Preregistration>,
): void => {
  if (reviews.length > preregistration.limits.readerReviews) {
    throw new Error("Phase 15 exceeded the registered reader-review cap");
  }
  const reviewIds = reviews.map((review) => review.reviewId);
  if (new Set(reviewIds).size !== reviewIds.length)
    throw new Error("Phase 15 reader review ids are not unique");
  const sessionIds = reviews.map((review) => review.sessionId);
  if (new Set(sessionIds).size !== sessionIds.length)
    throw new Error("Phase 15 reader sessions are not unique");
  const rawOutputDigests = reviews.map((review) => review.rawOutputSha256);
  if (new Set(rawOutputDigests).size !== rawOutputDigests.length)
    throw new Error("Phase 15 independent reviews reuse the same raw output");
  const priced = reviews.reduce((sum, review) => sum + (review.costUsd ?? 0), 0);
  if (priced > preregistration.limits.modelReadBudgetUsd) {
    throw new Error("Phase 15 reader spend exceeded the registered model-read budget");
  }
  for (const review of reviews) {
    const packet = packets.find((item) => item.candidateId === review.candidateId);
    if (packet === undefined) throw new Error(`${review.reviewId}: review has no eligible reader packet`);
    if (review.packetSha256 !== packet.packetSha256) throw new Error(`${review.reviewId}: stale packet hash`);
    if (!review.independentlyProduced) throw new Error(`${review.reviewId}: review is not independent`);
    if (!review.rawOutputPath.startsWith("data/phase-15-reader-raw/")) {
      throw new Error(`${review.reviewId}: raw output path must stay in the Phase 15 evidence directory`);
    }
    const rawBytes = readFileSync(join(root, review.rawOutputPath));
    const rawDigest = createHash("sha256").update(rawBytes).digest("hex");
    if (rawDigest !== review.rawOutputSha256)
      throw new Error(`${review.reviewId}: raw output digest mismatch`);
    const raw = object(JSON.parse(rawBytes.toString("utf8")) as unknown, review.rawOutputPath);
    const rawKeys = Object.keys(raw).sort();
    const expectedRawKeys = ["dimensions", "earliestFailedDimension", "rationale", "verdict"];
    if (JSON.stringify(rawKeys) !== JSON.stringify(expectedRawKeys)) {
      throw new Error(`${review.reviewId}: raw output differs from the registered output schema`);
    }
    if (
      JSON.stringify(raw.dimensions) !== JSON.stringify(review.dimensions) ||
      raw.verdict !== review.verdict ||
      raw.rationale !== review.rationale ||
      raw.earliestFailedDimension !== review.earliestFailedDimension
    ) {
      throw new Error(`${review.reviewId}: normalized review differs from preserved raw output`);
    }
    for (const blind of preregistration.readerProtocol.blindedTo) {
      if (!review.blindedTo.includes(blind)) throw new Error(`${review.reviewId}: missing blind ${blind}`);
    }
    const keys = Object.keys(review.dimensions).sort();
    const required = [...preregistration.readerProtocol.requiredPassDimensions].sort();
    if (JSON.stringify(keys) !== JSON.stringify(required)) {
      throw new Error(`${review.reviewId}: review dimensions differ from preregistration`);
    }
    const allPass = Object.values(review.dimensions).every((verdict) => verdict === "pass");
    if ((review.verdict === "promote") !== allPass) {
      throw new Error(`${review.reviewId}: promote requires every dimension to pass`);
    }
    if (review.verdict === "kill" && review.earliestFailedDimension === null) {
      throw new Error(`${review.reviewId}: killed review must name its earliest failed dimension`);
    }
  }
  for (const packet of packets) {
    const rows = reviews.filter((review) => review.candidateId === packet.candidateId);
    if (rows.length > preregistration.limits.readerReviewsPerCandidate) {
      throw new Error(`${packet.candidateId}: too many reader reviews`);
    }
    const readers = rows.map((review) => review.readerId);
    if (new Set(readers).size !== readers.length)
      throw new Error(`${packet.candidateId}: duplicate reader identity`);
  }
};

const readerDecision = (
  candidateIdValue: string,
  reviews: readonly Phase15ReaderReview[],
  required: number,
): CandidateReaderDecision => {
  const rows = reviews.filter((review) => review.candidateId === candidateIdValue);
  const reasons = rows.map((review) => `${review.readerId}: ${review.verdict} - ${review.rationale}`);
  const killed = rows.some((review) => review.verdict === "kill");
  const unanimous =
    rows.length >= required && rows.slice(0, required).every((review) => review.verdict === "promote");
  return {
    candidateId: candidateIdValue,
    required,
    reviewsReceived: rows.length,
    providerFamilies: [...new Set(rows.map((review) => review.providerFamily))].sort(),
    unanimous,
    verdict: killed ? "killed" : unanimous ? "survived" : "pending",
    reasons,
  };
};

const notRunProbe = (candidate: Phase15Candidate, reason: string): Phase15ProbeResult => ({
  candidateId: candidate.candidateId,
  probeType: candidate.cheapProbe.probeType,
  status: "not-run",
  reason,
  b6: {
    usable: false,
    knownGoodPassed: false,
    knownBadFailed: false,
    malformedInputRefused: false,
    sameInvocation: false,
    reasons: [reason],
  },
  mechanismActivated: false,
  witnessIsolated: false,
  observations: {},
});

const buildProbes = (
  candidates: readonly Phase15Candidate[],
  decisions: readonly CandidateReaderDecision[],
  limit: number,
): readonly Phase15ProbeResult[] => {
  let run = 0;
  return candidates
    .filter((candidate) => candidate.queueStatus === "reader-review")
    .map((candidate) => {
      const decision = decisions.find((item) => item.candidateId === candidate.candidateId);
      if (decision?.verdict === "killed") return notRunProbe(candidate, "Stopped after reader rejection.");
      if (decision?.verdict !== "survived")
        return notRunProbe(candidate, "Awaiting unanimous reader survival.");
      if (run >= limit) return notRunProbe(candidate, "Registered cheap-probe cap reached.");
      run += 1;
      return runPhase15Probe(candidate);
    });
};

const comparisonRows = (
  root: string,
  run: {
    readonly prospectiveSources: number;
    readonly candidates: readonly Phase15Candidate[];
    readonly decisions: readonly CandidateReaderDecision[];
    readonly probes: readonly Phase15ProbeResult[];
    readonly reviews: readonly Phase15ReaderReview[];
  },
): readonly DiscoveryMethodComparison[] => {
  const phase11 = object(readJson(join(root, "data", "phase-11-results.json")), "phase-11-results");
  const discovery = object(phase11.discovery, "phase-11-results.discovery");
  const systems = array(discovery.systems, "phase-11-results.discovery.systems");
  const phase14 = object(readJson(join(root, "data", "phase-14-trial-ledger.json")), "phase-14-trials");
  const phase14Summary = object(phase14.summary, "phase-14-trials.summary");
  const drafted = run.candidates.length;
  const readerSurvivors = run.decisions.filter((decision) => decision.verdict === "survived").length;
  const probesRun = run.probes.filter((probe) => probe.status !== "not-run").length;
  const probeSurvivors = run.probes.filter((probe) => probe.status === "survived").length;
  return [
    {
      method: "evidence-mined-v2",
      systemsRead: run.prospectiveSources,
      candidatesDrafted: drafted,
      readerReviewed: run.decisions.filter((decision) => decision.reviewsReceived > 0).length,
      readerSurvivors,
      probeRun: probesRun,
      probeSurvivors,
      novelSurvivors: run.probes.filter((probe) => probe.status === "survived").length,
      domainBreadth: new Set(run.candidates.map((candidate) => candidate.domain)).size,
      failureAxes: new Set(run.candidates.map((candidate) => candidate.failureAxis)).size,
      modelReads: run.reviews.length,
      modelTokens: run.reviews.reduce((sum, review) => sum + review.tokensUsed, 0),
      pricedUsd: run.reviews.reduce((sum, review) => sum + (review.costUsd ?? 0), 0),
      unpricedCost: `${run.prospectiveSources} bounded source units; ${run.reviews.filter((review) => review.costUsd === null).length} unpriced independent reads`,
      claimBoundary: "Prospective source-to-probe yield only; no agent difficulty or shipped-family claim.",
    },
    {
      method: "transfer-based",
      systemsRead: 3,
      candidatesDrafted: 3,
      readerReviewed: 0,
      readerSurvivors: 0,
      probeRun: 3,
      probeSurvivors: 3,
      novelSurvivors: 0,
      domainBreadth: 3,
      failureAxes: 1,
      modelReads: integer(phase14Summary.attempted, "phase-14-trials.summary.attempted"),
      modelTokens: 0,
      pricedUsd: number(
        phase14Summary.pricedCampaignSpendUsd,
        "phase-14-trials.summary.pricedCampaignSpendUsd",
      ),
      unpricedCost: `${integer(phase14Summary.unpricedAttempts, "phase-14-trials.summary.unpricedAttempts")} unpriced agent attempts`,
      claimBoundary:
        "Three local mutant transfers survived, but 8/8 countable agents solved and strict axis novelty is zero.",
    },
    {
      method: "boundary-first",
      systemsRead: integer(discovery.systemsSearched, "phase-11-results.discovery.systemsSearched"),
      candidatesDrafted: integer(discovery.draftedCandidates, "phase-11-results.discovery.draftedCandidates"),
      readerReviewed: systems.filter((item) => object(item, "phase-11 system").draftedCandidate === true)
        .length,
      readerSurvivors: integer(discovery.survivors, "phase-11-results.discovery.survivors"),
      probeRun: 0,
      probeSurvivors: 0,
      novelSurvivors: 0,
      domainBreadth: 1,
      failureAxes: 1,
      modelReads: integer(
        discovery.independentReaderPasses,
        "phase-11-results.discovery.independentReaderPasses",
      ),
      modelTokens: 0,
      pricedUsd: 0,
      unpricedCost: `${integer(discovery.documentsRead, "phase-11-results.discovery.documentsRead")} documents / ${integer(discovery.sectionsRead, "phase-11-results.discovery.sectionsRead")} sections`,
      claimBoundary: "Registered search: one draft, killed by both readers, zero survivors.",
    },
    {
      method: "author-generation",
      systemsRead: 0,
      candidatesDrafted: 5,
      readerReviewed: 5,
      readerSurvivors: 0,
      probeRun: 0,
      probeSurvivors: 0,
      novelSurvivors: 0,
      domainBreadth: 5,
      failureAxes: 1,
      modelReads: 7,
      modelTokens: 0,
      pricedUsd: 0,
      unpricedCost:
        "Seven independent reads (three for the Phase 8 candidate, one each for four Phase 9 candidates); generation time was not measured.",
      claimBoundary:
        "Historical 0-for-5: every author-generated candidate lacked a structural witness boundary.",
    },
  ];
};

const predictionOutcome = (
  actual: number,
  predicted: number,
  complete = true,
): "met" | "falsified" | "pending" => (complete ? (actual === predicted ? "met" : "falsified") : "pending");

export function runPhase15Discovery(root: string): Phase15DiscoveryRun {
  const preregistration = loadPhase15Preregistration(root);
  const corpus = loadPhase15SourceCorpus(root, preregistration);
  const extracted = buildExtractions(root);
  const queued = extracted.candidates.filter((candidate) => candidate.queueStatus === "reader-review");
  const sourceById = new Map(extracted.provenance.map((source) => [source.sourceUnitId, source]));
  const readerPackets = queued.map((candidate) => {
    const source = sourceById.get(candidate.sourceUnitId);
    if (source === undefined) throw new Error(`${candidate.candidateId}: source provenance missing`);
    return packetFor(
      candidate,
      source,
      preregistration.readerProtocol.blindedTo,
      preregistration.readerProtocol.requiredPassDimensions,
      frozenNoveltyBaseline(root),
    );
  });
  const reviewLedger = loadPhase15ReaderReviews(root);
  if (reviewLedger.runId !== preregistration.immutability.runId) {
    throw new Error("Phase 15 review ledger runId differs from preregistration");
  }
  validateReviews(root, reviewLedger.reviews, readerPackets, preregistration);
  const readerDecisions = queued.map((candidate) =>
    readerDecision(
      candidate.candidateId,
      reviewLedger.reviews,
      preregistration.limits.readerReviewsPerCandidate,
    ),
  );
  const probes = buildProbes(extracted.candidates, readerDecisions, preregistration.limits.cheapProbes);
  const prospective = extracted.provenance.filter((source) => source.role === "prospective");
  const readerSurvivors = readerDecisions.filter((decision) => decision.verdict === "survived").length;
  const probeSurvivors = probes.filter((probe) => probe.status === "survived").length;
  const reviewsComplete = readerDecisions.every((decision) => decision.verdict !== "pending");
  const probesComplete =
    reviewsComplete &&
    probes.every(
      (probe) =>
        probe.status !== "not-run" ||
        readerDecisions.some(
          (decision) => decision.candidateId === probe.candidateId && decision.verdict === "killed",
        ),
    );
  const comparison = comparisonRows(root, {
    prospectiveSources: prospective.length,
    candidates: extracted.candidates,
    decisions: readerDecisions,
    probes,
    reviews: reviewLedger.reviews,
  });
  const costPerSurvivor =
    probeSurvivors === 0
      ? "not finite: no probe survivor"
      : `${(prospective.length / probeSurvivors).toFixed(1)} source units and ${(reviewLedger.reviews.length / probeSurvivors).toFixed(1)} model reads per probe survivor`;
  const conclusion = !reviewsComplete
    ? "The prospective run is registered and extracted, but independent reading is incomplete; discovery yield is not yet measured."
    : probeSurvivors > 0
      ? `Evidence mining produced ${probeSurvivors} novel reader-and-probe survivor from ${prospective.length} prospective source units. The foundry has demonstrated candidate discovery at the cheap-probe boundary, not hard-task or capability yield.`
      : "No prospective candidate cleared independent reading, so none was eligible for its cheap probe. The foundry remains a screening instrument on this run.";
  return {
    schema: "agent-eval-foundry/phase-15-discovery-run@1",
    runId: preregistration.immutability.runId,
    preregistrationSha256: PHASE15_PREREGISTRATION_SHA256,
    sourceCorpusSha256: PHASE15_SOURCE_CORPUS_SHA256,
    readerReviewsSha256: PHASE15_READER_REVIEWS_SHA256,
    preregistrationBaselineCommit: preregistration.baselineCommit,
    provenance: extracted.provenance,
    candidates: extracted.candidates,
    readerPackets,
    reviews: reviewLedger.reviews,
    readerDecisions,
    probes,
    comparison,
    summary: {
      sourceUnits: extracted.provenance.length,
      prospectiveSourceUnits: prospective.length,
      prospectivePatterns: prospective.length,
      candidateDrafts: extracted.candidates.length,
      semanticDuplicates: extracted.candidates.filter((candidate) => !candidate.semanticNovelty).length,
      readerCandidates: queued.length,
      readerSurvivors,
      probeSurvivors,
      domainBreadth: new Set(
        prospective.flatMap((source) =>
          source.candidateSubstrate === null ? [] : [source.candidateSubstrate],
        ),
      ).size,
      failureAxisBreadth: new Set(prospective.map((source) => source.failureAxis)).size,
      prospectiveYieldPerSource: probeSurvivors / prospective.length,
      discoveryCostPerSurvivor: costPerSurvivor,
      predictionOutcomes: {
        patternsExtracted: predictionOutcome(
          prospective.length,
          preregistration.predictions.patternsExtractedFromProspectiveSources,
        ),
        candidateDrafts: predictionOutcome(
          extracted.candidates.length,
          preregistration.predictions.candidateDrafts,
        ),
        unanimousReaderSurvivors: predictionOutcome(
          readerSurvivors,
          preregistration.predictions.unanimousReaderSurvivors,
          reviewsComplete,
        ),
        probeSurvivors: predictionOutcome(
          probeSurvivors,
          preregistration.predictions.probeSurvivors,
          probesComplete,
        ),
      },
    },
    corrections: [
      "The Phase 15 preregistration used the source-repo shorthand results/34; the audited artifact is results/34-cc267-standard-matrix.md, pinned in the source corpus without changing the registration.",
      "TASK-FAMILY-MODEL.md simultaneously called the outbox ACKED rule hidden-only and already visible. The corrected classification is fragile A2: positively derivable across two sections, then made explicit by the measured one-sentence repair.",
      "The Phase 12 operator ledger said starter and activation effects had no agent measurement. Phase 14 has now measured descriptive nulls; local mutant activation remains real, but positive agent effect is not established.",
      "The official rs-archive-clone artifact has a 16-hour expert estimate and detailed verifier, but no countable agent matrix in either audited repository. It is retained as precedent and rejected from promotion in this run.",
      "Phase 14's 8/8 clean solves make the measured operator ranking empty. Discovery V2 gives the recompute recipe zero uplift rather than inheriting its local mutant effect as frontier difficulty.",
      "Both Phase 15 readers killed the only queued candidate at fairness because its packet named the need for public semantics and a deterministic budget without instantiating either one. This is a drafting-layer gate defect, not a failure of the incident evidence and not agent-difficulty evidence.",
      "The first method-comparison draft equated five author-generated candidates with five model reads. The audited evidence is three Phase 8 reads plus four Phase 9 reads, so the generated comparison now records seven.",
      "The first comparison counted all four extracted V2 patterns as failure-axis breadth while other methods counted drafted candidates. The table now uses draft-level breadth for every method and reports domain breadth separately.",
      "The first local-source adapter validated digest shape but not source bytes. It now byte-verifies both local documents and the checked-in first-party incident snapshot; the reader packet content and hash did not change.",
      "The first semantic-dedup implementation treated any candidate mined from an existing-family trial as a duplicate. It now requires an explicit same-axis and same-action-contract equivalence record, preventing a family id from hiding a new failure mode.",
      "The preregistration's declared midnight timestamp predates its own baseline commit, and the source corpus initially carried a future 13:00 placeholder. Neither is valid chronology evidence. The corpus timestamp is now null; the sealed preregistration remains unchanged, and prospective ordering is claimed only from this execution transcript, not as independently timestamp-proven by the repo.",
    ],
    conclusion,
  };
}

export const phase15ProvenanceArtifact = (run: Phase15DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-15-provenance-records@1",
  runId: run.runId,
  preregistrationSha256: run.preregistrationSha256,
  sourceCorpusSha256: run.sourceCorpusSha256,
  readerReviewsSha256: run.readerReviewsSha256,
  records: run.provenance,
});

export const phase15CandidateQueueArtifact = (run: Phase15DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-15-candidate-queue@1",
  runId: run.runId,
  sourceCorpusSha256: run.sourceCorpusSha256,
  readerReviewsSha256: run.readerReviewsSha256,
  candidates: run.candidates,
  readerDecisions: run.readerDecisions,
  summary: run.summary,
});

export const phase15ReaderPacketsArtifact = (run: Phase15DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-15-reader-packets@1",
  runId: run.runId,
  sourceCorpusSha256: run.sourceCorpusSha256,
  readerReviewsSha256: run.readerReviewsSha256,
  packets: run.readerPackets,
});

export const phase15ProbeResultsArtifact = (run: Phase15DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-15-probe-results@1",
  runId: run.runId,
  sourceCorpusSha256: run.sourceCorpusSha256,
  readerReviewsSha256: run.readerReviewsSha256,
  results: run.probes,
});

export const phase15ComparisonArtifact = (run: Phase15DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-15-method-comparison@1",
  runId: run.runId,
  sourceCorpusSha256: run.sourceCorpusSha256,
  readerReviewsSha256: run.readerReviewsSha256,
  methods: run.comparison,
  conclusion: run.conclusion,
});

export const phase15CorrectionsArtifact = (run: Phase15DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-15-corrections@1",
  runId: run.runId,
  sourceCorpusSha256: run.sourceCorpusSha256,
  readerReviewsSha256: run.readerReviewsSha256,
  corrections: run.corrections,
});
