import type { Registry } from "./registry.js";
import {
  fail,
  id,
  isRecord,
  mustExist,
  num,
  oneOf,
  requiredList,
  str,
  strArray,
  uniqueIds,
} from "./schema.js";

export const FUNNEL_MODES = ["discovery", "validation", "production"] as const;
export type FunnelMode = (typeof FUNNEL_MODES)[number];

export const FUNNEL_STAGES = [
  "candidate_pool",
  "paper_screen",
  "mechanism_probe",
  "task_shape",
  "verifier_mutant_screen",
  "smoke_trial",
  "transfer_test",
  "full_matrix",
  "human_evidence",
  "adversarial_audit",
  "ship_decision",
] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export const FUNNEL_DECISIONS = ["promote", "hold", "kill", "evolve", "transfer", "repair"] as const;
export type FunnelDecision = (typeof FUNNEL_DECISIONS)[number];

export const EVIDENCE_COSTS = [
  "paper",
  "static",
  "local",
  "mutant",
  "one_agent",
  "cross_provider",
  "human",
  "adversarial",
] as const;
export type EvidenceCost = (typeof EVIDENCE_COSTS)[number];

const CHEAP_EVIDENCE = new Set<EvidenceCost>(["paper", "static", "local", "mutant"]);
export const evidenceCostRank = (cost: EvidenceCost): number => EVIDENCE_COSTS.indexOf(cost);

export interface ProbeScenario {
  readonly id: string;
  readonly publicSetup: string;
  readonly hiddenBehavior: string;
  readonly mechanismVariation: string;
}

export interface ProbeTruthSource {
  readonly name: string;
  readonly whatItSettles: string;
  readonly hiddenBehaviorDeclared: string;
  readonly whyNoPrivateKnowledge: string;
}

export interface CheapValidationCheck {
  readonly id: string;
  readonly cost: EvidenceCost;
  readonly description: string;
}

export interface ProbeCostEstimate {
  readonly firstEvidence: EvidenceCost;
  readonly engineerHours: number;
  readonly frontierUsd: number;
}

export interface MechanismProbe {
  readonly id: string;
  readonly mechanismId: string;
  readonly mode: FunnelMode;
  readonly currentStage: FunnelStage;
  readonly decision: FunnelDecision;
  readonly hypothesis: string;
  readonly domain: string;
  readonly expectedAgentFailure: string;
  readonly authoritativeTruthSource: ProbeTruthSource;
  readonly minimumPublicRules: readonly string[];
  readonly requiresPrivateKnowledge: boolean;
  readonly probeScenarios: readonly ProbeScenario[];
  readonly expectedMutantsOrBaselines: readonly string[];
  readonly cheapValidationChecks: readonly CheapValidationCheck[];
  readonly costEstimate: ProbeCostEstimate;
  readonly promotionCriteria: readonly string[];
  readonly killCriteria: readonly string[];
  readonly transferCandidates: readonly string[];
}

export const TRANSFER_STATUSES = ["proposed", "ready", "measured", "blocked"] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];
export const TRANSFER_SOURCE_KINDS = ["family", "probe"] as const;
export type TransferSourceKind = (typeof TRANSFER_SOURCE_KINDS)[number];
export const TRANSFER_BUILD_MODES = ["probe-first", "full-family"] as const;
export type TransferBuildMode = (typeof TRANSFER_BUILD_MODES)[number];

export interface TransferTest {
  readonly id: string;
  readonly sourceKind: TransferSourceKind;
  readonly sourceId: string;
  readonly transferredMechanism: string;
  readonly targetDomain: string;
  readonly status: TransferStatus;
  readonly whatStaysFixed: readonly string[];
  readonly whatChanges: readonly string[];
  readonly expectedFailurePreservation: string;
  readonly expectedFairnessRisks: readonly string[];
  readonly expectedVerifierRisks: readonly string[];
  readonly authoritativeTruthSourceInTarget: string | null;
  readonly expectedMutants: readonly string[];
  readonly promotionCriteria: readonly string[];
  readonly killCriteria: readonly string[];
  readonly buildMode: TransferBuildMode | null;
  readonly requiredEvidenceBeforeDeclaringTransfer: readonly string[];
  readonly nextEvidence: EvidenceCost;
}

export interface AdaptiveFunnel {
  readonly probes: readonly MechanismProbe[];
  readonly transfers: readonly TransferTest[];
}

