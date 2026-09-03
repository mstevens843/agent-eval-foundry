import type {
  DiscoveryCandidate,
  DiscoveryCandidateEvidence,
  DiscoveryTaskShapeDraft,
  DiscoveryWorkbench,
} from "./discovery-workbench.js";
import type { ProbeDefinition, ProbeResult, ProbeRunSummary } from "./probe-types.js";
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

export const PROMOTION_DECISIONS = ["promote", "hold", "kill", "evolve", "transfer", "repair"] as const;
export type PromotionDecision = (typeof PROMOTION_DECISIONS)[number];

export const PROMOTION_STATUSES = ["ready", "family-built", "hold", "killed"] as const;
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

export const PROMOTION_EVIDENCE_LEVELS = ["planning", "local-evidence", "difficulty-evidenced"] as const;
export type PromotionEvidenceLevel = (typeof PROMOTION_EVIDENCE_LEVELS)[number];

export interface PromotionEvidence {
  readonly sourceProbeVerdict: ProbeResult["verdict"];
  readonly referencePassed: boolean;
  readonly badSubjectsCaught: string;
  readonly distinctChecks: readonly string[];
  readonly claimedEvidenceLevel: PromotionEvidenceLevel;
  readonly countedAgentTrials: number;
  /**
   * Counted trials this family holds that were ROOT-CAUSED `capability`.
   *
   * Distinct from `countedAgentTrials`, and the distinction is the entire point. A counted trial is
   * a trial that produced a verdict. It is not difficulty evidence until somebody has read it and
   * said the subject was at fault rather than the specification — five of this repository's counted
   * outbox trials are root-caused `spec-underspecified`, and they are evidence of an authoring
   * defect, not of a hard task.
   *
   * Optional, defaulting to 0, so promotions written before this field existed still parse. A
   * promotion that does not supply it therefore cannot claim `difficulty-evidenced`, which is the
   * correct default: silence is not evidence.
   */
  readonly capabilityLabelledTrials: number;
}

export interface PromotionDelta {
  readonly whatStaysFixed: readonly string[];
  readonly whatChanges: readonly string[];
  readonly hiddenRuleSurfaceChange: "unchanged" | "expanded";
  readonly hiddenRuleSurfaceNote: string;
}

export interface PromotionRisk {
  readonly fairness: readonly string[];
  readonly verifier: readonly string[];
  readonly adversarial: readonly string[];
  readonly humanSolvability: readonly string[];
}

export interface ProbeToFamilyPromotion {
  readonly id: string;
  readonly familyId: string;
  readonly sourceCandidateId: string;
  readonly sourceProbeId: string;
  readonly sourceMechanismIds: readonly string[];
  readonly decision: PromotionDecision;
  readonly status: PromotionStatus;
  readonly promotionReason: string;
  readonly evidence: PromotionEvidence;
  readonly delta: PromotionDelta;
  readonly visibleRulesCarriedForward: readonly string[];
  readonly knobsExpanded: readonly string[];
  readonly authoritativeTruthSourceCarriedForward: string;
  readonly expectedMutantsCarriedForward: readonly string[];
  readonly expectedBaselinesCarriedForward: readonly string[];
  readonly risksIntroduced: PromotionRisk;
  readonly preRegisteredConfirmSignal: string;
  readonly preRegisteredKillSignal: string;
  readonly expectedBuildHours: number;
  readonly expectedFirstSmokeTrialProvider: string;
}

export interface PromotedFamilyRecord {
  readonly promotion: ProbeToFamilyPromotion;
  readonly sourceCandidate: DiscoveryCandidate | null;
  readonly sourceProbe: ProbeDefinition | null;
  readonly sourceProbeResult: ProbeResult | null;
}

export interface PromotionScaffoldFile {
  readonly path: string;
  readonly content: string;
}

export interface PromotionScaffold {
  readonly familyId: string;
  readonly promotionId: string;
  readonly files: readonly PromotionScaffoldFile[];
}

const obj = (v: unknown, path: string): Record<string, unknown> =>
  isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");

