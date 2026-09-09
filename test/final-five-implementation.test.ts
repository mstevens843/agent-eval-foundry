import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

const load = (p: string) => import(pathToFileURL(join(process.cwd(), p)).href);

it("refuses a missing native task before static scripts can report vacuous passes", () => {
  const dir = mkdtempSync(join(tmpdir(), "missing-native-task-"));
  try {
    const result = spawnSync(
      process.execPath,
      [
        "scripts/check-harbor-tasks.mjs",
        join(dir, "output"),
        "scripts/tb-upstream-checks",
        join(dir, "absent"),
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Incomplete native task");
    expect(existsSync(join(dir, "output/summary.json"))).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
interface Adapter {
  invoke(method: string, args: unknown[]): Promise<unknown>;
  report(value: unknown): void;
}
async function fixture(id: string) {
  const dir = mkdtempSync(join(tmpdir(), "final-successor-"));
  for (const name of ["domain.mjs", "restart.mjs"]) {
    const path = `tasks/${id}/private/${name}`;
    if (existsSync(path)) copyFileSync(path, join(dir, name));
  }
  copyFileSync("tasks/portfolio-runtime/adapter.mjs", join(dir, "adapter.mjs"));
  return {
    dir,
    domain: await import(pathToFileURL(join(dir, "domain.mjs")).href),
    checker: await load(`tasks/${id}/private/reference/checker.mjs`),
  };
}
function raw(result: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(result).filter(([key]) => !["checks", "failures", "expected"].includes(key)),
  );
}

it("accepts leaf completion while rejecting a broken promise on an unrealized branch", async () => {
  const { dir, domain, checker } = await fixture("staged-allocation-repair");
  const request = (tags: string[]) => ({ units: 1, tags, minZones: 1, antiWith: [], shareZoneWith: null });
  const tree = {
    id: "root",
    request: request(["any"]),
    children: [
      { id: "rare", request: request(["rare"]), children: [] },
      { id: "common", request: request(["common"]), children: [] },
    ],
  };
  const resources = [
    { id: "a", tags: ["any", "rare"], zone: "z", capacity: 1, used: 0 },
    { id: "b", tags: ["any", "common"], zone: "z", capacity: 2, used: 0 },
  ];
  try {
    for (const broken of [false, true]) {
      const result = await domain.runScenario(
        { view: { resources, tree }, path: ["root", "common"] },
        async (a: Adapter) => {
          await a.invoke("api.next", [{}]);
          await a.invoke("api.place", [{ node: "root", resources: [broken ? "a" : "b"] }]);
          await a.invoke("api.next", [{}]);
          await a.invoke("api.place", [{ node: "common", resources: ["b"] }]);
          // The disclosed leaf establishes completion; no terminal read is required here.
        },
        dir,
      );
      expect(result.failures).toEqual(broken ? ["future_promise"] : []);
      const cases = [{ token: "opaque", cells: [raw(result)] }];
      const before = JSON.stringify(cases);
      const first = checker.run({ cases });
      expect(first.verdicts.opaque.ok).toBe(!broken);
      expect(checker.run({ cases })).toEqual(first);
      expect(JSON.stringify(cases)).toBe(before);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("requires a source read even when an empty capacity source gives a correct zero total", async () => {
  const { dir, domain, checker } = await fixture("temporal-capacity-repair");
  try {
    for (const fetch of [false, true]) {
      const result = await domain.runScenario(
        { rows: [], pageSize: 1, queries: [{ id: "q", series: "s", knownAt: 0, from: 0, to: 1 }] },
        async (a: Adapter) => {
          if (fetch) await a.invoke("api.fetch", [{ cursor: null }]);
          await a.invoke("api.record", [{ id: "q", total: "0" }]);
        },
        dir,
      );
      expect(result.failures).toEqual(fetch ? [] : ["completion"]);
      expect(checker.check(raw(result))).toBe(fetch);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("retains committed publications across lost responses and rejects a duplicate on redelivery", async () => {
  const { dir, domain, checker } = await fixture("persistent-knowledge-repair");
  const lineage = [{ id: "s", revision: 1 }];
  const effect = { id: "op", destination: "d", value: "v", lineage };
  try {
    for (const blind of [false, true]) {
      let attempts = 0;
      const result = await domain.runScenario(
        {
          jobs: [
            {
              updates: [
                { id: "s", revision: 1, kind: "source", value: "v", authority: "approved", retracted: false },
              ],
              requests: [{ id: "op", root: "s", destination: "d", grantVersion: 1 }],
              grants: [{ destination: "d", version: 1, allowed: true }],
              crashAfterPublish: 1,
            },
          ],
        },
        async (a: Adapter) => {
          attempts++;
          const receipts = (await a.invoke("api.receipts", [{}])) as unknown[];
          if (blind || receipts.length === 0) await a.invoke("api.publish", [effect]);
          a.report({ job: 0, decisions: [{ id: "op", outcome: "published", lineage }] });
        },
        dir,
      );
      expect(attempts).toBe(2);
      expect(result.interruptions).toHaveLength(1);
      expect(result.effects).toHaveLength(blind ? 2 : 1);
      expect(result.checks.history).toBe(!blind);
      expect(checker.check(raw(result))).toBe(!blind);
      expect(raw(result)).not.toHaveProperty("prefixes");
      expect(raw(result)).not.toHaveProperty("expectedReports");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("distinguishes the last event from the required terminal stream response", async () => {
  const { dir, domain, checker } = await fixture("event-window-repair");
  try {
    for (const terminal of [false, true]) {
      const result = await domain.runScenario(
        { view: { partitions: ["p"], width: 1, lateness: 0 }, events: [{ kind: "end", partition: "p" }] },
        async (a: Adapter) => {
          await a.invoke("api.next", [{}]);
          if (terminal) await a.invoke("api.next", [{}]);
        },
        dir,
      );
      expect(result.failures).toEqual(terminal ? [] : ["completion"]);
      expect(checker.check(raw(result))).toBe(terminal);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("reproduces the four Node exports and retains a complete private Go oracle", async () => {
  const { buildHarborTask, finalNodeFour } = await load("scripts/build-harbor-portfolio.mjs");
  const dir = mkdtempSync(join(tmpdir(), "final-exports-"));
  try {
    for (const id of finalNodeFour) {
      const first = buildHarborTask(process.cwd(), id, join(dir, id));
      const second = buildHarborTask(process.cwd(), id, join(dir, `${id}-repeat`));
      expect(first.digest).toBe(second.digest);
      for (const variant of ["reference", "alternative"])
        expect(typeof (await load(`tasks/${id}/private/${variant}/entry.mjs`)).subject.run).toBe("function");
    }
    const caa = "tasks/caa-revalidation-repair";
    expect(existsSync(`${caa}/environment/app/certd/internal/authz`)).toBe(false);
    expect(readFileSync(`${caa}/solution/solve.sh`, "utf8")).toContain(
      'cp -R "$SOLUTION/files/." /app/certd/',
    );
    expect(existsSync(`${caa}/solution/files/internal/authority/client.go`)).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