export interface FamilyFunnelEvidence {
  readonly familyId: string;
  readonly trialReady?: boolean;
  readonly countedAgentTrials?: number;
  readonly agentTrialsPassed?: number;
  readonly sharedProviderFamilies?: readonly string[];
  readonly agentFailuresChain?: boolean;
  readonly staleTrials?: readonly string[];
  readonly providerRefusals?: number;
  readonly agentAxes?: number | null;
  readonly cleanHumanSolves?: number;
  readonly countedNoBypassAudits?: number;
  readonly productionMixedCrossLabSmoke?: boolean;
  readonly providerDeltaDiagnosisPresent?: boolean;
  readonly evolutionOptionsPresent?: boolean;
}

export interface FunnelNextAction {
  readonly targetId: string;
  readonly targetType: "probe" | "transfer" | "family";
  readonly mode: FunnelMode;
  readonly stage: FunnelStage;
  readonly decision: FunnelDecision;
  readonly evidenceCost: EvidenceCost;
  readonly action: string;
  readonly reason: string;
}

export interface AdaptiveFunnelSummary {
  readonly candidateMechanisms: number;
  readonly probes: number;
  readonly probesReadyForValidation: number;
  readonly probesNeedingRepair: number;
  readonly transferTests: number;
  readonly transferTestsReady: number;
  readonly nextActions: readonly FunnelNextAction[];
  readonly productionModeFamilies: readonly string[];
  readonly familiesNotReadyForFullMatrix: readonly FunnelNextAction[];
}

const obj = (v: unknown, path: string): Record<string, unknown> =>
  isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");

const bool = (v: unknown, path: string): boolean =>
  typeof v === "boolean" ? v : fail("E_TYPE", path, "expected a boolean");

const parseProbeScenario = (v: unknown, path: string): ProbeScenario => {
  const o = obj(v, path);
  const hiddenBehavior =
    typeof o.hiddenBehavior === "string" && o.hiddenBehavior.trim().length > 0
      ? o.hiddenBehavior
      : fail(
          "FUNNEL_PROBE_HIDDEN_BEHAVIOR_UNDECLARED",
          `${path}.hiddenBehavior`,
          "a discovery probe may hide cases, but it must declare the hidden behavior being sampled",
        );
  return {
    id: id(o.id, `${path}.id`),
    publicSetup: str(o.publicSetup, `${path}.publicSetup`),
    hiddenBehavior,
    mechanismVariation: str(o.mechanismVariation, `${path}.mechanismVariation`),
  };
};

const parseTruthSource = (v: unknown, path: string): ProbeTruthSource => {
  if (!isRecord(v)) {
    fail(
      "FUNNEL_PROBE_NO_TRUTH_SOURCE",
      path,
      "a probe needs an authority independent of the subject; otherwise it is only a prompt idea",
    );
  }
  return {
    name: str(v.name, `${path}.name`),
    whatItSettles: str(v.whatItSettles, `${path}.whatItSettles`),
    hiddenBehaviorDeclared:
      typeof v.hiddenBehaviorDeclared === "string" && v.hiddenBehaviorDeclared.trim().length > 0
        ? v.hiddenBehaviorDeclared
        : fail(
            "FUNNEL_PROBE_HIDDEN_BEHAVIOR_UNDECLARED",
            `${path}.hiddenBehaviorDeclared`,
            "the public probe may not add secret rules; it must state what hidden coverage samples",
          ),
    whyNoPrivateKnowledge: str(v.whyNoPrivateKnowledge, `${path}.whyNoPrivateKnowledge`),
  };
};

const parseCheapValidationCheck = (v: unknown, path: string): CheapValidationCheck => {
  const o = obj(v, path);
  return {
    id: id(o.id, `${path}.id`),
    cost: oneOf(o.cost, `${path}.cost`, EVIDENCE_COSTS),
    description: str(o.description, `${path}.description`),
  };
};

const parseCostEstimate = (v: unknown, path: string): ProbeCostEstimate => {
  const o = obj(v, path);
  return {
    firstEvidence: oneOf(o.firstEvidence, `${path}.firstEvidence`, EVIDENCE_COSTS),
    engineerHours: num(o.engineerHours, `${path}.engineerHours`),
    frontierUsd: num(o.frontierUsd, `${path}.frontierUsd`),
  };
};

