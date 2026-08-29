// Tests for the two claims that carry the whole tool: that a chain of nested catch sets counts as
// ONE axis rather than several, and that an unmeasured cell is never silently read as a pass.
//
// Both are places where a plausible implementation gives a flattering wrong answer, so both get a
// test that fails loudly if the implementation drifts back toward flattery. The rest is boundary
// behaviour on the loader, which exists to make sure a malformed matrix stops the run instead of
// quietly producing a number.

import { describe, expect, it } from "vitest";
import { measure } from "../src/axis-meter.js";
import { MatrixError, parseMatrix } from "../src/matrix.js";
import {
  antichainWidth,
  isProperSubset,
  jaccard,
  maxBipartiteMatching,
  subsetAdjacency,
} from "../src/similarity.js";
import type { Cell } from "../src/types.js";

const subj = (id: string) => ({ id, label: id, family: "t", model: null, effort: null, note: null });
const inst = (id: string) => ({
  id,
  schedule: id,
  seed: null,
  keys: null,
  family: "t",
  source: null,
  note: null,
});

const build = (
  subjects: readonly string[],
  rows: Readonly<Record<string, Readonly<Record<string, Cell | null>>>>,
  caveat: string | null = null,
) =>
  parseMatrix({
    schema: "agent-eval-foundry/matrix@1",
    suite: "test",
    provenance: { caveat },
    reference_subject: null,
    subjects: subjects.map(subj),
    instances: Object.keys(rows).map(inst),
    results: rows,
  });

const F = { failed: ["x"] } satisfies Cell;
const P = { failed: [] } satisfies Cell;

describe("antichain width", () => {
  it("counts a nested chain as one axis, not three", () => {
    const { width } = antichainWidth([["a"], ["a", "b"], ["a", "b", "c"]]);
    expect(width).toBe(1);
  });

  it("counts mutually incomparable sets as separate axes", () => {
    const { width } = antichainWidth([["a"], ["b"], ["c"]]);
    expect(width).toBe(3);
  });

  it("handles a mixed poset: one chain plus one incomparable branch", () => {
    const { width } = antichainWidth([["a"], ["a", "b"], ["c"]]);
    expect(width).toBe(2);
  });

  it("returns a chain cover whose size equals the width", () => {
    const sets = [["a"], ["a", "b"], ["a", "b", "c"], ["z"]];
    const { width, chains } = antichainWidth(sets);
    expect(chains.length).toBe(width);
    expect(chains.flat().length).toBe(sets.length);
  });

  it("is empty on no input", () => {
    expect(antichainWidth([])).toEqual({ width: 0, chains: [] });
  });
});

describe("the two matching implementations agree", () => {
  // The docstring on maxBipartiteMatching promises the width can be checked without trusting the
  // chain reconstruction. This is the test that makes that promise true, and that stops the
  // standalone matching and the loop inlined in antichainWidth from silently diverging.
  const sample = (i: number): readonly string[] => {
    const universe = ["a", "b", "c", "d", "e"];
    return universe.filter((_, bit) => (i >> bit) % 2 === 1);
  };

  it("width equals n - maxBipartiteMatching over the same adjacency", () => {
    for (let seed = 1; seed < 60; seed += 1) {
      const sets = [...new Set([...Array(6).keys()].map((k) => sample((seed * (k + 3)) % 32)))].map((s) => [
        ...s,
      ]);
      const deduped = [...new Map(sets.map((s) => [s.join(" "), s])).values()];
      const adj = subsetAdjacency(deduped);
      expect(deduped.length - maxBipartiteMatching(adj, deduped.length)).toBe(antichainWidth(deduped).width);
    }
  });

  it("matches Sperner's theorem on the Boolean lattice B4", () => {
    // Every subset of a 4-element universe: the maximum antichain is C(4,2) = 6.
    const universe = ["a", "b", "c", "d"];
    const all = [...Array(16).keys()].map((i) => universe.filter((_, bit) => (i >> bit) % 2 === 1));
    expect(antichainWidth(all).width).toBe(6);
  });
});

describe("subset and jaccard helpers", () => {
  it("proper subset is strict", () => {
    expect(isProperSubset(["a"], ["a", "b"])).toBe(true);
    expect(isProperSubset(["a", "b"], ["a", "b"])).toBe(false);
    expect(isProperSubset(["c"], ["a", "b"])).toBe(false);
  });

  it("jaccard of two empty sets is 1", () => {
    expect(jaccard([], [])).toBe(1);
  });

  it("jaccard is the intersection over the union", () => {
    expect(jaccard(["a", "b"], ["b", "c"])).toBeCloseTo(1 / 3);
  });
});

