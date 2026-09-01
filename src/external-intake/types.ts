import type { RuleCode } from "../foundry/schema.js";

export const EXTERNAL_INTAKE_STATUSES = [
  "completed",
  "provider_refusal",
  "infrastructure_error",
  "timeout",
  "contaminated",
  "stale_hash",
] as const;
export type ExternalIntakeStatus = (typeof EXTERNAL_INTAKE_STATUSES)[number];

export const EXTERNAL_PROVIDER_FAMILIES = [
  "anthropic",
  "openai",
  "google",
  "external",
  "manual",
  "unknown",
] as const;
export type ExternalProviderFamily = (typeof EXTERNAL_PROVIDER_FAMILIES)[number];

export const EXTERNAL_RUN_RELATIONS = ["independent", "author", "collaborator", "unknown"] as const;
export type ExternalRunRelation = (typeof EXTERNAL_RUN_RELATIONS)[number];

export const EXTERNAL_PACKET_REQUIRED_FILES = [
  "README.md",
  "RUN_INSTRUCTIONS.md",
  "SUBMISSION_TEMPLATE.md",
  "METADATA_TEMPLATE.json",
  "VERIFY_COMMANDS.md",
  "DO_NOT_INCLUDE.md",
  "challenge_hash.txt",
  "scenario_set_id.txt",
  "metadata.json",
  "challenge/MANIFEST.json",
] as const;

export const EXTERNAL_INTAKE_RULE_CODES = [
  "EXTERNAL_PACKET_MISSING_TEMPLATE",
  "EXTERNAL_PACKET_LEAKS_HIDDEN",
  "EXTERNAL_INTAKE_METADATA_MISSING",
  "EXTERNAL_INTAKE_CHALLENGE_HASH_MISSING",
  "EXTERNAL_INTAKE_CHALLENGE_HASH_STALE",
  "EXTERNAL_INTAKE_MODIFIED_CHALLENGE_PACKAGE",
  "EXTERNAL_INTAKE_PROVIDER_ID_MISSING",
  "EXTERNAL_INTAKE_TRANSCRIPT_MISSING",
  "EXTERNAL_INTAKE_SUBMISSION_MISSING",
  "EXTERNAL_INTAKE_VERIFIER_OUTPUT_MISSING",
  "EXTERNAL_INTAKE_HIDDEN_ARTIFACT_LEAK",
  "EXTERNAL_INTAKE_PROVIDER_REFUSAL_COUNTED",
  "EXTERNAL_INTAKE_INFRA_ERROR_COUNTED",
  "EXTERNAL_INTAKE_AUTHOR_CONTAMINATED",
  "EXTERNAL_INTAKE_PRIVATE_HINT",
  "EXTERNAL_INTAKE_SCENARIO_SET_MISMATCH",
  "EXTERNAL_INTAKE_VERIFIER_RUN_MISMATCH",
  "EXTERNAL_INTAKE_DUPLICATE_RUN_ID",
  "EXTERNAL_INTAKE_PROVIDER_FAMILY_MISLABELLED",
] as const satisfies readonly RuleCode[];
export type ExternalIntakeRuleCode = (typeof EXTERNAL_INTAKE_RULE_CODES)[number];

export interface ExternalIntakeFinding {
  readonly code: ExternalIntakeRuleCode;
  readonly path: string;
  readonly detail: string;
}

export interface ExternalRunMetadata {
  readonly runId: string | null;
  readonly familyId: string | null;
  readonly providerFamily: ExternalProviderFamily | null;
  readonly provider: string | null;
  readonly model: string | null;
  readonly subjectId: string | null;
  readonly runtime: string | null;
  readonly runDate: string | null;
  readonly scenarioSetId: string | null;
  readonly challengeHash: string | null;
  readonly status: ExternalIntakeStatus | null;
  readonly countsRequested: boolean;
  readonly relationToAuthor: ExternalRunRelation;
  readonly privateHintsUsed: boolean;
  readonly hiddenFilesSeen: readonly string[];
  readonly notes: string;
}

export interface ExternalReturnedPacket {
  readonly dir: string;
  readonly familyId: string;
  readonly expectedChallengeHash: string;
  readonly expectedScenarioSetId: string;
  readonly actualChallengeHash: string | null;
  readonly metadata: ExternalRunMetadata | null;
  readonly transcriptPath: string | null;
  readonly submissionFiles: readonly string[];
  readonly verifierOutputPath: string | null;
  readonly verifierRunId: string | null;
  readonly leakedHiddenPaths: readonly string[];
}

export interface ExternalIntakeValidationResult {
  readonly packet: ExternalReturnedPacket;
  readonly findings: readonly ExternalIntakeFinding[];
  readonly countable: boolean;
  readonly countabilityReason: string;
  readonly status: ExternalIntakeStatus | "invalid";
  readonly importedTrialEligible: boolean;
}

export interface ExternalPacketAudit {
  readonly familyId: string;
  readonly providerId: string;
  readonly dir: string;
  readonly present: boolean;
  readonly challengeHash: string | null;
  readonly scenarioSetId: string | null;
  readonly requiredFilesPresent: boolean;
  readonly missingRequiredFiles: readonly string[];
  readonly leakCheck: "pass" | "fail" | "missing";
  readonly leakDetail: string;
  readonly hiddenArtifactsAbsent: boolean;
  readonly instructionFiles: readonly string[];
  readonly returnedPacketShape: readonly string[];
}

export interface ExternalIntakeImportResult {
  readonly validation: ExternalIntakeValidationResult;
  readonly preservedDir: string;
  readonly trialDir: string | null;
}

export interface ExternalHalfMatrixSlot {
  readonly slotId: string;
  readonly providerFamily: ExternalProviderFamily;
  readonly provider: string;
  readonly model: string;
  readonly subjectId: string;
  readonly state: "counted-existing" | "planned" | "blocked";
  readonly runId: string | null;
  readonly note: string;
}

export interface ExternalHalfMatrixPlan {
  readonly planId: string;
  readonly familyId: string;
  readonly challengeHash: string;
  readonly scenarioSetId: string;
  readonly slots: readonly ExternalHalfMatrixSlot[];
  readonly countsAsCrossLab: boolean;
  readonly stoppingRules: readonly string[];
  readonly blockedFullMatrixReason: string;
}
