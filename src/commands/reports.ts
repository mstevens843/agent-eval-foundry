import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  adversarialContainerBundlePath,
  verifyContainerIsolationBundle,
} from "../adversarial-audit/container.js";
import { isolationSummaryPath, verifyIsolationBundle } from "../adversarial-audit/isolation.js";
import { runAllAdversarialHardeningProbes } from "../adversarial-audit/probes.js";
import {
  ADVERSARIAL_PACKAGE_FAMILIES,
  adversarialBundlePath,
  adversarialCampaignPath,
  auditAdversarialReadinessForFamilies,
  loadAdversarialCampaigns,
  verifierHashFor,
} from "../adversarial-audit/readiness.js";
import {
  adversarialGateEvidenceMap,
  loadAdversarialAttackRecords,
  summarizeAdversarialEvidence,
} from "../adversarial-audit/records.js";
import {
  renderAdversarialAuditReport,
  renderAdversarialCampaignReport,
  renderAdversarialContainerIsolationReport,
  renderAdversarialExploitReplayReport,
  renderAdversarialHardeningProbesReport,
  renderAdversarialImportReport,
  renderAdversarialIsolationReport,
  renderAdversarialReadinessReport,
  renderAdversarialV2Report,
} from "../adversarial-audit/report.js";
import { type MeasureOptions, measure } from "../axis-meter.js";
import { checkChallengePackage } from "../challenge/package-check.js";
import {
  auditDeploymentAliasExternalPackets,
  loadExternalIntakeResults,
  renderExternalIntakeReport,
} from "../external-intake/report.js";
// Aggregate report composition. Domain services and read-only evidence inputs stay separate.
import * as daoDescendant from "../families/dao-descendant/runner.js";
import { referenceFailures, runFamily } from "../families/prompt-injection-containment/runner.js";
import { enumerateSpace } from "../families/prompt-injection-containment/scenarios.js";
import { BUILT_FAMILIES, BUILT_FAMILY_IDS, builtFamily } from "../families/registry.js";
import { readBrowserBackedMeasurement } from "../families/ui-replay-browser-backed/measurement.js";
import { browserBackedReadiness } from "../families/ui-replay-browser-backed/readiness.js";
import * as liveMutants from "../families/ui-replay-live-dom/mutants.js";
import * as liveDom from "../families/ui-replay-live-dom/runner.js";
import * as liveScenarios from "../families/ui-replay-live-dom/scenarios.js";
import * as liveSpec from "../families/ui-replay-live-dom/spec.js";
import * as liveVerify from "../families/ui-replay-live-dom/verify.js";
import { planAdaptiveFunnel } from "../foundry/adaptive-funnel.js";
import { assertBudgetInputs, assertPlanHonest } from "../foundry/budget-check.js";
import { MEASURED_DEFAULTS, planBudget } from "../foundry/budget.js";
import { summarizeDiscoveryWorkbench } from "../foundry/discovery-workbench.js";
import { OPERATORS } from "../foundry/evolve.js";
import { parseHardnessOperatorLedger } from "../foundry/hardness-ledger.js";
import {
  evaluateLineages,
  lineageFeedbackForDiscovery,
  planPortfolioReallocation,
} from "../foundry/lineage.js";
import {
  loadAdaptiveFunnel,
  loadDiscoveryWorkbench,
  loadLineages,
  loadProbeDefinitions,
  loadProbeRunSummary,
  loadPromotions,
  loadRegistry,
} from "../foundry/load.js";
import { familyLoop, loopAll } from "../foundry/loop.js";
import { probeEvidenceForDiscovery } from "../foundry/probe-runner.js";
import { evaluateProductionReadiness } from "../foundry/production-readiness.js";
import { promotedFamilyRecords, promotionEvidenceForDiscovery } from "../foundry/promotion.js";
import { coverage } from "../foundry/registry.js";
import { SHAPE_PROSE } from "../foundry/shape-prose.js";
import { shapeFromFamily } from "../foundry/shape-sync.js";
import { parseTaskShape } from "../foundry/validate.js";
import { auditHumanReadinessForFamilies } from "../human-solvability/readiness.js";
import {
  humanGateEvidenceMap,
  loadHumanReviewRecords,
  summarizeHumanEvidence,
} from "../human-solvability/records.js";
import { renderHumanReadinessReport, renderHumanSolvabilityReport } from "../human-solvability/report.js";
import { measurementContext } from "../measurement-context.js";
import { renderReport } from "../report.js";
import { renderAccessTokenSmokeDiagnosis } from "../reports/access-token-diagnosis.js";
import {
  ACCESS_TOKEN_EVOLUTION_FAMILY,
  ACCESS_TOKEN_EVOLUTION_PROBE,
  renderAccessTokenEvolutionReport,
} from "../reports/access-token-evolution-report.js";
import { renderAdaptiveFunnelReport } from "../reports/adaptive-funnel-report.js";
import { analyseFamilyTrials } from "../reports/agent-results.js";
import { type CombinedResult, renderBankCompletion } from "../reports/bank-completion-report.js";
import { renderHistoricalReport } from "../reports/bank-report.js";
import {
  renderSharedBankReport as renderBankReport,
  renderCrossFamilyAxisReport,
} from "../reports/bank-reports.js";
import { renderBrowserBackedReadiness } from "../reports/browser-backed-readiness.js";
import {
  renderBrowserBackedAxisReport,
  renderBrowserBackedReport,
} from "../reports/browser-backed-report.js";
import { BROWSER_BACKED_NEXT_PLAN, renderBrowserBackedScaffold } from "../reports/browser-backed-scaffold.js";
import { renderBudgetReport } from "../reports/budget-report.js";
import { renderAgentResults, renderCampaignReport } from "../reports/campaign-report.js";
import { analyseChain, diversityTargets } from "../reports/chain-analysis.js";
import { renderDelegatedWalletSmokeDiagnosis } from "../reports/delegated-wallet-diagnosis.js";
import { renderDelegatedWalletFamilyReport } from "../reports/delegated-wallet-report.js";
import { renderDeploymentAliasSmokeDiagnosis } from "../reports/deployment-alias-diagnosis.js";
import {
  auditDeploymentAliasCrossLabBundles,
  renderDeploymentAliasAdversarialReadiness,
  renderDeploymentAliasCrossLabReadiness,
  renderDeploymentAliasHumanIntake,
  renderDeploymentAliasMatrixReadinessGap,
  renderDeploymentAliasProductionReadiness,
} from "../reports/deployment-alias-production.js";
import { renderDeploymentAliasFamilyReport } from "../reports/deployment-alias-report.js";
import { diagnose, renderDiagnoses } from "../reports/diagnosis.js";
import { computeCurve } from "../reports/difficulty.js";
import { renderDiscoveryWorkbenchReport } from "../reports/discovery-workbench-report.js";
import { type AxisProposal, renderDiversityUpgrade } from "../reports/diversity-upgrade.js";
import { renderEvidenceSnapshotReport } from "../reports/evidence-snapshot.js";
import {
  MEMORY_FAMILY,
  OUTBOX_FAMILY,
  PIC_FAMILY,
  UI_FAMILY,
  campaignFacts,
  countedAgentRecordsFor,
  countedRootCausesFor,
  familyEvidenceFor,
  familyEvidenceMapForShipReport,
  outboxHistory,
  outboxMatrix,
  providerSpend,
  trialLayerFacts,
} from "../reports/evidence.js";
import { renderEvolutionReport } from "../reports/evolution-report.js";
import { renderEvolutionValidation, validateOperator } from "../reports/evolution-validation.js";
import { renderFamilyReport } from "../reports/family-report.js";
import { renderGateReport } from "../reports/gate-report.js";
import { renderKillReport } from "../reports/kill-report.js";
import { renderFamilyDiversityReport, renderLedgerReport } from "../reports/ledger-report.js";
import { renderLifecycleReport } from "../reports/lifecycle-report.js";
import { renderLineageLearningReport } from "../reports/lineage-report.js";
import { renderLiveDomCodexDiagnosis } from "../reports/live-dom-diagnosis.js";
import { renderLiveDom } from "../reports/live-dom-report.js";
import { renderOrchestrationReport } from "../reports/orchestration-report.js";
import {
  parsePhase10Summary,
  parsePhase11Results,
  renderPhase11DiscoveryReport,
} from "../reports/phase-11-discovery.js";
import {
  renderDaoDescendantFoundation,
  renderHardnessOperatorLedger,
  renderPhase12FoundationSummary,
  renderVariantSchemaMigration,
} from "../reports/phase-12-foundation.js";
import { measurePhase13, renderPhase13TransferLab } from "../reports/phase-13-transfer.js";
import { renderPhase14OperatorEffects } from "../reports/phase-14-operator-effects.js";
import { renderPhase15DiscoveryEngine } from "../reports/phase-15-discovery-engine.js";
import { renderPhase16DiscoveryV3 } from "../reports/phase-16-discovery-v3.js";
import { renderPhase17CaaValidation } from "../reports/phase-17-caa-validation.js";
import { renderMechanismProbeReport } from "../reports/probe-runner-report.js";
import { renderPromotionReport } from "../reports/promotion-report.js";
import {
  renderDeploymentAliasEvolutionOptionsReport,
  renderDeploymentAliasProviderDeltaDiagnosisReport,
} from "../reports/provider-delta-diagnosis-report.js";
import { renderDeploymentAliasProviderDeltaReport } from "../reports/provider-delta-report.js";
import { describeArtifact, renderProviderVariance } from "../reports/provider-variance.js";
import { renderMechanismReport, renderMutantReport } from "../reports/registry-report.js";
import { renderSelfCheckBehavior } from "../reports/self-check-report.js";
import { renderShapeReport } from "../reports/shape-report.js";
import { measuredCells, renderSharedDifficultyBank } from "../reports/shared-difficulty.js";
import { assessFamily, familyStatusLabel, renderShipReport } from "../reports/ship-report.js";
import { renderSubmissionQuality } from "../reports/submission-quality.js";
import {
  renderStaleEvidenceRegression,
  renderThirdSubjectCampaign,
} from "../reports/third-subject-report.js";
import { renderTrialReadinessReport } from "../reports/trial-report.js";
import { renderUiUpgradeReport } from "../reports/ui-upgrade-report.js";
import { buildAgentBank } from "../trials/agent-bank.js";
import {
  type BankCompletion,
  assertCombinedWidthAllowed,
  bankCompletion,
} from "../trials/bank-completion.js";
import {
  combinedMatrixFor,
  computeOverlap,
  crossFamilyClaims,
  kindedBank,
  normalizeSubjectId,
} from "../trials/bank.js";
import { reconcile } from "../trials/campaign-run.js";
import { type CampaignPlan, evaluateKillSignal, loadCampaigns } from "../trials/campaign.js";
import { type TrialDirectory, readFamilyTrials } from "../trials/directory.js";
import type { EvidenceState } from "../trials/evidence-lifecycle.js";
import {
  MIGRATIONS,
  assertMigrationAccountsForLosses,
  assertMigrationDeclared,
  assertStaleRunsLabelled,
} from "../trials/migration.js";
import { measuredScenarios, scenarioSetId } from "../trials/orchestrate.js";
import { PROVIDERS, checkProvider, uninspectedProvider } from "../trials/provider-registry.js";
import { ROUTABLE_FAMILY_IDS, routeFor } from "../trials/router.js";
import { currentChallenge } from "../trials/run.js";
import { challengeHash } from "../trials/run.js";
import type { AxisReport, Matrix } from "../types.js";
import { flag } from "./arguments.js";
import { crossFamilyCommand } from "./assurance.js";
import {
  ACCESS_TOKEN_FAMILY_ID,
  DELEGATED_WALLET_FAMILY_ID,
  DEPLOYMENT_ALIAS_FAMILY_ID,
  accessTokenSmokeContext,
  adaptiveFamilyEvidenceInputs,
  delegatedWalletSmokeContext,
  deploymentAliasProviderDeltaInputs,
  deploymentAliasSmokeContext,
  killReportLineageContexts,
  lineageRuntimeEvidence,
  smokeFailureModelFamilies,
} from "./discovery.js";
import {
  analysisBase,
  qualityRowsFor,
  reportLedgers,
  selfCheckProfilesFor,
  subjectFailuresFor,
} from "./evidence.js";
import { sharedBankCommand } from "./trials.js";

