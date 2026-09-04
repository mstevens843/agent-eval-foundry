import { RigInputError, requireShape, rigIntegrity } from "../screens/rig-integrity.js";
import {
  type CandidateContract,
  type ContractDeficiency,
  type ContractGateResult,
  PHASE16_CONTRACT_SCHEMA,
} from "./types.js";

const FORBIDDEN_PHRASES = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bplaceholder\b/i,
  /\breasonable behavio(?:u)?r\b/i,
  /\bas appropriate\b/i,
  /\bimplementation[- ]defined\b/i,
  /\bhidden vocabulary\b/i,
  /\bsecret threshold\b/i,
  /\bverifier[- ]only semantics?\b/i,
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const asRecord = (
  value: unknown,
  path: string,
  deficiencies: ContractDeficiency[],
): Record<string, unknown> | null => {
  if (!isRecord(value)) {
    deficiencies.push({ code: "missing-object", path, message: `${path} must be an object` });
    return null;
  }
  return value;
};

const add = (deficiencies: ContractDeficiency[], code: string, path: string, message: string): void => {
  deficiencies.push({ code, path, message });
};

const requiredText = (value: unknown, path: string, deficiencies: ContractDeficiency[]): string | null => {
  if (typeof value !== "string" || value.trim().length < 8) {
    add(deficiencies, "missing-specific-text", path, `${path} must contain specific public text`);
    return null;
  }
  for (const pattern of FORBIDDEN_PHRASES) {
    if (pattern.test(value)) {
      add(deficiencies, "placeholder-or-vague-language", path, `${path} contains ${pattern.source}`);
    }
  }
  return value;
};

const requiredTextArray = (
  value: unknown,
  path: string,
  deficiencies: ContractDeficiency[],
): readonly string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    add(deficiencies, "missing-nonempty-list", path, `${path} must be a non-empty array`);
    return [];
  }
  return value.flatMap((item, index) => {
    const parsed = requiredText(item, `${path}[${index}]`, deficiencies);
    return parsed === null ? [] : [parsed];
  });
};

const uniqueIds = (
  items: readonly unknown[],
  path: string,
  deficiencies: ContractDeficiency[],
): readonly string[] => {
  const ids = items.flatMap((item, index) => {
    const row = asRecord(item, `${path}[${index}]`, deficiencies);
    if (row === null) return [];
    const id = requiredText(row.id, `${path}[${index}].id`, deficiencies);
    return id === null ? [] : [id];
  });
  if (new Set(ids).size !== ids.length) {
    add(deficiencies, "duplicate-id", path, `${path} ids must be unique`);
  }
  return ids;
};

const auditGrammar = (value: unknown, path: string, deficiencies: ContractDeficiency[]): void => {
  const grammar = asRecord(value, path, deficiencies);
  if (grammar === null) return;
  if (!["ABNF", "EBNF", "JSON-Schema", "TypeScript"].includes(String(grammar.notation))) {
    add(deficiencies, "missing-grammar", `${path}.notation`, "grammar notation must be explicit");
  }
  requiredText(grammar.definition, `${path}.definition`, deficiencies);
  requiredTextArray(grammar.validExamples, `${path}.validExamples`, deficiencies);
  requiredTextArray(grammar.invalidExamples, `${path}.invalidExamples`, deficiencies);
};

