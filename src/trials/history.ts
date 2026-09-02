// Importing the Durable Outbox trial history from the Harbor run directories that produced it.
//
// The point is not archaeology. It is that the outbox family's evidence and the containment family's
// evidence have to live in the SAME format before "do these two families measure different things?"
// is even a well-formed question. Until now the outbox side existed only as a static matrix with no
// notion of who ran, what it cost, or which runs were thrown away — so the shared-bank comparison had
// nothing to compare.
//
// What makes this import worth doing carefully is that the source data contains the exact trap this
// repository keeps warning about. Alongside six clean reward-0 trials there are runs that errored,
// timed out, or hit provider refusals, and every one of them has a `reward` of 0.0 sitting in the
// same field as the real failures. Reading the reward column naively turns four non-results into
// four data points. So the importer classifies from `n_errored_trials` and `exception_stats` FIRST
// and only then looks at reward.
//
// Format, from `runs/<name>/<name>/result.json`:
//   stats.evals["<agent>__<model>__<effort>"].reward_stats.reward  -> { "0.0": [trial ids] }
//   stats.evals[...].exception_stats                               -> { "<ExceptionName>": [...] }
//   stats.n_errored_trials, stats.cost_usd, started_at, finished_at

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { TrialCell, TrialRecord, TrialStatus } from "./types.js";
import { parseTrialRecord } from "./validate.js";

export interface HistoricalRun {
  readonly runName: string;
  readonly agent: string;
  readonly model: string;
  readonly effort: string;
  readonly reward: number | null;
  readonly exceptions: readonly string[];
  readonly erroredTrials: number;
  readonly costUsd: number | null;
  readonly runtimeSeconds: number | null;
  readonly trialIds: readonly string[];
}

const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Parse one Harbor `result.json`. Returns null for directories that never produced a verdict. */
export function parseHarborResult(runName: string, raw: unknown): HistoricalRun | null {
  if (!isRec(raw)) return null;
  const stats = isRec(raw["stats"]) ? raw["stats"] : null;
  if (stats === null) return null;
  const evals = isRec(stats["evals"]) ? stats["evals"] : {};
  const key = Object.keys(evals)[0];
  if (key === undefined) return null;

  const ev = isRec(evals[key]) ? (evals[key] as Record<string, unknown>) : {};
  const [agent = "unknown", model = "unknown", effort = "unknown"] = key.split("__");

  const rewardStats = isRec(ev["reward_stats"]) ? ev["reward_stats"] : {};
  const rewardMap = isRec(rewardStats["reward"]) ? rewardStats["reward"] : {};
  const rewardKeys = Object.keys(rewardMap);
  const reward = rewardKeys.length > 0 ? Number(rewardKeys[0]) : null;
  const trialIds = rewardKeys.flatMap((k) =>
    Array.isArray(rewardMap[k]) ? (rewardMap[k] as unknown[]).map(String) : [],
  );

  const exceptionStats = isRec(ev["exception_stats"]) ? ev["exception_stats"] : {};

  const started = typeof raw["started_at"] === "string" ? Date.parse(raw["started_at"]) : Number.NaN;
  const finished = typeof raw["finished_at"] === "string" ? Date.parse(raw["finished_at"]) : Number.NaN;

  return {
    runName,
    agent,
    model,
    effort,
    reward: Number.isFinite(reward) ? reward : null,
    exceptions: Object.keys(exceptionStats),
    erroredTrials: typeof stats["n_errored_trials"] === "number" ? stats["n_errored_trials"] : 0,
    costUsd: typeof stats["cost_usd"] === "number" ? stats["cost_usd"] : null,
    runtimeSeconds:
      Number.isFinite(started) && Number.isFinite(finished) ? Math.round((finished - started) / 1000) : null,
    trialIds,
  };
}

/**
 * Classify a historical run, in the order that matters.
 *
 * Errors and exceptions are read BEFORE reward. A run that hit `AgentTimeoutError` also carries
 * reward 0.0, and reading reward first would silently convert an infrastructure failure into a
 * capability finding — which is the whole reason the source project maintained a separate
 * "uncounted diagnostics" list.
 */
