// discovery: extracted compatibility command services. Core APIs remain independent of dispatch.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  adversarialBundlePath,
  adversarialCampaignPath,
  verifierHashFor,
} from "../adversarial-audit/readiness.js";
import { adversarialGateEvidenceMap, summarizeAdversarialEvidence } from "../adversarial-audit/records.js";
import { measure } from "../axis-meter.js";
import { checkChallengePackage } from "../challenge/package-check.js";
import {
  auditDeploymentAliasExternalPackets,
  loadExternalIntakeResults,
  renderExternalIntakeReport,
} from "../external-intake/report.js";
import { referenceFailures } from "../families/prompt-injection-containment/runner.js";
import { BUILT_FAMILIES, BUILT_FAMILY_IDS, builtFamily } from "../families/registry.js";
import {
  type FamilyFunnelEvidence,
  type TransferTest,
  planAdaptiveFunnel,
} from "../foundry/adaptive-funnel.js";
import {
  deploymentAliasEvolutionProposals,
  planDeploymentAliasEvolution,
} from "../foundry/deployment-alias-evolution.js";
import {
  candidateToTaskShapeDraft,
  scoreDiscoveryCandidates,
  summarizeDiscoveryWorkbench,
} from "../foundry/discovery-workbench.js";
import {
  type FamilyLineage,
  type LineageEvaluation,
  type LineageRuntimeFamilyEvidence,
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
import { probeEvidenceForDiscovery, probeToTaskShapeDraft } from "../foundry/probe-runner.js";
import { evaluateProductionReadiness } from "../foundry/production-readiness.js";
import {
  promotedFamilyRecords,
  promotionEvidenceForDiscovery,
  promotionToFamilyScaffold,
} from "../foundry/promotion.js";
import { diagnoseProviderDelta } from "../foundry/provider-delta-diagnosis.js";
import { type PromotionSmokeGateResult, evaluatePromotionSmokeGate } from "../foundry/smoke-gates.js";
import { auditHumanReadinessForFamilies } from "../human-solvability/readiness.js";
import {
  humanGateEvidenceMap,
  loadHumanReviewRecords,
  summarizeHumanEvidence,
} from "../human-solvability/records.js";
import { classifyAccessTokenSmoke } from "../reports/access-token-diagnosis.js";
import {
  renderAdaptiveFunnelReport,
  renderFunnelProbes,
  renderFunnelTransfers,
} from "../reports/adaptive-funnel-report.js";
import { analyseFamilyTrials } from "../reports/agent-results.js";
import { classifyDelegatedWalletSmoke } from "../reports/delegated-wallet-diagnosis.js";
import {
  classifyDeploymentAliasSmoke,
  renderDeploymentAliasSmokeDiagnosis,
} from "../reports/deployment-alias-diagnosis.js";
import {
  auditDeploymentAliasCrossLabBundles,
  renderDeploymentAliasAdversarialReadiness,
  renderDeploymentAliasCrossLabReadiness,
  renderDeploymentAliasHumanIntake,
  renderDeploymentAliasMatrixReadinessGap,
  renderDeploymentAliasProductionReadiness,
} from "../reports/deployment-alias-production.js";
import { diagnose } from "../reports/diagnosis.js";
import {
  renderDiscoveryCandidates,
  renderDiscoveryNext,
  renderDiscoveryScaffoldSummary,
  renderDiscoveryScores,
  renderDiscoveryWorkbenchReport,
} from "../reports/discovery-workbench-report.js";
import {
  familyEvidenceFor,
  type familyEvidenceMap,
  familyEvidenceMapForShipReport,
} from "../reports/evidence.js";
import type { LineageKillContext } from "../reports/kill-report.js";
import { renderLineageLearningReport } from "../reports/lineage-report.js";
import {
  renderMechanismProbeReport,
  renderProbeNext,
  renderProbeRun,
  renderProbeScaffoldSummary,
} from "../reports/probe-runner-report.js";
import {
  renderPromotionNext,
  renderPromotionReport,
  renderPromotionScaffoldSummary,
} from "../reports/promotion-report.js";
import {
  renderDeploymentAliasEvolutionOptionsReport,
  renderDeploymentAliasProviderDeltaDiagnosisReport,
} from "../reports/provider-delta-diagnosis-report.js";
import {
  deploymentAliasProviderDeltaComparison,
  renderDeploymentAliasProviderDeltaReport,
} from "../reports/provider-delta-report.js";
import { normalizeSubjectId } from "../trials/bank.js";
import { type CampaignPlan, loadCampaigns } from "../trials/campaign.js";
import { readFamilyTrials } from "../trials/directory.js";
import { measuredScenarios, scenarioSetId } from "../trials/orchestrate.js";
import { ROUTABLE_FAMILY_IDS, routeFor } from "../trials/router.js";
import { currentChallenge } from "../trials/run.js";
import { challengeHash } from "../trials/run.js";
import { flag, positional } from "./arguments.js";
import { reportLedgers } from "./evidence.js";
import { artifactInspectionForTrial } from "./files.js";

export function adaptiveFamilyEvidenceInputs(
  root: string,
  evidence: Readonly<Record<string, ReturnType<typeof familyEvidenceMap>[string]>>,
): readonly FamilyFunnelEvidence[] {
  return Object.values(evidence)
    .map((e) => {
      const stale = new Set(e.staleTrials ?? []);
      const records = readFamilyTrials(join(root, "trials"), e.familyId).map((t) => t.record);
      const counted = records.filter(
        (r) => r.subjectType === "agent" && r.counts && r.status === "completed" && !stale.has(r.runId),
      );
      const sharedProviderFamilies = [
        ...new Set(counted.map((r) => (r.model ?? r.subjectId).split("/")[0] ?? "unknown")),
      ].sort();
      return {
        familyId: e.familyId,
        countedAgentTrials: e.countedAgentTrials,
        agentTrialsPassed: e.agentTrialsPassed,
        sharedProviderFamilies,
        staleTrials: e.staleTrials ?? [],
        providerRefusals: records.filter((r) => r.subjectType === "agent" && r.status === "refused").length,
        ...(e.trialReady === undefined ? {} : { trialReady: e.trialReady }),
        ...(e.agentFailuresChain === undefined ? {} : { agentFailuresChain: e.agentFailuresChain }),
        ...(e.agentAxes === undefined ? {} : { agentAxes: e.agentAxes }),
        ...(e.cleanHumanSolves === undefined ? {} : { cleanHumanSolves: e.cleanHumanSolves }),
        ...(e.countedNoBypassAudits === undefined ? {} : { countedNoBypassAudits: e.countedNoBypassAudits }),
        ...(e.productionMixedCrossLabSmoke === undefined
          ? {}
          : { productionMixedCrossLabSmoke: e.productionMixedCrossLabSmoke }),
        ...(e.providerDeltaDiagnosisPresent === undefined
          ? {}
          : { providerDeltaDiagnosisPresent: e.providerDeltaDiagnosisPresent }),
        ...(e.evolutionOptionsPresent === undefined
          ? {}
          : { evolutionOptionsPresent: e.evolutionOptionsPresent }),
      };
    })
    .sort((a, b) => a.familyId.localeCompare(b.familyId));
}

export function adaptiveFunnelInputs(root: string) {
  const registry = loadRegistry(root);
  const funnel = loadAdaptiveFunnel(root, registry);
  const evidence = familyEvidenceMapForShipReport(root);
  const summary = planAdaptiveFunnel(funnel, registry, adaptiveFamilyEvidenceInputs(root, evidence));
  return { registry, funnel, summary };
}

export function funnelNextReport(summary: ReturnType<typeof planAdaptiveFunnel>): string {
  return [
    "adaptive funnel next actions",
    "target | type | mode | stage | decision | cost | action",
    ...summary.nextActions.map(
      (a) =>
        `${a.targetId} | ${a.targetType} | ${a.mode} | ${a.stage} | ${a.decision} | ${a.evidenceCost} | ${a.action}`,
    ),
    "",
    "Do not run /6 first. Full matrix is earned after smoke and transfer evidence.",
    "",
  ].join("\n");
}

export function funnelCommand(argv: readonly string[], root: string): string {
  const sub = positional(argv, 1) ?? "report";
  const input = adaptiveFunnelInputs(root);
  if (sub === "report") return renderAdaptiveFunnelReport(input);
  if (sub === "probes") return renderFunnelProbes(input.funnel.probes);
  if (sub === "transfer") return renderFunnelTransfers(input.funnel.transfers);
  if (sub === "next") return funnelNextReport(input.summary);
  throw new Error(`unknown funnel subcommand "${sub}"; expected report | probes | next | transfer`);
}

export function discoveryInputs(root: string) {
  const registry = loadRegistry(root);
  const funnel = loadAdaptiveFunnel(root, registry);
  const workbench = loadDiscoveryWorkbench(root, registry, funnel);
  const probeSummary = loadProbeRunSummary(root, registry, workbench);
  const promotions = loadPromotions(root, registry, workbench);
  const smokeGates = promotionSmokeGateMap(root, loadCampaigns(root), funnel.transfers);
  const lineages = loadLineages(root, registry, workbench, promotions);
  const lineageEvaluations = evaluateLineages(lineages, lineageRuntimeEvidence(root, lineages, smokeGates));
  const reallocation = planPortfolioReallocation(lineages, lineageEvaluations, workbench);
  const probeEvidence = [
    ...probeEvidenceForDiscovery(probeSummary),
    ...promotionEvidenceForDiscovery(promotions),
    ...lineageFeedbackForDiscovery(reallocation),
  ];
  const summary = summarizeDiscoveryWorkbench(workbench, probeEvidence);
  const scores = scoreDiscoveryCandidates(workbench.candidates);
  return {
    registry,
    funnel,
    workbench,
    summary,
    scores,
    probeSummary,
    probeEvidence,
    promotions,
    lineages,
    lineageEvaluations,
    reallocation,
  };
}

export function discoveryCommand(argv: readonly string[], root: string): string {
  const sub = positional(argv, 1) ?? "report";
  const input = discoveryInputs(root);
  if (sub === "report") {
    return renderDiscoveryWorkbenchReport({
      registry: input.registry,
      workbench: input.workbench,
      summary: input.summary,
      ledgers: reportLedgers(root),
    });
  }
  if (sub === "candidates") return renderDiscoveryCandidates(input.workbench.candidates);
  if (sub === "score") return renderDiscoveryScores(input.scores, input.workbench.candidates);
  if (sub === "next") return renderDiscoveryNext(input.summary, input.workbench.candidates);
  if (sub === "scaffold") {
    const candidateId = flag(argv, "--candidate");
    const out = flag(argv, "--out");
    if (candidateId === null) throw new Error("discovery scaffold needs --candidate <id>");
    if (out === null) throw new Error("discovery scaffold needs --out <dir>");
    const candidate = input.workbench.candidates.find((c) => c.id === candidateId);
    if (candidate === undefined) throw new Error(`unknown discovery candidate "${candidateId}"`);
    const draft = candidateToTaskShapeDraft(candidate);
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "task-shape-draft.json"), `${JSON.stringify(draft, null, 2)}\n`, "utf8");
    writeFileSync(
      join(out, "README.md"),
      [
        `# ${candidate.title}`,
        "",
        "Generated by `agent-eval-foundry discovery scaffold`.",
        "",
        "This is a draft task-shape bridge from Discovery Mode to Validation Mode. It is not a",
        "challenge package, not a verifier, and not difficulty evidence.",
        "",
        `Source candidate: \`${candidate.id}\``,
        `Recommended next step: \`${input.scores.find((s) => s.candidateId === candidate.id)?.recommendedAction ?? "unknown"}\``,
        "",
      ].join("\n"),
      "utf8",
    );
    process.stderr.write(`wrote discovery scaffold to ${out}/\n`);
    return renderDiscoveryScaffoldSummary(draft);
  }
  throw new Error(
    `unknown discovery subcommand "${sub}"; expected report | candidates | score | next | scaffold`,
  );
}

