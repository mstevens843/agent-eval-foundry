import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";
import { portfolioDirection } from "../src/learning/cases.js";
import { PORTFOLIO_PACKAGES } from "../src/packages/portfolio.js";
import { sha256 } from "../src/packages/record.js";
const ids = [
  "incremental-build-repair",
  "event-window-repair",
  "staged-allocation-repair",
  "diagnostic-transport-repair",
  "issued-report-repair",
] as const;
const scratch = mkdtempSync(join(tmpdir(), "fifth-portfolio-regression-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
it("registers twenty-four portfolio routes plus native CAA", () => {
  expect(Object.keys(PORTFOLIO_PACKAGES)).toHaveLength(24);
  for (const id of ids) {
    expect(portfolioDirection(id)?.family).toBe(PORTFOLIO_PACKAGES[id]);
    expect(readFileSync(`tasks/${id}/public/SEMANTICS.md`, "utf8")).toContain("Node 24");
  }
});
it("preserves frozen scenario bytes and declares the post-selection validation controls", () => {
  const ledger = JSON.parse(readFileSync("data/fifth-portfolio-selection-ledger.json", "utf8")) as {
    generators: { id: string; generatorSha256: string }[];
    validationControls: unknown[];
  };
  expect(ledger.generators).toHaveLength(5);
  expect(ledger.validationControls).toHaveLength(5);
  for (const g of ledger.generators)
    expect(sha256(readFileSync(`tasks/${g.id}/private/scenarios.mjs`))).toBe(g.generatorSha256);
});
it("runs full author-side control activation with clean non-activation witnesses", () => {
  const output = join(scratch, "controls");
  const r = spawnSync(process.execPath, ["scripts/verify-fifth-author.mjs", output], {
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 16 * 1024 * 1024,
  });
  expect(r.error, r.stderr).toBeUndefined();
  expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
  const report = JSON.parse(readFileSync(join(output, "summary.json"), "utf8")) as {
    results: { passed: boolean }[];
    providerCallsMade: number;
    protectedRoute: boolean;
  };
  // 67, not 65: incremental-build-repair's partial-publication control and event-window-repair's
  // late-before-dedup control (both added 2026-09-08 as part of checker-required hardening) each
  // add one new control beyond the original two packages' counts.
  expect(report.results).toHaveLength(67);
  expect(report.results.every((r) => r.passed)).toBe(true);
  expect(report.providerCallsMade).toBe(0);
  expect(report.protectedRoute).toBe(false);
});
it("checks independent solutions, generated properties and alternative-valid behavior", () => {
  const output = join(scratch, "properties");
  const r = spawnSync(process.execPath, ["scripts/verify-fifth-properties.mjs", output], {
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 16 * 1024 * 1024,
  });
  expect(r.error, r.stderr).toBeUndefined();
  expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
  const report = JSON.parse(readFileSync(join(output, "summary.json"), "utf8")) as {
    results: { passed: boolean }[];
    executions: number;
    providerCallsMade: number;
  };
  expect(report.results).toHaveLength(21);
  expect(report.results.every((r) => r.passed)).toBe(true);
  expect(report.executions).toBeGreaterThan(650);
  expect(report.providerCallsMade).toBe(0);
});

it("makes independent checker inputs complete without candidate-derived answers", () => {
  const output = join(scratch, "checker-inputs");
  const r = spawnSync(process.execPath, ["scripts/verify-fifth-checker-inputs.mjs", output], {
    encoding: "utf8",
    timeout: 60000,
    maxBuffer: 1024 * 1024,
  });
  expect(r.error, r.stderr).toBeUndefined();
  expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
  const report = JSON.parse(readFileSync(join(output, "summary.json"), "utf8"));
  expect(report.results).toHaveLength(5);
  expect(report.results.every((r: { passed: boolean }) => r.passed)).toBe(true);
  for (const id of ids)
    expect(readFileSync(`tasks/${id}/public/instruction.md`, "utf8")).toContain("CHECKER-INPUT.md");
});