describe("measure", () => {
  it("reports an instance nobody fails as separating nothing, not as a measurement", () => {
    const m = build(["s1", "s2"], {
      i1: { s1: P, s2: P },
      i2: { s1: F, s2: P },
    });
    const r = measure(m);
    expect(r.blindInstances).toEqual(["i1"]);
    expect(r.distinctMeasurements).toBe(1);
  });

  it("collapses duplicate catch sets into one measurement", () => {
    const m = build(["s1", "s2"], {
      i1: { s1: F, s2: P },
      i2: { s1: F, s2: P },
      i3: { s1: F, s2: P },
    });
    const r = measure(m);
    expect(r.distinctMeasurements).toBe(1);
    expect(r.independentAxes).toBe(1);
    expect(r.redundancy).toBeCloseTo(3);
  });

  it("does not treat an unmeasured cell as a pass", () => {
    const withNull = measure(build(["s1", "s2"], { i1: { s1: F, s2: null }, i2: { s1: F, s2: F } }));
    const withPass = measure(build(["s1", "s2"], { i1: { s1: F, s2: P }, i2: { s1: F, s2: F } }));
    expect(withNull.unmeasuredCells).toBe(1);
    expect(withPass.unmeasuredCells).toBe(0);
    // Both yield two distinct catch sets, but only the null version records the gap.
    expect(withNull.distinctMeasurements).toBe(withPass.distinctMeasurements);
    expect(withNull.measuredCells).toBeLessThan(withPass.measuredCells);
  });

  it("classifies a subject no instance catches as never-caught", () => {
    const r = measure(build(["s1", "ghost"], { i1: { s1: F, ghost: P } }));
    const ghost = r.subjectStats.find((s) => s.subjectId === "ghost");
    expect(ghost?.role).toBe("never-caught");
  });

  it("classifies a subject every discriminating instance catches as always-caught", () => {
    const r = measure(build(["weak", "s2"], { i1: { weak: F, s2: P }, i2: { weak: F, s2: F } }));
    const weak = r.subjectStats.find((s) => s.subjectId === "weak");
    expect(weak?.role).toBe("always-caught");
  });

  it("curve carries an axis count, which can decay faster than the catch-set count", () => {
    // The reason CurvePoint has both columns: quoting distinctMeasurements as though it were the
    // axis count overstates what survives a stronger bank.
    const r = measure(
      build(["weak", "mid", "hard"], {
        i1: { weak: F, mid: P, hard: P },
        i2: { weak: F, mid: F, hard: P },
        i3: { weak: P, mid: P, hard: F },
      }),
    );
    for (const p of r.curve) {
      expect(p.independentAxes).toBeLessThanOrEqual(p.distinctMeasurements);
      expect(p.independentAxes).toBeGreaterThanOrEqual(0);
    }
    expect(r.curve[0]?.independentAxes).toBe(r.independentAxes);
  });

  it("curve loses measurements as the weakest subjects are dropped", () => {
    const r = measure(
      build(["weak", "mid", "hard"], {
        i1: { weak: F, mid: P, hard: P },
        i2: { weak: F, mid: F, hard: P },
        i3: { weak: F, mid: F, hard: F },
      }),
    );
    const first = r.curve[0]?.distinctMeasurements ?? 0;
    const last = r.curve[r.curve.length - 1]?.distinctMeasurements ?? 0;
    expect(first).toBeGreaterThan(last);
  });
});

describe("matrix loader refuses rather than repairs", () => {
  it("rejects a missing cell instead of defaulting it to a pass", () => {
    expect(() => build(["s1", "s2"], { i1: { s1: F } as Readonly<Record<string, Cell | null>> })).toThrow(
      MatrixError,
    );
  });

  it("requires provenance.caveat to be present", () => {
    expect(() =>
      parseMatrix({
        schema: "agent-eval-foundry/matrix@1",
        suite: "t",
        provenance: {},
        reference_subject: null,
        subjects: [subj("s1")],
        instances: [inst("i1")],
        results: { i1: { s1: P } },
      }),
    ).toThrow(/caveat is required/);
  });

  it("rejects the reference subject appearing in the graded bank", () => {
    expect(() =>
      parseMatrix({
        schema: "agent-eval-foundry/matrix@1",
        suite: "t",
        provenance: { caveat: null },
        reference_subject: "ref",
        subjects: [subj("ref")],
        instances: [inst("i1")],
        results: { i1: { ref: P } },
      }),
    ).toThrow(/not evidence about difficulty/);
  });

  it("rejects an unknown schema", () => {
    expect(() => parseMatrix({ schema: "something/else@9" })).toThrow(/unsupported schema/);
  });
});