export function probesCommand(argv: readonly string[], root: string): string {
  const sub = positional(argv, 1) ?? "report";
  const registry = loadRegistry(root);
  const workbench = loadDiscoveryWorkbench(root, registry);
  const definitions = loadProbeDefinitions(root, registry, workbench);
  const summary = loadProbeRunSummary(root, registry, workbench);
  if (sub === "run") return renderProbeRun(summary);
  if (sub === "report") return renderMechanismProbeReport(summary, definitions, workbench.candidates);
  if (sub === "next") return renderProbeNext(summary);
  if (sub === "scaffold") {
    const probeId = flag(argv, "--probe");
    const out = flag(argv, "--out");
    if (probeId === null) throw new Error("probes scaffold needs --probe <id>");
    if (out === null) throw new Error("probes scaffold needs --out <dir>");
    const definition = definitions.find((probe) => probe.id === probeId);
    if (definition === undefined) throw new Error(`unknown mechanism probe "${probeId}"`);
    const candidate = workbench.candidates.find((c) => c.id === definition.candidateId);
    if (candidate === undefined) throw new Error(`probe "${probeId}" references missing candidate`);
    const result = summary.probes.find((probe) => probe.probeId === probeId);
    if (result === undefined) throw new Error(`probe "${probeId}" did not run`);
    const draft = probeToTaskShapeDraft(definition, candidate, result);
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "task-shape-draft.json"), `${JSON.stringify(draft, null, 2)}\n`, "utf8");
    writeFileSync(
      join(out, "README.md"),
      [
        `# ${candidate.title}`,
        "",
        "Generated by `agent-eval-foundry probes scaffold`.",
        "",
        "This is a draft task-shape bridge from executable probe evidence. It is not a challenge",
        "package, not a verifier, and not real-agent difficulty evidence.",
        "",
        `Source probe: \`${definition.id}\``,
        `Probe verdict: \`${result.verdict}\``,
        "",
      ].join("\n"),
      "utf8",
    );
    process.stderr.write(`wrote probe scaffold to ${out}/\n`);
    return renderProbeScaffoldSummary(draft);
  }
  throw new Error(`unknown probes subcommand "${sub}"; expected run | report | next | scaffold`);
}

