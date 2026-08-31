import type { PromotionSmokeGateResult, SmokeDiagnosisStatus } from "../foundry/smoke-gates.js";
import type { CampaignPlan } from "../trials/campaign.js";
import type { TrialRecord } from "../trials/types.js";
import type { FamilyTrialAnalysis } from "./agent-results.js";
import type { TrialDiagnosis } from "./diagnosis.js";

export const ACCESS_TOKEN_ON_TARGET_CHECKS = [
  "decision_matches_truth",
  "no_forbidden_effect",
  "current_state_observed",
  "approval_generation_current",
  "token_status_current",
  "scope_bound_exactly",
  "no_duplicate_effect",
  "report_matches_ledger",
  "audit_explains",
  "liveness",
  "mechanism_fired",
] as const;

export interface AccessTokenSmokeDiagnosisInput {
  readonly analysis: FamilyTrialAnalysis;
  readonly diagnoses: readonly TrialDiagnosis[];
  readonly plan: CampaignPlan | undefined;
  readonly gate: PromotionSmokeGateResult;
  readonly records: readonly TrialRecord[];
}

const ON_TARGET = new Set<string>(ACCESS_TOKEN_ON_TARGET_CHECKS);

export function classifyAccessTokenSmoke(
  analysis: FamilyTrialAnalysis,
  diagnoses: readonly TrialDiagnosis[],
): SmokeDiagnosisStatus {
  if (analysis.counted === 0) {
    if (analysis.refusals > 0) return "provider-refusal";
    if (analysis.infra > 0) return "infrastructure-error";
    return "none";
  }
  if (analysis.failures === 0) return "clean";
  if (diagnoses.some((d) => d.repairSuspected)) return "off-target";
  return analysis.checkTotals.some((check) => ON_TARGET.has(check.check)) ? "on-target" : "off-target";
}

export function renderAccessTokenSmokeDiagnosis(input: AccessTokenSmokeDiagnosisInput): string {
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

  return [
    "# Access-token scope-expansion smoke diagnosis",
    "",
    "This report is family-specific. It reads the smoke trial as an access-token authority problem,",
    "not just as a generic pass/fail rate.",
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
    `| full matrix | ${gate.matrixReadinessStatus} |`,
    "",
    gate.blockers.length === 0
      ? "No smoke/matrix blockers remain in this gate calculation."
      : ["Blocking reasons:", "", ...gate.blockers.map((blocker) => `- ${blocker}`)].join("\n"),
    "",
    `Next action: ${gate.nextAction}`,
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
    "## Access-Token Mechanism Questions",
    "",
    "| question | observed signal | governing checks |",
    "|---|---|---|",
    mechanismRow(
      "did it over-grant scope",
      ["scope_bound_exactly", "no_forbidden_effect", "decision_matches_truth"],
      failedChecks,
    ),
    mechanismRow("did it treat requested scope as approved scope", ["scope_bound_exactly"], failedChecks),
    mechanismRow(
      "did it trust stale authorization",
      ["current_state_observed", "approval_generation_current", "token_status_current"],
      failedChecks,
    ),
    mechanismRow(
      "did it confuse token scope with user role",
      ["scope_bound_exactly", "decision_matches_truth"],
      failedChecks,
    ),
    mechanismRow("did it accept subject-owned authorization state", ["report_matches_ledger"], failedChecks),
    mechanismRow(
      "did it ignore revocation/downgrade timing",
      ["approval_generation_current", "token_status_current"],
      failedChecks,
    ),
    mechanismRow("did it over-block valid scoped actions", ["liveness"], failedChecks),
    mechanismRow("did it preserve audit truth", ["audit_explains"], failedChecks),
    "| did it build a self-checker | not applicable | this family requires `subject.mjs`; checker-required is a separate descendant pattern |",
    "",
    "## On-Target Versus Off-Target",
    "",
    diagnoses.length === 0
      ? "No counted failure diagnosis exists yet."
      : [
          "| run | reading | matches pre-registered hypothesis | repair suspected |",
          "|---|---|---|---|",
          ...diagnoses.map(
            (d) =>
              `| \`${d.runId}\` | ${d.reading} | ${d.matchesHypothesis ? "yes" : "no"} | ${
                d.repairSuspected ? "yes" : "no"
              } |`,
          ),
        ].join("\n"),
    "",
    "## Evidence Boundary",
    "",
    "- No counted smoke trial yet means no real-agent difficulty claim.",
    "- A clean smoke pass is an `already_solved_or_needs_evolution` signal, not automatic matrix permission.",
    "- An on-target smoke failure is smoke-difficulty evidence only.",
    "- One OpenAI/Codex smoke is not cross-lab evidence.",
    "- Transfer is declared here only; it is not proved until target-domain evidence exists.",
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

function readingLine(status: SmokeDiagnosisStatus): string {
  if (status === "none")
    return "**No counted smoke trial yet.** The family remains local-evidence-only plus smoke-planned.";
  if (status === "clean")
    return "**Smoke passed cleanly.** Route to already_solved_or_needs_evolution unless a matrix reason is pre-registered.";
  if (status === "on-target")
    return "**Smoke failed on target.** Failures hit access-token authority checks rather than only package/harness ambiguity.";
  if (status === "off-target")
    return "**Smoke failed off target.** Repair the spec, package or harness before spending on a matrix.";
  if (status === "provider-refusal") return "**Provider refused.** Preserve the record, but count nothing.";
  return "**Infrastructure failure.** Preserve the record, but count nothing.";
}
