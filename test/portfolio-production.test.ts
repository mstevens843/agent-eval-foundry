import { linkSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRegistry } from "../src/foundry/load.js";
import { localProcess } from "../src/packages/local-process.js";
import {
  PORTFOLIO_PACKAGES,
  stagePortfolioSubmission,
  validatePortfolioExecution,
} from "../src/packages/portfolio.js";
import { sha256 } from "../src/packages/record.js";

describe("professional portfolio contracts", () => {
  it("captures exact multi-file modules without following symlinks or accepting hardlinks", () => {
    const dir = mkdtempSync(join(tmpdir(), "portfolio-capture-"));
    const source = join(dir, "source");
    mkdirSync(source);
    writeFileSync(join(source, "entry.mjs"), "export const subject={run(){return {}}};");
    mkdirSync(join(source, "src"));
    writeFileSync(join(source, "src/helper.mjs"), "export const identity=x=>x;");
    const a = stagePortfolioSubmission(source, join(dir, "a"));
    const b = stagePortfolioSubmission(source, join(dir, "b"));
    expect(a).toBe(b);
    symlinkSync(join(source, "entry.mjs"), join(source, "alias.mjs"));
    expect(() => stagePortfolioSubmission(source, join(dir, "linked"))).toThrow(/ARTIFACT_TYPE/);
    const hard = join(dir, "hard");
    mkdirSync(hard);
    linkSync(join(source, "entry.mjs"), join(hard, "entry.mjs"));
    expect(() => stagePortfolioSubmission(hard, join(dir, "hard-copy"))).toThrow(/ARTIFACT_TYPE/);
  });
  it("rejects missing entry and bounded-size violations before Docker", () => {
    const dir = mkdtempSync(join(tmpdir(), "portfolio-bounds-"));
    const source = join(dir, "source");
    mkdirSync(source);
    expect(() => stagePortfolioSubmission(source, join(dir, "empty"))).toThrow(/ENTRY_MISSING/);
    writeFileSync(join(source, "entry.mjs"), Buffer.alloc(8 * 1024 * 1024 + 1));
    expect(() => stagePortfolioSubmission(source, join(dir, "large"))).toThrow(/ARTIFACT_LIMIT/);
  });
  it("requires exact scenario and check populations and derives semantic status", () => {
    const valid = {
      schemaVersion: 1,
      privateReadable: true,
      providerCallsMade: 0,
      cells: [
        {
          scenarioId: "a",
          status: "semantic-pass",
          checks: { work: true, history: true },
          failures: [],
          executions: [{ diagnostics: { stdoutTail: "" } }],
        },
      ],
    };
    expect(() => validatePortfolioExecution(valid, ["a"], ["work", "history"])).not.toThrow();
    expect(() => validatePortfolioExecution(valid, ["b"], ["work", "history"])).toThrow(/POPULATION/);
    expect(() => validatePortfolioExecution(valid, ["a"], ["work", "history", "omitted"])).toThrow(/CHECKS/);
    expect(() =>
      validatePortfolioExecution(
        { ...valid, cells: [{ ...valid.cells[0], executions: [] }] },
        ["a"],
        ["work", "history"],
      ),
    ).toThrow(/CHECKS/);
    expect(() =>
      validatePortfolioExecution(
        { ...valid, cells: [{ ...valid.cells[0], checks: { work: false, history: true } }] },
        ["a"],
        ["work", "history"],
      ),
    ).toThrow(/CHECKS/);
    expect(() =>
      validatePortfolioExecution(
        { ...valid, cells: [{ scenarioId: "a", status: "invalid", error: "process failed" }] },
        ["a"],
        ["work"],
      ),
    ).not.toThrow();
  });
  it("disposes every research shape once without counting calibration kernels as professional packages", () => {
    const disposition = JSON.parse(readFileSync("data/portfolio-dispositions.json", "utf8"));
    const ids = disposition.families.map((f: { familyId: string }) => f.familyId);
    const registry = loadRegistry(process.cwd());
    expect([...ids].sort()).toEqual(registry.shapes.map((f) => f.familyId).sort());
    expect(new Set(ids).size).toBe(22);
    expect(new Set(disposition.families.map((f: { rank: number }) => f.rank)).size).toBe(22);
  });
  it("binds the scenario selection record to the retained generator bytes", () => {
    const ledger = JSON.parse(readFileSync("data/portfolio-selection-ledger.json", "utf8"));
    const successors = [
      "2026-09-11-browser-coverage-v3-generators",
      "2026-09-11-next-five-generators",
      "2026-09-10-next-five-generators",
      "2026-09-09-next-five-generators",
      "2026-09-09-fourth-ranked-five-generators",
      "2026-09-09-final-five-generators",
    ].flatMap((name) => JSON.parse(readFileSync(`reports/screening/evidence/${name}.json`, "utf8"))) as {
      id: string;
      historicalGeneratorSha256: string;
      generatorSha256: string;
    }[];
    const audited = JSON.parse(
      readFileSync("reports/screening/evidence/2026-09-11-queue-eleven-fifteen-checker-audit.json", "utf8"),
    ).packages as { id: string; sourceFiles: { path: string; sha256: string }[] }[];
    for (const { id, generatorSha256 } of ledger.generators) {
      const successor = successors.find((row) => row.id === id);
      if (successor) expect(successor.historicalGeneratorSha256).toBe(generatorSha256);
      expect(sha256(readFileSync(`tasks/${id}/private/scenarios.mjs`))).toBe(
        audited
          .find((task) => task.id === id)
          ?.sourceFiles.find((file) => file.path === "private/scenarios.mjs")?.sha256 ??
          successor?.generatorSha256 ??
          generatorSha256,
      );
    }
    expect(ledger.validationControls).toHaveLength(4);
  });
  it.each(Object.keys(PORTFOLIO_PACKAGES))(
    "%s has a complete public service and independent private validation",
    (id) => {
      const root = join(process.cwd(), "tasks", id);
      const contract = readFileSync(join(root, "public/SEMANTICS.md"), "utf8");
      expect(contract).toMatch(/45 seconds/);
      expect(contract).toContain("4000");
      expect(readFileSync(join(root, "public/entry.mjs"), "utf8")).toContain("subject");
      expect(readFileSync(join(root, "private/alternative/entry.mjs"), "utf8")).not.toMatch(
        /private\/reference|\.\.\/reference/,
      );
      const controls = JSON.parse(readFileSync(join(root, "private/control-manifest.json"), "utf8"));
      expect(controls.filter((c: { clean?: string }) => c.clean).length).toBeGreaterThanOrEqual(3);
      expect(controls.some((c: { isolation?: boolean }) => c.isolation)).toBe(true);
    },
  );
  it("bounds host-owned input and supports a real piped local command", async () => {
    const result = await localProcess(
      process.execPath,
      ["-e", "process.stdin.on('data',x=>process.stdout.write(x))"],
      { input: "retained input" },
    );
    expect(result.stdout).toBe("retained input");
    await expect(
      localProcess(process.execPath, [], { input: "x".repeat(16 * 1024 * 1024 + 1) }),
    ).rejects.toThrow(/INPUT_LIMIT/);
  });
});
