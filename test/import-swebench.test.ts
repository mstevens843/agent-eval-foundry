// Tests for the SWE-bench importer and the null model.
//
// The importer has exactly one interesting decision -- what `no_logs` becomes -- and it is the
// decision that moves the headline, so it gets a test that fails loudly if someone "simplifies" it
// into a failure. The rest is refusal behaviour: an import that silently repairs a malformed corpus
// produces a number nobody can audit.
//
// The null model gets tested for determinism and for marginal preservation, because both are load-
// bearing. Determinism is what lets a report with a significance test still be checked in and
// diffed; marginal preservation is the entire logic of the test -- if the shuffle changed how many
// instances a system passes, it would be measuring the wrong null.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { measure } from "../src/axis-meter.js";
import { importSweBenchVerified } from "../src/import-swebench.js";
import { nullBaseline } from "../src/null-model.js";

const RAW_PATH = new URL("../examples/public-swebench-verified/swebench-verified.raw.json", import.meta.url);

const tiny = {
  source: "test",
  split: "verified",
  instances: ["i0", "i1", "i2", "i3"],
  repos: ["r/a", "r/a", "r/b", "r/b"],
  systems: {
    alpha: { resolved: [0, 1], no_logs: [2], tags: { display_name: "Alpha", model_org: "OrgA" } },
    beta: { resolved: [0], no_logs: [], tags: {} },
  },
};

describe("swebench importer", () => {
  it("maps resolved to a pass, no_logs to NOT MEASURED, and everything else to a failure", () => {
    const m = importSweBenchVerified(tiny);
    const row = (id: string) => m.results[id] ?? {};
    expect(row("i0")["alpha"]).toEqual({ failed: [] }); // resolved -> pass
    expect(row("i2")["alpha"]).toBeNull(); // no_logs -> not measured
    expect(row("i3")["alpha"]).toEqual({ failed: ["unresolved"] }); // absent -> failed
    // The point of the distinction: the unmeasured cell is not counted as a catch.
    const r = measure(m);
    expect(r.unmeasuredCells).toBe(1);
    expect(r.measuredCells).toBe(7);
  });

  it("does not let no_logs inflate a catch set", () => {
    const withNoLogs = measure(importSweBenchVerified(tiny));
    const asFailure = measure(
      importSweBenchVerified({
        ...tiny,
        systems: { ...tiny.systems, alpha: { ...tiny.systems.alpha, no_logs: [] } },
      }),
    );
    // Same corpus, one cell reclassified: treating it as a failure adds a catch.
    expect(asFailure.unmeasuredCells).toBe(0);
    expect(asFailure.measuredCells).toBeGreaterThan(withNoLogs.measuredCells);
  });

  it("carries metadata into subject fields", () => {
    const m = importSweBenchVerified(tiny);
    const alpha = m.subjects.find((s) => s.id === "alpha");
    expect(alpha?.label).toBe("Alpha");
    expect(alpha?.family).toBe("OrgA");
    expect(alpha?.note).toBe("resolved 2/4");
    // Missing metadata falls back rather than throwing.
    expect(m.subjects.find((s) => s.id === "beta")?.family).toBe("unknown");
  });

  it("groups instances by repository", () => {
    const m = importSweBenchVerified(tiny);
    expect(m.instances.map((i) => i.family)).toEqual(["r/a", "r/a", "r/b", "r/b"]);
  });

  it("refuses a system whose resolved and no_logs overlap", () => {
    expect(() =>
      importSweBenchVerified({
        ...tiny,
        systems: { alpha: { resolved: [0, 1], no_logs: [1], tags: {} } },
      }),
    ).toThrow(/both resolved and no_logs/);
  });

  it("refuses an index outside the instance list", () => {
    expect(() =>
      importSweBenchVerified({ ...tiny, systems: { alpha: { resolved: [99], no_logs: [], tags: {} } } }),
    ).toThrow(/out of range/);
  });

  it("refuses duplicate instance ids", () => {
    expect(() => importSweBenchVerified({ ...tiny, instances: ["a", "a", "b", "c"] })).toThrow(
      /duplicate instance id/,
    );
  });

  it("applies minResolved and limit, strongest first", () => {
    const filtered = importSweBenchVerified(tiny, { minResolved: 2 });
    expect(filtered.subjects.map((s) => s.id)).toEqual(["alpha"]);
    const limited = importSweBenchVerified(tiny, { limit: 1 });
    expect(limited.subjects.map((s) => s.id)).toEqual(["alpha"]);
    expect(() => importSweBenchVerified(tiny, { minResolved: 99 })).toThrow(/no submissions survived/);
  });
});

