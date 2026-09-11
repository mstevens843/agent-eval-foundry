import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

const load = (path: string) => import(pathToFileURL(join(process.cwd(), path)).href);
async function fixture(id: string) {
  const dir = mkdtempSync(join(tmpdir(), "fourth-successor-"));
  for (const file of readdirSync(`tasks/${id}/private`).filter((name) => name.endsWith(".mjs")))
    copyFileSync(`tasks/${id}/private/${file}`, join(dir, file));
  copyFileSync("tasks/portfolio-runtime/adapter.mjs", join(dir, "adapter.mjs"));
  return {
    dir,
    domain: await import(pathToFileURL(join(dir, "domain.mjs")).href),
    checker: await load(`tasks/${id}/private/reference/checker.mjs`),
  };
}
function stimulus(result: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(result).filter(([k]) => !["checks", "failures", "expected"].includes(k)),
  );
}

it("rejects temporary ticket label loss even when the final useful labels are restored", async () => {
  const { dir, domain, checker } = await fixture("ticket-consolidation-repair");
  const row = {
    tenant: "t",
    id: "one",
    status: "open",
    revision: 1,
    owner: "old",
    labels: ["keep"],
    note: "original",
  };
  try {
    for (const damage of [false, true]) {
      const result = await domain.runScenario(
        { rows: [row], tenants: ["t"], team: "care", marker: "done", conflicts: 0 },
        async (adapter: { invoke: (method: string, args: unknown[]) => Promise<unknown> }) => {
          if (damage)
            await adapter.invoke("api.batch", [
              {
                updates: [
                  { tenant: "t", id: "one", revision: 1, patch: { owner: "t:care", labels: ["done"] } },
                ],
              },
            ]);
          await adapter.invoke("api.batch", [
            {
              updates: [
                {
                  tenant: "t",
                  id: "one",
                  revision: damage ? 2 : 1,
                  patch: { owner: "t:care", labels: ["done", "keep"] },
                },
              ],
            },
          ]);
        },
        dir,
      );
      expect(result.failures).toEqual(damage ? ["labels"] : []);
      for (const call of result.calls) {
        expect(call).not.toHaveProperty("selected");
        expect(call).not.toHaveProperty("validPatch");
      }
      const cases = [{ token: "unrelated-name", cells: [stimulus(result)] }];
      const before = JSON.stringify(cases);
      const first = await checker.run({ cases });
      expect(first.verdicts["unrelated-name"].ok).toBe(!damage);
      expect(await checker.run({ cases })).toEqual(first);
      expect(JSON.stringify(cases)).toBe(before);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("requires the declared source traversal even for an empty analytical report", async () => {
  const { dir, domain, checker } = await fixture("analytical-reconciliation-repair");
  try {
    for (const drain of [false, true]) {
      const tables = { customers: [], accounts: [], usage: [], credits: [] };
      const result = await domain.runScenario(
        { view: { tenant: "t", from: 0, to: 1 }, tables, pageSize: 1, emptyPage: true },
        async (adapter: { invoke: (method: string, args: unknown[]) => Promise<unknown> }) => {
          for (const table of Object.keys(tables)) {
            let cursor: string | null = null;
            do {
              const response = (await adapter.invoke("api.fetch", [{ table, cursor }])) as {
                next: string | null;
              };
              cursor = response.next;
            } while (cursor !== null && (drain || table !== "credits"));
          }
        },
        dir,
      );
      expect(result.actual).toEqual([]);
      expect(result.failures).toEqual(drain ? [] : ["completion"]);
      expect(
        (await checker.run({ cases: [{ token: "opaque", cells: [stimulus(result)] }] })).verdicts.opaque.ok,
      ).toBe(drain);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("judges rollout health at binding time even when the final fleet and report are correct", async () => {
  const { check } = await load("tasks/compatible-rollout-repair/private/reference/checker.mjs");
  const initial = {
    id: "svc",
    abi: "a",
    deployment: { release: "old", generation: 1 },
    alias: { release: "old", generation: 1 },
    cache: { release: "old", abi: "a" },
  };
  const final = {
    ...initial,
    deployment: { release: "new", generation: 2 },
    alias: { release: "new", generation: 2 },
    cache: { release: "new", abi: "a" },
  };
  const bind = {
    method: "bind",
    request: { service: "svc", release: "new", generation: 2 },
    value: { ok: true },
  };
  for (const premature of [false, true]) {
    const observations = [
      {
        method: "stage",
        request: { service: "svc", release: "new" },
        value: { release: "new", generation: 2 },
      },
      ...(premature ? [bind] : []),
      {
        method: "telemetry",
        request: { service: "svc" },
        value: [1, 2].map((sequence) => ({
          service: "svc",
          release: "new",
          generation: 2,
          ok: true,
          sequence,
        })),
      },
      bind,
      { method: "warm", request: { service: "svc", release: "new", abi: "a" }, value: { ok: true } },
      { method: "cleanup", request: { id: "own-stage" }, value: { ok: true } },
    ];
    const state = [["svc", final]];
    expect(
      check({
        actions: [
          { kind: "stage", job: 0, service: "svc", release: "new", generation: 2, stageId: "own-stage" },
        ],
        input: {
          services: [initial],
          stages: [],
          releases: [
            { id: "old", model: "prior", abi: "a", rank: 1 },
            { id: "new", model: "requested", abi: "a", rank: 2 },
          ],
        },
        runs: [
          {
            job: 0,
            requests: [{ service: "svc", model: "requested" }],
            entry: [["svc", initial]],
            state,
            stages: [],
            stagesAtEntry: [],
            observations,
            report: { job: 0, results: [{ service: "svc", status: "deployed", release: "new" }] },
          },
        ],
        state,
        stages: [],
      }),
    ).toBe(!premature);
  }
});

it("exports all five successors reproducibly with private complete oracle closures", async () => {
  const { buildHarborTask, fourthRankedFive } = await load("scripts/build-harbor-portfolio.mjs");
  const dir = mkdtempSync(join(tmpdir(), "fourth-successor-export-"));
  try {
    for (const id of fourthRankedFive) {
      const first = buildHarborTask(process.cwd(), id, join(dir, id));
      const second = buildHarborTask(process.cwd(), id, join(dir, `${id}-repeat`));
      expect(first.digest).toBe(second.digest);
      const publicPath = join(dir, id, "environment/submission");
      expect(readdirSync(publicPath)).not.toContain("src");
      expect(readFileSync(join(publicPath, "entry.mjs"), "utf8")).not.toContain("api.");
      expect(readdirSync(join(dir, id, "solution/reference"))).toContain("checker.mjs");
      for (const variant of ["reference", "alternative"]) {
        const { subject } = await load(`tasks/${id}/private/${variant}/entry.mjs`);
        expect(typeof subject.run).toBe("function");
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
