import { describe, expect, it } from "vitest";
import {
  type ProviderDeltaEvidence,
  evaluateProviderDelta,
  providerDeltaEvidenceFromTrialRecords,
} from "../src/foundry/provider-delta.js";
import type { TrialDiagnosis } from "../src/reports/diagnosis.js";
import {
  deploymentAliasProviderDeltaComparison,
  renderDeploymentAliasProviderDeltaReport,
} from "../src/reports/provider-delta-report.js";
import type { TrialRecord } from "../src/trials/types.js";

const FAMILY_ID = "deployment-model-alias-rollout-drift";
const CHALLENGE_HASH = "805efb58c923f9e081db1b41967392d7";
const SCENARIO_SET_ID = "drift-339-590affe3";

const evidence = (overrides: Partial<ProviderDeltaEvidence> = {}): ProviderDeltaEvidence => ({
  runId: "provider-delta-fixture",
  providerFamily: "openai",
  model: "openai/gpt-5.6-sol",
  status: "counted_failure",
  scenariosGraded: 339,
  scenariosFailed: 192,
  failedChecks: ["current_alias_reconciled"],
  onTarget: true,
  challengeHash: CHALLENGE_HASH,
  currentChallengeHash: CHALLENGE_HASH,
  countabilityReason: "counted fixture",
  ...overrides,
});

const compare = (items: readonly ProviderDeltaEvidence[]) =>
  evaluateProviderDelta({
    familyId: FAMILY_ID,
    currentChallengeHash: CHALLENGE_HASH,
    evidence: items,
  });

const trialRecord = (overrides: Partial<TrialRecord> = {}): TrialRecord => ({
  runId: "provider-delta-trial-fixture",
  familyId: FAMILY_ID,
  subjectId: "gpt-5.6-sol",
  subjectType: "agent",
  model: "openai/gpt-5.6-sol",
  effort: null,
  status: "completed",
  counts: true,
  countsReason: "counted completed fixture",
  scenarioSetId: SCENARIO_SET_ID,
  cells: [
    { scenarioId: "drift-a", failed: ["current_alias_reconciled"] },
    { scenarioId: "drift-b", failed: [] },
  ],
  runtimeSeconds: null,
  costUsd: null,
  artifactPath: "trials/deployment-model-alias-rollout-drift/fixture/submission",
  isolation: "subprocess",
  notes: "fixture",
  ...overrides,
});

const diagnosis = (overrides: Partial<TrialDiagnosis> = {}): TrialDiagnosis => ({
  runId: "provider-delta-trial-fixture",
  familyId: FAMILY_ID,
  model: "openai/gpt-5.6-sol",
  counted: true,
  scenariosGraded: 339,
  scenariosFailed: 1,
  checks: [{ check: "current_alias_reconciled", scenarios: 1, share: 1 }],
  implicated: [],
  reading: "capability",
  matchesHypothesis: true,
  notes: [],
  repairSuspected: false,
  ...overrides,
});