export function classifyHistorical(run: HistoricalRun): {
  status: TrialStatus;
  counts: boolean;
  reason: string;
} {
  const exceptions = run.exceptions.join(", ");
  if (run.exceptions.some((e) => /SafetyRefusal|Refusal/i.test(e))) {
    return {
      status: "refused",
      counts: false,
      reason: `provider-level refusal (${exceptions}); no attempt was made, so the reward of ${run.reward} is not evidence in either direction`,
    };
  }
  if (run.exceptions.some((e) => /Timeout/i.test(e))) {
    return {
      status: "timeout",
      counts: false,
      reason: `hit the agent time limit (${exceptions}); an infrastructure limit is not a capability finding`,
    };
  }
  if (run.exceptions.length > 0 || run.erroredTrials > 0) {
    return {
      status: "infrastructure_error",
      counts: false,
      reason:
        run.exceptions.length > 0
          ? `run errored (${exceptions}); excluded from the counted matrix`
          : `${run.erroredTrials} errored trial(s); excluded from the counted matrix`,
    };
  }
  if (run.reward === null) {
    return { status: "infrastructure_error", counts: false, reason: "no reward recorded; no verdict" };
  }
  return {
    status: "completed",
    counts: true,
    reason: `clean run with reward ${run.reward}, no exceptions and no errored trials`,
  };
}

/**
 * What kind of run this was. Only `standard` runs are difficulty evidence.
 *
 * A `/cheat` trial measures whether the GRADER can be broken; a gate run is the oracle or the nop
 * proving the harness works. Both carry a reward and both would look like agent attempts to a reader
 * of the reward column alone, which is why the kind is derived and reported rather than assumed.
 */
export type RunKind = "standard" | "cheat" | "gate" | "unknown";

export function classifyRunKind(runName: string): RunKind {
  if (/^cheat[-_]/.test(runName)) return "cheat";
  if (/^gate[-_]|oracle|(^|[-_])nop([-_]|$)/.test(runName)) return "gate";
  if (/^(cc\d+|v\d+|fh|run|check)[-_]/.test(runName)) return "standard";
  return "unknown";
}

/**
 * Which task this run actually ran, read from the preserved trial ids.
 *
 * `classifyRunKind` reads the DIRECTORY NAME, which is a label a human typed and which says nothing
 * about what was executed. The archive under `examples/durable-outbox/runs/` contains five runs whose
 * names look exactly like outbox attempts — `run-claude-1`, `v2-claude-1`, `v21-claude-1`,
 * `v22-claude-1`, `check-v21` — and whose trial ids say `reorg-safe-settlement__…`. All five carry
 * reward 1. Counting them made a different task's solves look like this task's solves.
 *
 * Harbor writes trial ids as `<task-name>__<suffix>`, so the task is recorded and does not have to be
 * guessed. Returns null when the archive preserves no ids (the run died before any trial started) or
 * when it preserves ids from more than one task — both are "cannot be verified", not "matches".
 */
export function runTaskName(run: HistoricalRun): string | null {
  const names = new Set(run.trialIds.map((id) => id.split("__")[0] ?? "").filter((name) => name.length > 0));
  return names.size === 1 ? ([...names][0] ?? null) : null;
}

/**
 * The synthetic check a counted reward-0 run fails on every scenario.
 *
 * This one is defensible: the name says "the suite returned zero", it is not the name of any real
 * check, and a suite-level zero does entail that something failed. Its reward-1 counterpart is NOT
 * defensible and deliberately does not exist — see `NO_PER_SCENARIO_DETAIL`.
 */
export const SUITE_REWARD_ZERO = "suite_reward_zero";

/**
 * Why a counted reward-1 run's cells are marked ungraded rather than passed.
 *
 * The archive preserves one binary reward per run and no per-check detail (every run directory
 * contains exactly one file, `result.json`). Writing `failed: []` for all 24 scenarios turns that
 * single bit into 24 affirmative claims — "this subject was graded against `serial-clean-1009-12`
 * and passed it" — which the source cannot support, and which the two reward-1 runs in this archive
 * actively contradict: `fh-claude-3` and `v2-opus-3b` were both recorded as solves at the time and
 * both were later found to still carry the `ACKED -> REVOKED` defect.
 */