export function promotionInputs(root: string) {
  const registry = loadRegistry(root);
  const funnel = loadAdaptiveFunnel(root, registry);
  const workbench = loadDiscoveryWorkbench(root, registry, funnel);
  const definitions = loadProbeDefinitions(root, registry, workbench);
  const summary = loadProbeRunSummary(root, registry, workbench);
  const promotions = loadPromotions(root, registry, workbench);
  const records = promotedFamilyRecords(promotions, definitions, summary, workbench);
  const campaigns = loadCampaigns(root);
  const smokeGates = promotionSmokeGateMap(root, campaigns, funnel.transfers);
  return { registry, workbench, definitions, summary, promotions, records, smokeGates };
}

export const ACCESS_TOKEN_FAMILY_ID = "access-token-scope-expansion";

export const DELEGATED_WALLET_FAMILY_ID = "delegated-wallet-scope-reconciliation";

export const DEPLOYMENT_ALIAS_FAMILY_ID = "deployment-model-alias-rollout-drift";

export interface PromotionSmokeContext {
  readonly plan: CampaignPlan | undefined;
  readonly analysis: ReturnType<typeof analyseFamilyTrials>;
  readonly diagnoses: ReturnType<typeof diagnose>[];
  readonly gate: PromotionSmokeGateResult;
  readonly records: ReturnType<typeof familyEvidenceFor>["trials"]["records"];
}

