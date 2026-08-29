// System-level tests: the pieces that only misbehave once they are wired together.
//
// Three groups.
//
// ADVERSARIAL AXIS CASES. The axis meter is the one component whose answer nobody can eyeball, so it
// gets inputs chosen to break it rather than to demonstrate it: duplicate tasks, tasks nobody fails,
// perfectly nested chains, perfectly incomparable sets, and a bank where one subject is a superset
// of another. Each has a hand-derived expected answer stated in the test.
//
// LIVENESS. The mindset this repo argues for includes not shipping something correct that never
// finishes. The antichain computation is O(V*E) on the number of distinct catch sets, which is
// bounded by the suite size but not by anything small, so there is a test that it terminates on a
// deliberately adversarial poset at a realistic scale.
//
// REAL DATA. The checked-in registry has to load, satisfy coverage, and produce a scaffold that
// passes the independent checker. That is the end-to-end path the CLI takes, and if it breaks, every
// report in `reports/` is stale.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { measure } from "../src/axis-meter.js";
import { runFamily as runPicFamily } from "../src/families/prompt-injection-containment/runner.js";
import { handAuthoredComparison, planBudget } from "../src/foundry/budget.js";
import { loadRegistry } from "../src/foundry/load.js";
import { assertCoverage, coverage } from "../src/foundry/registry.js";
import { EXPECTED_ARTIFACTS, checkScaffold } from "../src/foundry/scaffold-check.js";
import { ARTIFACT_PLAN, generateScaffold, scaffoldFromShape } from "../src/foundry/scaffold.js";
import { parseMatrix } from "../src/matrix.js";
import { renderBudgetReport } from "../src/reports/budget-report.js";
import { PIC_FAMILY, familyEvidenceMap } from "../src/reports/evidence.js";
import { renderFamilyDiversityReport, renderLedgerReport } from "../src/reports/ledger-report.js";
import { renderMechanismReport, renderMutantReport } from "../src/reports/registry-report.js";
import { assessFamily, renderShipReport } from "../src/reports/ship-report.js";
import { computeEvidence } from "../src/reports/trial-report.js";
import { antichainWidth } from "../src/similarity.js";
import { SOURCES, getSource } from "../src/sources/index.js";
import { runLocalTrials } from "../src/trials/orchestrate.js";
import type { Cell } from "../src/types.js";

const ROOT = new URL("..", import.meta.url).pathname;
const registry = loadRegistry(ROOT);

// The ship report is rendered WITH computed family evidence by `foundry all`, so the determinism
// checks must render it the same way or they compare two different documents. That is not a comment
// about care: the test built its own evidence from local runs only, the CLI built it from the trial
// directories too, and the resulting mismatch reported the checked-in report as stale. Both now call
// the same builder, so drifting apart again requires changing shared code.
const picEvidence = familyEvidenceMap(ROOT);

const F = { failed: ["x"] } satisfies Cell;
const P = { failed: [] } satisfies Cell;

const matrix = (subjects: readonly string[], rows: Record<string, Record<string, Cell | null>>) =>
  parseMatrix({
    schema: "agent-eval-foundry/matrix@1",
    suite: "adversarial",
    provenance: { caveat: null },
    reference_subject: null,
    subjects: subjects.map((id) => ({ id, label: id, family: "t", model: null, effort: null, note: null })),
    instances: Object.keys(rows).map((id) => ({
      id,
      schedule: id,
      seed: null,
      keys: null,
      family: "t",
      source: null,
      note: null,
    })),
    results: rows,
  });

