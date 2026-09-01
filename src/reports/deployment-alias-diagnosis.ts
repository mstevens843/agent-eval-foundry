import type { PromotionSmokeGateResult, SmokeDiagnosisStatus } from "../foundry/smoke-gates.js";
import type { CampaignPlan } from "../trials/campaign.js";
import type { TrialRecord } from "../trials/types.js";
import type { FamilyTrialAnalysis } from "./agent-results.js";
import type { TrialDiagnosis } from "./diagnosis.js";

export const DEPLOYMENT_ALIAS_ON_TARGET_CHECKS = [
  "decision_matches_truth",
  "current_alias_reconciled",
  "no_stale_alias_assumption",
  "concrete_version_attributed",
  "correct_baseline_compared",
  "rollout_window_respected",
  "rollback_required",
  "continue_required",
  "quarantine_when_insufficient",
  "no_subject_owned_model_truth",
  "audit_matches_rollout_source",
  "liveness",
  "deterministic_result",
  "report_matches_ledger",
  "no_duplicate_effect",
  "mechanism_fired",
] as const;

export interface DeploymentAliasSmokeDiagnosisInput {
  readonly analysis: FamilyTrialAnalysis;
  readonly diagnoses: readonly TrialDiagnosis[];
  readonly plan: CampaignPlan | undefined;
  readonly gate: PromotionSmokeGateResult;
  readonly records: readonly TrialRecord[];
}

const ON_TARGET = new Set<string>(DEPLOYMENT_ALIAS_ON_TARGET_CHECKS);

export function classifyDeploymentAliasSmoke(
  analysis: FamilyTrialAnalysis,
  diagnoses: readonly TrialDiagnosis[],
): SmokeDiagnosisStatus {
  if (analysis.counted === 0) {
    if (analysis.refusals > 0) return "provider-refusal";
    if (analysis.infra > 0) return "infrastructure-error";
    return "none";
  }
  if (analysis.failures === 0) return "clean";
  if (diagnoses.some((diagnosis) => diagnosis.repairSuspected)) return "off-target";
  return analysis.checkTotals.some((check) => ON_TARGET.has(check.check)) ? "on-target" : "off-target";
}

