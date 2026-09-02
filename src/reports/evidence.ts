// One place that assembles a family's evidence from everything on disk.
//
// This module exists because of a bug the tests found rather than a design I chose. The CLI built
// family evidence one way (local runs + durable trial directories + the loose inbox + the shared
// bank count) and the determinism test built it another way (local runs only). Both were reasonable;
// they produced different documents; the test then reported the checked-in report as "stale" when
// the only thing stale was the test's idea of what the report was made of.
//
// Rendering a report and checking a report must go through the same function, or the check is
// checking something else. Everything that needs family evidence now calls `familyEvidenceFor`.
//
// The second thing it fixes is reproducibility. The historical trial data used to be read from a
// sibling repository by relative path, so `foundry all` produced different output on a machine that
// had only cloned this one — which would have made every checked-in report unverifiable for anyone
// but me. The run summaries are now vendored under `examples/durable-outbox/runs/`, and that is the
// default path. A live archive can still be passed explicitly.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  adversarialGateEvidenceMap,
  augmentAdversarialEvidenceMap,
  summarizeAdversarialEvidence,
} from "../adversarial-audit/records.js";
import { checkChallengePackage } from "../challenge/package-check.js";
import { ALL_SUBJECTS, runFamily, toMatrix } from "../families/prompt-injection-containment/runner.js";
import type { RunResult } from "../families/prompt-injection-containment/runner.js";
import { BUILT_FAMILY_IDS, builtFamily } from "../families/registry.js";
import { readBrowserBackedMeasurement } from "../families/ui-replay-browser-backed/measurement.js";
import { browserBackedReadiness } from "../families/ui-replay-browser-backed/readiness.js";
import type { TransferTest } from "../foundry/adaptive-funnel.js";
import { loadAdaptiveFunnel, loadRegistry, readJson } from "../foundry/load.js";
import { evaluateProductionReadiness } from "../foundry/production-readiness.js";
import {
  augmentFamilyEvidenceMap,
  humanEvidenceForFamilies,
  humanGateEvidenceMap,
} from "../human-solvability/records.js";
import { parseMatrix } from "../matrix.js";
import { buildAgentBank } from "../trials/agent-bank.js";
import { type KindedBank, computeOverlap, kindedBank, normalizeSubjectId } from "../trials/bank.js";
import { reconcile } from "../trials/campaign-run.js";
import { type CampaignPlan, loadCampaigns } from "../trials/campaign.js";
import type { TrialDirectory } from "../trials/directory.js";
import { readFamilyTrials } from "../trials/directory.js";
import { classifyRunKind, importDurableOutboxHistory } from "../trials/history.js";
import type { ImportedHistory } from "../trials/history.js";
import { importAgentTrials, runLocalTrials } from "../trials/orchestrate.js";
import { tallyRootCauses, unlabelledRootCause } from "../trials/root-cause.js";
import type { RootCauseRecord } from "../trials/root-cause.js";
import { ROUTABLE_FAMILY_IDS, routeFor } from "../trials/router.js";
import { hashChallengeDir, prepareChallenge } from "../trials/run.js";
import { NEVER_COUNTS, countedAgentTrials } from "../trials/types.js";
import type { TrialRecord, TrialSet } from "../trials/types.js";
import type { Matrix } from "../types.js";
import { analyseFamilyTrials } from "./agent-results.js";
import { BROWSER_BACKED_NEXT_PLAN } from "./browser-backed-scaffold.js";
import { analyseChain } from "./chain-analysis.js";
import { classifyDeploymentAliasSmoke } from "./deployment-alias-diagnosis.js";
import { diagnose } from "./diagnosis.js";
import type { FamilyEvidence } from "./ship-report.js";
import { computeEvidence, mechanismCoverage, mechanismsExercisedFrom } from "./trial-report.js";

export const PIC_FAMILY = "prompt-injection-containment";
export const MEMORY_FAMILY = "prompt-injection-memory-poisoning";
export const OUTBOX_FAMILY = "durable-approval-outbox";
export const UI_FAMILY = "ui-action-record-replay";
export const DEPLOYMENT_ALIAS_FAMILY_ID = "deployment-model-alias-rollout-drift";