describe("axis meter — adversarial cases", () => {
  it("duplicate tasks collapse to one measurement, however many there are", () => {
    const rows: Record<string, Record<string, Cell | null>> = {};
    for (let i = 0; i < 25; i += 1) rows[`dup${i}`] = { a: F, b: P, c: P };
    const r = measure(matrix(["a", "b", "c"], rows));
    expect(r.instanceCount).toBe(25);
    expect(r.distinctMeasurements).toBe(1);
    expect(r.independentAxes).toBe(1);
    expect(r.redundancy).toBeCloseTo(25);
  });

  it("tasks nobody fails are blind, not measurements", () => {
    const r = measure(
      matrix(["a", "b"], {
        blind1: { a: P, b: P },
        blind2: { a: P, b: P },
        real: { a: F, b: P },
      }),
    );
    expect(r.blindInstances).toEqual(["blind1", "blind2"]);
    expect(r.distinctMeasurements).toBe(1);
  });

  it("a perfectly nested chain is one axis regardless of length", () => {
    const subjects = ["s0", "s1", "s2", "s3", "s4", "s5"];
    const rows: Record<string, Record<string, Cell | null>> = {};
    for (let k = 1; k <= 6; k += 1) {
      const row: Record<string, Cell | null> = {};
      subjects.forEach((s, i) => {
        row[s] = i < k ? F : P;
      });
      rows[`n${k}`] = row;
    }
    const r = measure(matrix(subjects, rows));
    expect(r.distinctMeasurements).toBe(6);
    expect(r.independentAxes).toBe(1); // {s0} ⊂ {s0,s1} ⊂ … ⊂ {s0..s5}
    expect(r.chains).toHaveLength(1);
  });

  it("perfectly incomparable catch sets are all separate axes", () => {
    const subjects = ["a", "b", "c", "d"];
    const rows: Record<string, Record<string, Cell | null>> = {};
    for (const s of subjects) {
      const row: Record<string, Cell | null> = {};
      for (const t of subjects) row[t] = t === s ? F : P;
      rows[`only-${s}`] = row;
    }
    const r = measure(matrix(subjects, rows));
    expect(r.distinctMeasurements).toBe(4);
    expect(r.independentAxes).toBe(4);
  });

  it("an always-caught subject separates nothing and is flagged as dead weight", () => {
    const r = measure(
      matrix(["weak", "a", "b"], {
        i1: { weak: F, a: F, b: P },
        i2: { weak: F, a: P, b: F },
      }),
    );
    expect(r.subjectStats.find((s) => s.subjectId === "weak")?.role).toBe("always-caught");
    // Removing it leaves two incomparable singletons, so the axis count is unchanged by its presence.
    expect(r.independentAxes).toBe(2);
  });

  it("the null model on structureless data reaches the ceiling", () => {
    const subjects = Array.from({ length: 12 }, (_, i) => `s${i}`);
    const rows: Record<string, Record<string, Cell | null>> = {};
    for (let i = 0; i < 30; i += 1) {
      const row: Record<string, Cell | null> = {};
      subjects.forEach((s, j) => {
        row[s] = (i * 7 + j * 5) % 3 === 0 ? F : P;
      });
      rows[`i${i}`] = row;
    }
    const r = measure(matrix(subjects, rows), { nullTrials: 2 });
    expect(r.nullBaseline).toBeDefined();
    expect(r.nullBaseline?.meanWidth ?? 0).toBeGreaterThanOrEqual(r.independentAxes);
  });
});

describe("axis meter — liveness", () => {
  it("terminates on an adversarial poset at realistic scale", () => {
    // The Boolean-lattice-like worst case: many mutually incomparable sets of equal size, which is
    // where the matching does the most work. 300 sets is above any suite this repo measures.
    const sets = Array.from({ length: 300 }, (_, i) => [`s${i}`, `s${(i + 1) % 300}`]);
    const started = Date.now();
    const { width, chains } = antichainWidth(sets);
    expect(width).toBeGreaterThan(0);
    expect(chains.flat()).toHaveLength(sets.length);
    expect(Date.now() - started).toBeLessThan(20_000);
  });
});

describe("sources", () => {
  it("declares both implemented and planned sources", () => {
    expect(SOURCES.filter((s) => s.status === "implemented").length).toBeGreaterThanOrEqual(3);
    expect(SOURCES.filter((s) => s.status === "planned").length).toBeGreaterThanOrEqual(3);
  });

  it("a planned source refuses rather than returning an empty matrix", () => {
    for (const s of SOURCES.filter((x) => x.status === "planned")) {
      expect(() => s.load({}), `${s.id} should refuse`).toThrow(/declared but not implemented/);
      expect(s.requires, `${s.id} must say what it needs`).toBeTruthy();
    }
  });

  it("unknown source ids are rejected", () => {
    expect(() => getSource("nope")).toThrow(/unknown source/);
  });
});