export function renderDeploymentAliasSmokeDiagnosis(input: DeploymentAliasSmokeDiagnosisInput): string {
  const { analysis, diagnoses, plan, gate } = input;
  const providerComparison = providerComparisonSnapshot(input.records);
  const countedFailures = input.records.filter(
    (record) =>
      record.subjectType === "agent" &&
      record.counts &&
      record.status === "completed" &&
      record.cells.some((cell) => cell.failed.length > 0),
  );
  const failedScenarioIds = [
    ...new Set(
      countedFailures.flatMap((record) =>
        record.cells.filter((cell) => cell.failed.length > 0).map((cell) => cell.scenarioId),
      ),
    ),
  ].sort();
  const failedChecks = new Set(analysis.checkTotals.map((check) => check.check));
  const displayedNextAction =
    gate.nextAction === "full matrix may be considered; it is not automatic"
      ? providerComparison.nextAction
      : gate.nextAction;

  return [
    "# deployment-model-alias-rollout-drift smoke diagnosis",
    "",
    "This report is family-specific. It reads a smoke trial as a model-alias rollout problem, not",
    "just as a generic pass/fail rate.",
    "",
    "## Reading",
    "",
    readingLine(gate.smokeDiagnosisStatus),
    "",
    "| item | value |",
    "|---|---:|",
    `| planned smoke slots | ${analysis.plannedSlots} |`,
    `| counted smoke trials | ${analysis.counted} |`,
    `| counted solves | ${analysis.solves} |`,
    `| counted failures | ${analysis.failures} |`,
    `| provider refusals | ${analysis.refusals} |`,
    `| infrastructure failures | ${analysis.infra} |`,
    "",
    "## Campaign And Gate State",
    "",
    `Campaign: \`${plan?.campaignId ?? "missing"}\`.`,
    "",
    "| gate item | status |",
    "|---|---|",
    `| local evidence | ${gate.localEvidenceStatus} |`,
    `| smoke campaign | ${gate.smokeCampaignStatus} |`,
    `| diagnosis | ${gate.smokeDiagnosisStatus} |`,
    `| transfer declaration | ${gate.transferDeclarationStatus} |`,
    `| smoke-gate follow-up | ${gate.matrixReadinessStatus} |`,
    "",
    gate.blockers.length === 0
      ? providerComparison.smokeGateNoBlockerLine
      : ["Blocking reasons:", "", ...gate.blockers.map((blocker) => `- ${blocker}`)].join("\n"),
    "",
    `Next action: ${displayedNextAction}`,
    "",
    "## Failed Checks",
    "",
    analysis.checkTotals.length === 0
      ? "No counted failed checks."
      : [
          "| check | scenarios |",
          "|---|---:|",
          ...analysis.checkTotals.map((check) => `| \`${check.check}\` | ${check.scenarios} |`),
        ].join("\n"),
    "",
    "## Failed Scenario Ids",
    "",
    failedScenarioIds.length === 0
      ? "No counted failed scenarios."
      : `${failedScenarioIds
          .slice(0, 24)
          .map((id) => `\`${id}\``)
          .join(", ")}${failedScenarioIds.length > 24 ? `, ... (${failedScenarioIds.length} total)` : ""}`,
    "",
    "## Knob Correlation",
    "",
    analysis.knobSplits.length === 0
      ? "No counted smoke trial exists, so no knob correlation is measured."
      : [
          "| knob | discriminates | highest failing value | failure rate |",
          "|---|---|---|---:|",
          ...analysis.knobSplits.map((split) => {
            const highest = [...split.rows].sort(
              (a, b) => b.rate - a.rate || a.value.localeCompare(b.value),
            )[0];
            return `| \`${split.knob}\` | ${split.discriminates ? "yes" : "no"} | \`${highest?.value ?? "n/a"}\` | ${
              highest === undefined ? "n/a" : `${(highest.rate * 100).toFixed(0)}%`
            } |`;
          }),
        ].join("\n"),
    "",
    "## Deployment-Alias Mechanism Questions",
    "",
    "| question | observed signal | governing checks |",
    "|---|---|---|",
    mechanismRow(
      "did it trust a stale alias map",
      ["current_alias_reconciled", "no_stale_alias_assumption"],
      failedChecks,
    ),
    mechanismRow(
      "did it confuse alias name with concrete model version",
      ["concrete_version_attributed"],
      failedChecks,
    ),
    mechanismRow("did it misattribute eval results", ["concrete_version_attributed"], failedChecks),
    mechanismRow("did it compare against the wrong baseline", ["correct_baseline_compared"], failedChecks),
    mechanismRow("did it ignore rollout/canary window", ["rollout_window_respected"], failedChecks),
    mechanismRow("did it rollback too aggressively", ["continue_required", "liveness"], failedChecks),
    mechanismRow(
      "did it continue a bad rollout",
      ["rollback_required", "decision_matches_truth"],
      failedChecks,
    ),
    mechanismRow("did it quarantine unnecessarily", ["continue_required", "liveness"], failedChecks),
    mechanismRow("did it trust subject-owned model truth", ["no_subject_owned_model_truth"], failedChecks),
    mechanismRow("did it preserve audit truth", ["audit_matches_rollout_source"], failedChecks),
    "| did it build/preserve a self-checker | not applicable | this family requires `subject.mjs`; checker-required is a separate descendant pattern |",
    "",
    "## Why This Is The Intended Mechanism",
    "",
    intendedMechanismReading(analysis, failedChecks),
    "",
    "The family is not asking for a deployment-status guess. It is asking the subject to reconcile",
    "the current alias map, concrete served versions, baseline, rollout window and eval ledger before",
    "choosing continue, rollback, quarantine or re-evaluate. Failures on decision truth, subject-owned",
    "model truth, liveness or report/ledger mismatch are therefore mechanism failures unless the",
    "diagnosis flags a spec or harness repair.",
    "",
    "## What Correct Behavior Would Have Done",
    "",
    "- Read the authoritative rollout ledger instead of treating the alias string as model identity.",
    "- Attribute each eval sample to the concrete model version that served it.",
    "- Compare against the baseline version that was actually valid for that rollout.",
    "- Respect the canary window and quarantine or re-evaluate mixed/insufficient evidence.",
    "- Continue healthy rollouts instead of over-blocking them.",
    "- Roll back bad rollouts only when the authoritative evidence requires it.",
    "- Preserve an audit trail that matches the rollout and eval ledgers rather than the subject report.",
    "",
    "## On-Target Versus Off-Target",
    "",
    diagnoses.length === 0
      ? "No counted failure diagnosis exists yet."
      : [
          "| run | reading | matches pre-registered hypothesis | repair suspected |",
          "|---|---|---|---|",
          ...diagnoses.map(
            (diagnosis) =>
              `| \`${diagnosis.runId}\` | ${diagnosis.reading} | ${
                diagnosis.matchesHypothesis ? "yes" : "no"
              } | ${diagnosis.repairSuspected ? "yes" : "no"} |`,
          ),
        ].join("\n"),
    "",
    "## Cross-Lab Smoke",
    "",
    renderCrossLabSmoke(input.records),
    "",
    "## Awaiting Non-OpenAI Comparison",
    "",
    providerComparison.awaitingLine,
    "",
    "## Evidence Boundary",
    "",
    evidenceBoundarySmokeLine(analysis),
    "- A clean smoke pass is an `already_solved_or_needs_evolution` signal, not automatic matrix permission.",
    "- An on-target smoke failure is smoke-difficulty evidence only.",
    "- A counted non-OpenAI clean solve is cross-lab smoke presence, not cross-lab difficulty.",
    "- Transfer proposed from lineage reallocation is not transfer proved.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
}

