import type {
  DiscoveryCandidate,
  DiscoveryCandidateScore,
  DiscoveryWorkbench,
} from "./discovery-workbench.js";
import { scoreDiscoveryCandidate } from "./discovery-workbench.js";
import type { ProbeRunSummary } from "./probe-runner.js";
import { fail } from "./schema.js";

export const CALIBRATION_MATCHES = ["match", "partial", "miss"] as const;
export type CalibrationMatch = (typeof CALIBRATION_MATCHES)[number];

export interface DiscoveryCalibrationKnownOutcome {
  readonly familyId: string;
  readonly candidateId: string;
  readonly expectedRoute: string;
  readonly actualOutcome: string;
  readonly evidenceLabel: string;
}

export interface DiscoveryCalibrationRecord {
  readonly familyId: string;
  readonly candidateId: string;
  readonly candidateFeatures: readonly string[];
  readonly score: DiscoveryCandidateScore;
  readonly expectedRoute: string;
  readonly actualOutcome: string;
  readonly evidenceLabel: string;
  readonly recommendationMatched: CalibrationMatch;
  readonly overvalued: readonly string[];
  readonly undervalued: readonly string[];
  readonly scoringAdjustment: string;
  readonly probeEvidence: string;
}

export interface DiscoveryCalibrationSummary {
  readonly n: number;
  readonly records: readonly DiscoveryCalibrationRecord[];
  readonly matches: number;
  readonly partials: number;
  readonly misses: number;
  readonly directionality: string;
  readonly scoringAdjustments: readonly string[];
}

export const KNOWN_DISCOVERY_OUTCOMES: readonly DiscoveryCalibrationKnownOutcome[] = [
  {
    familyId: "durable-approval-outbox",
    candidateId: "payment-unknown-capture-receipt",
    expectedRoute: "promote to task shape/family",
    actualOutcome: "shipped historical family; real agents failed; reference passed",
    evidenceLabel: "imported historical difficulty evidence",
  },
  {
    familyId: "prompt-injection-containment",
    candidateId: "prompt-injection-doc-retrieval-policy",
    expectedRoute: "kill or harden after smoke trial",
    actualOutcome: "already solved by real agents; killed as the base family",
    evidenceLabel: "current-family killed outcome",
  },
  {
    familyId: "prompt-injection-memory-poisoning",
    candidateId: "memory-poisoned-cross-session-approval",
    expectedRoute: "promote/evolve from containment",
    actualOutcome: "confirmed harder; cross-lab failure generalised",
    evidenceLabel: "counted real-agent difficulty and cross-lab transfer",
  },
  {
    familyId: "ui-action-record-replay",
    candidateId: "browser-checkout-stale-selector",
    expectedRoute: "build but watch for axis collapse",
    actualOutcome: "shipped as useful but real-agent failures form a one-axis chain",
    evidenceLabel: "counted real-agent difficulty with axis limitation",
  },
  {
    familyId: "ui-replay-live-dom",
    candidateId: "browser-aria-busy-false-ready",
    expectedRoute: "descendant/hardened UI replay",
    actualOutcome: "stronger DOM-like descendant with OpenAI difficulty evidence; not cross-lab",
    evidenceLabel: "OpenAI-only counted real-agent difficulty",
  },
  {
    familyId: "checker-required-memory-poisoning",
    candidateId: "checker-required-ui-replay",
    expectedRoute: "checker-required descendant",
    actualOutcome: "OpenAI difficulty evidence for checker-required memory descendant; not cross-lab",
    evidenceLabel: "OpenAI-only counted real-agent difficulty",
  },
];

export function assertDiscoveryCalibrationValid(
  outcomes: readonly DiscoveryCalibrationKnownOutcome[],
  workbench: DiscoveryWorkbench,
): void {
  const candidates = new Set(workbench.candidates.map((c) => c.id));
  for (const outcome of outcomes) {
    if (outcome.actualOutcome.trim().length === 0 || outcome.expectedRoute.trim().length === 0) {
      fail(
        "CALIBRATION_NO_KNOWN_OUTCOME",
        `calibration(${outcome.familyId})`,
        "known outcome must name expected route and actual outcome",
      );
    }
    if (!candidates.has(outcome.candidateId)) {
      fail(
        "CALIBRATION_MISSING_FEATURES",
        `calibration(${outcome.familyId}).candidateId`,
        "calibration row must link to a scored discovery candidate",
      );
    }
  }
}