/**
 * One completion picture per bank kind.
 *
 * Grouped by kind first because the kind decides which QUESTION is being asked — difficulty or
 * detection — and a completion that mixed them would produce a work list for a number nobody should
 * compute.
 */
export function completionsFor(
  banks: readonly ReturnType<typeof kindedBank>[],
  allTrials: readonly { familyId: string; trial: TrialDirectory }[],
  evidenceState: ReadonlyMap<string, EvidenceState>,
  providerAvailability = checkProvider,
): readonly BankCompletion[] {
  const trials = allTrials
    .filter(({ trial }) => trial.record.subjectType === "agent")
    .map(({ familyId, trial }) => ({
      familyId,
      runId: trial.runId,
      subjectId: normalizeSubjectId(trial.record.subjectId),
      state: evidenceState.get(trial.runId) ?? ("not-run" as EvidenceState),
      scenarioSetId: trial.record.scenarioSetId,
      countsReason: trial.record.countsReason,
    }));

  const kinds = [...new Set(banks.map((b) => b.kind))].sort();
  return kinds.map((kind) =>
    bankCompletion({
      providerAvailability,
      banks: banks.filter((b) => b.kind === kind),
      trials: trials.filter((t) => banks.some((b) => b.kind === kind && b.familyId === t.familyId)),
    }),
  );
}

/**
 * What the descendant's harness does that the parent's could not.
 *
 * Written by hand and checked against the code rather than generated: "is this more realistic" is a
 * judgement, and a table of judgements with the parent's behaviour beside each one is auditable in a
 * way a claim of realism is not.
 */
export const LIVE_DOM_GAINS: readonly { mechanic: string; parent: string; here: string }[] = [
  {
    mechanic: "tree mutability",
    parent: "immutable; one mutable boolean for the confirmation dialog",
    here: "acting changes the tree — regions mount late, get superseded, are removed, or are remounted under a new key",
  },
  {
    mechanic: "selector drift",
    parent: "`data-testid` only, and a mutation either renames it or does not",
    here: "testids, semantic anchors and structural paths can disagree, and the scenario decides which survives",
  },
  {
    mechanic: "disabled / enabled",
    parent: "attributes are static",
    here: "controls arm and disarm as a consequence of earlier steps, so a precondition can be satisfied later than it was recorded",
  },
  {
    mechanic: "asynchrony",
    parent: "`pending` is a string test on whether the selector contains 'async'",
    here: "a settle budget with regions that resolve after a stated number of observations — the source of the strict-vs-patient trade-off",
  },
  {
    mechanic: "stale state",
    parent: "none; the tree a step sees is the tree every step sees",
    here: "an earlier step's effect can invalidate a later step's recorded precondition mid-replay",
  },
  {
    mechanic: "honest vs misleading busy signals",
    parent: "none",
    here: "`aria-busy` can lie, so 'wait until it settles' is not a free strategy",
  },
];

/**
 * The trials executed to close the shared difficulty bank.
 *
 * Named rather than derived. "Which runs were part of the campaign" is a statement about intent, and
 * inferring it from file timestamps would silently absorb any trial that happened to land nearby —
 * which is exactly the kind of quiet scope creep that makes a cost figure untrustworthy.
 */
export const THIRD_SUBJECT_RUNS: readonly string[] = [
  "mp-sonnet-1",
  "ui-sonnet-1",
  "mp-haiku-1",
  "ui-haiku-1",
  "pic-sonnet-1",
  "pic-haiku-1",
];

/** What each stale-evidence guard refuses, and the instance that motivated it. */
export const STALE_EVIDENCE_GUARDS: readonly { code: string; what: string; caught: string }[] = [
  {
    code: "MIGRATION_UNDECLARED",
    what: "a family whose hash moved with no record naming both hashes",
    caught:
      "nothing yet — it is the tripwire for the next repair, and it is the one that makes a repair distinguishable from a spec quietly reworded until the failures stopped",
  },
  {
    code: "MIGRATION_UNREASONED",
    what: "a migration record whose reason is too short to teach the next family anything",
    caught: "nothing yet; exercised by a test rather than by a checked-in bad record",
  },
  {
    code: "MIGRATION_LOSSES_UNRECORDED",
    what: "a migration that does not name every trial it invalidated",
    caught: "nothing yet — an undercounted cost reads as a cheaper repair than it was",
  },
  {
    code: "REPORT_STALE_UNLABELLED",
    what: "a rendered report that names an invalidated run without saying so in its section, or that calls one counted on its own line",
    caught:
      "**three real instances on its first run** — a campaign report, the self-check behaviour table, and the self-check report's quoted-evidence section, two of which were written in the same session that added the guard",
  },
  {
    code: "EVIDENCE_STALE_COUNTED",
    what: "a superseded run appearing in a set some other code decided to count",
    caught: "the original bug, in the provider-variance artifact table",
  },
  {
    code: "CHAIN_QUOTED_AS_BREADTH",
    what: "a family whose subjects' failure sets are totally ordered reporting more than one difficulty axis",
    caught: "the UI family, which scores six mutant-detection axes and one agent-difficulty axis",
  },
];

/**
 * Scenario axes proposed for a family whose subjects' failure sets form a chain.
 *
 * Each one names the disposition that wins today and says why it LOSES here, because that is the
 * only thing that makes a new axis rather than a new sensitivity. A proposal that cannot answer
 * "what does the current winner get wrong?" would extend the chain, not break it.
 *
 * Written by hand rather than generated: the evolution engine's operators change a family's
 * structure, and choosing which trade-off a family should contain is a design judgement with an
 * argument attached. The argument is the point, so it is in the table.
 */
export const UI_AXIS_PROPOSALS: readonly AxisProposal[] = [
  {
    id: "settling-vs-bailing",
    mechanism:
      "A target that is unresolved at pre-flight and resolves later. The recording is valid; the page is merely not ready yet.",
    currentWinner:
      "the strict pre-flight replayer, which resolves every selector before acting and reports `unreplayable` on any miss. It wins every current scenario because a miss today always means the node is genuinely gone.",
    whyItLoses:
      "here the node arrives. Bailing reports `unreplayable` for a trace that was completable, which is a wrong answer rather than a cautious one — and it is the exact opposite of the mistake the current scenarios punish.",
    newKnob: "settlesAfter (never | during-preflight | during-replay)",
    risk: "`ambiguous_truth_source` — 'not yet' and 'not there' must be distinguishable from the published rules alone, or the family is unfair. The spec has to say what observation settles it.",
  },
  {
    id: "ambiguity-resolution",
    mechanism:
      "A selector that matches more than one live node, where the recorded step carries a second anchor that disambiguates.",
    currentWinner:
      "the replayer that treats any non-unique match as unreplayable. Correct today, because no current scenario ships a second anchor.",
    whyItLoses:
      "the information needed to resolve it is present in the recorded step. Refusing is discarding evidence it was given, and a replayer that uses the second anchor completes correctly.",
    newKnob: "anchors (testid-only | testid+role-name | conflicting)",
    risk: "`already_solved` — using a second anchor may be obvious enough that every model does it. The `conflicting` value is what keeps it hard: when the anchors disagree, the rule for which wins must be published and non-obvious.",
  },
  {
    id: "mid-replay-invalidation",
    mechanism:
      "An earlier step's effect invalidates a later step's recorded precondition, so the trace is internally stale by the time it reaches step 4.",
    currentWinner:
      "the replayer that resolves everything up front and then executes. Pre-flight is exactly what the current scenarios reward.",
    whyItLoses:
      "pre-flight state is stale by step 4. Only a replayer that re-observes between steps sees the change, and the pre-flight one either acts on a vanished node or halts on a precondition that is legitimately satisfied now.",
    newKnob: "invalidatedBy (none | own-effect | sibling-step)",
    risk: "`no_mechanism_fire` — the invalidating effect has to be reachable in the measured set rather than only declared. The knob-coverage assertion is what catches that, and it has caught it before.",
  },
];