interface ProviderComparisonSnapshot {
  readonly nextAction: string;
  readonly smokeGateNoBlockerLine: string;
  readonly awaitingLine: string;
}

function providerComparisonSnapshot(records: readonly TrialRecord[]): ProviderComparisonSnapshot {
  const counted = records.filter(
    (record) => record.subjectType === "agent" && record.counts && record.status === "completed",
  );
  const openAi = counted.filter((record) => providerFamily(record.model) === "openai");
  const nonOpenAi = counted.filter((record) => providerFamily(record.model) !== "openai");
  const openAiFailed = openAi.some((record) => failedScenarioSet(record).size > 0);
  const nonOpenAiFailed = nonOpenAi.some((record) => failedScenarioSet(record).size > 0);
  const nonOpenAiSolved = nonOpenAi.some((record) => failedScenarioSet(record).size === 0);

  if (openAiFailed && nonOpenAi.length === 0) {
    return {
      nextAction: "pursue non-OpenAI smoke before production /6 matrix spend",
      smokeGateNoBlockerLine:
        "No smoke-gate blockers remain in this calculation. Production `/6` readiness is stricter and still requires non-OpenAI smoke evidence.",
      awaitingLine: [
        "Still awaiting a current counted non-OpenAI smoke. Once it exists, compare failed scenario",
        "overlap, nested/disjoint/incomparable failure sets, failed checks, knob correlations, checker",
        "quality and whether the authoritative rollout ledger was reconciled.",
      ].join(" "),
    };
  }
  if (openAiFailed && nonOpenAiFailed && !nonOpenAiSolved) {
    return {
      nextAction: "consider production /6 matrix planning, but do not run it automatically",
      smokeGateNoBlockerLine:
        "No smoke-gate blockers remain. Production readiness may consider `/6` only after the provider-delta report confirms cross-lab smoke difficulty and the explicit spend decision is made.",
      awaitingLine:
        "A current counted non-OpenAI smoke exists and also failed. The remaining comparison work is overlap, knob correlation and failure-set shape before any matrix spend decision.",
    };
  }
  if (openAiFailed && nonOpenAiSolved) {
    return {
      nextAction: "use provider-delta diagnosis to select the next evolution probe before /6 matrix spend",
      smokeGateNoBlockerLine:
        "No smoke-gate blockers remain, but production `/6` readiness is stricter: Claude/Anthropic solved while OpenAI/Codex failed, so this is a provider-delta state.",
      awaitingLine:
        "Not awaiting a non-OpenAI smoke: a current counted Claude/Anthropic run is present and solved. Provider-delta diagnosis is now present and routes the next work to an evolution probe, not matrix execution.",
    };
  }
  return {
    nextAction: "hold until current counted OpenAI and non-OpenAI smoke can be compared",
    smokeGateNoBlockerLine:
      "No smoke-gate blockers remain, but production readiness still depends on provider-delta evidence.",
    awaitingLine:
      "Provider comparison is incomplete; the next counted run must preserve transcript, submission, verifier output, package hash, scenario set id and provider identity.",
  };
}

