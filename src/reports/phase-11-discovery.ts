import { existsSync } from "node:fs";
import { join } from "node:path";
import { BUILT_FAMILY_IDS } from "../families/registry.js";
import { MEASURED_DEFAULTS, planBudget } from "../foundry/budget.js";
import { fail } from "../foundry/schema.js";
import { readFamilyTrials } from "../trials/directory.js";
import { DIFFICULTY_EVIDENCE_CAUSES } from "../trials/root-cause.js";
import { NEVER_COUNTS, summarise } from "../trials/types.js";

interface AxisEvidence {
  readonly source: string;
  readonly location: string;
  readonly finding: string;
}

interface DiscoveryReader {
  readonly reader: string;
  readonly providerFamily: string;
  readonly verdict: string;
  readonly earliestScreen: string;
  readonly classification: string;
  readonly confidence: number;
  readonly additionalFinding: string;
}

interface DiscoverySystem {
  readonly order: number;
  readonly system: string;
  readonly authoritativeSources: readonly string[];
  readonly documentsRead: number;
  readonly sectionsRead: number;
  readonly boundary: string;
  readonly committedValue: string | null;
  readonly draftedCandidate: boolean;
  readonly survivedIndependentReading: boolean;
  readonly authorAdvancedToStep: number;
  readonly finalDeathStep: number;
  readonly deathReason: string;
  readonly independentReaders?: readonly DiscoveryReader[];
  readonly novelty?: string;
}

export interface Phase11Results {
  readonly phase: 11;
  readonly title: string;
  readonly axisDerivation: {
    readonly rule: string;
    readonly agentVisibleEvidence: readonly AxisEvidence[];
    readonly hiddenVerifierEvidence: AxisEvidence;
    readonly attemptedDerivation: {
      readonly citationCount: number;
      readonly sectionCount: number;
      readonly inferenceDepth: number;
      readonly negativeInference: boolean;
      readonly chainWritable: boolean;
      readonly loadBearingInference: string;
    };
    readonly classification: string;
    readonly verdict: string;
    readonly trialLabelEffect: string;
  };
  readonly discovery: {
    readonly procedureSource: string;
    readonly preregistrationSource: string;
    readonly prediction: {
      readonly survivors: number;
      readonly outOfSystems: number;
      readonly result: string;
    };
    readonly systems: readonly DiscoverySystem[];
    readonly systemsSearched: number;
    readonly draftedCandidates: number;
    readonly independentReaderPasses: number;
    readonly survivors: number;
    readonly documentsRead: number;
    readonly sectionsRead: number;
    readonly costPerSurvivor: number | null;
    readonly conclusion: string;
  };
  readonly measurement: {
    readonly decision: string;
    readonly parent: {
      readonly previousRepoCountableZeroSolveTrials: number;
      readonly phase10ReportedTrials: number;
      readonly phase10RepoCountableTrials: number;
      readonly currentRepoCountableZeroSolveTrials: number;
      readonly targetZeroSolveTrials: number;
      readonly difficultyEvidencedTrials: number;
      readonly reportedSpendUsd: number;
      readonly spendProvenance: string;
    };
    readonly descendant: {
      readonly registeredTrials: number;
      readonly completedTrials: number;
      readonly selfCheckGreen: number | null;
      readonly failureDistribution: string | null;
      readonly agentSolveRate: number | null;
    };
    readonly blockers: readonly string[];
    readonly b6: {
      readonly implementation: string;
      readonly test: string;
      readonly status: string;
      readonly newPassFailRigIntroduced: boolean;
    };
  };
  readonly economics: {
    readonly descendantBuildHours: {
      readonly value: number;
      readonly provenance: string;
      readonly caveat: string;
    };
    readonly hoursPerFamily: {
      readonly currentModelValue: number;
      readonly provenance: string;
      readonly declaredShapeRange: readonly [number, number];
      readonly declaredShapeMean: number;
      readonly declaredShapeMedian: number;
    };
    readonly phase10NativeTrials: {
      readonly codexReportedUsd: number;
      readonly opusReportedUsd: number;
      readonly opusToCodexRatio: number;
      readonly provenance: string;
    };
    readonly a2Differential: {
      readonly countedUsd: number;
      readonly includingLossesUsd: number;
      readonly provenance: string;
    };
    readonly screens: {
      readonly forwardGateOne: string;
      readonly fullSpecProbe: string;
      readonly mechanical: string;
      readonly discovery: string;
    };
    readonly modelledBuildsPerShip: {
      readonly benchmarkBar: {
        readonly bar: string;
        readonly expectedBuilds: number;
        readonly basis: string;
      };
      readonly takeHomeBar: {
        readonly solveRateBand: readonly [number, number];
        readonly sixOfSixFailures: { readonly expectedBuildsRange: readonly [number, number] };
        readonly atLeastFiveOfSixFailures: { readonly expectedBuildsRange: readonly [number, number] };
        readonly provenance: string;
      };
    };
  };
  readonly corrections: readonly string[];
  readonly recommendation: string;
}