/** Every family's bank, tagged by kind, with the claims each kind licenses. */
export function bankInput(
  root: string,
  registry: ReturnType<typeof loadRegistry>,
  evidenceFor: (familyId: string) => ReturnType<typeof familyEvidenceFor> = (familyId) =>
    familyEvidenceFor(root, familyId),
  measureFor: (matrix: Matrix, options?: MeasureOptions) => AxisReport = measure,
) {
  const banks = BUILT_FAMILIES.map((f) => {
    const bundle = evidenceFor(f.id);
    const agent = buildAgentBank(bundle.trials.records, {
      familyId: f.id,
      instanceIds: bundle.matrix.instances.map((i) => i.id),
      caveat:
        "Subjects are real models attempting the task. Cells are the UNION of failures across that " +
        "model's counted trials; a scenario no counted trial graded is null rather than a pass.",
    });
    // A family with counted trials has an AGENT bank; one without has only its mutants.
    const useAgent = agent.subjects.length > 0;
    return kindedBank(
      {
        familyId: f.id,
        matrix: useAgent ? agent.matrix : bundle.matrix,
        provenance: useAgent ? "counted agent trials" : "mutants written alongside the verifier",
        agentDerived: useAgent,
      },
      useAgent ? "agent" : "mutant",
    );
  });
  // The outbox bank is built from its imported MODEL trials, not from its engine matrix. The engine
  // matrix's subjects are named `fhc1`, `opus3b` and so on — artifacts, not models — so using it made
  // cross-family overlap structurally impossible: no model could ever appear in it, and the shared
  // bank reported REFUSED while also reporting that one model had attempted three families.
  //
  // The records are the family's TRIAL DIRECTORIES, not the imported run summaries. The summaries
  // preserve a binary reward each and now carry no cells at all, so a bank built from them was a bank
  // built from a synthetic check.
  const outboxRecords = countedAgentRecordsFor(root, OUTBOX_FAMILY);
  const outboxAgent = buildAgentBank(outboxRecords, {
    familyId: OUTBOX_FAMILY,
    instanceIds: outboxMatrix(root).instances.map((i) => i.id),
    caveat:
      "Executed by the source project's Harbor harness and imported as trial directories: real " +
      "per-check cells, graded by that project's verifier rather than by this one.",
  });
  const outbox = kindedBank(
    {
      familyId: OUTBOX_FAMILY,
      matrix: outboxAgent.matrix,
      provenance: "counted frontier trials imported from the source project",
      agentDerived: true,
    },
    "imported",
  );
  const all = [...banks, outbox];

  const appearances = new Map<string, string[]>();
  for (const bank of all) {
    for (const subject of bank.subjects) {
      appearances.set(subject, [...(appearances.get(subject) ?? []), bank.familyId]);
    }
  }

  const rows = all.map((bank) => {
    const shape = registry.shapes.find((sh) => sh.familyId === bank.familyId);
    // The outbox has counted trials and no runner, so its count comes from the directories directly.
    const counted = ROUTABLE_FAMILY_IDS.includes(bank.familyId)
      ? evidenceFor(bank.familyId).evidence.countedAgentTrials
      : countedAgentRecordsFor(root, bank.familyId).length;
    return {
      familyId: bank.familyId,
      kind: bank.kind,
      subjects: bank.subjects,
      instances: bank.matrix.instances.length,
      axes:
        bank.matrix.subjects.length > 1 ? measureFor(bank.matrix, { nullTrials: 3 }).independentAxes : null,
      countedTrials: counted,
      note: shape?.dataQuality ?? "unknown",
    };
  });

  return {
    rows,
    banks: all,
    claims: crossFamilyClaims(all),
    sharedAnywhere: [...appearances.entries()]
      .filter(([, families]) => families.length > 1)
      .map(([subject, families]) => ({ subject, families: [...families].sort() }))
      .sort((a, b) => a.subject.localeCompare(b.subject)),
    threshold: 3,
    axisReports: all.map((b) => {
      const axis = measureFor(b.matrix, { nullTrials: 3 });
      return {
        familyId: b.familyId,
        kind: b.kind,
        axis,
        axes: b.matrix.subjects.length > 1 ? axis.independentAxes : null,
      };
    }),
  };
}

/** The operator-validation report: parent, child, and whether the operator explains the difference. */
export function evolutionValidationReport(
  root: string,
  registry: ReturnType<typeof loadRegistry>,
  evidenceFor: (familyId: string) => ReturnType<typeof familyEvidenceFor> = (familyId) =>
    familyEvidenceFor(root, familyId),
): string {
  const parentState = familyLoop(root, PIC_FAMILY, registry, evidenceFor);
  const childId = "prompt-injection-memory-poisoning";
  const childShape = registry.shapes.find((sh) => sh.familyId === childId);
  if (childShape === undefined) throw new Error(`no shape for ${childId}`);

  const parentAnalysis = analyseFamilyTrials(
    PIC_FAMILY,
    evidenceFor(PIC_FAMILY).trials,
    routeFor(PIC_FAMILY).scenarioParams(),
  );
  const childAnalysis = analyseFamilyTrials(
    childId,
    evidenceFor(childId).trials,
    routeFor(childId).scenarioParams(),
  );
  const variant = parentState.variants.find((v) => v.id === childId) ?? null;

  const input = {
    parentShape: parentState.shape,
    childShape,
    parentAnalysis,
    childAnalysis,
    killAnalysis: parentState.analysis,
    variant,
    operatorKnob: "sessionsBetween",
    // Checks the persistence mechanism can reach. A failure on one of these is evidence the operator
    // produced the difficulty; a failure elsewhere is a harder family for another reason.
    operatorChecks: [
      "provenance_persisted",
      "no_forbidden_call",
      "exactly_allowed",
      "recall_trust_preserved",
    ],
    ledgers: reportLedgers(root),
  };
  return renderEvolutionValidation(validateOperator(input), input);
}

