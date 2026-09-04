import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { RigInputError } from "../screens/rig-integrity.js";
import { phase16Sha256 } from "./calibration.js";
import { phase16ComparisonArtifact, runPhase16Discovery } from "./discovery.js";
import { type Phase16ExecutedProbe, runPhase16Probe } from "./probes.js";
import {
  type Phase16ReaderReview,
  loadPhase16ContinuationPreregistration,
  loadPhase16ReaderReviews,
  phase16ReviewSetSha256,
} from "./review-execution.js";

export interface Phase16ReaderDecision {
  readonly candidateId: string;
  readonly packetSha256: string;
  readonly reviewsRequired: 2;
  readonly reviewsReceived: number;
  readonly providerFamilies: readonly string[];
  readonly unanimous: boolean;
  readonly verdict: "survived" | "killed" | "pending";
  readonly reason: string;
}

export interface Phase16FinalProbe {
  readonly candidateId: string;
  readonly status: "survived" | "killed" | "not-run-reader-killed" | "not-run-reader-pending";
  readonly reason: string;
  readonly result: Phase16ExecutedProbe | null;
}

export interface Phase16ContinuationRun {
  readonly schema: "agent-eval-foundry/phase-16-review-continuation@1";
  readonly continuationId: string;
  readonly parentRunId: string;
  readonly parentPacketSetSha256: string;
  readonly reviews: readonly Phase16ReaderReview[];
  readonly rawReviewManifest: readonly { readonly path: string; readonly sha256: string }[];
  readonly rawReviewSetSha256: string;
  readonly normalizedReviewSetSha256: string;
  readonly decisions: readonly Phase16ReaderDecision[];
  readonly probes: readonly Phase16FinalProbe[];
  readonly summary: {
    readonly packets: number;
    readonly reviewsRequired: number;
    readonly reviewsCompleted: number;
    readonly readerSurvivors: number | null;
    readonly probesRun: number;
    readonly probeSurvivors: number | null;
    readonly independentIncidentSurvivors: number | null;
    readonly causalAxisSurvivors: number | null;
    readonly pricedReaderSpendUsd: number;
    readonly unpricedReads: number;
    readonly decision: "BUILD" | "REPEAT-DISCOVERY" | "REPAIR-ENGINE" | "BLOCKED";
  };
  readonly conclusion: string;
}

