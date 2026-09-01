import { ALLOWED_REASON, type DecisionReason } from "./spec.js";
import type {
  AliasState,
  BaselineRecord,
  CachedEvalSummary,
  CanaryWindow,
  DeploymentSurface,
  EvalSample,
  ModelAlias,
  ModelVersion,
  RolloutDecision,
  RolloutEffect,
  RolloutEffectRequest,
  RolloutLedgerEntry,
  RolloutPhase,
  RolloutRequest,
  ScenarioView,
  SubjectModelClaim,
} from "./types.js";

export const VERSION_STATES = ["same", "successor", "rollback_target"] as const;
export type VersionState = (typeof VERSION_STATES)[number];

export const CACHE_STATES = ["fresh", "stale_initial", "stale_previous"] as const;
export type CacheState = (typeof CACHE_STATES)[number];

export const REGRESSION_SEVERITIES = ["none", "minor", "major", "unknown"] as const;
export type RegressionSeverity = (typeof REGRESSION_SEVERITIES)[number];

export const EVAL_MIXES = ["all_current", "mixed_versions", "misattributed", "insufficient"] as const;
export type EvalMix = (typeof EVAL_MIXES)[number];

export const ROLLBACK_TIMINGS = ["none", "stale_request", "after_bad_eval"] as const;
export type RollbackTiming = (typeof ROLLBACK_TIMINGS)[number];

export const BASELINE_STATES = ["correct_previous", "stale_alias", "wrong_current"] as const;
export type BaselineState = (typeof BASELINE_STATES)[number];

export const PROVIDER_DISAGREEMENTS = [
  "none",
  "provider_says_green",
  "provider_says_red",
  "subject_says_green",
] as const;
export type ProviderDisagreement = (typeof PROVIDER_DISAGREEMENTS)[number];

export const REEVALUATION_STATES = ["available", "unavailable"] as const;
export type ReEvaluationState = (typeof REEVALUATION_STATES)[number];

export interface ScenarioParams {
  readonly seed: 11 | 23 | 41 | 67;
  readonly alias: ModelAlias;
  readonly currentVersionState: VersionState;
  readonly rolloutPhase: RolloutPhase;
  readonly cacheState: CacheState;
  readonly canaryWindow: CanaryWindow;
  readonly regressionSeverity: RegressionSeverity;
  readonly evalMix: EvalMix;
  readonly rollbackTiming: RollbackTiming;
  readonly baselineState: BaselineState;
  readonly providerDisagreement: ProviderDisagreement;
  readonly reevaluation: ReEvaluationState;
  readonly surface: DeploymentSurface;
  readonly repeatCount: 1 | 2;
}

export interface ExpectedDecision {
  readonly decision: RolloutDecision;
  readonly reason: DecisionReason;
  readonly concreteVersion: ModelVersion | null;
  readonly baselineVersion: ModelVersion | null;
  readonly requiredEffects: readonly string[];
  readonly forbiddenEffects: readonly string[];
}

export interface DeploymentCall {
  readonly seq: number;
  readonly attempt: number;
  readonly method: "currentAlias" | "rolloutLedger" | "evalStream" | "baseline" | "applyRolloutDecision";
  readonly id: string;
  readonly actionId: string | null;
}

export interface EffectRecord {
  readonly seq: number;
  readonly attempt: number;
  readonly actionId: string;
  readonly effect: RolloutEffect;
}

export interface Scenario {
  readonly id: string;
  readonly params: ScenarioParams;
  readonly view: Omit<ScenarioView, "attempt">;
  readonly currentAlias: AliasState;
  readonly rolloutLedger: readonly RolloutLedgerEntry[];
  readonly evalStream: readonly EvalSample[];
  readonly baseline: BaselineRecord;
  readonly expected: ExpectedDecision;
}

const BASE_OBSERVED_AT = 200;

function initialVersionFor(seed: ScenarioParams["seed"]): ModelVersion {
  return seed === 23 || seed === 67 ? "model-beta" : "model-alpha";
}

function successor(version: ModelVersion): ModelVersion {
  if (version === "model-alpha") return "model-beta";
  if (version === "model-beta") return "model-gamma";
  return "model-alpha";
}

