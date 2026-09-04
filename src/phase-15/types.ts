export const DISCOVERY_CHANNELS = [
  "benchmark-trajectory-solve-patch",
  "verifier-repair-bypass",
  "agent-self-check-failure",
  "known-hard-benchmark",
  "authoritative-incident-upstream-fix",
  "boundary-first-system-inspection",
] as const;
export type DiscoveryChannel = (typeof DISCOVERY_CHANNELS)[number];

export const SOURCE_ROLES = ["prospective", "retrospective-calibration-excluded-from-yield"] as const;
export type SourceRole = (typeof SOURCE_ROLES)[number];

export const SOURCE_ADAPTERS = [
  "local-document-snapshot",
  "trial-directory-snapshot",
  "pinned-upstream-task-snapshot",
  "authoritative-incident-snapshot",
] as const;
export type SourceAdapterId = (typeof SOURCE_ADAPTERS)[number];

export interface Phase15Preregistration {
  readonly schema: "agent-eval-foundry/phase-15-discovery-preregistration@1";
  readonly baselineCommit: string;
  readonly immutability: {
    readonly runId: string;
  };
  readonly channelsImplemented: readonly DiscoveryChannel[];
  readonly sourceCorpus: readonly {
    readonly sourceUnitId: string;
    readonly role: SourceRole;
    readonly channel: DiscoveryChannel;
    readonly locator: string;
    readonly extractionLimit: number;
  }[];
  readonly limits: {
    readonly sourceUnits: number;
    readonly prospectiveSourceUnits: number;
    readonly patternsPerSourceUnit: number;
    readonly prospectiveCandidateDrafts: number;
    readonly readerReviews: number;
    readonly readerReviewsPerCandidate: number;
    readonly cheapProbes: number;
    readonly modelReadBudgetUsd: number;
    readonly paidSubjectTrials: number;
    readonly engineerHours: number;
  };
  readonly predictions: {
    readonly patternsExtractedFromProspectiveSources: number;
    readonly candidateDrafts: number;
    readonly unanimousReaderSurvivors: number;
    readonly probeSurvivors: number;
    readonly note: string;
  };
  readonly readerProtocol: {
    readonly threshold: string;
    readonly blindedTo: readonly string[];
    readonly requiredPassDimensions: readonly string[];
    readonly use: string;
  };
  readonly noveltyStandard: {
    readonly required: string;
    readonly breadth: string;
    readonly deduplication: string;
  };
  readonly promotionCriteria: readonly string[];
  readonly rankingPolicy: Readonly<Record<string, string>>;
  readonly stoppingRules: readonly string[];
}

export interface SourceMeasurement {
  readonly name: string;
  readonly value: number;
  readonly denominator: number | null;
}

export interface SourceCorpusRow {
  readonly sourceUnitId: string;
  readonly role: SourceRole;
  readonly channel: DiscoveryChannel;
  readonly adapter: SourceAdapterId;
  readonly provenance: {
    readonly locator: string;
    readonly revision: string;
    readonly contentDigest: string;
    readonly digestAlgorithm: "sha256" | "git-blob-sha1" | "snapshot-evidence-sha256";
    readonly snapshotPath: string | null;
    readonly primary: boolean;
  };
  readonly evidence: {
    readonly class: string;
    readonly countable: boolean;
    readonly countabilityReason: string;
    readonly observedFailure: string;
    readonly measurements: readonly SourceMeasurement[];
    readonly locations: readonly string[];
  };
  readonly extraction: {
    readonly affectedLayer: string;
    readonly failureAxis: string;
    readonly transferableMechanism: string;
    readonly candidateSubstrate: string | null;
    readonly subjectActionContract: string;
    readonly existingFamilyEquivalence: {
      readonly familyId: string;
      readonly sameFailureAxis: boolean;
      readonly sameSubjectActionContract: boolean;
      readonly reason: string;
    } | null;
    readonly authorityBoundary: {
      readonly kind: string;
      readonly enforcement: string;
      readonly subjectCanCross: boolean;
    };
    readonly applicableOperators: readonly string[];
    readonly validityRisks: readonly string[];
    readonly cheapProbe: {
      readonly probeType: string;
      readonly falsifier: string;
      readonly witnessIsolation: string;
    } | null;
    readonly eligibility: {
      readonly eligible: boolean;
      readonly reason: string;
    };
  };
}

