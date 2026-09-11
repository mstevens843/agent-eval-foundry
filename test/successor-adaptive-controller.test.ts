import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import { campaignPlan } from "../scripts/successor-adaptive-policy.mjs";
import {
  type Campaign,
  type Event,
  executeCampaign,
  replayCampaignEvents,
} from "../scripts/successor-campaign-control.mjs";

const plan = campaignPlan();
const campaign: Campaign = {
  packages: plan.tasks,
  slots: plan.tasks.flatMap(({ id }) =>
    plan.schedule.map(({ trial, provider }) => ({ id, trial, target: provider })),
  ),
  maxConcurrent: plan.maxConcurrent,
  maxProviderCalls: plan.maxProviderCalls,
};

async function simulate(
  stops: number[],
  incident?: { task: number; trial: number; kind: "launch" | "grade" },
) {
  const events: Event[] = [];
  const writes = new Map<string, unknown>();
  const live = new Set<string>();
  let peak = 0;
  const launches: string[] = [];
  const final = await executeCampaign(campaign, {
    emit: (event) => events.push(structuredClone(event)),
    save: (path, value) => {
      writes.set(path, structuredClone(value));
    },
    launch: async (task, slot) => {
      expect(live.has(task.id)).toBe(false);
      live.add(task.id);
      peak = Math.max(peak, live.size);
      launches.push(`${task.id}/${slot.trial}/${slot.target}`);
      await new Promise((resolve) => setTimeout(resolve, slot.trial % 3));
      live.delete(task.id);
      if (
        incident?.kind === "launch" &&
        campaign.packages[incident.task]?.id === task.id &&
        incident.trial === slot.trial
      )
        throw Error("infrastructure");
    },
    score: (task, slot) => {
      if (
        incident?.kind === "grade" &&
        campaign.packages[incident.task]?.id === task.id &&
        incident.trial === slot.trial
      )
        throw Error("unresolved grading");
      return {
        ...slot,
        countedReward: slot.trial === stops[campaign.packages.findIndex(({ id }) => id === task.id)] ? 1 : 0,
      };
    },
  });
  events.push({
    stage: "campaign-finished",
    attemptsLaunched: final.attemptsLaunched,
    peakConcurrent: final.peakConcurrent,
  });
  return { final, events, writes, launches, peak, replay: replayCampaignEvents(campaign, events) };
}

