// Importing the Durable Outbox trial history from the Harbor run directories that produced it.
//
// Two halves, and the split between them is the whole design.
//
// THE ARCHIVE (`importDurableOutboxHistory`). `examples/durable-outbox/runs/` vendors 35 run-level
// summaries — one `result.json` each, a binary reward, a cost, and an exception list. That is enough
// to say what the trial layer COST and how much of it was wasted, and it is not enough to say what
// any subject failed. The source data contains the exact trap this repository keeps warning about:
// alongside the clean reward-0 trials there are runs that errored, timed out, or hit provider
// refusals, and every one of them has a `reward` of 0.0 sitting in the same field as the real
// failures. So the importer classifies from `n_errored_trials` and `exception_stats` FIRST and only
// then looks at reward.
//
// The archive used to emit CELLS as well: a counted reward-0 run failed all 24 scenarios under a
// synthetic check named `suite_reward_zero`, and a counted reward-1 run's scenarios were marked
// ungraded. Both are gone. A binary reward cannot name a scenario, and a bank built out of a check
// that no verifier ever ran is a bank that measures the importer. The archive now emits no cells at
// all and counts nothing — `parseTrialRecord` enforces the second half of that for free, since a
// record with `counts: true` and no cells is `TRIAL_EMPTY_CELLS`.
//
// THE TRIAL DIRECTORIES (`importOutboxTrialDirectories`). Six of those 35 runs — the cc267 round —
// were preserved in full: the CTRF report with all 267 test results, the submitted engine, the agent
// transcript, the run config. Those become real trial directories with per-check cells, which is the
// only path by which this family's evidence stops being a declared integer. Everything a counted
// claim rests on comes from there; the archive is spend accounting.
//
// Formats. Archive, from `runs/<name>/<name>/result.json`:
//   stats.evals["<agent>__<model>__<effort>"].reward_stats.reward  -> { "0.0": [trial ids] }
//   stats.evals[...].exception_stats                               -> { "<ExceptionName>": [...] }
//   stats.n_errored_trials, stats.cost_usd, started_at, finished_at
// Trial, from `runs/<name>/<name>/durable-approval-outbox__<suffix>/`:
//   verifier/ctrf.json, artifacts/app/engine/*.py, agent/<agent>.txt, config.json, result.json

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fail } from "../foundry/schema.js";
import type { Countability } from "./directory.js";
import { writeTrialDirectory } from "./directory.js";
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
 * Why no archived run may count.
 *
 * The archive preserves one binary reward per run and no per-check detail (every vendored run
 * directory contains exactly one file, `result.json`). A reward of 0 does entail that something
 * failed, and it cannot say WHAT — the synthetic `suite_reward_zero` check this importer used to
 * write named a check no verifier ever ran, and it reached the shared bank as though it had. A
 * reward of 1 is worse: `failed: []` on 24 scenarios turns one bit into 24 affirmative claims, and
 * the two reward-1 runs here actively contradict it — `fh-claude-3` and `v2-opus-3b` were both
 * recorded as solves at the time and both were later found to still carry the `ACKED -> REVOKED`
 * defect the suite was built to catch.
 *
 * Six of these runs were preserved with their full CTRF report and their submitted engine, and those
 * are imported as trial directories with real per-check cells instead. The archive is what the trial
 * layer cost; the directories are what it measured.
 */
export const ARCHIVE_IS_NOT_EVIDENCE =
  "the archived summary preserves one binary suite reward and no per-check detail, so it cannot name what any subject failed; the runs that were preserved with per-check grading are imported as trial directories under trials/durable-approval-outbox/ instead";

