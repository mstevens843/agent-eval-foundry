import { describe, expect, it, vi } from "vitest";
import { measure } from "../src/axis-meter.js";
import { catchSets, subjectStats } from "../src/catch-sets.js";
import { main } from "../src/cli.js";
import { commandMemo, withCommandContext } from "../src/commands/context.js";
import { parseMatrix } from "../src/matrix.js";
import { measurementContext } from "../src/measurement-context.js";
import { MIGRATIONS, assertMigrationAccountsForLosses } from "../src/trials/migration.js";

const matrix = () =>
  parseMatrix({
    schema: "agent-eval-foundry/matrix@1",
    suite: "same-ids",
    reference_subject: null,
    provenance: { caveat: "test" },
    subjects: ["a", "b", "c"].map((id) => ({ id })),
    instances: ["x", "y"].map((id) => ({ id })),
    results: {
      x: { a: { failed: ["safety"] }, b: null, c: { failed: [] } },
      y: { a: { failed: [] }, b: { failed: ["progress"] }, c: { failed: [] } },
    },
  });
describe("engineering integration", () => {
  it("preserves help, usage and command error exit codes without dispatching providers", () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      expect(main(["--help"])).toBe(0);
      expect(main([])).toBe(2);
      expect(main(["unknown-command"])).toBe(2);
      expect(main(["report", "this-matrix-does-not-exist.json"])).toBe(1);
      expect(stdout).toHaveBeenCalled();
      expect(stderr).toHaveBeenCalled();
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });
  it("accounts for separate migrations into one version without depending on record order", () => {
    const migrations = MIGRATIONS.filter(
      (m) =>
        m.familyId === "prompt-injection-memory-poisoning" && m.toHash === "14870e7a6999848e888db374fede18b3",
    );
    const ledger = {
      familyId: "prompt-injection-memory-poisoning",
      currentHash: "14870e7a6999848e888db374fede18b3",
      entries: [],
      counted: [],
      superseded: migrations.flatMap((m) => m.invalidated),
    };
    expect(ledger.superseded.length).toBeGreaterThan(3);
    expect(() => assertMigrationAccountsForLosses(ledger.familyId, ledger, migrations)).not.toThrow();
    expect(() =>
      assertMigrationAccountsForLosses(ledger.familyId, ledger, [...migrations].reverse()),
    ).not.toThrow();
    expect(() =>
      assertMigrationAccountsForLosses(
        ledger.familyId,
        { ...ledger, superseded: [...ledger.superseded, "unaccounted-run"] },
        migrations,
      ),
    ).toThrow(/MIGRATION_LOSSES_UNRECORDED/);
  });
  it("matrix memoization includes cells, missingness, provenance and null settings", () => {
    const cached = measurementContext();
    const m = matrix();
    const first = cached(m);
    expect(cached(matrix())).toBe(first);
    for (const next of [
      { ...m, results: { ...m.results, x: { ...m.results.x, a: { failed: [] } } } },
      { ...m, results: { ...m.results, x: { ...m.results.x, b: { failed: [] } } } },
      { ...m, provenance: { ...m.provenance, caveat: "adjudication corrected" } },
    ]) {
      expect(cached(next)).not.toBe(first);
      expect(cached(next)).toEqual(measure(next));
    }
    for (const nullSeed of [1, 2])
      expect(cached(m, { nullTrials: 3, nullSeed })).toEqual(measure(m, { nullTrials: 3, nullSeed }));
  });
  it("does not retain oversize reports or reuse command state after an evidence correction", () => {
    const cached = measurementContext(0);
    expect(cached(matrix())).not.toBe(cached(matrix()));
    let revision = "original";
    const read = vi.fn(() => revision);
    withCommandContext(() => {
      expect(commandMemo("adjudication", read)).toBe("original");
      expect(commandMemo("adjudication", read)).toBe("original");
    });
    revision = "corrected";
    withCommandContext(() => expect(commandMemo("adjudication", read)).toBe("corrected"));
    expect(read).toHaveBeenCalledTimes(2);
    expect(commandMemo("adjudication", read)).toBe("corrected");
    expect(read).toHaveBeenCalledTimes(3);
  });
  it("preserves sparse row and per-subject membership semantics", () => {
    const m = matrix();
    const sets = catchSets(m);
    const actual = subjectStats(m, sets);
    const expected = m.subjects.map((s) => ({
      subjectId: s.id,
      caughtBy: sets.filter((r) => r.caught.includes(s.id)).length,
      measuredOn: sets.filter((r) => !r.unmeasured.includes(s.id)).length,
    }));
    for (const e of expected) expect(actual.find((a) => a.subjectId === e.subjectId)).toMatchObject(e);
  });
});