export function promotionSmokeGateMap(
  root: string,
  campaigns: readonly CampaignPlan[],
  transfers: readonly TransferTest[],
): ReadonlyMap<string, PromotionSmokeGateResult> {
  return new Map([
    [ACCESS_TOKEN_FAMILY_ID, accessTokenSmokeContext(root, campaigns, transfers).gate],
    [DELEGATED_WALLET_FAMILY_ID, delegatedWalletSmokeContext(root, campaigns, transfers).gate],
    [DEPLOYMENT_ALIAS_FAMILY_ID, deploymentAliasSmokeContext(root, campaigns, transfers).gate],
  ]);
}

export function accessTokenSmokeContext(
  root: string,
  campaigns: readonly CampaignPlan[],
  transfers: readonly TransferTest[],
): PromotionSmokeContext {
  return smokeContext(root, campaigns, transfers, ACCESS_TOKEN_FAMILY_ID, classifyAccessTokenSmoke);
}

export function delegatedWalletSmokeContext(
  root: string,
  campaigns: readonly CampaignPlan[],
  transfers: readonly TransferTest[],
): PromotionSmokeContext {
  return smokeContext(root, campaigns, transfers, DELEGATED_WALLET_FAMILY_ID, classifyDelegatedWalletSmoke);
}

export function deploymentAliasSmokeContext(
  root: string,
  campaigns: readonly CampaignPlan[],
  transfers: readonly TransferTest[],
): PromotionSmokeContext {
  return smokeContext(
    root,
    campaigns,
    transfers,
    DEPLOYMENT_ALIAS_FAMILY_ID,
    classifyDeploymentAliasSmoke,
    deploymentAliasMatrixBlockedReason,
  );
}

export function smokeContext(
  root: string,
  campaigns: readonly CampaignPlan[],
  transfers: readonly TransferTest[],
  familyId: string,
  classify: (
    analysis: ReturnType<typeof analyseFamilyTrials>,
    diagnoses: ReturnType<typeof diagnose>[],
  ) => PromotionSmokeGateResult["smokeDiagnosisStatus"],
  matrixBlockedReasonFor: (
    analysis: ReturnType<typeof analyseFamilyTrials>,
    diagnoses: ReturnType<typeof diagnose>[],
  ) => string | null = () => null,
): PromotionSmokeContext {
  const plan = campaigns.find((campaign) => campaign.familyId === familyId);
  const bundle = familyEvidenceFor(root, familyId);
  const params = routeFor(familyId).scenarioParams();
  const analysis = analyseFamilyTrials(familyId, bundle.trials, params, plan);
  const diagnoses = bundle.trials.records
    .filter((record) => record.subjectType === "agent")
    .map((record) =>
      diagnose({
        familyId,
        record,
        params,
        hypothesisChecks: builtFamily(familyId).checks,
        hypothesisKnob: null,
      }),
    );
  const currentHash = currentChallenge(root, familyId).hash;
  const sweep = builtFamily(familyId).run();
  const localEvidencePass =
    sweep.referenceFailures.length === 0 &&
    sweep.mutantsCaught.every((mutant) => mutant.caught) &&
    sweep.baselinesBlocked.length === sweep.baselinesTotal;
  const diagnosisStatus = classify(analysis, diagnoses);
  const matrixBlockedReason = matrixBlockedReasonFor(analysis, diagnoses);
  const transferDeclared = transfers.some(
    (transfer) => transfer.sourceKind === "family" && transfer.sourceId === familyId,
  );

  return {
    plan,
    analysis,
    diagnoses,
    records: bundle.trials.records,
    gate: evaluatePromotionSmokeGate({
      familyId,
      localEvidencePass,
      campaignPresent: plan !== undefined,
      campaignHashCurrent: plan === undefined ? true : plan.challengeHash === currentHash,
      packageHashCurrent: plan === undefined ? true : plan.challengeHash === currentHash,
      verifierMutantBaselinePass: localEvidencePass,
      countedSmokeTrials: analysis.counted,
      countedFailures: analysis.failures,
      countedSolves: analysis.solves,
      providerRefusals: analysis.refusals,
      infraFailures: analysis.infra,
      transferDeclared,
      diagnosisStatus,
      matrixBlockedReason,
    }),
  };
}

