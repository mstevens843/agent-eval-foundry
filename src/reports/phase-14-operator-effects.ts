import { buildPhase14EffectLedger, buildPhase14TrialLedger } from "../phase-14/measurement.js";
import type { Phase14TrialLedger, Phase14TrialRow } from "../phase-14/measurement.js";
import { PHASE14_FAMILIES, buildPhase14PackageLock, buildPhase14ScenarioLock } from "../phase-14/packages.js";
import { buildPhase14Preflight } from "../phase-14/preflight.js";
import { exactBinomialInterval } from "../phase-14/statistics.js";

const yesNo = (value: boolean): string => (value ? "yes" : "no");
const value = (number: number | null): string => (number === null ? "-" : number.toFixed(3));

const verdict = (trials: Phase14TrialLedger): readonly string[] => {
  if (trials.status === "BLOCKED_PREFLIGHT") {
    return [
      "**BLOCKED BEFORE MEASUREMENT.** At least one registered prerequisite is unavailable.",
      "No unavailable provider is replaced with a same-provider run.",
    ];
  }
  if (trials.status === "READY") {
    return [
      "**READY FOR THE REGISTERED MEASUREMENT.** Both provider families authenticated inside the",
      "pinned image, the no-network artifact grader reproduced the frozen calibration, and the first",
      "seeded cell is unlocked. No agent outcome has been observed yet.",
    ];
  }
  if (trials.status === "PAUSED_FOR_LABELS") {
    return [
      "**PAUSED AT THE REGISTERED LABEL GATE.** All currently required subject cells are preserved,",
      "but at least one failure lacks two independent labels. Reward zero alone does not unlock spend.",
    ];
  }
  if (trials.status === "STOPPED_BY_RULE") {
    return [
      "**MEASUREMENT STOPPED BY THE PREREGISTERED RULE.** All six seeded cells and both DAO neutral",
      "sentinels solved cleanly. The remaining four neutral cells are intentionally unrun because the",
      "frozen smoke and sentinel condition made them uninformative at this resolution.",
    ];
  }
  if (trials.status === "COMPLETE") {
    return ["**REGISTERED MATRIX COMPLETE.** Every unlocked cell and required blind label is preserved."];
  }
  return [
    "**REGISTERED MEASUREMENT IN PROGRESS.** Completed cells are reported as measured; unopened",
    "cells remain NOT_RUN and contribute nothing.",
  ];
};

const rootCause = (row: Phase14TrialRow): string => {
  if (row.labelDecision === null) return row.reward === 1 ? "clean" : "-";
  return `${row.labelDecision.status}${
    row.labelDecision.labels.length === 0 ? "" : ` (${row.labelDecision.labels.join(" / ")})`
  }`;
};