const ROUTABLE = new Set(ROUTABLE_FAMILY_IDS);

/** Vendored Harbor run summaries — the default source for historical outbox trials. */
export const vendoredRunsDir = (root: string): string => join(root, "examples/durable-outbox/runs");

/**
 * Difficulty-axis facts for the ship gate: do the counted subjects fail in more than one direction?
 *
 * Computed from counted trials only, and from the SUBJECT's union rather than per-run, because three
 * runs of one model are three samples of one subject. Stale trials are excluded upstream — a
 * superseded run would either invent an incomparable pair or hide a real one, and both err toward
 * flattering the family.
 */
function agentAxisFacts(records: readonly TrialRecord[], stale: ReadonlySet<string>) {
  const bySubject = new Map<string, { failed: Set<string>; providerFamily: string }>();
  for (const r of records) {
    if (r.subjectType !== "agent" || !r.counts || stale.has(r.runId)) continue;
    const id = normalizeSubjectId(r.subjectId);
    const entry = bySubject.get(id) ?? {
      failed: new Set<string>(),
      providerFamily: (r.model ?? "unknown").split("/")[0] ?? "unknown",
    };
    for (const cell of r.cells) if (cell.failed.length > 0) entry.failed.add(cell.scenarioId);
    bySubject.set(id, entry);
  }
  const chain = analyseChain(
    "",
    [...bySubject.entries()].map(([subjectId, v]) => ({
      subjectId,
      providerFamily: v.providerFamily,
      failed: v.failed as ReadonlySet<string>,
      graded: 0,
    })),
  );
  if (chain.subjects.length < 2) {
    return {
      agentAxes: null,
      agentFailuresChain: false,
      agentChainOrder: [],
    };
  }
  return {
    agentAxes: chain.agentAxes,
    agentFailuresChain: chain.isChain,
    agentChainOrder: chain.order,
  };
}

/**
 * Root-cause facts over a family's counted agent population.
 *
 * Records from the loose inbox have no trial directory and therefore no sidecar, so they resolve to
 * `unlabelled` here rather than being skipped. Skipping them would shrink the denominator and make a
 * family look better-adjudicated than it is.
 */
function rootCauseFacts(counted: readonly TrialRecord[], dirs: readonly TrialDirectory[]) {
  const byRunId = new Map(dirs.map((d) => [d.runId, d.rootCause]));
  const tally = tallyRootCauses(
    counted.map((record) => ({
      record,
      rootCause: byRunId.get(record.runId) ?? unlabelledRootCause(record.runId, record.familyId),
    })),
  );
  return {
    capabilityEvidencedTrials: tally.capability,
    unlabelledCountedTrials: tally.unlabelled,
    rootCauseCounts: tally.byLabel as Readonly<Record<string, number>>,
  };
}

export interface FamilyEvidenceBundle {
  readonly run: RunResult;
  readonly trials: TrialSet;
  readonly evidence: FamilyEvidence;
  readonly matrix: Matrix;
  /** Trials excluded because they were run against a different challenge. Preserved, not counted. */
  readonly staleTrials: readonly string[];
}

/**
 * Everything known about a BUILT family: its own sweep, every trial record on disk, and the derived
 * evidence the ship gate reads.
 *
 * Family-aware since the trial router arrived. It used to run the containment family unconditionally
 * and read the containment trial directory whatever it was asked for — which was invisible while
 * there was one family and would have graded the memory family's trials against the containment
 * sweep the moment there were two.
 *
 * Trial records come from three places on purpose. Durable directories are trials this repository
 * ran; the loose inbox is for attempts run elsewhere and imported by hand; local runs are the
 * in-process reference and mutant subjects. They are pooled here and separated downstream by
 * `subjectType` and `counts`, never by which list they came from.
 */
