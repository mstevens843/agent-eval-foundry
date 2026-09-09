import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCREENING_BATCHES, verifyPublication } from "../scripts/verify-publication.mjs";
import { PORTFOLIO_PACKAGES } from "../src/packages/portfolio.js";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const batches = SCREENING_BATCHES.map(([, file]) => `reports/screening/evidence/${file}.json`).filter(
  existsSync,
);
const hash = /^[a-f0-9]{64}$/;
function markdown(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? markdown(join(dir, entry.name))
      : entry.name.endsWith(".md")
        ? [join(dir, entry.name)]
        : [],
  );
}

describe("reviewable source and honest screening publication", () => {
  it("uses the same portable evidence and navigation gate as report verification", () => {
    expect(verifyPublication()).toMatchObject({
      screenedPackages: batches.length * 5,
      manifestListedFilesVerifiedAtPublication: batches
        .flatMap((path) => read(path).packages)
        .reduce((sum, r) => sum + r.verifiedFiles, 0),
      providerCallsMade: 0,
      successorPackages: 25,
      successorTrials: 46,
      successorCompletedTrials: 45,
      successorRecordedZeroRewards: 15,
      successorSolverPasses: 30,
      successorEffectiveZeroRewards: 17,
      successorEffectivePasses: 28,
      successorManifestListedFilesVerifiedAtPublication: 37847,
      finalSixAttemptsMade: 6,
      finalSixMeetsFiveOfSix: 1,
      finalSixCannotReachFiveOfSix: 4,
      finalSixUnresolvedInfrastructure: 0,
      regradedFalsePasses: 2,
      continuingPackagesAfterCoverageRepair: 5,
      finalPreparedPackages: 5,
      finalPreparedSlots: 11,
      trialFiveAttempts: 4,
      trialFiveZeroRewards: 1,
      successorInterruptedTrials: 1,
      trialTwoAttempts: 26,
      trialTwoScored: 25,
      trialTwoZeroRewards: 5,
      trialTwoSolverPasses: 20,
      trialThreeAttempts: 5,
      trialThreeZeroRewards: 3,
      packagesWithTwoConsecutiveZeroes: 3,
      trialFourAttempts: 5,
      trialFourZeroRewards: 4,
      packagesWithThreeConsecutiveZeroes: 3,
      packagesBelowFiveOfSixThreshold: 1,
      continuingPackages: 4,
      nextPreparedAttempts: 4,
    });
  });
  it("links all twenty-five actual package trees without counting calibration kernels", () => {
    expect(Object.keys(PORTFOLIO_PACKAGES)).toHaveLength(24);
    const status = readFileSync("docs/project-status.md", "utf8");
    for (const id of ["caa-revalidation-repair", ...Object.keys(PORTFOLIO_PACKAGES)]) {
      expect(existsSync(`tasks/${id}`)).toBe(true);
      expect(status).toContain(`../tasks/${id}/`);
    }
  });

  it("publishes complete distinct batches with raw evidence identities but no local machine paths", () => {
    const records = batches.flatMap((path) => read(path).packages);
    expect(records).toHaveLength(batches.length * 5);
    expect(new Set(records.map((record) => record.id)).size).toBe(batches.length * 5);
    expect(
      batches
        .slice(0, 2)
        .flatMap((path) => read(path).packages)
        .reduce((sum, r) => sum + r.verifiedFiles, 0),
    ).toBe(4057);
    for (const record of records) {
      for (const key of ["packageDigest", "profileDigest", "completionSha256", "resultSha256", "gradeSha256"])
        expect(record[key]).toMatch(hash);
      expect(record.verifiedFiles).toBeGreaterThan(0);
      expect(record.verifiedBytes).toBeGreaterThan(0);
      expect(record).not.toHaveProperty("directory");
    }
    for (const path of batches) {
      const text = readFileSync(path, "utf8");
      expect(text).not.toMatch(/\/Users\/|\.local\//);
      expect(read(path).limitations.length).toBeGreaterThan(0);
    }
  });

  it("does not convert checker-format failure or invalid captures into clean capability wins", () => {
    const first = read("reports/screening/evidence/2026-09-07-original-five.json");
    expect(first.excludedAttempts).toHaveLength(3);
    expect(first.setupIncident).toContain("accidental");
    expect(first.packages.every((r: { outcome: string }) => r.outcome === "semantic-pass")).toBe(true);
    const next = read("reports/screening/evidence/2026-09-08-next-five.json");
    expect(next.concurrencyRequestFulfilled).toBe(false);
    expect(next.packages.filter((r: { reward: number }) => r.reward === 0)).toHaveLength(2);
    const partial = next.packages.find((r: { id: string }) => r.id === "partial-release-repair");
    expect(partial.assessment).toBe("contract-grader-alignment-concern");
    expect(partial.service.failedScenarios).toBe(0);
    expect(partial.checker.correct).toBe(partial.checker.total);
    expect(partial.checker.namedRightCheck).toBe(0);
  });

  it("keeps public navigation portable instead of depending on ignored evidence paths", () => {
    const docs = [
      "README.md",
      "docs/project-status.md",
      "docs/artifact-lifecycle.md",
      "reports/PORTFOLIO-PUBLICATION.md",
      ...markdown("reports/screening"),
    ];
    for (const doc of docs) {
      const text = readFileSync(doc, "utf8");
      for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
        const target = match[1] ?? "";
        if (/^https?:|^#/.test(target)) continue;
        expect(target, `${doc}: private/nonportable link`).not.toMatch(/^\/|\.local\//);
        expect(existsSync(resolve(dirname(doc), target.split("#")[0] ?? "")), `${doc}: ${target}`).toBe(true);
      }
    }
  });

  it("preserves batch-four grading defects instead of counting its zeros as model failures", () => {
    const path = "reports/screening/evidence/2026-09-08-fourth-five.json";
    if (!existsSync(path)) return;
    const batch = read(path);
    expect(batch.packages.filter((r: { reward: number }) => r.reward === 0)).toHaveLength(3);
    for (const id of [
      "analytical-reconciliation-repair",
      "recurring-calendar-repair",
      "workflow-authority-repair",
    ]) {
      const record = batch.packages.find((r: { id: string }) => r.id === id);
      expect(record.reward).toBe(0);
      expect(record.service.failedScenarios).toBe(0);
      expect(record.checker.correct).toBe(record.checker.total);
      expect(record.checker.pass).toBe(false);
      expect(record.assessment).toMatch(/^contract-grader-alignment-/);
    }
  });
});