const auditThreshold = (value: unknown, path: string, deficiencies: ContractDeficiency[]): void => {
  const metric = asRecord(value, path, deficiencies);
  if (metric === null) return;
  requiredText(metric.id, `${path}.id`, deficiencies);
  requiredText(metric.unit, `${path}.unit`, deficiencies);
  if (requiredText(metric.deterministicProcedure, `${path}.deterministicProcedure`, deficiencies) === null) {
    add(
      deficiencies,
      "missing-deterministic-meter",
      `${path}.deterministicProcedure`,
      "the metric must define a deterministic measurement procedure",
    );
  }
  if (!["<", "<=", "=", ">=", ">"].includes(String(metric.comparator))) {
    add(deficiencies, "missing-deterministic-meter", `${path}.comparator`, "metric comparator is invalid");
  }
  if (typeof metric.threshold !== "number" || !Number.isFinite(metric.threshold)) {
    add(
      deficiencies,
      "missing-numeric-threshold",
      `${path}.threshold`,
      "threshold must be finite and numeric",
    );
  }
  const derivation = asRecord(metric.derivation, `${path}.derivation`, deficiencies);
  if (derivation === null) {
    add(
      deficiencies,
      "missing-threshold-derivation",
      `${path}.derivation`,
      "the numeric threshold must be derived from declared inputs",
    );
    return;
  }
  requiredText(derivation.formula, `${path}.derivation.formula`, deficiencies);
  requiredText(derivation.explanation, `${path}.derivation.explanation`, deficiencies);
  if (!isRecord(derivation.inputs) || Object.keys(derivation.inputs).length === 0) {
    add(
      deficiencies,
      "missing-threshold-derivation",
      `${path}.derivation.inputs`,
      "threshold derivation must expose numeric inputs",
    );
  } else if (
    Object.values(derivation.inputs).some((input) => typeof input !== "number" || !Number.isFinite(input))
  ) {
    add(
      deficiencies,
      "invalid-threshold-input",
      `${path}.derivation.inputs`,
      "threshold derivation inputs must be finite numbers",
    );
  }
};