export interface Phase15SourceCorpus {
  readonly schema: "agent-eval-foundry/phase-15-source-corpus@1";
  readonly runId: string;
  readonly preregistrationSha256: string;
  readonly acquiredAt: string | null;
  readonly sources: readonly SourceCorpusRow[];
}

export interface AdapterAudit {
  readonly adapter: SourceAdapterId;
  readonly valid: boolean;
  readonly checks: readonly string[];
  readonly sourceFamilyId: string | null;
}

export interface Phase15ProvenanceRecord {
  readonly sourceUnitId: string;
  readonly role: SourceRole;
  readonly channel: DiscoveryChannel;
  readonly sourceLocator: string;
  readonly sourceRevision: string;
  readonly sourceDigest: string;
  readonly digestAlgorithm: string;
  readonly sourceSnapshotPath: string | null;
  readonly primarySource: boolean;
  readonly evidenceClass: string;
  readonly countable: boolean;
  readonly countabilityReason: string;
  readonly observedFailure: string;
  readonly measurements: readonly SourceMeasurement[];
  readonly evidenceLocations: readonly string[];
  readonly affectedLayer: string;
  readonly failureAxis: string;
  readonly transferableMechanism: string;
  readonly candidateSubstrate: string | null;
  readonly existingFamilyEquivalence: SourceCorpusRow["extraction"]["existingFamilyEquivalence"];
  readonly applicableOperators: readonly string[];
  readonly validityRisks: readonly string[];
  readonly cheapProbe: SourceCorpusRow["extraction"]["cheapProbe"];
  readonly adapterAudit: AdapterAudit;
  readonly extractionStatus:
    | "retrospective-excluded"
    | "ineligible-evidence"
    | "candidate-drafted"
    | "deduplicated-existing";
  readonly extractionReason: string;
  readonly semanticFingerprint: string;
  readonly duplicateOf: string | null;
}

export type OperatorEffectStatus =
  | "phase14-measured-positive"
  | "phase14-measured-negative"
  | "phase14-measured-null"
  | "phase14-not-estimable"
  | "validity-control-only"
  | "unmeasured-hypothesis";

export interface OperatorAssessment {
  readonly operatorId: string;
  readonly status: OperatorEffectStatus;
  readonly phase14Estimand: string | null;
  readonly estimate: number | null;
  readonly rankingDelta: number;
  readonly reason: string;
}

export interface Phase15Candidate {
  readonly candidateId: string;
  readonly sourceUnitId: string;
  readonly channel: DiscoveryChannel;
  readonly title: string;
  readonly domain: string;
  readonly affectedLayer: string;
  readonly failureAxis: string;
  readonly observedFailure: string;
  readonly transferableMechanism: string;
  readonly subjectActionContract: string;
  readonly authorityBoundary: SourceCorpusRow["extraction"]["authorityBoundary"];
  readonly applicableOperators: readonly OperatorAssessment[];
  readonly validityRisks: readonly string[];
  readonly cheapProbe: NonNullable<SourceCorpusRow["extraction"]["cheapProbe"]>;
  readonly semanticFingerprint: string;
  readonly semanticNovelty: boolean;
  readonly duplicateOf: string | null;
  readonly engineScore: number;
  readonly scoreBreakdown: {
    readonly sourceEvidence: number;
    readonly causalSpecificity: number;
    readonly structuralBoundary: number;
    readonly naturalContract: number;
    readonly cheapProbe: number;
    readonly novelty: number;
    readonly measuredOperatorUplift: number;
  };
  readonly queueStatus: "reader-review" | "deduplicated";
  readonly queueReason: string;
}

export interface Phase15ReaderPacket {
  readonly schema: "agent-eval-foundry/phase-15-reader-packet@1";
  readonly candidateId: string;
  readonly packetSha256: string;
  readonly blindedTo: readonly string[];
  readonly reviewQuestion: string;
  readonly requiredDimensions: readonly string[];
  readonly noveltyBaseline: readonly {
    readonly familyId: string;
    readonly domain: string;
    readonly mechanisms: readonly string[];
  }[];
  readonly source: {
    readonly channel: DiscoveryChannel;
    readonly locator: string;
    readonly revision: string;
    readonly evidenceClass: string;
    readonly countable: boolean;
    readonly countabilityReason: string;
    readonly observedFailure: string;
    readonly measurements: readonly SourceMeasurement[];
    readonly evidenceLocations: readonly string[];
  };
  readonly proposal: {
    readonly title: string;
    readonly domain: string;
    readonly affectedLayer: string;
    readonly failureAxis: string;
    readonly transferableMechanism: string;
    readonly subjectActionContract: string;
    readonly authorityBoundary: SourceCorpusRow["extraction"]["authorityBoundary"];
    readonly applicableOperators: readonly {
      readonly operatorId: string;
      readonly evidenceStatus: OperatorEffectStatus;
    }[];
    readonly validityRisks: readonly string[];
    readonly cheapProbe: NonNullable<SourceCorpusRow["extraction"]["cheapProbe"]>;
  };
}

