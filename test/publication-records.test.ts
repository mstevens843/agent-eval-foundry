import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyPublication } from "../scripts/verify-publication.mjs";
import { PORTFOLIO_PACKAGES } from "../src/packages/portfolio.js";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const batches = [
  "reports/screening/evidence/2026-09-07-original-five.json",
  "reports/screening/evidence/2026-09-08-next-five.json",
] as const;
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
      screenedPackages: 10,
      manifestListedFilesVerifiedAtPublication: 4057,
      providerCallsMade: 0,
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

  it("publishes ten distinct final attempts with raw evidence identities but no local machine paths", () => {
    const records = batches.flatMap((path) => read(path).packages);
    expect(records).toHaveLength(10);
    expect(new Set(records.map((record) => record.id)).size).toBe(10);
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
    const first = read(batches[0]);
    expect(first.excludedAttempts).toHaveLength(3);
    expect(first.setupIncident).toContain("accidental");
    expect(first.packages.every((r: { outcome: string }) => r.outcome === "semantic-pass")).toBe(true);
    const next = read(batches[1]);
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
});