export function parseMechanismProbe(v: unknown, path: string): MechanismProbe {
  const o = obj(v, path);
  const expectedAgentFailure =
    typeof o.expectedAgentFailure === "string" && o.expectedAgentFailure.trim().length > 0
      ? o.expectedAgentFailure
      : fail(
          "FUNNEL_PROBE_NO_EXPECTED_FAILURE",
          `${path}.expectedAgentFailure`,
          "a probe with no expected model failure is a demo, not a benchmark-production screen",
        );
  const promotionCriteria = requiredList(
    o.promotionCriteria,
    `${path}.promotionCriteria`,
    "FUNNEL_PROBE_NO_PROMOTION_CRITERIA",
    "without explicit promotion criteria every probe result can be rationalized after the fact",
  );
  const transferCandidates = requiredList(
    o.transferCandidates,
    `${path}.transferCandidates`,
    "FUNNEL_PROBE_NO_TRANSFER_CANDIDATE",
    "a mechanism probe that cannot name a transfer candidate is not yet evidence for a family line",
  );
  const requiresPrivateKnowledge = bool(o.requiresPrivateKnowledge, `${path}.requiresPrivateKnowledge`);
  if (requiresPrivateKnowledge) {
    fail(
      "FUNNEL_PROBE_REQUIRES_PRIVATE_KNOWLEDGE",
      `${path}.requiresPrivateKnowledge`,
      "a discovery probe must be solvable from public rules and public examples, not author memory",
    );
  }
  const probeScenarios = (() => {
    const scenarios = Array.isArray(o.probeScenarios)
      ? o.probeScenarios.map((x, i) => parseProbeScenario(x, `${path}.probeScenarios[${i}]`))
      : fail("E_TYPE", `${path}.probeScenarios`, "expected an array");
    if (new Set(scenarios.map((s) => s.mechanismVariation)).size < 2) {
      fail(
        "FUNNEL_PROBE_WORDING_ONLY",
        `${path}.probeScenarios`,
        "a probe whose scenarios share one mechanism variation is just a wording sweep",
      );
    }
    return scenarios;
  })();
  const cheapValidationChecks = (() => {
    const checks = Array.isArray(o.cheapValidationChecks)
      ? o.cheapValidationChecks.map((x, i) =>
          parseCheapValidationCheck(x, `${path}.cheapValidationChecks[${i}]`),
        )
      : fail("E_TYPE", `${path}.cheapValidationChecks`, "expected an array");
    if (!checks.some((c) => CHEAP_EVIDENCE.has(c.cost))) {
      fail(
        "FUNNEL_PROBE_NO_CHEAP_SCREEN",
        `${path}.cheapValidationChecks`,
        "a discovery probe must have a paper/static/local/mutant screen before any model trial",
      );
    }
    return checks;
  })();
  return {
    id: id(o.id, `${path}.id`),
    mechanismId: id(o.mechanismId, `${path}.mechanismId`),
    mode: oneOf(o.mode, `${path}.mode`, FUNNEL_MODES),
    currentStage: oneOf(o.currentStage, `${path}.currentStage`, FUNNEL_STAGES),
    decision: oneOf(o.decision, `${path}.decision`, FUNNEL_DECISIONS),
    hypothesis: str(o.hypothesis, `${path}.hypothesis`),
    domain: str(o.domain, `${path}.domain`),
    expectedAgentFailure,
    authoritativeTruthSource: parseTruthSource(
      o.authoritativeTruthSource,
      `${path}.authoritativeTruthSource`,
    ),
    minimumPublicRules: requiredList(
      o.minimumPublicRules,
      `${path}.minimumPublicRules`,
      "FUNNEL_PROBE_REQUIRES_PRIVATE_KNOWLEDGE",
      "a public probe with no public rules can only be solved from private context",
    ),
    requiresPrivateKnowledge,
    probeScenarios,
    expectedMutantsOrBaselines: requiredList(
      o.expectedMutantsOrBaselines,
      `${path}.expectedMutantsOrBaselines`,
      "FUNNEL_PROBE_NO_CHEAP_SCREEN",
      "a probe must have a baseline or mutant-shaped local screen before model spend",
    ),
    cheapValidationChecks,
    costEstimate: parseCostEstimate(o.costEstimate, `${path}.costEstimate`),
    promotionCriteria,
    killCriteria: requiredList(
      o.killCriteria,
      `${path}.killCriteria`,
      "FUNNEL_PROBE_NO_PROMOTION_CRITERIA",
      "kill criteria are the negative half of a promotion rule; without them a bad result drifts",
    ),
    transferCandidates,
  };
}