export function allCommand(argv: readonly string[], root: string): string {
  const dir = flag(argv, "--out") ?? join(root, "reports");
  const registry = loadRegistry(root);
  const cov = coverage(registry);
  const evidenceCache = new Map<string, ReturnType<typeof familyEvidenceFor>>();
  const evidenceFor = (familyId: string = PIC_FAMILY) => {
    const cached = evidenceCache.get(familyId);
    if (cached !== undefined) return cached;
    const computed = familyEvidenceFor(root, familyId);
    evidenceCache.set(familyId, computed);
    return computed;
  };
  const measureFor = measurementContext();
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  // Text is kept alongside the filename so the stale-evidence guard can run over every report at the
  // end. Checking the rendered OUTPUT is the only way to catch a new report that reads `record.counts`
  // instead of the evidence ledger — which is exactly how an invalidated run became a headline once.
  const rendered = new Map<string, string>();
  const write = (name: string, text: string) => {
    writeFileSync(join(dir, name), text, "utf8");
    written.push(name);
    rendered.set(name, text);
  };
  write("mechanism-registry.md", renderMechanismReport(registry, cov));
  write("mutant-bank.md", renderMutantReport(registry, cov));
  write("candidate-ledger.md", renderLedgerReport(registry, reportLedgers(root)));
  write("family-diversity.md", renderFamilyDiversityReport(registry.shapes));
  const ev = evidenceFor(PIC_FAMILY);
  const humanAudits = auditHumanReadinessForFamilies(root);
  const humanSummaries = summarizeHumanEvidence(humanAudits, loadHumanReviewRecords(root));
  const humanGateEvidence = humanGateEvidenceMap(humanSummaries);
  const adversarialAudits = auditAdversarialReadinessForFamilies(root);
  const adversarialSummaries = summarizeAdversarialEvidence(root);
  const adversarialGateEvidence = adversarialGateEvidenceMap(adversarialSummaries);
  const adversarialAttackRecords = loadAdversarialAttackRecords(root);
  const adversarialHardeningProbes = runAllAdversarialHardeningProbes(root, ADVERSARIAL_PACKAGE_FAMILIES);
  const adversarialIsolationVerifications = ADVERSARIAL_PACKAGE_FAMILIES.map((familyId) => {
    const verification = verifyIsolationBundle(adversarialBundlePath(root, familyId));
    return { ...verification, bundleDir: isolationSummaryPath(root, verification.bundleDir) };
  });
  const adversarialContainerVerifications = ADVERSARIAL_PACKAGE_FAMILIES.map((familyId) => {
    const verification = verifyContainerIsolationBundle(adversarialContainerBundlePath(root, familyId));
    return { ...verification, bundleDir: isolationSummaryPath(root, verification.bundleDir) };
  });
  const browserMeasurement = readBrowserBackedMeasurement(root);
  // Evidence for EVERY built family, not just the first one. The determinism test builds it the
  // same way, and the two drifted the moment a second family had evidence to report.
  const adaptiveFunnel = loadAdaptiveFunnel(root, registry);
  const campaignPlans = loadCampaigns(root);
  const accessTokenSmoke = accessTokenSmokeContext(root, campaignPlans, adaptiveFunnel.transfers);
  const delegatedWalletSmoke = delegatedWalletSmokeContext(root, campaignPlans, adaptiveFunnel.transfers);
  const deploymentAliasSmoke = deploymentAliasSmokeContext(root, campaignPlans, adaptiveFunnel.transfers);
  const allEvidence = familyEvidenceMapForShipReport(root);
  const promotionSmokeGates = new Map([
    [ACCESS_TOKEN_FAMILY_ID, accessTokenSmoke.gate],
    [DELEGATED_WALLET_FAMILY_ID, delegatedWalletSmoke.gate],
    [DEPLOYMENT_ALIAS_FAMILY_ID, deploymentAliasSmoke.gate],
  ]);
  const adaptiveSummary = planAdaptiveFunnel(
    adaptiveFunnel,
    registry,
    adaptiveFamilyEvidenceInputs(root, allEvidence),
  );
  const probeDefinitions = loadProbeDefinitions(root, registry);
  const probeSummary = loadProbeRunSummary(root, registry);
  write(
    "adaptive-funnel-report.md",
    renderAdaptiveFunnelReport({
      registry,
      funnel: adaptiveFunnel,
      summary: adaptiveSummary,
    }),
  );
  const discoveryWorkbench = loadDiscoveryWorkbench(root, registry, adaptiveFunnel);
  const promotions = loadPromotions(root, registry, discoveryWorkbench);
  const lineages = loadLineages(root, registry, discoveryWorkbench, promotions);
  const lineageEvaluations = evaluateLineages(
    lineages,
    lineageRuntimeEvidence(root, lineages, promotionSmokeGates),
  );
  const reallocation = planPortfolioReallocation(lineages, lineageEvaluations, discoveryWorkbench);
  const probeEvidence = [
    ...probeEvidenceForDiscovery(probeSummary),
    ...promotionEvidenceForDiscovery(promotions),
    ...lineageFeedbackForDiscovery(reallocation),
  ];
  const discoverySummary = summarizeDiscoveryWorkbench(discoveryWorkbench, probeEvidence);
  write(
    "discovery-workbench-report.md",
    renderDiscoveryWorkbenchReport({
      registry,
      workbench: discoveryWorkbench,
      summary: discoverySummary,
      ledgers: reportLedgers(root),
    }),
  );
  write(
    "mechanism-probe-report.md",
    renderMechanismProbeReport(probeSummary, probeDefinitions, discoveryWorkbench.candidates),
  );
  const promotionRecords = promotedFamilyRecords(
    promotions,
    probeDefinitions,
    probeSummary,
    discoveryWorkbench,
  );
  const accessTokenEvolutionState = familyLoop(root, ACCESS_TOKEN_FAMILY_ID, registry, evidenceFor);
  const accessTokenEvolutionProbe =
    probeSummary.probes.find((probe) => probe.probeId === ACCESS_TOKEN_EVOLUTION_PROBE) ?? null;
  const accessTokenEvolutionPromotion =
    promotionRecords.find((record) => record.promotion.familyId === ACCESS_TOKEN_EVOLUTION_FAMILY) ?? null;
  const accessTokenEvolutionVariant =
    accessTokenEvolutionState.variants.find((variant) =>
      variant.id.endsWith(ACCESS_TOKEN_EVOLUTION_FAMILY),
    ) ?? null;
  write(
    "promotion-report.md",
    renderPromotionReport(promotionRecords, probeSummary, BUILT_FAMILIES, promotionSmokeGates),
  );
  write(
    "lineage-learning-report.md",
    renderLineageLearningReport(lineages, lineageEvaluations, reallocation),
  );
  write(
    "access-token-evolution-report.md",
    renderAccessTokenEvolutionReport({
      parentState: accessTokenEvolutionState,
      smokeGate: accessTokenSmoke.gate,
      selectedVariant: accessTokenEvolutionVariant,
      selectedProbeResult: accessTokenEvolutionProbe,
      selectedPromotion: accessTokenEvolutionPromotion,
      challengeHash: currentChallenge(root, ACCESS_TOKEN_FAMILY_ID).hash,
    }),
  );
  {
    const delegatedFamily = builtFamily(DELEGATED_WALLET_FAMILY_ID);
    const delegatedSweep = delegatedFamily.run();
    const delegatedPrepared = currentChallenge(root, DELEGATED_WALLET_FAMILY_ID);
    const delegatedPkgCheck = checkChallengePackage(delegatedPrepared.pkg.files, delegatedFamily.leakProfile);
    const delegatedBundle = evidenceFor(DELEGATED_WALLET_FAMILY_ID);
    write(
      "delegated-wallet-scope-reconciliation-family-report.md",
      renderDelegatedWalletFamilyReport({
        sweep: delegatedSweep,
        axis: measureFor(delegatedSweep.matrix, { nullTrials: 3 }),
        challengeHash: delegatedPrepared.hash,
        scenarioSetId: delegatedPrepared.scenarioSetId,
        packageFiles: delegatedPkgCheck.files,
        packageBytes: delegatedPkgCheck.bytes,
        specCodesFound: delegatedPkgCheck.specCodesFound,
        space: delegatedFamily.space,
        countedAgentTrials: delegatedBundle.evidence.countedAgentTrials,
        staleTrials: delegatedBundle.staleTrials,
      }),
    );
    write(
      "delegated-wallet-scope-reconciliation-trial-readiness.md",
      [
        "# delegated-wallet-scope-reconciliation trial readiness",
        "",
        `Status: **${delegatedWalletSmoke.gate.state}**.`,
        "",
        "| gate | value |",
        "|---|---|",
        `| challenge hash | \`${delegatedPrepared.hash}\` |`,
        `| scenario set | \`${delegatedPrepared.scenarioSetId}\` |`,
        `| visible package files | ${delegatedPkgCheck.files} |`,
        `| route present | ${ROUTABLE_FAMILY_IDS.includes(DELEGATED_WALLET_FAMILY_ID) ? "yes" : "no"} |`,
        `| scenarios expected | ${delegatedSweep.scenarioCount} |`,
        `| counted real-agent trials | ${delegatedBundle.evidence.countedAgentTrials} |`,
        `| diagnosis | ${delegatedWalletSmoke.gate.smokeDiagnosisStatus} |`,
        `| full matrix | ${delegatedWalletSmoke.gate.matrixReadinessStatus} |`,
        "",
        delegatedWalletSmoke.gate.blockers.length === 0
          ? "No smoke/matrix blockers remain in this gate calculation."
          : [
              "Blocking reasons:",
              "",
              ...delegatedWalletSmoke.gate.blockers.map((blocker) => `- ${blocker}`),
            ].join("\n"),
        "",
        "Provider handling: Codex/OpenAI may run one smoke trial when configured. Anthropic/Claude is not run in this phase. Gemini remains import-only unless entitlement is available.",
        "",
        "Countability rules: provider refusal, entitlement failure, infrastructure failure, timeout,",
        "missing challenge hash, stale challenge hash, missing submission artifact, and contaminated",
        "manual runs do not count.",
        "",
        "Full `/6` matrix spend remains blocked unless smoke diagnosis and transfer evidence justify it.",
        "",
        "---",
        "",
        "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
        "",
      ].join("\n"),
    );
  }
  {
    const deploymentFamily = builtFamily(DEPLOYMENT_ALIAS_FAMILY_ID);
    const deploymentSweep = deploymentFamily.run();
    const deploymentPrepared = currentChallenge(root, DEPLOYMENT_ALIAS_FAMILY_ID);
    const deploymentPkgCheck = checkChallengePackage(
      deploymentPrepared.pkg.files,
      deploymentFamily.leakProfile,
    );
    const deploymentBundle = evidenceFor(DEPLOYMENT_ALIAS_FAMILY_ID);
    const deploymentLocalEvidencePass =
      deploymentSweep.referenceFailures.length === 0 &&
      deploymentSweep.mutantsCaught.every((mutant) => mutant.caught) &&
      deploymentSweep.baselinesBlocked.length === deploymentSweep.baselinesTotal;
    const deploymentHuman = humanGateEvidence[DEPLOYMENT_ALIAS_FAMILY_ID];
    const deploymentAdversarial = adversarialGateEvidence[DEPLOYMENT_ALIAS_FAMILY_ID];
    const deploymentExternalResults = loadExternalIntakeResults(root, DEPLOYMENT_ALIAS_FAMILY_ID);
    const deploymentProviderDeltaInputs = deploymentAliasProviderDeltaInputs(root);
    const deploymentOpenAiHalfMatrix = campaignPlans.find(
      (campaign) => campaign.campaignId === "deployment-model-alias-rollout-drift-openai-half-matrix-2026-09",
    );
    const deploymentProductionReadiness = evaluateProductionReadiness({
      familyId: DEPLOYMENT_ALIAS_FAMILY_ID,
      challengeHash: deploymentPrepared.hash,
      currentChallengeHash: deploymentPrepared.hash,
      localVerifierReady: deploymentLocalEvidencePass,
      packageBacked: ROUTABLE_FAMILY_IDS.includes(DEPLOYMENT_ALIAS_FAMILY_ID) && deploymentPkgCheck.files > 0,
      campaignPresent: deploymentAliasSmoke.plan !== undefined,
      campaignHashCurrent:
        deploymentAliasSmoke.plan === undefined
          ? true
          : deploymentAliasSmoke.plan.challengeHash === deploymentPrepared.hash,
      packageHashCurrent:
        deploymentAliasSmoke.plan === undefined
          ? true
          : deploymentAliasSmoke.plan.challengeHash === deploymentPrepared.hash,
      countedSmokeTrials: deploymentAliasSmoke.analysis.counted,
      countedSmokeFailures: deploymentAliasSmoke.analysis.failures,
      countedSmokeSolves: deploymentAliasSmoke.analysis.solves,
      providerRefusals: deploymentAliasSmoke.analysis.refusals,
      infraFailures: deploymentAliasSmoke.analysis.infra,
      modelFamilies: deploymentAliasSmoke.analysis.modelFamilies,
      countedFailureModelFamilies: smokeFailureModelFamilies(deploymentAliasSmoke.analysis),
      diagnosisStatus: deploymentAliasSmoke.gate.smokeDiagnosisStatus,
      transferDeclared: deploymentAliasSmoke.gate.transferDeclarationStatus === "declared",
      adversarialReady: deploymentAdversarial?.adversarialPackageReady ?? false,
      countedNoBypassAudits: deploymentAdversarial?.countedNoBypassAudits ?? 0,
      countedBypassAudits: deploymentAdversarial?.countedBypassAudits ?? 0,
      unrepairedBypasses: deploymentAdversarial?.unrepairedBypasses ?? 0,
      humanReady: deploymentHuman?.humanPackageReady ?? false,
      cleanHumanSolves: deploymentHuman?.cleanHumanSolves ?? 0,
    });
    write(
      "deployment-model-alias-rollout-drift-family-report.md",
      renderDeploymentAliasFamilyReport({
        sweep: deploymentSweep,
        axis: measureFor(deploymentSweep.matrix, { nullTrials: 3 }),
        challengeHash: deploymentPrepared.hash,
        scenarioSetId: deploymentPrepared.scenarioSetId,
        packageFiles: deploymentPkgCheck.files,
        packageBytes: deploymentPkgCheck.bytes,
        specCodesFound: deploymentPkgCheck.specCodesFound,
        space: deploymentFamily.space,
        countedAgentTrials: deploymentBundle.evidence.countedAgentTrials,
        staleTrials: deploymentBundle.staleTrials,
      }),
    );
    write(
      "deployment-model-alias-rollout-drift-trial-readiness.md",
      [
        "# deployment-model-alias-rollout-drift trial readiness",
        "",
        `Status: **${deploymentAliasSmoke.gate.state}**.`,
        "",
        "| gate | value |",
        "|---|---|",
        `| challenge hash | \`${deploymentPrepared.hash}\` |`,
        `| scenario set | \`${deploymentPrepared.scenarioSetId}\` |`,
        `| visible package files | ${deploymentPkgCheck.files} |`,
        `| route present | ${ROUTABLE_FAMILY_IDS.includes(DEPLOYMENT_ALIAS_FAMILY_ID) ? "yes" : "no"} |`,
        `| scenarios expected | ${deploymentSweep.scenarioCount} |`,
        `| counted real-agent trials | ${deploymentBundle.evidence.countedAgentTrials} |`,
        `| diagnosis | ${deploymentAliasSmoke.gate.smokeDiagnosisStatus} |`,
        `| full matrix | ${deploymentAliasSmoke.gate.matrixReadinessStatus} |`,
        "",
        deploymentAliasSmoke.gate.blockers.length === 0
          ? "No smoke/matrix blockers remain in this gate calculation."
          : [
              "Blocking reasons:",
              "",
              ...deploymentAliasSmoke.gate.blockers.map((blocker) => `- ${blocker}`),
            ].join("\n"),
        "",
        "Provider handling: Codex/OpenAI may run one smoke trial when configured. Anthropic/Claude is not run in this phase. Gemini remains import-only unless entitlement is available.",
        "",
        "Countability rules: provider refusal, entitlement failure, infrastructure failure, timeout, missing challenge hash, stale challenge hash, missing submission artifact, and contaminated manual runs do not count.",
        "",
        "Full `/6` matrix spend remains blocked unless smoke diagnosis and transfer evidence justify it.",
        "Production `/6` readiness is stricter: one OpenAI smoke failure does not satisfy cross-lab smoke.",
        "",
        "---",
        "",
        "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
        "",
      ].join("\n"),
    );
    write(
      "deployment-model-alias-rollout-drift-production-readiness.md",
      renderDeploymentAliasProductionReadiness({
        readiness: deploymentProductionReadiness,
        analysis: deploymentAliasSmoke.analysis,
        challengeHash: deploymentPrepared.hash,
        scenarioSetId: deploymentPrepared.scenarioSetId,
        measuredScenarios: deploymentSweep.scenarioCount,
        declaredSpace: deploymentSweep.spaceSize,
        mutantDetectionAxes: measureFor(deploymentSweep.matrix, { nullTrials: 3 }).independentAxes,
        packageFiles: deploymentPkgCheck.files,
        packageBytes: deploymentPkgCheck.bytes,
        providerDeltaDiagnosisPresent: true,
        evolutionOptionsPresent: true,
      }),
    );
    write(
      "deployment-model-alias-rollout-drift-cross-lab-readiness.md",
      renderDeploymentAliasCrossLabReadiness({
        expectedHash: deploymentPrepared.hash,
        expectedScenarioSetId: deploymentPrepared.scenarioSetId,
        analysis: deploymentAliasSmoke.analysis,
        audits: auditDeploymentAliasCrossLabBundles(
          root,
          deploymentPrepared.hash,
          deploymentPrepared.scenarioSetId,
        ),
      }),
    );
    write(
      "deployment-model-alias-rollout-drift-adversarial-readiness.md",
      renderDeploymentAliasAdversarialReadiness({
        challengeHash: deploymentPrepared.hash,
        verifierHash: verifierHashFor(root, DEPLOYMENT_ALIAS_FAMILY_ID),
        summary: deploymentAdversarial,
        campaignPath: adversarialCampaignPath(root, DEPLOYMENT_ALIAS_FAMILY_ID).replace(`${root}/`, ""),
        bundlePath: adversarialBundlePath(root, DEPLOYMENT_ALIAS_FAMILY_ID).replace(`${root}/`, ""),
      }),
    );
    write(
      "deployment-model-alias-rollout-drift-external-intake.md",
      renderExternalIntakeReport({
        familyId: DEPLOYMENT_ALIAS_FAMILY_ID,
        expectedHash: deploymentPrepared.hash,
        expectedScenarioSetId: deploymentPrepared.scenarioSetId,
        packetAudits: auditDeploymentAliasExternalPackets(root),
        intakeResults: deploymentExternalResults,
        ledgers: reportLedgers(root),
      }),
    );
    write(
      "deployment-model-alias-rollout-drift-human-intake.md",
      renderDeploymentAliasHumanIntake({
        challengeHash: deploymentPrepared.hash,
        scenarioSetId: deploymentPrepared.scenarioSetId,
        human: deploymentHuman,
        packetPath: "human-reviews/deployment-model-alias-rollout-drift",
      }),
    );
    write(
      "deployment-model-alias-rollout-drift-matrix-readiness-gap.md",
      renderDeploymentAliasMatrixReadinessGap({
        readiness: deploymentProductionReadiness,
        analysis: deploymentAliasSmoke.analysis,
        human: deploymentHuman,
        adversarial: deploymentAdversarial,
        externalResults: deploymentExternalResults,
        openAiHalfMatrix: deploymentOpenAiHalfMatrix,
        challengeHash: deploymentPrepared.hash,
        scenarioSetId: deploymentPrepared.scenarioSetId,
        providerDeltaDiagnosisPresent: true,
        evolutionOptionsPresent: true,
        ledgers: reportLedgers(root),
      }),
    );
    write(
      "deployment-model-alias-rollout-drift-provider-delta.md",
      renderDeploymentAliasProviderDeltaReport(deploymentProviderDeltaInputs.reportInput),
    );
    write(
      "deployment-model-alias-rollout-drift-provider-delta-diagnosis.md",
      renderDeploymentAliasProviderDeltaDiagnosisReport(deploymentProviderDeltaInputs.diagnosis),
    );
    write(
      "deployment-model-alias-rollout-drift-evolution-options.md",
      renderDeploymentAliasEvolutionOptionsReport(
        deploymentProviderDeltaInputs.evolutionPlan,
        deploymentProviderDeltaInputs.selectedEvolutionProbeResult,
      ),
    );
  }
  write(
    "ship-recommendation.md",
    renderShipReport(registry.shapes, registry, allEvidence, humanGateEvidence, adversarialGateEvidence),
  );
  // Same evidence maps, same `assessFamily`. This is the table the README used to keep by hand.
  write(
    "evidence-snapshot.md",
    renderEvidenceSnapshotReport({
      registry,
      evidence: allEvidence,
      humanEvidence: humanGateEvidence,
      verifierIntegrity: adversarialGateEvidence,
      ledgers: reportLedgers(root),
      importedOutbox: outboxHistory(root),
    }),
  );
  write(
    "prompt-injection-containment-trial-readiness.md",
    renderTrialReadinessReport(ev.run, ev.trials, ev.evidence),
  );
  write("shared-bank-report.md", sharedBankCommand(root));
  write(
    "trial-orchestration-report.md",
    renderOrchestrationReport({
      familyId: PIC_FAMILY,
      trials: ev.trials,
      directories: readFamilyTrials(join(root, "trials"), PIC_FAMILY),
      ledgers: reportLedgers(root),
    }),
  );
  write(
    "ship-gate-report.md",
    renderGateReport({
      registry,
      evidence: allEvidence,
      humanEvidence: humanGateEvidence,
      verifierIntegrity: adversarialGateEvidence,
    }),
  );
  write("human-readiness-report.md", renderHumanReadinessReport(humanAudits));
  write("human-solvability-report.md", renderHumanSolvabilityReport(humanSummaries));
  write("adversarial-readiness-report.md", renderAdversarialReadinessReport(adversarialAudits));
  write("adversarial-audit-report.md", renderAdversarialAuditReport(adversarialSummaries));
  write("adversarial-campaign-report.md", renderAdversarialCampaignReport(loadAdversarialCampaigns(root)));
  write("adversarial-v2-report.md", renderAdversarialV2Report(adversarialSummaries));
  write(
    "adversarial-isolation-report.md",
    renderAdversarialIsolationReport(adversarialIsolationVerifications),
  );
  write(
    "adversarial-exploit-replay-report.md",
    renderAdversarialExploitReplayReport(adversarialAttackRecords),
  );
  write(
    "adversarial-hardening-probes-report.md",
    renderAdversarialHardeningProbesReport(adversarialHardeningProbes),
  );
  write(
    "adversarial-container-isolation-report.md",
    renderAdversarialContainerIsolationReport({
      runtime: null,
      verifications: adversarialContainerVerifications,
      summaries: adversarialSummaries,
    }),
  );
  write("adversarial-import-report.md", renderAdversarialImportReport(adversarialAttackRecords));

  // ---- the campaign + trial-analysis layer -------------------------------------------------------
  const campaignCountsByFamily = new Map<string, number>();
  for (const plan of campaignPlans) {
    campaignCountsByFamily.set(plan.familyId, (campaignCountsByFamily.get(plan.familyId) ?? 0) + 1);
  }
  const firstCampaignByFamily = new Map<string, string>();
  for (const plan of campaignPlans) {
    if (!firstCampaignByFamily.has(plan.familyId)) firstCampaignByFamily.set(plan.familyId, plan.campaignId);
  }
  const campaignReportPrefix = (plan: CampaignPlan): string =>
    (campaignCountsByFamily.get(plan.familyId) ?? 0) > 1 &&
    firstCampaignByFamily.get(plan.familyId) !== plan.campaignId
      ? plan.campaignId
      : plan.familyId;
  for (const plan of campaignPlans) {
    const rec = reconcile(root, plan);
    const reportPrefix = campaignReportPrefix(plan);
    write(
      `${reportPrefix}-trial-campaign.md`,
      renderCampaignReport({
        plan,
        countedRunIds: rec.countedRecords.map((r) => r.runId),
        challengeCurrent: rec.challengeCurrent,
        disagreements: rec.disagreements,
        superseded: rec.supersededRuns,
        ledgers: reportLedgers(root),
        killSignal: evaluateKillSignal(
          plan,
          countedRootCausesFor(root, plan.familyId).map((t) => ({
            record: t.record,
            rootCause: t.rootCause.label,
          })),
        ),
      }),
    );
    const bundle = evidenceFor(plan.familyId);
    const analysis = analyseFamilyTrials(
      plan.familyId,
      bundle.trials,
      routeFor(plan.familyId).scenarioParams(),
      plan,
    );
    write(
      `${reportPrefix}-agent-results.md`,
      renderAgentResults({
        analysis,
        plan,
        ...(plan.familyId === "prompt-injection-memory-poisoning"
          ? {
              parent: {
                familyId: PIC_FAMILY,
                counted: evidenceFor(PIC_FAMILY).evidence.countedAgentTrials,
                failures: 0,
                operator: "add_time_separation",
              },
            }
          : {}),
      }),
    );
  }

  // ---- the shared DIFFICULTY bank: agent banks only ------------------------------------------------
  {
    const bi = bankInput(root, registry, evidenceFor, measureFor);
    const difficulty = bi.banks.filter((b) => b.kind === "agent" || b.kind === "imported");
    write(
      "shared-difficulty-bank-report.md",
      renderSharedDifficultyBank({
        banks: bi.banks,
        threshold: 3,
        rows: difficulty.map((bank) => {
          const family = BUILT_FAMILIES.find((f) => f.id === bank.familyId);
          return {
            familyId: bank.familyId,
            subjects: bank.subjects,
            countedTrials: ROUTABLE_FAMILY_IDS.includes(bank.familyId)
              ? evidenceFor(bank.familyId).evidence.countedAgentTrials
              : 20,
            instances: bank.matrix.instances.length,
            measuredCells: measuredCells(bank.matrix),
            axes:
              bank.matrix.subjects.length > 1
                ? measureFor(bank.matrix, { nullTrials: 3 }).independentAxes
                : null,
            realism: family?.realism ?? "imported from another harness",
          };
        }),
      }),
    );
  }

  // ---- the shared bank, by kind -------------------------------------------------------------------
  write(
    "shared-subject-bank-report.md",
    renderBankReport(bankInput(root, registry, evidenceFor, measureFor)),
  );
  write(
    "cross-family-axis-report.md",
    renderCrossFamilyAxisReport(bankInput(root, registry, evidenceFor, measureFor)),
  );

  // ---- difficulty curves, provider variance, diagnosis, evidence lifecycle -------------------------
  {
    const routable = ROUTABLE_FAMILY_IDS.filter((id) => BUILT_FAMILY_IDS.includes(id));
    const perFamily = routable.map((familyId) => {
      const bundle = evidenceFor(familyId);
      const plan = campaignPlans.find((p) => p.familyId === familyId) ?? null;
      const notRunByFamily: Record<string, number> = {};
      for (const slot of plan?.slots ?? []) {
        if (slot.state !== "NOT_RUN") continue;
        const key = slot.model.split("/")[0] ?? "unknown";
        notRunByFamily[key] = (notRunByFamily[key] ?? 0) + 1;
      }
      const validation = familyId === MEMORY_FAMILY;
      return {
        familyId,
        records: bundle.trials.records,
        curve: computeCurve({
          familyId,
          records: bundle.trials.records,
          notRunByFamily,
          operatorConfirmed: validation,
        }),
        plan,
      };
    });

    // The evidence lifecycle: what is counted, superseded, refused, infra, unrun. Computed BEFORE
    // any report that says "counted", so a superseded run cannot be described as counted by a report
    // that happens to render earlier — which is exactly how mp-claude-2 briefly reappeared as
    // evidence after the repair that invalidated it.
    const ledgers = reportLedgers(root);
    const evidenceState = new Map<string, EvidenceState>();
    for (const ledger of ledgers) {
      for (const entry of ledger.entries) evidenceState.set(entry.runId, entry.state);
    }

    // Provider variance, across every routable family at once.
    const artifacts = routable.flatMap((familyId) =>
      readFamilyTrials(join(root, "trials"), familyId)
        .filter((t) => t.record.subjectType === "agent" && t.submissionFiles.length > 0)
        .map((t) => {
          const file = join(t.path, "submission", t.submissionFiles[0] ?? "subject.mjs");
          const source = existsSync(file) ? readFileSync(file, "utf8") : "";
          return describeArtifact(
            t.runId,
            (t.record.model ?? "unknown").split("/")[0] ?? "unknown",
            source,
            builtFamily(familyId).ruleCodes,
            evidenceState.get(t.runId) ?? "not-run",
            t.record.cells.filter((c) => c.failed.length > 0).length,
          );
        }),
    );
    write(
      "provider-variance-report.md",
      renderProviderVariance({
        families: perFamily.map((f) => ({ familyId: f.familyId, curve: f.curve, records: f.records })),
        availability: PROVIDERS.map(uninspectedProvider),
        artifacts,
      }),
    );

    // ---- self-check behaviour, submission quality, and shared-bank completion ------------------
    //
    // All three read the same artifacts, so they are built once and rendered three ways rather than
    // re-walking the trial directories per report.
    const base = analysisBase(root);
    const allTrials = base.allTrials;
    const selfCheckProfiles = selfCheckProfilesFor(base);
    write("self-check-behavior-report.md", renderSelfCheckBehavior({ profiles: selfCheckProfiles }));

    const qualityRows = qualityRowsFor(base, selfCheckProfiles);
    write("provider-submission-quality-report.md", renderSubmissionQuality(qualityRows));

    // Shared-bank completion, per bank kind, with the combined width computed only where the guard
    // allows it. `assertCombinedWidthAllowed` is what makes the refusal a property of the code.
    const completionBanks = bankInput(root, registry, evidenceFor, measureFor).banks;
    const completions = completionsFor(completionBanks, allTrials, evidenceState, uninspectedProvider);
    const combinedResults = new Map<string, CombinedResult>();
    for (const completion of completions) {
      const group = completionBanks.filter((b) => b.kind === completion.kind);
      try {
        assertCombinedWidthAllowed(completion);
        const overlap = computeOverlap(group);
        const matrix = combinedMatrixFor(overlap);
        const combinedMeasure = measureFor(matrix, { nullTrials: 5 });
        combinedResults.set(completion.kind, {
          perFamilyAxes: Object.fromEntries(
            group.map((b) => [
              b.familyId,
              b.matrix.subjects.length > 1 ? measureFor(b.matrix, { nullTrials: 3 }).independentAxes : 0,
            ]),
          ),
          combinedAxes: combinedMeasure.independentAxes,
          sumOfParts: group.reduce(
            (n, b) =>
              n +
              (b.matrix.subjects.length > 1 ? measureFor(b.matrix, { nullTrials: 3 }).independentAxes : 0),
            0,
          ),
          nullBaseline: combinedMeasure.nullBaseline?.meanWidth ?? null,
          ceiling: combinedMeasure.nullBaseline?.ceiling ?? null,
          instances: matrix.instances.length,
          measuredCells: measuredCells(matrix),
        });
      } catch {
        // Refused by the guard. The report renders the refusal and the exact blocker; a thrown
        // error here would replace an explanation with a stack trace.
      }
    }
    // Every PAIR of difficulty families, judged on its own. A group verdict is the minimum over its
    // members, so one lagging family suppresses a real number two others already support.
    const difficultyBanks = completionBanks.filter((b) => b.kind === "agent" || b.kind === "imported");
    const pairs: { completion: BankCompletion; combined: CombinedResult | null }[] = [];
    for (let i = 0; i < difficultyBanks.length; i += 1) {
      for (let j = i + 1; j < difficultyBanks.length; j += 1) {
        const a = difficultyBanks[i];
        const b = difficultyBanks[j];
        if (a === undefined || b === undefined) continue;
        // Kinds are still never merged: an `agent` bank and an `imported` one grade at different
        // fidelities, and `assertComparableKinds` refuses the pairing in code.
        if (a.kind !== b.kind) continue;
        const group = [a, b];
        const completion = completionsFor(group, allTrials, evidenceState, uninspectedProvider)[0];
        if (completion === undefined) continue;
        let combined: CombinedResult | null = null;
        try {
          assertCombinedWidthAllowed(completion);
          const matrix = combinedMatrixFor(computeOverlap(group));
          const m = measureFor(matrix, { nullTrials: 5 });
          const parts = group.map((g) =>
            g.matrix.subjects.length > 1 ? measureFor(g.matrix, { nullTrials: 3 }).independentAxes : 0,
          );
          combined = {
            perFamilyAxes: Object.fromEntries(group.map((g, k) => [g.familyId, parts[k] ?? 0])),
            combinedAxes: m.independentAxes,
            sumOfParts: parts.reduce((x, y) => x + y, 0),
            nullBaseline: m.nullBaseline?.meanWidth ?? null,
            ceiling: m.nullBaseline?.ceiling ?? null,
            instances: matrix.instances.length,
            measuredCells: measuredCells(matrix),
          };
        } catch {
          // Below threshold or incomparable. The row renders `refused` with the reason.
        }
        pairs.push({ completion, combined });
      }
    }
    write(
      "shared-bank-completion-report.md",
      renderBankCompletion({ completions, combined: combinedResults, pairs }),
    );

    // ---- scenario diversity: do the subjects' failure sets nest? --------------------------------
    //
    // Computed from COUNTED trials only. A superseded run measures a task that no longer exists, and
    // letting one into a chain would either invent an incomparable pair or hide a real one.
    const chains = routable.map((familyId) =>
      analyseChain(familyId, subjectFailuresFor(root, familyId, evidenceState)),
    );
    const targets = new Map(
      chains
        .filter((c) => c.subjects.length > 0)
        .map((c) => [
          c.familyId,
          diversityTargets(
            c.familyId,
            subjectFailuresFor(root, c.familyId, evidenceState),
            routeFor(c.familyId).scenarioParams(),
          ),
        ]),
    );
    // The descendant UI family. It is a built family now, but it still gets a purpose-built report
    // because its central claim is the categorical anchor fix for the parent chain defect.
    {
      const liveBundle = evidenceFor("ui-replay-live-dom");
      const liveMatrix = liveBundle.matrix;
      const liveReport = measureFor(liveMatrix, { nullTrials: 3 });
      const prepared = currentChallenge(root, "ui-replay-live-dom");
      const pkgCheck = checkChallengePackage(
        prepared.pkg.files,
        builtFamily("ui-replay-live-dom").leakProfile,
      );
      const evidence = liveBundle.evidence;
      const liveShape = registry.shapes.find((s) => s.familyId === "ui-replay-live-dom");
      if (liveShape === undefined) throw new Error("no task shape for ui-replay-live-dom");
      const assessment = assessFamily(liveShape, registry, evidence);
      const status = familyStatusLabel(assessment);
      const anchorPairs = [];
      for (let i = 0; i < liveMutants.ANCHOR_LOYAL_SUBJECTS.length; i += 1) {
        for (let j = i + 1; j < liveMutants.ANCHOR_LOYAL_SUBJECTS.length; j += 1) {
          const a = liveMutants.ANCHOR_LOYAL_SUBJECTS[i] ?? "";
          const b = liveMutants.ANCHOR_LOYAL_SUBJECTS[j] ?? "";
          const catchSet = (subjectId: string) =>
            new Set(
              liveMatrix.instances
                .filter((instance) => (liveMatrix.results[instance.id]?.[subjectId]?.failed.length ?? 0) > 0)
                .map((instance) => instance.id),
            );
          anchorPairs.push(liveDom.relate(catchSet(a), catchSet(b), a, b));
        }
      }
      const categoricalAnchorAxisProven = anchorPairs.every((p) => p.relation === "incomparable");
      write(
        "ui-replay-live-dom-report.md",
        renderLiveDom({
          familyId: "ui-replay-live-dom",
          parentId: UI_FAMILY,
          declaredPoints: liveScenarios.enumerateSpace().length,
          measuredScenarios: liveMatrix.instances.length,
          subjects: liveMatrix.subjects.length,
          mutants: liveMutants.MUTANTS.length,
          checks: [...liveVerify.CHECKS],
          referenceFailures: evidence.referencePasses ? 0 : 1,
          axes: liveReport.independentAxes,
          distinctCatchSets: liveReport.distinctMeasurements,
          blindInstances: liveReport.blindInstances.length,
          matrix: liveMatrix,
          challengeFiles: prepared.pkg.files.length,
          challengeHash: prepared.hash,
          countedAgentTrials: evidence.countedAgentTrials,
          status,
          anchorPairs,
          realism: "dom-like",
          parentRealism: "simulated-tree",
          gains: LIVE_DOM_GAINS,
        }),
      );
      const specText = prepared.pkg.files.find((f) => f.path === "SPEC.md")?.content ?? "";
      const requiredSections = [
        "Realism level",
        "Expected submission interface",
        "UI state model",
        "Action trace format",
        "Selector and anchor types",
        "Precedence",
        "What observed means",
        "Hidden confirmation state",
        "Disabled and enabled transitions",
        "Duplicate side-effect prevention",
        "Audit trail requirements",
        "Outcomes",
        "Replaying twice",
        "The facade",
      ];
      write(
        "ui-replay-live-dom-spec-report.md",
        [
          "# ui-replay-live-dom SPEC report",
          "",
          "| item | value |",
          "|---|---:|",
          "| realism label | dom-like |",
          `| visible rule codes | ${liveSpec.RULE_CODES.length} |`,
          `| required sections present | ${requiredSections.filter((s) => specText.includes(s)).length}/${requiredSections.length} |`,
          `| spec bytes | ${specText.length} |`,
          `| challenge hash | \`${prepared.hash}\` |`,
          "",
          "## Rule codes",
          "",
          ...liveSpec.RULE_CODES.map((c) => `- \`${c}\` — visible in SPEC.md`),
          "",
          "## Label",
          "",
          "Measured: SPEC completeness and package hash. Mutant-detection and real-agent difficulty are not inferred from this report.",
          "",
          "---",
          "",
          "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
          "",
        ].join("\n"),
      );
      write(
        "ui-replay-live-dom-challenge-package-report.md",
        [
          "# ui-replay-live-dom challenge package",
          "",
          "| item | value |",
          "|---|---:|",
          `| visible files | ${pkgCheck.files} |`,
          `| bytes | ${pkgCheck.bytes} |`,
          `| worked examples | ${pkgCheck.examples} |`,
          `| visible rule codes found | ${pkgCheck.specCodesFound} |`,
          `| hash | \`${prepared.hash}\` |`,
          "",
          "## Visible files",
          "",
          ...prepared.pkg.files.map((f) => `- \`${f.path}\``),
          "",
          "## Hidden from package",
          "",
          ...prepared.pkg.manifest.hiddenArtifacts.map((f) => `- \`${f}\``),
          "",
          "Measured: package builds, leak check passes, hash is deterministic. Not-run: no result is inferred from package readiness alone.",
          "",
          "---",
          "",
          "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
          "",
        ].join("\n"),
      );
      write(
        "ui-replay-live-dom-categorical-anchor-report.md",
        [
          "# ui-replay-live-dom categorical anchor axis",
          "",
          "| pair | relation | private witness A | private witness B |",
          "|---|---|---|---|",
          ...anchorPairs.map(
            (p) =>
              `| \`${p.a}\` / \`${p.b}\` | **${p.relation}** | \`${p.aOnly ?? "none"}\` | \`${p.bOnly ?? "none"}\` |`,
          ),
          "",
          `Categorical anchor axis proven: **${categoricalAnchorAxisProven ? "yes" : "no"}**.`,
          "",
          `Declared space: ${liveScenarios.enumerateSpace().length}. Measured set: ${liveMatrix.instances.length}.`,
          "",
          "Measured: mutant-detection catch sets over address-loyal known-bad subjects. Real-agent difficulty remains separate and requires counted trials.",
          "",
          "---",
          "",
          "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
          "",
        ].join("\n"),
      );
      write(
        "ui-replay-live-dom-codex-diagnosis.md",
        renderLiveDomCodexDiagnosis({
          records: liveBundle.trials.records,
          params: routeFor("ui-replay-live-dom").scenarioParams(),
          categoricalAnchorAxisProvenByMutants: categoricalAnchorAxisProven,
        }),
      );
      write(
        "ui-replay-live-dom-trial-readiness.md",
        [
          "# ui-replay-live-dom trial readiness",
          "",
          `Status: **${status}**.`,
          "",
          "| gate | value |",
          "|---|---|",
          `| challenge package | ${prepared.pkg.files.length} files |`,
          `| challenge hash | \`${prepared.hash}\` |`,
          `| scenario set | \`${prepared.scenarioSetId}\` |`,
          `| scenarios expected | ${liveMatrix.instances.length} |`,
          `| route | ${ROUTABLE_FAMILY_IDS.includes("ui-replay-live-dom") ? "present" : "missing"} |`,
          `| counted real-agent trials | ${evidence.countedAgentTrials} |`,
          "",
          "Provider handling: Codex/OpenAI is runnable locally when configured. Anthropic/Claude is import-only for this phase. Gemini is entitlement-blocked unless a future authenticated run changes that.",
          "",
          "Measured: package and route readiness. Not-run/refused/infrastructure_error/stale states remain no-count evidence until a counted trial exists.",
          "",
          "---",
          "",
          "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
          "",
        ].join("\n"),
      );
    }

    write(
      "scenario-diversity-report.md",
      renderDiversityUpgrade({
        chains,
        targets,
        proposals: new Map(
          chains.filter((c) => c.isChain).map((c) => [c.familyId, UI_AXIS_PROPOSALS] as const),
        ),
      }),
    );

    // One diagnosis document per family with counted failures.
    for (const f of perFamily) {
      const params = routeFor(f.familyId).scenarioParams();
      const diagnoses = f.records
        .filter((r) => r.subjectType === "agent")
        .map((record) =>
          diagnose({
            familyId: f.familyId,
            record,
            params,
            hypothesisChecks:
              f.familyId === MEMORY_FAMILY
                ? ["provenance_persisted", "no_forbidden_call", "exactly_allowed", "recall_trust_preserved"]
                : builtFamily(f.familyId).checks,
            hypothesisKnob: f.familyId === MEMORY_FAMILY ? "sessionsBetween" : null,
          }),
        );
      write(
        `${f.familyId}-agent-diagnosis.md`,
        f.familyId === ACCESS_TOKEN_FAMILY_ID
          ? renderAccessTokenSmokeDiagnosis({
              analysis: accessTokenSmoke.analysis,
              diagnoses: accessTokenSmoke.diagnoses,
              plan: accessTokenSmoke.plan,
              gate: accessTokenSmoke.gate,
              records: accessTokenSmoke.records,
            })
          : f.familyId === DELEGATED_WALLET_FAMILY_ID
            ? renderDelegatedWalletSmokeDiagnosis({
                analysis: delegatedWalletSmoke.analysis,
                diagnoses: delegatedWalletSmoke.diagnoses,
                plan: delegatedWalletSmoke.plan,
                gate: delegatedWalletSmoke.gate,
                records: delegatedWalletSmoke.records,
              })
            : f.familyId === DEPLOYMENT_ALIAS_FAMILY_ID
              ? renderDeploymentAliasSmokeDiagnosis({
                  analysis: deploymentAliasSmoke.analysis,
                  diagnoses: deploymentAliasSmoke.diagnoses,
                  plan: deploymentAliasSmoke.plan,
                  gate: deploymentAliasSmoke.gate,
                  records: deploymentAliasSmoke.records,
                })
              : renderDiagnoses(f.familyId, diagnoses, f.plan?.hypothesis ?? "No campaign plan on record."),
      );
    }

    write(
      "spec-ambiguity-and-stale-evidence-report.md",
      renderLifecycleReport({ ledgers, plans: campaignPlans, usdPerTrial: 3.5 }),
    );

    // Every migration must be declared with both hashes and a written reason, and must account for
    // the trials it invalidated. A hash that moved with no record behind it is indistinguishable
    // from a spec quietly reworded until the failures stopped.
    for (const ledger of ledgers) {
      for (const entry of ledger.entries) {
        if (entry.state === "superseded" && entry.ranAgainst !== null) {
          assertMigrationDeclared(ledger.familyId, entry.ranAgainst, ledger.currentHash);
        }
      }
      assertMigrationAccountsForLosses(ledger.familyId, ledger);
    }

    // The campaign that closed the shared bank, and the guards that keep it from rotting.
    //
    // `THIRD_SUBJECT_RUNS` names the runs that were executed to reach the threshold rather than
    // deriving them by date: "which trials were part of the campaign" is a fact about intent, and
    // inferring it from mtimes would silently absorb any trial that happened to land nearby.
    // The agent bank is the one this campaign was run to close. If it does not exist, neither does
    // the report — writing one against a mutant bank would describe a different question entirely.
    const agentCompletion = completions.find((c) => c.kind === "agent");
    write(
      "third-subject-campaign-report.md",
      renderThirdSubjectCampaign({
        completion: agentCompletion ?? null,
        availability: agentCompletion === undefined ? [] : PROVIDERS.map(uninspectedProvider),
        campaign: allTrials
          .filter(({ trial }) => THIRD_SUBJECT_RUNS.includes(trial.runId))
          .map(({ familyId, trial }) => ({
            runId: trial.runId,
            familyId,
            subjectId: normalizeSubjectId(trial.record.subjectId),
            providerFamily: (trial.record.model ?? "unknown").split("/")[0] ?? "unknown",
            scenariosGraded: trial.record.cells.length,
            scenariosFailed: trial.record.cells.filter((c) => c.failed.length > 0).length,
            runtimeSeconds: trial.record.runtimeSeconds,
            counted: (evidenceState.get(trial.runId) ?? "not-run") === "counted",
          }))
          .sort((a, b) => a.runId.localeCompare(b.runId)),
        usdPerTrial: 3.5,
        ledgers,
      }),
    );
    write(
      "spec-stale-evidence-regression-report.md",
      renderStaleEvidenceRegression({
        migrations: MIGRATIONS,
        ledgers,
        reportsChecked: rendered.size + 2,
        guards: STALE_EVIDENCE_GUARDS,
      }),
    );
  }

  // ---- what the UI family actually models ---------------------------------------------------------
  {
    const uiFamily = builtFamily(UI_FAMILY);
    const sweep = uiFamily.run();
    const prepared = currentChallenge(root, UI_FAMILY);
    write(
      "ui-action-record-replay-upgrade-report.md",
      renderUiUpgradeReport({
        sweep,
        axis: measureFor(sweep.matrix, { nullTrials: 3 }),
        plan: loadCampaigns(root).find((p) => p.familyId === UI_FAMILY) ?? null,
        challengeFiles: prepared.pkg.files.length,
        challengeHash: prepared.hash,
        countedTrials: evidenceFor(UI_FAMILY).evidence.countedAgentTrials,
      }),
    );
  }
  const browserReadiness = browserBackedReadiness(BROWSER_BACKED_NEXT_PLAN, browserMeasurement);
  write("ui-replay-browser-backed-scaffold.md", renderBrowserBackedScaffold());
  write("ui-replay-browser-backed-readiness.md", renderBrowserBackedReadiness(browserReadiness));
  write("ui-replay-browser-backed-report.md", renderBrowserBackedReport(browserMeasurement));
  write("ui-replay-browser-backed-axis-report.md", renderBrowserBackedAxisReport(browserMeasurement));

  // ---- did the evolution operator work? -----------------------------------------------------------
  write("evolution-validation-report.md", evolutionValidationReport(root, registry, evidenceFor));

  // The evolution layer: postmortems for families whose counted trials show they are already solved,
  // and the loop across all of them.
  const loopStates = loopAll(root, registry, evidenceFor);
  const lineageKillContexts = killReportLineageContexts(lineageEvaluations);
  // A family whose evidence has been WITHDRAWN needs a postmortem as much as one that was killed for
  // being easy — more, in fact. Without this clause the kill analysis simply stops being written when
  // a repair takes the counted trials to zero, and the last one generated stays on disk saying the
  // family was cleanly solved. The stalest report in a repository is the one nothing regenerates.
  const withdrawnFamilies = new Set(
    reportLedgers(root)
      .filter((ledger) => ledger.superseded.length > 0 && ledger.counted.length === 0)
      .map((ledger) => ledger.familyId),
  );
  for (const state of loopStates.filter(
    (item) =>
      item.analysis.primary?.reason === "already_solved" || withdrawnFamilies.has(item.shape.familyId),
  )) {
    const lineageContext = lineageKillContexts.get(state.shape.familyId);
    write(
      `${state.shape.familyId}-kill-analysis.md`,
      renderKillReport({
        shape: state.shape,
        analysis: state.analysis,
        ...(state.evidence === undefined ? {} : { evidence: state.evidence }),
        ...(lineageContext === undefined ? {} : { lineage: lineageContext }),
        variants: state.variants,
        trials: state.trials,
        ledgers: reportLedgers(root),
      }),
    );
  }
  write(
    "foundry-evolution-report.md",
    renderEvolutionReport({
      registry,
      states: loopStates,
      builtFamilyIds: BUILT_FAMILY_IDS,
      promoted: ["prompt-injection-memory-poisoning"],
      sharedBankSubjects: ev.evidence.sharedBankSubjects,
      sharedBankThreshold: 3,
    }),
  );
  {
    const checkerId = "checker-required-memory-poisoning";
    const checkerFamily = builtFamily(checkerId);
    const checkerSweep = checkerFamily.run();
    const checkerBundle = evidenceFor(checkerId);
    const checkerAxis = measureFor(checkerSweep.matrix, { nullTrials: 3 });
    const prepared = currentChallenge(root, checkerId);
    const pkgCheck = checkChallengePackage(prepared.pkg.files, checkerFamily.leakProfile);
    const checkerShape = registry.shapes.find((s) => s.familyId === checkerId);
    if (checkerShape === undefined) throw new Error("checker-required-memory-poisoning shape must exist");
    const assessment = assessFamily(checkerShape, registry, checkerBundle.evidence);
    const status = familyStatusLabel(assessment);
    write(
      "checker-required-family-report.md",
      [
        "# checker-required family report",
        "",
        `Family: \`${checkerId}\`.`,
        "",
        "| item | value |",
        "|---|---|",
        `| current status | **${status}** |`,
        `| ship verdict | **${assessment.verdict}** |`,
        `| declared space | ${checkerSweep.spaceSize} |`,
        `| measured scenarios | ${checkerSweep.scenarioCount} |`,
        `| known-bad submissions | ${checkerSweep.matrix.subjects.length} |`,
        `| checks | ${checkerFamily.checks.length} |`,
        `| reference failures | ${checkerSweep.referenceFailures.length} |`,
        `| baselines rejected | ${checkerSweep.baselinesBlocked.length}/${checkerSweep.baselinesTotal} |`,
        `| intended mutants caught | ${checkerSweep.mutantsCaught.filter((m) => m.caught).length}/${checkerSweep.mutantsCaught.length} |`,
        `| distinct catch sets | ${checkerAxis.distinctMeasurements} |`,
        `| mutant-detection axes | ${checkerAxis.independentAxes} |`,
        `| challenge package | ${pkgCheck.files} files, hash \`${prepared.hash}\` |`,
        "| required artifacts | `subject.mjs`, `checker.mjs` |",
        `| counted real-agent trials | ${checkerBundle.evidence.countedAgentTrials} |`,
        `| stale/superseded trials | ${checkerBundle.staleTrials.length} |`,
        "",
        "## Checker-mutant gates",
        "",
        "| mutant | intended check |",
        "|---|---|",
        ...checkerSweep.mutantsCaught.map(
          (m) =>
            `| \`${m.mutantId}\` | \`${m.check}\` — ${m.caught ? `caught ${m.caughtIn}/${m.total}` : "MISSED"} |`,
        ),
        "",
        "## Status",
        "",
        "Measured mutant-detection evidence exists now: the reference is clean, known-bad checker and",
        "subject submissions fail by intended checks, and the package is leak checked. This still does",
        "not imply real-agent difficulty; that requires counted trial directories with the current",
        "challenge hash.",
        "",
        `Measured: checker verifier/mutant bank and package readiness. Real-agent difficulty: ${checkerBundle.evidence.countedAgentTrials > 0 ? "measured" : "not-run"}.`,
        "Repeated OpenAI trials remain repeated trials unless a different model subject is actually available.",
        "",
        "---",
        "",
        "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
        "",
      ].join("\n"),
    );
    write(
      "checker-required-memory-poisoning-trial-readiness.md",
      [
        "# checker-required memory poisoning trial readiness",
        "",
        `Status: **${status}**.`,
        "",
        "| gate | value |",
        "|---|---|",
        `| challenge hash | \`${prepared.hash}\` |`,
        `| scenario set | \`${prepared.scenarioSetId}\` |`,
        `| visible package files | ${pkgCheck.files} |`,
        "| required submission files | `subject.mjs`, `checker.mjs` |",
        `| route present | ${ROUTABLE_FAMILY_IDS.includes(checkerId) ? "yes" : "no"} |`,
        `| scenarios expected | ${checkerSweep.scenarioCount} |`,
        `| counted real-agent trials | ${checkerBundle.evidence.countedAgentTrials} |`,
        `| agent-difficulty axes | ${checkerBundle.evidence.agentAxes ?? "not measured"} |`,
        "",
        "Countability rules: provider refusal, entitlement failure, infrastructure failure, timeout,",
        "missing challenge hash, stale challenge hash, missing submission artifact, and contaminated",
        "manual runs do not count.",
        "",
        "Provider handling for this phase: Codex/OpenAI may run locally. Anthropic/Claude is import-only.",
        "Gemini remains entitlement-blocked/import-only unless an authenticated run changes that state.",
        "",
        "---",
        "",
        "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
        "",
      ].join("\n"),
    );
  }

  // Every built family gets its own axis report and sweep summary.
  for (const family of BUILT_FAMILIES) {
    if (family.id === PIC_FAMILY) continue;
    write(
      `${family.id}-axis-report.md`,
      renderReport(measureFor(evidenceFor(family.id).matrix, { nullTrials: 3 })),
    );
  }
  const uiShape = registry.shapes.find((s) => s.familyId === UI_FAMILY);
  if (uiShape !== undefined) {
    write(`${UI_FAMILY}-family-report.md`, renderShapeReport(uiShape, registry, allEvidence[UI_FAMILY]));
  }
  write("historical-durable-outbox-trials.md", renderHistoricalReport(outboxHistory(root)));
  const phase11Results = parsePhase11Results(
    JSON.parse(readFileSync(join(root, "data", "phase-11-results.json"), "utf8")),
    "data/phase-11-results.json",
  );
  const phase10Summary = parsePhase10Summary(
    JSON.parse(readFileSync(join(root, "data", "phase-10-trials.json"), "utf8")),
    "data/phase-10-trials.json",
  );
  write(
    "PHASE-11-DISCOVERY.md",
    renderPhase11DiscoveryReport({ root, results: phase11Results, phase10: phase10Summary }),
  );
  const hardnessLedger = parseHardnessOperatorLedger(
    JSON.parse(readFileSync(join(root, "data", "hardness-operators.json"), "utf8")),
  );
  const daoFamily = builtFamily("dao-descendant");
  const daoRun = daoDescendant.runFamily();
  const daoSweep = daoFamily.run();
  const preparedDao = currentChallenge(root, "dao-descendant");
  const daoPackageCheck = checkChallengePackage(preparedDao.pkg.files, daoFamily.leakProfile);
  const target = daoRun.scenarios.filter(
    (scenario) => scenario.params.crashPosition === "after_tool" && scenario.params.nWorkers > 1,
  );
  const targetIds = new Set(target.map((scenario) => scenario.id));
  const narrow = daoRun.cells.filter((cell) => cell.subjectId === "recompute-current-epoch");
  const targetNarrow = narrow.filter((cell) => targetIds.has(cell.scenarioId));
  const controlNarrow = narrow.filter((cell) => !targetIds.has(cell.scenarioId));
  const daoFacts = {
    challengeHash: preparedDao.hash,
    challengeFiles: daoPackageCheck.files,
    declaredSpace: daoRun.spaceSize,
    selectedScenarios: daoRun.scenarios.length,
    activatedScenarios: target.length,
    referenceFailures: daoRun.cells.filter(
      (cell) => cell.subjectId === "reference" && cell.failures.length > 0,
    ).length,
    narrowMutantFailures: targetNarrow.filter((cell) => cell.failures.length > 0).length,
    narrowMutantLocalGreen: targetNarrow.filter((cell) => cell.localConfirmationsGreen).length,
    nonActivationControls: controlNarrow.length,
    nonActivationMutantFailures: controlNarrow.filter((cell) => cell.failures.length > 0).length,
    mutantsCaught: daoSweep.mutantsCaught.filter((mutant) => mutant.caught).length,
    mutantsTotal: daoSweep.mutantsCaught.length,
    rigUsable: daoRun.rigUsable,
    malformedInputRefused: daoRun.malformedInputRefused,
    packageGatePassed: true,
  };
  const daoProse = SHAPE_PROSE["dao-descendant"];
  if (daoProse === undefined) throw new Error("dao-descendant has no shape prose");
  const daoShape = parseTaskShape(shapeFromFamily(daoFamily, daoProse), "generated.dao-descendant");
  const exampleDeltas =
    loopStates.flatMap((state) => state.variants).find((variant) => variant.materialDeltas.length > 0)
      ?.materialDeltas ?? [];
  write("hardness-operator-ledger.md", renderHardnessOperatorLedger(hardnessLedger));
  write("dao-descendant-foundation.md", renderDaoDescendantFoundation(daoFacts));
  write(
    "variant-schema-migration.md",
    renderVariantSchemaMigration({ descendant: daoShape, exampleDeltas, operators: OPERATORS }),
  );
  write(
    "PHASE-12-HARDNESS-FOUNDATION.md",
    renderPhase12FoundationSummary({ ledger: hardnessLedger, facts: daoFacts }),
  );
  const phase13Results = measurePhase13(root, "historical");
  write("PHASE-13-TRANSFER-LAB.md", renderPhase13TransferLab(phase13Results, "historical"));
  write("PHASE-14-OPERATOR-EFFECTS.md", renderPhase14OperatorEffects(root));
  write("PHASE-15-DISCOVERY-ENGINE.md", renderPhase15DiscoveryEngine(root));
  write("PHASE-16-DISCOVERY-V3.md", renderPhase16DiscoveryV3(root));
  write("PHASE-17-CAA-VALIDATION.md", renderPhase17CaaValidation(root));
  const inputs = { ...MEASURED_DEFAULTS, totalUsd: 100_000, labourRateUsdPerHour: 120 };
  assertBudgetInputs(inputs);
  assertPlanHonest(planBudget(inputs));
  write(
    "budget-plan.md",
    renderBudgetReport(inputs, 1000, trialLayerFacts(root), campaignFacts(root), providerSpend(root)),
  );
  const run = ev.run;
  const picMatrix = ev.matrix;
  const picAxis = measureFor(picMatrix, { nullTrials: 3 });
  write("prompt-injection-containment-family-report.md", renderFamilyReport({ run, axis: picAxis }));
  write("prompt-injection-containment-axis-report.md", renderReport(picAxis));
  write("cross-family-diversity-report.md", crossFamilyCommand(root));
  // Include late-written postmortems and historical research views as well. Report every
  // violation together so one stale sentence cannot hide the next behind a slow rerender.
  const violations: string[] = [];
  for (const [name, text] of rendered) {
    try {
      assertStaleRunsLabelled(name, text, reportLedgers(root));
    } catch (error) {
      violations.push(String(error));
    }
  }
  if (violations.length) throw new Error(violations.join("\n"));
  return `${written.map((w) => `wrote ${dir}/${w}`).join("\n")}\n`;
}
