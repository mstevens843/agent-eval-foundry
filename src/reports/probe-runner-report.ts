import type { DiscoveryCandidate, DiscoveryTaskShapeDraft } from "../foundry/discovery-workbench.js";
import type { ProbeDefinition, ProbeResult, ProbeRunSummary } from "../foundry/probe-types.js";

const esc = (s: string): string => s.replace(/\|/g, "\\|");
const money = (n: number): string => `$${n.toFixed(0)}`;

function verdictBucket(verdict: ProbeResult["verdict"]): string {
  if (verdict === "promote_to_task_shape") return "promote now";
  if (verdict === "evolve_existing") return "evolve existing";
  if (verdict === "transfer_existing") return "transfer first";
  if (verdict === "needs_repair") return "repair first";
  if (verdict === "hold_needs_transfer") return "hold";
  return "kill";
}

export function renderProbeRun(summary: ProbeRunSummary): string {
  return [
    "mechanism probe run",
    "probe | candidate | verdict | scenarios | bad caught | checks",
    ...summary.probes.map(
      (probe) =>
        `${probe.probeId} | ${probe.candidateId} | ${probe.verdict} | ${probe.scenarioCount} | ${probe.badSubjectsCaught}/${probe.badSubjectsTotal} | ${probe.distinctFailedChecks.join(", ")}`,
    ),
    "",
    "Probe evidence is executable local evidence, not full-family evidence and not real-agent difficulty.",
    "",
  ].join("\n");
}

export function renderProbeNext(summary: ProbeRunSummary): string {
  return [
    "mechanism probe next actions",
    "probe | candidate | verdict | cheapest next step | reason",
    ...summary.probes.map(
      (probe) =>
        `${probe.probeId} | ${probe.candidateId} | ${probe.verdict} | ${probe.cheapestNextStep} | ${probe.promotionReason}`,
    ),
    "",
  ].join("\n");
}

export function renderProbeScaffoldSummary(draft: DiscoveryTaskShapeDraft): string {
  return [
    `family     ${draft.familyId}`,
    `candidate  ${draft.sourceCandidateId}`,
    `rules      ${draft.visibleRulesDraft.length}`,
    `knobs      ${draft.knobs.length}`,
    `mutants    ${draft.expectedMutants.length}`,
    `transfers  ${draft.transferLinks.length}`,
    "",
  ].join("\n");
}

export function renderMechanismProbeReport(
  summary: ProbeRunSummary,
  definitions: readonly ProbeDefinition[],
  candidates: readonly DiscoveryCandidate[],
): string {
  const byCandidate = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const byProbe = new Map(definitions.map((definition) => [definition.id, definition]));
  const ranked = [...summary.probes].sort(
    (a, b) =>
      bucketRank(verdictBucket(a.verdict)) - bucketRank(verdictBucket(b.verdict)) ||
      b.distinctFailedChecks.length - a.distinctFailedChecks.length ||
      a.probeId.localeCompare(b.probeId),
  );
  return [
    "# Mechanism Probe Runner v1",
    "",
    "Mechanism probes are cheap executable screens between a discovery score and a full task-family",
    "build. They run tiny deterministic scenarios against reference-like and known-bad probe subjects.",
    "",
    "Probe evidence is not a challenge package, not model difficulty evidence, and not a ship claim.",
    "It decides whether the next engineering hour should build a task shape, repair the idea, transfer",
    "the mechanism, evolve an existing family, hold, or kill cheaply.",
    "",
    "## Summary",
    "",
    "| item | value |",
    "|---|---:|",
    `| probes run | ${summary.probes.length} |`,
    `| scenarios run | ${summary.totalScenarios} |`,
    `| bad/baseline subjects caught | ${summary.totalBadSubjectsCaught}/${summary.totalBadSubjects} |`,
    `| promoted/evolve/transfer | ${summary.promoted.length} |`,
    `| needs repair | ${summary.needsRepair.length} |`,
    `| held | ${summary.held.length} |`,
    `| killed | ${summary.killed.length} |`,
    `| promoted probe engineering hours | ${summary.expectedBuildHoursForPromoted} |`,
    `| direct model spend | ${money(summary.expectedProbeUsd)} |`,
    "",
    "## Ranked Probe Queue",
    "",
    "| bucket | probe | candidate | domain | mechanism | scenarios | bad subjects | distinct checks | cheapest next | full family justified |",
    "|---|---|---|---|---|---:|---:|---:|---|---|",
    ...ranked.map((probe) => {
      const definition = byProbe.get(probe.probeId);
      return `| ${verdictBucket(probe.verdict)} | \`${probe.probeId}\` | \`${probe.candidateId}\` | ${esc(probe.domain)} | \`${probe.mechanismId}\` | ${probe.scenarioCount} | ${probe.badSubjectsCaught}/${probe.badSubjectsTotal} | ${probe.distinctFailedChecks.length} | ${probe.cheapestNextStep} | ${probe.verdict === "promote_to_task_shape" || probe.verdict === "evolve_existing" || probe.verdict === "transfer_existing" ? "yes" : "no"} |`;
    }),
    "",
    "## Probe Details",
    "",
    ...ranked.flatMap((probe) => {
      const definition = byProbe.get(probe.probeId);
      const candidate = byCandidate.get(probe.candidateId);
      return [
        `### ${probe.probeId}`,
        "",
        `Candidate: \`${probe.candidateId}\`${candidate === undefined ? "" : ` - ${candidate.title}`}`,
        "",
        `Verdict: **${probe.verdict}** (${verdictBucket(probe.verdict)}).`,
        "",
        `Reason: ${probe.promotionReason}`,
        "",
        `Hypothesis: ${definition?.hypothesis ?? "unknown"}`,
        "",
        `Authoritative truth source: ${definition?.authoritativeTruthSource.name ?? "unknown"}`,
        "",
        "| subject | kind | caught intended checks | failed checks |",
        "|---|---|---|---|",
        ...probe.subjectResults.map(
          (subject) =>
            `| \`${subject.subjectId}\` | ${subject.kind} | ${subject.caughtByIntendedChecks ? "yes" : "NO"} | ${subject.failedChecks.length === 0 ? "none" : subject.failedChecks.map((check) => `\`${check}\``).join(", ")} |`,
        ),
        "",
        `Transfer targets: ${probe.transferTargets.length === 0 ? "none" : probe.transferTargets.join(", ")}`,
        "",
        `Estimated cost: ${probe.estimatedCost.engineerHours} engineer-hour(s), ${money(probe.estimatedCost.usd)}, first evidence ${probe.estimatedCost.evidence}.`,
        "",
      ];
    }),
    "## Evidence Rules",
    "",
    "- A passing reference-like probe proves only mechanical viability of the tiny probe.",
    "- Caught known-bad probe subjects are baseline/mutant evidence, not real-agent difficulty.",
    "- Probe success earns a task-shape build; it does not earn SHIP.",
    "- Probe failure is a cheap repair/kill signal before full-family spend.",
    "- Higher discovery score cannot outrank lower-score candidates with better executable probe evidence.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
}

function bucketRank(bucket: string): number {
  return (
    {
      "promote now": 0,
      "evolve existing": 1,
      "transfer first": 2,
      "repair first": 3,
      hold: 4,
      kill: 5,
    } as const
  )[bucket as "promote now" | "evolve existing" | "transfer first" | "repair first" | "hold" | "kill"];
}
