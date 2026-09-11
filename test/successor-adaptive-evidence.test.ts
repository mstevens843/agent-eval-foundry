import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  type PreparedCampaign,
  inspectCampaign,
} from "../scripts/run-successor-adaptive-trials-reviewed.mjs";
import { campaignPlan } from "../scripts/successor-adaptive-policy.mjs";
import { type Event, executeCampaign } from "../scripts/successor-campaign-control.mjs";

const temporary: string[] = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

async function fixture() {
  const workspace = mkdtempSync(join(tmpdir(), "successor-evidence-"));
  temporary.push(workspace);
  const plan = campaignPlan();
  const preparation: PreparedCampaign = {
    packages: plan.tasks,
    slots: plan.tasks.flatMap(({ id }) =>
      plan.schedule.map(({ trial, provider }) => ({
        id,
        trial,
        target: provider,
        runRoot: `slots/${id}/${trial}`,
      })),
    ),
    maxConcurrent: 6,
    maxProviderCalls: 30,
    outputRoot: "campaign",
    runtime: { directory: "runtime" },
  };
  const write = (path: string, value: unknown) => {
    const destination = join(workspace, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, JSON.stringify(value));
  };
  write("runtime/dist/index.js", {});
  writeFileSync(join(workspace, "runtime/dist/index.js"), "export default {};\n");
  write("campaign/DISPATCH-CLAIM", {});
  const events: Event[] = [];
  const final = await executeCampaign(preparation, {
    launch: async (_task, slot) => {
      const prepared = preparation.slots.find((item) => item.id === slot.id && item.trial === slot.trial);
      assert(prepared);
      write(`${prepared.runRoot}/DISPATCH-CLAIM`, {});
      write(`${prepared.runRoot}/jobs/real-provider/records/${slot.id}-attempt-1/dispatch.started`, {});
    },
    score: (_task, slot) => ({ ...slot, countedReward: 1 }),
    save: (path, value) => write(`campaign/${path}`, value),
    emit: (event) => {
      events.push(event);
    },
  });
  write("campaign/FINAL.json", { ...final, providerCallsMade: 5 });
  events.push({ stage: "campaign-finished", attemptsLaunched: 5, providerCallsMade: 5, peakConcurrent: 5 });
  writeFileSync(
    join(workspace, "campaign/events.jsonl"),
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );
  const inspect = () =>
    inspectCampaign(preparation, {
      workspace,
      scoreEvidence: (_api, _prep, _task, slot) => ({ ...slot, countedReward: 1 }),
    });
  return { workspace, preparation, final, write, inspect };
}

describe("successor campaign evidence verification", () => {
  it("reports actual nonzero dispatch counts and verifies the complete persisted campaign", async () => {
    const { inspect } = await fixture();
    await expect(inspect()).resolves.toMatchObject({
      verified: true,
      dispatched: true,
      complete: true,
      status: "complete",
      providerCallsMade: 5,
      attemptsLaunched: 5,
      peakConcurrent: 5,
      finishedTasks: 5,
    });
  });

  it("rejects a FINAL file that falsely reports zero provider calls", async () => {
    const { inspect, write, final } = await fixture();
    write("campaign/FINAL.json", { ...final, providerCallsMade: 0 });
    await expect(inspect()).rejects.toThrow("providerCallsMade");
  });

  it("does not label a campaign complete when final publication was interrupted", async () => {
    const { workspace, inspect } = await fixture();
    rmSync(join(workspace, "campaign/FINAL.json"));
    const path = join(workspace, "campaign/events.jsonl");
    const lines = readFileSync(path, "utf8").trim().split("\n");
    writeFileSync(path, `${lines.slice(0, -1).join("\n")}\n`);
    await expect(inspect()).resolves.toMatchObject({
      verified: true,
      complete: false,
      status: "in-progress-or-interrupted",
      providerCallsMade: 5,
      finishedTasks: 5,
    });
  });

  it("rejects an orphan dispatch in a slot that should have stopped after trial one", async () => {
    const { preparation, write, inspect } = await fixture();
    const slot = preparation.slots.find((slot) => slot.trial === 2);
    assert(slot);
    write(`${slot.runRoot}/DISPATCH-CLAIM`, {});
    await expect(inspect()).rejects.toThrow("Orphan slot dispatch");
  });

  it("rejects a reward changed in stored adjudication", async () => {
    const { workspace, preparation, write, inspect } = await fixture();
    const task = preparation.packages[0];
    assert(task);
    const path = `campaign/adjudicated/${task.id}/trial-1.json`;
    write(path, { ...JSON.parse(readFileSync(join(workspace, path), "utf8")), countedReward: 0 });
    await expect(inspect()).rejects.toThrow("Adjudication disagrees");
  });

  it("rejects missing per-package outcomes even if FINAL exists", async () => {
    const { workspace, preparation, inspect } = await fixture();
    rmSync(join(workspace, `campaign/outcomes/${preparation.packages[0]?.id}.json`));
    await expect(inspect()).rejects.toThrow();
  });
});
