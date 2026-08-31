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

export interface AdversarialAttackRecord {
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
  readonly countedNoBypassAudits: number;
  readonly countedBypassAudits: number;
  readonly uncountedRecords: number;
  readonly invalidCountedRecords: number;
  readonly unrepairedBypasses: number;
  readonly repairedBypasses: number;
  readonly claimLevel: AdversarialClaimLevel;
  readonly statusCounts: Readonly<Record<AdversarialAuditStatus, number>>;
  readonly bypassCounts: Readonly<Record<BypassClass, number>>;
  readonly validationFailures: readonly {
    readonly attackId: string;
    readonly codes: readonly string[];
  }[];
}