export function parseMechanismProbes(v: unknown, path = "mechanism-probes"): readonly MechanismProbe[] {
  const list = Array.isArray(v)
    ? v.map((x, i) => parseMechanismProbe(x, `${path}[${i}]`))
    : fail("E_TYPE", path, "expected an array");
  uniqueIds(
    list.map((p) => p.id),
    path,
  );
  return list;
}

export function parseTransferTest(v: unknown, path: string): TransferTest {
  const o = obj(v, path);
  const buildMode =
    o.buildMode === undefined || o.buildMode === null
      ? null
      : oneOf(o.buildMode, `${path}.buildMode`, TRANSFER_BUILD_MODES);
  return {
    id: id(o.id, `${path}.id`),
    sourceKind: oneOf(o.sourceKind, `${path}.sourceKind`, TRANSFER_SOURCE_KINDS),
    sourceId: id(o.sourceId, `${path}.sourceId`),
    transferredMechanism: id(o.transferredMechanism, `${path}.transferredMechanism`),
    targetDomain: str(o.targetDomain, `${path}.targetDomain`),
    status: oneOf(o.status, `${path}.status`, TRANSFER_STATUSES),
    whatStaysFixed: requiredList(
      o.whatStaysFixed,
      `${path}.whatStaysFixed`,
      "FUNNEL_TRANSFER_NO_FIXED",
      "a transfer test carries a mechanism forward; it must state what stays fixed",
    ),
    whatChanges: requiredList(
      o.whatChanges,
      `${path}.whatChanges`,
      "FUNNEL_TRANSFER_NO_CHANGED",
      "a transfer test must state what changes so it is not just the same task with new nouns",
    ),
    expectedFailurePreservation: str(o.expectedFailurePreservation, `${path}.expectedFailurePreservation`),
    expectedFairnessRisks: strArray(o.expectedFairnessRisks, `${path}.expectedFairnessRisks`),
    expectedVerifierRisks: strArray(o.expectedVerifierRisks, `${path}.expectedVerifierRisks`),
    authoritativeTruthSourceInTarget:
      typeof o.authoritativeTruthSourceInTarget === "string" &&
      o.authoritativeTruthSourceInTarget.trim().length > 0
        ? o.authoritativeTruthSourceInTarget
        : null,
    expectedMutants:
      o.expectedMutants === undefined || o.expectedMutants === null
        ? []
        : strArray(o.expectedMutants, `${path}.expectedMutants`),
    promotionCriteria:
      o.promotionCriteria === undefined || o.promotionCriteria === null
        ? []
        : strArray(o.promotionCriteria, `${path}.promotionCriteria`),
    killCriteria:
      o.killCriteria === undefined || o.killCriteria === null
        ? []
        : strArray(o.killCriteria, `${path}.killCriteria`),
    buildMode,
    requiredEvidenceBeforeDeclaringTransfer: requiredList(
      o.requiredEvidenceBeforeDeclaringTransfer,
      `${path}.requiredEvidenceBeforeDeclaringTransfer`,
      "FUNNEL_TRANSFER_NO_EVIDENCE_REQUIREMENT",
      "a proposed transfer is not evidence until the required evidence is stated up front",
    ),
    nextEvidence: oneOf(o.nextEvidence, `${path}.nextEvidence`, EVIDENCE_COSTS),
  };
}

export function parseTransferTests(v: unknown, path = "transfer-tests"): readonly TransferTest[] {
  const list = Array.isArray(v)
    ? v.map((x, i) => parseTransferTest(x, `${path}[${i}]`))
    : fail("E_TYPE", path, "expected an array");
  uniqueIds(
    list.map((t) => t.id),
    path,
  );
  return list;
}

export function assertAdaptiveFunnelValid(funnel: AdaptiveFunnel, registry?: Registry): void {
  uniqueIds(
    funnel.probes.map((p) => p.id),
    "adaptive-funnel.probes",
  );
  uniqueIds(
    funnel.transfers.map((t) => t.id),
    "adaptive-funnel.transfers",
  );

  const transferIds = new Set(funnel.transfers.map((t) => t.id));
  for (const probe of funnel.probes) {
    mustExist(probe.transferCandidates, transferIds, `probe(${probe.id}).transferCandidates`, "transfer");
  }

  const probeIds = new Set(funnel.probes.map((p) => p.id));
  const familyIds = new Set(registry?.shapes.map((s) => s.familyId) ?? []);
  const mechanismIds = new Set(registry?.mechanisms.map((m) => m.id) ?? []);
  if (registry !== undefined) {
    mustExist(
      funnel.probes.map((p) => p.mechanismId),
      mechanismIds,
      "adaptive-funnel.probes.mechanismId",
      "mechanism",
    );
    mustExist(
      funnel.transfers.map((t) => t.transferredMechanism),
      mechanismIds,
      "adaptive-funnel.transfers.transferredMechanism",
      "mechanism",
    );
  }
  for (const transfer of funnel.transfers) {
    const known = transfer.sourceKind === "probe" ? probeIds : familyIds;
    mustExist([transfer.sourceId], known, `transfer(${transfer.id}).sourceId`, transfer.sourceKind);
  }
}