export function deploymentAliasMatrixBlockedReason(
  analysis: ReturnType<typeof analyseFamilyTrials>,
): string | null {
  const counted = analysis.outcomes.filter(
    (outcome) => outcome.kind === "counted_failure" || outcome.kind === "counted_solve",
  );
  const providerFamily = (model: string | null): string => model?.split("/")[0]?.toLowerCase() ?? "unknown";
  const openAiFailed = counted.some(
    (outcome) => outcome.kind === "counted_failure" && providerFamily(outcome.model) === "openai",
  );
  const nonOpenAiSolved = counted.some(
    (outcome) =>
      outcome.kind === "counted_solve" &&
      !["openai", "external", "manual", "unknown"].includes(providerFamily(outcome.model)),
  );
  return openAiFailed && nonOpenAiSolved
    ? "mixed provider smoke: OpenAI failed on target, Claude solved; diagnose/evolve before /6 matrix spend"
    : null;
}

export function smokeFailureModelFamilies(
  analysis: ReturnType<typeof analyseFamilyTrials>,
): readonly string[] {
  return [
    ...new Set(
      analysis.outcomes
        .filter((outcome) => outcome.kind === "counted_failure")
        .map((outcome) => outcome.model?.split("/")[0] ?? "unknown"),
    ),
  ].sort();
}

export function lineageRuntimeEvidence(
  root: string,
  lineages: readonly FamilyLineage[],
  smokeGates: ReadonlyMap<string, PromotionSmokeGateResult>,
): ReadonlyMap<string, LineageRuntimeFamilyEvidence> {
  const familyIds = [
    ...new Set(lineages.flatMap((lineage) => lineage.nodes.map((node) => node.familyId))),
  ].sort();
  const out = new Map<string, LineageRuntimeFamilyEvidence>();
  for (const familyId of familyIds) {
    if (!BUILT_FAMILY_IDS.includes(familyId)) continue;
    const family = builtFamily(familyId);
    const sweep = family.run();
    const axis = measure(sweep.matrix, { nullTrials: 3 });
    const bundle = familyEvidenceFor(root, familyId);
    const counted = bundle.trials.records.filter((record) => record.subjectType === "agent" && record.counts);
    const failed = (record: (typeof counted)[number]) => record.cells.some((cell) => cell.failed.length > 0);
    const gate = smokeGates.get(familyId);
    out.set(familyId, {
      familyId,
      currentPackageHash: ROUTABLE_FAMILY_IDS.includes(familyId)
        ? currentChallenge(root, familyId).hash
        : null,
      localEvidencePass:
        sweep.referenceFailures.length === 0 &&
        sweep.mutantsCaught.every((mutant) => mutant.caught) &&
        sweep.baselinesBlocked.length === sweep.baselinesTotal,
      countedSmokeTrials: counted.length,
      countedSmokeSolves: counted.filter((record) => !failed(record)).length,
      countedSmokeFailures: counted.filter((record) => failed(record)).length,
      providerFamilies: [
        ...new Set(counted.map((record) => (record.model ?? "unknown").split("/")[0] ?? "unknown")),
      ].sort(),
      subjectIds: [...new Set(counted.map((record) => normalizeSubjectId(record.subjectId)))].sort(),
      fullMatrixReady: gate?.fullMatrixReady ?? false,
      fullMatrixBlocked: gate?.matrixReadinessStatus !== "ready",
      transferDeclared: gate?.transferDeclarationStatus === "declared",
      smokeDiagnosis:
        gate?.smokeDiagnosisStatus === undefined || gate.smokeDiagnosisStatus === "none"
          ? "none"
          : gate.smokeDiagnosisStatus,
      scenarioCount: sweep.scenarioCount,
      mutantAxes: axis.independentAxes,
    });
  }
  return out;
}

