import type { DecisionReason } from "./spec.js";
import { type EffectRecord, type Scenario, decideRollout, rolloutEffectFor, withAttempt } from "./truth.js";
import type {
  AliasState,
  AuditEvent,
  BaselineRecord,
  CachedEvalSummary,
  DeploymentFacade,
  EvalSample,
  ModelVersion,
  RolloutLedgerEntry,
  ScenarioView,
  Subject,
  SubjectReport,
} from "./types.js";

const completed = new Map<string, Set<string>>();

export function resetCompletionRecords(): void {
  completed.clear();
}

const completedFor = (subjectId: string): Set<string> => {
  let set = completed.get(subjectId);
  if (set === undefined) {
    set = new Set();
    completed.set(subjectId, set);
  }
  return set;
};

export interface ReferenceOptions {
  readonly observeCurrentAlias: boolean;
  readonly observeRolloutLedger: boolean;
  readonly observeEvalStream: boolean;
  readonly observeBaseline: boolean;
  readonly trustSubjectModelClaim: boolean;
  readonly useAliasNameOnly: boolean;
  readonly useStaleBaseline: boolean;
  readonly ignoreRolloutWindow: boolean;
  readonly ignoreVersionAttribution: boolean;
  readonly alwaysRollback: boolean;
  readonly neverRollback: boolean;
  readonly overQuarantine: boolean;
  readonly collapseMixedStream: boolean;
  readonly invokeEffects: boolean;
  readonly guardDuplicates: boolean;
  readonly writeAudit: boolean;
  readonly lieAudit: boolean;
}

export const REFERENCE_OPTIONS: ReferenceOptions = {
  observeCurrentAlias: true,
  observeRolloutLedger: true,
  observeEvalStream: true,
  observeBaseline: true,
  trustSubjectModelClaim: false,
  useAliasNameOnly: false,
  useStaleBaseline: false,
  ignoreRolloutWindow: false,
  ignoreVersionAttribution: false,
  alwaysRollback: false,
  neverRollback: false,
  overQuarantine: false,
  collapseMixedStream: false,
  invokeEffects: true,
  guardDuplicates: true,
  writeAudit: true,
  lieAudit: false,
};

function baselineFromVersion(version: ModelVersion): BaselineRecord {
  return { version, sampleCount: 80, rollbackThreshold: 0.1, quarantineThreshold: 0.05 };
}

function evalsFromSummary(view: ScenarioView, summary: CachedEvalSummary): readonly EvalSample[] {
  return summary.sampleIds.map((sampleId, index) => ({
    sampleId,
    requestId: `cached-${sampleId}`,
    alias: view.request.alias,
    servedVersion: summary.claimedVersion,
    publicVersionLabel: summary.claimedVersion,
    scoreDelta: summary.claimedScoreDelta,
    inRolloutWindow: true,
  }));
}

function claimAlias(view: ScenarioView): AliasState {
  const claim = view.subjectModelClaim;
  return {
    alias: view.request.alias,
    version: claim?.version ?? view.cachedAlias.version,
    generation: claim?.generation ?? view.cachedAlias.generation,
    phase: view.cachedAlias.phase,
    canaryWindow: view.cachedAlias.canaryWindow,
    canaryPercent: view.cachedAlias.canaryPercent,
  };
}

function blindVersionAttribution(stream: readonly EvalSample[]): readonly EvalSample[] {
  return stream.map((sample) => ({
    ...sample,
    servedVersion: sample.publicVersionLabel,
  }));
}

function collapsedStream(view: ScenarioView, alias: AliasState | null): readonly EvalSample[] {
  const version = alias?.version ?? view.cachedEvalSummary.claimedVersion;
  const delta = view.cachedEvalSummary.claimedScoreDelta;
  return view.cachedEvalSummary.sampleIds.map((sampleId, index) => ({
    sampleId,
    requestId: `collapsed-${index + 1}`,
    alias: view.request.alias,
    servedVersion: version,
    publicVersionLabel: version,
    scoreDelta: delta,
    inRolloutWindow: true,
  }));
}

function auditEvent(
  seq: number,
  actionId: string,
  reason: DecisionReason | "OBSERVED",
  alias: AliasState | null,
  baseline: BaselineRecord | null,
  evals: readonly EvalSample[],
  usedSubjectModelClaim: boolean,
  detail: string,
): AuditEvent {
  return {
    seq,
    actionId,
    reason,
    observedAlias: alias?.alias ?? null,
    observedCurrentVersion: alias?.version ?? null,
    observedGeneration: alias?.generation ?? null,
    observedPhase: alias?.phase ?? null,
    observedCanaryWindow: alias?.canaryWindow ?? null,
    observedBaselineVersion: baseline?.version ?? null,
    observedEvalSampleIds: evals.map((sample) => sample.sampleId),
    observedEvalServedVersions: evals.map((sample) => sample.servedVersion),
    usedSubjectModelClaim,
    detail,
  };
}