describe("the checked-in registry", () => {
  it("loads, and every mechanism is detectable by some mutant", () => {
    const cov = assertCoverage(registry);
    expect(registry.mechanisms.length).toBeGreaterThanOrEqual(14);
    expect(registry.mutants.length).toBeGreaterThanOrEqual(12);
    expect(registry.shapes.length).toBeGreaterThanOrEqual(6);
    expect(registry.candidates.length).toBeGreaterThanOrEqual(20);
    expect(cov.mechanismsWithoutDetection).toEqual([]);
    expect(cov.orphanedMutants).toEqual([]);
  });

  it("records real kills, not just successes — the ledger's whole purpose", () => {
    const killed = registry.candidates.filter((c) => c.status === "killed");
    expect(killed.length).toBeGreaterThanOrEqual(5);
    for (const k of killed) expect(k.failureNotes, `${k.id} must say why it died`).toBeTruthy();
  });

  it("keeps measured and estimated rows distinguishable", () => {
    const measured = registry.candidates.filter((c) => c.dataQuality === "measured");
    expect(measured.length).toBeGreaterThan(0);
    for (const m of measured) expect(m.results, `${m.id} claims measured`).not.toBeNull();
  });

  it("four families now have measured axis counts", () => {
    const measured = registry.shapes.filter((s) => s.dataQuality === "measured");
    expect(measured.map((s) => s.familyId).sort()).toEqual([
      "durable-approval-outbox",
      "prompt-injection-containment",
      "prompt-injection-memory-poisoning",
      "ui-action-record-replay",
    ]);
    for (const m of measured) expect(m.estimatedAxes, m.familyId).toBeGreaterThan(1);
  });

  it("only a family a real agent has attempted can reach SHIP", () => {
    // A measured axis count proves the VERIFIER discriminates; it does not prove the family is hard.
    // That distinction was forced into the gate table when the second family had four measured axes
    // and zero agent trials. It has trials now, so the no-trials case is constructed rather than
    // taken from the registry — the invariant outlives the example.
    const outbox = registry.shapes.find((s) => s.familyId === "durable-approval-outbox");
    const pic = registry.shapes.find((s) => s.familyId === "prompt-injection-containment");
    expect(outbox?.agentTrialsRun).toBeGreaterThan(0);
    expect(assessFamily(outbox as NonNullable<typeof outbox>, registry).verdict).toBe("SHIP");

    const untried = { ...(pic as NonNullable<typeof pic>), agentTrialsRun: null };
    expect(assessFamily(untried, registry).verdict).toBe("HOLD");
    expect(
      assessFamily(untried, registry).results.find((r) => r.gate.id === "difficulty-evidenced")?.verdict,
    ).toBe("fail");
  });
});

describe("scaffold generation on real data", () => {
  it("every checked-in shape generates a scaffold that passes the independent checker", () => {
    for (const shape of registry.shapes) {
      const out = scaffoldFromShape(shape, registry);
      expect(() => checkScaffold(out.files, shape.familyId), shape.familyId).not.toThrow();
    }
  });

  it("generating from a mechanism id alone also passes", () => {
    const out = generateScaffold(
      {
        familyId: "smoke-family",
        name: "Smoke family",
        domain: "payments",
        mechanismIds: ["uncertain-external-effects"],
      },
      registry,
    );
    expect(() => checkScaffold(out.files, "smoke-family")).not.toThrow();
  });

  it("the generator and the checker agree on the artifact list without importing each other", () => {
    expect([...ARTIFACT_PLAN].sort()).toEqual([...EXPECTED_ARTIFACTS].sort());
  });

  it("refuses an unknown mechanism rather than emitting an empty scaffold", () => {
    expect(() =>
      generateScaffold(
        { familyId: "x", name: "X", domain: "d", mechanismIds: ["not-a-mechanism"] },
        registry,
      ),
    ).toThrow(/known mechanism id/);
  });
});

describe("ship gate on real data", () => {
  it("the shipped family passes every blocking gate", () => {
    const shape = registry.shapes.find((s) => s.familyId === "durable-approval-outbox");
    expect(shape).toBeDefined();
    const a = assessFamily(shape as NonNullable<typeof shape>, registry);
    expect(a.blockingFailures).toEqual([]);
    expect(a.verdict).toBe("SHIP");
  });

  it("a measured family with no agent trials is held, not shipped", () => {
    const pic = registry.shapes.find((s) => s.familyId === "prompt-injection-containment");
    const a = assessFamily({ ...(pic as NonNullable<typeof pic>), agentTrialsRun: null }, registry);
    expect(a.blockingFailures).toEqual([]);
    expect(a.results.find((r) => r.gate.id === "measured-axes")?.verdict).toBe("pass");
    expect(a.results.find((r) => r.gate.id === "difficulty-evidenced")?.verdict).toBe("fail");
    expect(a.verdict).toBe("HOLD");
  });

  it("the family that HAS been attempted is blocked for the opposite reason", () => {
    // Three real trials, every one of them a clean pass. The gate that fails is `not-already-solved`,
    // and it fails BECAUSE the evidence arrived — which is the whole point of collecting it.
    const pic = registry.shapes.find((s) => s.familyId === "prompt-injection-containment");
    const a = assessFamily(pic as NonNullable<typeof pic>, registry, picEvidence[PIC_FAMILY]);
    expect(a.results.find((r) => r.gate.id === "difficulty-evidenced")?.verdict).toBe("pass");
    expect(a.blockingFailures).toContain("not-already-solved");
    expect(a.verdict).toBe("NOT-READY");
  });

  it("unbuilt families cannot reach SHIP on an estimate", () => {
    for (const s of registry.shapes.filter((x) => x.dataQuality === "estimated")) {
      expect(assessFamily(s, registry).verdict, s.familyId).not.toBe("SHIP");
    }
  });
});