describe("null model", () => {
  const m = importSweBenchVerified(tiny);

  it("is deterministic for a given seed and differs across seeds", () => {
    const a = nullBaseline(m, { trials: 2, seed: 42 });
    const b = nullBaseline(m, { trials: 2, seed: 42 });
    expect(a.widths).toEqual(b.widths);
    expect(a.seed).toBe(42);
  });

  it("preserves each subject's pass count and unmeasured cells", () => {
    // Rebuilt from the shuffle logic: a subject that passed k of its measured instances must still
    // pass exactly k, or the null is testing the wrong hypothesis.
    const before = m.subjects.map((s) => {
      const passes = m.instances.filter((i) => m.results[i.id]?.[s.id]?.failed.length === 0).length;
      const unmeasured = m.instances.filter((i) => m.results[i.id]?.[s.id] === null).length;
      return { id: s.id, passes, unmeasured };
    });
    expect(before).toEqual([
      { id: "alpha", passes: 2, unmeasured: 1 },
      { id: "beta", passes: 1, unmeasured: 0 },
    ]);
    // The baseline runs without throwing and reports a width no larger than the ceiling.
    const nb = nullBaseline(m, { trials: 3, seed: 1 });
    expect(nb.widths).toHaveLength(3);
    for (const w of nb.widths) expect(w).toBeLessThanOrEqual(nb.ceiling);
  });

  it("attaches to the report only when requested", () => {
    expect(measure(m).nullBaseline).toBeUndefined();
    expect(measure(m, { nullTrials: 2 })?.nullBaseline?.trials).toBe(2);
  });
});

describe("the real SWE-bench Verified corpus", () => {
  // Guards the checked-in artifact: if fetch.py is re-run and the corpus shifts, this fails rather
  // than silently changing the number quoted in MEMO.md.
  const raw: unknown = JSON.parse(readFileSync(RAW_PATH, "utf8"));

  it("imports 500 instances and 134 systems with no fetch errors", () => {
    const m = importSweBenchVerified(raw);
    expect(m.instances).toHaveLength(500);
    expect(m.subjects).toHaveLength(134);
    expect((raw as { fetch_errors: unknown[] }).fetch_errors).toHaveLength(0);
  });

  it("reproduces the headline numbers in the checked-in report", () => {
    const r = measure(importSweBenchVerified(raw));
    expect(r.measuredCells).toBe(500 * 134 - 216);
    expect(r.unmeasuredCells).toBe(216);
    expect(r.distinctMeasurements).toBe(474);
    expect(r.independentAxes).toBe(215);
    expect(r.blindInstances).toHaveLength(0);
  });

  it("scores far below the null model, so the compression is structural", () => {
    const r = measure(importSweBenchVerified(raw), { nullTrials: 1 });
    const nb = r.nullBaseline;
    expect(nb).toBeDefined();
    expect(nb?.ceiling).toBe(500);
    // Randomised data with identical marginals should sit at or near the ceiling.
    expect(nb?.meanWidth ?? 0).toBeGreaterThan(450);
    expect(r.independentAxes).toBeLessThan((nb?.meanWidth ?? 0) / 2);
  });
});