/** The model family a model id names, with vendor prefix and effort suffix stripped. */
export function modelFamily(model: string): string {
  const m = model.toLowerCase().replace(/^(anthropic|openai|google)\//, "");
  return m.includes("opus")
    ? "claude-opus-5"
    : m.includes("sonnet")
      ? "claude-sonnet"
      : m.includes("gpt-5.6") || m.includes("sol")
        ? "gpt-5.6-sol"
        : m.includes("gemini")
          ? "gemini"
          : m;
}

/** Normalize a model identity so the same model is one subject across families. */
export function normalizeModel(_agent: string, model: string, effort: string): string {
  // Harbor writes "adhoc" into the effort slot of its eval key when no effort was recorded. Carrying
  // that into the subject identity would split one model into two subjects across families for no
  // reason, which is exactly what breaks a shared-bank comparison.
  const e = effort.toLowerCase();
  const family = modelFamily(model);
  return e === "adhoc" || e === "unknown" || e === "" ? family : `${family}@${e}`;
}

export interface ImportedHistory {
  readonly familyId: string;
  readonly records: readonly TrialRecord[];
  readonly counted: number;
  readonly uncounted: number;
  readonly runs: readonly HistoricalRun[];
  /**
   * Standard attempts at this task that produced a usable verdict — no exception, no errored trial.
   *
   * NOT the same question as `counts` on the records, and the two came apart deliberately. `counts`
   * asks whether a record may support a difficulty claim, and no archived summary may, because a
   * binary reward cannot name a scenario. This asks whether the money bought a result, which is what
   * the budget model prices against. A run that produced a graded verdict and is counted as a TRIAL
   * DIRECTORY rather than here is productive spend, not waste.
   */
  readonly gradedRuns: readonly HistoricalRun[];
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
 * Import a directory of Harbor run summaries as preserved, uncounted trial records.
 *
 * Nothing here counts, and the classification work is still done, because "why this does not count"
 * is the fact worth preserving. Four separate reasons survive on the records: a provider refusal, a
 * timeout, an infrastructure error, and a run of a DIFFERENT task — the archive is a shared scratch
 * directory in which five run directories are named like outbox attempts and ran
 * `reorg-safe-settlement`. Collapsing those into one "uncounted" bucket would lose the distinction
 * the source project had to state in prose.
 *
 * `gradedRuns` is the one thing read positively out of this: the standard attempts at this task that
 * produced a verdict, whatever later became of it. That is the budget model's denominator, and it is
 * separate from `counts` precisely because the six runs that produced the best verdicts are counted
 * as trial directories rather than here.
 *
 * `taskName` defaults to `familyId`, which is the right default: a family's imported history should
 * contain runs of that family's task. Pass it explicitly only where the two genuinely differ.
 */
export function importDurableOutboxHistory(
  runsRoot: string,
  familyId: string,
  scenarioSetId: string,
  taskName: string = familyId,
): ImportedHistory {
  const empty: ImportedHistory = {
    familyId,
    records: [],
    counted: 0,
    uncounted: 0,
    runs: [],
    gradedRuns: [],
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
    let reason: string;
    if (kind !== "standard") {
      reason = `${kind} run, not an attempt at the task: ${base.reason}`;
    } else if (ranTask === null) {
      excludedForTask.push(run.runName);
      reason = `the archived result preserves no trial ids naming a single task, so there is no evidence this run attempted "${taskName}"; the directory name is not evidence (${base.reason})`;
    } else if (ranTask !== taskName) {
      excludedForTask.push(run.runName);
      reason = `ran task "${ranTask}", not "${taskName}"; a reward earned on a different task is not evidence about this one however the run directory is named (${base.reason})`;
    } else {
      reason = `${base.reason}, but ${ARCHIVE_IS_NOT_EVIDENCE}`;
    }
    return parseTrialRecord({
      runId: run.runName,
      familyId,
      subjectId: normalizeModel(run.agent, run.model, run.effort),
      subjectType: "agent",
      model: run.model,
      effort: run.effort,
      status: base.status,
      counts: false,
      countsReason: reason,
      scenarioSetId,
      cells: [],
      runtimeSeconds: run.runtimeSeconds,
      costUsd: run.costUsd,
      artifactPath: null,
      isolation: "container",
      notes: `kind=${kind} task=${ranTask ?? "unrecorded"} agent=${run.agent} reward=${run.reward ?? "none"} exceptions=[${run.exceptions.join(",")}]`,
    });
  });

  // Standard attempts AT THIS TASK — computed here, from the trial ids, because the run name cannot
  // tell a caller which of these runs attempted the task.
  const standard = runs.filter(
    (run) => classifyRunKind(run.runName) === "standard" && runTaskName(run) === taskName,
  );
  const gradedRuns = standard.filter((run) => classifyHistorical(run).counts);

  return {
    familyId,
    records,
    counted: records.filter((r) => r.counts).length,
    uncounted: records.filter((r) => !r.counts).length,
    runs,
    gradedRuns,
    taskName,
    excludedForTask,
    standardRuns: standard.length,
    standardCounted: gradedRuns.length,
    standardWasteRate: standard.length === 0 ? 0 : 1 - gradedRuns.length / standard.length,
  };
}

// ---------------------------------------------------------------- the preserved cc267 trials

/**
 * The six Harbor runs preserved with their full CTRF report, submitted engine and transcript.
 *
 * Named rather than discovered, because "every directory under `runs/` that happens to have a
 * `verifier/` folder" is a rule about a scratch directory's current contents, and the cheat and gate
 * runs sitting beside these six have exactly the same shape.
 */
export const OUTBOX_TRIAL_RUN_IDS: readonly string[] = [
  "cc267-claude-1",
  "cc267-claude-2",
  "cc267-claude-3",
  "cc267-codex-1",
  "cc267-codex-2",
  "cc267-codex-3",
];

/**
 * The scenario set these six were graded against: 24 scenarios x 11 checks, plus 3 suite-level tests.
 *
 * Versioned by check count rather than by scenario count alone, because the earlier `fh-*` round ran
 * the same 24 scenarios against a 245-check suite, and `assertComparable` has to be able to tell
 * them apart. A suite revision that changes what passing means is a different scenario set.
 */
export const OUTBOX_SCENARIO_SET_ID = "dao-24-267";

/**
 * The agent-visible subtree hash, pinned by the source project's `results/34-cc267-standard-matrix.md`.
 *
 * This family has NO foundry challenge package: it predates the packaging layer, it is not in
 * `BUILT_FAMILIES`, and `routeFor` does not know it. There is therefore no `challengeHash` to record,
 * and inventing one by hashing the copied directory with this repository's hasher would produce a
 * number that looks like every other family's and means something else. What the source project did
 * pin is the SHA-256 of the subtree the agent could actually see — the one thing that answers "were
 * these six subjects given the same task?" — so that is what the metadata carries, under its own
 * name, attributed to where it was published.
 */
export const OUTBOX_AGENT_VISIBLE_SUBTREE_SHA256 =
  "4d54bb5d24cb0ff3693fb24d2bb1a36f22c980fb30d26bec3d2cffd5be400121";

/** Every parametrized CTRF result carries the same tag: the full ordered tuple list. */
const PARAMETRIZE_TAG = "parametrize::";
const TUPLE = /\('([^']+)',\s*(\d+),\s*(\d+),\s*'([^']+)'\)/g;

export interface OutboxGrading {
  /** One cell per scenario, in the order the suite declared them. */
  readonly cells: readonly TrialCell[];
  /** The suite-level tests, which are not per-scenario cells and are not dropped either. */
  readonly suiteTests: readonly { readonly name: string; readonly status: string }[];
  readonly checks: readonly string[];
  readonly testsTotal: number;
  readonly failedTotal: number;
}

/**
 * Read one Harbor CTRF report as per-scenario cells.
 *
 * THE MAPPING IS THE LOAD-BEARING PART, and it is not the obvious one. `results.tests` has 267
 * entries; only 264 are parametrized. The other three — `test_tool_saw_no_duplicate_keys`,
 * `test_every_scenario_ran`, `test_types_match_baseline` — are suite-level tests that sit at the END
 * of the array, so indexing the raw 267-length array against the 264-tuple parametrize list is
 * off-by-nothing for the first 264 entries and silently wrong the moment pytest reorders anything.
 *
 * So: filter to the tagged entries, preserve order, zip index-for-index with the declared tuples, and
 * refuse to proceed if the two lengths disagree. The three suite-level tests are recorded separately
 * rather than dropped — they are real results, they are just not results ABOUT a scenario.
 *
 * The final check is the one that would have caught a mapping error in this session: the failures
 * recounted from the entries must equal the count CTRF's own summary reports. A zip that lands on the
 * wrong tuples reproduces the right number of failures under the wrong names, and this does not catch
 * that; a zip that drops or duplicates entries changes the count, and this does.
 */
export function readOutboxGrading(ctrfPath: string): OutboxGrading {
  const raw: unknown = JSON.parse(readFileSync(ctrfPath, "utf8"));
  const results: Record<string, unknown> = isRec(raw) && isRec(raw["results"]) ? raw["results"] : {};
  const tests = Array.isArray(results["tests"]) ? results["tests"].filter(isRec) : [];
  const tagOf = (t: Record<string, unknown>): string | null => {
    const tags = Array.isArray(t["tags"]) ? t["tags"] : [];
    const found = tags.find((x) => typeof x === "string" && x.startsWith(PARAMETRIZE_TAG));
    return typeof found === "string" ? found : null;
  };
  const passed = (t: Record<string, unknown>): boolean => t["status"] === "passed";

  const parametrized = tests.filter((t) => tagOf(t) !== null);
  const suiteTests = tests
    .filter((t) => tagOf(t) === null)
    .map((t) => ({ name: String(t["name"] ?? ""), status: String(t["status"] ?? "") }));
  const first = parametrized[0];
  const tuples = first === undefined ? [] : [...(tagOf(first) ?? "").matchAll(TUPLE)];
  if (tuples.length !== parametrized.length) {
    fail(
      "OUTBOX_CTRF_TUPLE_MISMATCH",
      ctrfPath,
      `${parametrized.length} parametrized result(s) against ${tuples.length} declared (name, seed, keys, check) tuple(s); the index-for-index zip that gives every cell its name is only valid when the two agree`,
    );
  }

  const failedByScenario = new Map<string, string[]>();
  const order: string[] = [];
  parametrized.forEach((test, i) => {
    const tuple = tuples[i] as RegExpMatchArray;
    const scenarioId = `${tuple[1]}-${tuple[2]}-${tuple[3]}`;
    let failed = failedByScenario.get(scenarioId);
    if (failed === undefined) {
      failed = [];
      failedByScenario.set(scenarioId, failed);
      order.push(scenarioId);
    }
    if (!passed(test)) failed.push(String(tuple[4]));
  });

  const summary: Record<string, unknown> = isRec(results["summary"]) ? results["summary"] : {};
  const failedTotal = tests.filter((t) => !passed(t)).length;
  const reported = typeof summary["failed"] === "number" ? summary["failed"] : null;
  if (reported !== null && reported !== failedTotal) {
    fail(
      "OUTBOX_CTRF_FAILURE_MISCOUNT",
      ctrfPath,
      `recounted ${failedTotal} non-passing result(s) against a reported ${reported}; the report and the entries disagree, so neither can be trusted to name what failed`,
    );
  }

  return {
    cells: order.map((id) => ({
      scenarioId: id,
      failed: [...new Set(failedByScenario.get(id) ?? [])].sort(),
    })),
    suiteTests,
    checks: [...new Set(tuples.map((t) => String(t[4])))].sort(),
    testsTotal: tests.length,
    failedTotal,
  };
}

/** A string field read out of untyped JSON, or null. */
const text = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** Every file under `dir`, recursively, as `{ path, content }` — `__pycache__` and `.pyc` skipped. */
function sourceFiles(dir: string, prefix = ""): { path: string; content: string }[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.name !== "__pycache__" && !e.name.endsWith(".pyc"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) =>
      e.isDirectory()
        ? sourceFiles(join(dir, e.name), `${prefix}${e.name}/`)
        : [{ path: `${prefix}${e.name}`, content: readFileSync(join(dir, e.name), "utf8") }],
    );
}

