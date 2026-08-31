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

import { join } from "node:path";
import { augmentAdversarialEvidenceMap } from "../adversarial-audit/records.js";
import { ALL_SUBJECTS, runFamily, toMatrix } from "../families/prompt-injection-containment/runner.js";
import type { RunResult } from "../families/prompt-injection-containment/runner.js";
import { BUILT_FAMILY_IDS, builtFamily } from "../families/registry.js";
import { readBrowserBackedMeasurement } from "../families/ui-replay-browser-backed/measurement.js";
import { browserBackedReadiness } from "../families/ui-replay-browser-backed/readiness.js";
import { readJson } from "../foundry/load.js";
import { augmentFamilyEvidenceMap } from "../human-solvability/records.js";
import { parseMatrix } from "../matrix.js";
import { normalizeSubjectId } from "../trials/bank.js";
import { reconcile } from "../trials/campaign-run.js";
import { loadCampaigns } from "../trials/campaign.js";
import { readFamilyTrials } from "../trials/directory.js";
import { classifyRunKind, importDurableOutboxHistory } from "../trials/history.js";
import type { ImportedHistory } from "../trials/history.js";
import { importAgentTrials, runLocalTrials } from "../trials/orchestrate.js";
import { ROUTABLE_FAMILY_IDS } from "../trials/router.js";
import { gateByChallengeHash } from "../trials/run.js";
import { countedAgentTrials } from "../trials/types.js";
import type { TrialRecord, TrialSet } from "../trials/types.js";
import type { Matrix } from "../types.js";
import { BROWSER_BACKED_NEXT_PLAN } from "./browser-backed-scaffold.js";
import { analyseChain } from "./chain-analysis.js";
import type { FamilyEvidence } from "./ship-report.js";
import { computeEvidence } from "./trial-report.js";

export const PIC_FAMILY = "prompt-injection-containment";
export const MEMORY_FAMILY = "prompt-injection-memory-poisoning";
export const OUTBOX_FAMILY = "durable-approval-outbox";
export const UI_FAMILY = "ui-action-record-replay";

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
  const gated = ROUTABLE.has(familyId)
    ? gateByChallengeHash(
        root,
        familyId,
        dirs.map((d) => ({ runId: d.runId, metadataPath: join(d.path, "metadata.json"), dir: d.path })),
      )
    : null;
  const stale = new Set(gated?.gates.filter((g) => !g.matches).map((g) => g.runId) ?? []);
  const durable = dirs.filter((d) => !stale.has(d.runId)).map((d) => d.record);
  const loose = importAgentTrials(join(root, `trials-inbox/${familyId}`));

  if (familyId !== PIC_FAMILY) {
    // Non-containment families have no in-process local subject runner; their sweep comes from the
    // built-family registry and their mutant evidence from that sweep.
    const family = builtFamily(familyId);
    const sweep = family.run();
    const trials: TrialSet = {
      familyId,
      scenarioSetId: `${familyId}-sweep`,
      records: [...durable, ...loose],
    };
    const sharedBankSubjects = sharedSubjectCount(
      root,
      trials.records.map((r) => r.subjectId),
    );
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
        mechanismsExercised: sweep.referenceFailures.length === 0,
        isolation: counted[0]?.isolation ?? "subprocess",
        countedAgentTrials: counted.length,
        agentTrialsPassed: counted.filter((t) => t.cells.every((c) => c.failed.length === 0)).length,
        sharedBankSubjects,
        reportsDeterministic: true,
        trialReady: ROUTABLE.has(familyId),
        staleTrials: [...stale].sort(),
        ...agentAxisFacts(trials.records, stale),
      },
    };
  }

  const run = runFamily(ALL_SUBJECTS);
  const local = runLocalTrials();
  const trials = { ...local, records: [...local.records, ...durable, ...loose] };
  const sharedBankSubjects = sharedSubjectCount(
    root,
    trials.records.map((r) => r.subjectId),
  );
  return {
    run,
    trials,
    evidence: {
      ...computeEvidence(run, trials, { sharedBankSubjects }),
      trialReady: ROUTABLE.has(familyId),
      staleTrials: [...stale].sort(),
      ...agentAxisFacts(trials.records, stale),
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

/** How many subjects in this family also attempted another measured family. */
export function sharedSubjectCount(root: string, subjects: readonly string[]): number {
  const outbox = new Set(
    outboxHistory(root)
      .records.filter((r) => r.counts)
      .map((r) => r.subjectId),
  );
  return [...new Set(subjects)].filter((s) => outbox.has(s)).length;
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
    const gated = gateByChallengeHash(
      root,
      familyId,
      dirs.map((d) => ({ runId: d.runId, metadataPath: join(d.path, "metadata.json"), dir: d.path })),
    );
    const stale = new Set(gated.gates.filter((g) => !g.matches).map((g) => g.runId));
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
  const runtimes: number[] = [];
  for (const plan of plans) {
    const rec = reconcile(root, plan);
    superseded += rec.supersededRuns.length;
    for (const record of rec.countedRecords) {
      counted += 1;
      if (record.cells.some((c) => c.failed.length > 0)) failures += 1;
      if (record.runtimeSeconds !== null) runtimes.push(record.runtimeSeconds);
    }
  }
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