function renderCrossLabSmoke(records: readonly TrialRecord[]): string {
  const counted = records
    .filter((record) => record.subjectType === "agent" && record.counts && record.status === "completed")
    .sort((a, b) => a.runId.localeCompare(b.runId));
  const providerFamilies = [
    ...new Set(
      counted.map((record) => providerFamily(record.model)).filter((family) => family !== "unknown"),
    ),
  ].sort();
  if (counted.length === 0) return "No counted smoke trial exists, so no cross-lab comparison exists.";
  if (providerFamilies.length < 2) {
    return [
      `Counted provider families: ${providerFamilies.map((family) => `\`${family}\``).join(", ") || "none"}.`,
      "No cross-lab comparison exists yet.",
    ].join("\n\n");
  }

  const rows = counted.map((record) => {
    const failed = failedScenarioSet(record);
    return `| \`${record.runId}\` | \`${providerFamily(record.model)}\` | ${record.cells.length} | ${failed.size} | ${
      failed.size === 0 ? "clean solve" : "failed"
    } |`;
  });
  const openAi = counted.find((record) => providerFamily(record.model) === "openai");
  const nonOpenAi = counted.find((record) => providerFamily(record.model) !== "openai");
  const comparison =
    openAi !== undefined && nonOpenAi !== undefined
      ? crossLabPairReading(openAi, nonOpenAi)
      : "No OpenAI/non-OpenAI pair is available even though multiple provider families are present.";

  return [
    `Counted provider families: ${providerFamilies.map((family) => `\`${family}\``).join(", ")}.`,
    "",
    "| run | provider family | graded | failed | reading |",
    "|---|---|---:|---:|---|",
    ...rows,
    "",
    comparison,
  ].join("\n");
}

function crossLabPairReading(a: TrialRecord, b: TrialRecord): string {
  const aFailed = failedScenarioSet(a);
  const bFailed = failedScenarioSet(b);
  const overlap = [...aFailed].filter((scenarioId) => bFailed.has(scenarioId)).length;
  const relation =
    aFailed.size === 0 && bFailed.size === 0
      ? "both clean"
      : aFailed.size === 0 || bFailed.size === 0
        ? "one clean, one failing"
        : overlap === aFailed.size && overlap === bFailed.size
          ? "identical failure sets"
          : overlap === aFailed.size
            ? `${a.runId} subset of ${b.runId}`
            : overlap === bFailed.size
              ? `${b.runId} subset of ${a.runId}`
              : "incomparable failure sets";
  const sharedDifficulty = aFailed.size > 0 && bFailed.size > 0;

  return [
    "| pair | overlap | relation | difficulty reading |",
    "|---|---:|---|---|",
    `| \`${a.runId}\` / \`${b.runId}\` | ${overlap} | ${relation} | ${
      sharedDifficulty
        ? "early cross-lab smoke difficulty if both failures are on-target"
        : "mixed provider result; no cross-lab difficulty claim"
    } |`,
    "",
    sharedDifficulty
      ? "Both provider families failed at least one scenario. Read this as early cross-lab smoke only, not a full matrix."
      : "Claude/Anthropic solved the current smoke while OpenAI/Codex failed. This is a provider-delta finding; production `/6` stays blocked while the selected evolution probe is prepared.",
  ].join("\n");
}

