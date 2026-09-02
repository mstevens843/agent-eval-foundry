import type {
  FamilyLineage,
  LineageEvaluation,
  LineageNodeEvaluation,
  LineageScoringFeedbackRule,
  PortfolioFeedbackApplication,
  PortfolioReallocation,
} from "../foundry/lineage.js";

const esc = (s: string): string => s.replace(/\|/g, "\\|");
const money = (n: number): string => `$${n.toFixed(2)}`;

function nodeRow(node: LineageNodeEvaluation): string {
  const informative =
    node.evidenceWithdrawn !== null ? "withdrawn" : node.informativeSmokeEvidence ? "yes" : "no";
  return `| \`${node.familyId}\` | ${node.localEvidenceStatus} | ${node.smokeStatus} | ${informative} | ${node.countedSmokeTrials} | ${node.countedSmokeSolves} | ${node.countedSmokeFailures} | ${node.providerFamilies.join(", ") || "none"} | ${node.scenarioCount ?? "n/a"} | ${node.mutantAxes ?? "n/a"} | ${node.fullMatrixBlocked ? "blocked" : "not blocked"} | ${node.stale ? "stale" : "current"} |`;
}

function withdrawalBlock(node: LineageNodeEvaluation): readonly string[] {
  const w = node.evidenceWithdrawn;
  if (w === null) return [];
  return [
    `**\`${node.familyId}\` — evidence withdrawn (\`${w.reason}\`).**`,
    "",
    `Withdrawn runs (superseded; they no longer count and are not quotable as evidence): ${w.withdrawnRunIds.map((r) => `\`${r}\``).join(", ")}. Graded against \`${w.gradedAgainstHash ?? "unknown"}\`; the family now produces \`${w.currentHash ?? "unknown"}\`${w.declaredMigrationDate === null ? "" : ` (migration declared ${w.declaredMigrationDate})`}.`,
    "",
    w.explanation,
    "",
    w.matrixSpendStillOwed
      ? "The full matrix this node skipped is **deferred, not avoided**: it is still owed once the family is re-measured."
      : "No matrix spend is owed for this node.",
    "",
  ];
}

function withdrawnRuleRow(rule: LineageScoringFeedbackRule): string {
  return `| \`${rule.id}\` | ${rule.kind} | ${rule.target} \`${rule.selector}\` | ${rule.adjustment > 0 ? "+" : ""}${rule.adjustment.toFixed(1)} | ${esc(rule.reason)} | ${esc(rule.withdrawnReason ?? "")} |`;
}

function feedbackRow(item: PortfolioFeedbackApplication): string {
  const labels = item.appliedFeedback.map((rule) => rule.evidenceLabel).join("; ");
  const reasons = item.appliedFeedback.map((rule) => rule.reason).join("; ");
  return `| \`${item.candidateId}\` | ${esc(item.domain)} | ${item.mechanismCluster} | ${item.baseScore.toFixed(1)} | ${item.totalAdjustment > 0 ? "+" : ""}${item.totalAdjustment.toFixed(1)} | ${item.adjustedScore.toFixed(1)} | ${esc(labels)} | ${esc(reasons)} |`;
}

function recommendationRow(item: PortfolioFeedbackApplication): string {
  return `| \`${item.candidateId}\` | ${esc(item.title)} | ${item.mechanismCluster} | ${item.adjustedScore.toFixed(1)} | ${item.recommendedAction} |`;
}

