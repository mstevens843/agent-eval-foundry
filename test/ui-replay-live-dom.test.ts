// The descendant UI family, and the one property it was built to have.
//
// The parent `ui-action-record-replay` has five counted trials across four subjects and two labs
// whose failure sets form a total order: 33 ⊂ 46 ⊂ 62 ⊂ 90. One axis, four sensitivities, and no
// additional subject can change that. The cause is structural — every scenario in the parent rewards
// the same disposition, so a stricter replayer dominates a looser one everywhere and the catch sets
// are FORCED to nest.
//
// This family exists to break that, and the test that matters is the last one in this file: the two
// opposed strategies must produce INCOMPARABLE catch sets. If they nest, the family has reproduced
// its parent's defect in a bigger harness and the extra realism has bought nothing measurable.

import { describe, expect, it } from "vitest";
import { measure } from "../src/axis-meter.js";
import {
  ANCHOR_LOYAL_SUBJECTS,
  BASELINES,
  INTENDED_CHECK,
  MUTANTS,
  POLE_SUBJECTS,
} from "../src/families/ui-replay-live-dom/mutants.js";
import {
  ALL_SUBJECTS,
  catchSet,
  referenceFailures,
  relate,
  runFamily,
  toMatrix,
} from "../src/families/ui-replay-live-dom/runner.js";
import { SPACE, enumerateSpace, selectMeasuredSet } from "../src/families/ui-replay-live-dom/scenarios.js";
import { CHECKS } from "../src/families/ui-replay-live-dom/verify.js";

const run = runFamily();
const matrix = toMatrix(run);

describe("ui-replay-live-dom — the family is solvable and its verifier discriminates", () => {
  it("the reference passes every measured scenario", () => {
    // Declared solvability is not solvability. A family whose reference fails is measuring its own
    // bugs, and every number after that is noise.
    expect(referenceFailures(run)).toHaveLength(0);
  });

  it("samples the declared space and keeps every declared knob value", () => {
    const declared = enumerateSpace();
    const measured = selectMeasuredSet(declared);
    expect(measured.length).toBeLessThan(declared.length);
    expect(measured.length).toBeGreaterThanOrEqual(declared.length / 4);
    // The frozen-knob failure: a stride sample aligned with the innermost knob froze `replayCount`
    // at 1 in an earlier family and made its idempotency mutant look useless. `assertKnobCoverage`
    // inside `generateScenarios` is what catches it; this asserts the property it protects.
    for (const [knob, values] of Object.entries(SPACE)) {
      const seen = new Set(measured.map((p) => String((p as unknown as Record<string, unknown>)[knob])));
      for (const v of values as readonly unknown[]) expect(seen).toContain(String(v));
    }
  });

  it("catches every mutant, and catches it by the check it was written to trip", () => {
    for (const mutant of MUTANTS) {
      const intended = INTENDED_CHECK[mutant.id];
      expect(intended, `${mutant.id} declares no intended check`).toBeDefined();
      const cells = run.cells.filter((c) => c.subjectId === mutant.id && c.failures.length > 0);
      expect(cells.length, `${mutant.id} was never caught`).toBeGreaterThan(0);
      // Catching a mutant by some unrelated assertion is luck, not coverage, and it breaks silently
      // the moment the unrelated assertion changes.
      const byIntended = cells.filter((c) => c.failures.some((f) => f.check === intended));
      expect(byIntended.length, `${mutant.id} is caught, but never by \`${intended}\``).toBeGreaterThan(0);
    }
  });

  it("blocks both baselines", () => {
    // The classic way a safety suite measures nothing: the implementation that refuses everything
    // tops the leaderboard.
    for (const id of BASELINES) {
      expect(catchSet(run, id).size, `${id} was not blocked`).toBeGreaterThan(0);
    }
  });

  it("every declared check is exercised by something", () => {
    const fired = new Set(run.cells.flatMap((c) => c.failures.map((f) => f.check)));
    const never = CHECKS.filter((c) => !fired.has(c));
    expect(never, `checks nothing ever trips: ${never.join(", ")}`).toEqual([]);
  });

  it("no instance separates nothing", () => {
    // A scenario failed by nobody is a scenario the bank cannot use. Seven of the source project's
    // twenty-four were in that state and it was invisible until measured.
    expect(measure(matrix, { nullTrials: 3 }).blindInstances).toHaveLength(0);
  });
});

describe("ui-replay-live-dom — the property the family exists for", () => {
  // THE TEST THAT MATTERS.
  //
  // The parent family produced one chain. The live-DOM descendant now has three address-loyal
  // strategies that are right on different conflict categories and wrong on the others. Pairwise
  // private witnesses are the measured proof; inspection of the scenario design is not enough.
  it("the three anchor-loyal strategies produce pairwise INCOMPARABLE catch sets", () => {
    for (let i = 0; i < ANCHOR_LOYAL_SUBJECTS.length; i += 1) {
      for (let j = i + 1; j < ANCHOR_LOYAL_SUBJECTS.length; j += 1) {
        const aId = ANCHOR_LOYAL_SUBJECTS[i] ?? "";
        const bId = ANCHOR_LOYAL_SUBJECTS[j] ?? "";
        const a = catchSet(run, aId);
        const b = catchSet(run, bId);

        expect(a.size, `${aId} fails nothing`).toBeGreaterThan(0);
        expect(b.size, `${bId} fails nothing`).toBeGreaterThan(0);

        const rel = relate(a, b, aId, bId);
        expect(
          rel.relation,
          `${aId} and ${bId} are ${rel.relation}; a categorical anchor axis needs private witnesses in both directions, not a stricter/looser chain`,
        ).toBe("incomparable");
        const conflictWitness = /-(testid_wins|semantic_wins|path_wins)-/;
        const aOnlyConflict = [...a].find((id) => !b.has(id) && conflictWitness.test(id));
        const bOnlyConflict = [...b].find((id) => !a.has(id) && conflictWitness.test(id));
        expect(aOnlyConflict, `${aId} has no categorical private witness against ${bId}`).toBeDefined();
        expect(bOnlyConflict, `${bId} has no categorical private witness against ${aId}`).toBeDefined();
      }
    }
  });

  it("the bank measures more than one axis", () => {
    const report = measure(matrix, { nullTrials: 3 });
    expect(report.independentAxes).toBeGreaterThan(1);
    // And well below the number of distinct catch sets, which is what says the meter is collapsing
    // chains rather than counting rows.
    expect(report.independentAxes).toBeLessThan(report.distinctMeasurements);
  });

  it("model-in-the-loop is measured, not assumed", () => {
    // `askModel` exists on the facade and works. A family that omitted it would be running on an
    // honour system; one that ships it can grade the rule.
    const modelUser = MUTANTS.find((m) => m.id === "model-in-the-loop");
    expect(modelUser).toBeDefined();
    const caught = run.cells.filter(
      (c) => c.subjectId === "model-in-the-loop" && c.failures.some((f) => f.check === "no_model_in_loop"),
    );
    expect(caught.length).toBeGreaterThan(0);
  });

  it("the two poles are graded alongside the bank rather than asserted about", () => {
    const ids = ALL_SUBJECTS.map((s) => s.id);
    for (const pole of POLE_SUBJECTS) expect(ids).toContain(pole.id);
  });
});
