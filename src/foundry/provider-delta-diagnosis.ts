import type { TrialRecord } from "../trials/types.js";
import type { ProviderDeltaComparison } from "./provider-delta.js";
import { providerFamilyFromModel } from "./provider-delta.js";
import type { RuleCode } from "./schema.js";

export const PROVIDER_DELTA_DIAGNOSIS_VERDICTS = [
  "openai_specific_failure",
  "non_openai_solver_delta",
  "shared_mechanism_failure",
  "implementation_strategy_delta",
  "possible_spec_ambiguity",
  "possible_harness_artifact",
  "insufficient_artifacts",
  "evolution_recommended",
  "same_provider_stability_recommended",
  "matrix_still_blocked",
] as const;
export type ProviderDeltaDiagnosisVerdict = (typeof PROVIDER_DELTA_DIAGNOSIS_VERDICTS)[number];

export const PROVIDER_DELTA_DIAGNOSIS_ROUTES = [
  "diagnose",
  "evolve_family",
  "run_non_openai_smoke",
  "same_provider_stability",
  "repair_spec_or_verifier",
  "matrix_candidate",
  "hold",
] as const;
export type ProviderDeltaRoute = (typeof PROVIDER_DELTA_DIAGNOSIS_ROUTES)[number];

export const PROVIDER_DELTA_DIAGNOSIS_CONFIDENCES = ["low", "medium", "high"] as const;
export type ProviderDeltaConfidence = (typeof PROVIDER_DELTA_DIAGNOSIS_CONFIDENCES)[number];

export const PROVIDER_DELTA_DIAGNOSIS_RULE_CODES = [
  "PROVIDER_DELTA_DIAGNOSIS_MISSING_ARTIFACT",
  "PROVIDER_DELTA_DIAGNOSIS_STALE_HASH",
  "PROVIDER_DELTA_DIAGNOSIS_MIXED_MATRIX_BLOCKED",
  "PROVIDER_DELTA_DIAGNOSIS_NOT_DIFFICULTY_EVIDENCE",
  "PROVIDER_DELTA_DIAGNOSIS_SAME_PROVIDER_STABILITY_ONLY",
  "PROVIDER_DELTA_EVOLUTION_PROPOSAL_INCOMPLETE",
] as const satisfies readonly RuleCode[];
export type ProviderDeltaDiagnosisRuleCode = (typeof PROVIDER_DELTA_DIAGNOSIS_RULE_CODES)[number];

export interface ProviderDeltaDiagnosisFinding {
  readonly code: ProviderDeltaDiagnosisRuleCode;
  readonly severity: "blocker" | "advisory";
  readonly detail: string;
}

export interface ProviderDeltaTrialDiagnosisLike {
  readonly runId: string;
  readonly scenariosFailed: number;
  readonly checks: readonly { readonly check: string; readonly scenarios: number }[];
  readonly implicated: readonly {
    readonly knob: string;
    readonly value: string;
    readonly scenarios: number;
    readonly failed: number;
  }[];
  readonly matchesHypothesis: boolean;
  readonly repairSuspected: boolean;
  readonly reading: string;
}

export interface ProviderDeltaArtifactInput {
  readonly runId: string;
  readonly artifactPath: string | null;
  readonly transcriptPath: string | null;
  readonly submissionFiles: readonly string[];
  readonly subjectSource: string | null;
  readonly transcriptText: string | null;
  readonly challengeHash: string | null;
  readonly currentChallengeHash: string;
}

export interface ProviderDeltaArtifactInspection {
  readonly runId: string;
  readonly artifactPath: string | null;
  readonly transcriptPath: string | null;
  readonly submissionFiles: readonly string[];
  readonly sourcePresent: boolean;
  readonly transcriptPresent: boolean;
  readonly challengeHash: string | null;
  readonly hashCurrent: boolean;
  readonly lines: number;
  readonly bytes: number;
  readonly hasChecker: boolean;
  readonly signals: ProviderDeltaArtifactSignals;
  readonly missing: readonly string[];
}