export function runDiscoveryCalibration(
  workbench: DiscoveryWorkbench,
  probeSummary?: ProbeRunSummary,
  outcomes: readonly DiscoveryCalibrationKnownOutcome[] = KNOWN_DISCOVERY_OUTCOMES,
): DiscoveryCalibrationSummary {
  assertDiscoveryCalibrationValid(outcomes, workbench);
  const byCandidate = new Map(workbench.candidates.map((candidate) => [candidate.id, candidate]));
  const probeByCandidate = new Map((probeSummary?.probes ?? []).map((probe) => [probe.candidateId, probe]));
  const records = outcomes.map((outcome) => {
    const candidate = byCandidate.get(outcome.candidateId);
    if (candidate === undefined) {
      fail(
        "CALIBRATION_MISSING_FEATURES",
        `calibration(${outcome.familyId}).candidateId`,
        "calibration candidate is absent from the pool",
      );
    }
    const score = scoreDiscoveryCandidate(candidate);
    const match = recommendationMatch(outcome, score);
    return {
      familyId: outcome.familyId,
      candidateId: outcome.candidateId,
      candidateFeatures: candidateFeatures(candidate),
      score,
      expectedRoute: outcome.expectedRoute,
      actualOutcome: outcome.actualOutcome,
      evidenceLabel: outcome.evidenceLabel,
      recommendationMatched: match,
      overvalued: overvaluedSignals(outcome, candidate, score, match),
      undervalued: undervaluedSignals(outcome, candidate, score, match),
      scoringAdjustment: scoringAdjustment(outcome, match, probeByCandidate.get(outcome.candidateId)),
      probeEvidence: probeByCandidate.get(outcome.candidateId)?.verdict ?? "not-run",
    } satisfies DiscoveryCalibrationRecord;
  });
  return {
    n: records.length,
    records,
    matches: records.filter((record) => record.recommendationMatched === "match").length,
    partials: records.filter((record) => record.recommendationMatched === "partial").length,
    misses: records.filter((record) => record.recommendationMatched === "miss").length,
    directionality:
      "n=6 local backtest. It calibrates routing pressure only; it is not a statistical estimate of benchmark yield.",
    scoringAdjustments: [
      "Boost candidates whose cheap probes catch multiple distinct bad subjects by intended named checks.",
      "Penalize high expected difficulty when verifier feasibility or hidden-rule fairness is weak.",
      "Penalize likely nested failure sets before buying a full matrix.",
      "Boost candidates that reuse an already shipped authority model through a declared transfer.",
      "Preserve one-agent smoke trial as the first real difficulty gate; score alone must not ship.",
    ],
  };
}

function recommendationMatch(
  outcome: DiscoveryCalibrationKnownOutcome,
  score: DiscoveryCandidateScore,
): CalibrationMatch {
  const action = score.recommendedAction;
  if (outcome.familyId === "prompt-injection-containment") {
    return ["kill", "hold", "evolve_existing"].includes(action) ? "match" : "miss";
  }
  if (outcome.familyId === "ui-action-record-replay") {
    return ["task_shape", "mechanism_probe", "evolve_existing"].includes(action) ? "partial" : "miss";
  }
  if (outcome.familyId === "checker-required-memory-poisoning") {
    return action === "hold"
      ? "partial"
      : ["task_shape", "mechanism_probe"].includes(action)
        ? "match"
        : "miss";
  }
  return ["task_shape", "mechanism_probe", "transfer_existing", "evolve_existing"].includes(action)
    ? "match"
    : "miss";
}

function candidateFeatures(candidate: DiscoveryCandidate): readonly string[] {
  return [
    `mechanisms=${candidate.failureMechanisms.join("+")}`,
    `truth=${candidate.authoritativeTruthSource.name}`,
    `knobs=${candidate.expectedKnobs.length}`,
    `mutants=${candidate.expectedMutants.length}`,
    `buildHours=${candidate.expectedBuildHours}`,
    `axisPotential=${candidate.expectedAxisPotential}`,
    `fairnessRisk=${candidate.riskNotes.fairnessRisk.level}`,
    `verifierRisk=${candidate.riskNotes.verifierRisk.level}`,
    `alreadySolvedRisk=${candidate.riskNotes.alreadySolvedRisk.level}`,
  ];
}

function overvaluedSignals(
  outcome: DiscoveryCalibrationKnownOutcome,
  candidate: DiscoveryCandidate,
  score: DiscoveryCandidateScore,
  match: CalibrationMatch,
): readonly string[] {
  const signals: string[] = [];
  if (outcome.familyId === "prompt-injection-containment") {
    signals.push("static prompt-injection difficulty before the smoke trial");
  }
  if (outcome.familyId === "ui-action-record-replay") {
    signals.push("scenario count before checking whether failure sets form a chain");
  }
  if (score.dimensions.expectedAgentDifficulty >= 8 && candidate.riskNotes.fairnessRisk.level !== "low") {
    signals.push("difficulty under non-low fairness risk");
  }
  if (match === "miss") signals.push("pre-trial score confidence");
  return signals.length === 0 ? ["none identified in this small calibration set"] : signals;
}

function undervaluedSignals(
  outcome: DiscoveryCalibrationKnownOutcome,
  candidate: DiscoveryCandidate,
  score: DiscoveryCandidateScore,
  match: CalibrationMatch,
): readonly string[] {
  const signals: string[] = [];
  if (outcome.familyId === "checker-required-memory-poisoning") {
    signals.push("checker-required value when attached to an existing strong authority model");
  }
  if (candidate.transferPotential.linkedTransferTests.length > 0 && score.dimensions.transferPotential < 8) {
    signals.push("declared transfer from a measured family");
  }
  if (match === "match" && outcome.evidenceLabel.includes("cross-lab")) {
    signals.push("authority-model reuse across domains");
  }
  return signals.length === 0 ? ["none identified in this small calibration set"] : signals;
}

function scoringAdjustment(
  outcome: DiscoveryCalibrationKnownOutcome,
  match: CalibrationMatch,
  probe: ProbeRunSummary["probes"][number] | undefined,
): string {
  if (probe !== undefined && probe.badSubjectsCaught === probe.badSubjectsTotal) {
    return "Probe evidence should dominate raw score in the next-action queue.";
  }
  if (outcome.familyId === "prompt-injection-containment") {
    return "Keep the one-agent smoke gate before any production matrix; already-solved outcomes cannot be predicted from prompt-surface plausibility alone.";
  }
  if (outcome.familyId === "ui-action-record-replay") {
    return "Add an axis-collapse penalty after probe or smoke evidence shows nested failure sets.";
  }
  if (outcome.familyId === "checker-required-memory-poisoning") {
    return "Do not over-penalize checker-required descendants when the underlying authority model is already measured.";
  }
  return match === "match"
    ? "No weight change required from this row."
    : "Review scoring weights before using this row for production routing.";
}