const nonEmpty = (value: readonly string[], path: string, code: Parameters<typeof fail>[0], why: string) => {
  if (value.length === 0) fail(code, path, why);
};

const parseEvidence = (v: unknown, path: string): PromotionEvidence => {
  const o = obj(v, path);
  return {
    sourceProbeVerdict: oneOf(o.sourceProbeVerdict, `${path}.sourceProbeVerdict`, [
      "promote_to_task_shape",
      "needs_repair",
      "kill_unfair",
      "kill_no_truth_source",
      "kill_self_verifiable",
      "kill_wording_only",
      "hold_needs_transfer",
      "evolve_existing",
      "transfer_existing",
    ] as const),
    referencePassed:
      typeof o.referencePassed === "boolean"
        ? o.referencePassed
        : fail("E_TYPE", `${path}.referencePassed`, "expected a boolean"),
    badSubjectsCaught: str(o.badSubjectsCaught, `${path}.badSubjectsCaught`),
    distinctChecks: strArray(o.distinctChecks, `${path}.distinctChecks`),
    claimedEvidenceLevel: oneOf(
      o.claimedEvidenceLevel,
      `${path}.claimedEvidenceLevel`,
      PROMOTION_EVIDENCE_LEVELS,
    ),
    countedAgentTrials: num(o.countedAgentTrials, `${path}.countedAgentTrials`),
    capabilityLabelledTrials:
      o.capabilityLabelledTrials === undefined
        ? 0
        : num(o.capabilityLabelledTrials, `${path}.capabilityLabelledTrials`),
  };
};

const parseDelta = (v: unknown, path: string): PromotionDelta => {
  const o = obj(v, path);
  const whatStaysFixed = strArray(o.whatStaysFixed, `${path}.whatStaysFixed`);
  const whatChanges = strArray(o.whatChanges, `${path}.whatChanges`);
  nonEmpty(
    whatStaysFixed,
    `${path}.whatStaysFixed`,
    "PROMOTION_NO_FIXED",
    "promotion must say what mechanism pressure survived the probe",
  );
  nonEmpty(
    whatChanges,
    `${path}.whatChanges`,
    "PROMOTION_NO_CHANGED",
    "promotion must say how the full family expands beyond the probe",
  );
  const hiddenRuleSurfaceChange = oneOf(o.hiddenRuleSurfaceChange, `${path}.hiddenRuleSurfaceChange`, [
    "unchanged",
    "expanded",
  ] as const);
  const hiddenRuleSurfaceNote = str(o.hiddenRuleSurfaceNote, `${path}.hiddenRuleSurfaceNote`);
  if (hiddenRuleSurfaceChange === "expanded" && !hiddenRuleSurfaceNote.toLowerCase().includes("public")) {
    fail(
      "PROMOTION_HIDDEN_RULE_SURFACE_UNDECLARED",
      `${path}.hiddenRuleSurfaceNote`,
      "any hidden-rule expansion must say how the public contract changed with it",
    );
  }
  return { whatStaysFixed, whatChanges, hiddenRuleSurfaceChange, hiddenRuleSurfaceNote };
};

const parseRisk = (v: unknown, path: string): PromotionRisk => {
  const o = obj(v, path);
  return {
    fairness: strArray(o.fairness, `${path}.fairness`),
    verifier: strArray(o.verifier, `${path}.verifier`),
    adversarial: strArray(o.adversarial, `${path}.adversarial`),
    humanSolvability: strArray(o.humanSolvability, `${path}.humanSolvability`),
  };
};