export interface ProviderDeltaArtifactSignals {
  readonly currentAliasRead: boolean;
  readonly rolloutLedgerRead: boolean;
  readonly evalStreamRead: boolean;
  readonly baselineRead: boolean;
  readonly authoritativeTruthReferenced: boolean;
  readonly concreteVersionTracked: boolean;
  readonly baselineComparisonVersioned: boolean;
  readonly canaryWindowHandled: boolean;
  readonly rollbackContinueQuarantineModeled: boolean;
  readonly effectLedgerUsed: boolean;
  readonly auditProduced: boolean;
  readonly subjectOwnedTruthRejected: boolean;
  readonly quarantineThresholdHandled: boolean;
  readonly versionMixHandled: boolean;
  readonly negativeThresholdConventionHandled: boolean;
  readonly idempotencyHandled: boolean;
}

export interface ProviderDeltaSubjectComparison {
  readonly runId: string;
  readonly providerFamily: string;
  readonly model: string | null;
  readonly status: "counted_failure" | "counted_solve" | "uncounted";
  readonly scenariosGraded: number;
  readonly scenariosFailed: number;
  readonly failedChecks: readonly { readonly check: string; readonly scenarios: number }[];
  readonly artifact: ProviderDeltaArtifactInspection | null;
  readonly diagnosis: ProviderDeltaTrialDiagnosisLike | null;
}

export interface ProviderDeltaFailureOverlap {
  readonly leftRunId: string;
  readonly rightRunId: string;
  readonly leftFailures: number;
  readonly rightFailures: number;
  readonly overlap: number;
  readonly union: number;
  readonly jaccard: number;
  readonly relation:
    | "both_clean"
    | "one_clean_one_failing"
    | "identical"
    | "left_subset"
    | "right_subset"
    | "disjoint"
    | "partial_overlap";
}

export interface ProviderDeltaKnobDelta {
  readonly knob: string;
  readonly highestFailingValue: string;
  readonly highestFailureRate: number;
  readonly lowestFailureRate: number;
  readonly discriminates: boolean;
}

export interface ProviderDeltaMechanismReading {
  readonly signal: string;
  readonly openAi: string;
  readonly nonOpenAi: string;
  readonly reading: string;
}

export interface ProviderDeltaEvidenceBoundary {
  readonly claimsNewDifficultyEvidence: boolean;
  readonly claimsCrossLabDifficulty: boolean;
  readonly claimsMatrixReadiness: boolean;
  readonly claimsHumanEvidence: boolean;
  readonly claimsNewModelTrial: boolean;
  readonly explanation: string;
}

export interface ProviderDeltaDiagnosis {
  readonly familyId: string;
  readonly challengeHash: string;
  readonly scenarioSetId: string;
  readonly verdicts: readonly ProviderDeltaDiagnosisVerdict[];
  readonly route: ProviderDeltaRoute;
  readonly confidence: ProviderDeltaConfidence;
  readonly confidenceReason: string;
  readonly subjects: readonly ProviderDeltaSubjectComparison[];
  readonly failureOverlaps: readonly ProviderDeltaFailureOverlap[];
  readonly knobDeltas: readonly ProviderDeltaKnobDelta[];
  readonly mechanismReadings: readonly ProviderDeltaMechanismReading[];
  readonly blockers: readonly ProviderDeltaDiagnosisFinding[];
  readonly advisories: readonly ProviderDeltaDiagnosisFinding[];
  readonly evidenceBoundary: ProviderDeltaEvidenceBoundary;
  readonly exactNextRoute: string;
}

export interface ProviderDeltaDiagnosisInput {
  readonly familyId: string;
  readonly challengeHash: string;
  readonly scenarioSetId: string;
  readonly comparison: ProviderDeltaComparison;
  readonly records: readonly TrialRecord[];
  readonly diagnoses: readonly ProviderDeltaTrialDiagnosisLike[];
  readonly artifacts: readonly ProviderDeltaArtifactInspection[];
  readonly scenarioParams: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
}