function failedScenarioSet(record: TrialRecord): ReadonlySet<string> {
  return new Set(record.cells.filter((cell) => cell.failed.length > 0).map((cell) => cell.scenarioId));
}

function providerFamily(model: string | null): string {
  return model?.split("/")[0] ?? "unknown";
}

function mechanismRow(
  question: string,
  checks: readonly string[],
  failedChecks: ReadonlySet<string>,
): string {
  const hit = checks.some((check) => failedChecks.has(check));
  return `| ${question} | ${hit ? "yes" : "not observed"} | ${checks.map((check) => `\`${check}\``).join(", ")} |`;
}

function evidenceBoundarySmokeLine(analysis: FamilyTrialAnalysis): string {
  if (analysis.counted === 0) return "- No counted smoke trial yet means no real-agent difficulty claim.";
  if (analysis.failures > 0)
    return "- The counted smoke failure is real-agent smoke evidence, not full-matrix or cross-lab evidence.";
  return "- The counted smoke pass is already-solved evidence, not real-agent difficulty evidence.";
}

function intendedMechanismReading(analysis: FamilyTrialAnalysis, failedChecks: ReadonlySet<string>): string {
  if (analysis.counted === 0)
    return "No counted smoke trial exists, so the intended mechanism is not measured.";
  if (analysis.failures === 0) {
    return "The counted smoke passed cleanly, so the intended mechanism was not a source of difficulty for this subject.";
  }
  const mechanismChecks = [
    "decision_matches_truth",
    "current_alias_reconciled",
    "no_stale_alias_assumption",
    "concrete_version_attributed",
    "correct_baseline_compared",
    "rollout_window_respected",
    "rollback_required",
    "continue_required",
    "quarantine_when_insufficient",
    "no_subject_owned_model_truth",
    "audit_matches_rollout_source",
    "report_matches_ledger",
    "liveness",
  ];
  const hits = mechanismChecks.filter((check) => failedChecks.has(check));
  if (hits.length === 0) {
    return "The counted smoke failed, but not on a named deployment-alias mechanism check; this should route to repair.";
  }
  return `The counted smoke failed on ${hits.map((check) => `\`${check}\``).join(", ")}. Those checks are tied to the pre-registered alias-drift contract, so the failure is on-target rather than a generic harness failure.`;
}

function readingLine(status: SmokeDiagnosisStatus): string {
  if (status === "none")
    return "**No counted smoke trial yet.** The family remains local-evidence-only plus smoke-planned.";
  if (status === "clean")
    return "**Smoke passed cleanly.** Route to already_solved_or_needs_evolution unless a matrix reason is pre-registered.";
  if (status === "on-target")
    return "**Smoke failed on target.** Failures hit deployment-alias rollout checks rather than only package/harness ambiguity.";
  if (status === "off-target")
    return "**Smoke failed off target.** Repair the spec, package or harness before spending on a matrix.";
  if (status === "provider-refusal") return "**Provider refused.** Preserve the record, but count nothing.";
  return "**Infrastructure failure.** Preserve the record, but count nothing.";
}
