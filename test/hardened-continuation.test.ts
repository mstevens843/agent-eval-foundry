import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyOutcome,
  classify,
  initialState,
  makeContinuationPlan,
  nextSlot,
} from "../scripts/hardened-continuation-policy.mjs";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
function required<T>(value: T | undefined): T {
  if (value === undefined) throw Error("Missing test fixture element");
  return value;
}
const plan = () =>
  makeContinuationPlan(
    read("reports/screening/evidence/2026-09-11-hardened-six-counting-ledger.json"),
    read("reports/screening/evidence/2026-09-11-hardened-next-five-trial-five-preparation.json"),
  );

describe("conditional continuation after already-running Round 5", () => {
  it("adopts the five live attempts and permits only seven further calls", () => {
    const p = plan();
    expect(p.maxNewProviderCalls).toBe(7);
    expect(p.maxConcurrent).toBe(5);
    expect(p.packages.flatMap((x) => x.slots).filter((s) => s.adoptExisting)).toHaveLength(5);
    expect(p.packages.flatMap((x) => x.slots).filter((s) => !s.adoptExisting)).toHaveLength(7);
    expect(p.packages.map((x) => [x.failures, x.scored])).toEqual([
      [3, 4],
      [2, 2],
      [4, 4],
      [4, 4],
      [4, 4],
    ]);
  });

  it("never reruns the adopted round and stops every task at six balanced failures", () => {
    for (const p of plan().packages) {
      let state = initialState(p);
      while (nextSlot(p, state)) {
        const slot = nextSlot(p, state);
        if (!slot) throw Error("missing authorized slot");
        state = applyOutcome(p, state, slot, 0);
      }
      expect(state.scored).toBe(6);
      expect(state.providers).toEqual({ codex: 3, claude: 3 });
      expect(state.stopReason).toBe("six-counted");
      expect(classify(state).meetsFiveOfSix).toBe(true);
      expect(state.failures).toBe(p.id === "route-policy-repair" ? 5 : 6);
      expect(() => applyOutcome(p, state, required(p.slots[0]), 0)).toThrow();
    }
  });

  it("stops immediately on a pass at every possible slot, including adopted Round 5", () => {
    for (const p of plan().packages) {
      for (let stopAt = 0; stopAt < p.slots.length; stopAt++) {
        let state = initialState(p);
        for (let i = 0; i <= stopAt; i++) {
          state = applyOutcome(p, state, required(p.slots[i]), i === stopAt ? 1 : 0);
        }
        expect(nextSlot(p, state)).toBeNull();
        expect(state.scored).toBe(p.scored + stopAt + 1);
        expect(state.failures).toBe(p.failures + stopAt);
      }
    }
  });

  it("does not mislabel a user-requested stop as mathematically out of contention", () => {
    const p = plan().packages.find((x) => x.id === "recurring-calendar-repair");
    if (!p) throw Error("calendar missing");
    const stopped = classify(applyOutcome(p, initialState(p), required(p.slots[0]), 1));
    expect(stopped).toMatchObject({ failures: 4, scored: 5, stopReason: "solver-pass" });
    expect(stopped.canStillReachFive).toBe(true);
    expect(stopped.meetsFiveOfSix).toBe(false);
  });

  it("excludes infrastructure or unresolved grading without retrying or consuming a counted slot", () => {
    for (const p of plan().packages) {
      const initial = initialState(p);
      const stopped = applyOutcome(p, initial, required(p.slots[0]), null);
      expect(stopped.scored).toBe(initial.scored);
      expect(stopped.providers).toEqual(initial.providers);
      expect(nextSlot(p, stopped)).toBeNull();
      expect(initial.cursor).toBe(0);
    }
  });

  it("fills Browser's missing Claude slot after its three new counted Codex slots", () => {
    const p = plan().packages.find((x) => x.id === "browser-replay-repair");
    if (!p) throw Error("browser missing");
    expect(p.slots.map((s) => [s.historicalTrial, s.target, s.adoptExisting])).toEqual([
      [7, "codex", true],
      [8, "codex", false],
      [9, "codex", false],
      [10, "claude", false],
    ]);
  });

  it("rejects provider substitutions and duplicate results", () => {
    const p = required(plan().packages[0]);
    const initial = initialState(p);
    const first = required(p.slots[0]);
    expect(() => applyOutcome(p, initial, { ...first, target: "claude" }, 0)).toThrow();
    const next = applyOutcome(p, initial, first, 0);
    expect(() => applyOutcome(p, next, first, 0)).toThrow();
  });
});