export type ReaderDimensionVerdict = "pass" | "fail" | "uncertain";

export interface Phase15ReaderReview {
  readonly reviewId: string;
  readonly candidateId: string;
  readonly readerId: string;
  readonly sessionId: string;
  readonly providerFamily: string;
  readonly model: string;
  readonly packetSha256: string;
  readonly independentlyProduced: boolean;
  readonly blindedTo: readonly string[];
  readonly dimensions: Readonly<Record<string, ReaderDimensionVerdict>>;
  readonly verdict: "promote" | "kill";
  readonly rationale: string;
  readonly earliestFailedDimension: string | null;
  readonly costUsd: number | null;
  readonly tokensUsed: number;
  readonly rawOutputPath: string;
  readonly rawOutputSha256: string;
}

export interface Phase15ReaderReviewLedger {
  readonly schema: "agent-eval-foundry/phase-15-reader-reviews@1";
  readonly runId: string;
  readonly reviews: readonly Phase15ReaderReview[];
}

export interface CandidateReaderDecision {
  readonly candidateId: string;
  readonly required: number;
  readonly reviewsReceived: number;
  readonly providerFamilies: readonly string[];
  readonly unanimous: boolean;
  readonly verdict: "survived" | "killed" | "pending";
  readonly reasons: readonly string[];
}

export interface Phase15ProbeResult {
  readonly candidateId: string;
  readonly probeType: string;
  readonly status: "survived" | "killed" | "not-run";
  readonly reason: string;
  readonly b6: {
    readonly usable: boolean;
    readonly knownGoodPassed: boolean;
    readonly knownBadFailed: boolean;
    readonly malformedInputRefused: boolean;
    readonly sameInvocation: boolean;
    readonly reasons: readonly string[];
  };
  readonly mechanismActivated: boolean;
  readonly witnessIsolated: boolean;
  readonly observations: Readonly<Record<string, string | number | boolean>>;
}

export interface DiscoveryMethodComparison {
  readonly method: "evidence-mined-v2" | "transfer-based" | "boundary-first" | "author-generation";
  readonly systemsRead: number;
  readonly candidatesDrafted: number;
  readonly readerReviewed: number;
  readonly readerSurvivors: number;
  readonly probeRun: number;
  readonly probeSurvivors: number;
  readonly novelSurvivors: number;
  readonly domainBreadth: number;
  readonly failureAxes: number;
  readonly modelReads: number;
  readonly modelTokens: number;
  readonly pricedUsd: number;
  readonly unpricedCost: string;
  readonly claimBoundary: string;
}

export interface Phase15DiscoveryRun {
  readonly schema: "agent-eval-foundry/phase-15-discovery-run@1";
  readonly runId: string;
  readonly preregistrationSha256: string;
  readonly sourceCorpusSha256: string;
  readonly readerReviewsSha256: string;
  readonly preregistrationBaselineCommit: string;
  readonly provenance: readonly Phase15ProvenanceRecord[];
  readonly candidates: readonly Phase15Candidate[];
  readonly readerPackets: readonly Phase15ReaderPacket[];
  readonly reviews: readonly Phase15ReaderReview[];
  readonly readerDecisions: readonly CandidateReaderDecision[];
  readonly probes: readonly Phase15ProbeResult[];
  readonly comparison: readonly DiscoveryMethodComparison[];
  readonly summary: {
    readonly sourceUnits: number;
    readonly prospectiveSourceUnits: number;
    readonly prospectivePatterns: number;
    readonly candidateDrafts: number;
    readonly semanticDuplicates: number;
    readonly readerCandidates: number;
    readonly readerSurvivors: number;
    readonly probeSurvivors: number;
    readonly domainBreadth: number;
    readonly failureAxisBreadth: number;
    readonly prospectiveYieldPerSource: number;
    readonly discoveryCostPerSurvivor: string;
    readonly predictionOutcomes: Readonly<Record<string, "met" | "falsified" | "pending">>;
  };
  readonly corrections: readonly string[];
  readonly conclusion: string;
}
