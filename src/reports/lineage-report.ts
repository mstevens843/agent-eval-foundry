import type {
  FamilyLineage,
  LineageEvaluation,
  LineageNodeEvaluation,
  PortfolioFeedbackApplication,
  PortfolioReallocation,
} from "../foundry/lineage.js";

const esc = (s: string): string => s.replace(/\|/g, "\\|");
const money = (n: number): string => `$${n.toFixed(2)}`;

function nodeRow(node: LineageNodeEvaluation): string {
  return `| \`${node.familyId}\` | ${node.localEvidenceStatus} | ${node.smokeStatus} | ${node.countedSmokeTrials} | ${node.countedSmokeSolves} | ${node.countedSmokeFailures} | ${node.providerFamilies.join(", ") || "none"} | ${node.scenarioCount ?? "n/a"} | ${node.mutantAxes ?? "n/a"} | ${node.fullMatrixBlocked ? "blocked" : "not blocked"} | ${node.stale ? "stale" : "current"} |`;
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
    "This report turns clean smoke passes into routing evidence. A clean solve is useful evidence:",
    "it tells the foundry not to buy a full matrix for a branch that the available subject already",
    "solves.",
    "",
    "Lineage learning is separate from model difficulty. It penalizes and boosts the discovery queue",
    "as labelled portfolio feedback; it does not rewrite trial outcomes or invent cross-lab evidence.",
    "",
    "## Summary",
    "",
    "| item | value |",
    "|---|---:|",
    `| lineages tracked | ${lineages.length} |`,
    `| solved-twice lineages | ${evaluations.filter((e) => e.verdict === "lineage_solved_twice").length} |`,
    `| stale/blocked lineages | ${evaluations.filter((e) => e.verdict.includes("blocked")).length} |`,
    `| estimated matrix spend avoided | ${money(evaluations.reduce((sum, e) => sum + e.estimatedMatrixSpendSavedUsd, 0))} |`,
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
      "| family | local evidence | smoke | counted | solves | failures | provider families | scenarios | mutant axes | matrix | hash |",
      "|---|---|---|---:|---:|---:|---|---:|---:|---|---|",
      ...evaluation.nodes.map(nodeRow),
      "",
      "| derived question | answer |",
      "|---|---|",
      `| did difficulty increase | ${evaluation.difficultyIncreased ? "yes" : "no"} |`,
      `| did mutant-axis diversity increase | ${evaluation.axisDiversityIncreased ? "yes" : "no"} |`,
      `| cross-lab evidence proven | ${evaluation.crossLabProven ? "yes" : "no"} |`,
      `| matrix blockers that saved spend | ${evaluation.matrixBlocks} |`,
      `| estimated matrix spend avoided | ${money(evaluation.estimatedMatrixSpendSavedUsd)} |`,
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
    `Exact next build recommendation: ${reallocation.exactNextBuildRecommendation}`,
    "",
    "| rank | candidate | title | cluster | adjusted score | action |",
    "|---:|---|---|---|---:|---|",
    ...reallocation.nextRecommendations.map(
      (item, index) =>
        `| ${index + 1} | ${recommendationRow(item).replace(/^\| /, "").replace(/ \|$/, "")} |`,
    ),
    "",
    "The listed alternatives are chosen from the current discovery pool and avoid the solved",
    "local-scope-authority cluster. Transfer proposed here is not transfer proved.",
    "",
    "## Evidence Boundaries",
    "",
    "- A clean smoke pass is not a model failure; it is a route away from matrix spend.",
    "- Two clean same-provider smoke passes are not cross-lab evidence.",
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