export function inspectProviderDeltaArtifact(
  input: ProviderDeltaArtifactInput,
): ProviderDeltaArtifactInspection {
  const source = input.subjectSource ?? "";
  const lower = source.toLowerCase();
  const transcript = input.transcriptText ?? "";
  const missing: string[] = [];
  if (input.subjectSource === null) missing.push("submission/subject.mjs");
  if (input.transcriptText === null || transcript.trim().length === 0) missing.push("transcript");
  if (input.challengeHash === null) missing.push("metadata.challengeHash");
  return {
    runId: input.runId,
    artifactPath: input.artifactPath,
    transcriptPath: input.transcriptPath,
    submissionFiles: input.submissionFiles,
    sourcePresent: input.subjectSource !== null,
    transcriptPresent: transcript.trim().length > 0,
    challengeHash: input.challengeHash,
    hashCurrent: input.challengeHash === input.currentChallengeHash,
    lines: input.subjectSource === null ? 0 : source.split(/\r?\n/).length,
    bytes: input.subjectSource === null ? 0 : Buffer.byteLength(source, "utf8"),
    hasChecker: input.submissionFiles.some((file) => /(^|\/)checker\.mjs$/.test(file)),
    signals: inspectArtifactSignals(lower),
    missing,
  };
}

export function diagnoseProviderDelta(input: ProviderDeltaDiagnosisInput): ProviderDeltaDiagnosis {
  const findings: ProviderDeltaDiagnosisFinding[] = [];
  const add = (
    code: ProviderDeltaDiagnosisRuleCode,
    severity: ProviderDeltaDiagnosisFinding["severity"],
    detail: string,
  ) => findings.push({ code, severity, detail });

  const artifactByRunId = new Map(input.artifacts.map((artifact) => [artifact.runId, artifact]));
  const diagnosisByRunId = new Map(input.diagnoses.map((diagnosis) => [diagnosis.runId, diagnosis]));
  const subjects = input.records
    .filter((record) => record.subjectType === "agent")
    .map((record): ProviderDeltaSubjectComparison => {
      const failedCells = record.cells.filter((cell) => cell.failed.length > 0);
      const failedChecks = checkTotals(record);
      return {
        runId: record.runId,
        providerFamily: providerFamilyFromModel(record.model),
        model: record.model,
        status: record.counts ? (failedCells.length > 0 ? "counted_failure" : "counted_solve") : "uncounted",
        scenariosGraded: record.cells.length,
        scenariosFailed: failedCells.length,
        failedChecks,
        artifact: artifactByRunId.get(record.runId) ?? null,
        diagnosis: diagnosisByRunId.get(record.runId) ?? null,
      };
    })
    .sort((a, b) => a.runId.localeCompare(b.runId));

  for (const subject of subjects) {
    const artifact = subject.artifact;
    if (artifact === null || artifact.missing.length > 0) {
      add(
        "PROVIDER_DELTA_DIAGNOSIS_MISSING_ARTIFACT",
        "blocker",
        `${subject.runId} is missing ${artifact?.missing.join(", ") || "artifact inspection"}`,
      );
    }
    if (artifact !== null && !artifact.hashCurrent) {
      add(
        "PROVIDER_DELTA_DIAGNOSIS_STALE_HASH",
        "blocker",
        `${subject.runId} recorded hash ${artifact.challengeHash ?? "missing"} instead of ${input.challengeHash}`,
      );
    }
  }

  const openAiSubjects = subjects.filter((subject) => subject.providerFamily === "openai");
  const nonOpenAiSubjects = subjects.filter(
    (subject) => !["openai", "external", "manual", "unknown"].includes(subject.providerFamily),
  );
  const openAiFailures = openAiSubjects.filter((subject) => subject.status === "counted_failure");
  const nonOpenAiFailures = nonOpenAiSubjects.filter((subject) => subject.status === "counted_failure");
  const nonOpenAiSolves = nonOpenAiSubjects.filter((subject) => subject.status === "counted_solve");
  const artifactBlockers = findings.some(
    (finding) =>
      finding.severity === "blocker" &&
      (finding.code === "PROVIDER_DELTA_DIAGNOSIS_MISSING_ARTIFACT" ||
        finding.code === "PROVIDER_DELTA_DIAGNOSIS_STALE_HASH"),
  );

  const failureOverlaps = openAiSubjects.flatMap((openAi) =>
    nonOpenAiSubjects.map((nonOpenAi) =>
      compareFailureOverlap(
        openAi,
        nonOpenAi,
        recordByRunId(input.records, openAi.runId),
        recordByRunId(input.records, nonOpenAi.runId),
      ),
    ),
  );
  const knobDeltas = topKnobDeltas(input.records, input.scenarioParams);
  const mechanismReadings = compareMechanismSignals(
    openAiFailures[0]?.artifact ?? null,
    nonOpenAiSolves[0]?.artifact ?? nonOpenAiFailures[0]?.artifact ?? null,
  );

  const verdicts: ProviderDeltaDiagnosisVerdict[] = [];
  const pushVerdict = (verdict: ProviderDeltaDiagnosisVerdict) => {
    if (!verdicts.includes(verdict)) verdicts.push(verdict);
  };

  if (artifactBlockers) {
    pushVerdict("insufficient_artifacts");
  }
  if (input.diagnoses.some((diagnosis) => diagnosis.repairSuspected)) {
    pushVerdict("possible_spec_ambiguity");
  }
  if (input.comparison.verdict === "both_failed_matrix_candidate") {
    pushVerdict("shared_mechanism_failure");
  }
  if (input.comparison.verdict === "provider_specific_failure") {
    pushVerdict("openai_specific_failure");
    pushVerdict("non_openai_solver_delta");
    pushVerdict("implementation_strategy_delta");
    pushVerdict("matrix_still_blocked");
    pushVerdict("evolution_recommended");
    pushVerdict("same_provider_stability_recommended");
    add(
      "PROVIDER_DELTA_DIAGNOSIS_MIXED_MATRIX_BLOCKED",
      "blocker",
      "OpenAI failed on target but a current non-OpenAI run solved, so production /6 remains blocked by default",
    );
    add(
      "PROVIDER_DELTA_DIAGNOSIS_NOT_DIFFICULTY_EVIDENCE",
      "advisory",
      "provider-delta diagnosis explains existing evidence and does not create a new trial or difficulty claim",
    );
    add(
      "PROVIDER_DELTA_DIAGNOSIS_SAME_PROVIDER_STABILITY_ONLY",
      "advisory",
      "two more OpenAI repeats would estimate same-provider stability only, not cross-lab breadth",
    );
  }
  if (input.comparison.verdict === "non_openai_missing") {
    pushVerdict("same_provider_stability_recommended");
  }
  if (input.comparison.verdict === "stale_or_invalid_evidence") {
    pushVerdict("insufficient_artifacts");
  }

  const route = routeForDiagnosis(input.comparison.verdict, artifactBlockers, input.diagnoses);
  const confidence = confidenceFor(route, artifactBlockers, mechanismReadings, input.diagnoses);
  const confidenceReason = confidenceReasonFor(confidence, artifactBlockers, mechanismReadings);
  return {
    familyId: input.familyId,
    challengeHash: input.challengeHash,
    scenarioSetId: input.scenarioSetId,
    verdicts,
    route,
    confidence,
    confidenceReason,
    subjects,
    failureOverlaps,
    knobDeltas,
    mechanismReadings,
    blockers: uniqueFindings(findings.filter((finding) => finding.severity === "blocker")),
    advisories: uniqueFindings(findings.filter((finding) => finding.severity === "advisory")),
    evidenceBoundary: {
      claimsNewDifficultyEvidence: false,
      claimsCrossLabDifficulty: input.comparison.crossLabDifficultyEvidenced,
      claimsMatrixReadiness: input.comparison.matrixCandidate,
      claimsHumanEvidence: false,
      claimsNewModelTrial: false,
      explanation:
        "Provider-delta diagnosis reads preserved artifacts and routes next work; it is not a model trial, human solve, or full-matrix result.",
    },
    exactNextRoute: exactNextRouteFor(route, input.comparison.verdict),
  };
}

