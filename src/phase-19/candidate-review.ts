import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { RigInputError, rigIntegrity } from "../screens/rig-integrity.js";
import type { TrialUsage } from "../trials/types.js";
import {
  buildPhase19Reranking,
  buildPhase19UiLabelLedger,
  phase19AssessmentFor,
  phase19CandidateCorpus,
  phase19CapturedFiles,
} from "./evidence-rerank.js";
import { phase19ProbeDefinition, runPhase19Probe } from "./probes.js";
import type { Phase19ProbeResult } from "./probes.js";

export const PHASE19_REVIEW_DIMENSIONS = [
  "source support",
  "specific causal mechanism",
  "causal depth",
  "diagnosis radius",
  "fair solution-undirected contract",
  "structural witness isolation",
  "semantic novelty",
  "cheap-probe falsifiability",
] as const;

export type Phase19ReviewDimension = (typeof PHASE19_REVIEW_DIMENSIONS)[number];
export type Phase19ReviewVerdict = "pass" | "fail" | "uncertain";
export type Phase19CandidateVerdict = "promote" | "kill";

const hash = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");

const RECIPE_FIELDS = [
  "familyId",
  "name",
  "baseFamilyDefinition",
  "outboxOperatorMapping",
  "nonApplicableOperators",
  "familyNativeDifficultyOperators",
  "multiFileCodebaseSketch",
  "publicOutcomeRequirements",
  "infoIntentionallyAbsent",
  "visibleTestStrategy",
  "externalAuthorityOrWitness",
  "privateVerifierArchitecture",
  "fuzzerDimensions",
  "narrowDevMutants",
  "heldOutMutants",
  "positiveWorkAndCheatControls",
  "scenarioSelectionStrategy",
  "cheapestPackageValidityProbe",
  "threeExampleInstances",
  "mainFairnessRisks",
  "killConditions",
] as const;

const pickRecipe = (value: Record<string, unknown> | undefined): Record<string, unknown> | null => {
  if (value === undefined) return null;
  return Object.fromEntries(RECIPE_FIELDS.flatMap((key) => (key in value ? [[key, value[key]]] : [])));
};

export interface Phase19CandidatePacket {
  readonly schema: "agent-eval-foundry/phase-19-candidate-review-packet@1";
  readonly candidateId: string;
  readonly instructions: string;
  readonly calibration: {
    readonly caaV2: string;
    readonly difficultyRule: string;
  };
  readonly family: unknown;
  readonly sourceRecords: readonly unknown[];
  readonly sourceMechanisms: readonly unknown[];
  readonly constructionCard: unknown;
  readonly measuredLineageEvidence: unknown;
  readonly cheapProbe: unknown;
  readonly withheld: readonly string[];
  readonly requiredOutput: unknown;
}