export function parsePromotion(v: unknown, path: string): ProbeToFamilyPromotion {
  const o = obj(v, path);
  const sourceProbeId =
    typeof o.sourceProbeId === "string" && o.sourceProbeId.trim().length > 0
      ? id(o.sourceProbeId, `${path}.sourceProbeId`)
      : fail("PROMOTION_NO_SOURCE_PROBE", `${path}.sourceProbeId`, "promotion needs a source probe");
  const evidence = parseEvidence(o.evidence, `${path}.evidence`);
  if (evidence.claimedEvidenceLevel === "difficulty-evidenced" && evidence.countedAgentTrials === 0) {
    fail(
      "PROMOTION_CLAIMS_DIFFICULTY_PRETRIAL",
      `${path}.evidence.claimedEvidenceLevel`,
      "promotion cannot claim real-agent difficulty before a counted trial exists",
    );
  }
  // A counted trial is not difficulty evidence. It is a verdict nobody has read yet.
  //
  // This closed a live hole. The check above asks only whether a trial EXISTS, which is the old
  // `countedAgentTrials > 0` predicate that the root-cause layer was written to eliminate — and the
  // root-cause layer never reached this validator. Five of this repository's counted outbox trials
  // are root-caused `spec-underspecified`; under the old check alone they would have carried a
  // `difficulty-evidenced` promotion, which is the exact claim the last two phases spent their time
  // withdrawing.
  if (evidence.claimedEvidenceLevel === "difficulty-evidenced" && evidence.capabilityLabelledTrials === 0) {
    fail(
      "PROMOTION_DIFFICULTY_UNATTRIBUTED",
      `${path}.evidence.capabilityLabelledTrials`,
      "promotion claims real-agent difficulty but no counted trial is root-caused `capability`; " +
        "a failure attributed to the specification, the harness or the package is evidence of an " +
        "authoring defect, not of a hard task",
    );
  }
  const authoritativeTruthSourceCarriedForward =
    typeof o.authoritativeTruthSourceCarriedForward === "string" &&
    o.authoritativeTruthSourceCarriedForward.trim().length > 0
      ? o.authoritativeTruthSourceCarriedForward
      : fail(
          "PROMOTION_NO_TRUTH_SOURCE",
          `${path}.authoritativeTruthSourceCarriedForward`,
          "promotion must carry an authoritative truth source forward from the probe",
        );
  const expectedMutantsCarriedForward = strArray(
    o.expectedMutantsCarriedForward,
    `${path}.expectedMutantsCarriedForward`,
  );
  nonEmpty(
    expectedMutantsCarriedForward,
    `${path}.expectedMutantsCarriedForward`,
    "PROMOTION_NO_EXPECTED_MUTANTS",
    "a promoted family must name the known-bad shapes it should catch",
  );
  const preRegisteredKillSignal =
    typeof o.preRegisteredKillSignal === "string" && o.preRegisteredKillSignal.trim().length > 0
      ? o.preRegisteredKillSignal
      : fail("PROMOTION_NO_KILL_SIGNAL", `${path}.preRegisteredKillSignal`, "promotion needs a kill signal");

  return {
    id: id(o.id, `${path}.id`),
    familyId: id(o.familyId, `${path}.familyId`),
    sourceCandidateId: id(o.sourceCandidateId, `${path}.sourceCandidateId`),
    sourceProbeId,
    sourceMechanismIds: requiredList(
      o.sourceMechanismIds,
      `${path}.sourceMechanismIds`,
      "PROMOTION_NO_SOURCE_PROBE",
      "promotion needs source mechanisms from the probe",
    ),
    decision: oneOf(o.decision, `${path}.decision`, PROMOTION_DECISIONS),
    status: oneOf(o.status, `${path}.status`, PROMOTION_STATUSES),
    promotionReason: str(o.promotionReason, `${path}.promotionReason`),
    evidence,
    delta: parseDelta(o.delta, `${path}.delta`),
    visibleRulesCarriedForward: requiredList(
      o.visibleRulesCarriedForward,
      `${path}.visibleRulesCarriedForward`,
      "PROMOTION_HIDDEN_RULE_SURFACE_UNDECLARED",
      "promotion needs visible rules so the hidden surface is not a private addition",
    ),
    knobsExpanded: requiredList(
      o.knobsExpanded,
      `${path}.knobsExpanded`,
      "PROMOTION_NO_CHANGED",
      "promotion must say which knobs expand beyond the tiny probe",
    ),
    authoritativeTruthSourceCarriedForward,
    expectedMutantsCarriedForward,
    expectedBaselinesCarriedForward: strArray(
      o.expectedBaselinesCarriedForward,
      `${path}.expectedBaselinesCarriedForward`,
    ),
    risksIntroduced: parseRisk(o.risksIntroduced, `${path}.risksIntroduced`),
    preRegisteredConfirmSignal: str(o.preRegisteredConfirmSignal, `${path}.preRegisteredConfirmSignal`),
    preRegisteredKillSignal,
    expectedBuildHours: num(o.expectedBuildHours, `${path}.expectedBuildHours`),
    expectedFirstSmokeTrialProvider: str(
      o.expectedFirstSmokeTrialProvider,
      `${path}.expectedFirstSmokeTrialProvider`,
    ),
  };
}

