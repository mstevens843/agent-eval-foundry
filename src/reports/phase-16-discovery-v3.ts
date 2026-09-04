import { runPhase16Calibration } from "../phase-16/calibration.js";
import { phase16ContinuationComparisonArtifact, runPhase16Continuation } from "../phase-16/continuation.js";
import {
  loadPhase16Preflight,
  loadPhase16Preregistration,
  phase16CorrectionsArtifact,
  phase16InputHashesArtifact,
  runPhase16Discovery,
} from "../phase-16/discovery.js";
import {
  PHASE16_CONTINUATION_PREREGISTRATION_SHA256,
  loadPhase16ContinuationPreregistration,
  phase16ReviewNormalizerB6,
} from "../phase-16/review-execution.js";

const cell = (value: string): string => value.replace(/\|/g, "\\|").replace(/\n/g, " ");
const yesNo = (value: boolean): string => (value ? "yes" : "no");
const countOrUnknown = (value: number | null): string => (value === null ? "unknown" : String(value));
const money = (value: number | null): string => (value === null ? "unpriced" : `$${value.toFixed(4)}`);

interface MethodRow {
  readonly method: string;
  readonly systemsRead: number;
  readonly candidatesDrafted: number;
  readonly readerReviewed: number;
  readonly readerSurvivors: number | null;
  readonly probeRun: number;
  readonly probeSurvivors: number | null;
  readonly domainBreadth: number;
  readonly failureAxes?: number;
  readonly failureAxisBreadth?: number;
  readonly modelReads: number;
  readonly pricedUsd: number;
  readonly claimBoundary: string;
}

interface ComparisonArtifact {
  readonly phase15MethodsUnchanged: readonly MethodRow[];
  readonly discoveryV3: MethodRow;
}

interface CorrectionsArtifact {
  readonly corrections: readonly string[];
}

interface HashArtifact {
  readonly inputs: Readonly<Record<string, string | Readonly<Record<string, string>>>>;
}

const sourceLink = (locator: string): string =>
  locator.startsWith("https://") ? `[source](${locator})` : `\`${cell(locator)}\``;