export function buildPhase19CandidatePacket(root: string, candidateId: string): Phase19CandidatePacket {
  const reranking = buildPhase19Reranking(root);
  if (reranking.uiEvidence.labelsReceived !== reranking.uiEvidence.labelsRequired) {
    throw new RigInputError("candidate packets remain frozen shut until all ten UI labels exist");
  }
  if (!reranking.topFive.includes(candidateId)) {
    throw new RigInputError(`${candidateId}: not in the corrected top-five review queue`);
  }
  const corpus = phase19CandidateCorpus(root);
  const family = corpus.families20.find((row) => row.familyId === candidateId);
  if (family === undefined) throw new RigInputError(`${candidateId}: research family missing`);
  const sourceIds = new Set(family.primarySourceUnitIds);
  const sourceRecords = corpus.sourceIndex.filter((row) => sourceIds.has(String(row.sourceUnitId ?? "")));
  const sourceMechanisms = corpus.rawMechanismPool.filter((row) =>
    sourceIds.has(String(row.sourceUnitId ?? "")),
  );
  const recipe = corpus.recipeCards.find((row) => row.familyId === candidateId);
  const assessment = phase19AssessmentFor(root, candidateId);
  const ui = buildPhase19UiLabelLedger(root);
  return {
    schema: "agent-eval-foundry/phase-19-candidate-review-packet@1",
    candidateId,
    instructions:
      "Audit whether this candidate is ready for its registered cheap mechanism probe, not whether its topic sounds promising. A pass requires a concrete professional task family, a fair outcome contract that need not disclose the implementation defect, causal depth and diagnosis radius supported by the proposed code/state geometry, an isolatable witness, semantic novelty, and a probe that could falsify the mechanism. Treat missing construction detail as uncertain. Uncertain kills this bounded run.",
    calibration: {
      caaV2:
        "CAA V2 was a realistic multi-file package with strong mutant/verifier controls, yet four of four countable frontier attempts solved it. Its package was later invalidated by a verifier bypass and visible activation leaks, so 4/4 is not a formal difficulty estimate. The genuine solutions still showed that a defect visible in one short function across one obvious fan-in pattern remains easy despite realistic scaffolding. Do not credit raw file count as causal depth or diagnosis radius.",
      difficultyRule:
        "Reward zero is difficulty evidence only after independent root-cause agreement on capability. This review establishes neither reward nor capability; it only gates a cheap probe.",
    },
    family,
    sourceRecords,
    sourceMechanisms,
    constructionCard: pickRecipe(recipe),
    measuredLineageEvidence:
      candidateId === "ui-action-replay-dom-mutation-timing"
        ? {
            relationship: "intentional descendant of ui-action-record-replay",
            blindRelabelling: ui.summary,
            decisions: ui.trials.map((row) => ({
              packetId: row.packetId,
              status: row.decision.status,
              labels: row.decision.labels,
            })),
            limit:
              "These labels concern the parent package. They support a lineage prior only and do not establish this proposed descendant's difficulty.",
          }
        : {
            status: "no local capability-attributed subject trial for this candidate",
            limit: "Source incidents and related benchmark results are provenance, not this package's solve rate.",
          },
    cheapProbe: phase19ProbeDefinition(candidateId),
    withheld: [
      "corrected rank",
      "numeric decision score",
      "estimated clean-solve probabilities",
      "Phase 19 assessment rationale",
      "prior skeptic verdicts and repairs",
      "other reader verdict",
      "author recommendation",
      "predicted survivor count",
    ],
    requiredOutput: {
      path: "submission/review.json",
      exactKeys: [
        "candidateId",
        "packetSha256",
        "providerFamily",
        "dimensions",
        "verdict",
        "earliestFailedDimension",
        "rationale",
      ],
      dimensions: PHASE19_REVIEW_DIMENSIONS,
      dimensionValues: ["pass", "fail", "uncertain"],
      verdictRule: "promote only if every dimension passes; otherwise kill",
      rationale: "at least 120 characters and grounded in packet evidence",
    },
  };
}

export const phase19CandidatePacketBytes = (root: string, candidateId: string): string =>
  `${JSON.stringify(buildPhase19CandidatePacket(root, candidateId), null, 2)}\n`;

export interface Phase19RawCandidateReview {
  readonly candidateId: string;
  readonly packetSha256: string;
  readonly providerFamily: "openai" | "anthropic";
  readonly dimensions: Readonly<Record<Phase19ReviewDimension, Phase19ReviewVerdict>>;
  readonly verdict: Phase19CandidateVerdict;
  readonly earliestFailedDimension: Phase19ReviewDimension | null;
  readonly rationale: string;
}

const record = (value: unknown, path: string): Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RigInputError(`${path}: expected an object`);
  }
  return value as Record<string, unknown>;
};

const exactKeys = (value: Record<string, unknown>, keys: readonly string[], path: string): void => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new RigInputError(`${path}: expected keys ${expected.join(", ")}; got ${actual.join(", ")}`);
  }
};

export function parsePhase19CandidateReview(
  value: unknown,
  candidateId: string,
  packetSha256: string,
  providerFamily: "openai" | "anthropic",
): Phase19RawCandidateReview {
  const row = record(value, "phase19.review");
  exactKeys(
    row,
    [
      "candidateId",
      "packetSha256",
      "providerFamily",
      "dimensions",
      "verdict",
      "earliestFailedDimension",
      "rationale",
    ],
    "phase19.review",
  );
  if (row.candidateId !== candidateId) throw new RigInputError("review candidateId mismatch");
  if (row.packetSha256 !== packetSha256) throw new RigInputError("review packetSha256 mismatch");
  if (row.providerFamily !== providerFamily) throw new RigInputError("review providerFamily mismatch");
  const rawDimensions = record(row.dimensions, "phase19.review.dimensions");
  exactKeys(rawDimensions, PHASE19_REVIEW_DIMENSIONS, "phase19.review.dimensions");
  const dimensions = Object.fromEntries(
    PHASE19_REVIEW_DIMENSIONS.map((dimension) => {
      const verdict = rawDimensions[dimension];
      if (verdict !== "pass" && verdict !== "fail" && verdict !== "uncertain") {
        throw new RigInputError(`phase19.review.dimensions.${dimension}: invalid verdict`);
      }
      return [dimension, verdict];
    }),
  ) as unknown as Phase19RawCandidateReview["dimensions"];
  const earliest = PHASE19_REVIEW_DIMENSIONS.find((dimension) => dimensions[dimension] !== "pass") ?? null;
  const verdict = row.verdict;
  if (verdict !== "promote" && verdict !== "kill") {
    throw new RigInputError("phase19.review.verdict must be promote or kill");
  }
  if ((verdict === "promote") !== (earliest === null)) {
    throw new RigInputError("phase19 review may promote only when every dimension passes");
  }
  if (row.earliestFailedDimension !== earliest) {
    throw new RigInputError("phase19 review earliestFailedDimension is inconsistent");
  }
  if (typeof row.rationale !== "string" || row.rationale.trim().length < 120) {
    throw new RigInputError("phase19 review rationale must contain at least 120 characters");
  }
  return {
    candidateId,
    packetSha256,
    providerFamily,
    dimensions,
    verdict,
    earliestFailedDimension: earliest,
    rationale: row.rationale,
  };
}