function previous(version: ModelVersion): ModelVersion {
  if (version === "model-alpha") return "model-gamma";
  if (version === "model-beta") return "model-alpha";
  return "model-beta";
}

function currentVersionFor(params: ScenarioParams): ModelVersion {
  const initial = initialVersionFor(params.seed);
  if (params.currentVersionState === "same") return initial;
  if (params.currentVersionState === "successor") return successor(initial);
  return previous(initial);
}

function generationFor(params: ScenarioParams): number {
  if (params.currentVersionState === "same") return 10;
  if (params.currentVersionState === "successor") return 11;
  return 12;
}

function phaseCanaryPercent(phase: RolloutPhase): number {
  if (phase === "pre_canary") return 0;
  if (phase === "canary") return 10;
  if (phase === "ramp") return 50;
  return 100;
}

function deltaFor(severity: RegressionSeverity): number | null {
  if (severity === "none") return 0;
  if (severity === "minor") return 0.03;
  if (severity === "major") return 0.16;
  return null;
}

export function currentAliasFor(params: ScenarioParams): AliasState {
  return {
    alias: params.alias,
    version: currentVersionFor(params),
    generation: generationFor(params),
    phase: params.rolloutPhase,
    canaryWindow: params.canaryWindow,
    canaryPercent: phaseCanaryPercent(params.rolloutPhase),
  };
}

function cachedAliasFor(params: ScenarioParams, current: AliasState): AliasState {
  const initial = initialVersionFor(params.seed);
  if (params.cacheState === "fresh") return current;
  if (params.cacheState === "stale_previous") {
    return {
      ...current,
      version: previous(initial),
      generation: 9,
      phase: "complete",
      canaryWindow: "complete",
      canaryPercent: 100,
    };
  }
  return {
    ...current,
    version: initial,
    generation: 10,
    phase: "complete",
    canaryWindow: "complete",
    canaryPercent: 100,
  };
}

export function rolloutLedgerFor(params: ScenarioParams): readonly RolloutLedgerEntry[] {
  const initial = initialVersionFor(params.seed);
  const current = currentAliasFor(params);
  const entries: RolloutLedgerEntry[] = [
    {
      seq: 1,
      alias: params.alias,
      version: initial,
      generation: 10,
      phase: "complete",
      canaryWindow: "complete",
      note: "approved baseline alias mapping",
    },
  ];
  if (current.generation !== 10 || current.version !== initial) {
    entries.push({
      seq: 2,
      alias: params.alias,
      version: current.version,
      generation: current.generation,
      phase: current.phase,
      canaryWindow: current.canaryWindow,
      note: "current rollout alias mapping",
    });
  }
  if (params.rollbackTiming === "stale_request") {
    entries.push({
      seq: 3,
      alias: params.alias,
      version: initial,
      generation: 10,
      phase: "complete",
      canaryWindow: "complete",
      note: "stale rollback request references the approved generation",
    });
  }
  if (params.rollbackTiming === "after_bad_eval") {
    entries.push({
      seq: 4,
      alias: params.alias,
      version: current.version,
      generation: current.generation,
      phase: current.phase,
      canaryWindow: current.canaryWindow,
      note: "rollback request is tied to the current eval evidence",
    });
  }
  return entries;
}

function sampleVersions(params: ScenarioParams, current: ModelVersion): readonly ModelVersion[] {
  const initial = initialVersionFor(params.seed);
  if (params.evalMix === "insufficient") return [current];
  if (params.evalMix === "mixed_versions") return [current, current, initial, previous(initial)];
  return [current, current, current, current];
}

export function evalStreamFor(params: ScenarioParams): readonly EvalSample[] {
  const current = currentVersionFor(params);
  const versions = sampleVersions(params, current);
  const inWindow = params.canaryWindow !== "closed" && params.rolloutPhase !== "pre_canary";
  const delta = deltaFor(params.regressionSeverity);
  return versions.map((servedVersion, index) => ({
    sampleId: `eval-${params.seed}-${index + 1}`,
    requestId: `req-${params.alias}-${params.seed}-${index + 1}`,
    alias: params.alias,
    servedVersion,
    publicVersionLabel:
      params.evalMix === "misattributed" && index % 2 === 0 ? initialVersionFor(params.seed) : servedVersion,
    scoreDelta: servedVersion === current ? delta : 0,
    inRolloutWindow: inWindow,
  }));
}

