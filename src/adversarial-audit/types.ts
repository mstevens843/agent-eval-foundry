export const ADVERSARIAL_AUDIT_STATUSES = [
  "not-run",
  "no-bypass-found",
  "bypass-found",
  "exploit-attempt-blocked",
  "provider-refusal",
  "infrastructure-error",
  "timeout",
  "invalid-attack",
  "stale-hash",
  "contaminated",
  "superseded",
] as const;
export type AdversarialAuditStatus = (typeof ADVERSARIAL_AUDIT_STATUSES)[number];

export const BYPASS_CLASSES = [
  "hidden-artifact-leak",
  "ground-truth-rebinding",
  "ledger-forgery",
  "verifier-import-hijack",
  "process-boundary-escape",
  "challenge-hash-confusion",
  "baseline-imposter",
  "status-only-fake",
  "artifact-substitution",
  "environment-assumption",
  "scorer-output-forgery",
  "no-bypass",
] as const;
export type BypassClass = (typeof BYPASS_CLASSES)[number];

export const ADVERSARIAL_CLAIM_LEVELS = [
  "audit-pending",
  "adversarial-ready",
  "adversarial-audited",
  "bypass-found",
  "bypass-repaired",
] as const;
export type AdversarialClaimLevel = (typeof ADVERSARIAL_CLAIM_LEVELS)[number];

export const ADVERSARIAL_VERIFIER_STATUSES = [
  "not-run",
  "no-bypass-confirmed",
  "bypass-confirmed",
  "exploit-blocked",
  "infrastructure-error",
] as const;
export type AdversarialVerifierStatus = (typeof ADVERSARIAL_VERIFIER_STATUSES)[number];

export const ADVERSARIAL_AUDIT_VERSIONS = ["v1", "v2"] as const;
export type AdversarialAuditVersion = (typeof ADVERSARIAL_AUDIT_VERSIONS)[number];

export const ATTACK_EXECUTION_PROFILE_KINDS = [
  "provider-model",
  "external-import",
  "local-deterministic-probe",
] as const;
export type AttackExecutionProfileKind = (typeof ATTACK_EXECUTION_PROFILE_KINDS)[number];

export const ISOLATION_PROFILE_IDS = ["subprocess", "fs-sandbox", "container-planned", "container"] as const;
export type IsolationProfileId = (typeof ISOLATION_PROFILE_IDS)[number];

export const EXPLOIT_ARTIFACT_KINDS = [
  "none",
  "normal-solution",
  "theoretical-issue",
  "submitted-bypass",
  "metadata-forgery",
  "import-hijack",
  "hash-confusion",
  "ledger-forgery",
  "scorer-output-forgery",
  "environment-assumption",
  "process-boundary-escape",
] as const;
export type ExploitArtifactKind = (typeof EXPLOIT_ARTIFACT_KINDS)[number];

export const EXPLOIT_REPLAY_STATUSES = [
  "not-run",
  "no-artifact",
  "replay-passed-verifier",
  "replay-failed-verifier",
  "replay-blocked",
  "forbidden-access",
  "normal-solution",
  "infrastructure-error",
  "stale-hash",
] as const;
export type ExploitReplayStatus = (typeof EXPLOIT_REPLAY_STATUSES)[number];

export const BYPASS_TRIAGE_DECISIONS = [
  "not-triaged",
  "no-bypass-confirmed",
  "bypass-confirmed",
  "exploit-blocked",
  "theoretical-only",
  "normal-solution",
  "forbidden-access",
  "invalid-attack",
] as const;
export type BypassTriageDecision = (typeof BYPASS_TRIAGE_DECISIONS)[number];

export const HARDENING_PROBE_STATUSES = ["pass", "fail", "not-run"] as const;
export type HardeningProbeStatus = (typeof HARDENING_PROBE_STATUSES)[number];

export interface AdversarialThreatModel {
  readonly objective: string;
  readonly attackerReceives: readonly string[];
  readonly attackerMustNotReceive: readonly string[];
  readonly attackSurfaces: readonly string[];
  readonly allowedAccess: readonly string[];
  readonly forbiddenAccess: readonly string[];
  readonly bypassCriteria: readonly string[];
  readonly noBypassCriteria: readonly string[];
  readonly neverCounts: readonly AdversarialAuditStatus[];
  readonly repairInvalidates: readonly string[];
}

export interface AdversarialCampaign {
  readonly campaignId: string;
  readonly familyId: string;
  readonly challengeHash: string;
  readonly packagePath: string;
  readonly verifierHash: string | null;
  readonly threatModel: AdversarialThreatModel;
  readonly preservation: readonly string[];
  readonly providers: readonly string[];
  readonly status: "ready" | "pending-package" | "superseded";
}

export interface AdversarialAttacker {
  readonly provider: string;
  readonly model: string;
  readonly subjectId: string;
}

export interface AdversarialVerifierResult {
  readonly status: AdversarialVerifierStatus;
  readonly command: string | null;
  readonly outputPath: string | null;
  readonly detail: string;
}

export interface AdversarialRepairRecord {
  readonly status: "not-needed" | "planned" | "fixed" | "superseded";
  readonly repairId: string | null;
  readonly changedChallengePackage: boolean;
  readonly invalidatedAuditIds: readonly string[];
  readonly notes: string;
}

export interface AdversarialExecutionProfile {
  readonly kind: AttackExecutionProfileKind;
  readonly command: string | null;
  readonly providerRunnable: boolean;
  readonly attemptedBypass: boolean;
  readonly submittedNormalSolution: boolean;
  readonly theoreticalOnly: boolean;
  readonly notes: string;
}