export interface Phase19CandidateReview extends Phase19RawCandidateReview {
  readonly reviewId: string;
  readonly independentlyProduced: true;
  readonly blindedTo: readonly string[];
  readonly transcriptPath: string;
  readonly rawOutputPath: string;
  readonly rawOutputSha256: string;
  readonly metadataPath: string;
  readonly runtimeSeconds: number;
  readonly usage: TrialUsage | null;
  readonly costUsd: number | null;
}

const reviewFile = (root: string, candidateId: string, provider: string): string =>
  join(root, "data", "phase-19-candidate-review-runs", candidateId, provider, "normalized-review.json");

export function loadPhase19CandidateReviews(root: string): readonly Phase19CandidateReview[] {
  const ranking = buildPhase19Reranking(root);
  if (ranking.uiEvidence.labelsReceived !== 10) return [];
  return ranking.topFive.flatMap((candidateId) =>
    (["openai", "anthropic"] as const).flatMap((provider) => {
      const path = reviewFile(root, candidateId, provider);
      if (!existsSync(path)) return [];
      const review = JSON.parse(readFileSync(path, "utf8")) as Phase19CandidateReview;
      const packetSha256 = hash(phase19CandidatePacketBytes(root, candidateId));
      parsePhase19CandidateReview(
        {
          candidateId: review.candidateId,
          packetSha256: review.packetSha256,
          providerFamily: review.providerFamily,
          dimensions: review.dimensions,
          verdict: review.verdict,
          earliestFailedDimension: review.earliestFailedDimension,
          rationale: review.rationale,
        },
        candidateId,
        packetSha256,
        provider,
      );
      if (review.independentlyProduced !== true) {
        throw new RigInputError(`${relative(root, path)}: review is not independently produced`);
      }
      if (!existsSync(join(root, review.rawOutputPath))) {
        throw new RigInputError(`${relative(root, path)}: raw output is missing`);
      }
      if (hash(readFileSync(join(root, review.rawOutputPath))) !== review.rawOutputSha256) {
        throw new RigInputError(`${relative(root, path)}: raw output hash mismatch`);
      }
      return [review];
    }),
  );
}

export interface Phase19CandidateDecision {
  readonly candidateId: string;
  readonly packetSha256: string;
  readonly reviewsReceived: number;
  readonly providers: readonly string[];
  readonly verdict: "survived" | "killed" | "pending";
  readonly reason: string;
}

export interface Phase19ReviewLedger {
  readonly schema: "agent-eval-foundry/phase-19-candidate-review-ledger@1";
  readonly topFive: readonly string[];
  readonly reviews: readonly Phase19CandidateReview[];
  readonly decisions: readonly Phase19CandidateDecision[];
  readonly probes: readonly {
    readonly candidateId: string;
    readonly status: "survived" | "killed" | "not-run-reader-killed" | "not-run-reader-pending";
    readonly result: Phase19ProbeResult | null;
  }[];
  readonly summary: {
    readonly reviewsRequired: 10;
    readonly reviewsReceived: number;
    readonly readerSurvivors: number | null;
    readonly probesRun: number;
    readonly probeSurvivors: number | null;
    readonly fullBuildsAuthorized: boolean;
    readonly decision: "BUILD-SELECTIVELY" | "REPAIR-CANDIDATES" | "PENDING";
  };
  readonly capturedArtifacts: readonly { readonly path: string; readonly sha256: string }[];
}

