import { describe, expect, it } from "vitest";
import {
  deploymentAliasEvolutionProposals,
  planDeploymentAliasEvolution,
  validateDeploymentAliasEvolutionProposals,
} from "../src/foundry/deployment-alias-evolution.js";
import {
  type ProviderDeltaArtifactInspection,
  diagnoseProviderDelta,
  inspectProviderDeltaArtifact,
} from "../src/foundry/provider-delta-diagnosis.js";
import { evaluateProviderDelta } from "../src/foundry/provider-delta.js";
import {
  renderDeploymentAliasEvolutionOptionsReport,
  renderDeploymentAliasProviderDeltaDiagnosisReport,
} from "../src/reports/provider-delta-diagnosis-report.js";
import type { TrialRecord } from "../src/trials/types.js";

const FAMILY_ID = "deployment-model-alias-rollout-drift";
const HASH = "805efb58c923f9e081db1b41967392d7";
const SCENARIO_SET_ID = "drift-339-590affe3";

const scenarioParams = new Map<string, Record<string, unknown>>([
  ["s-rollback", { rolloutPhase: "ramp", canaryWindow: "open", evalMix: "mixed_versions" }],
  ["s-continue", { rolloutPhase: "complete", canaryWindow: "complete", evalMix: "all_current" }],
  ["s-quarantine", { rolloutPhase: "canary", canaryWindow: "closed", evalMix: "insufficient" }],
]);

const openAiSource = `
export const subject = {
  run(view, deployment) {
    const current = deployment.currentAlias(view.request.alias);
    const ledger = deployment.rolloutLedger(view.request.alias);
    const evals = deployment.evalStream(view.request.alias);
    const baseline = deployment.baseline(view.request.requiredBaselineVersion);
    const decision = current.canaryWindow === "open" ? "rollback" : "continue";
    deployment.applyRolloutDecision(view.request.id, {
      alias: view.request.alias,
      decision,
      concreteVersion: current.version,
      baselineVersion: baseline.version,
      idempotencyKey: view.request.idempotencyKey,
    });
    return { decisions: [], audit: [{ usedSubjectModelClaim: false, detail: ledger.length + evals.length }] };
  }
};`;

const claudeSource = `
const OPEN_WINDOWS = new Set(["open", "complete"]);
function regressionScale(baseline) {
  const negative = baseline.rollbackThreshold < 0;
  return negative ? -1 : 1;
}
export const subject = {
  run(view, deployment) {
    const current = deployment.currentAlias(view.request.alias);
    const ledger = deployment.rolloutLedger(view.request.alias);
    const evals = deployment.evalStream(view.request.alias);
    const baseline = deployment.baseline(view.request.requiredBaselineVersion);
    const otherVersions = evals.filter((sample) => sample.servedVersion !== current.version);
    const scored = evals.filter((sample) => sample.servedVersion === current.version && sample.inRolloutWindow);
    const threshold = baseline.quarantineThreshold * regressionScale(baseline);
    const claimNote = view.subjectModelClaim ? "subject/provider model claim present and ignored" : "none";
    const decision = OPEN_WINDOWS.has(current.canaryWindow) && scored.length >= 2 && otherVersions.length === 0 && threshold < 1
      ? "continue"
      : "re_evaluate";
    deployment.applyRolloutDecision(view.request.id, {
      alias: view.request.alias,
      decision,
      concreteVersion: current.version,
      baselineVersion: baseline.version,
      idempotencyKey: view.request.idempotencyKey,
    });
    return { decisions: [], audit: [{ usedSubjectModelClaim: false, detail: claimNote }] };
  }
};`;

const record = (overrides: Partial<TrialRecord> = {}): TrialRecord => ({
  runId: "openai-run",
  familyId: FAMILY_ID,
  subjectId: "gpt-5.6-sol",
  subjectType: "agent",
  model: "openai/gpt-5.6-sol",
  effort: null,
  status: "completed",
  counts: true,
  countsReason: "counted fixture",
  scenarioSetId: SCENARIO_SET_ID,
  cells: [
    { scenarioId: "s-rollback", failed: ["decision_matches_truth", "rollback_required"] },
    { scenarioId: "s-continue", failed: ["continue_required"] },
    { scenarioId: "s-quarantine", failed: [] },
  ],
  runtimeSeconds: null,
  costUsd: null,
  artifactPath: "trials/deployment-model-alias-rollout-drift/openai-run/submission",
  isolation: "subprocess",
  notes: "fixture",
  ...overrides,
});