export function familyEvidenceFor(root: string, familyId: string = PIC_FAMILY): FamilyEvidenceBundle {
  const dirs = readFamilyTrials(join(root, "trials"), familyId);

  // Trials that measured a DIFFERENT challenge are dropped here rather than counted. The hash is the
  // only thing that ties a preserved result to a task anyone can still read, and a family whose spec
  // was repaired after a trial has evidence for a task that no longer exists.
  const stale = staleRunIds(root, familyId, dirs);
  const durable = dirs.filter((d) => !stale.has(d.runId)).map((d) => d.record);
  const loose = importAgentTrials(join(root, `trials-inbox/${familyId}`));

  if (familyId !== PIC_FAMILY) {
    // Non-containment families have no in-process local subject runner; their sweep comes from the
    // built-family registry and their mutant evidence from that sweep.
    const family = builtFamily(familyId);
    const sweep = family.run();
    // Per scenario, from the sweep's own matrix. `mutantsCaught` carries which check each mutant was
    // written to trip, so the intended-check map the coverage needs is already here — this used to
    // be `sweep.referenceFailures.length === 0`, the same expression as `referencePasses` two lines
    // above it.
    const coverage = mechanismCoverage(
      sweep.matrix,
      sweep.mutantsCaught.map((m) => ({ mutantId: m.mutantId, check: m.check })),
    );
    const trials: TrialSet = {
      familyId,
      scenarioSetId: `${familyId}-sweep`,
      records: [...durable, ...loose],
    };
    const sharedBankSubjects = sharedSubjectCount(root, familyId);
    const counted = countedAgentTrials(trials);
    return {
      run: runFamily([]),
      trials,
      matrix: sweep.matrix,
      staleTrials: [...stale].sort(),
      evidence: {
        familyId,
        referencePasses: sweep.referenceFailures.length === 0,
        baselinesBlocked: sweep.baselinesBlocked,
        baselinesTotal: sweep.baselinesTotal,
        mutantsCaught: sweep.mutantsCaught.map((m) => ({
          mutantId: m.mutantId,
          check: m.check,
          caught: m.caught,
        })),
        mechanismsExercised: mechanismsExercisedFrom(coverage),
        mechanismScenarios: coverage.scenarios,
        mechanismScenariosExercised: coverage.exercised,
        mechanismScenariosBlind: coverage.blind.length,
        mechanismScenariosMisattributed: coverage.misattributed.length,
        isolation: counted[0]?.isolation ?? "subprocess",
        countedAgentTrials: counted.length,
        agentTrialsPassed: counted.filter((t) => t.cells.every((c) => c.failed.length === 0)).length,
        sharedBankSubjects,
        reportsDeterministic: true,
        trialReady: ROUTABLE.has(familyId),
        staleTrials: [...stale].sort(),
        ...agentAxisFacts(trials.records, stale),
        ...rootCauseFacts(counted, dirs),
      },
    };
  }

  const run = runFamily(ALL_SUBJECTS);
  const local = runLocalTrials();
  const trials = { ...local, records: [...local.records, ...durable, ...loose] };
  const sharedBankSubjects = sharedSubjectCount(root, familyId);
  return {
    run,
    trials,
    evidence: {
      ...computeEvidence(run, trials, { sharedBankSubjects }),
      trialReady: ROUTABLE.has(familyId),
      staleTrials: [...stale].sort(),
      ...agentAxisFacts(trials.records, stale),
      ...rootCauseFacts(countedAgentTrials(trials), dirs),
    },
    matrix: toMatrix(run),
    staleTrials: [...stale].sort(),
  };
}

/** Family evidence keyed by id, in the shape the ship report expects. */
export const familyEvidenceMap = (root: string): Record<string, FamilyEvidence> => {
  const browserReadiness = browserBackedReadiness(
    BROWSER_BACKED_NEXT_PLAN,
    readBrowserBackedMeasurement(root),
  );
  const base = augmentAdversarialEvidenceMap(
    root,
    augmentFamilyEvidenceMap(
      root,
      Object.fromEntries(BUILT_FAMILY_IDS.map((id) => [id, familyEvidenceFor(root, id).evidence])),
    ),
  );
  const liveDom = base["ui-replay-live-dom"];
  if (liveDom === undefined) return base;
  return {
    ...base,
    "ui-replay-live-dom": {
      ...liveDom,
      browserBackedReady: browserReadiness.browserBackedReady,
      browserBackedMeasured: browserReadiness.browserBackedMeasured,
      browserBackedDetail: browserReadiness.architectureReady
        ? browserReadiness.browserBackedMeasured
          ? `${browserReadiness.measuredScenarios} Playwright-backed scenario(s) measured; real-agent difficulty remains not-run`
          : "browser-backed architecture is declared; executable Playwright measurement is still missing"
        : "browser-backed architecture incomplete",
    },
  };
};

