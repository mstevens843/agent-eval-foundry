import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSuccessorResults } from "../scripts/successor-screening-results.mjs";

const read = (name: string) => JSON.parse(readFileSync(`reports/screening/evidence/${name}.json`, "utf8"));
const previous = () => read("2026-09-11-final-results");
const campaign = () => read("2026-09-11-successor-results");

describe("successor milestone accounting", () => {
  it("adds three balanced sets while excluding nulls and the solved package", () => {
    const result = buildSuccessorResults(previous(), campaign());
    expect(result.summary).toMatchObject({
      packages: 12,
      sixOfSix: 10,
      fiveOfSix: 2,
      countedTrials: 72,
      zeroRewards: 70,
      oneRewards: 2,
      codexTrials: 36,
      claudeTrials: 36,
    });
    expect(result.campaignSummary).toMatchObject({
      physicalProviderAttempts: 28,
      countedOutcomes: 25,
      nullAttempts: 3,
      recoveredGradingIncidents: 1,
    });
    expect(result.otherSuccessorPackages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "ticket-consolidation-repair",
          scored: 3,
          failures: 3,
          remainingCountedTrials: 3,
        }),
        expect.objectContaining({
          id: "partial-release-repair",
          stopReason: "solver-pass",
          qualifies: false,
        }),
      ]),
    );
  });

  it("rejects converting a false pass into either a counted failure or pass", () => {
    for (const reward of [0, 1]) {
      const changed = campaign();
      changed.packages.find(
        (p: { id: string }) => p.id === "ticket-consolidation-repair",
      ).attempts[3].countedReward = reward;
      expect(() => buildSuccessorResults(previous(), changed)).toThrow("false pass must remain null");
    }
  });

  it("rejects a recovery bound to another completion or counted as a new attempt", () => {
    const changed = campaign();
    const recovered = changed.packages.find((p: { id: string }) => p.id === "verified-installation-repair")
      .attempts[1];
    recovered.recovery.originalCompletionDigest = "0".repeat(64);
    expect(() => buildSuccessorResults(previous(), changed)).toThrow("regrade binding");
    recovered.recovery.originalCompletionDigest = recovered.completionSha256;
    recovered.recovery.newAgentAttempts = 1;
    expect(() => buildSuccessorResults(previous(), changed)).toThrow("regrade is not a new attempt");
  });

  it("rejects duplicate attempts, wrong providers and mixed new qualifying versions", () => {
    const duplicate = campaign();
    duplicate.packages[0].attempts.push(duplicate.packages[0].attempts[0]);
    expect(() => buildSuccessorResults(previous(), duplicate)).toThrow("duplicate physical attempt");
    const wrongProvider = campaign();
    wrongProvider.packages[0].attempts[0].provider = "codex";
    expect(() => buildSuccessorResults(previous(), wrongProvider)).toThrow("provider substitution");
    const wrongPackage = campaign();
    wrongPackage.packages[0].attempts[0].packageDigest = "0".repeat(64);
    expect(() => buildSuccessorResults(previous(), wrongPackage)).toThrow("mixes package versions");
  });

  it("requires explicit confirmation authority for later trials after a pass", () => {
    const changed = campaign();
    const partial = changed.packages.find((p: { id: string }) => p.id === "partial-release-repair");
    partial.attempts[2].authorizedConfirmation = false;
    expect(() => buildSuccessorResults(previous(), changed)).toThrow("unapproved attempt after a pass");
  });
});