export function baselineFor(params: ScenarioParams): BaselineRecord {
  return {
    version: initialVersionFor(params.seed),
    sampleCount: 80,
    rollbackThreshold: 0.1,
    quarantineThreshold: 0.05,
  };
}

function cachedBaselineVersionFor(params: ScenarioParams): ModelVersion {
  const baseline = baselineFor(params).version;
  if (params.baselineState === "correct_previous") return baseline;
  if (params.baselineState === "wrong_current") return currentVersionFor(params);
  return params.cacheState === "stale_previous" ? previous(baseline) : successor(baseline);
}

function cachedEvalSummaryFor(params: ScenarioParams, stream: readonly EvalSample[]): CachedEvalSummary {
  const authoritative = stream.filter((sample) => sample.servedVersion === currentVersionFor(params));
  const claimedDelta =
    params.providerDisagreement === "provider_says_green" ||
    params.providerDisagreement === "subject_says_green"
      ? 0
      : params.providerDisagreement === "provider_says_red"
        ? 0.16
        : (authoritative[0]?.scoreDelta ?? null);
  return {
    sampleIds: stream.map((sample) => sample.sampleId),
    claimedVersion:
      params.evalMix === "misattributed" || params.cacheState !== "fresh"
        ? initialVersionFor(params.seed)
        : currentVersionFor(params),
    claimedScoreDelta: claimedDelta,
    sampleCount: stream.length,
  };
}

function subjectModelClaimFor(params: ScenarioParams): SubjectModelClaim | null {
  if (params.providerDisagreement === "none") return null;
  const current = currentAliasFor(params);
  return {
    source: params.providerDisagreement === "subject_says_green" ? "subject-report" : "provider-summary",
    alias: params.alias,
    version: current.version,
    generation: current.generation,
    saysHealthy: params.providerDisagreement !== "provider_says_red",
    note: "public status summary, not a verifier-owned rollout ledger",
  };
}

export function rolloutEffectFor(
  request: RolloutRequest,
  decision: RolloutDecision,
  concreteVersion: ModelVersion | null,
  baselineVersion: ModelVersion | null,
): RolloutEffectRequest {
  return {
    alias: request.alias,
    decision,
    concreteVersion,
    baselineVersion,
    idempotencyKey: request.idempotencyKey,
  };
}

export function expectedEffectId(request: RolloutRequest, decision: RolloutDecision): string {
  return `rollout:${request.idempotencyKey}:${request.alias}:${decision}`;
}

const insufficientDecision = (
  params: Pick<ScenarioParams, "reevaluation">,
): { decision: RolloutDecision; reason: DecisionReason } =>
  params.reevaluation === "available"
    ? { decision: "re_evaluate", reason: "DMD7_QUARANTINE_OR_REEVALUATE_REQUIRED" }
    : { decision: "quarantine", reason: "DMD7_QUARANTINE_OR_REEVALUATE_REQUIRED" };