export function augmentProductionReadinessEvidenceMap(
  root: string,
  base: Readonly<Record<string, FamilyEvidence>>,
  campaigns: readonly CampaignPlan[],
  transfers: readonly TransferTest[],
): Record<string, FamilyEvidence> {
  const deploymentEvidence = base[DEPLOYMENT_ALIAS_FAMILY_ID];
  if (deploymentEvidence === undefined) return { ...base };

  const humanEvidence = humanGateEvidenceMap(humanEvidenceForFamilies(root));
  const adversarialEvidence = adversarialGateEvidenceMap(summarizeAdversarialEvidence(root));
  const deploymentFamily = builtFamily(DEPLOYMENT_ALIAS_FAMILY_ID);
  const deploymentSweep = deploymentFamily.run();
  const deploymentPrepared = prepareChallenge(root, DEPLOYMENT_ALIAS_FAMILY_ID);
  const deploymentPackageCheck = checkChallengePackage(
    deploymentPrepared.pkg.files,
    deploymentFamily.leakProfile,
  );
  const deploymentBundle = familyEvidenceFor(root, DEPLOYMENT_ALIAS_FAMILY_ID);
  const plan = campaigns.find((campaign) => campaign.familyId === DEPLOYMENT_ALIAS_FAMILY_ID);
  const params = routeFor(DEPLOYMENT_ALIAS_FAMILY_ID).scenarioParams();
  const analysis = analyseFamilyTrials(DEPLOYMENT_ALIAS_FAMILY_ID, deploymentBundle.trials, params, plan);
  const diagnoses = deploymentBundle.trials.records
    .filter((record) => record.subjectType === "agent")
    .map((record) =>
      diagnose({
        familyId: DEPLOYMENT_ALIAS_FAMILY_ID,
        record,
        params,
        hypothesisChecks: deploymentFamily.checks,
        hypothesisKnob: null,
      }),
    );
  const localEvidencePass =
    deploymentSweep.referenceFailures.length === 0 &&
    deploymentSweep.mutantsCaught.every((mutant) => mutant.caught) &&
    deploymentSweep.baselinesBlocked.length === deploymentSweep.baselinesTotal;
  const deploymentHuman = humanEvidence[DEPLOYMENT_ALIAS_FAMILY_ID];
  const deploymentAdversarial = adversarialEvidence[DEPLOYMENT_ALIAS_FAMILY_ID];
  const readiness = evaluateProductionReadiness({
    familyId: DEPLOYMENT_ALIAS_FAMILY_ID,
    challengeHash: deploymentPrepared.hash,
    currentChallengeHash: deploymentPrepared.hash,
    localVerifierReady: localEvidencePass,
    packageBacked:
      ROUTABLE_FAMILY_IDS.includes(DEPLOYMENT_ALIAS_FAMILY_ID) && deploymentPackageCheck.files > 0,
    campaignPresent: plan !== undefined,
    campaignHashCurrent: plan === undefined ? true : plan.challengeHash === deploymentPrepared.hash,
    packageHashCurrent: plan === undefined ? true : plan.challengeHash === deploymentPrepared.hash,
    countedSmokeTrials: analysis.counted,
    countedSmokeFailures: analysis.failures,
    countedSmokeSolves: analysis.solves,
    providerRefusals: analysis.refusals,
    infraFailures: analysis.infra,
    modelFamilies: analysis.modelFamilies,
    countedFailureModelFamilies: failureModelFamilies(analysis),
    diagnosisStatus: classifyDeploymentAliasSmoke(analysis, diagnoses),
    transferDeclared: transfers.some(
      (transfer) => transfer.sourceKind === "family" && transfer.sourceId === DEPLOYMENT_ALIAS_FAMILY_ID,
    ),
    adversarialReady: deploymentAdversarial?.adversarialPackageReady ?? false,
    countedNoBypassAudits: deploymentAdversarial?.countedNoBypassAudits ?? 0,
    countedBypassAudits: deploymentAdversarial?.countedBypassAudits ?? 0,
    unrepairedBypasses: deploymentAdversarial?.unrepairedBypasses ?? 0,
    humanReady: deploymentHuman?.humanPackageReady ?? false,
    cleanHumanSolves: deploymentHuman?.cleanHumanSolves ?? 0,
  });

  return {
    ...base,
    [DEPLOYMENT_ALIAS_FAMILY_ID]: {
      ...deploymentEvidence,
      productionMatrixReady: readiness.fullMatrixReady,
      productionMatrixDetail: readiness.fullMatrixReady
        ? "production matrix ready"
        : `${readiness.productionMatrixStatus}; ${readiness.nextAction}`,
      productionReadinessStatuses: readiness.statuses,
      productionCrossLabSmokeEvidenced: readiness.crossLabSmokeEvidenced,
      productionMixedCrossLabSmoke: readiness.mixedCrossLabSmoke,
      providerDeltaDiagnosisPresent: true,
      evolutionOptionsPresent: true,
    },
  };
}