describe("budget model", () => {
  const inputs = {
    totalUsd: 100_000,
    labourRateUsdPerHour: 120,
    hoursPerFamily: 45,
    hoursPerScreenedCandidate: 3,
    cycleHitRate: 0.1,
    matricesPerFamily: 3,
    usdPerMatrix: 48.66,
    retryRate: 0.15,
    instancesPerFamily: 24,
    axesPerFamily: 3,
    postBuildKillRate: 0.5,
    evolutionCyclesPerSurvivor: 2,
    descendantReuse: 0.35,
  };

  it("labour dominates, which is the finding", () => {
    const plan = planBudget(inputs);
    expect(plan.labourShare).toBeGreaterThan(0.95);
    expect(plan.modelUsd).toBeLessThan(plan.labourUsd / 10);
  });

  it("hand-authoring yields one axis per task, not a family's worth", () => {
    const hand = handAuthoredComparison(inputs);
    expect(hand.shippedTasks).toBe(hand.families);
    expect(hand.expectedAxes).toBe(hand.families);
    expect(hand.usdPerShippedTask).toBeGreaterThan(planBudget(inputs).usdPerShippedTask * 10);
  });

  it("instances per family is the lever", () => {
    const few = planBudget({ ...inputs, instancesPerFamily: 1 });
    const many = planBudget({ ...inputs, instancesPerFamily: 48 });
    expect(many.usdPerShippedTask).toBeLessThan(few.usdPerShippedTask / 10);
    expect(many.families).toBe(few.families); // the lever moves yield, not family count
  });

  it("$100k does not buy 1,000 tasks under measured assumptions", () => {
    expect(planBudget(inputs).shippedTasks).toBeLessThan(1000);
  });
});

describe("report determinism", () => {
  const cov = coverage(registry);
  const cases: readonly (readonly [string, () => string])[] = [
    ["mechanisms", () => renderMechanismReport(registry, cov)],
    ["mutants", () => renderMutantReport(registry, cov)],
    ["ledger", () => renderLedgerReport(registry)],
    ["families", () => renderFamilyDiversityReport(registry.shapes)],
    ["ship", () => renderShipReport(registry.shapes, registry, picEvidence)],
    [
      "budget",
      () =>
        renderBudgetReport(
          {
            totalUsd: 100_000,
            labourRateUsdPerHour: 120,
            hoursPerFamily: 45,
            hoursPerScreenedCandidate: 3,
            cycleHitRate: 0.1,
            matricesPerFamily: 3,
            usdPerMatrix: 48.66,
            retryRate: 0.15,
            instancesPerFamily: 24,
            axesPerFamily: 3,
            postBuildKillRate: 0.5,
            evolutionCyclesPerSurvivor: 2,
            descendantReuse: 0.35,
          },
          1000,
        ),
    ],
  ];

  for (const [name, render] of cases) {
    it(`${name} report is byte-identical across runs`, () => {
      expect(render()).toBe(render());
    });
  }

  it("checked-in reports match a fresh render", () => {
    const pairs: readonly (readonly [string, string])[] = [
      ["reports/mechanism-registry.md", renderMechanismReport(registry, cov)],
      ["reports/mutant-bank.md", renderMutantReport(registry, cov)],
      ["reports/candidate-ledger.md", renderLedgerReport(registry)],
      ["reports/family-diversity.md", renderFamilyDiversityReport(registry.shapes)],
      ["reports/ship-recommendation.md", renderShipReport(registry.shapes, registry, picEvidence)],
    ];
    for (const [path, fresh] of pairs) {
      expect(readFileSync(`${ROOT}${path}`, "utf8"), `${path} is stale — run \`foundry all\``).toBe(fresh);
    }
  });
});