export function parsePromotions(v: unknown, path = "promotions"): readonly ProbeToFamilyPromotion[] {
  const list = Array.isArray(v)
    ? v.map((item, i) => parsePromotion(item, `${path}[${i}]`))
    : fail("E_TYPE", path, "expected an array");
  uniqueIds(
    list.map((record) => record.id),
    path,
  );
  return list;
}

export function assertPromotionsValid(
  promotions: readonly ProbeToFamilyPromotion[],
  probeSummary: ProbeRunSummary,
  workbench: DiscoveryWorkbench,
): void {
  uniqueIds(
    promotions.map((promotion) => promotion.id),
    "promotions",
  );
  const probeIds = new Set(probeSummary.probes.map((probe) => probe.probeId));
  const candidateIds = new Set(workbench.candidates.map((candidate) => candidate.id));
  mustExist(
    promotions.map((promotion) => promotion.sourceProbeId),
    probeIds,
    "promotions.sourceProbeId",
    "source probe",
  );
  mustExist(
    promotions.map((promotion) => promotion.sourceCandidateId),
    candidateIds,
    "promotions.sourceCandidateId",
    "source candidate",
  );

  for (const promotion of promotions) {
    const probe = probeSummary.probes.find((result) => result.probeId === promotion.sourceProbeId);
    if (probe === undefined) {
      fail(
        "PROMOTION_NO_SOURCE_PROBE",
        `promotions.${promotion.id}`,
        "promotion has no runnable source probe",
      );
    }
    if (!["promote_to_task_shape", "evolve_existing", "transfer_existing"].includes(probe.verdict)) {
      fail(
        "PROMOTION_SOURCE_NOT_PROMOTED",
        `promotions.${promotion.id}.sourceProbeId`,
        `source probe verdict is ${probe.verdict}`,
      );
    }
    if (promotion.evidence.sourceProbeVerdict !== probe.verdict) {
      fail(
        "PROMOTION_SOURCE_NOT_PROMOTED",
        `promotions.${promotion.id}.evidence.sourceProbeVerdict`,
        `promotion says ${promotion.evidence.sourceProbeVerdict}, source probe says ${probe.verdict}`,
      );
    }
  }
}

export function promotedFamilyRecords(
  promotions: readonly ProbeToFamilyPromotion[],
  definitions: readonly ProbeDefinition[],
  summary: ProbeRunSummary,
  workbench: DiscoveryWorkbench,
): readonly PromotedFamilyRecord[] {
  return promotions.map((promotion) => ({
    promotion,
    sourceCandidate:
      workbench.candidates.find((candidate) => candidate.id === promotion.sourceCandidateId) ?? null,
    sourceProbe: definitions.find((definition) => definition.id === promotion.sourceProbeId) ?? null,
    sourceProbeResult: summary.probes.find((result) => result.probeId === promotion.sourceProbeId) ?? null,
  }));
}

export function promotionEvidenceForDiscovery(
  promotions: readonly ProbeToFamilyPromotion[],
): readonly DiscoveryCandidateEvidence[] {
  return promotions.map((promotion) => ({
    candidateId: promotion.sourceCandidateId,
    status: promotion.status === "family-built" ? "family-build-ready" : "task-shape-ready",
    sourceId: promotion.id,
    verdict: promotion.status,
    rankBoost: promotion.status === "family-built" ? 4 : 2,
    reason: promotion.promotionReason,
  }));
}