function failureModelFamilies(analysis: {
  readonly outcomes: readonly { readonly kind: string; readonly model: string | null }[];
}) {
  return [
    ...new Set(
      analysis.outcomes
        .filter((outcome) => outcome.kind === "counted_failure")
        .map((outcome) => outcome.model?.split("/")[0] ?? "unknown"),
    ),
  ].sort();
}

export function familyEvidenceMapForShipReport(root: string): Record<string, FamilyEvidence> {
  const registry = loadRegistry(root);
  const funnel = loadAdaptiveFunnel(root, registry);
  return augmentProductionReadinessEvidenceMap(
    root,
    familyEvidenceMap(root),
    loadCampaigns(root),
    funnel.transfers,
  );
}

// ---------------------------------------------------------------- cross-family subject overlap

/**
 * The current challenge hash for a family, memoized for the life of the process.
 *
 * The hash is a pure function of the family's own source, which cannot change while the process is
 * running, and computing it means generating the family's whole scenario set — 16 s for the live-DOM
 * family. It used to be computed once per `familyEvidenceFor` call, which was already several times
 * per report; reading cross-family subject facts multiplies that by the number of measured families.
 * Memoizing it is the difference between a cheap directory read and a minute of regeneration.
 */
const currentChallengeHashes = new Map<string, string>();

function currentChallengeHash(root: string, familyId: string): string {
  const key = `${root}\u0000${familyId}`;
  const hit = currentChallengeHashes.get(key);
  if (hit !== undefined) return hit;
  const hash = prepareChallenge(root, familyId).hash;
  currentChallengeHashes.set(key, hash);
  return hash;
}

/**
 * Run ids whose preserved challenge is not the one the family produces today.
 *
 * Same rule as `gateByChallengeHash`, and deliberately the same fallback: a directory that predates
 * the metadata field is hashed from the challenge copy it preserved, because the artifact is better
 * evidence than a note about the artifact. The only difference is the memoized current hash above.
 */
function staleRunIds(root: string, familyId: string, dirs: readonly TrialDirectory[]): ReadonlySet<string> {
  if (!ROUTABLE.has(familyId)) return new Set<string>();
  const current = currentChallengeHash(root, familyId);
  const stale = new Set<string>();
  for (const dir of dirs) {
    let recorded: string | null = null;
    try {
      const meta = JSON.parse(readFileSync(join(dir.path, "metadata.json"), "utf8")) as Record<
        string,
        unknown
      >;
      recorded = typeof meta["challengeHash"] === "string" ? meta["challengeHash"] : null;
    } catch {
      recorded = null;
    }
    const derived = recorded ?? hashChallengeDir(join(dir.path, "challenge"));
    if (derived !== current) stale.add(dir.runId);
  }
  return stale;
}

/** A counted agent trial: the only population a subject may be read off. */
const countsAsAgentTrial = (r: TrialRecord): boolean =>
  r.subjectType === "agent" && r.counts && !NEVER_COUNTS.has(r.status);

