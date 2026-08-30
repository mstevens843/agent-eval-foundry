export const HUMAN_REVIEW_STATUSES = [
  "not-run",
  "clean-pass",
  "clean-fail",
  "ambiguous-spec",
  "needed-private-context",
  "timeout",
  "assisted",
  "contaminated",
  "invalid-hash",
] as const;
export type HumanReviewStatus = (typeof HUMAN_REVIEW_STATUSES)[number];

export const SOLVER_RELATIONS = ["author", "collaborator", "independent"] as const;
export type SolverRelation = (typeof SOLVER_RELATIONS)[number];

export const HUMAN_VERIFIER_STATUSES = ["pass", "fail", "not-run", "infrastructure_error"] as const;
export type HumanVerifierStatus = (typeof HUMAN_VERIFIER_STATUSES)[number];

export const HUMAN_CLAIM_LEVELS = ["reference-solvable", "human-ready", "human-evidenced"] as const;
export type HumanClaimLevel = (typeof HUMAN_CLAIM_LEVELS)[number];

export interface HumanSolverProfile {
  readonly id: string;
  readonly profile: string;
  readonly anonymized: boolean;
}

export interface HumanHint {
  readonly source: string;
  readonly text: string;
  readonly private: boolean;
}

export interface HumanQuestion {
  readonly askedAt: string | null;
  readonly question: string;
  readonly answer: string;
  readonly answerSource: "public-package" | "private-context" | "not-answered";
}

export interface HumanAmbiguityFinding {
  readonly finding: string;
  readonly status: "open" | "resolved" | "not-applicable";
  readonly resolution: string;
}

export interface HumanVerifierOutcome {
  readonly status: HumanVerifierStatus;
  readonly command: string | null;
  readonly outputPath: string | null;
  readonly scenariosPassed: number | null;
  readonly scenariosFailed: number | null;
}

export interface HumanReviewRecord {
  readonly reviewId: string;
  readonly familyId: string;
  readonly solver: HumanSolverProfile;
  readonly relationToAuthor: SolverRelation;
  readonly status: HumanReviewStatus;
  readonly countsAsCleanRoomSolve: boolean;
  readonly reviewedChallengeHash: string | null;
  readonly gradedChallengeHash: string | null;
  readonly publicPackageDiffersFromGradedPackage: boolean;
  readonly publicFilesReviewed: readonly string[];
  readonly hiddenFilesForbidden: readonly string[];
  readonly hiddenFilesSeen: readonly string[];
  readonly timeBudgetMinutes: number | null;
  readonly startedAt: string | null;
  readonly endedAt: string | null;
  readonly elapsedMinutes: number | null;
  readonly hintsUsed: readonly HumanHint[];
  readonly questionsAsked: readonly HumanQuestion[];
  readonly ambiguityFindings: readonly HumanAmbiguityFinding[];
  readonly solveOutcome: string;
  readonly verifier: HumanVerifierOutcome;
  readonly notesPath: string | null;
  readonly transcriptPath: string | null;
}

export interface HumanValidationFailure {
  readonly code: string;
  readonly path: string;
  readonly detail: string;
}

export interface HumanReadinessCheck {
  readonly id: string;
  readonly verdict: "pass" | "fail" | "n/a";
  readonly detail: string;
}

export interface HumanReadinessAudit {
  readonly familyId: string;
  readonly packageAvailable: boolean;
  readonly packageHash: string | null;
  readonly visibleFiles: readonly string[];
  readonly verdict: "human-ready" | "not-ready";
  readonly checks: readonly HumanReadinessCheck[];
}

export interface HumanEvidenceSummary {
  readonly familyId: string;
  readonly packageHash: string | null;
  readonly humanPackageReady: boolean;
  readonly cleanHumanSolves: number;
  readonly reviewRecords: number;
  readonly nonCountingRecords: number;
  readonly invalidCountedRecords: number;
  readonly unresolvedAmbiguities: number;
  readonly claimLevel: HumanClaimLevel;
  readonly statusCounts: Readonly<Record<HumanReviewStatus, number>>;
  readonly validationFailures: readonly {
    readonly reviewId: string;
    readonly codes: readonly string[];
  }[];
}
