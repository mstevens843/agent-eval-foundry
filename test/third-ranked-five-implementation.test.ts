import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

it("treats parent lists as sets and rejects an illegal request despite a correct final graph", async () => {
  const scratch = mkdtempSync(join(tmpdir(), "release-parent-sets-"));
  try {
    copyFileSync("tasks/partial-release-repair/private/domain.mjs", join(scratch, "domain.mjs"));
    copyFileSync("tasks/portfolio-runtime/adapter.mjs", join(scratch, "adapter.mjs"));
    const domain = await import(pathToFileURL(join(scratch, "domain.mjs")).href);
    const checker = await import(
      pathToFileURL(join(process.cwd(), "tasks/partial-release-repair/private/reference/checker.mjs")).href
    );
    const current = [
      { id: "parent", parents: [], payload: "p" },
      { id: "child", parents: ["parent"], payload: "c" },
    ];
    const scenario = { current, target: current, scope: ["parent", "child"], uncertain: 0 };
    for (const illegal of [false, true]) {
      const result = await domain.runScenario(
        scenario,
        async (adapter: { invoke: (method: string, args: unknown[]) => Promise<unknown> }) => {
          if (illegal) await adapter.invoke("api.remove", [{ id: "parent" }]);
          else
            await adapter.invoke("api.create", [
              { resource: { id: "child", parents: ["parent", "parent"], payload: "c" } },
            ]);
        },
        scratch,
      );
      expect(result.failures).toEqual(illegal ? ["dependency_order"] : []);
      for (const operation of result.operations) {
        expect(operation).not.toHaveProperty("valid");
        expect(operation).not.toHaveProperty("scope");
      }
      const cell = { ...result };
      for (const key of ["checks", "failures", "expected"]) delete cell[key];
      // Even an extraneous optimistic annotation cannot replace the raw preconditions.
      for (const operation of cell.operations) operation.valid = true;
      const before = JSON.stringify(cell);
      const first = await checker.run({ cases: [{ token: "opaque", cells: [cell] }] });
      const second = await checker.run({ cases: [{ token: "opaque", cells: [cell] }] });
      expect(first.verdicts.opaque.ok).toBe(!illegal);
      expect(second).toEqual(first);
      expect(JSON.stringify(cell)).toBe(before);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

it("rejects the isolated bounded-work defect without relying on a supplied work verdict", async () => {
  const scratch = mkdtempSync(join(tmpdir(), "rule-work-witness-"));
  try {
    copyFileSync("tasks/rule-index-repair/private/domain.mjs", join(scratch, "domain.mjs"));
    copyFileSync("tasks/portfolio-runtime/adapter.mjs", join(scratch, "adapter.mjs"));
    const load = (path: string) => import(pathToFileURL(join(process.cwd(), path)).href);
    const domain = await import(pathToFileURL(join(scratch, "domain.mjs")).href);
    const { scenarios } = await load("tasks/rule-index-repair/private/scenarios.mjs");
    const { Builder } = await load("tasks/rule-index-repair/private/reference/src/builder.mjs");
    const { tokens } = await load("tasks/rule-index-repair/private/reference/src/tokens.mjs");
    const { pattern } = await load("tasks/rule-index-repair/private/controls/no-memo.mjs");
    const checker = await load("tasks/rule-index-repair/private/reference/checker.mjs");
    const scenario = scenarios().find((s: { id: string }) => s.id === "case-025");
    const builder = new Builder();
    const fallback = builder.emit({ op: "fail" });
    const start = pattern(builder, tokens(scenario.rules[0].pattern), scenario.rules[0]);
    const program = builder.finish(builder.emit({ op: "split", first: start, second: fallback }));
    const result = await domain.runScenario(
      scenario,
      async (adapter: { invoke: (method: string, args: unknown[]) => Promise<unknown> }) => {
        await adapter.invoke("api.publish", [{ program }]);
      },
      scratch,
    );
    expect(result.failures).toEqual(["bounded_work"]);
    const cell = { ...result };
    for (const key of ["checks", "failures", "expected"]) delete cell[key];
    for (const observation of cell.actual) {
      expect(observation).not.toHaveProperty("withinBudget");
      expect(observation).not.toHaveProperty("budget");
    }
    expect((await checker.run({ cases: [{ token: "opaque", cells: [cell] }] })).verdicts.opaque.ok).toBe(
      false,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