/**
 * Every counted agent trial for a family paired with its root-cause record.
 *
 * Directory-backed trials only: a loose-inbox record has nowhere to put a sidecar, so it cannot be
 * adjudicated and cannot be difficulty evidence. Callers that need the whole counted population
 * (including the inbox) use `countedAgentRecordsFor` and treat what is missing here as unlabelled.
 */
export function countedRootCausesFor(
  root: string,
  familyId: string,
): readonly { readonly record: TrialRecord; readonly rootCause: RootCauseRecord }[] {
  const dirs = readFamilyTrials(join(root, "trials"), familyId);
  const stale = staleRunIds(root, familyId, dirs);
  return dirs
    .filter((d) => !stale.has(d.runId) && countsAsAgentTrial(d.record))
    .map((d) => ({ record: d.record, rootCause: d.rootCause }));
}

/** Every counted agent trial record for a family, stale challenges excluded. */
export function countedAgentRecordsFor(root: string, familyId: string): readonly TrialRecord[] {
  const dirs = readFamilyTrials(join(root, "trials"), familyId);
  const stale = staleRunIds(root, familyId, dirs);
  const durable = dirs.filter((d) => !stale.has(d.runId)).map((d) => d.record);
  const loose = importAgentTrials(join(root, `trials-inbox/${familyId}`));
  return [...durable, ...loose].filter(countsAsAgentTrial);
}

/**
 * One bank per MEASURED family, built from trial directories alone.
 *
 * "Measured" means a family somebody has actually attempted, so the imported outbox history is one
 * of them rather than a privileged reference set — which is exactly what the old shared-bank metric
 * treated it as. No family sweep runs here: a bank's instance ids come from the scenarios the
 * counted trials were graded on, which the records already carry. Sweeping the other seven families
 * to answer "who else attempted this" would be 64 sweeps per report.
 */
export function measuredAgentBanks(root: string): readonly KindedBank[] {
  const banks = ROUTABLE_FAMILY_IDS.map((familyId) => {
    const records = countedAgentRecordsFor(root, familyId);
    const instanceIds = [...new Set(records.flatMap((r) => r.cells.map((c) => c.scenarioId)))].sort();
    const bank = buildAgentBank(records, {
      familyId,
      instanceIds,
      caveat:
        "Counted agent trials only, restricted to the scenarios those trials were graded on. Built " +
        "for subject overlap; the instance set is the trials' own, not the family's full sweep.",
    });
    return kindedBank(
      { familyId, matrix: bank.matrix, provenance: "counted agent trials", agentDerived: true },
      "agent",
    );
  });

  const outboxRecords = outboxHistory(root).records.filter(countsAsAgentTrial);
  const outboxBank = buildAgentBank(outboxRecords, {
    familyId: OUTBOX_FAMILY,
    instanceIds: outboxMatrix(root).instances.map((i) => i.id),
    caveat:
      "Imported from the source project's Harbor runs. Coarse cells; carried here for subject " +
      "overlap only.",
  });
  return [
    ...banks,
    kindedBank(
      {
        familyId: OUTBOX_FAMILY,
        matrix: outboxBank.matrix,
        provenance: "counted frontier trials imported from the source project",
        agentDerived: true,
      },
      "imported",
    ),
  ];
}

/**
 * How many of a family's counted subjects also appear in the counted trials of ANOTHER measured
 * family.
 *
 * The previous version intersected the family's subject ids with the imported outbox history and
 * nothing else, so the metric was "how many of `claude-opus-5` and `gpt-5.6-sol` appear in my
 * records" — capped at 2 by construction, against a gate threshold of 3. A blocking-adjacent gate
 * that cannot pass is the vacuous-gate failure mode inverted: it says nothing about the family and
 * everything about the arithmetic.
 *
 * The overlap itself is `computeOverlap`, run pairwise: it is the repository's existing convention
 * for "which subjects attempted both of these banks", and a third convention for the same question
 * is how the first two stopped agreeing. Pairwise rather than all-at-once because the gate asks
 * whether cross-family co-failure is observable at all, and one other family is enough for that;
 * `computeOverlap` over every bank at once answers the stricter question the cross-family axis count
 * needs, and is still used there.
 */