export function lineageInputs(root: string) {
  const registry = loadRegistry(root);
  const funnel = loadAdaptiveFunnel(root, registry);
  const workbench = loadDiscoveryWorkbench(root, registry, funnel);
  const promotions = loadPromotions(root, registry, workbench);
  const smokeGates = promotionSmokeGateMap(root, loadCampaigns(root), funnel.transfers);
  const lineages = loadLineages(root, registry, workbench, promotions);
  const evaluations = evaluateLineages(lineages, lineageRuntimeEvidence(root, lineages, smokeGates));
  const reallocation = planPortfolioReallocation(lineages, evaluations, workbench);
  return { registry, funnel, workbench, promotions, smokeGates, lineages, evaluations, reallocation };
}

export function lineageNextReport(reallocation: ReturnType<typeof planPortfolioReallocation>): string {
  return [
    "lineage next actions",
    "candidate | cluster | adjusted score | action",
    ...reallocation.nextRecommendations.map(
      (item) =>
        `${item.candidateId} | ${item.mechanismCluster} | ${item.adjustedScore.toFixed(1)} | ${item.recommendedAction}`,
    ),
    "",
    reallocation.exactNextBuildRecommendation,
    "",
    "Lineage feedback is portfolio-routing evidence, not difficulty evidence.",
    "",
  ].join("\n");
}

export function killReportLineageContexts(
  evaluations: readonly LineageEvaluation[],
): ReadonlyMap<string, LineageKillContext> {
  const out = new Map<string, LineageKillContext>();
  for (const evaluation of evaluations) {
    const appliesToFamilyIds = evaluation.nodes.map((node) => node.familyId);
    for (const familyId of appliesToFamilyIds) {
      out.set(familyId, {
        lineageId: evaluation.lineageId,
        verdict: evaluation.verdict,
        decision: evaluation.decision,
        reason: evaluation.reason,
        nextAction: evaluation.nextAction,
        estimatedMatrixSpendSavedUsd: evaluation.estimatedMatrixSpendSavedUsd,
        appliesToFamilyIds,
      });
    }
  }
  return out;
}

export function lineageCommand(argv: readonly string[], root: string): string {
  const sub = positional(argv, 1) ?? "report";
  const input = lineageInputs(root);
  if (sub === "report") {
    return renderLineageLearningReport(input.lineages, input.evaluations, input.reallocation);
  }
  if (sub === "next") return lineageNextReport(input.reallocation);
  throw new Error(`unknown lineage subcommand "${sub}"; expected report | next`);
}

export function providerDeltaCommand(argv: readonly string[], root: string): string {
  const sub = positional(argv, 1) ?? "report";
  const familyId = flag(argv, "--family") ?? DEPLOYMENT_ALIAS_FAMILY_ID;
  if (familyId !== DEPLOYMENT_ALIAS_FAMILY_ID) {
    throw new Error("provider-delta v1 is implemented for deployment-model-alias-rollout-drift");
  }
  const inputs = deploymentAliasProviderDeltaInputs(root);
  if (sub === "diagnosis") {
    return renderDeploymentAliasProviderDeltaDiagnosisReport(inputs.diagnosis);
  }
  if (sub === "evolution") {
    return renderDeploymentAliasEvolutionOptionsReport(
      inputs.evolutionPlan,
      inputs.selectedEvolutionProbeResult,
    );
  }
  if (sub !== "report") {
    throw new Error(`unknown provider-delta subcommand "${sub}"; expected report | diagnosis | evolution`);
  }
  return renderDeploymentAliasProviderDeltaReport(inputs.reportInput);
}

export function deploymentAliasProviderDeltaInputs(root: string) {
  const familyId = DEPLOYMENT_ALIAS_FAMILY_ID;
  const registry = loadRegistry(root);
  const funnel = loadAdaptiveFunnel(root, registry);
  const campaigns = loadCampaigns(root);
  const context = deploymentAliasSmokeContext(root, campaigns, funnel.transfers);
  const prepared = currentChallenge(root, familyId);
  const reportInput = {
    challengeHash: prepared.hash,
    scenarioSetId: prepared.scenarioSetId,
    records: context.records,
    externalResults: loadExternalIntakeResults(root, familyId),
    diagnoses: context.diagnoses,
  };
  const comparison = deploymentAliasProviderDeltaComparison(reportInput);
  const diagnosis = diagnoseProviderDelta({
    familyId,
    challengeHash: prepared.hash,
    scenarioSetId: prepared.scenarioSetId,
    comparison,
    records: context.records,
    diagnoses: context.diagnoses,
    artifacts: context.records
      .filter((record) => record.subjectType === "agent")
      .map((record) => artifactInspectionForTrial(root, familyId, record, prepared.hash)),
    scenarioParams: routeFor(familyId).scenarioParams(),
  });
  const probeSummary = loadProbeRunSummary(root, registry);
  const evolutionPlan = planDeploymentAliasEvolution(diagnosis, deploymentAliasEvolutionProposals());
  return {
    context,
    prepared,
    reportInput,
    diagnosis,
    evolutionPlan,
    selectedEvolutionProbeResult:
      evolutionPlan.selectedProposalId === null
        ? null
        : (probeSummary.probes.find((probe) => probe.probeId === evolutionPlan.selectedProposalId) ?? null),
  };
}

