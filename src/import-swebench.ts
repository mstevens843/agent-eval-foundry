// Normalizing SWE-bench leaderboard results into a Matrix, and the one judgement that matters.
//
// A submission's results.json publishes `resolved` (instances whose patch passed the held-out tests)
// and, on most submissions, `no_logs` (instances whose evaluation produced no log at all). It does
// not publish a "failed" list. The leaderboard score is |resolved| / 500, so by the benchmark's own
// accounting anything not resolved counts against the system.
//
// That gives three cases and only the middle one is a real decision:
//
//   in `resolved`   -> passed.
//   in `no_logs`    -> NOT MEASURED. The evaluation did not produce a result, so recording it as a
//                      failure would credit the benchmark with a discrimination it never made. This
//                      is the whole reason `Cell | null` exists in this package, and SWE-bench is the
//                      first corpus where the distinction is load-bearing: 216 cells across 41
//                      submissions land here.
//   anything else   -> failed. Includes `no_generation` (the system produced no patch), which is a
//                      genuine failure to solve rather than a gap in measurement.
//
// The alternative -- folding `no_logs` into failures -- would inflate every catch set by up to 90
// entries on a single submission and would move the headline in the flattering direction, since
// larger catch sets nest less often and therefore report more axes.
//
// Two structural notes. SWE-bench grades one bit per instance, so there is no check-level detail to
// carry; a failure records the single synthetic check name `unresolved`. And unlike the internal
// example, the bank here was assembled by 134 independent teams over two years with no knowledge of
// this analysis, which is exactly the independence the internal example lacks.

import { parseMatrix } from "./matrix.js";
import type { Matrix } from "./types.js";

export interface SweBenchImportOptions {
  /** Keep only submissions resolving at least this many instances. Default 0 (keep all). */
  readonly minResolved?: number;
  /** Keep at most this many submissions, strongest first. Default: all. */
  readonly limit?: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const fail = (msg: string): never => {
  throw new Error(`swebench import: ${msg}`);
};

const intList = (v: unknown, where: string): readonly number[] =>
  Array.isArray(v)
    ? v.map((x) => (typeof x === "number" && Number.isInteger(x) ? x : fail(`${where}: expected integers`)))
    : fail(`${where}: expected array`);

const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

/**
 * Convert the interned `swebench-verified.raw.json` produced by `fetch.py` into a Matrix.
 *
 * Throws rather than repairing on any structural surprise, matching the loader's posture: every
 * plausible repair here would move a headline number, and always in the same direction.
 */
export function importSweBenchVerified(raw: unknown, options: SweBenchImportOptions = {}): Matrix {
  const d = isRecord(raw) ? raw : fail("expected an object");

  const instanceIds = Array.isArray(d["instances"])
    ? d["instances"].map((x, i) => (typeof x === "string" ? x : fail(`instances[${i}]: expected string`)))
    : fail("instances: expected array");
  const repos = Array.isArray(d["repos"]) ? d["repos"] : [];
  if (new Set(instanceIds).size !== instanceIds.length) fail("duplicate instance id");

  const rawSystems = isRecord(d["systems"]) ? d["systems"] : fail("systems: expected object");

  const parsed = Object.entries(rawSystems).map(([name, value]) => {
    const s = isRecord(value) ? value : fail(`systems["${name}"]: expected object`);
    const resolved = intList(s["resolved"], `systems["${name}"].resolved`);
    const noLogs = intList(s["no_logs"], `systems["${name}"].no_logs`);
    for (const idx of [...resolved, ...noLogs]) {
      if (idx < 0 || idx >= instanceIds.length) fail(`systems["${name}"]: index ${idx} out of range`);
    }
    const resolvedSet = new Set(resolved);
    const overlap = noLogs.filter((i) => resolvedSet.has(i));
    if (overlap.length > 0) {
      fail(
        `systems["${name}"]: ${overlap.length} instance(s) are both resolved and no_logs, so the pass/not-measured mapping is ambiguous`,
      );
    }
    const tags = isRecord(s["tags"]) ? s["tags"] : {};
    return { name, resolved: new Set(resolved), noLogs: new Set(noLogs), tags };
  });

  const min = options.minResolved ?? 0;
  const kept = parsed
    .filter((s) => s.resolved.size >= min)
    .sort((a, b) => b.resolved.size - a.resolved.size || a.name.localeCompare(b.name))
    .slice(0, options.limit ?? parsed.length);

  if (kept.length === 0) fail("no submissions survived the filter");

  const subjects = kept.map((s) => ({
    id: s.name,
    label: strOrNull(s.tags["display_name"]) ?? s.name,
    // Group by the organisation behind the MODEL rather than the scaffold: it is the coarser and
    // more stable of the two, and several scaffolds appear with many different models.
    family: strOrNull(s.tags["model_org"]) ?? "unknown",
    model: strOrNull(s.tags["model"]),
    effort: null,
    note: `resolved ${s.resolved.size}/${instanceIds.length}`,
  }));

  const instances = instanceIds.map((id, i) => ({
    id,
    schedule: typeof repos[i] === "string" ? (repos[i] as string) : id,
    seed: null,
    keys: null,
    family: typeof repos[i] === "string" ? (repos[i] as string) : "unknown",
    source: "swe-bench/experiments evaluation/verified",
    note: null,
  }));

  const results: Record<string, Record<string, { failed: string[] } | null>> = {};
  instanceIds.forEach((id, i) => {
    const row: Record<string, { failed: string[] } | null> = {};
    for (const s of kept) {
      row[s.name] = s.noLogs.has(i) ? null : { failed: s.resolved.has(i) ? [] : ["unresolved"] };
    }
    results[id] = row;
  });

  const noLogsCells = kept.reduce((n, s) => n + s.noLogs.size, 0);

  return parseMatrix({
    schema: "agent-eval-foundry/matrix@1",
    suite: "swe-bench/verified",
    provenance: {
      repo: "github.com/swe-bench/experiments",
      artifact_commit: null,
      task_sha256: null,
      suite_shape: `${instanceIds.length} instances / ${kept.length} submitted systems`,
      checks_total: instanceIds.length,
      // SWE-bench records resolved/unresolved and nothing finer, so the universe is one check.
      checks_declared: ["unresolved"],
      extracted_from: [
        "swe-bench/experiments evaluation/verified/*/results/results.json",
        "swe-bench/experiments evaluation/verified/*/metadata.yaml",
        "huggingface princeton-nlp/SWE-bench_Verified (canonical instance ids)",
      ],
      caveat: `Subjects were NOT selected against these instances: the 134 systems were submitted independently by different teams between 2023 and 2025, with no knowledge of this analysis. That independence is the point of using this corpus. The corresponding weakness is measurement noise: each cell is a single unreplicated run, SWE-bench grades one bit per instance with no check-level detail, and ${noLogsCells} cells are recorded as not measured because the submission published no evaluation log for them.`,
    },
    reference_subject: null,
    subjects,
    instances,
    results,
  });
}
