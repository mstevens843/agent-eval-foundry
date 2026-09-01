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
      ? "pursue non-OpenAI smoke before production /6 matrix spend"
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
      ? "No smoke-gate blockers remain in this calculation. Production `/6` readiness is stricter and still requires non-OpenAI smoke evidence."
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
    "## Evidence Boundary",
    "",
    evidenceBoundarySmokeLine(analysis),
    "- A clean smoke pass is an `already_solved_or_needs_evolution` signal, not automatic matrix permission.",
    "- An on-target smoke failure is smoke-difficulty evidence only.",
    "- One OpenAI/Codex smoke is not cross-lab evidence.",
    "- Transfer proposed from lineage reallocation is not transfer proved.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
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