export function deploymentAliasReadinessOutputs(root: string): readonly {
  readonly name: string;
  readonly text: string;
}[] {
  const registry = loadRegistry(root);
  const adaptiveFunnel = loadAdaptiveFunnel(root, registry);
  const campaignPlans = loadCampaigns(root);
  const context = deploymentAliasSmokeContext(root, campaignPlans, adaptiveFunnel.transfers);
  const family = builtFamily(DEPLOYMENT_ALIAS_FAMILY_ID);
  const sweep = family.run();
  const prepared = currentChallenge(root, DEPLOYMENT_ALIAS_FAMILY_ID);
  const pkgCheck = checkChallengePackage(prepared.pkg.files, family.leakProfile);
  const localEvidencePass =
    sweep.referenceFailures.length === 0 &&
    sweep.mutantsCaught.every((mutant) => mutant.caught) &&
    sweep.baselinesBlocked.length === sweep.baselinesTotal;
  const humanAudits = auditHumanReadinessForFamilies(root);
  const humanSummaries = summarizeHumanEvidence(humanAudits, loadHumanReviewRecords(root));
  const human = humanGateEvidenceMap(humanSummaries)[DEPLOYMENT_ALIAS_FAMILY_ID];
  const adversarial = adversarialGateEvidenceMap(summarizeAdversarialEvidence(root))[
    DEPLOYMENT_ALIAS_FAMILY_ID
  ];
  const externalResults = loadExternalIntakeResults(root, DEPLOYMENT_ALIAS_FAMILY_ID);
  const providerDeltaInputs = deploymentAliasProviderDeltaInputs(root);
  const openAiHalfMatrix = campaignPlans.find(
    (campaign) => campaign.campaignId === "deployment-model-alias-rollout-drift-openai-half-matrix-2026-09",
  );
  const readiness = evaluateProductionReadiness({
    familyId: DEPLOYMENT_ALIAS_FAMILY_ID,
    challengeHash: prepared.hash,
    currentChallengeHash: prepared.hash,
    localVerifierReady: localEvidencePass,
    packageBacked: ROUTABLE_FAMILY_IDS.includes(DEPLOYMENT_ALIAS_FAMILY_ID) && pkgCheck.files > 0,
    campaignPresent: context.plan !== undefined,
    campaignHashCurrent: context.plan === undefined ? true : context.plan.challengeHash === prepared.hash,
    packageHashCurrent: context.plan === undefined ? true : context.plan.challengeHash === prepared.hash,
    countedSmokeTrials: context.analysis.counted,
    countedSmokeFailures: context.analysis.failures,
    countedSmokeSolves: context.analysis.solves,
    providerRefusals: context.analysis.refusals,
    infraFailures: context.analysis.infra,
    modelFamilies: context.analysis.modelFamilies,
    countedFailureModelFamilies: smokeFailureModelFamilies(context.analysis),
    diagnosisStatus: context.gate.smokeDiagnosisStatus,
    transferDeclared: context.gate.transferDeclarationStatus === "declared",
    adversarialReady: adversarial?.adversarialPackageReady ?? false,
    countedNoBypassAudits: adversarial?.countedNoBypassAudits ?? 0,
    countedBypassAudits: adversarial?.countedBypassAudits ?? 0,
    unrepairedBypasses: adversarial?.unrepairedBypasses ?? 0,
    humanReady: human?.humanPackageReady ?? false,
    cleanHumanSolves: human?.cleanHumanSolves ?? 0,
  });
  return [
    {
      name: "deployment-model-alias-rollout-drift-production-readiness.md",
      text: renderDeploymentAliasProductionReadiness({
        readiness,
        analysis: context.analysis,
        challengeHash: prepared.hash,
        scenarioSetId: prepared.scenarioSetId,
        measuredScenarios: sweep.scenarioCount,
        declaredSpace: sweep.spaceSize,
        mutantDetectionAxes: measure(sweep.matrix, { nullTrials: 3 }).independentAxes,
        packageFiles: pkgCheck.files,
        packageBytes: pkgCheck.bytes,
        providerDeltaDiagnosisPresent: true,
        evolutionOptionsPresent: true,
      }),
    },
    {
      name: "deployment-model-alias-rollout-drift-cross-lab-readiness.md",
      text: renderDeploymentAliasCrossLabReadiness({
        expectedHash: prepared.hash,
        expectedScenarioSetId: prepared.scenarioSetId,
        analysis: context.analysis,
        audits: auditDeploymentAliasCrossLabBundles(root, prepared.hash, prepared.scenarioSetId),
      }),
    },
    {
      name: "deployment-model-alias-rollout-drift-adversarial-readiness.md",
      text: renderDeploymentAliasAdversarialReadiness({
        challengeHash: prepared.hash,
        verifierHash: verifierHashFor(root, DEPLOYMENT_ALIAS_FAMILY_ID),
        summary: adversarial,
        campaignPath: adversarialCampaignPath(root, DEPLOYMENT_ALIAS_FAMILY_ID).replace(`${root}/`, ""),
        bundlePath: adversarialBundlePath(root, DEPLOYMENT_ALIAS_FAMILY_ID).replace(`${root}/`, ""),
      }),
    },
    {
      name: "deployment-model-alias-rollout-drift-external-intake.md",
      text: renderExternalIntakeReport({
        familyId: DEPLOYMENT_ALIAS_FAMILY_ID,
        expectedHash: prepared.hash,
        expectedScenarioSetId: prepared.scenarioSetId,
        packetAudits: auditDeploymentAliasExternalPackets(root),
        intakeResults: externalResults,
        ledgers: reportLedgers(root),
      }),
    },
    {
      name: "deployment-model-alias-rollout-drift-human-intake.md",
      text: renderDeploymentAliasHumanIntake({
        challengeHash: prepared.hash,
        scenarioSetId: prepared.scenarioSetId,
        human,
        packetPath: "human-reviews/deployment-model-alias-rollout-drift",
      }),
    },
    {
      name: "deployment-model-alias-rollout-drift-matrix-readiness-gap.md",
      text: renderDeploymentAliasMatrixReadinessGap({
        readiness,
        analysis: context.analysis,
        human,
        adversarial,
        externalResults,
        openAiHalfMatrix,
        challengeHash: prepared.hash,
        scenarioSetId: prepared.scenarioSetId,
        providerDeltaDiagnosisPresent: true,
        evolutionOptionsPresent: true,
        ledgers: reportLedgers(root),
      }),
    },
    {
      name: "deployment-model-alias-rollout-drift-provider-delta.md",
      text: renderDeploymentAliasProviderDeltaReport(providerDeltaInputs.reportInput),
    },
    {
      name: "deployment-model-alias-rollout-drift-provider-delta-diagnosis.md",
      text: renderDeploymentAliasProviderDeltaDiagnosisReport(providerDeltaInputs.diagnosis),
    },
    {
      name: "deployment-model-alias-rollout-drift-evolution-options.md",
      text: renderDeploymentAliasEvolutionOptionsReport(
        providerDeltaInputs.evolutionPlan,
        providerDeltaInputs.selectedEvolutionProbeResult,
      ),
    },
    {
      name: "deployment-model-alias-rollout-drift-agent-diagnosis.md",
      text: renderDeploymentAliasSmokeDiagnosis({
        analysis: context.analysis,
        diagnoses: context.diagnoses,
        plan: context.plan,
        gate: context.gate,
        records: context.records,
      }),
    },
  ];
}