function applyDecisionBug(
  base: ReturnType<typeof decideRollout>,
  options: ReferenceOptions,
  alias: AliasState | null,
  baseline: BaselineRecord | null,
): ReturnType<typeof decideRollout> {
  if (options.alwaysRollback) {
    return {
      decision: "rollback",
      reason: "DMD5_ROLLBACK_REQUIRED",
      concreteVersion: alias?.version ?? null,
      baselineVersion: baseline?.version ?? null,
      requiredEffects: [],
      forbiddenEffects: [],
    };
  }
  if (options.neverRollback && base.decision === "rollback") {
    return { ...base, decision: "continue", reason: "ALLOWED" };
  }
  if (options.overQuarantine) {
    return {
      ...base,
      decision: "quarantine",
      reason: "DMD7_QUARANTINE_OR_REEVALUATE_REQUIRED",
    };
  }
  if (options.useAliasNameOnly || options.ignoreRolloutWindow) {
    if (base.decision === "rollback") return base;
    return {
      ...base,
      decision: "continue",
      reason: "ALLOWED",
      concreteVersion: alias?.version ?? base.concreteVersion,
      baselineVersion: baseline?.version ?? base.baselineVersion,
    };
  }
  return base;
}

export function makeSubject(id: string, label: string, options: ReferenceOptions): Subject {
  return {
    id,
    label,
    run(view: ScenarioView, deployment: DeploymentFacade): SubjectReport {
      const usedSubjectModelClaim = options.trustSubjectModelClaim && view.subjectModelClaim !== null;
      const currentAlias = usedSubjectModelClaim
        ? claimAlias(view)
        : options.observeCurrentAlias
          ? deployment.currentAlias(view.request.alias)
          : view.cachedAlias;
      const rolloutLedger = options.observeRolloutLedger
        ? deployment.rolloutLedger(view.request.alias)
        : ([
            {
              seq: 1,
              alias: view.cachedAlias.alias,
              version: view.cachedAlias.version,
              generation: view.cachedAlias.generation,
              phase: view.cachedAlias.phase,
              canaryWindow: view.cachedAlias.canaryWindow,
              note: "cached alias ledger",
            },
          ] satisfies readonly RolloutLedgerEntry[]);
      const evalStream = options.collapseMixedStream
        ? collapsedStream(view, currentAlias)
        : options.observeEvalStream
          ? deployment.evalStream(view.request.alias)
          : evalsFromSummary(view, view.cachedEvalSummary);
      const attributedStream = options.ignoreVersionAttribution
        ? blindVersionAttribution(evalStream)
        : evalStream;
      const baseline =
        options.useStaleBaseline || !options.observeBaseline
          ? baselineFromVersion(view.cachedBaselineVersion)
          : deployment.baseline(view.request.requiredBaselineVersion);
      const effectiveAlias =
        options.ignoreRolloutWindow && currentAlias !== null
          ? { ...currentAlias, phase: "complete" as const, canaryWindow: "complete" as const }
          : currentAlias;
      const auditAlias = options.lieAudit ? view.cachedAlias : currentAlias;
      const auditBaseline = options.lieAudit ? baselineFromVersion(view.cachedBaselineVersion) : baseline;
      const auditEvals = options.lieAudit ? evalsFromSummary(view, view.cachedEvalSummary) : attributedStream;
      const audit: AuditEvent[] = [];
      const actionId = view.request.id;
      let seq = 0;

      if (options.writeAudit) {
        seq += 1;
        audit.push(
          auditEvent(
            seq,
            actionId,
            "OBSERVED",
            auditAlias,
            auditBaseline,
            auditEvals,
            usedSubjectModelClaim,
            "current rollout and eval facts observed",
          ),
        );
      }

      const decisionBase = decideRollout(
        view.request,
        effectiveAlias,
        rolloutLedger,
        attributedStream,
        baseline,
        view.request.reevaluationAvailable ? "available" : "unavailable",
      );
      const decision = applyDecisionBug(decisionBase, options, currentAlias, baseline);
      const subjectDone = completedFor(id);
      const completionKey = `${view.id}:${view.request.idempotencyKey}`;

      if (options.invokeEffects && (!options.guardDuplicates || !subjectDone.has(completionKey))) {
        deployment.applyRolloutDecision(
          actionId,
          rolloutEffectFor(
            view.request,
            decision.decision,
            decision.concreteVersion,
            decision.baselineVersion,
          ),
        );
        subjectDone.add(completionKey);
      }

      if (options.writeAudit) {
        seq += 1;
        audit.push(
          auditEvent(
            seq,
            actionId,
            decision.reason,
            auditAlias,
            auditBaseline,
            auditEvals,
            usedSubjectModelClaim,
            "decision recorded",
          ),
        );
      }

      return {
        decisions: [
          {
            actionId,
            decision: decision.decision,
            reason: decision.reason,
            alias: view.request.alias,
            concreteVersion: decision.concreteVersion,
            baselineVersion: decision.baselineVersion,
          },
        ],
        audit,
      };
    },
  };
}

export const reference = makeSubject(
  "reference",
  "Reconciles current alias, concrete eval versions, rollout window and baseline before deciding",
  REFERENCE_OPTIONS,
);

export { withAttempt };
export type { EffectRecord, Scenario };