const auditCandidateLike = (candidate: Record<string, unknown>): ContractGateResult => {
  const deficiencies: ContractDeficiency[] = [];
  const candidateId = typeof candidate.candidateId === "string" ? candidate.candidateId : null;
  if (candidate.schema !== PHASE16_CONTRACT_SCHEMA) {
    add(deficiencies, "unsupported-schema", "schema", `schema must equal ${PHASE16_CONTRACT_SCHEMA}`);
  }
  requiredText(candidate.candidateId, "candidateId", deficiencies);
  requiredText(candidate.sourceIncidentId, "sourceIncidentId", deficiencies);
  if (candidate.role !== "prospective" && candidate.role !== "retrospective-calibration") {
    add(deficiencies, "invalid-role", "role", "role must be prospective or retrospective-calibration");
  }

  const source = asRecord(candidate.source, "source", deficiencies);
  if (source !== null) {
    requiredText(source.locator, "source.locator", deficiencies);
    requiredText(source.revision, "source.revision", deficiencies);
    if (typeof source.digest !== "string" || !/^[a-f0-9]{64}$/.test(source.digest)) {
      add(deficiencies, "missing-source-digest", "source.digest", "source digest must be SHA-256");
    }
    requiredTextArray(source.evidenceLocations, "source.evidenceLocations", deficiencies);
    requiredText(source.observedFailure, "source.observedFailure", deficiencies);
  }

  const publicContract = asRecord(candidate.publicContract, "publicContract", deficiencies);
  if (publicContract !== null) {
    requiredText(publicContract.goal, "publicContract.goal", deficiencies);
    auditGrammar(publicContract.inputGrammar, "publicContract.inputGrammar", deficiencies);
    auditGrammar(publicContract.outputGrammar, "publicContract.outputGrammar", deficiencies);
    const semantics = asRecord(publicContract.stateSemantics, "publicContract.stateSemantics", deficiencies);
    if (semantics !== null) {
      const initial = requiredText(
        semantics.initialState,
        "publicContract.stateSemantics.initialState",
        deficiencies,
      );
      const states = requiredTextArray(
        semantics.states,
        "publicContract.stateSemantics.states",
        deficiencies,
      );
      const transitions = Array.isArray(semantics.transitions) ? semantics.transitions : [];
      if (!Array.isArray(semantics.transitions) || transitions.length === 0) {
        add(
          deficiencies,
          "missing-transition-semantics",
          "publicContract.stateSemantics.transitions",
          "at least one exact transition is required",
        );
      }
      uniqueIds(transitions, "publicContract.stateSemantics.transitions", deficiencies);
      transitions.forEach((item, index) => {
        const row = asRecord(item, `publicContract.stateSemantics.transitions[${index}]`, deficiencies);
        if (row === null) return;
        for (const key of ["from", "input", "to", "effect"] as const) {
          requiredText(row[key], `publicContract.stateSemantics.transitions[${index}].${key}`, deficiencies);
        }
        if (typeof row.from === "string" && !states.includes(row.from)) {
          add(
            deficiencies,
            "unknown-transition-state",
            `publicContract.stateSemantics.transitions[${index}].from`,
            "from state is undeclared",
          );
        }
        if (typeof row.to === "string" && !states.includes(row.to)) {
          add(
            deficiencies,
            "unknown-transition-state",
            `publicContract.stateSemantics.transitions[${index}].to`,
            "to state is undeclared",
          );
        }
      });
      if (initial !== null && !states.includes(initial)) {
        add(
          deficiencies,
          "unknown-initial-state",
          "publicContract.stateSemantics.initialState",
          "initial state is undeclared",
        );
      }
    }
    requiredTextArray(publicContract.acceptedOutcomes, "publicContract.acceptedOutcomes", deficiencies);
    requiredTextArray(publicContract.forbiddenOutcomes, "publicContract.forbiddenOutcomes", deficiencies);
    requiredTextArray(publicContract.safetyObligations, "publicContract.safetyObligations", deficiencies);
    requiredTextArray(publicContract.livenessObligations, "publicContract.livenessObligations", deficiencies);
    requiredTextArray(
      publicContract.implementationFreedom,
      "publicContract.implementationFreedom",
      deficiencies,
    );
    requiredTextArray(publicContract.nonrequirements, "publicContract.nonrequirements", deficiencies);
  }

  const grading = asRecord(candidate.grading, "grading", deficiencies);
  let ruleIds: readonly string[] = [];
  let metricIds: readonly string[] = [];
  let checkCount = 0;
  if (grading !== null) {
    const rules = Array.isArray(grading.rules) ? grading.rules : [];
    if (!Array.isArray(grading.rules) || rules.length === 0) {
      add(deficiencies, "missing-graded-rules", "grading.rules", "graded rules must be enumerated");
    }
    ruleIds = uniqueIds(rules, "grading.rules", deficiencies);
    rules.forEach((item, index) => {
      const row = asRecord(item, `grading.rules[${index}]`, deficiencies);
      if (row === null) return;
      requiredText(row.agentVisibleText, `grading.rules[${index}].agentVisibleText`, deficiencies);
      requiredText(row.publicSection, `grading.rules[${index}].publicSection`, deficiencies);
    });
    const metrics = Array.isArray(grading.metrics) ? grading.metrics : [];
    if (!Array.isArray(grading.metrics) || metrics.length === 0) {
      add(
        deficiencies,
        "missing-deterministic-meter",
        "grading.metrics",
        "at least one deterministic metric is required",
      );
    }
    metricIds = uniqueIds(metrics, "grading.metrics", deficiencies);
    metrics.forEach((item, index) => auditThreshold(item, `grading.metrics[${index}]`, deficiencies));
    const checks = Array.isArray(grading.checks) ? grading.checks : [];
    checkCount = checks.length;
    if (!Array.isArray(grading.checks) || checks.length === 0) {
      add(deficiencies, "missing-traceability", "grading.checks", "every checker must map to public rules");
    }
    uniqueIds(checks, "grading.checks", deficiencies);
    checks.forEach((item, index) => {
      const row = asRecord(item, `grading.checks[${index}]`, deficiencies);
      if (row === null) return;
      const refs = requiredTextArray(row.ruleIds, `grading.checks[${index}].ruleIds`, deficiencies);
      const metricsForCheck = requiredTextArray(
        row.metricIds,
        `grading.checks[${index}].metricIds`,
        deficiencies,
      );
      requiredTextArray(
        row.envelopeDimensionIds,
        `grading.checks[${index}].envelopeDimensionIds`,
        deficiencies,
      );
      for (const id of refs)
        if (!ruleIds.includes(id))
          add(
            deficiencies,
            "unknown-rule-reference",
            `grading.checks[${index}].ruleIds`,
            `unknown rule ${id}`,
          );
      for (const id of metricsForCheck)
        if (!metricIds.includes(id))
          add(
            deficiencies,
            "unknown-metric-reference",
            `grading.checks[${index}].metricIds`,
            `unknown metric ${id}`,
          );
    });
    for (const ruleId of ruleIds) {
      const mapped = checks.some(
        (item) => isRecord(item) && Array.isArray(item.ruleIds) && item.ruleIds.includes(ruleId),
      );
      if (!mapped)
        add(deficiencies, "ungraded-public-rule", "grading.checks", `public rule ${ruleId} has no check`);
    }
  }

  const envelope = asRecord(candidate.hiddenInstanceEnvelope, "hiddenInstanceEnvelope", deficiencies);
  let envelopeIds: readonly string[] = [];
  if (envelope !== null) {
    requiredText(envelope.publicDescription, "hiddenInstanceEnvelope.publicDescription", deficiencies);
    const dimensions = Array.isArray(envelope.dimensions) ? envelope.dimensions : [];
    if (!Array.isArray(envelope.dimensions) || dimensions.length === 0) {
      add(
        deficiencies,
        "missing-hidden-envelope",
        "hiddenInstanceEnvelope.dimensions",
        "hidden dimensions must be public",
      );
    }
    envelopeIds = uniqueIds(dimensions, "hiddenInstanceEnvelope.dimensions", deficiencies);
    dimensions.forEach((item, index) => {
      const row = asRecord(item, `hiddenInstanceEnvelope.dimensions[${index}]`, deficiencies);
      if (row === null) return;
      if (!["enum", "integer", "boolean", "string"].includes(String(row.type))) {
        add(
          deficiencies,
          "invalid-envelope-dimension",
          `hiddenInstanceEnvelope.dimensions[${index}].type`,
          "dimension type is invalid",
        );
      }
      if (!Array.isArray(row.values) || row.values.length === 0) {
        add(
          deficiencies,
          "missing-envelope-values",
          `hiddenInstanceEnvelope.dimensions[${index}].values`,
          "dimension values must be finite and public",
        );
      }
      requiredText(row.derivation, `hiddenInstanceEnvelope.dimensions[${index}].derivation`, deficiencies);
    });
    requiredText(envelope.samplingProcedure, "hiddenInstanceEnvelope.samplingProcedure", deficiencies);
    requiredTextArray(envelope.constraints, "hiddenInstanceEnvelope.constraints", deficiencies);
    requiredText(envelope.noNewRulesEvidence, "hiddenInstanceEnvelope.noNewRulesEvidence", deficiencies);
  }

  if (grading !== null && Array.isArray(grading.checks)) {
    grading.checks.forEach((item, index) => {
      if (!isRecord(item) || !Array.isArray(item.envelopeDimensionIds)) return;
      for (const id of item.envelopeDimensionIds) {
        if (typeof id === "string" && !envelopeIds.includes(id)) {
          add(
            deficiencies,
            "unknown-envelope-reference",
            `grading.checks[${index}].envelopeDimensionIds`,
            `unknown envelope dimension ${id}`,
          );
        }
      }
    });
  }

  const subject = asRecord(candidate.subjectInterface, "subjectInterface", deficiencies);
  if (subject !== null) {
    requiredText(subject.entrypoint, "subjectInterface.entrypoint", deficiencies);
    requiredTextArray(subject.readableInputs, "subjectInterface.readableInputs", deficiencies);
    requiredTextArray(subject.writableOutputs, "subjectInterface.writableOutputs", deficiencies);
    requiredTextArray(subject.unavailableAuthority, "subjectInterface.unavailableAuthority", deficiencies);
  }
  const boundary = asRecord(candidate.authorityBoundary, "authorityBoundary", deficiencies);
  if (boundary !== null) {
    requiredText(boundary.kind, "authorityBoundary.kind", deficiencies);
    requiredText(boundary.enforcement, "authorityBoundary.enforcement", deficiencies);
    if (boundary.subjectCanCross !== false) {
      add(
        deficiencies,
        "crossable-authority-boundary",
        "authorityBoundary.subjectCanCross",
        "subject boundary must be structurally uncrossable",
      );
    }
  }
  const witness = asRecord(candidate.witnessInaccessibility, "witnessInaccessibility", deficiencies);
  if (witness !== null) {
    requiredText(witness.witness, "witnessInaccessibility.witness", deficiencies);
    requiredText(witness.proof, "witnessInaccessibility.proof", deficiencies);
    if (witness.locallyObservable !== false) {
      add(
        deficiencies,
        "locally-observable-witness",
        "witnessInaccessibility.locallyObservable",
        "the subject's own environment can observe the graded divergence",
      );
    }
  }

  const validation = asRecord(candidate.validation, "validation", deficiencies);
  if (validation !== null) {
    requiredText(validation.referenceStrategy, "validation.referenceStrategy", deficiencies);
    const mutants = Array.isArray(validation.narrowMutants) ? validation.narrowMutants : [];
    if (mutants.length === 0)
      add(
        deficiencies,
        "missing-narrow-mutant",
        "validation.narrowMutants",
        "at least one single-defect mutant is required",
      );
    uniqueIds(mutants, "validation.narrowMutants", deficiencies);
    mutants.forEach((item, index) => {
      const row = asRecord(item, `validation.narrowMutants[${index}]`, deficiencies);
      if (row === null) return;
      requiredText(row.singleDefect, `validation.narrowMutants[${index}].singleDefect`, deficiencies);
      requiredTextArray(
        row.expectedFailedChecks,
        `validation.narrowMutants[${index}].expectedFailedChecks`,
        deficiencies,
      );
    });
    const cheats = Array.isArray(validation.cheatModels) ? validation.cheatModels : [];
    if (cheats.length === 0)
      add(
        deficiencies,
        "missing-cheat-model",
        "validation.cheatModels",
        "at least one cheat model is required",
      );
    uniqueIds(cheats, "validation.cheatModels", deficiencies);
    cheats.forEach((item, index) => {
      const row = asRecord(item, `validation.cheatModels[${index}]`, deficiencies);
      if (row === null) return;
      requiredText(row.attempt, `validation.cheatModels[${index}].attempt`, deficiencies);
      requiredText(row.blockedBy, `validation.cheatModels[${index}].blockedBy`, deficiencies);
    });
    requiredText(validation.positiveWorkRequirement, "validation.positiveWorkRequirement", deficiencies);
    const probe = asRecord(validation.cheapProbe, "validation.cheapProbe", deficiencies);
    if (probe !== null) {
      requiredText(probe.id, "validation.cheapProbe.id", deficiencies);
      requiredText(probe.procedure, "validation.cheapProbe.procedure", deficiencies);
      requiredText(probe.falsifier, "validation.cheapProbe.falsifier", deficiencies);
      requiredText(probe.activationSignal, "validation.cheapProbe.activationSignal", deficiencies);
    }
  }

  const derivation = asRecord(candidate.derivation, "derivation", deficiencies);
  if (derivation !== null) {
    if (!["A1", "A2", "A3", "A4", "fragile-A2"].includes(String(derivation.classification))) {
      add(
        deficiencies,
        "invalid-derivation-class",
        "derivation.classification",
        "classification must use A1-A4 or fragile-A2",
      );
    }
    for (const key of ["citationCount", "sectionSpan", "inferenceDepth"] as const) {
      if (
        typeof derivation[key] !== "number" ||
        !Number.isSafeInteger(derivation[key]) ||
        derivation[key] < 0
      ) {
        add(
          deficiencies,
          "invalid-derivation-metric",
          `derivation.${key}`,
          `${key} must be a non-negative integer`,
        );
      }
    }
    if (typeof derivation.negativeInference !== "boolean")
      add(
        deficiencies,
        "invalid-derivation-metric",
        "derivation.negativeInference",
        "negativeInference must be boolean",
      );
    const citations = requiredTextArray(derivation.citations, "derivation.citations", deficiencies);
    requiredTextArray(derivation.evidenceChain, "derivation.evidenceChain", deficiencies);
    if (typeof derivation.citationCount === "number" && citations.length !== derivation.citationCount) {
      add(
        deficiencies,
        "citation-count-mismatch",
        "derivation.citationCount",
        "citation count does not match citations",
      );
    }
    if (!Array.isArray(derivation.unresolvedValidityRisks))
      add(
        deficiencies,
        "missing-validity-risk-list",
        "derivation.unresolvedValidityRisks",
        "validity risks must be explicit, even when empty",
      );
    if (derivation.classification === "A1" || derivation.classification === "A4") {
      add(
        deficiencies,
        "inadmissible-derivation",
        "derivation.classification",
        "A1 and A4 contracts cannot enter reader review",
      );
    }
  }
  const novelty = asRecord(candidate.novelty, "novelty", deficiencies);
  if (novelty !== null) {
    requiredText(novelty.causalAxis, "novelty.causalAxis", deficiencies);
    requiredText(novelty.subjectActionContract, "novelty.subjectActionContract", deficiencies);
    requiredText(novelty.nearestBaseline, "novelty.nearestBaseline", deficiencies);
    requiredText(novelty.materialDifference, "novelty.materialDifference", deficiencies);
  }

  return {
    candidateId,
    status: deficiencies.length === 0 ? "accepted" : "rejected",
    deficiencies,
    checkedRuleCount: ruleIds.length,
    checkedMetricCount: metricIds.length,
    checkedEnvelopeDimensionCount: envelopeIds.length,
  };
};