describe("provider-delta decision model", () => {
  it("routes OpenAI failure with no non-OpenAI result to non_openai_missing", () => {
    const result = compare([evidence()]);

    expect(result.verdict).toBe("non_openai_missing");
    expect(result.decision).toBe("run_non_openai_smoke");
    expect(result.matrixCandidate).toBe(false);
    expect(result.blockers.map((finding) => finding.code)).toContain("PROVIDER_DELTA_NON_OPENAI_MISSING");
  });

  it("treats uncounted non-OpenAI attempts as still blocked", () => {
    const result = compare([
      evidence(),
      evidence({
        runId: "claude-refusal-fixture",
        providerFamily: "anthropic",
        model: "anthropic/claude-opus-5",
        status: "provider_refusal",
        scenariosGraded: 0,
        scenariosFailed: 0,
        failedChecks: [],
        onTarget: null,
        countabilityReason: "provider refusal no-count fixture",
      }),
      evidence({
        runId: "claude-infra-fixture",
        providerFamily: "anthropic",
        model: "anthropic/claude-opus-5",
        status: "infrastructure_error",
        scenariosGraded: 0,
        scenariosFailed: 0,
        failedChecks: [],
        onTarget: null,
        countabilityReason: "infrastructure no-count fixture",
      }),
    ]);

    expect(result.verdict).toBe("uncounted_non_openai_blocked");
    expect(result.decision).toBe("run_non_openai_smoke");
    expect(result.blockers.map((finding) => finding.code)).toContain("PROVIDER_DELTA_UNCOUNTED_NON_OPENAI");
    expect(result.advisories.map((finding) => finding.code)).toContain(
      "PROVIDER_DELTA_PROVIDER_FAILURE_NO_COUNT",
    );
    expect(result.advisories.map((finding) => finding.code)).toContain("PROVIDER_DELTA_INFRA_NO_COUNT");
  });

  it("makes OpenAI plus non-OpenAI failures a matrix candidate, not an automatic run", () => {
    const result = compare([
      evidence(),
      evidence({
        runId: "claude-failure-fixture",
        providerFamily: "anthropic",
        model: "anthropic/claude-opus-5",
        status: "counted_failure",
        scenariosFailed: 88,
        onTarget: true,
      }),
    ]);

    expect(result.verdict).toBe("both_failed_matrix_candidate");
    expect(result.decision).toBe("run_matrix");
    expect(result.crossLabDifficultyEvidenced).toBe(true);
    expect(result.matrixCandidate).toBe(true);
    expect(result.advisories.map((finding) => finding.code)).toContain("PROVIDER_DELTA_MATRIX_NOT_AUTOMATIC");
  });

  it("routes OpenAI failure plus non-OpenAI clean solve to provider-delta diagnosis", () => {
    const result = compare([
      evidence(),
      evidence({
        runId: "claude-clean-fixture",
        providerFamily: "anthropic",
        model: "anthropic/claude-opus-5",
        status: "counted_solve",
        scenariosFailed: 0,
        failedChecks: [],
        onTarget: null,
      }),
    ]);

    expect(result.verdict).toBe("provider_specific_failure");
    expect(result.decision).toBe("diagnose");
    expect(result.crossLabSmokePresent).toBe(true);
    expect(result.crossLabDifficultyEvidenced).toBe(false);
    expect(result.matrixCandidate).toBe(false);
    expect(result.blockers.map((finding) => finding.code)).toContain("PROVIDER_DELTA_MIXED_PROVIDER_SIGNAL");
  });

  it("routes both providers solving cleanly to reallocation", () => {
    const result = compare([
      evidence({ status: "counted_solve", scenariosFailed: 0, failedChecks: [], onTarget: null }),
      evidence({
        runId: "claude-clean-fixture",
        providerFamily: "anthropic",
        model: "anthropic/claude-opus-5",
        status: "counted_solve",
        scenariosFailed: 0,
        failedChecks: [],
        onTarget: null,
      }),
    ]);

    expect(result.verdict).toBe("both_solved_reallocate");
    expect(result.decision).toBe("reallocate_cluster");
    expect(result.matrixCandidate).toBe(false);
  });

  it("blocks stale non-OpenAI evidence before comparison", () => {
    const result = compare([
      evidence(),
      evidence({
        runId: "claude-stale-fixture",
        providerFamily: "anthropic",
        model: "anthropic/claude-opus-5",
        status: "counted_failure",
        challengeHash: "stale-hash",
        currentChallengeHash: CHALLENGE_HASH,
      }),
    ]);

    expect(result.verdict).toBe("stale_or_invalid_evidence");
    expect(result.decision).toBe("repair_spec_or_verifier");
    expect(result.blockers.map((finding) => finding.code)).toContain(
      "PROVIDER_DELTA_STALE_OR_INVALID_EVIDENCE",
    );
  });

  it("does not treat repeated same-provider trials as cross-lab transfer", () => {
    const result = compare([evidence(), evidence({ runId: "openai-repeat-fixture" })]);

    expect(result.verdict).toBe("non_openai_missing");
    expect(result.crossLabSmokePresent).toBe(false);
    expect(result.advisories.map((finding) => finding.code)).toContain(
      "PROVIDER_DELTA_OPENAI_ONLY_NO_CROSS_LAB",
    );
  });

  it("renders the current mixed provider state deterministically", () => {
    const openai = trialRecord();
    const claude = trialRecord({
      runId: "deployment-alias-2026-09-claude-1",
      subjectId: "claude-opus-5",
      model: "anthropic/claude-opus-5",
      cells: [
        { scenarioId: "drift-a", failed: [] },
        { scenarioId: "drift-b", failed: [] },
      ],
    });
    const input = {
      challengeHash: CHALLENGE_HASH,
      scenarioSetId: SCENARIO_SET_ID,
      records: [openai, claude],
      externalResults: [],
      diagnoses: [diagnosis()],
    };

    const comparison = deploymentAliasProviderDeltaComparison(input);
    const first = renderDeploymentAliasProviderDeltaReport(input);
    const second = renderDeploymentAliasProviderDeltaReport(input);

    expect(comparison.verdict).toBe("provider_specific_failure");
    expect(first).toBe(second);
    expect(first).toContain("OpenAI failed on target while the current counted non-OpenAI smoke solved");
    expect(first).toContain("Provider-delta diagnosis is a routing decision");
  });
});
