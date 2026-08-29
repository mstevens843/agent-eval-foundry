// A significance test for the axis count, and the reason the count needs one.
//
// On a small deterministic bank the axis width is self-evidently meaningful: ten engines, one
// verifier, and catch sets that nest because the engines really do carry nested defects. On a large
// noisy bank it is not obvious at all. Every cell in a public leaderboard corpus is a single
// unreplicated run, and two instances that measure the same underlying weakness will still differ by
// a handful of systems through ordinary run-to-run variance. Exact subset nesting is unforgiving of
// that: one stray disagreement breaks the nesting and splits one axis into two. So a large corpus
// could report a high axis count purely because it is noisy, and the number would look like a
// finding.
//
// The test: destroy the structure and keep the noise. Each subject keeps exactly its own pass count
// and its own unmeasured cells, but WHICH instances it passes is redrawn at random. That removes any
// relationship between instances -- no instance is harder than another, no two instances share a
// cause -- while preserving the marginal that drives set sizes. If the real corpus scores near the
// null, its axis count is an artifact of bank size and noise. If it scores far below, the
// compression is real: instances genuinely fail together.
//
// Randomness is seeded and the generator is written out in full rather than imported, because a
// checked-in report has to regenerate byte-for-byte. `Math.random` would make the report
// non-diffable and is never used here.

import { antichainWidth } from "./similarity.js";
import type { Matrix } from "./types.js";

/** mulberry32: small, fast, well-distributed, and exactly reproducible across platforms. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates over a copy, driven by the seeded generator. */
function shuffled<T>(items: readonly T[], next: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

export interface NullBaselineOptions {
  readonly trials?: number;
  readonly seed?: number;
}

export interface NullBaseline {
  readonly seed: number;
  readonly trials: number;
  /** Antichain width per trial, in order. */
  readonly widths: readonly number[];
  /** Distinct catch-set count per trial, in order. */
  readonly distinct: readonly number[];
  /** The largest width the corpus could report: one axis per discriminating instance. */
  readonly ceiling: number;
}

/**
 * Re-measure the corpus with instance structure destroyed and subject marginals preserved.
 *
 * Not a separate metric: it runs the same `antichainWidth` over the same catch sets, and exists only
 * to say whether the real number is distinguishable from chance.
 */
export function nullBaseline(matrix: Matrix, options: NullBaselineOptions = {}): NullBaseline {
  const trials = Math.max(1, options.trials ?? 3);
  const seed = options.seed ?? 20260828;
  const subjectIds = matrix.subjects.map((s) => s.id);
  const instanceIds = matrix.instances.map((i) => i.id);

  // Per subject: which instances it was measured on, and how many of those it passed.
  const profile = subjectIds.map((sid) => {
    const measured: string[] = [];
    let passes = 0;
    for (const iid of instanceIds) {
      const cell = matrix.results[iid]?.[sid];
      if (cell === null || cell === undefined) continue;
      measured.push(iid);
      if (cell.failed.length === 0) passes += 1;
    }
    return { sid, measured, passes };
  });

  const widths: number[] = [];
  const distinct: number[] = [];

  for (let t = 0; t < trials; t += 1) {
    const next = rng(seed + t);
    const failsBy = new Map<string, Set<string>>(instanceIds.map((iid) => [iid, new Set<string>()]));
    for (const { sid, measured, passes } of profile) {
      const order = shuffled(measured, next);
      // The first `passes` instances pass; the remainder fail. Same marginal, no structure.
      for (let k = passes; k < order.length; k += 1) {
        const iid = order[k];
        if (iid !== undefined) failsBy.get(iid)?.add(sid);
      }
    }
    const sets = new Map<string, readonly string[]>();
    for (const iid of instanceIds) {
      const caught = [...(failsBy.get(iid) ?? [])].sort();
      if (caught.length === 0) continue;
      sets.set(caught.join(" "), caught);
    }
    const deduped = [...sets.values()];
    distinct.push(deduped.length);
    widths.push(antichainWidth(deduped).width);
  }

  const ceiling = instanceIds.filter((iid) =>
    subjectIds.some((sid) => (matrix.results[iid]?.[sid]?.failed.length ?? 0) > 0),
  ).length;

  return { seed, trials, widths, distinct, ceiling };
}