export interface AdversarialIsolationProfile {
  readonly id: IsolationProfileId;
  readonly publicChallengeReadable: boolean;
  readonly hiddenArtifactsExcluded: boolean;
  readonly submissionWritable: boolean;
  readonly noRepoRoot: boolean;
  readonly noGeneratedReports: boolean;
  readonly verifierOutsideAttackerContext: boolean;
  readonly networkDisabled: boolean;
  readonly containerized: boolean;
  readonly adequateForCountedNoBypass: boolean;
  readonly notes: string;
}

export interface AdversarialExploitArtifact {
  readonly kind: ExploitArtifactKind;
  readonly path: string | null;
  readonly submittedArtifactPath: string | null;
  readonly declaredContractViolation: boolean;
  readonly usesForbiddenAccess: boolean;
  readonly replaysWithCurrentVerifier: boolean | null;
  readonly notes: string;
}

export interface AdversarialExploitReplayResult {
  readonly status: ExploitReplayStatus;
  readonly command: string | null;
  readonly outputPath: string | null;
  readonly challengeHash: string | null;
  readonly verifierHash: string | null;
  readonly verifierPassed: boolean | null;
  readonly contractViolated: boolean;
  readonly forbiddenAccessUsed: boolean;
  readonly detail: string;
}

export interface AdversarialBypassTriage {
  readonly decision: BypassTriageDecision;
  readonly attackerAttemptedBypass: boolean;
  readonly submittedNormalSolution: boolean;
  readonly theoreticalOnly: boolean;
  readonly exploitArtifactProduced: boolean;
  readonly exploitReplays: boolean;
  readonly verifierPasses: boolean;
  readonly contractViolated: boolean;
  readonly forbiddenAccessUsed: boolean;
  readonly verifierConfirmsNoBypass: boolean;
  readonly countabilityReason: string;
}

export interface AdversarialAttackRecord {
  readonly auditVersion: AdversarialAuditVersion;
  readonly attackId: string;
  readonly campaignId: string | null;
  readonly familyId: string;
  readonly status: AdversarialAuditStatus;
  readonly counts: boolean;
  readonly countabilityReason: string;
  readonly challengeHash: string | null;
  readonly verifierHash: string | null;
  readonly attacker: AdversarialAttacker;
  readonly attackSurface: readonly string[];
  readonly allowedAttackerAccess: readonly string[];
  readonly forbiddenAttackerAccess: readonly string[];
  readonly attackerContextFiles: readonly string[];
  readonly hiddenArtifactsInAttackerContext: readonly string[];
  readonly transcriptPath: string | null;
  readonly exploitArtifactPath: string | null;
  readonly submittedBypassArtifactPath: string | null;
  readonly verifier: AdversarialVerifierResult;
  readonly bypassClassification: BypassClass;
  readonly repair: AdversarialRepairRecord;
  readonly executionProfile: AdversarialExecutionProfile;
  readonly isolationProfile: AdversarialIsolationProfile;
  readonly exploitArtifact: AdversarialExploitArtifact;
  readonly exploitReplay: AdversarialExploitReplayResult;
  readonly triage: AdversarialBypassTriage;
  readonly startedAt: string | null;
  readonly endedAt: string | null;
  readonly runtimeSeconds: number | null;
  readonly notes: string;
}

export interface LoadedAdversarialAttack {
  readonly dir: string;
  readonly record: AdversarialAttackRecord;
  readonly transcriptText: string | null;
  readonly exploitText: string | null;
  readonly verifierText: string | null;
}

export interface AdversarialValidationFailure {
  readonly code: string;
  readonly path: string;
  readonly detail: string;
}

export interface AdversarialReadinessCheck {
  readonly id: string;
  readonly verdict: "pass" | "fail" | "n/a";
  readonly detail: string;
}

export interface AdversarialReadinessAudit {
  readonly familyId: string;
  readonly packageAvailable: boolean;
  readonly packageHash: string | null;
  readonly campaignId: string | null;
  readonly bundlePath: string | null;
  readonly verdict: "adversarial-ready" | "audit-pending";
  readonly checks: readonly AdversarialReadinessCheck[];
}

export interface AdversarialEvidenceSummary {
  readonly familyId: string;
  readonly packageHash: string | null;
  readonly adversarialReady: boolean;
  readonly campaignId: string | null;
  readonly auditRecords: number;
  readonly v2AuditRecords: number;
  readonly countedNoBypassAudits: number;
  readonly countedBypassAudits: number;
  readonly countedNoBypassV2Audits: number;
  readonly countedBypassV2Audits: number;
  readonly uncountedRecords: number;
  readonly invalidCountedRecords: number;
  readonly unrepairedBypasses: number;
  readonly repairedBypasses: number;
  readonly exploitReplayReady: boolean;
  readonly hardeningProbesPass: boolean;
  readonly hardeningProbeFailures: number;
  readonly claimLevel: AdversarialClaimLevel;
  readonly isolationCounts: Readonly<Record<IsolationProfileId, number>>;
  readonly statusCounts: Readonly<Record<AdversarialAuditStatus, number>>;
  readonly bypassCounts: Readonly<Record<BypassClass, number>>;
  readonly validationFailures: readonly {
    readonly attackId: string;
    readonly codes: readonly string[];
  }[];
}

export interface AdversarialHardeningProbe {
  readonly probeId: string;
  readonly familyId: string;
  readonly bypassClass: BypassClass;
  readonly status: HardeningProbeStatus;
  readonly expectedRuleCode: string | null;
  readonly expectedDecision: BypassTriageDecision | null;
  readonly detail: string;
}