function probeNextAction(probe: MechanismProbe): FunnelNextAction {
  const cheap = probe.cheapValidationChecks
    .map((c) => c.cost)
    .sort((a, b) => evidenceCostRank(a) - evidenceCostRank(b))[0];
  if (probe.decision === "promote") {
    return {
      targetId: probe.id,
      targetType: "probe",
      mode: "validation",
      stage: "task_shape",
      decision: "promote",
      evidenceCost: cheap ?? probe.costEstimate.firstEvidence,
      action: "promote probe into a full task shape",
      reason: "promotion criteria are declared; the next work is a validation-mode family build",
    };
  }
  if (probe.decision === "transfer") {
    return {
      targetId: probe.id,
      targetType: "probe",
      mode: "validation",
      stage: "transfer_test",
      decision: "transfer",
      evidenceCost: "static",
      action: "run the declared transfer test before expanding scenarios",
      reason: "the mechanism is the unit being carried forward, not the surface task",
    };
  }
  if (probe.decision === "kill") {
    return {
      targetId: probe.id,
      targetType: "probe",
      mode: "discovery",
      stage: "paper_screen",
      decision: "kill",
      evidenceCost: "paper",
      action: "preserve the kill reason and stop building this surface",
      reason: "killed probes teach the budget model; they do not earn validation work",
    };
  }
  return {
    targetId: probe.id,
    targetType: "probe",
    mode: "discovery",
    stage: "mechanism_probe",
    decision: probe.decision === "repair" ? "repair" : "hold",
    evidenceCost: cheap ?? probe.costEstimate.firstEvidence,
    action: "run or repair the cheapest declared mechanism screen",
    reason: "discovery mode should spend paper/static/local/mutant evidence before model trials",
  };
}