export function renderLineageLearningReport(
  lineages: readonly FamilyLineage[],
  evaluations: readonly LineageEvaluation[],
  reallocation: PortfolioReallocation,
): string {
  const byId = new Map(lineages.map((lineage) => [lineage.id, lineage]));
  const lines: string[] = [
    "# Lineage Kill + Portfolio Reallocation v1",
    "",
    "This report turns clean smoke passes into routing evidence. A clean solve tells the foundry not",
    "to buy a full matrix for a branch the available subject already solves - but only when the solve",
    "was capable of coming out the other way. A pass against a challenge package that shipped its own",
    "solution measures the answer key, routes nothing, and saves nothing.",
    "",
    "Lineage learning is separate from model difficulty. It penalizes and boosts the discovery queue",
    "as labelled portfolio feedback; it does not rewrite trial outcomes or invent cross-lab evidence.",
    "When the evidence under a verdict is withdrawn, everything derived from it is withdrawn with it:",
    "the adjustments stay visible in this report and stop moving any score.",
    "",
    "## Summary",
    "",
    "| item | value |",
    "|---|---:|",
    `| lineages tracked | ${lineages.length} |`,
    `| solved-twice lineages | ${evaluations.filter((e) => e.verdict === "lineage_solved_twice").length} |`,
    `| stale/blocked lineages | ${evaluations.filter((e) => e.verdict.includes("blocked")).length} |`,
    `| lineages with withdrawn evidence | ${evaluations.filter((e) => e.verdict === "lineage_evidence_withdrawn").length} |`,
    `| matrix spend avoided (informative evidence only) | ${money(evaluations.reduce((sum, e) => sum + e.estimatedMatrixSpendSavedUsd, 0))} |`,
    `| matrix spend deferred and still owed | ${money(evaluations.reduce((sum, e) => sum + e.estimatedMatrixSpendDeferredUsd, 0))} |`,
    "",
  ];

  for (const evaluation of evaluations) {
    const lineage = byId.get(evaluation.lineageId);
    lines.push(
      `## ${evaluation.lineageId}`,
      "",
      `Verdict: **${evaluation.verdict}**. Decision: **${evaluation.decision}**.`,
      "",
      `Reason: ${evaluation.reason}`,
      "",
      "| family | local evidence | smoke | informative | counted | solves | failures | provider families | scenarios | mutant axes | matrix | hash |",
      "|---|---|---|---|---:|---:|---:|---|---:|---:|---|---|",
      ...evaluation.nodes.map(nodeRow),
      "",
      ...evaluation.nodes.flatMap(withdrawalBlock),
      "| derived question | answer |",
      "|---|---|",
      `| did difficulty increase | ${evaluation.difficultyIncreased ? "yes" : "no"} |`,
      `| did mutant-axis diversity increase | ${evaluation.axisDiversityIncreased ? "yes" : "no"} |`,
      `| cross-lab evidence proven | ${evaluation.crossLabProven ? "yes" : "no"} |`,
      `| matrix blockers total | ${evaluation.matrixBlocks} |`,
      `| ...backed by informative evidence (a real saving) | ${evaluation.informedMatrixBlocks} |`,
      `| ...backed by withdrawn, stale or absent evidence (deferred) | ${evaluation.deferredMatrixBlocks} |`,
      `| matrix spend avoided | ${money(evaluation.estimatedMatrixSpendSavedUsd)} |`,
      `| matrix spend deferred and still owed | ${money(evaluation.estimatedMatrixSpendDeferredUsd)} |`,
      `| next action | ${esc(evaluation.nextAction)} |`,
      "",
    );
    if (lineage !== undefined) {
      lines.push(
        "### Edge",
        "",
        "| from | to | operators |",
        "|---|---|---|",
        ...lineage.edges.map(
          (edge) =>
            `| \`${edge.fromFamilyId}\` | \`${edge.toFamilyId}\` | ${edge.operatorsApplied.map((op) => `\`${op}\``).join(", ")} |`,
        ),
        "",
        "What stayed fixed:",
        "",
        ...lineage.edges.flatMap((edge) => edge.whatStayedFixed.map((item) => `- ${item}`)),
        "",
        "What changed:",
        "",
        ...lineage.edges.flatMap((edge) => edge.whatChanged.map((item) => `- ${item}`)),
        "",
        "Learning:",
        "",
        ...lineage.learning.whatScoringShouldLearn.map((item) => `- ${item}`),
        "",
      );
    }
  }

  lines.push(
    "## Portfolio Feedback",
    "",
    "Scoring changes below are advisory and evidence-labelled. They do not delete candidates and they",
    "do not change historical evidence.",
    "",
    ...(reallocation.withdrawnFeedback.length === 0
      ? []
      : [
          "### Withdrawn Adjustments",
          "",
          `${reallocation.withdrawnFeedback.length} scoring rule(s) previously moved the discovery ranking on this lineage's`,
          "verdict and no longer apply, because the runs they rest on are superseded. They are listed",
          "rather than deleted: a ranking that silently stops being adjusted is as hard to audit as one",
          "that silently starts.",
          "",
          "| rule | kind | target | adjustment (no longer applied) | original reason | why withdrawn |",
          "|---|---|---|---:|---|---|",
          ...reallocation.withdrawnFeedback.map(withdrawnRuleRow),
          "",
        ]),
    "### Penalized By Similarity",
    "",
    reallocation.penalized.length === 0
      ? "_none_"
      : "| candidate | domain | cluster | base | adjustment | adjusted | evidence label | reason |",
    ...(reallocation.penalized.length === 0
      ? []
      : ["|---|---|---|---:|---:|---:|---|---|", ...reallocation.penalized.slice(0, 12).map(feedbackRow)]),
    "",
    "### Boosted Alternatives",
    "",
    reallocation.boosted.length === 0
      ? "_none_"
      : "| candidate | domain | cluster | base | adjustment | adjusted | evidence label | reason |",
    ...(reallocation.boosted.length === 0
      ? []
      : ["|---|---|---|---:|---:|---:|---|---|", ...reallocation.boosted.slice(0, 12).map(feedbackRow)]),
    "",
    "## Next Cluster Recommendation",
    "",
    ...(reallocation.reallocationStatus === "withdrawn"
      ? [
          "**This lineage's reallocation plan is withdrawn.**",
          "",
          `Why: ${reallocation.reallocationWithdrawnReason ?? "not stated"}`,
          "",
        ]
      : []),
    `Exact next build recommendation: ${reallocation.exactNextBuildRecommendation}`,
    "",
    ...(reallocation.nextRecommendations.length === 0
      ? [
          "No cluster is ranked here. Ranking one would re-assert, in a different column, the comparison",
          "the withdrawn evidence no longer supports.",
          "",
        ]
      : [
          "| rank | candidate | title | cluster | adjusted score | action |",
          "|---:|---|---|---|---:|---|",
          ...reallocation.nextRecommendations.map(
            (item, index) =>
              `| ${index + 1} | ${recommendationRow(item).replace(/^\| /, "").replace(/ \|$/, "")} |`,
          ),
          "",
          "The listed alternatives are chosen from the current discovery pool. Transfer proposed here is",
          "not transfer proved.",
          "",
        ]),
    "## Evidence Boundaries",
    "",
    "- A clean smoke pass is not a model failure; it is a route away from matrix spend - but only if the",
    "  package it was graded against could have produced a failure. A pass against a leaked solution is",
    "  not a route to anywhere.",
    "- Two clean same-provider smoke passes are not cross-lab evidence.",
    "- Spend is only avoided when the evidence that justified skipping the matrix was informative.",
    "  Otherwise it is deferred, and the matrix is still owed at re-measurement.",
    "- Withdrawn evidence withdraws everything derived from it, including portfolio adjustments already",
    "  applied to the discovery ranking.",
    "- Local mutant-detection axes are not real-agent difficulty axes.",
    "- A lineage penalty is portfolio-routing evidence, not a permanent kill of the candidate idea.",
    "- Further hardening of this branch should add a genuinely new evidence boundary, not just more local fields.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  );
  return lines.join("\n");
}
