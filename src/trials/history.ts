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
}

/**
 * Import a directory of Harbor runs as normalized trial records.
 *
 * `scenarioIds` supplies the graded instance ids so a counted run produces real cells rather than an
 * opaque pass/fail. The reward is binary in the source, so every scenario in a reward-0 run is
 * recorded as failing the synthetic check `suite_reward_zero` — coarse, and labelled as coarse in the
 * caveat rather than dressed up as per-check detail the source never had.
 */
export function importDurableOutboxHistory(
  runsRoot: string,
  familyId: string,
  scenarioIds: readonly string[],
  scenarioSetId: string,
): ImportedHistory {
  if (!existsSync(runsRoot)) {
    return { familyId, records: [], counted: 0, uncounted: 0, runs: [] };
  }

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

  const records = runs.map((run) => {
    const kind = classifyRunKind(run.runName);
    const base = classifyHistorical(run);
    // A cheat trial or a gate run is not an attempt at the task, so it can never be difficulty
    // evidence however clean it was. Recorded, kept, and excluded — the same discipline the counting
    // rules apply to refusals.
    const { status, counts, reason } =
      kind === "standard"
        ? base
        : {
            status: base.status,
            counts: false,
            reason: `${kind} run, not an attempt at the task: ${base.reason}`,
          };
    const failedAll = counts && run.reward === 0;
    const cells: TrialCell[] = counts
      ? scenarioIds.map((id) => ({ scenarioId: id, failed: failedAll ? ["suite_reward_zero"] : [] }))
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
      notes: `kind=${kind} agent=${run.agent} reward=${run.reward ?? "none"} exceptions=[${run.exceptions.join(",")}]`,
    });
  });

  return {
    familyId,
    records,
    counted: records.filter((r) => r.counts).length,
    uncounted: records.filter((r) => !r.counts).length,
    runs,
  };
}