export function auditCandidateContract(value: unknown): ContractGateResult {
  try {
    const candidate = requireShape(value, "candidate-contract", ["schema", "candidateId"]);
    return auditCandidateLike(candidate);
  } catch (error) {
    if (!(error instanceof RigInputError)) throw error;
    return {
      candidateId: null,
      status: "refused",
      deficiencies: [{ code: "malformed-input-refused", path: "$", message: error.message }],
      checkedRuleCount: 0,
      checkedMetricCount: 0,
      checkedEnvelopeDimensionCount: 0,
    };
  }
}

export function contractGateB6(
  knownGood: CandidateContract,
  knownBad: unknown,
): {
  readonly usable: boolean;
  readonly sameInvocation: true;
  readonly knownGoodPassed: boolean;
  readonly knownBadFailed: boolean;
  readonly malformedInputRefused: boolean;
  readonly nondegenerate: boolean;
  readonly reasons: readonly string[];
} {
  const good = auditCandidateContract(knownGood);
  const bad = auditCandidateContract(knownBad);
  const malformed = auditCandidateContract([]);
  const controls = [
    {
      id: "known-good-contract",
      expect: "pass" as const,
      observedFailures: good.deficiencies.map((row) => row.code),
    },
    {
      id: "known-bad-contract",
      expect: "fail" as const,
      observedFailures: bad.deficiencies.map((row) => row.code),
    },
  ];
  const integrity = rigIntegrity(
    "phase16-candidate-contract-gate",
    controls,
    controls.map((row) => row.observedFailures),
  );
  const malformedInputRefused = malformed.status === "refused";
  return {
    usable: integrity.usable && malformedInputRefused,
    sameInvocation: true,
    knownGoodPassed: good.status === "accepted",
    knownBadFailed: bad.status === "rejected",
    malformedInputRefused,
    nondegenerate: !integrity.degenerate,
    reasons: malformedInputRefused
      ? integrity.reasons
      : [...integrity.reasons, "malformed input returned a verdict"],
  };
}