export interface OutboxTrialImportInput {
  /** The source project's `runs/` directory. Read-only; nothing is written back to it. */
  readonly harborRunsRoot: string;
  /** The source task directory, for the agent-visible subtree. */
  readonly taskDir: string;
  /** This repository's `trials/` directory. */
  readonly trialsRoot: string;
  readonly familyId: string;
  readonly runIds?: readonly string[];
}

export interface OutboxTrialImport {
  readonly runId: string;
  readonly dir: string;
  readonly subjectId: string;
  readonly model: string;
  readonly effort: string | null;
  readonly scenarios: number;
  readonly scenariosFailed: number;
  readonly failedChecks: readonly string[];
  readonly suitePassed: number;
  readonly suiteTotal: number;
  readonly counts: boolean;
}

/**
 * Turn preserved Harbor trials into trial directories.
 *
 * What the directory gets and why:
 *
 *   result.json    per-check cells, one per scenario. This is the whole point of the import — it is
 *                  what a shape's `agentTrialsRun: 6` cannot be and what a synthetic
 *                  `suite_reward_zero` cell only looked like.
 *   challenge/     the AGENT-VISIBLE subtree, `environment/app/`. The hidden verifier lives in the
 *                  source task's `tests/` and is never copied: a challenge copy containing the answer
 *                  key would make the trial evidence about transcription.
 *   submission/    the engine the agent actually submitted, so the six can be re-graded when the
 *                  suite next changes — which is not hypothetical here, the suite already went from
 *                  245 checks to 267 and reversed one run's verdict.
 *   metadata.json  the OBSERVED model identity from the run's own config, not a registry constant,
 *                  and isolation stated as what it was rather than what this repository can do.
 */