const artifact = (
  runId: string,
  source: string | null,
  challengeHash = HASH,
): ProviderDeltaArtifactInspection =>
  inspectProviderDeltaArtifact({
    runId,
    artifactPath: `trials/${FAMILY_ID}/${runId}/submission`,
    transcriptPath: `trials/${FAMILY_ID}/${runId}/transcript.txt`,
    submissionFiles: source === null ? [] : ["subject.mjs"],
    subjectSource: source,
    transcriptText: source === null ? null : "transcript preserved",
    challengeHash,
    currentChallengeHash: HASH,
  });

function mixedDiagnosis(overrides: { artifacts?: readonly ProviderDeltaArtifactInspection[] } = {}) {
  const records = [
    record(),
    record({
      runId: "claude-run",
      subjectId: "claude-opus-5",
      model: "anthropic/claude-opus-5",
      cells: [
        { scenarioId: "s-rollback", failed: [] },
        { scenarioId: "s-continue", failed: [] },
        { scenarioId: "s-quarantine", failed: [] },
      ],
      artifactPath: `trials/${FAMILY_ID}/claude-run/submission`,
    }),
  ];
  const comparison = evaluateProviderDelta({
    familyId: FAMILY_ID,
    currentChallengeHash: HASH,
    evidence: [
      {
        runId: "openai-run",
        providerFamily: "openai",
        model: "openai/gpt-5.6-sol",
        status: "counted_failure",
        scenariosGraded: 3,
        scenariosFailed: 2,
        failedChecks: ["decision_matches_truth"],
        onTarget: true,
        challengeHash: HASH,
        currentChallengeHash: HASH,
        countabilityReason: "counted fixture",
      },
      {
        runId: "claude-run",
        providerFamily: "anthropic",
        model: "anthropic/claude-opus-5",
        status: "counted_solve",
        scenariosGraded: 3,
        scenariosFailed: 0,
        failedChecks: [],
        onTarget: null,
        challengeHash: HASH,
        currentChallengeHash: HASH,
        countabilityReason: "counted fixture",
      },
    ],
  });
  return diagnoseProviderDelta({
    familyId: FAMILY_ID,
    challengeHash: HASH,
    scenarioSetId: SCENARIO_SET_ID,
    comparison,
    records,
    diagnoses: [
      {
        runId: "openai-run",
        scenariosFailed: 2,
        checks: [{ check: "decision_matches_truth", scenarios: 2 }],
        implicated: [],
        matchesHypothesis: true,
        repairSuspected: false,
        reading: "capability",
      },
    ],
    artifacts: overrides.artifacts ?? [
      artifact("openai-run", openAiSource),
      artifact("claude-run", claudeSource),
    ],
    scenarioParams,
  });
}

