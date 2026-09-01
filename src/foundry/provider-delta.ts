import type { TrialRecord } from "../trials/types.js";
import type { RuleCode } from "./schema.js";

export const PROVIDER_DELTA_VERDICTS = [
  "cross_lab_difficulty",
  "provider_specific_failure",
  "mixed_signal_needs_diagnosis",
  "both_solved_reallocate",
  "both_failed_matrix_candidate",
  "non_openai_missing",
  "uncounted_non_openai_blocked",
  "stale_or_invalid_evidence",
] as const;
export type ProviderDeltaVerdict = (typeof PROVIDER_DELTA_VERDICTS)[number];

export const PROVIDER_DELTA_DECISIONS = [
  "run_matrix",
  "diagnose",
  "evolve_family",
  "reallocate_cluster",
  "run_non_openai_smoke",
  "repair_spec_or_verifier",
  "hold",
] as const;
export type ProviderDeltaDecision = (typeof PROVIDER_DELTA_DECISIONS)[number];

export const PROVIDER_DELTA_EVIDENCE_STATUSES = [
  "counted_failure",
  "counted_solve",
  "provider_refusal",
  "infrastructure_error",
  "timeout",
  "not_run",
  "stale_hash",
  "invalid",
] as const;
export type ProviderDeltaEvidenceStatus = (typeof PROVIDER_DELTA_EVIDENCE_STATUSES)[number];

export const PROVIDER_DELTA_RULE_CODES = [
  "PROVIDER_DELTA_NON_OPENAI_MISSING",
  "PROVIDER_DELTA_UNCOUNTED_NON_OPENAI",
  "PROVIDER_DELTA_STALE_OR_INVALID_EVIDENCE",
  "PROVIDER_DELTA_OPENAI_ONLY_NO_CROSS_LAB",
  "PROVIDER_DELTA_MIXED_PROVIDER_SIGNAL",
  "PROVIDER_DELTA_MATRIX_NOT_AUTOMATIC",
  "PROVIDER_DELTA_PROVIDER_FAILURE_NO_COUNT",
  "PROVIDER_DELTA_INFRA_NO_COUNT",
] as const satisfies readonly RuleCode[];
export type ProviderDeltaRuleCode = (typeof PROVIDER_DELTA_RULE_CODES)[number];

export interface ProviderDeltaEvidence {
  readonly runId: string;
  readonly providerFamily: string;
  readonly model: string | null;
  readonly status: ProviderDeltaEvidenceStatus;
  readonly scenariosGraded: number;
  readonly scenariosFailed: number;
  readonly failedChecks: readonly string[];
  readonly onTarget: boolean | null;
  readonly challengeHash: string | null;
  readonly currentChallengeHash: string | null;
  readonly countabilityReason: string;
}

export interface ProviderDeltaInput {
  readonly familyId: string;
  readonly currentChallengeHash: string;
  readonly evidence: readonly ProviderDeltaEvidence[];
  readonly openAiProviderFamily?: string;
}

export interface ProviderDeltaFinding {
  readonly code: ProviderDeltaRuleCode;
  readonly severity: "blocker" | "advisory";
  readonly detail: string;
}

export interface ProviderDeltaComparison {
  readonly familyId: string;
  readonly verdict: ProviderDeltaVerdict;
  readonly decision: ProviderDeltaDecision;
  readonly matrixCandidate: boolean;
  readonly crossLabSmokePresent: boolean;
  readonly crossLabDifficultyEvidenced: boolean;
  readonly providerDeltaPending: boolean;
  readonly countedOpenAiRuns: readonly ProviderDeltaEvidence[];
  readonly countedNonOpenAiRuns: readonly ProviderDeltaEvidence[];
  readonly countedProviderFamilies: readonly string[];
  readonly countedFailureProviderFamilies: readonly string[];
  readonly countedSolveProviderFamilies: readonly string[];
  readonly uncountedNonOpenAiRuns: readonly ProviderDeltaEvidence[];
  readonly blockers: readonly ProviderDeltaFinding[];
  readonly advisories: readonly ProviderDeltaFinding[];
  readonly summary: string;
  readonly nextAction: string;
}