export function promotionToFamilyScaffold(record: PromotedFamilyRecord): PromotionScaffold {
  const p = record.promotion;
  const candidate = record.sourceCandidate;
  const draft: DiscoveryTaskShapeDraft = {
    familyId: p.familyId,
    sourceCandidateId: p.sourceCandidateId,
    visibleRulesDraft: p.visibleRulesCarriedForward,
    behaviorSpaceDraft: `${p.promotionReason} Full family expands ${p.knobsExpanded.join(", ")}.`,
    knobs:
      candidate?.expectedKnobs.map((knob) => ({ ...knob })) ??
      p.knobsExpanded.map((name) => ({ name, values: ["declared"], purpose: "expanded during promotion" })),
    hiddenRegionDraft: p.delta.hiddenRuleSurfaceNote,
    authoritativeSource: {
      name: p.authoritativeTruthSourceCarriedForward,
      whatItSettles: candidate?.authoritativeTruthSource.whatItSettles ?? "promoted family ground truth",
      whyIndependent:
        candidate?.authoritativeTruthSource.whyIndependent ??
        "The verifier owns the authority ledger; submissions receive only public facades.",
    },
    expectedMutants: p.expectedMutantsCarriedForward,
    baselineCheats: p.expectedBaselinesCarriedForward,
    humanSolvabilityNotes: p.risksIntroduced.humanSolvability,
    adversarialAuditNotes: p.risksIntroduced.adversarial,
    transferLinks: candidate?.transferPotential.targetDomains ?? [],
  };

  const files: PromotionScaffoldFile[] = [
    {
      path: `${p.familyId}/types.ts`,
      content: `// Draft generated from promotion ${p.id}.\nexport interface ScenarioView { readonly id: string; }\n`,
    },
    {
      path: `${p.familyId}/spec.ts`,
      content: `export const VISIBLE_RULES = ${JSON.stringify(draft.visibleRulesDraft, null, 2)} as const;\n`,
    },
    {
      path: `${p.familyId}/scenarios.ts`,
      content: `export const KNOB_DRAFTS = ${JSON.stringify(draft.knobs, null, 2)} as const;\n`,
    },
    {
      path: `${p.familyId}/reference.ts`,
      content: `export const reference = { id: "reference", label: "draft", run: () => ({ decisions: [], audit: [] }) };\n`,
    },
    {
      path: `${p.familyId}/mutants.ts`,
      content: `export const EXPECTED_MUTANTS = ${JSON.stringify(draft.expectedMutants, null, 2)} as const;\n`,
    },
    {
      path: `${p.familyId}/verify.ts`,
      content: `export const CHECKS = ${JSON.stringify(p.evidence.distinctChecks, null, 2)} as const;\n`,
    },
    {
      path: `${p.familyId}/runner.ts`,
      content: `export const FAMILY_ID = ${JSON.stringify(p.familyId)};\n`,
    },
    {
      path: `${p.familyId}/challenge-notes.md`,
      content: [
        `# ${p.familyId} challenge package notes`,
        "",
        "Visible rules, types, starter subject and examples are required before trial-ready status.",
        `Expected first smoke-trial provider: ${p.expectedFirstSmokeTrialProvider}.`,
        "",
      ].join("\n"),
    },
    {
      path: `docs/families/${p.familyId}.md`,
      content: [
        `# ${p.familyId}`,
        "",
        `Source candidate: \`${p.sourceCandidateId}\``,
        `Source probe: \`${p.sourceProbeId}\``,
        "",
        "## What Stays Fixed",
        "",
        ...p.delta.whatStaysFixed.map((line) => `- ${line}`),
        "",
        "## What Changes",
        "",
        ...p.delta.whatChanges.map((line) => `- ${line}`),
        "",
      ].join("\n"),
    },
    {
      path: `${p.familyId}/example-shape.json`,
      content: `${JSON.stringify(draft, null, 2)}\n`,
    },
  ];

  return { familyId: p.familyId, promotionId: p.id, files };
}