describe("provider-delta diagnosis", () => {
  it("routes OpenAI failure plus Claude solve to evolution diagnosis, not matrix readiness", () => {
    const diagnosis = mixedDiagnosis();

    expect(diagnosis.route).toBe("evolve_family");
    expect(diagnosis.verdicts).toContain("openai_specific_failure");
    expect(diagnosis.verdicts).toContain("non_openai_solver_delta");
    expect(diagnosis.verdicts).toContain("matrix_still_blocked");
    expect(diagnosis.evidenceBoundary.claimsNewDifficultyEvidence).toBe(false);
    expect(diagnosis.evidenceBoundary.claimsCrossLabDifficulty).toBe(false);
    expect(diagnosis.evidenceBoundary.claimsMatrixReadiness).toBe(false);
    expect(diagnosis.blockers.map((finding) => finding.code)).toContain(
      "PROVIDER_DELTA_DIAGNOSIS_MIXED_MATRIX_BLOCKED",
    );
    expect(diagnosis.advisories.map((finding) => finding.code)).toContain(
      "PROVIDER_DELTA_DIAGNOSIS_NOT_DIFFICULTY_EVIDENCE",
    );
    expect(diagnosis.advisories.map((finding) => finding.code)).toContain(
      "PROVIDER_DELTA_DIAGNOSIS_SAME_PROVIDER_STABILITY_ONLY",
    );
  });

  it("marks missing transcript or submission as insufficient artifacts", () => {
    const diagnosis = mixedDiagnosis({
      artifacts: [artifact("openai-run", null), artifact("claude-run", claudeSource)],
    });

    expect(diagnosis.route).toBe("hold");
    expect(diagnosis.verdicts).toContain("insufficient_artifacts");
    expect(diagnosis.blockers.map((finding) => finding.code)).toContain(
      "PROVIDER_DELTA_DIAGNOSIS_MISSING_ARTIFACT",
    );
  });

  it("blocks diagnosis-based routing on stale challenge hashes", () => {
    const diagnosis = mixedDiagnosis({
      artifacts: [artifact("openai-run", openAiSource, "stale-hash"), artifact("claude-run", claudeSource)],
    });

    expect(diagnosis.route).toBe("hold");
    expect(diagnosis.blockers.map((finding) => finding.code)).toContain(
      "PROVIDER_DELTA_DIAGNOSIS_STALE_HASH",
    );
  });

  it("validates evolution proposals and selects the provider failover probe", () => {
    const plan = planDeploymentAliasEvolution(mixedDiagnosis(), deploymentAliasEvolutionProposals());

    expect(plan.selectedProposalId).toBe("provider-failover-router-alias-drift-probe");
    expect(plan.findings).toEqual([]);
    for (const proposal of plan.proposals) {
      expect(proposal.whatStaysFixed.length).toBeGreaterThan(0);
      expect(proposal.whatChanges.length).toBeGreaterThan(0);
      expect(proposal.confirmSignal.length).toBeGreaterThan(0);
      expect(proposal.killSignal.length).toBeGreaterThan(0);
    }
  });

  it("rejects incomplete evolution proposals with the intended rule code", () => {
    const [first] = deploymentAliasEvolutionProposals();
    if (!first) {
      throw new Error("expected at least one deployment-alias evolution proposal");
    }
    const findings = validateDeploymentAliasEvolutionProposals([
      {
        ...first,
        expectedMutants: [],
        killSignal: "",
      },
    ]);

    expect(findings.map((finding) => finding.code)).toContain("PROVIDER_DELTA_EVOLUTION_PROPOSAL_INCOMPLETE");
  });

  it("renders diagnosis and evolution reports deterministically", () => {
    const diagnosis = mixedDiagnosis();
    const plan = planDeploymentAliasEvolution(diagnosis);
    const firstDiagnosis = renderDeploymentAliasProviderDeltaDiagnosisReport(diagnosis);
    const secondDiagnosis = renderDeploymentAliasProviderDeltaDiagnosisReport(diagnosis);
    const firstEvolution = renderDeploymentAliasEvolutionOptionsReport(plan);
    const secondEvolution = renderDeploymentAliasEvolutionOptionsReport(plan);

    expect(firstDiagnosis).toBe(secondDiagnosis);
    expect(firstEvolution).toBe(secondEvolution);
    expect(firstDiagnosis).toContain("Claude solving means this is not cross-lab difficulty evidence");
    expect(firstEvolution).toContain("provider-failover-router-alias-drift-probe");
  });

  it("renders executable probe evidence without claiming family or model evidence", async () => {
    const { EXECUTABLE_PROBES, runProbe } = await import("../src/foundry/probe-runner.js");
    const diagnosis = mixedDiagnosis();
    const plan = planDeploymentAliasEvolution(diagnosis, deploymentAliasEvolutionProposals());
    const probe = EXECUTABLE_PROBES.find(
      (definition) => definition.id === "provider-failover-router-alias-drift-probe",
    );
    if (probe === undefined) throw new Error("expected provider-failover probe");
    const report = renderDeploymentAliasEvolutionOptionsReport(plan, runProbe(probe));

    expect(report).toContain("executable local probe evidence");
    expect(report).toContain("| probe | `provider-failover-router-alias-drift-probe` |");
    expect(report).toContain("| verdict | `promote_to_task_shape` |");
    expect(report).toContain("not a built family, package, model trial, or production-matrix gate");
  });
});