export function renderPhase14OperatorEffects(root: string): string {
  const packages = buildPhase14PackageLock(root);
  const scenarios = buildPhase14ScenarioLock(root);
  const preflight = buildPhase14Preflight(root);
  const trials = buildPhase14TrialLedger(root);
  const effects = buildPhase14EffectLedger(root);

  const packageRows = packages.rows.map(
    (row) =>
      `| \`${row.familyId}\` | \`${row.starterProfile}\` | \`${row.challengeHash}\` | ${row.changedFromSeeded.length === 0 ? "none" : row.changedFromSeeded.map((path) => `\`${path}\``).join(", ")} | ${row.starterFailedScenarios}/${row.starterScenarios} | ${row.starterHostErrors} |`,
  );
  const providerRows = preflight.providers.map(
    (provider) =>
      `| ${provider.providerFamily} | ${yesNo(provider.subjectExecutionAvailable)} | ${yesNo(provider.blindLabellingAvailable)} | ${provider.mode} | ${provider.evidence} |`,
  );
  const campaignRows = preflight.phase13Campaigns.map(
    (campaign) =>
      `| \`${campaign.familyId}\` | \`${campaign.path}\` | ${yesNo(campaign.hashCurrent)} | ${yesNo(campaign.scenarioSetCurrent)} | ${campaign.slotsNotRun}/${campaign.slots} | ${campaign.isolation} |`,
  );
  const attemptRows = trials.attempts.map((attempt) => {
    const concentration = attempt.failureConcentration;
    return `| \`${attempt.familyId}\` | \`${attempt.starterProfile}\` | ${attempt.providerFamily} | ${attempt.state} | ${attempt.countability.counts ? "yes" : "no"} | ${attempt.reward ?? "-"} | ${concentration === null ? "-" : `${concentration.targetFailed}/18 T; ${concentration.controlFailed}/6 C`} | ${rootCause(attempt)} | ${attempt.selfCheckProfile?.verdict ?? "-"} / ${attempt.selfCheckGreen === null ? "green unknown" : attempt.selfCheckGreen ? "green" : "red"} |`;
  });
  const localRows = effects.localCalibration.map(
    (row) =>
      `| \`${row.familyId}\` | ${row.referenceFailures}/${row.concentratedScenarios} | ${row.narrowTargetFailures}/${row.targetScenarios} | ${row.narrowControlFailures}/${row.controlScenarios} | ${row.concentratedNarrowFailures}/${row.concentratedScenarios} | ${row.balancedNarrowFailures}/${row.balancedScenarios} |`,
  );
  const effectRows = effects.estimates.map((effect) => {
    const interval = effect.exactInterval;
    const intervalText =
      interval === null ? "-" : `[${interval.lower.toFixed(3)}, ${interval.upper.toFixed(3)}]`;
    return `| \`${effect.estimandId}\` | ${effect.category} | ${effect.independentAttempts} | ${effect.status} | ${value(effect.estimate)} | ${intervalText} | ${effect.reason} |`;
  });
  const familyRateRows = PHASE14_FAMILIES.map((familyId) => {
    const rows = trials.attempts.filter(
      (attempt) => attempt.familyId === familyId && attempt.countability.counts,
    );
    const rewardZero = rows.filter((attempt) => attempt.reward === 0).length;
    const capability = rows.filter((attempt) => attempt.labelDecision?.status === "agreed-capability").length;
    const rewardInterval = exactBinomialInterval(rewardZero, rows.length);
    const capabilityInterval = exactBinomialInterval(capability, rows.length);
    const interval = (row: ReturnType<typeof exactBinomialInterval>): string =>
      row === null ? "-" : `[${row.lower.toFixed(3)}, ${row.upper.toFixed(3)}]`;
    return `| \`${familyId}\` | ${rows.length} | ${rewardZero}/${rows.length} | ${interval(rewardInterval)} | ${capability}/${rows.length} | ${interval(capabilityInterval)} |`;
  });
  const verificationRows = preflight.verification.map(
    (check) => `| \`${check.command}\` | ${check.passed ? "pass" : "fail"} | ${check.detail} |`,
  );
  const blockers =
    preflight.blockers.length === 0 ? ["- None."] : preflight.blockers.map((item) => `- ${item}`);
  const corrections = effects.corrections.map((correction) => `- ${correction}`);
  const targetCount = scenarios.rows.filter((row) => row.activation === "target").length;
  const controlCount = scenarios.rows.filter((row) => row.activation === "control").length;
  const balancedCount = scenarios.rows.filter((row) => row.inBalanced12).length;
  const next =
    trials.nextAttemptId === null
      ? "No subject cell is currently unlocked. Follow the status and label decision above."
      : `Next frozen cell: \`${trials.nextAttemptId}\`.`;

  return [
    "# Phase 14 - Controlled Agent Operator Ablations",
    "",
    "## Verdict",
    "",
    ...verdict(trials),
    "",
    `Observed agent attempts: **${trials.summary.attempted}**. Countable: **${trials.summary.countable}**. Clean solves: **${trials.summary.cleanSolves}**. Reward zero: **${trials.summary.rewardZero}**. Agreed capability failures: **${trials.summary.agreedCapabilityFailures}**.`,
    `Provider-reported priced subject spend: **$${trials.summary.spentUsd.toFixed(2)}**, with ${trials.summary.unpricedAttempts} unpriced attempt(s). Blind labelling: **${trials.summary.blindLabelsRun}** run(s), **$${trials.summary.blindLabelSpendUsd.toFixed(2)}** reported, with ${trials.summary.unpricedBlindLabels} unpriced run(s). Priced campaign spend: **$${trials.summary.pricedCampaignSpendUsd.toFixed(2)}**.`,
    `Authenticated preflight probes cost **$${trials.summary.preflightProbeSpendUsd.toFixed(6)}** plus one unpriced Codex call; preregistered campaign ceilings exclude preflight calibration.`,
    next,
    "",
    "Reward zero and capability difficulty remain separate quantities. An unresolved or non-capability",
    "failure changes the raw outcome table but never enters the capability tally or operator ranking.",
    trials.summary.rewardZero === 0
      ? "No blind labels ran because no counted subject artifact failed; this is protocol compliance, not missing adjudication."
      : `Blind labels completed: ${trials.summary.blindLabelsRun}; unresolved failures: ${trials.summary.unresolvedFailures}.`,
    "",
    "## Frozen Registration",
    "",
    `The design was registered before agent output in \`${trials.preregistration.path}\` at SHA-256 \`${trials.preregistration.sha256}\`, against baseline commit \`${trials.preregistration.baselineCommit}\`.`,
    `It caps the campaign at ${trials.preregistration.maximumSubjectAttempts} subject attempts, ${trials.preregistration.maximumBlindLabels} labels, $${trials.preregistration.maximumSubjectTrialUsd.toFixed(2)} subject spend, $${trials.preregistration.maximumBlindLabellingUsd.toFixed(2)} labelling spend, and $${trials.preregistration.maximumTotalUsd.toFixed(2)} total campaign spend.`,
    "Family and starter are attempt-level factors. Activation is a paired target-versus-control",
    "description inside one submission. Selection is a deterministic rescore of that same artifact.",
    "Scenario rows are never counted as independent model trials.",
    "",
    "## Preflight",
    "",
    "| provider family | subject execution | blind labelling | mode | evidence |",
    "|---|---|---|---|---|",
    ...providerRows,
    "",
    `Docker ${preflight.isolation.dockerServerVersion} is available. Provider-container plan B6: ${yesNo(preflight.b6.providerContainerPlanRigUsable)}. No-network artifact smoke: ${yesNo(preflight.isolation.artifactNoNetworkSmokePassed)}.`,
    "The provider agent needs bridge networking for its vendor API. It receives only its own credential",
    "channel and a writable per-attempt workspace with a nested read-only challenge. The submitted",
    "module is then re-run with its family host in fresh no-network containers; the verifier remains",
    "outside and consumes only the emitted calls, effects and reports.",
    "",
    "Blocking conditions:",
    "",
    ...blockers,
    "",
    "B6 in this preparation path covers preflight known-good/known-bad/malformed input, package",
    "delta, blind-label adjudication, campaign manifests and both provider command plans. Every actual",
    "grading invocation additionally runs reference, narrow known-bad and malformed host controls.",
    "",
    "| Phase 13 family | campaign manifest | hash current | scenarios current | slots NOT_RUN | isolation |",
    "|---|---|---|---|---:|---|",
    ...campaignRows,
    "",
    "## Frozen Packages",
    "",
    "| family | starter profile | challenge hash | delta from seeded | local starter failures | host errors |",
    "|---|---|---|---|---:|---:|",
    ...packageRows,
    "",
    `The Phase 13 preregistration hash is preserved: ${yesNo(packages.phase13PreregistrationPreserved)}. Seeded challenge hashes are preserved: ${yesNo(packages.phase13SeededHashesPreserved)}.`,
    "The neutral profile changes only `README.md` and `starter/subject.mjs`. Normative specification,",
    "examples, harness, verifier and scenario set remain byte-identical.",
    `The scenario lock has ${targetCount} activated targets and ${controlCount} controls across three families; ${balancedCount} rows belong to the paired balanced views.`,
    "",
    "## Raw Agent Cells",
    "",
    "| family | starter | provider | state | counts | reward | failure concentration | blind root cause | self-check evidence / outcome |",
    "|---|---|---|---|---|---|---|---|---|",
    ...attemptRows,
    "",
    "`NOT_RUN` contributes nothing. A self-check can be observed or described while its outcome remains",
    "unknown; prose saying a check passed is not converted into `selfCheckGreen: true`.",
    "",
    "## Attempt-Level Family Rates",
    "",
    "| family | countable attempts | reward zero | exact 95% reward-zero interval | agreed capability | exact 95% capability interval |",
    "|---|---:|---:|---|---:|---|",
    ...familyRateRows,
    "",
    "Intervals are Clopper-Pearson over independent agent attempts. They are wide at this smoke size;",
    "the zero observed failures do not establish a zero population failure rate.",
    "",
    "## Local Calibration, Not Agent Effects",
    "",
    "| family | reference failures | narrow target | narrow control | concentrated-24 narrow | balanced-12 narrow |",
    "|---|---:|---:|---:|---:|---:|",
    ...localRows,
    "",
    "These deterministic reference/mutant outcomes prove activation and verifier discrimination.",
    "A mutant written to embody the error is not evidence that an agent will make it.",
    "",
    "## Effect Ledger",
    "",
    "| estimand | class | independent attempts | status | estimate | exact 95% interval | interpretation |",
    "|---|---|---:|---|---:|---|---|",
    ...effectRows,
    "",
    `Measured operator ranking: ${effects.measuredOperatorRanking.length === 0 ? (effects.estimates.find((row) => row.estimandId === "E2-starter")?.estimate === 0 ? "empty; the DAO starter contrast was measured at 0.000 across both provider strata, so no operator effect is demonstrated" : "empty; the registered cross-provider matched contrast is not yet supported") : effects.measuredOperatorRanking.map((row) => `${row.rank}. ${row.operator} (${row.estimate.toFixed(3)})`).join("; ")}.`,
    "The exact intervals are Clopper-Pearson intervals over independent attempts only. The hierarchical",
    "model remains unfit: even all 12 cells provide one stochastic attempt per crossed cell, so stable",
    "variance components would be prior-dominated.",
    "",
    "## Corrections And Limits",
    "",
    ...corrections,
    "- The provider image is pinned by CLI versions and recorded image identity, but provider API",
    "  behavior is external and networked; this is weaker than the source task's Harbor boundary.",
    "- Preflight spend is reported separately from subject and label spend. Codex dollar costs remain",
    "  unknown because its CLI reports tokens but no price.",
    "",
    "## Verification Baseline",
    "",
    "| command | result | detail |",
    "|---|---|---|",
    ...verificationRows,
    "",
    "The report and machine ledgers regenerate from preserved artifacts. A package correction requires",
    "a new challenge hash and replacement preregistration; no observed output is retained under a",
    "corrected cell.",
    "",
  ].join("\n");
}
