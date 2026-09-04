import { loadPhase15Preregistration } from "../phase-15/corpus.js";
import { runPhase15Discovery } from "../phase-15/discovery.js";
import type { CandidateReaderDecision, Phase15DiscoveryRun } from "../phase-15/types.js";

const cell = (value: string): string => value.replace(/\|/g, "\\|").replace(/\n/g, " ");

const yesNo = (value: boolean): string => (value ? "yes" : "no");

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

const sourceLocator = (locator: string): string =>
  locator.startsWith("https://") ? `[primary source](${locator})` : `\`${cell(locator)}\``;

const readerDecision = (
  decisions: readonly CandidateReaderDecision[],
  candidateId: string,
): CandidateReaderDecision | undefined => decisions.find((decision) => decision.candidateId === candidateId);

const recommendation = (run: Phase15DiscoveryRun): readonly string[] => {
  const pending = run.readerDecisions.some((decision) => decision.verdict === "pending");
  if (pending) {
    return [
      "The prospective run is not closed. Finish the registered independent reads, then run only",
      "the cheap probes unlocked by unanimous survival. Do not replace a killed source or candidate.",
    ];
  }
  if (run.summary.probeSurvivors > 0) {
    return [
      "Use **evidence mining -> independent screen -> cheap probe -> selective build** as the primary",
      "discovery route. This run establishes candidate discovery, not task difficulty: build the",
      "surviving WAF family from scratch, time it, then require cross-provider capability evidence",
      "before using its yield in a 1,000-task production plan.",
    ];
  }
  return [
    "This is still a screening instrument today. Before another corpus run, add a candidate-contract",
    "gate that requires the public grammar, accepted semantics, deterministic meter, numeric budget,",
    "hidden-instance envelope and threshold derivation. Do not repair and retest this candidate inside",
    "the completed run; a repaired proposal belongs in a new preregistration. Continue bounded evidence",
    "mining and selective builds, not bulk production, until a prospective candidate survives both",
    "reading and a probe.",
  ];
};