export function deploymentAliasCommand(argv: readonly string[], root: string): string {
  const sub = positional(argv, 1) ?? "readiness";
  if (sub !== "readiness") {
    throw new Error(`unknown deployment-alias subcommand "${sub}"; expected readiness`);
  }
  const dir = flag(argv, "--out") ?? join(root, "reports");
  mkdirSync(dir, { recursive: true });
  const outputs = deploymentAliasReadinessOutputs(root);
  for (const output of outputs) {
    writeFileSync(join(dir, output.name), output.text, "utf8");
  }
  return [
    `wrote ${outputs.length} deployment-alias readiness report(s) to ${dir.replace(`${root}/`, "")}`,
    "",
    ...outputs.map((output) => `- ${output.name}`),
    "",
  ].join("\n");
}

export function promotionCommand(argv: readonly string[], root: string): string {
  const sub = positional(argv, 1) ?? "report";
  const input = promotionInputs(root);
  if (sub === "report") {
    return renderPromotionReport(input.records, input.summary, BUILT_FAMILIES, input.smokeGates);
  }
  if (sub === "next") return renderPromotionNext(input.promotions);
  if (sub === "scaffold") {
    const promotionId = flag(argv, "--promotion");
    const out = flag(argv, "--out");
    if (promotionId === null) throw new Error("promotion scaffold needs --promotion <id>");
    if (out === null) throw new Error("promotion scaffold needs --out <dir>");
    const record = input.records.find((item) => item.promotion.id === promotionId);
    if (record === undefined) throw new Error(`unknown promotion "${promotionId}"`);
    const scaffold = promotionToFamilyScaffold(record);
    for (const file of scaffold.files) {
      const target = join(out, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.content, "utf8");
    }
    process.stderr.write(`wrote promotion scaffold to ${out}/\n`);
    return renderPromotionScaffoldSummary(scaffold);
  }
  throw new Error(`unknown promotion subcommand "${sub}"; expected report | next | scaffold`);
}
