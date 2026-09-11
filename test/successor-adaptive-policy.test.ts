import { describe, expect, it } from "vitest";
import {
  applyTrialOutcome,
  campaignPlan,
  initialTaskState,
  nextTrial,
  providerForTrial,
} from "../scripts/successor-adaptive-policy.mjs";

describe("successor adaptive trial policy", () => {
  it("assigns three Claude trials followed by three Codex trials", () => {
    expect(Array.from({ length: 6 }, (_, index) => providerForTrial(index + 1))).toEqual([
      "claude",
      "claude",
      "claude",
      "codex",
      "codex",
      "codex",
    ]);
    expect(campaignPlan()).toMatchObject({
      initialCountedTrialsPerTask: 5,
      maxCountedTrialsPerTask: 6,
      maxProviderCalls: 30,
      maxConcurrent: 6,
      automaticRetries: false,
    });
  });

  it.each([1, 2, 3, 4, 5, 6])("stops a task when trial %i passes", (passingTrial) => {
    let state = initialTaskState("task");
    for (let trial = 1; trial < passingTrial; trial++) state = applyTrialOutcome(state, "clean-fail");
    state = applyTrialOutcome(state, "pass");
    expect(state.stopReason).toBe("solver-pass");
    expect(state.counted).toBe(passingTrial);
    expect(nextTrial(state)).toBeNull();
  });

  it("continues clean failures through trial six and then stops", () => {
    let state = initialTaskState("task");
    for (let trial = 1; trial <= 6; trial++) {
      expect(nextTrial(state)).toEqual({ trial, provider: trial <= 3 ? "claude" : "codex" });
      state = applyTrialOutcome(state, "clean-fail");
    }
    expect(state).toMatchObject({
      counted: 6,
      cleanFailures: 6,
      providers: { claude: 3, codex: 3 },
      stopReason: "six-clean-failures",
    });
    expect(nextTrial(state)).toBeNull();
  });

  it("stops without counting or retrying infrastructure and unresolved grading", () => {
    const state = applyTrialOutcome(initialTaskState("task"), "unscored");
    expect(state).toMatchObject({
      counted: 0,
      cleanFailures: 0,
      stopReason: "infrastructure-or-unresolved-grading",
    });
    expect(nextTrial(state)).toBeNull();
  });
});