describe("reviewed successor campaign controller", () => {
  it("starts all five loops concurrently, advances independently, and stops after each pass", async () => {
    const result = await simulate([1, 3, 5, 6, 0]);
    expect(result.peak).toBe(5);
    expect(result.final.peakConcurrent).toBe(5);
    expect(result.final.attemptsLaunched).toBe(21);
    expect(result.final.outcomes.map(({ counted }) => counted)).toEqual([1, 3, 5, 6, 6]);
    expect(result.final.outcomes.map(({ stopReason }) => stopReason)).toEqual([
      "solver-pass",
      "solver-pass",
      "solver-pass",
      "solver-pass",
      "six-clean-failures",
    ]);
    expect(result.final.outcomes[2]?.providers).toEqual({ claude: 3, codex: 2 });
    expect(result.final.outcomes[4]?.providers).toEqual({ claude: 3, codex: 3 });
    expect(result.replay).toMatchObject({ attemptsLaunched: 21, finished: 5, active: 0, ended: true });
  });

  it("runs exactly 30 attempts for five packages with six clean failures", async () => {
    const result = await simulate([0, 0, 0, 0, 0]);
    expect(result.launches).toHaveLength(30);
    expect(new Set(result.launches).size).toBe(30);
    for (const outcome of result.final.outcomes)
      expect(outcome).toMatchObject({
        counted: 6,
        cleanFailures: 6,
        providers: { claude: 3, codex: 3 },
        stopReason: "six-clean-failures",
      });
  });

  it.each([1, 2, 3, 4, 5, 6])("stops only the affected package on an unscored trial %i", async (trial) => {
    for (const kind of ["launch", "grade"] as const) {
      const result = await simulate([0, 1, 1, 1, 1], { task: 0, trial, kind });
      expect(result.final.outcomes[0]).toMatchObject({
        counted: trial - 1,
        cleanFailures: trial - 1,
        stopReason: "infrastructure-or-unresolved-grading",
      });
      expect(result.final.outcomes.slice(1).every(({ stopReason }) => stopReason === "solver-pass")).toBe(
        true,
      );
      expect(result.final.attemptsLaunched).toBe(trial + 4);
      expect(result.writes.has(`incidents/${campaign.packages[0]?.id}/trial-${trial}.json`)).toBe(true);
    }
  });

  it("waits for other jobs and never launches after a pass when saving its evidence fails", async () => {
    const launched: string[] = [];
    const completed: string[] = [];
    await expect(
      executeCampaign(campaign, {
        emit: () => {},
        launch: async (task) => {
          launched.push(task.id);
          await new Promise((resolve) => setTimeout(resolve, task.id === campaign.packages[0]?.id ? 0 : 10));
          completed.push(task.id);
        },
        score: (_task, slot) => ({ ...slot, countedReward: 1 }),
        save: (path) => {
          if (path.startsWith(`adjudicated/${campaign.packages[0]?.id}/`)) throw Error("disk full");
        },
      }),
    ).rejects.toThrow("Campaign incomplete");
    expect(launched).toHaveLength(5);
    expect(completed).toHaveLength(5);
  });

  it("treats a non-binary or incomplete grade as an incident", async () => {
    const final = await executeCampaign(campaign, {
      emit: () => {},
      save: () => {},
      launch: async () => {},
      score: (_task, slot) => ({ ...slot, countedReward: Number.NaN }),
    });
    expect(final.attemptsLaunched).toBe(5);
    expect(
      final.outcomes.every(
        ({ counted, stopReason }) => counted === 0 && stopReason === "infrastructure-or-unresolved-grading",
      ),
    ).toBe(true);
  });

  it.each([
    "wrong-provider",
    "skipped-trial",
    "concurrent-duplicate",
    "launch-after-pass",
    "fake-reward",
    "fake-count",
    "premature-completion",
    "missing-launch",
  ])("rejects an invalid campaign ledger: %s", async (mutation) => {
    const { events } = await simulate([1, 1, 1, 1, 1]);
    const changed = structuredClone(events);
    const launch = changed.findIndex((event) => event.stage === "launch");
    const result = changed.findIndex((event) => event.stage === "trial-result");
    const launchEvent = changed[launch];
    const resultEvent = changed[result];
    const finishEvent = changed.at(-1);
    assert(launchEvent && resultEvent && finishEvent);
    if (mutation === "wrong-provider") launchEvent.target = "codex";
    if (mutation === "skipped-trial") launchEvent.trial = 2;
    if (mutation === "concurrent-duplicate") changed.splice(launch + 1, 0, { ...launchEvent });
    if (mutation === "launch-after-pass")
      changed.splice(result + 1, 0, {
        stage: "launch",
        id: resultEvent.id,
        trial: 2,
        target: "claude",
        attemptsLaunched: 6,
        inFlight: 5,
      });
    if (mutation === "fake-reward") resultEvent.countedReward = null;
    if (mutation === "fake-count") resultEvent.counted = 6;
    if (mutation === "premature-completion") changed.splice(1, 0, finishEvent);
    if (mutation === "missing-launch") changed.splice(launch, 1);
    expect(() => replayCampaignEvents(campaign, changed)).toThrow();
  });

  it("retains nonzero attempt counts for interrupted ledgers and never calls them complete", () => {
    const first = campaign.slots[0];
    assert(first);
    const state = replayCampaignEvents(campaign, [
      { stage: "campaign-started", tasks: 5 },
      { stage: "launch", ...first, attemptsLaunched: 1, inFlight: 1 },
    ]);
    expect(state).toMatchObject({ attemptsLaunched: 1, active: 1, finished: 0, ended: false });
  });
});