export function renderPhase16DiscoveryV3(root: string): string {
  const registration = loadPhase16Preregistration(root);
  const initialPreflight = loadPhase16Preflight(root);
  const continuationRegistration = loadPhase16ContinuationPreregistration(root);
  const calibration = runPhase16Calibration(root);
  const normalizerB6 = phase16ReviewNormalizerB6();
  const run = runPhase16Discovery(root);
  const continuation = runPhase16Continuation(root);
  const comparison = phase16ContinuationComparisonArtifact(root, continuation) as ComparisonArtifact;
  const corrections = phase16CorrectionsArtifact(run) as CorrectionsArtifact;
  const hashes = phase16InputHashesArtifact(root, run) as HashArtifact;

  const sourceRows = run.sources.map(
    (source) =>
      `| \`${source.sourceUnitId}\` | ${source.channel} | ${sourceLink(source.locator)} | ${source.sourceSupport} | ${source.extraction.status} | ${yesNo(source.extraction.contractAttempted)} | \`${source.extraction.failureAxis}\` | ${cell(source.extraction.reason)} |`,
  );
  const candidateRows = run.candidates.map((candidate) => {
    const contract = run.contracts.find((row) => row.candidateId === candidate.candidateId);
    if (contract === undefined) throw new Error(`${candidate.candidateId}: report contract missing`);
    return `| \`${candidate.candidateId}\` | \`${candidate.sourceIncidentId}\` | ${contract.derivation.classification} | ${contract.derivation.citationCount} / ${contract.derivation.sectionSpan} / ${contract.derivation.inferenceDepth} / ${yesNo(contract.derivation.negativeInference)} | ${candidate.gate.status} | ${candidate.score} | ${candidate.queueStatus} | \`${candidate.causalAxis}\` | ${contract.derivation.unresolvedValidityRisks.length === 0 ? "none declared" : cell(contract.derivation.unresolvedValidityRisks.join("; "))} |`;
  });
  const calibrationRows = calibration.controls.map(
    (control) =>
      `| \`${control.id}\` | ${control.role} | ${control.expectedStatus} | ${control.result.status} | ${control.result.deficiencies.map((row) => `\`${row.code}\``).join(", ") || "none"} | ${yesNo(control.held)} |`,
  );
  const providerRows = initialPreflight.providers.map(
    (provider) =>
      `| ${provider.providerFamily} | \`${provider.command}\` | ${yesNo(provider.authenticated)} | ${cell(provider.observation)} |`,
  );
  const reviewRows = continuation.reviews.map(
    (review) =>
      `| \`${review.candidateId}\` | ${review.providerFamily} | ${review.verdict} | ${review.earliestFailedDimension ?? "none"} | ${review.runtimeSeconds}s | ${money(review.costUsd)} |`,
  );
  const decisionRows = continuation.decisions.map(
    (decision) =>
      `| \`${decision.candidateId}\` | ${decision.verdict} | ${decision.reviewsReceived}/2 | ${cell(decision.reason)} |`,
  );
  const probeRows = continuation.probes.map((probe) => {
    const result = probe.result;
    return `| \`${probe.candidateId}\` | ${probe.status} | ${result === null ? "not run" : yesNo(result.b6.usable)} | ${result === null ? "not run" : yesNo(result.mechanismActivated)} | ${result === null ? "not run" : result.observedMutantFailures.map((failure) => `\`${failure}\``).join(", ")} | ${cell(probe.reason)} |`;
  });
  const methodRows = [...comparison.phase15MethodsUnchanged, comparison.discoveryV3].map(
    (method) =>
      `| ${method.method} | ${method.systemsRead} | ${method.candidatesDrafted} | ${countOrUnknown(method.readerSurvivors)}/${method.readerReviewed} | ${countOrUnknown(method.probeSurvivors)}/${method.probeRun} | ${method.domainBreadth} | ${method.failureAxes ?? method.failureAxisBreadth ?? 0} | ${method.modelReads} | $${method.pricedUsd.toFixed(2)} | ${cell(method.claimBoundary)} |`,
  );
  const hashRows = Object.entries(hashes.inputs).map(([name, value]) =>
    typeof value === "string"
      ? `| ${name} | \`${value}\` |`
      : `| ${name} | ${Object.keys(value).length} source snapshot digests (see structured artifact) |`,
  );

  return [
    "# Phase 16 - Candidate Contract Gate And Prospective Discovery V3",
    "",
    "## Verdict",
    "",
    "**REPEAT-DISCOVERY.** Discovery V3 prospectively produced one candidate that survived 2-of-2",
    "cross-provider reading and its registered B6 probe. That is the first prospective evidence-mined",
    "reader-and-probe survivor, but it is below the preregistered BUILD threshold of two independent",
    "incidents across two causal axes. Phase 17's multi-family build is not unlocked.",
    "",
    "The completed funnel is **12 source units -> 12 canonical extractions -> 6 contract attempts -> 6",
    "gate-complete drafts -> 6 semantic uniques found -> 4 admitted packets -> 8 blind reviews -> 1",
    "reader survivor -> 1 B6 probe survivor**. This establishes prospective candidate discovery, not",
    "task hardness: there were zero subject trials and zero new capability-attributed failures.",
    "",
    "## Frozen Run And Continuation",
    "",
    `Run \`${run.runId}\` was registered at \`${registration.registeredAt}\` against baseline commit \`${registration.baselineCommit}\`.`,
    `Preregistration SHA-256: \`${run.preregistrationSha256}\`; frozen calibration: \`${run.calibrationSha256}\`; source ledger: \`${run.sourceLedgerSha256}\`.`,
    `Source corpus: \`${run.sourceCorpusSha256}\`; packet set: \`${run.packetSetSha256}\`.`,
    registration.chronologyEvidence,
    "",
    "The initial run stopped correctly when the Anthropic provider was unavailable. After the operator",
    "restored authentication, a separately frozen continuation reviewed only the original packet hashes;",
    "it did not reopen source selection, ranking, drafting, or the four-packet cap.",
    `Continuation \`${continuation.continuationId}\` was registered at \`${continuationRegistration.registeredAt}\`; preregistration SHA-256: \`${PHASE16_CONTINUATION_PREREGISTRATION_SHA256}\`.`,
    continuationRegistration.chronologyEvidence,
    "Phase 15 remains unchanged at zero reader survivors. Its WAF candidate and the outbox remain",
    "retrospective calibration fixtures and do not enter a Phase 16 prospective numerator.",
    "",
    "Registered caps: 12 sources and extractions, 6 contract attempts, 4 admitted semantic uniques, 8",
    "cross-provider reads, 4 probes, at most $100 priced reader spend, and zero paid subject trials. No",
    "rejected or below-cap source was replaced, and no killed candidate was repaired inside the run.",
    "",
    "| preregistered prediction | registered | observed | status |",
    "|---|---:|---:|---|",
    `| extracted patterns | ${registration.predictions.extractedPatterns} | ${run.summary.canonicalExtractions} | scored; includes four validity-only patterns |`,
    `| contract-complete candidates | ${registration.predictions.contractCompleteCandidates} | ${run.summary.contractComplete} | met |`,
    `| semantic uniques | ${registration.predictions.semanticUniques} | ${run.summary.semanticUniquesFound} found / ${run.summary.semanticUniquesAdmitted} admitted | cap preserved |`,
    `| reader survivors | ${registration.predictions.readerSurvivors} | ${continuation.summary.readerSurvivors} | missed |`,
    `| probe survivors | ${registration.predictions.probeSurvivors} | ${continuation.summary.probeSurvivors} | missed |`,
    "",
    "## Contract Gate Calibration",
    "",
    `The frozen contract gate ran B6 in one invocation: usable **${yesNo(calibration.b6.usable)}**, known-good pass **${yesNo(calibration.b6.knownGoodPassed)}**, known-bad fail **${yesNo(calibration.b6.knownBadFailed)}**, malformed refusal **${yesNo(calibration.b6.malformedInputRefused)}**, nondegenerate **${yesNo(calibration.b6.nondegenerate)}**.`,
    "",
    "| fixture | purpose | expected | observed | key deficiencies | held |",
    "|---|---|---|---|---|---|",
    ...calibrationRows,
    "",
    "The original Phase 15 WAF packet fails the six registered omissions. A separately repaired WAF",
    "contract and the A2-repaired DAO descendant pass only as retrospective controls. Checker-only reason",
    "codes and a locally observable witness fail. The gate reports deficiencies and never invents content.",
    "",
    "## Prospective Sources",
    "",
    "| source unit | channel | locator | evidence class | extraction outcome | contract attempted | canonical axis | reason |",
    "|---|---|---|---|---|---|---|---|",
    ...sourceRows,
    "",
    "Four local trial sources yielded validity lessons rather than hardness candidates. Four first-party",
    "incidents and two protocol boundaries consumed the six contract attempts. Kafka and Kubernetes were",
    "preserved as measured below-cap outcomes. Every source has one canonical extraction and pinned bytes",
    "or a local directory-manifest digest.",
    "",
    "## Contract-Complete Queue",
    "",
    "| candidate | source | derivation | citations / sections / depth / negative | gate | score | queue | causal axis | unresolved risks |",
    "|---|---|---|---|---|---:|---|---|---|",
    ...candidateRows,
    "",
    "Ranking used source support, structural completeness, isolation evidence, derivation strength, and",
    "validity-risk penalties. Measured operator uplift was zero for every candidate because Phase 14 found",
    "no demonstrated positive agent effect. Machine gate passage was not treated as reader survival or",
    "hardness evidence.",
    "",
    "## Blind Reader Gate",
    "",
    "The original preflight is retained as chronology rather than rewritten after authentication changed:",
    "",
    "| provider family | preflight command | authenticated then | observation |",
    "|---|---|---|---|",
    ...providerRows,
    "",
    `Container runtime available then: **${yesNo(initialPreflight.containerRuntime.available)}**. ${initialPreflight.containerRuntime.observation}`,
    `The continuation normalizer B6 was usable **${yesNo(normalizerB6.usable)}** with known-good pass, stale known-bad failure, malformed refusal, and nondegenerate controls in one invocation.`,
    "",
    "| candidate | provider | verdict | earliest non-pass | runtime | priced cost |",
    "|---|---|---|---|---:|---:|",
    ...reviewRows,
    "",
    "| candidate | 2-of-2 outcome | reads | reason |",
    "|---|---|---:|---|",
    ...decisionRows,
    "",
    `All ${continuation.summary.reviewsCompleted} registered reads completed. Priced Anthropic spend was **$${continuation.summary.pricedReaderSpendUsd.toFixed(4)}**; ${continuation.summary.unpricedReads} OpenAI reads lack provider cost telemetry and are unpriced, not free.`,
    "The capacity candidate was independently killed for missing callable/index semantics and for a host",
    "safety guard that made the headline safety metric non-discriminating. BGP was independently killed",
    "because its hidden edit-target dimension was absent from public input; one reader also found an",
    "always-refuse strategy that passed all declared checks. Backup split because one reader accepted",
    "conventional facade semantics while the other refused to supply unstated return schemas.",
    "Only multi-name CAA identity binding passed all six dimensions for both provider families.",
    "",
    "## Probe Gate",
    "",
    "| candidate | outcome | B6 usable | mechanism active | observed mutant failures | reason |",
    "|---|---|---|---|---|---|",
    ...probeRows,
    "",
    "Only the unanimous CAA candidate was eligible. In one invocation its reference passed, the narrow",
    "first-name-reuse mutant failed exactly `check-caa-per-name-binding` and `check-caa-safe-issuance`,",
    "malformed input was refused, replay was deterministic, the mechanism activated, the authority witness",
    "remained inaccessible, and the challenge did not leak it. The other three probes were not run.",
    "",
    "## Method Comparison",
    "",
    "| method | systems/sources | drafts | reader survivors/reviewed | probe survivors/run | domains | axes | reads | priced cost | claim boundary |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---|",
    ...methodRows,
    "",
    "Discovery V3 improves the project's prospective result from zero reader survivors to one reader-and-",
    "probe survivor. It does not establish repeatable discovery yield, family breadth, or difficulty. Search",
    "labour was not timed, and four reads are unpriced. Transfer still has more local package survivors, but",
    "Phase 14's subjects solved all eight transfer cells.",
    "",
    "## Decision And Next Gate",
    "",
    `The registered decision is **\`${continuation.summary.decision}\`**: ${continuation.conclusion}`,
    "Do not run the planned multi-family Phase 17 build yet. The next phase should repeat Discovery V3 on",
    "a fresh bounded corpus, treating CAA only as a retrospective calibration fixture and requiring the",
    "same 2-of-2 reader and B6 probe gates. BUILD unlocks only when at least two candidates survive from",
    "independent incidents and at least two causal axes.",
    "",
    "## Corrections And Limits",
    "",
    ...corrections.corrections.map((correction) => `- ${correction}`),
    "- The original null reader/probe result was correct when recorded; it is preserved in the base artifacts",
    "  and superseded, not rewritten, by the separately preregistered continuation.",
    "- Six machine-complete contracts became four packets and only one reader survivor. The contract gate",
    "  catches missing fields, not contradictions, null policies, or all forms of non-discriminating grading.",
    "- A reader split is a kill under the frozen 2-of-2 rule. Backup cannot be repaired and counted inside",
    "  this run even though its missing facade schemas appear repairable.",
    "- The CAA result is candidate validity plus local mutant discrimination. It is not an agent solve-rate,",
    "  capability attribution, task family, shipped task, or production-yield estimate.",
    "- Local timestamps and transcript ordering establish local chronology only, not independent third-party",
    "  proof. Review outputs, metadata, transcripts, and normalized records are preserved and hashed.",
    "",
    "## Reproducibility Inputs",
    "",
    "| input | SHA-256 |",
    "|---|---|",
    ...hashRows,
    `| continuationPreregistration | \`${PHASE16_CONTINUATION_PREREGISTRATION_SHA256}\` |`,
    `| readerInstructions | \`${continuationRegistration.frozenReviewContract.readerInstructionsSha256}\` |`,
    `| probeImplementation | \`${continuationRegistration.frozenReviewContract.probeImplementationSha256}\` |`,
    `| finalRawReviewSet | \`${continuation.rawReviewSetSha256}\` |`,
    `| finalNormalizedReviewSet | \`${continuation.normalizedReviewSetSha256}\` |`,
    "",
    "The dedicated verifier regenerates every Phase 16 result view and this report byte for byte. Focused",
    "tests cover calibration, malformed refusal, evidence binding, caps, blinding, exact review closure,",
    "2-of-2 promotion, reader-gated probe execution, exact mutant fatality, and the final decision. The long",
    "repository-wide report walk remains deferred to the operator's periodic cadence.",
    "",
  ].join("\n");
}