const capturedReviewFiles = (root: string): readonly string[] => {
  const base = join(root, "data", "phase-16-reader-runs");
  if (!existsSync(base)) return [];
  return readdirSync(base, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
};

const decisionFor = (
  candidateId: string,
  packetSha256: string,
  reviews: readonly Phase16ReaderReview[],
): Phase16ReaderDecision => {
  const rows = reviews.filter((review) => review.candidateId === candidateId);
  const families = [...new Set(rows.map((review) => review.providerFamily))].sort();
  if (rows.length < 2) {
    return {
      candidateId,
      packetSha256,
      reviewsRequired: 2,
      reviewsReceived: rows.length,
      providerFamilies: families,
      unanimous: false,
      verdict: "pending",
      reason: `${2 - rows.length} frozen cross-provider review(s) remain.`,
    };
  }
  if (rows.length !== 2 || families.length !== 2) {
    throw new RigInputError(`${candidateId}: expected exactly one OpenAI and one Anthropic review`);
  }
  const survived = rows.every((review) => review.verdict === "promote");
  return {
    candidateId,
    packetSha256,
    reviewsRequired: 2,
    reviewsReceived: 2,
    providerFamilies: families,
    unanimous: survived,
    verdict: survived ? "survived" : "killed",
    reason: survived
      ? "Both independent provider families promoted every required dimension."
      : rows
          .filter((review) => review.verdict === "kill")
          .map(
            (review) =>
              `${review.providerFamily}: ${review.earliestFailedDimension ?? "non-pass dimension not recorded"}`,
          )
          .join("; "),
  };
};

export function runPhase16Continuation(root: string): Phase16ContinuationRun {
  const registration = loadPhase16ContinuationPreregistration(root);
  const parent = runPhase16Discovery(root);
  const reviews = loadPhase16ReaderReviews(root);
  const decisions = registration.packets.map((packet) =>
    decisionFor(packet.candidateId, packet.packetSha256, reviews),
  );
  const reviewsComplete = reviews.length === registration.reviewPlan.maximumSemanticReviews;
  if (reviewsComplete && decisions.some((decision) => decision.verdict === "pending")) {
    throw new RigInputError("Phase 16 has eight reviews but an incomplete candidate decision");
  }
  const probes: readonly Phase16FinalProbe[] = decisions.map((decision) => {
    if (!reviewsComplete || decision.verdict === "pending") {
      return {
        candidateId: decision.candidateId,
        status: "not-run-reader-pending" as const,
        reason: "The complete eight-review gate has not closed.",
        result: null,
      };
    }
    if (decision.verdict === "killed") {
      return {
        candidateId: decision.candidateId,
        status: "not-run-reader-killed" as const,
        reason: "At least one independent reader killed the candidate.",
        result: null,
      };
    }
    const result = runPhase16Probe(root, decision.candidateId as Parameters<typeof runPhase16Probe>[1]);
    return { candidateId: decision.candidateId, status: result.status, reason: result.reason, result };
  });
  const readerSurvivors = reviewsComplete
    ? decisions.filter((decision) => decision.verdict === "survived").length
    : null;
  const executed = probes.filter((probe) => probe.result !== null);
  const probeSurvivors = reviewsComplete
    ? executed.filter((probe) => probe.status === "survived").length
    : null;
  const survivingCandidateIds = new Set(
    probes.filter((probe) => probe.status === "survived").map((probe) => probe.candidateId),
  );
  const survivingCandidates = parent.candidates.filter((candidate) =>
    survivingCandidateIds.has(candidate.candidateId),
  );
  const independentIncidentSurvivors = reviewsComplete
    ? new Set(survivingCandidates.map((candidate) => candidate.sourceIncidentId)).size
    : null;
  const causalAxisSurvivors = reviewsComplete
    ? new Set(survivingCandidates.map((candidate) => candidate.causalAxis)).size
    : null;
  let decision: Phase16ContinuationRun["summary"]["decision"] = "BLOCKED";
  if (
    reviewsComplete &&
    probeSurvivors !== null &&
    probeSurvivors >= 2 &&
    (independentIncidentSurvivors ?? 0) >= 2 &&
    (causalAxisSurvivors ?? 0) >= 2
  ) {
    decision = "BUILD";
  } else if (reviewsComplete && probeSurvivors === 1) {
    decision = "REPEAT-DISCOVERY";
  } else if (reviewsComplete && probeSurvivors === 0) {
    decision = "REPAIR-ENGINE";
  }
  const rawReviewManifest = reviews
    .map((review) => ({ path: review.rawOutputPath, sha256: review.rawOutputSha256 }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const pricedReaderSpendUsd = Number(
    reviews.reduce((sum, review) => sum + (review.costUsd ?? 0), 0).toFixed(7),
  );
  const unpricedReads = reviews.filter((review) => review.costUsd === null).length;
  const conclusion =
    decision === "BUILD"
      ? "Discovery V3 produced at least two independently sourced, cross-provider reader-approved, B6-probe survivors across at least two causal axes. Phase 17 is unlocked at the candidate-build boundary, not at the hard-task boundary."
      : decision === "REPEAT-DISCOVERY"
        ? "Exactly one candidate survived independent reading and its B6 probe. Repeat prospective discovery before building a multi-family phase."
        : decision === "REPAIR-ENGINE"
          ? "No candidate survived both independent reading and its B6 probe. Repair discovery before another build phase."
          : reviewsComplete
            ? "Multiple probe survivors did not satisfy the registered independent-axis BUILD rule, a decision-table gap. Do not proceed until that gap is preregistered."
            : "The frozen cross-provider review sequence is incomplete. Missing reviews and probes remain unknown, not zero.";
  return {
    schema: "agent-eval-foundry/phase-16-review-continuation@1",
    continuationId: registration.continuationId,
    parentRunId: parent.runId,
    parentPacketSetSha256: parent.packetSetSha256,
    reviews,
    rawReviewManifest,
    rawReviewSetSha256: phase16Sha256(rawReviewManifest),
    normalizedReviewSetSha256: phase16ReviewSetSha256(reviews),
    decisions,
    probes,
    summary: {
      packets: registration.packets.length,
      reviewsRequired: registration.reviewPlan.maximumSemanticReviews,
      reviewsCompleted: reviews.length,
      readerSurvivors,
      probesRun: executed.length,
      probeSurvivors,
      independentIncidentSurvivors,
      causalAxisSurvivors,
      pricedReaderSpendUsd,
      unpricedReads,
      decision,
    },
    conclusion,
  };
}

export const phase16ContinuationReviewsArtifact = (run: Phase16ContinuationRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-reader-reviews-final@1",
  continuationId: run.continuationId,
  packetSetSha256: run.parentPacketSetSha256,
  rawReviewSetSha256: run.rawReviewSetSha256,
  normalizedReviewSetSha256: run.normalizedReviewSetSha256,
  reviews: run.reviews,
  decisions: run.decisions,
});

export const phase16ContinuationProbesArtifact = (run: Phase16ContinuationRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-probe-results-final@1",
  continuationId: run.continuationId,
  normalizedReviewSetSha256: run.normalizedReviewSetSha256,
  probes: run.probes,
  summary: run.summary,
});

export const phase16ContinuationStatusArtifact = (root: string, run: Phase16ContinuationRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-continuation-status@1",
  continuationId: run.continuationId,
  capturedReviewArtifacts: capturedReviewFiles(root).map((path) => ({
    path: relative(root, path),
    sha256: phase16Sha256(readFileSync(path)),
  })),
  summary: run.summary,
  conclusion: run.conclusion,
});

export const phase16ContinuationComparisonArtifact = (root: string, run: Phase16ContinuationRun): unknown => {
  const parent = runPhase16Discovery(root);
  const base = phase16ComparisonArtifact(root, parent) as {
    readonly phase15MethodsUnchanged: readonly unknown[];
    readonly discoveryV3: Readonly<Record<string, unknown>>;
  };
  return {
    schema: "agent-eval-foundry/phase-16-method-comparison-final@1",
    continuationId: run.continuationId,
    phase15MethodsUnchanged: base.phase15MethodsUnchanged,
    discoveryV3: {
      ...base.discoveryV3,
      readerReviewed: run.summary.reviewsCompleted,
      readerSurvivors: run.summary.readerSurvivors,
      probeRun: run.summary.probesRun,
      probeSurvivors: run.summary.probeSurvivors,
      modelReads: run.summary.reviewsCompleted,
      pricedUsd: run.summary.pricedReaderSpendUsd,
      unpricedReads: run.summary.unpricedReads,
      claimBoundary:
        "One prospective candidate survived 2-of-2 cross-provider reading and its local B6 probe; no subject trial or capability difficulty is established.",
    },
  };
};