function familyNextAction(evidence: FamilyFunnelEvidence): FunnelNextAction {
  // Superseded trials are PRESERVED on disk by design, so `staleTrials` is a permanent record of
  // every repair this family has ever had, not a signal that a repair is still owed. What settles
  // that is whether a counted trial exists against the CURRENT challenge hash: stale trials with
  // zero counted trials means the family still has to be re-measured after its repair, while a
  // counted current-hash trial means it has already been repaired AND re-measured, and the
  // counted-evidence branches below own the decision from there. Gating on "any stale trial exists"
  // routed every repaired family to `repair` forever, no matter how much current evidence it had.
  if ((evidence.staleTrials?.length ?? 0) > 0 && (evidence.countedAgentTrials ?? 0) === 0) {
    return {
      targetId: evidence.familyId,
      targetType: "family",
      mode: "validation",
      stage: "task_shape",
      decision: "repair",
      evidenceCost: "static",
      action: "repair/reissue the package and invalidate stale evidence before further trials",
      reason: "stale challenge hashes cannot feed production-mode claims",
    };
  }
  if (evidence.trialReady === true && (evidence.countedAgentTrials ?? 0) === 0) {
    return {
      targetId: evidence.familyId,
      targetType: "family",
      mode: "validation",
      stage: "smoke_trial",
      decision: "promote",
      evidenceCost: "one_agent",
      action: "run one counted smoke trial before any full matrix",
      reason: "mutant-detection evidence does not prove real-agent difficulty",
    };
  }
  if (
    (evidence.countedAgentTrials ?? 0) > 0 &&
    evidence.agentTrialsPassed !== undefined &&
    evidence.agentTrialsPassed === evidence.countedAgentTrials
  ) {
    return {
      targetId: evidence.familyId,
      targetType: "family",
      mode: "validation",
      stage: "task_shape",
      decision: "evolve",
      evidenceCost: "static",
      action: "treat the clean smoke pass as already_solved_or_needs_evolution before matrix spend",
      reason:
        "a counted smoke pass is evidence the available subject solved this family, not evidence of difficulty",
    };
  }
  if ((evidence.countedAgentTrials ?? 0) > 0 && evidence.agentFailuresChain === true) {
    return {
      targetId: evidence.familyId,
      targetType: "family",
      mode: "validation",
      stage: "transfer_test",
      decision: "evolve",
      evidenceCost: "static",
      action: "evolve or transfer before broad ship claims",
      reason: "nested failure sets are one axis at multiple sensitivities, not breadth",
    };
  }
  if ((evidence.countedAgentTrials ?? 0) > 0 && new Set(evidence.sharedProviderFamilies ?? []).size < 2) {
    return {
      targetId: evidence.familyId,
      targetType: "family",
      mode: "validation",
      stage: "transfer_test",
      decision: "transfer",
      evidenceCost: "cross_provider",
      action: "run the strongest available opposite-provider transfer check before full matrix",
      reason: "repeated same-provider trials estimate stability, not cross-lab transfer",
    };
  }
  if ((evidence.countedAgentTrials ?? 0) > 0 && evidence.productionMixedCrossLabSmoke === true) {
    return {
      targetId: evidence.familyId,
      targetType: "family",
      mode: "validation",
      stage: "transfer_test",
      decision: "evolve",
      evidenceCost:
        evidence.providerDeltaDiagnosisPresent === true && evidence.evolutionOptionsPresent === true
          ? "local"
          : "static",
      action:
        evidence.providerDeltaDiagnosisPresent === true && evidence.evolutionOptionsPresent === true
          ? "run the selected provider-delta evolution probe before any /6 matrix"
          : "diagnose provider delta and declare an evolution or repair path before any /6 matrix",
      reason:
        "OpenAI failed on target but a counted non-OpenAI run solved, so cross-lab smoke is mixed rather than cross-lab difficulty",
    };
  }
  if ((evidence.countedAgentTrials ?? 0) > 0 && (evidence.agentAxes ?? 0) >= 2) {
    return {
      targetId: evidence.familyId,
      targetType: "family",
      mode: "production",
      stage: "full_matrix",
      decision: "promote",
      evidenceCost: "cross_provider",
      action: "earn a production-mode matrix while preserving human/adversarial evidence separately",
      reason: "the family has smoke evidence and non-collapsed difficulty structure",
    };
  }
  return {
    targetId: evidence.familyId,
    targetType: "family",
    mode: "validation",
    stage: "smoke_trial",
    decision: "hold",
    evidenceCost: "one_agent",
    action: "hold at smoke-trial evidence until a counted on-target result exists",
    reason: "provider refusals, infrastructure errors and no-count trials do not advance the funnel",
  };
}

export function planAdaptiveFunnel(
  funnel: AdaptiveFunnel,
  registry: Registry,
  familyEvidence: readonly FamilyFunnelEvidence[] = [],
): AdaptiveFunnelSummary {
  const probeActions = funnel.probes.map(probeNextAction);
  const familyActions = familyEvidence.map(familyNextAction);
  const transferActions = funnel.transfers
    .filter((t) => t.status === "ready")
    .map<FunnelNextAction>((t) => ({
      targetId: t.id,
      targetType: "transfer",
      mode: "validation",
      stage: "transfer_test",
      decision: "transfer",
      evidenceCost: t.nextEvidence,
      action: "execute the transfer test and require preserved evidence before claiming transfer",
      reason: "transfer proposed is not transfer proven",
    }));
  const nextActions = [...probeActions, ...transferActions, ...familyActions].sort((a, b) => {
    const cost = evidenceCostRank(a.evidenceCost) - evidenceCostRank(b.evidenceCost);
    if (cost !== 0) return cost;
    return a.targetId.localeCompare(b.targetId);
  });
  return {
    candidateMechanisms: registry.mechanisms.length,
    probes: funnel.probes.length,
    probesReadyForValidation: funnel.probes.filter((p) => p.decision === "promote").length,
    probesNeedingRepair: funnel.probes.filter((p) => p.decision === "repair" || p.decision === "hold").length,
    transferTests: funnel.transfers.length,
    transferTestsReady: funnel.transfers.filter((t) => t.status === "ready").length,
    nextActions,
    productionModeFamilies: nextActions
      .filter((a) => a.targetType === "family" && a.mode === "production")
      .map((a) => a.targetId),
    familiesNotReadyForFullMatrix: nextActions.filter(
      (a) => a.targetType === "family" && a.stage !== "full_matrix",
    ),
  };
}