export const NO_PER_SCENARIO_DETAIL =
  "the archived run preserves a single binary suite reward and no per-check detail, so this scenario was never individually graded; a reward of 1 is not evidence that this named scenario passed";

/** Normalize a model identity so the same model is one subject across families. */
export function normalizeModel(_agent: string, model: string, effort: string): string {
  const m = model.toLowerCase().replace(/^(anthropic|openai|google)\//, "");
  const family = m.includes("opus")
    ? "claude-opus-5"
    : m.includes("sonnet")
      ? "claude-sonnet"
      : m.includes("gpt-5.6") || m.includes("sol")
        ? "gpt-5.6-sol"
        : m.includes("gemini")
          ? "gemini"
          : m;
  // Harbor writes "adhoc" into the effort slot of its eval key when no effort was recorded. Carrying
  // that into the subject identity would split one model into two subjects across families for no
  // reason, which is exactly what breaks a shared-bank comparison.
  const e = effort.toLowerCase();
  return e === "adhoc" || e === "unknown" || e === "" ? family : `${family}@${e}`;
}

export interface ImportedHistory {
  readonly familyId: string;
  readonly records: readonly TrialRecord[];
  readonly counted: number;
  readonly uncounted: number;
  readonly runs: readonly HistoricalRun[];
  /** The task name every counted run had to have actually run. */
  readonly taskName: string;
  /** Run names excluded because their trial ids name a different task, or name none. */
  readonly excludedForTask: readonly string[];
  /**
   * Standard attempts AT THIS TASK. The waste-rate denominator.
   *
   * Callers must not recompute this as `records.filter(r => classifyRunKind(r.runId) === "standard")`
   * — that reads the directory name, so it counts the foreign-task runs and the runs that preserved
   * no trial ids as outbox attempts that produced nothing, which inflates the waste rate.
   */
  readonly standardRuns: number;
  readonly standardCounted: number;
  /** Fraction of standard attempts at this task that produced no usable result. */
  readonly standardWasteRate: number;
}

/**
 * Import a directory of Harbor runs as normalized trial records.
 *
 * Two rules govern what a counted run may claim.
 *
 * FIRST, a run only counts if its preserved trial ids say it ran `taskName`. The archive is a shared
 * scratch directory: five of its run directories are named like outbox attempts and ran
 * `reorg-safe-settlement`. Excluded runs are kept as records with `counts: false` and a reason, the
 * same way cheat and gate runs are — the evidence is preserved, it just stops being counted.
 *
 * SECOND, a counted run's cells never claim more than the source recorded. A reward-0 run fails every
 * scenario under `SUITE_REWARD_ZERO`; a reward-1 run's scenarios are marked UNGRADED, because a
 * suite-level reward of 1 is not 24 per-scenario passes and there is nothing on disk that would make
 * it so.
 *
 * `taskName` defaults to `familyId`, which is the right default: a family's imported history should
 * contain runs of that family's task. Pass it explicitly only where the two genuinely differ.
 */
export function importDurableOutboxHistory(
  runsRoot: string,
  familyId: string,
  scenarioIds: readonly string[],
  scenarioSetId: string,
  taskName: string = familyId,
): ImportedHistory {
  const empty: ImportedHistory = {
    familyId,
    records: [],
    counted: 0,
    uncounted: 0,
    runs: [],
    taskName,
    excludedForTask: [],
    standardRuns: 0,
    standardCounted: 0,
    standardWasteRate: 0,
  };
  if (!existsSync(runsRoot)) return empty;

  const runs: HistoricalRun[] = [];
  // Directory entries only: a real archive contains stray files (.DS_Store, logs) and a reader that
  // assumes every entry is a run directory crashes on the first one.
  const entries = readdirSync(runsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  for (const name of entries) {
    // Harbor nests the run under its own name; some runs have a timestamped subdirectory instead.
    const candidates = [join(runsRoot, name, name, "result.json"), join(runsRoot, name, "result.json")];
    const nested = existsSync(join(runsRoot, name))
      ? readdirSync(join(runsRoot, name), { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => join(runsRoot, name, e.name, "result.json"))
      : [];
    const path = [...candidates, ...nested].find((p) => existsSync(p));
    if (path === undefined) continue;
    try {
      const parsed = parseHarborResult(name, JSON.parse(readFileSync(path, "utf8")));
      if (parsed !== null) runs.push(parsed);
    } catch {
      // A corrupt archive entry is skipped rather than aborting the import; some archived
      // trial-level files were redacted before commit and do not parse.
    }
  }

  const excludedForTask: string[] = [];
  const records = runs.map((run) => {
    const kind = classifyRunKind(run.runName);
    const base = classifyHistorical(run);
    const ranTask = runTaskName(run);
    // A cheat trial or a gate run is not an attempt at the task, so it can never be difficulty
    // evidence however clean it was. Recorded, kept, and excluded — the same discipline the counting
    // rules apply to refusals.
    //
    // A run of a DIFFERENT task is excluded the same way and for a stronger reason: a cheat run at
    // least attacked this grader, whereas `reorg-safe-settlement__…` never touched this task at all.
    let verdict: { status: TrialStatus; counts: boolean; reason: string };
    if (kind !== "standard") {
      verdict = {
        status: base.status,
        counts: false,
        reason: `${kind} run, not an attempt at the task: ${base.reason}`,
      };
    } else if (ranTask === null) {
      excludedForTask.push(run.runName);
      verdict = {
        status: base.status,
        counts: false,
        reason: `the archived result preserves no trial ids naming a single task, so there is no evidence this run attempted "${taskName}"; the directory name is not evidence (${base.reason})`,
      };
    } else if (ranTask !== taskName) {
      excludedForTask.push(run.runName);
      verdict = {
        status: base.status,
        counts: false,
        reason: `ran task "${ranTask}", not "${taskName}"; a reward earned on a different task is not evidence about this one however the run directory is named (${base.reason})`,
      };
    } else {
      verdict = base;
    }
    const { status, counts, reason } = verdict;

    // What the source actually recorded is one bit for the whole suite. Reward 0 entails a failure
    // somewhere, so a suite-level failing check on every scenario is coarse but true. Reward 1 does
    // NOT entail 24 per-scenario passes, and `failed: []` would assert exactly that, so those cells
    // are marked ungraded instead. The importer would rather record less than record a claim the
    // archive cannot back.
    const cells: TrialCell[] = counts
      ? scenarioIds.map((id) =>
          run.reward === 0
            ? { scenarioId: id, failed: [SUITE_REWARD_ZERO] }
            : { scenarioId: id, failed: [], unmeasured: NO_PER_SCENARIO_DETAIL },
        )
      : [];
    return parseTrialRecord({
      runId: run.runName,
      familyId,
      subjectId: normalizeModel(run.agent, run.model, run.effort),
      subjectType: "agent",
      model: run.model,
      effort: run.effort,
      status,
      counts,
      countsReason: reason,
      scenarioSetId,
      cells,
      runtimeSeconds: run.runtimeSeconds,
      costUsd: run.costUsd,
      artifactPath: counts ? `runs/${run.runName}` : null,
      isolation: "container",
      notes: `kind=${kind} task=${ranTask ?? "unrecorded"} agent=${run.agent} reward=${run.reward ?? "none"} exceptions=[${run.exceptions.join(",")}]`,
    });
  });

  // Standard attempts AT THIS TASK — computed here, from the trial ids, because the run name cannot
  // tell a caller which of these runs attempted the task.
  const standard = runs.filter(
    (run) => classifyRunKind(run.runName) === "standard" && runTaskName(run) === taskName,
  );
  const byName = new Map(records.map((r) => [r.runId, r]));
  const standardCounted = standard.filter((run) => byName.get(run.runName)?.counts === true).length;

  return {
    familyId,
    records,
    counted: records.filter((r) => r.counts).length,
    uncounted: records.filter((r) => !r.counts).length,
    runs,
    taskName,
    excludedForTask,
    standardRuns: standard.length,
    standardCounted,
    standardWasteRate: standard.length === 0 ? 0 : 1 - standardCounted / standard.length,
  };
}