export function importOutboxTrialDirectories(input: OutboxTrialImportInput): readonly OutboxTrialImport[] {
  const challengeFiles = sourceFiles(join(input.taskDir, "environment", "app"));
  if (challengeFiles.length === 0) {
    fail(
      "OUTBOX_TASK_SUBTREE_MISSING",
      join(input.taskDir, "environment/app"),
      "the agent-visible subtree is empty or absent; a trial whose challenge copy is empty records what the subject was given as nothing",
    );
  }

  return (input.runIds ?? OUTBOX_TRIAL_RUN_IDS).map((runId) => {
    const runDir = join(input.harborRunsRoot, runId, runId);
    const trialName = readdirSync(runDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith(`${input.familyId}__`))
      .map((e) => e.name)
      .sort()[0];
    if (trialName === undefined) {
      fail("OUTBOX_RUN_WITHOUT_TRIAL", runDir, `no "${input.familyId}__*" trial directory under it`);
    }
    const trialDir = join(runDir, trialName);
    const readJson = (name: string): Record<string, unknown> => {
      const parsed: unknown = JSON.parse(readFileSync(join(trialDir, name), "utf8"));
      return isRec(parsed) ? parsed : {};
    };
    const config = readJson("config.json");
    const result = readJson("result.json");
    const agent: Record<string, unknown> = isRec(config["agent"]) ? config["agent"] : {};
    const kwargs: Record<string, unknown> = isRec(agent["kwargs"]) ? agent["kwargs"] : {};
    const agentName = String(agent["name"] ?? "unknown");
    const model = String(agent["model_name"] ?? "unknown");
    const effort = typeof kwargs["reasoning_effort"] === "string" ? kwargs["reasoning_effort"] : null;
    const agentInfo: Record<string, unknown> = isRec(result["agent_info"]) ? result["agent_info"] : {};
    const agentResult: Record<string, unknown> = isRec(result["agent_result"]) ? result["agent_result"] : {};
    const verifierResult: Record<string, unknown> = isRec(result["verifier_result"])
      ? result["verifier_result"]
      : {};
    const rewards: Record<string, unknown> = isRec(verifierResult["rewards"])
      ? verifierResult["rewards"]
      : {};
    const reward = typeof rewards["reward"] === "number" ? rewards["reward"] : null;
    const started = Date.parse(String(result["started_at"] ?? ""));
    const finished = Date.parse(String(result["finished_at"] ?? ""));
    const runtimeSeconds =
      Number.isFinite(started) && Number.isFinite(finished) ? Math.round((finished - started) / 1000) : null;

    const grading = readOutboxGrading(join(trialDir, "verifier", "ctrf.json"));
    const submissionFiles = sourceFiles(join(trialDir, "artifacts", "app", "engine"), "engine/");
    const transcriptName = readdirSync(join(trialDir, "agent"), { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".txt"))
      .map((e) => e.name)
      .sort()[0];
    const transcript =
      transcriptName === undefined ? "" : readFileSync(join(trialDir, "agent", transcriptName), "utf8");

    // Classified before reward is read, the same order the archive importer uses and for the same
    // reason: an exception carries a reward too, and reading reward first turns it into a finding.
    const errored = result["exception_info"] !== null && result["exception_info"] !== undefined;
    const status: TrialStatus = errored ? "infrastructure_error" : "completed";
    const counts = !errored && grading.cells.length > 0 && submissionFiles.length > 0;
    const scenariosFailed = grading.cells.filter((c) => c.failed.length > 0).length;
    const suitePassed = grading.suiteTests.filter((t) => t.status === "passed").length;
    const failedChecks = [...new Set(grading.cells.flatMap((c) => c.failed))].sort();
    const reason = counts
      ? `graded by the source project's ${grading.testsTotal}-result suite: ${grading.cells.length} scenario(s) x ${grading.checks.length} check(s) plus ${grading.suiteTests.length} suite-level test(s), ${scenariosFailed} scenario(s) failing on ${failedChecks.join(", ") || "nothing"}; no exception and the submitted engine is preserved beside it`
      : errored
        ? `the run recorded an exception, so its reward of ${reward ?? "none"} is an infrastructure outcome rather than a capability finding`
        : "no per-check grading or no preserved submission; there is nothing here to re-grade";

    const countability: Countability = {
      counts,
      classification: status,
      reason: counts
        ? `${reason}. Countable because the grading is per check rather than a suite-level bit, the submitted engine is preserved so the result can be re-graded when the suite changes, and the agent-visible subtree it was given is copied beside it`
        : reason,
    };

    const record = parseTrialRecord({
      runId,
      familyId: input.familyId,
      // The bare model family, not `claude-opus-5@max`. Effort is preserved on its own field and in
      // the metadata; folding it into the SUBJECT id would make this model a different subject from
      // the same model in every other family, and cross-family subject overlap is the one thing this
      // family's evidence is currently good for.
      subjectId: modelFamily(model),
      subjectType: "agent",
      model,
      effort,
      status,
      counts,
      countsReason: reason,
      scenarioSetId: OUTBOX_SCENARIO_SET_ID,
      cells: grading.cells,
      runtimeSeconds,
      costUsd: typeof agentResult["cost_usd"] === "number" ? agentResult["cost_usd"] : null,
      artifactPath: `trials/${input.familyId}/${runId}/submission`,
      // What it actually was: a Harbor Docker environment per trial, with the verifier in a separate
      // environment from the agent. That is a real container boundary, and it is NOT this
      // repository's container runner, which does not exist — see ISOLATION_GUARANTEES.container.
      isolation: "container",
      notes: `externally executed by ${agentName} under the source project's Harbor/Docker harness; reward=${reward ?? "none"} suite=${suitePassed}/${grading.suiteTests.length} suite-level test(s) passed`,
    });

    const dir = writeTrialDirectory({
      root: input.trialsRoot,
      familyId: input.familyId,
      runId,
      record,
      countability,
      transcript,
      challengeFiles,
      submissionFiles,
      verifierOutput: {
        source: `${runId}/${trialName}/verifier/ctrf.json`,
        suite: `${grading.cells.length} scenarios x ${grading.checks.length} checks + ${grading.suiteTests.length} suite-level tests = ${grading.testsTotal} results`,
        reward,
        resultsFailed: grading.failedTotal,
        checks: grading.checks,
        suiteTests: grading.suiteTests,
        cells: grading.cells,
      },
      metadata: {
        runId,
        familyId: input.familyId,
        provenance: "externally executed",
        provenanceDetail:
          "run by the source Terminal-Bench project (klavis-terminal-bench-task) under Harbor, not by this repository's trial router; this family has no foundry challenge package and no route",
        sourceTrial: `runs/${runId}/${runId}/${trialName}`,
        sourceTaskChecksum: text(result["task_checksum"]),
        agent: agentName,
        agentVersion: text(agentInfo["version"]),
        // Observed, not declared: read off the run's own config.json rather than from any registry.
        model,
        modelSource: "config.json agent.model_name (observed in the run)",
        effort,
        effortSource: "config.json agent.kwargs.reasoning_effort (observed in the run)",
        subjectId: modelFamily(model),
        scenarioSetId: OUTBOX_SCENARIO_SET_ID,
        runtimeSeconds,
        costUsd: typeof agentResult["cost_usd"] === "number" ? agentResult["cost_usd"] : null,
        startedAt: text(result["started_at"]),
        finishedAt: text(result["finished_at"]),
        isolation: "container",
        isolationDetail:
          "the source project's Harbor Docker environment, one container per trial, with the verifier run in a separate environment from the agent; NOT this repository's container runner, which is declared and unimplemented",
        challengeHash: null,
        challengeHashReason:
          "this family is a shape, not a built family: it is absent from BUILT_FAMILIES, has no routeFor entry and emits no foundry challenge package, so there is no hash of the kind every other trial records and none was invented",
        agentVisibleSubtreeSha256: OUTBOX_AGENT_VISIBLE_SUBTREE_SHA256,
        agentVisibleSubtreeSource:
          "pinned by the source project's results/34-cc267-standard-matrix.md for exactly this round",
        challengeSubtree: "tasks/durable-approval-outbox/environment/app",
        challengeFiles: challengeFiles.length,
        submissionFiles: submissionFiles.length,
        transcriptSource: transcriptName ?? null,
        classification: status,
        classificationDetail: reason,
        scenariosGraded: grading.cells.length,
        scenariosFailed,
        failedChecks,
        suiteLevelTests: grading.suiteTests,
      },
    });

    return {
      runId,
      dir,
      subjectId: modelFamily(model),
      model,
      effort,
      scenarios: grading.cells.length,
      scenariosFailed,
      failedChecks,
      suitePassed,
      suiteTotal: grading.suiteTests.length,
      counts,
    };
  });
}