export function sharedSubjectCount(root: string, familyId: string): number {
  return sharedSubjectsFor(root, familyId).length;
}

/** The shared subjects themselves, sorted — the same computation the count is taken from. */
export function sharedSubjectsFor(root: string, familyId: string): readonly string[] {
  const banks = measuredAgentBanks(root);
  const self = banks.find((b) => b.familyId === familyId);
  if (self === undefined) return [];
  const shared = new Set<string>();
  for (const other of banks) {
    if (other.familyId === familyId) continue;
    for (const subject of computeOverlap([self, other]).sharedSubjects) shared.add(subject);
  }
  return [...shared].sort();
}

/**
 * The imported historical record for the outbox family.
 *
 * A counted reward-0 run is recorded as failing every instance under the single synthetic check
 * `suite_reward_zero`, because the source rewards are binary. The cells are therefore coarser than
 * the family's own matrix and are never used for the axis count — that reads the matrix.
 */
export function outboxHistory(root: string, runsPath?: string): ImportedHistory {
  const matrix = outboxMatrix(root);
  return importDurableOutboxHistory(
    runsPath ?? vendoredRunsDir(root),
    OUTBOX_FAMILY,
    matrix.instances.map((i) => i.id),
    "dao-24",
  );
}

export const outboxMatrix = (root: string): Matrix =>
  parseMatrix(readJson(join(root, "examples/durable-outbox/matrix.json")));

/**
 * What the trial layer has actually cost, for the budget model to price against.
 *
 * Every field is derived from trial records on disk. The one that matters is `standardWasteRate`:
 * the fraction of genuine attempts that produced no usable result. A budget built from the cost of
 * successful runs is short by exactly this much, and the source project's archive says it is not a
 * rounding error.
 */
export interface CampaignFacts {
  readonly campaigns: number;
  readonly slotsPlanned: number;
  readonly slotsRun: number;
  readonly slotsNotRun: number;
  readonly countedTrials: number;
  readonly countedFailures: number;
  readonly supersededTrials: number;
  readonly budgetPlannedUsd: number;
  readonly medianRuntimeSeconds: number | null;
}

export interface ProviderSpendRow {
  readonly providerFamily: string;
  readonly counted: number;
  readonly failed: number;
  readonly refused: number;
  readonly infra: number;
  readonly superseded: number;
  readonly runtimeSeconds: number;
}

/** Spend and yield per provider family, read from the trial directories. */
export function providerSpend(root: string): readonly ProviderSpendRow[] {
  const rows = new Map<
    string,
    { counted: number; failed: number; refused: number; infra: number; superseded: number; runtime: number }
  >();
  for (const familyId of ROUTABLE_FAMILY_IDS) {
    const dirs = readFamilyTrials(join(root, "trials"), familyId);
    const stale = staleRunIds(root, familyId, dirs);
    for (const dir of dirs) {
      const record = dir.record;
      if (record.subjectType !== "agent") continue;
      const key = (record.model ?? "unknown").split("/")[0] ?? "unknown";
      const row = rows.get(key) ?? { counted: 0, failed: 0, refused: 0, infra: 0, superseded: 0, runtime: 0 };
      row.runtime += record.runtimeSeconds ?? 0;
      if (stale.has(dir.runId)) row.superseded += 1;
      else if (record.status === "refused") row.refused += 1;
      else if (record.status === "infrastructure_error" || record.status === "timeout") row.infra += 1;
      else if (record.counts) {
        row.counted += 1;
        if (record.cells.some((c) => c.failed.length > 0)) row.failed += 1;
      } else row.infra += 1;
      rows.set(key, row);
    }
  }
  return [...rows.entries()]
    .map(([providerFamily, r]) => ({
      providerFamily,
      counted: r.counted,
      failed: r.failed,
      refused: r.refused,
      infra: r.infra,
      superseded: r.superseded,
      runtimeSeconds: r.runtime,
    }))
    .sort((a, b) => a.providerFamily.localeCompare(b.providerFamily));
}

