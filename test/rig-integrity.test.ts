// The rig-integrity gate, tested against the actual Phase 9 near-miss.
//
// The first test is the one that matters: it replays the exact failure -- a reference engine reported
// as failing all 18 instances because the ground truth was attached under the wrong key -- and
// asserts the gate voids the run. That failure reached a report draft before disbelief caught it.

import { describe, expect, it } from "vitest";
import {
  RigInputError,
  controlsHold,
  isDegenerate,
  requireShape,
  rigIntegrity,
} from "../src/screens/rig-integrity.js";

describe("the Phase 9 near-miss, replayed", () => {
  it("voids the run when the known-good subject is reported as failing", () => {
    // Verbatim shape of what happened: 18 instances, reference reported failing every one because
    // every tool-dependent check read {} and scored it as a failure.
    const cells = Array.from({ length: 18 }, () => ["expected_executions"]);
    const v = rigIntegrity(
      "fatality",
      [{ id: "reference", expect: "pass", observedFailures: ["expected_executions"] }],
      cells,
    );
    expect(v.usable).toBe(false);
    expect(v.brokenControls[0]).toContain("reference");
    expect(v.reasons.join(" ")).toContain("control inverted");
  });

  it("permits the real all-fail result, because the controls held in the same invocation", () => {
    // Phase 9's SOUND result: the narrow adversary fails all 18 and the reference passes all 18.
    // Same degenerate shape as the fiction above; the controls are what separate them.
    const cells = Array.from({ length: 18 }, () => ["exactly_once"]);
    const v = rigIntegrity(
      "fatality",
      [
        { id: "reference", expect: "pass", observedFailures: [] },
        { id: "narrow-recompute", expect: "fail", observedFailures: ["exactly_once"] },
      ],
      cells,
    );
    expect(v.usable).toBe(true);
    expect(v.degenerate).toBe(true);
    expect(v.reasons.join(" ")).toContain("controls ran in this invocation and held");
  });

  it("voids a degenerate result that ran no controls at all", () => {
    const v = rigIntegrity("x", [], [[], [], []]);
    expect(v.usable).toBe(false);
    expect(v.reasons.join(" ")).toContain("nothing establishes that this rig can tell");
  });

  it("catches a known-bad that was reported as passing", () => {
    expect(controlsHold([{ id: "mutant", expect: "fail", observedFailures: [] }])).toHaveLength(1);
  });
});

describe("shape assertion -- an empty input is not a failing input", () => {
  it("raises on the empty dict that caused the defect, rather than scoring it", () => {
    // `_tool()` returned `result.get("_tool") or {}`. This is that {} arriving at a check.
    expect(() => requireShape({}, "result._tool", ["calls"])).toThrow(RigInputError);
    expect(() => requireShape({}, "result._tool", ["calls"])).toThrow(/Phase 9 defect verbatim/);
  });

  it("raises on absent and on the wrong shape", () => {
    expect(() => requireShape(undefined, "r._tool", [])).toThrow(/absent/);
    expect(() => requireShape([], "r._tool", [])).toThrow(/an array/);
    expect(() => requireShape({ calls: [] }, "r._tool", ["calls", "attempts"])).toThrow(/missing attempts/);
  });

  it("passes a well-formed structure through", () => {
    const ok = requireShape({ calls: [1], attempts: {} }, "r._tool", ["calls", "attempts"]);
    expect(ok.calls).toEqual([1]);
  });
});

describe("degeneracy", () => {
  it("flags all-pass and all-fail, and not a discriminating result", () => {
    expect(isDegenerate([[], [], []])).toBe(true);
    expect(isDegenerate([["a"], ["a"]])).toBe(true);
    expect(isDegenerate([[], ["a"]])).toBe(false);
    // No cells at all is the most degenerate result there is.
    expect(isDegenerate([])).toBe(true);
  });
});
