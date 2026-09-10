import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { makeReplacementPlan } from "../scripts/run-three-replacements.mjs";
interface Disposition {
  packages: Array<{ id: string; voidAttempts: Array<{ countedReward: number | null }> }>;
  replacementSlots: Array<{ id: string; trial: number; replacesTrial: number; target: string }>;
}
const disposition = (): Disposition =>
  JSON.parse(
    readFileSync("reports/screening/evidence/2026-09-09-three-replacement-disposition.json", "utf8"),
  );
describe("explicit grading-void replacements", () => {
  it("replaces the original providers in fresh slots without rerunning completed packages", () => {
    const p = makeReplacementPlan(disposition());
    expect(p.maxConcurrent).toBe(6);
    expect(p.maxProviderCalls).toBe(3);
    expect(p.allSlotsStartTogether).toBe(true);
    expect(p.slots.map((s) => [s.id, s.trial, s.replacesTrial, s.target])).toEqual([
      ["variant-cache-repair", 8, 6, "codex"],
      ["variant-cache-repair", 9, 7, "codex"],
      ["snapshot-recovery-repair", 8, 4, "codex"],
    ]);
    expect(p.packages.map((p) => [p.failures, p.scored])).toEqual([
      [4, 4],
      [4, 5],
    ]);
  });
  it("rejects provider substitution and duplicate replacement slots", () => {
    const a = disposition();
    const snapshotSlot = a.replacementSlots[2];
    if (!snapshotSlot) throw new Error("missing snapshot replacement slot");
    snapshotSlot.target = "claude";
    expect(() => makeReplacementPlan(a)).toThrow();
    const b = disposition();
    const firstSlot = b.replacementSlots[0];
    if (!firstSlot) throw new Error("missing first replacement slot");
    b.replacementSlots[1] = { ...firstSlot };
    expect(() => makeReplacementPlan(b)).toThrow();
  });
  it("does not allow a void to remain counted or replace a retained pass", () => {
    const a = disposition();
    const snapshotVoid = a.packages.find((p) => p.id === "snapshot-recovery-repair")?.voidAttempts[0];
    if (!snapshotVoid) throw new Error("missing snapshot grading void");
    snapshotVoid.countedReward = 0;
    expect(() => makeReplacementPlan(a)).toThrow();
    const b = disposition();
    const snapshotSlot = b.replacementSlots[2];
    if (!snapshotSlot) throw new Error("missing snapshot replacement slot");
    snapshotSlot.replacesTrial = 7;
    expect(() => makeReplacementPlan(b)).toThrow();
  });
});