const DEFAULT_OPENAI_PROVIDER_FAMILY = "openai";
const NON_LAB_PROVIDER_FAMILIES = new Set(["external", "manual", "unknown"]);

export function providerFamilyFromModel(model: string | null): string {
  return model?.split("/")[0]?.toLowerCase() ?? "unknown";
}

export function providerDeltaEvidenceFromTrialRecords(
  records: readonly TrialRecord[],
  currentChallengeHash: string,
  onTargetRunIds: ReadonlySet<string> = new Set<string>(),
): readonly ProviderDeltaEvidence[] {
  return records
    .filter((record) => record.subjectType === "agent")
    .map((record) => {
      const failedCells = record.cells.filter((cell) => cell.failed.length > 0);
      const failedChecks = [...new Set(record.cells.flatMap((cell) => cell.failed))].sort();
      return {
        runId: record.runId,
        providerFamily: providerFamilyFromModel(record.model),
        model: record.model,
        status: evidenceStatusFor(record, failedCells.length),
        scenariosGraded: record.cells.length,
        scenariosFailed: failedCells.length,
        failedChecks,
        onTarget: failedCells.length === 0 ? null : onTargetRunIds.has(record.runId),
        challengeHash: currentChallengeHash,
        currentChallengeHash,
        countabilityReason: record.countsReason,
      };
    });
}