function inspectArtifactSignals(source: string): ProviderDeltaArtifactSignals {
  const has = (pattern: RegExp) => pattern.test(source);
  const currentAliasRead = has(/\bcurrentalias\s*\(/);
  const rolloutLedgerRead = has(/\brolloutledger\s*\(/);
  const evalStreamRead = has(/\bevalstream\s*\(/);
  const baselineRead = has(/\bbaseline\s*\(/);
  const concreteVersionTracked = has(/servedversion|concreteversion|publicversionlabel|current\.version/);
  const baselineComparisonVersioned = has(/requiredbaselineversion|baselineversion|baseline\.version/);
  const canaryWindowHandled = has(/canarywindow|rolloutwindow|open_windows|evidence_phases/);
  const rollbackContinueQuarantineModeled =
    has(/rollback/) && has(/continue/) && has(/quarantine/) && has(/re_evaluate|reevaluate/);
  const subjectOwnedTruthRejected =
    has(/usedsubjectmodelclaim:\s*false/) ||
    has(/subjectmodelclaim[^;\n]{0,120}(ignored|never consulted|not consulted)/);
  return {
    currentAliasRead,
    rolloutLedgerRead,
    evalStreamRead,
    baselineRead,
    authoritativeTruthReferenced: currentAliasRead && rolloutLedgerRead && evalStreamRead && baselineRead,
    concreteVersionTracked,
    baselineComparisonVersioned,
    canaryWindowHandled,
    rollbackContinueQuarantineModeled,
    effectLedgerUsed: has(/applyrolloutdecision/),
    auditProduced: has(/audit|observed/),
    subjectOwnedTruthRejected,
    quarantineThresholdHandled: has(/quarantinethreshold/),
    versionMixHandled: has(/otherversions|publicversionlabel|servedversion\s*===|misattributed/),
    negativeThresholdConventionHandled: has(/regressionscale|negative/),
    idempotencyHandled: has(/idempotencykey|appliedeffects|completedidempotency/),
  };
}

function checkTotals(record: TrialRecord): readonly { readonly check: string; readonly scenarios: number }[] {
  const counts = new Map<string, number>();
  for (const cell of record.cells) {
    for (const check of new Set(cell.failed)) counts.set(check, (counts.get(check) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([check, scenarios]) => ({ check, scenarios }))
    .sort((a, b) => b.scenarios - a.scenarios || a.check.localeCompare(b.check));
}

function recordByRunId(records: readonly TrialRecord[], runId: string): TrialRecord | null {
  return records.find((record) => record.runId === runId) ?? null;
}

function compareFailureOverlap(
  left: ProviderDeltaSubjectComparison,
  right: ProviderDeltaSubjectComparison,
  leftRecord: TrialRecord | null,
  rightRecord: TrialRecord | null,
): ProviderDeltaFailureOverlap {
  const leftFailures = failedScenarioSet(leftRecord);
  const rightFailures = failedScenarioSet(rightRecord);
  const overlap = [...leftFailures].filter((id) => rightFailures.has(id)).length;
  const union = new Set([...leftFailures, ...rightFailures]).size;
  return {
    leftRunId: left.runId,
    rightRunId: right.runId,
    leftFailures: leftFailures.size,
    rightFailures: rightFailures.size,
    overlap,
    union,
    jaccard: union === 0 ? 1 : overlap / union,
    relation: failureRelation(leftFailures, rightFailures),
  };
}

function failedScenarioSet(record: TrialRecord | null): ReadonlySet<string> {
  return new Set(record?.cells.filter((cell) => cell.failed.length > 0).map((cell) => cell.scenarioId) ?? []);
}

function failureRelation(
  leftFailures: ReadonlySet<string>,
  rightFailures: ReadonlySet<string>,
): ProviderDeltaFailureOverlap["relation"] {
  if (leftFailures.size === 0 && rightFailures.size === 0) return "both_clean";
  if (leftFailures.size === 0 || rightFailures.size === 0) return "one_clean_one_failing";
  const leftSubset = [...leftFailures].every((id) => rightFailures.has(id));
  const rightSubset = [...rightFailures].every((id) => leftFailures.has(id));
  if (leftSubset && rightSubset) return "identical";
  if (leftSubset) return "left_subset";
  if (rightSubset) return "right_subset";
  if ([...leftFailures].every((id) => !rightFailures.has(id))) return "disjoint";
  return "partial_overlap";
}

function topKnobDeltas(
  records: readonly TrialRecord[],
  scenarioParams: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
): readonly ProviderDeltaKnobDelta[] {
  const failingOpenAi = records.filter(
    (record) =>
      record.subjectType === "agent" &&
      record.counts &&
      providerFamilyFromModel(record.model) === "openai" &&
      record.cells.some((cell) => cell.failed.length > 0),
  );
  const knobs = new Set<string>();
  for (const params of scenarioParams.values()) for (const knob of Object.keys(params)) knobs.add(knob);
  const deltas: ProviderDeltaKnobDelta[] = [];
  for (const knob of [...knobs].sort()) {
    const rows = new Map<string, { scenarios: number; failed: number }>();
    for (const record of failingOpenAi) {
      for (const cell of record.cells) {
        const value = String(scenarioParams.get(cell.scenarioId)?.[knob] ?? "unknown");
        const row = rows.get(value) ?? { scenarios: 0, failed: 0 };
        row.scenarios += 1;
        if (cell.failed.length > 0) row.failed += 1;
        rows.set(value, row);
      }
    }
    if (rows.size === 0) continue;
    const sorted = [...rows.entries()]
      .map(([value, row]) => ({
        value,
        rate: row.scenarios === 0 ? 0 : row.failed / row.scenarios,
      }))
      .sort((a, b) => b.rate - a.rate || a.value.localeCompare(b.value));
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    if (highest === undefined || lowest === undefined) continue;
    const discriminates = highest.rate > 0 && (lowest.rate === 0 || highest.rate / lowest.rate >= 2);
    deltas.push({
      knob,
      highestFailingValue: highest.value,
      highestFailureRate: highest.rate,
      lowestFailureRate: lowest.rate,
      discriminates,
    });
  }
  return deltas.sort(
    (a, b) =>
      Number(b.discriminates) - Number(a.discriminates) ||
      b.highestFailureRate - a.highestFailureRate ||
      a.knob.localeCompare(b.knob),
  );
}

function compareMechanismSignals(
  openAi: ProviderDeltaArtifactInspection | null,
  nonOpenAi: ProviderDeltaArtifactInspection | null,
): readonly ProviderDeltaMechanismReading[] {
  const rows: ProviderDeltaMechanismReading[] = [];
  const push = (
    signal: string,
    key: keyof ProviderDeltaArtifactSignals,
    readingWhenSolverOnly: string,
  ): void => {
    const left = openAi?.signals[key] ?? false;
    const right = nonOpenAi?.signals[key] ?? false;
    rows.push({
      signal,
      openAi: signalWord(left),
      nonOpenAi: signalWord(right),
      reading:
        right && !left
          ? readingWhenSolverOnly
          : left && right
            ? "both submissions expose this static signal; the delta must be read from behavior and failed checks"
            : left && !right
              ? "failing submission has this static signal, but it was not enough to pass"
              : "neither preserved submission exposes this static signal",
    });
  };
  push(
    "authoritative rollout/eval/baseline reads",
    "authoritativeTruthReferenced",
    "solver explicitly reads all authoritative facades while failing submission does not",
  );
  push(
    "concrete version attribution",
    "concreteVersionTracked",
    "solver tracks concrete model versions more explicitly than the failing submission",
  );
  push(
    "canary/window handling",
    "canaryWindowHandled",
    "solver exposes rollout window logic absent from the failing submission",
  );
  push(
    "quarantine threshold handling",
    "quarantineThresholdHandled",
    "solver models the quarantine threshold that the failing submission appears to omit",
  );
  push(
    "mixed-version stream handling",
    "versionMixHandled",
    "solver models mixed served-version streams more explicitly",
  );
  push(
    "negative threshold convention handling",
    "negativeThresholdConventionHandled",
    "solver guards threshold sign conventions that the failing submission does not",
  );
  push(
    "idempotency/effect ledger handling",
    "idempotencyHandled",
    "solver preserves a stronger idempotency signal",
  );
  push(
    "subject-owned truth rejected",
    "subjectOwnedTruthRejected",
    "solver explicitly rejects subject/provider claims as truth",
  );
  return rows;
}

function signalWord(value: boolean): "present" | "absent" {
  return value ? "present" : "absent";
}

function routeForDiagnosis(
  comparisonVerdict: ProviderDeltaComparison["verdict"],
  artifactBlockers: boolean,
  diagnoses: readonly ProviderDeltaTrialDiagnosisLike[],
): ProviderDeltaRoute {
  if (artifactBlockers) return "hold";
  if (
    comparisonVerdict === "stale_or_invalid_evidence" ||
    diagnoses.some((diagnosis) => diagnosis.repairSuspected)
  ) {
    return "repair_spec_or_verifier";
  }
  if (comparisonVerdict === "both_failed_matrix_candidate" || comparisonVerdict === "cross_lab_difficulty") {
    return "matrix_candidate";
  }
  if (
    comparisonVerdict === "provider_specific_failure" ||
    comparisonVerdict === "mixed_signal_needs_diagnosis"
  ) {
    return "evolve_family";
  }
  if (comparisonVerdict === "non_openai_missing" || comparisonVerdict === "uncounted_non_openai_blocked") {
    return "run_non_openai_smoke";
  }
  if (comparisonVerdict === "both_solved_reallocate") return "evolve_family";
  return "diagnose";
}

function confidenceFor(
  route: ProviderDeltaRoute,
  artifactBlockers: boolean,
  mechanismReadings: readonly ProviderDeltaMechanismReading[],
  diagnoses: readonly ProviderDeltaTrialDiagnosisLike[],
): ProviderDeltaConfidence {
  if (artifactBlockers || route === "hold") return "low";
  if (diagnoses.some((diagnosis) => diagnosis.repairSuspected)) return "low";
  if (mechanismReadings.some((reading) => reading.openAi !== reading.nonOpenAi)) return "high";
  return "medium";
}

function confidenceReasonFor(
  confidence: ProviderDeltaConfidence,
  artifactBlockers: boolean,
  mechanismReadings: readonly ProviderDeltaMechanismReading[],
): string {
  if (artifactBlockers) {
    return "At least one counted run is missing a transcript, submission or current challenge hash, so diagnosis cannot route spend confidently.";
  }
  if (confidence === "high") {
    return "Preserved submissions are present and static strategy signals differ, matching the mixed provider outcome.";
  }
  if (mechanismReadings.length > 0) {
    return "Preserved submissions are present, but static signals alone do not fully explain the behavioral delta.";
  }
  return "The diagnosis can read outcomes but not enough artifact structure for a stronger claim.";
}

function exactNextRouteFor(
  route: ProviderDeltaRoute,
  comparisonVerdict: ProviderDeltaComparison["verdict"],
): string {
  if (route === "evolve_family") {
    return comparisonVerdict === "both_solved_reallocate"
      ? "reallocate or evolve; both providers solved the current branch"
      : "select an evolution probe that adds a harder evidence boundary before production matrix spend";
  }
  if (route === "same_provider_stability") {
    return "run same-provider stability only with explicit approval; do not report it as cross-lab";
  }
  if (route === "run_non_openai_smoke") {
    return "run or import one current-hash non-OpenAI smoke before revisiting /6";
  }
  if (route === "repair_spec_or_verifier") {
    return "repair the spec/verifier or reissue the package before more evidence spend";
  }
  if (route === "matrix_candidate") {
    return "matrix planning may be considered, but the /6 run still requires an explicit spend decision";
  }
  if (route === "hold") return "hold until missing artifacts or stale hashes are fixed";
  return "continue diagnosis before changing the family";
}

function uniqueFindings(
  findings: readonly ProviderDeltaDiagnosisFinding[],
): readonly ProviderDeltaDiagnosisFinding[] {
  return findings
    .filter(
      (finding, index, array) =>
        array.findIndex(
          (candidate) => candidate.code === finding.code && candidate.detail === finding.detail,
        ) === index,
    )
    .sort((a, b) => a.code.localeCompare(b.code) || a.detail.localeCompare(b.detail));
}
