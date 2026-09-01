import type { ExternalIntakeValidationResult } from "../external-intake/types.js";
import {
  type ProviderDeltaComparison,
  type ProviderDeltaEvidence,
  evaluateProviderDelta,
  providerDeltaEvidenceFromTrialRecords,
} from "../foundry/provider-delta.js";
import type { TrialRecord } from "../trials/types.js";
import type { TrialDiagnosis } from "./diagnosis.js";

export interface DeploymentAliasProviderDeltaReportInput {
  readonly challengeHash: string;
  readonly scenarioSetId: string;
  readonly records: readonly TrialRecord[];
  readonly externalResults: readonly ExternalIntakeValidationResult[];
  readonly diagnoses: readonly TrialDiagnosis[];
}

export function deploymentAliasProviderDeltaComparison(
  input: DeploymentAliasProviderDeltaReportInput,
): ProviderDeltaComparison {
  const onTargetRunIds = new Set(
    input.diagnoses
      .filter((diagnosis) => diagnosis.matchesHypothesis && !diagnosis.repairSuspected)
      .map((diagnosis) => diagnosis.runId),
  );
  const trialEvidence = providerDeltaEvidenceFromTrialRecords(
    input.records,
    input.challengeHash,
    onTargetRunIds,
  );
  const trialRunIds = new Set(trialEvidence.map((evidence) => evidence.runId));
  const externalNoCountEvidence = input.externalResults.flatMap((result) => {
    const evidence = providerDeltaEvidenceFromExternalIntake(result, input.challengeHash);
    if (evidence === null || trialRunIds.has(evidence.runId)) return [];
    return [evidence];
  });
  return evaluateProviderDelta({
    familyId: "deployment-model-alias-rollout-drift",
    currentChallengeHash: input.challengeHash,
    evidence: [...trialEvidence, ...externalNoCountEvidence],
  });
}