export function campaignFacts(root: string): CampaignFacts {
  const plans = loadCampaigns(root);
  let counted = 0;
  let failures = 0;
  let superseded = 0;
  const countedRunIds = new Set<string>();
  const supersededRunIds = new Set<string>();
  const runtimes: number[] = [];
  for (const plan of plans) {
    const rec = reconcile(root, plan);
    for (const runId of rec.supersededRuns) supersededRunIds.add(`${plan.familyId}:${runId}`);
    for (const record of rec.countedRecords) {
      const key = `${record.familyId}:${record.runId}`;
      if (countedRunIds.has(key)) continue;
      countedRunIds.add(key);
      counted += 1;
      if (record.cells.some((c) => c.failed.length > 0)) failures += 1;
      if (record.runtimeSeconds !== null) runtimes.push(record.runtimeSeconds);
    }
  }
  superseded = supersededRunIds.size;
  runtimes.sort((a, b) => a - b);
  return {
    campaigns: plans.length,
    slotsPlanned: plans.reduce((n, p) => n + p.slots.length, 0),
    slotsRun: plans.reduce(
      (n, p) =>
        n +
        p.slots.filter(
          (s) =>
            s.state === "RUN" ||
            s.state === "IMPORTED" ||
            s.state === "FAILED_INFRA" ||
            s.state === "REFUSED",
        ).length,
      0,
    ),
    slotsNotRun: plans.reduce((n, p) => n + p.slots.filter((s) => s.state === "NOT_RUN").length, 0),
    countedTrials: counted,
    countedFailures: failures,
    supersededTrials: superseded,
    budgetPlannedUsd: plans.reduce((n, p) => n + p.budgetUsd, 0),
    medianRuntimeSeconds: runtimes.length === 0 ? null : (runtimes[Math.floor(runtimes.length / 2)] ?? null),
  };
}

export interface TrialLayerFacts {
  readonly historicalRuns: number;
  readonly historicalCounted: number;
  readonly historicalSpendUsd: number;
  /** Spend on runs that produced a counted result. */
  readonly countedSpendUsd: number;
  /** Spend on standard attempts that produced nothing usable. */
  readonly wastedSpendUsd: number;
  /** Standard attempts only — cheat and gate runs are deliberate, not waste. */
  readonly standardRuns: number;
  readonly standardCounted: number;
  readonly standardWasteRate: number;
  readonly usdPerCountedRun: number | null;
  readonly picCountedTrials: number;
  readonly picMedianRuntimeSeconds: number | null;
  /** Why the standard attempts that produced nothing produced nothing. */
  readonly standardUncountedByStatus: Readonly<Record<string, number>>;
}

export function trialLayerFacts(root: string): TrialLayerFacts {
  const history = outboxHistory(root);
  const spend = (rs: readonly { costUsd: number | null }[]): number =>
    rs.reduce((n, r) => n + (r.costUsd ?? 0), 0);
  const standard = history.records.filter((r) => classifyRunKind(r.runId) === "standard");
  const standardCounted = standard.filter((r) => r.counts);
  const counted = history.records.filter((r) => r.counts);

  const pic = readFamilyTrials(join(root, "trials"), PIC_FAMILY)
    .map((t) => t.record)
    .filter((r) => r.counts && r.subjectType === "agent");
  const runtimes = pic
    .map((r) => r.runtimeSeconds)
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);

  return {
    historicalRuns: history.records.length,
    historicalCounted: counted.length,
    historicalSpendUsd: spend(history.records),
    countedSpendUsd: spend(counted),
    wastedSpendUsd: spend(standard.filter((r) => !r.counts)),
    standardRuns: standard.length,
    standardCounted: standardCounted.length,
    standardWasteRate: standard.length === 0 ? 0 : 1 - standardCounted.length / standard.length,
    usdPerCountedRun: counted.length === 0 ? null : spend(history.records) / counted.length,
    picCountedTrials: pic.length,
    picMedianRuntimeSeconds:
      runtimes.length === 0 ? null : (runtimes[Math.floor(runtimes.length / 2)] ?? null),
    standardUncountedByStatus: standard
      .filter((r) => !r.counts)
      .reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      }, {}),
  };
}