export function buildPhase19ReviewLedger(root: string): Phase19ReviewLedger {
  const reranking = buildPhase19Reranking(root);
  const reviews = loadPhase19CandidateReviews(root);
  const decisions = reranking.topFive.map((candidateId): Phase19CandidateDecision => {
    const rows = reviews.filter((review) => review.candidateId === candidateId);
    const providers = [...new Set(rows.map((review) => review.providerFamily))].sort();
    const packetSha256 = hash(phase19CandidatePacketBytes(root, candidateId));
    if (rows.length < 2) {
      return {
        candidateId,
        packetSha256,
        reviewsReceived: rows.length,
        providers,
        verdict: "pending",
        reason: `${2 - rows.length} independent provider-family review(s) remain.`,
      };
    }
    if (rows.length !== 2 || providers.length !== 2) {
      throw new RigInputError(`${candidateId}: expected exactly one review from each provider family`);
    }
    const survived = rows.every((review) => review.verdict === "promote");
    return {
      candidateId,
      packetSha256,
      reviewsReceived: 2,
      providers,
      verdict: survived ? "survived" : "killed",
      reason: survived
        ? "Both independent provider families passed every review dimension."
        : rows
            .filter((review) => review.verdict === "kill")
            .map((review) => `${review.providerFamily}: ${review.earliestFailedDimension ?? "unspecified"}`)
            .join("; "),
    };
  });
  const complete = reviews.length === 10 && decisions.every((decision) => decision.verdict !== "pending");
  const probes = decisions.map((decision) => {
    if (decision.verdict === "pending") {
      return {
        candidateId: decision.candidateId,
        status: "not-run-reader-pending" as const,
        result: null,
      };
    }
    if (decision.verdict === "killed") {
      return {
        candidateId: decision.candidateId,
        status: "not-run-reader-killed" as const,
        result: null,
      };
    }
    const result = runPhase19Probe(decision.candidateId);
    return { candidateId: decision.candidateId, status: result.status, result };
  });
  const readerSurvivors = complete
    ? decisions.filter((decision) => decision.verdict === "survived").length
    : null;
  const executed = probes.filter((probe) => probe.result !== null);
  const probeSurvivors = complete
    ? executed.filter((probe) => probe.status === "survived").length
    : null;
  const fullBuildsAuthorized =
    complete &&
    reranking.uiEvidence.difficultyEvidenceSurvives &&
    (probeSurvivors ?? 0) > 0;
  const decision = !complete
    ? "PENDING"
    : fullBuildsAuthorized
      ? "BUILD-SELECTIVELY"
      : "REPAIR-CANDIDATES";
  const capturedArtifacts = [
    ...phase19CapturedFiles(root, "data/phase-19-ui-label-runs"),
    ...phase19CapturedFiles(root, "data/phase-19-candidate-review-runs"),
  ].map((path) => ({ path, sha256: hash(readFileSync(join(root, path))) }));
  return {
    schema: "agent-eval-foundry/phase-19-candidate-review-ledger@1",
    topFive: reranking.topFive,
    reviews,
    decisions,
    probes,
    summary: {
      reviewsRequired: 10,
      reviewsReceived: reviews.length,
      readerSurvivors,
      probesRun: executed.length,
      probeSurvivors,
      fullBuildsAuthorized,
      decision,
    },
    capturedArtifacts,
  };
}

export function phase19CandidateReviewB6(root: string): {
  readonly usable: boolean;
  readonly knownGoodPassed: boolean;
  readonly knownBadFailed: boolean;
  readonly malformedInputRefused: boolean;
  readonly nondegenerate: boolean;
} {
  const candidateId = buildPhase19Reranking(root).topFive[0];
  if (candidateId === undefined) throw new RigInputError("Phase 19 top-five queue is empty");
  const packetSha256 = "a".repeat(64);
  const dimensions = Object.fromEntries(PHASE19_REVIEW_DIMENSIONS.map((dimension) => [dimension, "pass"]));
  const good = {
    candidateId,
    packetSha256,
    providerFamily: "openai",
    dimensions,
    verdict: "promote",
    earliestFailedDimension: null,
    rationale:
      "Every required dimension is supported by concrete packet evidence, the proposed probe can falsify the mechanism, and no unresolved validity or novelty defect remains.",
  };
  let knownGoodPassed = false;
  try {
    parsePhase19CandidateReview(good, candidateId, packetSha256, "openai");
    knownGoodPassed = true;
  } catch {
    knownGoodPassed = false;
  }
  let knownBadFailed = false;
  try {
    parsePhase19CandidateReview({ ...good, candidateId: "stale" }, candidateId, packetSha256, "openai");
  } catch {
    knownBadFailed = true;
  }
  let malformedInputRefused = false;
  try {
    parsePhase19CandidateReview([], candidateId, packetSha256, "openai");
  } catch {
    malformedInputRefused = true;
  }
  const goodFailures = knownGoodPassed ? [] : ["known-good-refused"];
  const badFailures = knownBadFailed ? ["stale-review-refused"] : [];
  const integrity = rigIntegrity(
    "phase19-candidate-review-normalizer",
    [
      { id: "known-good-review", expect: "pass", observedFailures: goodFailures },
      { id: "stale-candidate-review", expect: "fail", observedFailures: badFailures },
    ],
    [goodFailures, badFailures],
  );
  return {
    usable: integrity.usable && malformedInputRefused,
    knownGoodPassed,
    knownBadFailed,
    malformedInputRefused,
    nondegenerate: !integrity.degenerate,
  };
}
