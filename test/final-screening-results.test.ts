import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildFinalResults } from "../scripts/final-screening-results.mjs";

const read = (name: string) => JSON.parse(readFileSync(`reports/screening/evidence/${name}.json`, "utf8"));
const original = () => read("2026-09-09-final-results");
const ledger = () => read("2026-09-11-hardened-six-counting-ledger");
const continuation = () => read("2026-09-11-hardened-six-continuation");

describe("completed screening accounting", () => {
  it("keeps authorized capacity separate from actual attempts and counts all nine sets", () => {
    const result = buildFinalResults(original(), ledger(), continuation());
    expect(result.summary).toMatchObject({
      packages: 9,
      sixOfSix: 7,
      fiveOfSix: 2,
      countedTrials: 54,
      zeroRewards: 52,
    });
    expect(result.latestCampaign).toMatchObject({
      continuationAuthorizedSlots: 7,
      continuationAttempts: 6,
      totalAttempts: 11,
      unusedAuthorizedSlots: 1,
    });
  });
  it("rejects counting a void or duplicating a physical attempt", () => {
    const changed = ledger();
    const browser = changed.packages.find((p: { id: string }) => p.id === "browser-replay-repair");
    browser.history.find((r: { disposition: string }) => r.disposition === "grading-void").countedReward = 0;
    expect(() => buildFinalResults(original(), changed, continuation())).toThrow("excluded attempt");
    const duplicate = continuation();
    duplicate.packages["browser-replay-repair"].trials.push(
      duplicate.packages["browser-replay-repair"].trials[0],
    );
    expect(() => buildFinalResults(original(), ledger(), duplicate)).toThrow("duplicate trial");
  });
  it("rejects provider substitution even when a six-failure total is unchanged", () => {
    const changed = continuation();
    changed.packages["browser-replay-repair"].trials[0].target = "claude";
    expect(() => buildFinalResults(original(), ledger(), changed)).toThrow();
  });
});
