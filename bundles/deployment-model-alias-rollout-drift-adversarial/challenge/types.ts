// Public domain model for the challenge.
// Hidden truth, scenarios, verifier and mutants are deliberately absent.

export const MODEL_ALIASES = ["prod-chat", "eval-default"] as const;
export type ModelAlias = (typeof MODEL_ALIASES)[number];

export const MODEL_VERSIONS = ["model-alpha", "model-beta", "model-gamma"] as const;
export type ModelVersion = (typeof MODEL_VERSIONS)[number];

export const ROLLOUT_PHASES = ["pre_canary", "canary", "ramp", "complete"] as const;
export type RolloutPhase = (typeof ROLLOUT_PHASES)[number];

export const CANARY_WINDOWS = ["closed", "open", "complete"] as const;
export type CanaryWindow = (typeof CANARY_WINDOWS)[number];

export const DEPLOYMENT_SURFACES = ["release_console", "ci_worker", "routing_service"] as const;
export type DeploymentSurface = (typeof DEPLOYMENT_SURFACES)[number];

export type DecisionReason =
  | "ALLOWED"
  | "DMD1_CURRENT_ALIAS_REQUIRED"
  | "DMD2_CONCRETE_VERSION_ATTRIBUTED"
  | "DMD3_BASELINE_MATCH_REQUIRED"
  | "DMD4_ROLLOUT_WINDOW_REQUIRED"
  | "DMD5_ROLLBACK_REQUIRED"
  | "DMD6_CONTINUE_REQUIRED"
  | "DMD7_QUARANTINE_OR_REEVALUATE_REQUIRED"
  | "DMD8_NO_SUBJECT_OWNED_MODEL_TRUTH"
  | "DMD9_AUDIT_ROLLOUT_EVIDENCE"
  | "DMD10_REPORT_MATCHES_LEDGER";

export interface AliasState {
  readonly alias: ModelAlias;
  readonly version: ModelVersion;
  readonly generation: number;
  readonly phase: RolloutPhase;
  readonly canaryWindow: CanaryWindow;
  readonly canaryPercent: number;
}

export interface RolloutLedgerEntry {
  readonly seq: number;
  readonly alias: ModelAlias;
  readonly version: ModelVersion;
  readonly generation: number;
  readonly phase: RolloutPhase;
  readonly canaryWindow: CanaryWindow;
  readonly note: string;
}

export interface EvalSample {
  readonly sampleId: string;
  readonly requestId: string;
  readonly alias: ModelAlias;
  readonly servedVersion: ModelVersion;
  readonly publicVersionLabel: ModelVersion;
  readonly scoreDelta: number | null;
  readonly inRolloutWindow: boolean;
}

export interface BaselineRecord {
  readonly version: ModelVersion;
  readonly sampleCount: number;
  readonly rollbackThreshold: number;
  readonly quarantineThreshold: number;
}

export interface RolloutRequest {
  readonly id: string;
  readonly alias: ModelAlias;
  readonly approvedVersion: ModelVersion;
  readonly approvedGeneration: number;
  readonly requiredBaselineVersion: ModelVersion;
  readonly reevaluationAvailable: boolean;
  readonly observedAt: number;
  readonly idempotencyKey: string;
  readonly surface: DeploymentSurface;
}

export interface SubjectModelClaim {
  readonly source: "subject-report" | "provider-summary";
  readonly alias: ModelAlias;
  readonly version: ModelVersion;
  readonly generation: number;
  readonly saysHealthy: boolean;
  readonly note: string;
}

export interface CachedEvalSummary {
  readonly sampleIds: readonly string[];
  readonly claimedVersion: ModelVersion;
  readonly claimedScoreDelta: number | null;
  readonly sampleCount: number;
}

export interface ScenarioView {
  readonly id: string;
  readonly attempt: number;
  readonly request: RolloutRequest;
  readonly cachedAlias: AliasState;
  readonly cachedEvalSummary: CachedEvalSummary;
  readonly cachedBaselineVersion: ModelVersion;
  readonly subjectModelClaim: SubjectModelClaim | null;
}

export type RolloutDecision = "continue" | "rollback" | "quarantine" | "re_evaluate";

export interface Decision {
  readonly actionId: string;
  readonly decision: RolloutDecision;
  readonly reason: DecisionReason;
  readonly alias: ModelAlias;
  readonly concreteVersion: ModelVersion | null;
  readonly baselineVersion: ModelVersion | null;
}

export interface RolloutEffectRequest {
  readonly alias: ModelAlias;
  readonly decision: RolloutDecision;
  readonly concreteVersion: ModelVersion | null;
  readonly baselineVersion: ModelVersion | null;
  readonly idempotencyKey: string;
}

export interface RolloutEffect extends RolloutEffectRequest {
  readonly actionId: string;
}

export interface AuditEvent {
  readonly seq: number;
  readonly actionId: string;
  readonly reason: DecisionReason | "OBSERVED";
  readonly observedAlias: ModelAlias | null;
  readonly observedCurrentVersion: ModelVersion | null;
  readonly observedGeneration: number | null;
  readonly observedPhase: RolloutPhase | null;
  readonly observedCanaryWindow: CanaryWindow | null;
  readonly observedBaselineVersion: ModelVersion | null;
  readonly observedEvalSampleIds: readonly string[];
  readonly observedEvalServedVersions: readonly ModelVersion[];
  readonly usedSubjectModelClaim: boolean;
  readonly detail: string;
}

export interface SubjectReport {
  readonly decisions: readonly Decision[];
  readonly audit: readonly AuditEvent[];
}

export interface DeploymentFacade {
  currentAlias: (alias: ModelAlias) => AliasState | null;
  rolloutLedger: (alias: ModelAlias) => readonly RolloutLedgerEntry[];
  evalStream: (alias: ModelAlias) => readonly EvalSample[];
  baseline: (version: ModelVersion) => BaselineRecord | null;
  applyRolloutDecision: (actionId: string, effect: RolloutEffectRequest) => { ok: boolean; effectId: string };
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  run: (view: ScenarioView, deployment: DeploymentFacade) => SubjectReport;
}