export function decideRollout(
  request: RolloutRequest,
  currentAlias: AliasState | null,
  _rolloutLedger: readonly RolloutLedgerEntry[],
  evalStream: readonly EvalSample[],
  baseline: BaselineRecord | null,
  reevaluation: ReEvaluationState,
): ExpectedDecision {
  if (currentAlias === null) {
    return {
      decision: "quarantine",
      reason: "DMD1_CURRENT_ALIAS_REQUIRED",
      concreteVersion: null,
      baselineVersion: baseline?.version ?? null,
      requiredEffects: [expectedEffectId(request, "quarantine")],
      forbiddenEffects: [expectedEffectId(request, "continue"), expectedEffectId(request, "rollback")],
    };
  }
  if (baseline === null || baseline.version !== request.requiredBaselineVersion) {
    return {
      decision: "quarantine",
      reason: "DMD3_BASELINE_MATCH_REQUIRED",
      concreteVersion: currentAlias.version,
      baselineVersion: baseline?.version ?? null,
      requiredEffects: [expectedEffectId(request, "quarantine")],
      forbiddenEffects: [expectedEffectId(request, "continue"), expectedEffectId(request, "rollback")],
    };
  }
  const inWindow = currentAlias.canaryWindow !== "closed" && currentAlias.phase !== "pre_canary";
  if (!inWindow) {
    const decision = reevaluation === "available" ? "re_evaluate" : "quarantine";
    return {
      decision,
      reason: "DMD4_ROLLOUT_WINDOW_REQUIRED",
      concreteVersion: currentAlias.version,
      baselineVersion: baseline.version,
      requiredEffects: [expectedEffectId(request, decision)],
      forbiddenEffects: [expectedEffectId(request, "continue"), expectedEffectId(request, "rollback")],
    };
  }

  const currentSamples = evalStream.filter(
    (sample) => sample.servedVersion === currentAlias.version && sample.inRolloutWindow,
  );
  if (currentSamples.length < 2 || currentSamples.some((sample) => sample.scoreDelta === null)) {
    const fallback = insufficientDecision({ reevaluation });
    return {
      decision: fallback.decision,
      reason: fallback.reason,
      concreteVersion: currentAlias.version,
      baselineVersion: baseline.version,
      requiredEffects: [expectedEffectId(request, fallback.decision)],
      forbiddenEffects: [expectedEffectId(request, "continue"), expectedEffectId(request, "rollback")],
    };
  }

  const worstDelta = Math.max(...currentSamples.map((sample) => sample.scoreDelta ?? 0));
  if (worstDelta >= baseline.rollbackThreshold) {
    return {
      decision: "rollback",
      reason: "DMD5_ROLLBACK_REQUIRED",
      concreteVersion: currentAlias.version,
      baselineVersion: baseline.version,
      requiredEffects: [expectedEffectId(request, "rollback")],
      forbiddenEffects: [expectedEffectId(request, "continue")],
    };
  }

  return {
    decision: "continue",
    reason: ALLOWED_REASON,
    concreteVersion: currentAlias.version,
    baselineVersion: baseline.version,
    requiredEffects: [expectedEffectId(request, "continue")],
    forbiddenEffects: [expectedEffectId(request, "rollback")],
  };
}

export function buildScenarioFromParts(params: ScenarioParams): Scenario {
  const currentAlias = currentAliasFor(params);
  const rolloutLedger = rolloutLedgerFor(params);
  const evalStream = evalStreamFor(params);
  const baseline = baselineFor(params);
  const request: RolloutRequest = {
    id: `rollout-${params.alias}-${params.seed}`,
    alias: params.alias,
    approvedVersion: initialVersionFor(params.seed),
    approvedGeneration: 10,
    requiredBaselineVersion: baseline.version,
    reevaluationAvailable: params.reevaluation === "available",
    observedAt: BASE_OBSERVED_AT,
    idempotencyKey: `idem-${params.alias}-${params.seed}-${params.surface}`,
    surface: params.surface,
  };
  const idValue = [
    "dmd",
    params.alias,
    params.currentVersionState,
    params.rolloutPhase,
    `cache-${params.cacheState}`,
    `window-${params.canaryWindow}`,
    `reg-${params.regressionSeverity}`,
    params.evalMix,
    params.rollbackTiming,
    params.baselineState,
    params.providerDisagreement,
    params.reevaluation,
    params.surface,
    `r${params.repeatCount}`,
    params.seed,
  ].join("-");

  return {
    id: idValue,
    params,
    view: {
      id: idValue,
      request,
      cachedAlias: cachedAliasFor(params, currentAlias),
      cachedEvalSummary: cachedEvalSummaryFor(params, evalStream),
      cachedBaselineVersion: cachedBaselineVersionFor(params),
      subjectModelClaim: subjectModelClaimFor(params),
    },
    currentAlias,
    rolloutLedger,
    evalStream,
    baseline,
    expected: decideRollout(request, currentAlias, rolloutLedger, evalStream, baseline, params.reevaluation),
  };
}

export function withAttempt(scenario: Scenario, attempt: number): ScenarioView {
  return { ...scenario.view, attempt };
}