export interface Phase10Summary {
  readonly trials: readonly { readonly runId: string; readonly costUsd: number; readonly counts: boolean }[];
  readonly parentTally: {
    readonly after: { readonly cleanZeroSolve: number; readonly upperBound95: number };
    readonly originallyReportedAfter?: { readonly cleanZeroSolve: number; readonly upperBound95: number };
  };
  readonly theDistinctionThisTrialForces: { readonly detail: string };
}

export interface ReportedTrialAudit {
  readonly runId: string;
  readonly directoryPresent: boolean;
  readonly countableArtifactsPresent: boolean;
  readonly labelArtifactPresent: boolean;
  readonly missing: readonly string[];
  readonly validationError: string | null;
}

export interface Phase11EvidenceAudit {
  readonly reported: readonly ReportedTrialAudit[];
  readonly repoCountableTrials: number;
  readonly repoCountableZeroSolveTrials: number;
  readonly difficultyEvidencedFailures: number;
  readonly descendantRegistered: boolean;
  readonly descendantPackagePresent: boolean;
}

const COUNTABLE_ARTIFACTS = [
  "metadata.json",
  "challenge",
  "submission",
  "transcript.txt",
  "verifier-output.json",
  "result.json",
  "countability.json",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Minimal refusal parser: the renderer may not turn a malformed hand-edited ledger into prose. */
export function parsePhase11Results(value: unknown, path = "phase-11-results"): Phase11Results {
  if (!isRecord(value) || value["phase"] !== 11) {
    fail("E_SHAPE", path, "expected a Phase 11 result object");
  }
  const axis = value["axisDerivation"];
  const discovery = value["discovery"];
  const measurement = value["measurement"];
  const economics = value["economics"];
  if (!isRecord(axis) || axis["classification"] !== "A1") {
    fail("E_SHAPE", `${path}.axisDerivation`, "the settled axis must carry its A1 verdict");
  }
  if (!isRecord(discovery) || !Array.isArray(discovery["systems"])) {
    fail("E_SHAPE", `${path}.discovery`, "expected the ordered system-search ledger");
  }
  if (discovery["systemsSearched"] !== discovery["systems"].length) {
    fail(
      "E_SHAPE",
      `${path}.discovery.systemsSearched`,
      "the headline system count must equal the recorded systems",
    );
  }
  const systems = discovery["systems"];
  if (!systems.every(isRecord)) {
    fail("E_SHAPE", `${path}.discovery.systems`, "every system must be an object");
  }
  const numericTotal = (key: "documentsRead" | "sectionsRead"): number =>
    systems.reduce((total, system) => total + (typeof system[key] === "number" ? system[key] : 0), 0);
  const countTrue = (key: "draftedCandidate" | "survivedIndependentReading"): number =>
    systems.filter((system) => system[key] === true).length;
  if (
    discovery["documentsRead"] !== numericTotal("documentsRead") ||
    discovery["sectionsRead"] !== numericTotal("sectionsRead") ||
    discovery["draftedCandidates"] !== countTrue("draftedCandidate") ||
    discovery["survivors"] !== countTrue("survivedIndependentReading")
  ) {
    fail("E_SHAPE", `${path}.discovery`, "headline search totals must be derived from the system rows");
  }
  if (!isRecord(measurement) || !Array.isArray(measurement["blockers"])) {
    fail("E_SHAPE", `${path}.measurement`, "expected an explicit measurement decision");
  }
  if (!isRecord(economics) || !Array.isArray(value["corrections"])) {
    fail("E_SHAPE", `${path}.economics`, "expected economics and correction ledgers");
  }
  return value as unknown as Phase11Results;
}

export function parsePhase10Summary(value: unknown, path = "phase-10-trials"): Phase10Summary {
  if (!isRecord(value) || !Array.isArray(value["trials"])) {
    fail("E_SHAPE", path, "expected the Phase 10 trial-summary object");
  }
  return value as unknown as Phase10Summary;
}

/** Exact one-sided Clopper-Pearson upper limit for zero successes. */
export function zeroSolveUpper95(trials: number): number {
  if (!Number.isInteger(trials) || trials <= 0) {
    throw new RangeError("zeroSolveUpper95 requires a positive integer trial count");
  }
  return 1 - 0.05 ** (1 / trials);
}

export function minimumZeroSolveTrials(upperBound: number): number {
  if (!(upperBound > 0 && upperBound < 1)) {
    throw new RangeError("minimumZeroSolveTrials requires a bound between zero and one");
  }
  return Math.ceil(Math.log(0.05) / Math.log(1 - upperBound));
}

export function auditPhase11Evidence(root: string, phase10: Phase10Summary): Phase11EvidenceAudit {
  const familyId = "durable-approval-outbox";
  const familyRoot = join(root, "trials", familyId);
  const familyTrials = readFamilyTrials(join(root, "trials"), familyId);
  const counted = familyTrials.filter(
    (trial) =>
      trial.record.subjectType === "agent" && trial.record.counts && !NEVER_COUNTS.has(trial.record.status),
  );
  const failed = counted.filter((trial) => !summarise(trial.record).passed);
  const difficulty = failed.filter((trial) => DIFFICULTY_EVIDENCE_CAUSES.has(trial.rootCause.label));

  const reported = phase10.trials.map((trial): ReportedTrialAudit => {
    const dir = join(familyRoot, trial.runId);
    const missing = COUNTABLE_ARTIFACTS.filter((name) => !existsSync(join(dir, name)));
    const directoryPresent = existsSync(dir);
    let validationError: string | null = null;
    if (directoryPresent && missing.length === 0) {
      try {
        const preserved = familyTrials.find((candidate) => candidate.runId === trial.runId);
        if (preserved === undefined) validationError = "directory was not accepted by the trial loader";
      } catch (error) {
        validationError = error instanceof Error ? error.message : String(error);
      }
    }
    return {
      runId: trial.runId,
      directoryPresent,
      countableArtifactsPresent: missing.length === 0 && validationError === null,
      labelArtifactPresent: existsSync(join(dir, "root-cause.json")),
      missing,
      validationError,
    };
  });

  return {
    reported,
    repoCountableTrials: counted.length,
    repoCountableZeroSolveTrials: failed.length,
    difficultyEvidencedFailures: difficulty.length,
    descendantRegistered: (BUILT_FAMILY_IDS as readonly string[]).includes("dao-descendant"),
    descendantPackagePresent:
      existsSync(join(root, "tasks", "dao-descendant")) ||
      existsSync(join(root, "families", "dao-descendant")) ||
      existsSync(join(root, "src", "families", "dao-descendant")),
  };
}

const esc = (value: string): string => value.replace(/\|/g, "\\|");
const usd = (value: number): string => `$${value.toFixed(2)}`;
const fmt = (value: number): string => value.toFixed(3);
const link = (url: string): string => `[source](${url})`;

export function renderPhase11DiscoveryReport(input: {
  readonly root: string;
  readonly results: Phase11Results;
  readonly phase10: Phase10Summary;
}): string {
  const { results, phase10 } = input;
  const audit = auditPhase11Evidence(input.root, phase10);
  const parentN = audit.repoCountableZeroSolveTrials;
  const reportedN =
    phase10.parentTally.originallyReportedAfter?.cleanZeroSolve ?? phase10.parentTally.after.cleanZeroSolve;
  const targetN = results.measurement.parent.targetZeroSolveTrials;
  const benchmarkMinimum = minimumZeroSolveTrials(0.3);
  const budgetInputs = { ...MEASURED_DEFAULTS, totalUsd: 100_000, labourRateUsdPerHour: 120 };
  const budget = planBudget(budgetInputs);
  const systems = [...results.discovery.systems].sort((a, b) => a.order - b.order);
  const readers = systems.flatMap((system) =>
    (system.independentReaders ?? []).map((reader) => ({ system: system.system, ...reader })),
  );
  const takeHome = results.economics.modelledBuildsPerShip.takeHomeBar;

  const auditRows = audit.reported.map(
    (trial) =>
      `| \`${trial.runId}\` | ${trial.directoryPresent ? "yes" : "no"} | ${trial.countableArtifactsPresent ? "yes" : "no"} | ${trial.labelArtifactPresent ? "yes" : "no"} | ${trial.missing.length === 0 ? (trial.validationError ?? "none") : trial.missing.map((name) => `\`${name}\``).join(", ")} |`,
  );
  const axisRows = results.axisDerivation.agentVisibleEvidence.map(
    (row) => `| \`${esc(row.source)}\` | ${esc(row.location)} | ${esc(row.finding)} |`,
  );
  const searchRows = systems.map(
    (system) =>
      `| ${system.order} | ${esc(system.system)} | ${system.authorAdvancedToStep} | **${system.finalDeathStep}** | ${system.draftedCandidate ? "yes" : "no"} | ${esc(system.deathReason)} |`,
  );
  const readerRows = readers.map(
    (reader) =>
      `| ${esc(reader.reader)} | ${esc(reader.providerFamily)} | **${esc(reader.verdict)}** | ${esc(reader.earliestScreen)} | ${esc(reader.classification)} | ${reader.confidence.toFixed(2)} |`,
  );
  const sourceRows = systems.map(
    (system) =>
      `| ${esc(system.system)} | ${system.documentsRead} | ${system.sectionsRead} | ${system.authoritativeSources.map(link).join(" ")} |`,
  );
  const correctionRows = results.corrections.map((correction, index) => `${index + 1}. ${correction}`);
  const blockerRows = results.measurement.blockers.map((blocker) => `- ${blocker}`);

  return [
    "# Phase 11 - discovery verdict",
    "",
    `**${results.discovery.conclusion}**`,
    "",
    `The preregistration predicted ${results.discovery.prediction.survivors} survivor from ${results.discovery.prediction.outOfSystems} systems. The result was **${results.discovery.survivors}**. ${results.discovery.draftedCandidates} candidate was drafted, all ${readers.length} independent readers killed it at the first screen, and the other ${results.discovery.systemsSearched - results.discovery.draftedCandidates} systems died before a candidate was warranted. The prediction was **${results.discovery.prediction.result}**.`,
    "",
    `**Recommendation:** ${results.recommendation}`,
    "",
    "## Audit before action",
    "",
    "Phase 10's two rows are summaries without the durable trial directories this repository requires.",
    "Phase 10 originally marked them `counts: true`. That flag is now withdrawn: a trial that cannot",
    "be re-graded does not become countable because its summary describes a clean run.",
    "",
    "| reported run | directory | countability artifacts | root-cause artifact | missing / invalid |",
    "|---|---:|---:|---:|---|",
    ...auditRows,
    "",
    `The repository therefore supports **${audit.repoCountableZeroSolveTrials} clean zero-solve parent trials**, not ${reportedN}. The current one-sided 95% upper bound is **p <= ${fmt(zeroSolveUpper95(parentN))}**. The reported ${reportedN}-trial bound, ${fmt(zeroSolveUpper95(reportedN))}, is arithmetically correct but not repo-countable. The reported ${usd(results.measurement.parent.reportedSpendUsd)} remains a spend claim, not re-gradeable trial evidence.`,
    "",
    `The ${audit.repoCountableZeroSolveTrials} preserved failures contain **${audit.difficultyEvidencedFailures} capability-labelled failures**. Phase 10's Codex label and split Claude label also lack the evidence packets they describe. Difficulty evidence remains zero.`,
    "",
    `Current repository state: the descendant is registered as a built family: **${audit.descendantRegistered ? "yes" : "no"}**. An executable in-repo package exists: **${audit.descendantPackagePresent ? "yes" : "no"}**. At the Phase 11 decision point neither existed; the Phase 9 scenario-selection and screen JSON alone were evidence about a proposed package, not a challenge package an agent could run.`,
    "",
    "The brief's dead `reports/PHASE-10-MEASURED.md` reference was repaired to point at the Phase 10 data files. Creating another hand-authored measurement report would have enlarged the prose-drift problem it was meant to document.",
    "",
    "## IN_DOUBT -> LEASED",
    "",
    `**Verdict: ${results.axisDerivation.classification}. ${results.axisDerivation.verdict}**`,
    "",
    "The derivation test uses only text visible to the agent:",
    "",
    "| source | location | finding |",
    "|---|---|---|",
    ...axisRows,
    "",
    `Profile: ${results.axisDerivation.attemptedDerivation.citationCount} citations across ${results.axisDerivation.attemptedDerivation.sectionCount} sections, inference depth ${results.axisDerivation.attemptedDerivation.inferenceDepth}, load-bearing negative inference **${results.axisDerivation.attemptedDerivation.negativeInference ? "yes" : "no"}**, chain writable **${results.axisDerivation.attemptedDerivation.chainWritable ? "yes" : "no"}**. Under the taxonomy, an unwritable chain is A1; the numerical profile would already be fragile A2/A4 if a chain existed.`,
    "",
    results.axisDerivation.attemptedDerivation.loadBearingInference,
    "",
    `The hidden verifier's \`LEGAL\` table does reject this edge (${results.axisDerivation.hiddenVerifierEvidence.location}). That proves it is graded; it does not make the hidden restriction derivable. ${results.axisDerivation.trialLabelEffect}`,
    "",
    "## Registered search",
    "",
    `Procedure: \`${results.discovery.procedureSource}\`. Preregistration: \`${results.discovery.preregistrationSource}\`. The targets and one-survivor prediction were written before the target specifications were opened.`,
    "",
    "| order | real system | author reached | final death step | candidate drafted | result |",
    "|---:|---|---:|---:|---:|---|",
    ...searchRows,
    "",
    "The Git entry is the important correction. The author advanced it through step 5. Independent",
    "reading moved the failure back to step 3: exact old/new OIDs were already durable, so reconstructing",
    "the intended update is more natural than creating a new commit. It also fails screen 1 because the",
    "current remote tip is readable and can be compared directly with the durable intended OID.",
    "",
    "| reader | provider family | verdict | earliest screen | classification | confidence |",
    "|---|---|---|---|---|---:|",
    ...readerRows,
    "",
    "Both readers were independent OpenAI subagents and were withheld the preregistration and author",
    "verdict. This satisfies independent reading, not the cross-provider blind-labelling rule used for",
    "difficulty evidence. No root-cause claim is unlocked by these reads.",
    "",
    "| system | authoritative documents | cited sections | sources |",
    "|---|---:|---:|---|",
    ...sourceRows,
    "",
    `Observed discovery cost: **${results.discovery.systemsSearched} systems, ${results.discovery.documentsRead} authoritative documents, ${results.discovery.sectionsRead} cited sections, and ${results.discovery.independentReaderPasses} reader passes for zero survivors**. Cost per survivor is therefore **not finite / not estimable**, not zero.`,
    "",
    "## Measurement decision",
    "",
    `Decision: **${results.measurement.decision}**. Descendant and additional parent trials were not run.`,
    "",
    audit.descendantPackagePresent
      ? "The blockers below are the historical Phase 11 blockers. Phase 12 has since resolved the package and durable-capture blocker; it has not created agent-trial evidence."
      : "The blockers below remain current.",
    "",
    ...blockerRows,
    "",
    `B6 remains present at \`${results.measurement.b6.implementation}\` with ${results.measurement.b6.status}. This phase introduced no new pass/fail rig, so it created no invocation that could legitimately claim matrix evidence without controls.`,
    "",
    "| evidence row | trials | solves | p-hat | one-sided 95% upper bound | status |",
    "|---|---:|---:|---:|---:|---|",
    `| parent, repo-countable | ${parentN} | 0 | 0.000 | ${fmt(zeroSolveUpper95(parentN))} | measured and re-gradeable |`,
    `| parent, Phase 10 summary claim | ${reportedN} | 0 | 0.000 | ${fmt(zeroSolveUpper95(reportedN))} | **not countable; artifacts absent** |`,
    `| parent target | ${targetN} | 0 | 0.000 | ${fmt(zeroSolveUpper95(targetN))} | not reached |`,
    `| descendant | 0 | - | - | - | ${audit.descendantPackagePresent ? "package absent at the Phase 11 decision; packaged in Phase 12, still no trials" : "no executable package, no trials"} |`,
    "",
    `At the benchmark bar of solve rate <= 0.30, zero solves need at least ${benchmarkMinimum} clean trials (n=${benchmarkMinimum} gives ${fmt(zeroSolveUpper95(benchmarkMinimum))}); the repo-countable parent evidence does not clear it. At the take-home bar, the parent has an observed ${parentN}/${parentN} failure artifact but zero capability-attributed failures, while the descendant has no trial evidence. Self-check coverage and failure concentration are **not measured**; kill signals 2-4 are not evaluable.`,
    "",
    "## Economics",
    "",
    "| input | value | status |",
    "|---|---:|---|",
    `| descendant build time | ${results.economics.descendantBuildHours.value.toFixed(2)} h | ${esc(results.economics.descendantBuildHours.provenance)}; ${esc(results.economics.descendantBuildHours.caveat)} |`,
    `| from-scratch \`hoursPerFamily\` | ${results.economics.hoursPerFamily.currentModelValue} h | **${results.economics.hoursPerFamily.provenance}**; declared shapes span ${results.economics.hoursPerFamily.declaredShapeRange[0]}-${results.economics.hoursPerFamily.declaredShapeRange[1]} h, mean ${results.economics.hoursPerFamily.declaredShapeMean}, median ${results.economics.hoursPerFamily.declaredShapeMedian} |`,
    `| Phase 10 Codex trial | ${usd(results.economics.phase10NativeTrials.codexReportedUsd)} | ${esc(results.economics.phase10NativeTrials.provenance)} |`,
    `| Phase 10 Opus trial | ${usd(results.economics.phase10NativeTrials.opusReportedUsd)} (${results.economics.phase10NativeTrials.opusToCodexRatio.toFixed(1)}x Codex) | ${esc(results.economics.phase10NativeTrials.provenance)} |`,
    `| A2 differential | ${usd(results.economics.a2Differential.countedUsd)} counted / ${usd(results.economics.a2Differential.includingLossesUsd)} with losses | ${esc(results.economics.a2Differential.provenance)} |`,
    `| forward kill | ${esc(results.economics.screens.forwardGateOne)} | measured |`,
    `| full spec probe | ${esc(results.economics.screens.fullSpecProbe)} | measured |`,
    `| mechanical screens | ${esc(results.economics.screens.mechanical)} | observed order of magnitude |`,
    `| this discovery search | ${esc(results.economics.screens.discovery)} | measured this phase |`,
    "",
    "Expected builds per shipped task are not one number:",
    "",
    "| acceptance bar | expected builds / ship | provenance |",
    "|---|---:|---|",
    `| benchmark solve rate <= 30% | ${results.economics.modelledBuildsPerShip.benchmarkBar.expectedBuilds.toFixed(2)} | ${esc(results.economics.modelledBuildsPerShip.benchmarkBar.basis)} |`,
    `| take-home 6/6 failures | ${takeHome.sixOfSixFailures.expectedBuildsRange[0].toFixed(2)}-${takeHome.sixOfSixFailures.expectedBuildsRange[1].toFixed(2)} | modelled over p=${takeHome.solveRateBand[0].toFixed(2)}-${takeHome.solveRateBand[1].toFixed(2)} |`,
    `| take-home at least 5/6 failures | ${takeHome.atLeastFiveOfSixFailures.expectedBuildsRange[0].toFixed(2)}-${takeHome.atLeastFiveOfSixFailures.expectedBuildsRange[1].toFixed(2)} | modelled over p=${takeHome.solveRateBand[0].toFixed(2)}-${takeHome.solveRateBand[1].toFixed(2)} |`,
    "",
    `The take-home rows are modelled, not measured production yield. At p=${takeHome.solveRateBand[0].toFixed(2)}, six failures cost about one success per ${(1 / (1 - takeHome.solveRateBand[0]) ** 6).toFixed(2)} builds; at p=${takeHome.solveRateBand[1].toFixed(2)}, about one per ${(1 / (1 - takeHome.solveRateBand[1]) ** 6).toFixed(2)}. The registered screens are cheap relative to the estimated build range, but this search establishes no finite search-to-survivor rate.`,
    "",
    `The existing ${usd(budgetInputs.totalUsd)} model yields ${budget.families} families at its optimistic ${budgetInputs.hoursPerFamily}-hour input, not 1,000 deliverables.`,
    "With discovery unproved, the defensible allocation is boundary-first search, cheap independent",
    "screening, and selective descendant builds only after a candidate survives. Bulk production would",
    "multiply an unmeasured discovery yield by an estimated build cost.",
    "",
    "## Corrections and limits",
    "",
    ...correctionRows,
    "",
    "The common failure is trusting a confident summary without checking the artifact it names. Phase 11",
    "does not repair that with another claim: this report is generated from the structured ledger, the",
    "checked-in trial directories, and formulas exercised by tests.",
    "",
    "## Answer",
    "",
    `Three real systems were searched in registered order. **${results.discovery.draftedCandidates} candidate was drafted; ${results.discovery.survivors} survived independent reading.** Discovery cost is ${results.discovery.documentsRead} authoritative documents, ${results.discovery.sectionsRead} cited sections, and ${results.discovery.independentReaderPasses} reader passes with no finite per-survivor estimate. \`IN_DOUBT -> LEASED\` is A1, not a second capability axis. The repo-supported parent bound remains p <= ${fmt(zeroSolveUpper95(parentN))}; descendant agent evidence remains unmeasured.`,
    "",
    "**On this evidence, the foundry screens reliably but has not demonstrated discovery. Search, screen,",
    "and build only what survives; do not price bulk production as though discovery yield were known.**",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
}
