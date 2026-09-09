import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

it("exports all five successors reproducibly with complete private oracles and a Chromium-only verifier dependency", async () => {
  const root = process.cwd();
  const { buildHarborTask, nextFive } = await import(
    pathToFileURL(join(root, "scripts/build-harbor-portfolio.mjs")).href
  );
  const output = mkdtempSync(join(tmpdir(), "next-five-export-"));
  try {
    expect(nextFive).toHaveLength(5);
    for (const id of nextFive) {
      const directory = join(output, id);
      const first = buildHarborTask(root, id, directory);
      const repeat = buildHarborTask(root, id, `${directory}-repeat`);
      expect(repeat.digest).toBe(first.digest);
      const visible = first.exportFiles.filter((f: { path: string }) => f.path.startsWith("environment/"));
      expect(
        visible.every((f: { path: string }) => !/private|solution|checker-utils|\/src\//.test(f.path)),
      ).toBe(true);
      expect(readFileSync(join(directory, "environment/submission/entry.mjs"), "utf8")).not.toContain("api.");
      expect(readFileSync(join(directory, "solution/reference/checker.mjs"), "utf8")).not.toMatch(
        /domain\.mjs|scenarios\.mjs/,
      );
      const config = JSON.parse(readFileSync(join(directory, "tests/checker-required.json"), "utf8"));
      expect(config).toMatchObject({
        required: true,
        reasonPolicy: "diagnostic-only",
        submissionModules: "workspace",
      });
      const docker = readFileSync(join(directory, "tests/Dockerfile"), "utf8");
      expect(docker.includes("playwright@1.62.1")).toBe(id === "browser-replay-repair");
      expect(readFileSync(join(directory, "environment/Dockerfile"), "utf8")).not.toContain("/tests");
      if (id === "browser-replay-repair") {
        expect(docker).toContain("@sha256:");
        expect(readFileSync(join(directory, "tests/docker-compose.yaml"), "utf8")).toContain("init: true");
        const grader = readFileSync(join(directory, "tests/harbor-grade.mjs"), "utf8");
        expect(grader).toContain("status, browserTrace, ...raw");
        expect(grader).toContain("`browser-${i}.zip`");
      }
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

it("only restarts after the authority actually injected a lost response", async () => {
  const { deliver } = await import(
    pathToFileURL(join(process.cwd(), "tasks/delegated-budget-repair/private/restart.mjs")).href
  );
  let launches = 0;
  const execute = async () => {
    launches++;
    throw Error("task-authority/lost-response");
  };
  await expect(deliver(execute, () => ({ invoke: async () => ({}) }), null, [], {})).rejects.toThrow(
    "lost-response",
  );
  expect(launches).toBe(1);
});