export function renderDeploymentAliasProviderDeltaReport(
  input: DeploymentAliasProviderDeltaReportInput,
): string {
  const comparison = deploymentAliasProviderDeltaComparison(input);
  return [
    "# deployment-model-alias-rollout-drift provider delta",
    "",
    "Provider delta is the decision layer between one-provider smoke evidence and production matrix",
    "spend. It asks whether a deployment-alias failure transfers across provider families or looks",
    "provider-specific.",
    "",
    "## Verdict",
    "",
    `Verdict: **${comparison.verdict}**. Decision: **${comparison.decision}**.`,
    "",
    "| item | value |",
    "|---|---|",
    `| family | \`${comparison.familyId}\` |`,
    `| challenge hash | \`${input.challengeHash}\` |`,
    `| scenario set | \`${input.scenarioSetId}\` |`,
    `| counted OpenAI runs | ${comparison.countedOpenAiRuns.length} |`,
    `| counted non-OpenAI runs | ${comparison.countedNonOpenAiRuns.length} |`,
    `| counted provider families | ${comparison.countedProviderFamilies.map((family) => `\`${family}\``).join(", ") || "none"} |`,
    `| counted failure provider families | ${comparison.countedFailureProviderFamilies.map((family) => `\`${family}\``).join(", ") || "none"} |`,
    `| counted solve provider families | ${comparison.countedSolveProviderFamilies.map((family) => `\`${family}\``).join(", ") || "none"} |`,
    `| cross-lab smoke present | ${comparison.crossLabSmokePresent ? "yes" : "no"} |`,
    `| cross-lab difficulty evidenced | ${comparison.crossLabDifficultyEvidenced ? "yes" : "no"} |`,
    `| matrix candidate | ${comparison.matrixCandidate ? "yes" : "no"} |`,
    "",
    "## Current Reading",
    "",
    comparison.summary,
    "",
    `Next action: ${comparison.nextAction}`,
    "",
    "## Run Evidence",
    "",
    renderEvidenceTable([...comparison.countedOpenAiRuns, ...comparison.countedNonOpenAiRuns]),
    "",
    "## Preserved No-Count Non-OpenAI Attempts",
    "",
    comparison.uncountedNonOpenAiRuns.length === 0
      ? "No no-count non-OpenAI attempts are part of this provider-delta comparison."
      : renderEvidenceTable(comparison.uncountedNonOpenAiRuns),
    "",
    "## Blocking Rules",
    "",
    comparison.blockers.length === 0 ? "No provider-delta blockers." : renderFindings(comparison.blockers),
    "",
    "## Advisory Rules",
    "",
    comparison.advisories.length === 0
      ? "No provider-delta advisories."
      : renderFindings(comparison.advisories),
    "",
    "## Non-OpenAI Path",
    "",
    ...nonOpenAiPathLines(comparison),
    "",
    "## Conditional Decisions",
    "",
    "- If a current non-OpenAI smoke fails on target, deployment-alias becomes a production matrix candidate; the matrix still requires an explicit spend decision.",
    "- If a current non-OpenAI smoke passes cleanly, diagnose provider delta and evolve or repair before matrix spend.",
    "- If a non-OpenAI attempt is refused, infrastructure-failed, stale, contaminated or missing artifacts, preserve it and count nothing.",
    "- If OpenAI-only evidence remains for too long, one more OpenAI run can estimate same-provider stability but cannot satisfy cross-lab readiness.",
    "",
    "## Evidence Boundary",
    "",
    "- Mutant-detection axes are not real-agent difficulty axes.",
    "- One OpenAI smoke failure is OpenAI-only smoke difficulty, not cross-lab proof.",
    "- A counted non-OpenAI clean solve creates cross-lab smoke presence, not cross-lab difficulty.",
    "- Repeated same-provider trials estimate stability, not provider/lab breadth.",
    "- Provider-delta diagnosis is a routing decision; it is not a full `/6` matrix.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
}

function providerDeltaEvidenceFromExternalIntake(
  result: ExternalIntakeValidationResult,
  currentChallengeHash: string,
): ProviderDeltaEvidence | null {
  if (result.countable) return null;
  const metadata = result.packet.metadata;
  if (metadata === null) return null;
  const runId = metadata?.runId;
  if (runId === null || runId === undefined) return null;
  const status =
    result.status === "provider_refusal"
      ? "provider_refusal"
      : result.status === "infrastructure_error"
        ? "infrastructure_error"
        : result.status === "timeout"
          ? "timeout"
          : result.status === "stale_hash"
            ? "stale_hash"
            : result.status === "completed" && result.countable
              ? "counted_solve"
              : "invalid";
  return {
    runId,
    providerFamily: metadata.providerFamily ?? "unknown",
    model: metadata.model,
    status,
    scenariosGraded: 0,
    scenariosFailed: 0,
    failedChecks: [],
    onTarget: null,
    challengeHash: metadata.challengeHash,
    currentChallengeHash,
    countabilityReason: result.countabilityReason,
  };
}

function renderEvidenceTable(evidence: readonly ProviderDeltaEvidence[]): string {
  if (evidence.length === 0) return "No run evidence in this bucket.";
  return [
    "| run | provider family | model | status | graded | failed | on target | reason |",
    "|---|---|---|---|---:|---:|---|---|",
    ...evidence
      .slice()
      .sort((a, b) => a.runId.localeCompare(b.runId))
      .map(
        (item) =>
          `| \`${item.runId}\` | \`${item.providerFamily}\` | \`${item.model ?? "unknown"}\` | \`${item.status}\` | ${item.scenariosGraded} | ${item.scenariosFailed} | ${item.onTarget === null ? "n/a" : item.onTarget ? "yes" : "no"} | ${item.countabilityReason} |`,
      ),
  ].join("\n");
}

function renderFindings(findings: readonly { readonly code: string; readonly detail: string }[]): string {
  return [
    "| code | detail |",
    "|---|---|",
    ...findings.map((finding) => `| \`${finding.code}\` | ${finding.detail} |`),
  ].join("\n");
}

function nonOpenAiPathLines(comparison: ProviderDeltaComparison): readonly string[] {
  const commandLines = [
    "Use these paths when a future non-OpenAI packet needs to be prepared or imported:",
    "",
    "- Prepare Claude packet: `node dist/cli.js external packet --family deployment-model-alias-rollout-drift --provider claude --out bundles/deployment-model-alias-rollout-drift-claude`",
    "- Validate returned packet: `node dist/cli.js external validate <returned-packet>`",
    "- Import returned packet: `node dist/cli.js external import <returned-packet>`",
    "- Re-grade preserved trial: `node dist/cli.js trials verify --family deployment-model-alias-rollout-drift <run-id>`",
  ];
  if (comparison.countedNonOpenAiRuns.length === 0) {
    return ["No current counted non-OpenAI smoke is available in this comparison.", "", ...commandLines];
  }
  return [
    `Current counted non-OpenAI smoke run(s): ${comparison.countedNonOpenAiRuns.map((run) => `\`${run.runId}\``).join(", ")}.`,
    "No Claude/Anthropic command was run to produce this report; it reads preserved repo artifacts only.",
    "",
    ...commandLines,
  ];
}
