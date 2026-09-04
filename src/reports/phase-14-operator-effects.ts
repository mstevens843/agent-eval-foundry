import { buildPhase14EffectLedger, buildPhase14TrialLedger } from "../phase-14/measurement.js";
import { buildPhase14PackageLock, buildPhase14ScenarioLock } from "../phase-14/packages.js";
import { buildPhase14Preflight } from "../phase-14/preflight.js";

const yesNo = (value: boolean): string => (value ? "yes" : "no");

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
  const attemptRows = trials.attempts.map(
    (attempt) =>
      `| \`${attempt.familyId}\` | \`${attempt.starterProfile}\` | ${attempt.providerFamily} | \`${attempt.challengeHash}\` | ${attempt.state} | no | - | - |`,
  );
  const localRows = effects.localCalibration.map(
    (row) =>
      `| \`${row.familyId}\` | ${row.referenceFailures}/${row.concentratedScenarios} | ${row.narrowTargetFailures}/${row.targetScenarios} | ${row.narrowControlFailures}/${row.controlScenarios} | ${row.concentratedNarrowFailures}/${row.concentratedScenarios} | ${row.balancedNarrowFailures}/${row.balancedScenarios} |`,
  );
  const effectRows = effects.estimates.map(
    (effect) =>
      `| \`${effect.estimandId}\` | ${effect.category} | ${effect.independentAttempts} | ${effect.status} | ${effect.reason} |`,
  );
  const verificationRows = preflight.verification.map(
    (check) => `| \`${check.command}\` | ${check.passed ? "pass" : "fail"} | ${check.detail} |`,
  );
  const blockers = preflight.blockers.map((blocker) => `- ${blocker}`);
  const corrections = effects.corrections.map((correction) => `- ${correction}`);
  const targetCount = scenarios.rows.filter((row) => row.activation === "target").length;
  const controlCount = scenarios.rows.filter((row) => row.activation === "control").length;
  const balancedCount = scenarios.rows.filter((row) => row.inBalanced12).length;

  return [
    "# Phase 14 - Controlled Agent Operator Ablations",
    "",
    "## Verdict",
    "",
    "**BLOCKED BEFORE MEASUREMENT.** The preparation is complete, but the registered cross-provider",
    "preflight did not pass. Anthropic subject execution and blind labelling are unavailable in this",
    "runner, and the provider CLIs do not yet have a validated container execution path. Per the",
    "preregistration, no OpenAI-only substitute ran.",
    "",
    `Observed agent attempts: **${trials.summary.attempted}**. Countable attempts: **${trials.summary.countable}**. Spend: **$${trials.summary.spentUsd.toFixed(2)}**.`,
    "No family effect, operator effect, interaction, solve rate or capability-failure rate was measured.",
    "The measured operator ranking is therefore **empty**, not tied and not zero-effect.",
    "",
    "## Frozen Registration",
    "",
    `The design was registered before agent output in \`${trials.preregistration.path}\` at SHA-256 \`${trials.preregistration.sha256}\`, against baseline commit \`${trials.preregistration.baselineCommit}\`.`,
    `It caps the campaign at ${trials.preregistration.maximumSubjectAttempts} subject attempts, ${trials.preregistration.maximumBlindLabels} labels and $${trials.preregistration.maximumTotalUsd.toFixed(2)} total spend.`,
    "No agent output was inspected and no cell was redesigned after registration.",
    "",
    "The attempt-level factors are family (`F`) and starter profile (`T`). Activation (`A`) is a",
    "paired target-versus-control comparison inside one submission. Selection (`Q`) is a deterministic",
    "rescore of that same submission. Scenario rows are not independent model trials.",
    "",
    "## Preflight",
    "",
    "| provider family | subject execution | blind labelling | mode | evidence |",
    "|---|---|---|---|---|",
    ...providerRows,
    "",
    `Docker ${preflight.isolation.dockerServerVersion} was available and the submitted-artifact no-network smoke passed: ${yesNo(preflight.isolation.artifactNoNetworkSmokePassed)}.`,
    "That proves artifact grading isolation only. The generic provider container uses a base image",
    "without the provider CLIs unless a purpose-built image is supplied, so provider-agent container",
    "execution remains unvalidated. Existing Phase 13 campaigns record subprocess isolation.",
    "",
    "Blocking conditions:",
    "",
    ...blockers,
    "",
    "B6 ran in the same preparation invocation:",
    "",
    `- Preflight known-good passed: ${yesNo(preflight.b6.knownGoodPassed)}; known-bad failed: ${yesNo(preflight.b6.knownBadFailed)}; malformed input refused: ${yesNo(preflight.b6.malformedInputRefused)}.`,
    `- Package-delta rig usable: ${yesNo(preflight.b6.packageDeltaRigUsable)}. Blind-label adjudication rig usable: ${yesNo(preflight.b6.blindLabelRigUsable)}.`,
    `- Phase 13 campaign-audit rig usable: ${yesNo(preflight.b6.campaignManifestRigUsable)}.`,
    "",
    "| Phase 13 family | campaign manifest | hash current | scenarios current | slots NOT_RUN | isolation |",
    "|---|---|---|---|---:|---|",
    ...campaignRows,
    "",
    "## Frozen Packages",
    "",
    "| family | starter profile | challenge hash | delta from Phase 13 package | local starter failures | host errors |",
    "|---|---|---|---|---:|---:|",
    ...packageRows,
    "",
    `The frozen Phase 13 preregistration hash still matches: ${yesNo(packages.phase13PreregistrationPreserved)}. All seeded challenge hashes still match Phase 13: ${yesNo(packages.phase13SeededHashesPreserved)}. The neutral profile changes only \`README.md\` and \`starter/subject.mjs\`; normative specification, examples, verifier, harness and scenarios remain byte-identical.`,
    "Any locked package can be materialized with `phase14 challenge --family <id> --starter <profile> --out <dir>` for independent inspection.",
    "The neutral starter's local failures show that an unimplemented skeleton is rejected. They do not",
    "show that an agent fails the task and do not rank the starter operator.",
    "",
    `The scenario lock contains ${targetCount} activated targets and ${controlCount} nonactivation controls across three families. Its paired balanced view contains ${balancedCount} rows total (6 targets plus 6 controls per family).`,
    "",
    "## Raw Agent Cells",
    "",
    "| family | starter | provider | hash | state | counts | reward | root cause |",
    "|---|---|---|---|---|---|---|---|",
    ...attemptRows,
    "",
    "`NOT_RUN` is data here: the preflight stop rule fired before the cheaper provider could be sampled.",
    "No refusal, missing label or infrastructure failure has been converted into reward 0.",
    "",
    "## Local Calibration, Not Agent Effects",
    "",
    "| family | reference failures | narrow target | narrow control | concentrated-24 narrow | balanced-12 narrow |",
    "|---|---:|---:|---:|---:|---:|",
    ...localRows,
    "",
    "These are deterministic Phase 13 reference/mutant outcomes. They prove mechanism activation,",
    "held controls and suite discrimination. A mutant written to embody an error is not evidence that",
    "an agent will make that error, so none enters the effect model or capability tally.",
    "",
    "## Effect Ledger",
    "",
    "| estimand | class | independent attempts | status | reason |",
    "|---|---|---:|---|---|",
    ...effectRows,
    "",
    "The registered analysis uses two-sided 95% Clopper-Pearson intervals only for independent",
    "attempt-level rates. It emits no interval for 0/0. No binomial interval is computed over scenario",
    "rows. A hierarchical model was not fit: with zero observations it is impossible, and even the",
    "registered maximum of one attempt per family x starter x provider cell cannot identify stable",
    "variance components without a prior-driven answer.",
    "",
    "## Corrections From Audit",
    "",
    ...corrections,
    "",
    "A package correction after future agent output must preserve the old attempt as void, produce a",
    "new challenge hash and receive a replacement preregistration. None occurred in this phase.",
    "",
    "## Verification Baseline",
    "",
    "| command | result | detail |",
    "|---|---|---|",
    ...verificationRows,
    "",
    "## Next Execution Step",
    "",
    "1. Restore Anthropic execution and independent labelling capacity without placing credentials in artifacts.",
    "2. Supply and smoke-test purpose-built provider images or an equivalent container path for both CLIs; preserve the weaker network-on provider boundary explicitly.",
    "3. Regenerate preflight. Only when it is green, run the six seeded attempts as the registered matched provider pairs and label every counted failure before applying an expansion rule.",
    "4. Populate the same trial and effect ledgers from preserved artifacts. Do not edit the frozen cells or use an OpenAI-only sample as a substitute.",
    "",
    "Until those conditions hold, Phase 14 has produced a reproducible experimental design and an",
    "honest block, not a measured operator ranking.",
    "",
  ].join("\n");
}