export function evaluateProviderDelta(input: ProviderDeltaInput): ProviderDeltaComparison {
  const openAiProviderFamily = (input.openAiProviderFamily ?? DEFAULT_OPENAI_PROVIDER_FAMILY).toLowerCase();
  const sorted = [...input.evidence].sort((a, b) => a.runId.localeCompare(b.runId));
  const findings: ProviderDeltaFinding[] = [];
  const add = (code: ProviderDeltaRuleCode, severity: ProviderDeltaFinding["severity"], detail: string) =>
    findings.push({ code, severity, detail });

  const staleOrInvalid = sorted.filter(
    (evidence) =>
      evidence.status === "stale_hash" ||
      evidence.status === "invalid" ||
      (evidence.challengeHash !== null && evidence.challengeHash !== input.currentChallengeHash) ||
      (evidence.currentChallengeHash !== null &&
        evidence.currentChallengeHash !== input.currentChallengeHash),
  );
  const current = sorted.filter((evidence) => !staleOrInvalid.includes(evidence));
  const counted = current.filter(
    (evidence) => evidence.status === "counted_failure" || evidence.status === "counted_solve",
  );
  const countedOpenAiRuns = counted.filter((evidence) => evidence.providerFamily === openAiProviderFamily);
  const countedNonOpenAiRuns = counted.filter((evidence) =>
    isNonOpenAiLab(evidence.providerFamily, openAiProviderFamily),
  );
  const countedProviderFamilies = uniqueSorted(counted.map((evidence) => evidence.providerFamily));
  const countedFailureProviderFamilies = uniqueSorted(
    counted
      .filter((evidence) => evidence.status === "counted_failure")
      .map((evidence) => evidence.providerFamily),
  );
  const countedSolveProviderFamilies = uniqueSorted(
    counted
      .filter((evidence) => evidence.status === "counted_solve")
      .map((evidence) => evidence.providerFamily),
  );
  const uncountedNonOpenAiRuns = current.filter(
    (evidence) =>
      isNonOpenAiLab(evidence.providerFamily, openAiProviderFamily) &&
      evidence.status !== "counted_failure" &&
      evidence.status !== "counted_solve",
  );
  const openAiFailures = countedOpenAiRuns.filter((evidence) => evidence.status === "counted_failure");
  const openAiSolves = countedOpenAiRuns.filter((evidence) => evidence.status === "counted_solve");
  const nonOpenAiFailures = countedNonOpenAiRuns.filter((evidence) => evidence.status === "counted_failure");
  const nonOpenAiSolves = countedNonOpenAiRuns.filter((evidence) => evidence.status === "counted_solve");
  const crossLabSmokePresent = countedOpenAiRuns.length > 0 && countedNonOpenAiRuns.length > 0;
  const crossLabDifficultyEvidenced =
    openAiFailures.length > 0 &&
    nonOpenAiFailures.some((evidence) => evidence.onTarget === true || evidence.onTarget === null);

  for (const evidence of current) {
    if (evidence.status === "provider_refusal") {
      add(
        "PROVIDER_DELTA_PROVIDER_FAILURE_NO_COUNT",
        "advisory",
        `${evidence.runId} is a provider refusal and contributes no provider-delta evidence`,
      );
    }
    if (evidence.status === "infrastructure_error" || evidence.status === "timeout") {
      add(
        "PROVIDER_DELTA_INFRA_NO_COUNT",
        "advisory",
        `${evidence.runId} is ${evidence.status} and contributes no provider-delta evidence`,
      );
    }
  }
  if (staleOrInvalid.length > 0) {
    add(
      "PROVIDER_DELTA_STALE_OR_INVALID_EVIDENCE",
      "blocker",
      `${staleOrInvalid.length} stale or invalid run(s) cannot participate in provider-delta decisions`,
    );
  }
  if (counted.length > 1 && countedProviderFamilies.length === 1) {
    add(
      "PROVIDER_DELTA_OPENAI_ONLY_NO_CROSS_LAB",
      "advisory",
      "repeated same-provider trials estimate stability, not cross-lab transfer",
    );
  }

  const base = {
    familyId: input.familyId,
    countedOpenAiRuns,
    countedNonOpenAiRuns,
    countedProviderFamilies,
    countedFailureProviderFamilies,
    countedSolveProviderFamilies,
    uncountedNonOpenAiRuns,
    crossLabSmokePresent,
    crossLabDifficultyEvidenced,
  } satisfies Partial<ProviderDeltaComparison>;

  const finish = (
    verdict: ProviderDeltaVerdict,
    decision: ProviderDeltaDecision,
    matrixCandidate: boolean,
    providerDeltaPending: boolean,
    summary: string,
    nextAction: string,
  ): ProviderDeltaComparison => {
    if (matrixCandidate) {
      add(
        "PROVIDER_DELTA_MATRIX_NOT_AUTOMATIC",
        "advisory",
        "cross-lab smoke can make a family a matrix candidate, but it must not execute a /6 automatically",
      );
    }
    if (verdict === "provider_specific_failure" || verdict === "mixed_signal_needs_diagnosis") {
      add(
        "PROVIDER_DELTA_MIXED_PROVIDER_SIGNAL",
        "blocker",
        "provider families disagree; diagnose or evolve before production matrix spend",
      );
    }
    const uniqueFindings = findings
      .filter(
        (finding, index, array) =>
          array.findIndex(
            (candidate) => candidate.code === finding.code && candidate.detail === finding.detail,
          ) === index,
      )
      .sort((a, b) => a.code.localeCompare(b.code) || a.detail.localeCompare(b.detail));
    return {
      ...base,
      verdict,
      decision,
      matrixCandidate,
      providerDeltaPending,
      summary,
      nextAction,
      blockers: uniqueFindings.filter((finding) => finding.severity === "blocker"),
      advisories: uniqueFindings.filter((finding) => finding.severity === "advisory"),
    } as ProviderDeltaComparison;
  };

  if (
    staleOrInvalid.some(
      (evidence) => evidence.status === "counted_failure" || evidence.status === "counted_solve",
    )
  ) {
    return finish(
      "stale_or_invalid_evidence",
      "repair_spec_or_verifier",
      false,
      true,
      "A counted provider-delta record is stale or invalid; current-hash evidence must be reissued before comparison.",
      "reissue current-hash packet or repair intake before deciding on production spend",
    );
  }

  if (openAiFailures.length > 0) {
    if (countedNonOpenAiRuns.length === 0) {
      if (uncountedNonOpenAiRuns.length > 0) {
        add(
          "PROVIDER_DELTA_UNCOUNTED_NON_OPENAI",
          "blocker",
          "non-OpenAI attempts exist, but none are current counted completed smoke evidence",
        );
        return finish(
          "uncounted_non_openai_blocked",
          "run_non_openai_smoke",
          false,
          true,
          "OpenAI failed on target, but non-OpenAI evidence is refusal, infrastructure, stale or otherwise uncounted.",
          "run or import one countable non-OpenAI smoke under the current hash",
        );
      }
      add(
        "PROVIDER_DELTA_NON_OPENAI_MISSING",
        "blocker",
        "OpenAI failed on target, but no current counted non-OpenAI smoke exists",
      );
      return finish(
        "non_openai_missing",
        "run_non_openai_smoke",
        false,
        true,
        "OpenAI/Codex failed on target and provider-delta comparison is pending because non-OpenAI smoke is missing.",
        "run or import one non-OpenAI smoke under the current hash",
      );
    }
    if (nonOpenAiFailures.length > 0 && nonOpenAiSolves.length === 0) {
      return finish(
        "both_failed_matrix_candidate",
        "run_matrix",
        true,
        false,
        "OpenAI and a non-OpenAI provider both failed current-hash smoke; this is early cross-lab smoke difficulty.",
        "consider a production /6 matrix plan, but do not run it automatically",
      );
    }
    if (nonOpenAiFailures.length > 0 && nonOpenAiSolves.length > 0) {
      return finish(
        "mixed_signal_needs_diagnosis",
        "diagnose",
        false,
        false,
        "At least one non-OpenAI provider failed and at least one solved; this is a mixed provider signal.",
        "diagnose provider-specific failure sets before production spend",
      );
    }
    return finish(
      "provider_specific_failure",
      "diagnose",
      false,
      false,
      "OpenAI failed on target while the current counted non-OpenAI smoke solved; this is provider-specific evidence, not cross-lab difficulty.",
      "diagnose provider delta, then evolve or repair if the mechanism is too provider-specific",
    );
  }

  if (openAiSolves.length > 0 && nonOpenAiSolves.length > 0 && nonOpenAiFailures.length === 0) {
    return finish(
      "both_solved_reallocate",
      "reallocate_cluster",
      false,
      false,
      "OpenAI and non-OpenAI smoke both solved; the branch should stop buying matrix evidence and reallocate.",
      "reallocate to a different mechanism cluster",
    );
  }

  if (openAiSolves.length > 0 && nonOpenAiFailures.length > 0) {
    return finish(
      "mixed_signal_needs_diagnosis",
      "diagnose",
      false,
      false,
      "OpenAI solved while a non-OpenAI provider failed; diagnose provider differences before any matrix spend.",
      "diagnose provider delta before choosing matrix, evolution or reallocation",
    );
  }

  if (countedNonOpenAiRuns.length === 0) {
    add("PROVIDER_DELTA_NON_OPENAI_MISSING", "blocker", "no current counted non-OpenAI smoke exists");
    return finish(
      "non_openai_missing",
      "run_non_openai_smoke",
      false,
      true,
      "Provider-delta comparison is pending because non-OpenAI smoke is missing.",
      "run or import one non-OpenAI smoke under the current hash",
    );
  }

  return finish(
    "mixed_signal_needs_diagnosis",
    "hold",
    false,
    true,
    "Provider evidence is incomplete or mixed in a way that does not justify matrix spend.",
    "hold until one OpenAI and one non-OpenAI current counted smoke can be compared",
  );
}

function evidenceStatusFor(record: TrialRecord, failedCells: number): ProviderDeltaEvidenceStatus {
  if (!record.counts) {
    if (record.status === "refused") return "provider_refusal";
    if (record.status === "timeout") return "timeout";
    if (record.status === "infrastructure_error") return "infrastructure_error";
    return "not_run";
  }
  return failedCells === 0 ? "counted_solve" : "counted_failure";
}

function isNonOpenAiLab(providerFamily: string, openAiProviderFamily: string): boolean {
  const normalized = providerFamily.toLowerCase();
  return normalized !== openAiProviderFamily && !NON_LAB_PROVIDER_FAMILIES.has(normalized);
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.toLowerCase()))].sort();
}