export function renderPhase15DiscoveryEngine(root: string): string {
  const registration = loadPhase15Preregistration(root);
  const run = runPhase15Discovery(root);
  const sourceRows = run.provenance.map(
    (source) =>
      `| \`${source.sourceUnitId}\` | ${source.role === "prospective" ? "prospective" : "calibration only"} | ${source.channel} | ${yesNo(source.countable)} (${source.evidenceClass}) | ${source.extractionStatus} | ${cell(source.extractionReason)} |`,
  );
  const evidenceRows = run.provenance.map(
    (source) =>
      `| \`${source.sourceUnitId}\` | ${sourceLocator(source.sourceLocator)} | \`${source.sourceRevision}\` | \`${source.sourceDigest}\` | ${cell(source.observedFailure)} |`,
  );
  const candidateRows = run.candidates.map((candidate) => {
    const decision = readerDecision(run.readerDecisions, candidate.candidateId);
    const operatorStatuses = candidate.applicableOperators
      .map((operator) => `\`${operator.operatorId}\`: ${operator.status}`)
      .join("; ");
    return `| \`${candidate.candidateId}\` | ${candidate.channel} | \`${candidate.failureAxis}\` | ${candidate.engineScore.toFixed(1)} | ${candidate.queueStatus} | ${decision?.verdict ?? "not reviewed"} | ${cell(operatorStatuses)} |`;
  });
  const reviewRows = run.reviews.map((review) => {
    const failed = Object.entries(review.dimensions)
      .filter(([, verdict]) => verdict !== "pass")
      .map(([dimension, verdict]) => `${dimension}:${verdict}`);
    return `| \`${review.candidateId}\` | ${review.readerId} | ${review.providerFamily}/${review.model} | ${review.verdict} | ${failed.length === 0 ? "none" : failed.join(", ")} | ${review.costUsd === null ? `unpriced; ${review.tokensUsed.toLocaleString("en-US")} tokens` : `$${review.costUsd.toFixed(2)}; ${review.tokensUsed.toLocaleString("en-US")} tokens`} |`;
  });
  const probeRows = run.probes.map(
    (probe) =>
      `| \`${probe.candidateId}\` | \`${probe.probeType}\` | ${probe.status} | ${yesNo(probe.b6.usable)} | ${yesNo(probe.mechanismActivated)} | ${yesNo(probe.witnessIsolated)} | ${cell(probe.reason)} |`,
  );
  const comparisonRows = run.comparison.map(
    (method) =>
      `| ${method.method} | ${method.systemsRead} | ${method.candidatesDrafted} | ${method.readerSurvivors}/${method.readerReviewed} | ${method.probeSurvivors}/${method.probeRun} | ${method.novelSurvivors} | ${method.domainBreadth} | ${method.failureAxes} | ${method.modelReads} / ${method.modelTokens === 0 ? "unrecorded" : method.modelTokens.toLocaleString("en-US")} | $${method.pricedUsd.toFixed(2)} + ${cell(method.unpricedCost)} | ${cell(method.claimBoundary)} |`,
  );
  const correctionRows = run.corrections.map((correction) => `- ${correction}`);
  const predictionRows = Object.entries(run.summary.predictionOutcomes).map(
    ([prediction, outcome]) => `| ${prediction} | ${outcome} |`,
  );
  const operatorRows = run.candidates.flatMap((candidate) =>
    candidate.applicableOperators.map(
      (operator) =>
        `| \`${candidate.candidateId}\` | \`${operator.operatorId}\` | ${operator.status} | ${operator.estimate === null ? "-" : operator.estimate.toFixed(3)} | ${operator.rankingDelta.toFixed(1)} | ${cell(operator.reason)} |`,
    ),
  );
  return [
    "# Phase 15 - Discovery Engine V2",
    "",
    "## Verdict",
    "",
    run.conclusion,
    "",
    `The bounded run searched **${run.summary.prospectiveSourceUnits}** prospective source units, extracted **${run.summary.prospectivePatterns}** patterns, drafted **${run.summary.candidateDrafts}** candidates, removed **${run.summary.semanticDuplicates}** semantic duplicate, sent **${run.summary.readerCandidates}** candidate to readers, and produced **${run.summary.probeSurvivors}** probe survivor. Prospective source-to-probe yield: **${pct(run.summary.prospectiveYieldPerSource)}**.`,
    `Measured discovery cost: **${run.summary.discoveryCostPerSurvivor}**. This is source-to-probe cost, not hours per family and not cost per hard task.`,
    "",
    "## Frozen Prospective Evaluation",
    "",
    `Run \`${run.runId}\` is pinned to preregistration SHA-256 \`${run.preregistrationSha256}\` at baseline commit \`${run.preregistrationBaselineCommit}\`.`,
    `Finalized inputs: source corpus \`${run.sourceCorpusSha256}\`; blind-review ledger \`${run.readerReviewsSha256}\`.`,
    `Caps: ${registration.limits.sourceUnits} total source units, ${registration.limits.prospectiveCandidateDrafts} prospective drafts, ${registration.limits.readerReviews} independent reads, ${registration.limits.cheapProbes} probes, $${registration.limits.modelReadBudgetUsd.toFixed(2)} priced reader spend, and ${registration.limits.paidSubjectTrials} paid subject trials.`,
    "The source list, expected yield, novelty standard, 2-of-2 reader threshold, promotion criteria",
    "and stopping rules were written before the two new external sources were inspected.",
    "That ordering is preserved by this execution transcript, not by trustworthy repository timestamps:",
    "the registration's midnight value predates its baseline commit and the corpus timestamp was an",
    "invalid future placeholder. This run is prospective in execution order, but not independently",
    "timestamp-proven from a fresh clone.",
    "",
    "| prediction | outcome |",
    "|---|---|",
    ...predictionRows,
    "",
    "## Provenance-First Extraction",
    "",
    "| source unit | role | channel | evidence boundary | extraction | reason |",
    "|---|---|---|---|---|---|",
    ...sourceRows,
    "",
    "All six source channels are enum-checked by the typed schema. This run exercised local document,",
    "counted trial-directory, pinned upstream task, and first-party incident adapters. Boundary-first is a",
    "registered comparator rather than a rerun. Adding a corpus changes the adapter input, not scoring.",
    "Every source produces at most one canonical pattern. Source incident, affected layer, authority",
    "boundary, causal axis, and action contract form the semantic key; domains and titles do not.",
    "",
    "| source unit | locator | revision | content address | observed failure |",
    "|---|---|---|---|---|",
    ...evidenceRows,
    "",
    `Domain breadth is **${run.summary.domainBreadth}** while failure-axis breadth is **${run.summary.failureAxisBreadth}**. These are deliberately separate; four domain labels do not imply four independent hard mechanisms.`,
    "",
    "## Candidate Queue",
    "",
    "| candidate | source channel | causal axis | score | queue | reader decision | operator evidence |",
    "|---|---|---|---:|---|---|---|",
    ...candidateRows,
    "",
    "The live-DOM transfer is a measured extraction success but a candidate failure: its new",
    "controller domain retains the built family's causal axis and action contract, so semantic dedup",
    "removes it before model reads. The checker-required source stops earlier because its isolated",
    "cause is specification omission. The archive precedent stops because no countable agent matrix",
    "is available. Those are source-to-decision measurements, not missing output.",
    "",
    "## Phase 14 In Ranking",
    "",
    "| candidate | operator | status | Phase 14 estimate | rank delta | reason |",
    "|---|---|---|---:|---:|---|",
    ...operatorRows,
    "",
    "Phase 14's measured operator ranking is empty. Local reference/mutant discrimination remains",
    "valid activation evidence, but it contributes no positive difficulty prior. Unmapped operators",
    "remain hypotheses, and validity controls receive no hardness points.",
    "",
    "## Blind Reader Screen",
    "",
    run.reviews.length === 0
      ? "No review has been recorded yet. Candidate yield remains pending."
      : "Readers received source evidence and the proposed contract, but not the author rationale, engine score, prediction, or the other verdict.",
    "",
    "| candidate | reader | provider/model | verdict | non-pass dimensions | reported cost |",
    "|---|---|---|---|---|---:|",
    ...(reviewRows.length === 0 ? ["| - | - | - | pending | - | - |"] : reviewRows),
    "",
    run.readerDecisions.some(
      (decision) => decision.providerFamilies.length === 1 && decision.reviewsReceived > 1,
    )
      ? "The two reads are independent sessions from one provider family. They count for candidate screening under the registration, but not for cross-provider root-cause agreement or capability evidence."
      : "Provider-family breadth is reported per candidate; reader screening is not capability attribution.",
    "",
    "## Cheap Probes",
    "",
    "| candidate | probe | result | B6 usable | mechanism active | witness isolated | reason |",
    "|---|---|---|---|---|---|---|",
    ...(probeRows.length === 0 ? ["| - | - | not-run | no | no | no | no eligible candidate |"] : probeRows),
    "",
    "The resource-complexity probe uses deterministic abstract work, not wall time. Its same invocation",
    "grades a known-good implementation, a functional-only known-bad implementation, and malformed",
    "input. A probe survivor proves a falsifiable mechanism can be packaged; it does not prove an agent",
    "will make the error.",
    "",
    "## Method Comparison",
    "",
    "| method | systems/source units | drafts | reader survivors | probe survivors | novel survivors | domains | failure axes | reads / recorded tokens | priced + unpriced cost | claim boundary |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|",
    ...comparisonRows,
    "",
    "Transfer-based discovery has the strongest local activation record and the weakest agent result:",
    "all eight countable Phase 14 attempts solved. Boundary-first search and author generation remain",
    "zero-yield under independent reading. V2 is the first route allowed to claim prospective discovery",
    "only if its candidate survives both the reader and probe gates. Retrospective outbox recovery is",
    "excluded from every yield numerator.",
    "",
    "## Corrections And Limits",
    "",
    ...correctionRows,
    "- Source snapshots preserve content addresses and evidence facts, not full copyrighted upstream",
    "  pages. Report regeneration is offline and cannot silently ingest a changed web page.",
    "- An authoritative incident is evidence that the failure occurred, not evidence that a benchmark",
    "  task built from it will be difficult for current agents.",
    "- Candidate screening used no paid subject trials. The next task-family build must be timed from",
    "  scratch; descendantBuildHours remains quarantined.",
    "",
    "## Recommendation",
    "",
    ...recommendation(run),
    "",
    "## Verification Scope",
    "",
    "Phase 15 owns focused schema, adapter, semantic-dedup, blinding, scoring and B6 tests plus",
    "typecheck/lint/build. The repository-wide long-running gate remains on the operator's periodic",
    "cadence; this report does not turn a deferred global rerun into a claimed pass.",
    "",
  ].join("\n");
}
