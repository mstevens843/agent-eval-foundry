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
import { ALL_SUBJECTS, runFamily, toMatrix } from "../families/prompt-injection-containment/runner.js";
import type { RunResult } from "../families/prompt-injection-containment/runner.js";
import { readJson } from "../foundry/load.js";
import { parseMatrix } from "../matrix.js";
import { readFamilyTrials } from "../trials/directory.js";
import { classifyRunKind, importDurableOutboxHistory } from "../trials/history.js";
import type { ImportedHistory } from "../trials/history.js";
import { importAgentTrials, runLocalTrials } from "../trials/orchestrate.js";
import type { TrialSet } from "../trials/types.js";
import type { Matrix } from "../types.js";
import type { FamilyEvidence } from "./ship-report.js";
import { computeEvidence } from "./trial-report.js";

export const PIC_FAMILY = "prompt-injection-containment";
export const OUTBOX_FAMILY = "durable-approval-outbox";
export const UI_FAMILY = "ui-action-record-replay";

/** Vendored Harbor run summaries — the default source for historical outbox trials. */
export const vendoredRunsDir = (root: string): string => join(root, "examples/durable-outbox/runs");

export interface FamilyEvidenceBundle {
  readonly run: RunResult;
  readonly trials: TrialSet;
  readonly evidence: FamilyEvidence;
  readonly matrix: Matrix;
}

/**
 * Everything known about the containment family: the mutant sweep, every trial record on disk, and
 * the derived evidence the ship gate reads.
 *
 * Trial records come from three places on purpose. Durable directories are trials this repository
 * ran; the loose inbox is for attempts run elsewhere and imported by hand; local runs are the
 * in-process reference and mutant subjects. They are pooled here and separated downstream by
 * `subjectType` and `counts`, never by which list they came from.
 */
export function familyEvidenceFor(root: string): FamilyEvidenceBundle {
  const run = runFamily(ALL_SUBJECTS);
  const local = runLocalTrials();
  const durable = readFamilyTrials(join(root, "trials"), PIC_FAMILY).map((t) => t.record);
  const loose = importAgentTrials(join(root, `trials-inbox/${PIC_FAMILY}`));
  const trials = { ...local, records: [...local.records, ...durable, ...loose] };
  const sharedBankSubjects = sharedSubjectCount(
    root,
    trials.records.map((r) => r.subjectId),
  );
  return {
    run,
    trials,
    evidence: computeEvidence(run, trials, { sharedBankSubjects }),
    matrix: toMatrix(run),
  };
}

/** Family evidence keyed by id, in the shape the ship report expects. */
export const familyEvidenceMap = (root: string): Record<string, FamilyEvidence> => ({
  [PIC_FAMILY]: familyEvidenceFor(root).evidence,
});

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
