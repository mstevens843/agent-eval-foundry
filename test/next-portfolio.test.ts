import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";
import { portfolioDirection } from "../src/learning/cases.js";
import { PORTFOLIO_PACKAGES } from "../src/packages/portfolio.js";
import { sha256 } from "../src/packages/record.js";

const ids = [
  "partition-index-repair",
  "causal-replica-repair",
  "partial-release-repair",
  "ticket-consolidation-repair",
  "temporal-capacity-repair",
];
async function domain(id: string) {
  // Only trusted author-side collector code; never load a submitted program here.
  const directory = mkdtempSync(join(tmpdir(), "next-portfolio-truth-"));
  copyFileSync(`tasks/${id}/private/domain.mjs`, join(directory, "domain.mjs"));
  copyFileSync("tasks/portfolio-runtime/adapter.mjs", join(directory, "adapter.mjs"));
  return import(pathToFileURL(join(directory, "domain.mjs")).href);
}
it("registers five additional packages without replacing the existing four portfolio routes", () => {
  expect(Object.keys(PORTFOLIO_PACKAGES).length).toBeGreaterThanOrEqual(14);
  for (const id of ids) {
    expect(Object.keys(PORTFOLIO_PACKAGES)).toContain(id);
    expect(portfolioDirection(id)?.family).toBe(PORTFOLIO_PACKAGES[id as keyof typeof PORTFOLIO_PACKAGES]);
    const controls = JSON.parse(readFileSync(`tasks/${id}/private/control-manifest.json`, "utf8"));
    expect(controls.some((c: { id: string }) => c.id === "no-work")).toBe(true);
    expect(controls.some((c: { id: string }) => c.id === "forged-completion")).toBe(true);
    expect(controls.some((c: { isolation?: boolean }) => c.isolation)).toBe(true);
  }
});
it("freezes scenario generation before post-selection controls and retains complete opportunity coverage", () => {
  const ledger = JSON.parse(readFileSync("data/next-portfolio-selection-ledger.json", "utf8"));
  expect(ledger.generators).toHaveLength(5);
  expect(ledger.validationControls).toHaveLength(5);
  const successors = JSON.parse(
    readFileSync("reports/screening/evidence/2026-09-09-final-five-generators.json", "utf8"),
  ) as { id: string; historicalGeneratorSha256: string; generatorSha256: string }[];
  for (const generator of ledger.generators) {
    const successor = successors.find((row) => row.id === generator.id);
    if (successor) expect(successor.historicalGeneratorSha256).toBe(generator.generatorSha256);
    expect(sha256(readFileSync(`tasks/${generator.id}/private/scenarios.mjs`))).toBe(
      successor?.generatorSha256 ?? generator.generatorSha256,
    );
  }
  const inventory = JSON.parse(readFileSync("data/next-portfolio-opportunity-audit.json", "utf8"));
  expect(inventory.uniqueCandidates).toBe(142);
  expect(
    inventory.coverage.find((s: { path: string }) => s.path === "data/portfolio-dispositions.json").entries,
  ).toBe(22);
});
it("does not let an unread partition queue erase required work", async () => {
  const d = await domain("partition-index-repair");
  const s = {
    partitions: ["p"],
    events: [
      {
        kind: "callback",
        partition: "p",
        generation: 0,
        offset: 0,
        eventId: "e",
        record: { entity: "doc", version: 1, body: "real" },
      },
    ],
  };
  const result = await d.runScenario(s, async () => undefined, "/unused");
  expect(result.checks.completion).toBe(false);
  expect(result.checks.index_payload).toBe(false);
  expect(result.expected).toHaveLength(1);
});
it("chooses a revision before intersecting its effective interval and retains exact integers", async () => {
  const d = await domain("temporal-capacity-repair");
  const rows = [
    { series: "A", key: "x", revision: 1, knownAt: 0, from: 0, to: 4, value: "9007199254740993" },
    { series: "A", key: "x", revision: 2, knownAt: 2, from: 10, to: 12, value: "3" },
  ];
  const expected = d.expectedRows({
    rows,
    queries: [
      { id: "before", series: "A", knownAt: 1, from: 0, to: 2 },
      { id: "after", series: "A", knownAt: 2, from: 0, to: 2 },
      { id: "boundary", series: "A", knownAt: 2, from: 12, to: 14 },
    ],
  });
  expect(expected).toEqual([
    { id: "before", total: "18014398509481986" },
    { id: "after", total: "0" },
    { id: "boundary", total: "0" },
  ]);
});
it("retains a concurrent sibling but not an observed deleted dot", async () => {
  const d = await domain("causal-replica-repair");
  const a = { site: "a", n: 1, payload: "old" };
  const b = { site: "b", n: 1, payload: "concurrent" };
  const result = d.truth({
    scope: ["d"],
    replicas: ["east", "west"],
    documents: {
      east: { d: { context: { a: 1 }, values: [a] } },
      west: { d: { context: { a: 1, b: 1, retired: 7 }, values: [b] } },
    },
  });
  expect(result.d).toEqual({ context: { a: 1, b: 1, retired: 7 }, values: [b] });
});
it("accepts already converged replicas without requiring redundant writes", async () => {
  const d = await domain("causal-replica-repair");
  const state = { context: { a: 1 }, values: [{ site: "a", n: 1, payload: "value" }] };
  const result = await d.runScenario(
    {
      scope: ["doc", "missing"],
      replicas: ["east", "west"],
      documents: { east: { doc: state }, west: { doc: state } },
    },
    async () => undefined,
    "/unused",
  );
  expect(result.failures).toEqual([]);
  expect(result.writes).toEqual([]);
});
