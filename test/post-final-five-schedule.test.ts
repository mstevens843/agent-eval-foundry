import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { makePostFinalPlan } from "../scripts/run-post-final-five.mjs";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const audit = () => read("reports/screening/evidence/2026-09-09-post-final-pass-audit.json");
const original = () => read("reports/screening/evidence/2026-09-09-final-six-preparation.json");

it("schedules only the five unrun slots, including both independent snapshot attempts", () => {
  const plan = makePostFinalPlan(audit(), original());
  expect(plan.slots.map(({ id, trial, target }) => [id, trial, target])).toEqual([
    ["variant-cache-repair", 7, "codex"],
    ["issued-report-repair", 7, "codex"],
    ["temporal-capacity-repair", 7, "codex"],
    ["snapshot-recovery-repair", 6, "claude"],
    ["snapshot-recovery-repair", 7, "claude"],
  ]);
  expect(plan.maxConcurrent).toBe(6);
  expect(plan.maxProviderCalls).toBe(5);
  expect(plan.plannedConcurrentAttempts).toBe(5);
  expect(plan.allSlotsStartTogether).toBe(true);
  expect(plan.snapshotTrialsIndependentAndUnconditional).toBe(true);
  expect(plan.automaticRetries).toBe(false);
});

it("uses corrected histories rather than the recorded passes that caused early stopping", () => {
  const plan = makePostFinalPlan(audit(), original());
  expect(plan.packages.map(({ failures, scored }) => [failures, scored])).toEqual([
    [4, 5],
    [5, 5],
    [5, 5],
    [3, 4],
  ]);
  for (const pkg of plan.packages) {
    const counts = { ...pkg.attemptsByProvider };
    for (const slot of plan.slots.filter((slot) => slot.id === pkg.id)) counts[slot.target]++;
    expect(counts).toEqual({ claude: 3, codex: 3 });
  }
});

it("rejects changing provider balance or assigning a nonexistent frozen trial", () => {
  const changed = audit();
  changed.classifications.find(
    (p: { id: string }) => p.id === "issued-report-repair",
  ).attemptsByProvider.codex = 1;
  expect(() => makePostFinalPlan(changed, original())).toThrow();
  const missing = original();
  missing.packages.find((p: { id: string }) => p.id === "snapshot-recovery-repair").slots.pop();
  expect(() => makePostFinalPlan(audit(), missing)).toThrow("No frozen controller");
});
