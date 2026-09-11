import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseFirstTrialConfig, runFirstTrial } from "../src/execution/first-trial.js";
import { developerCommand } from "../src/packages/developer-command.js";
import { createTask, parseTaskManifest } from "../src/packages/task-authoring.js";

describe("public developer commands", () => {
  it("help and listing work without consulting Docker, credentials or package files", async () => {
    for (const args of [[], ["--help"], ["portfolio", "--help"], ["task", "--help"], ["trial", "--help"]])
      expect(await developerCommand("/missing-checkout", args)).toEqual(expect.any(String));
    const result = (await developerCommand("/missing-checkout", ["portfolio", "list"])) as {
      tasks: { id: string }[];
    };
    expect(result.tasks).toHaveLength(25);
    expect(new Set(result.tasks.map((t) => t.id)).size).toBe(25);
    await expect(
      developerCommand("/missing-checkout", ["portfolio", "build", "unknown", "a", "b"]),
    ).rejects.toThrow("portfolio list");
  });

  it("creates a runnable source with unique metadata and refuses to overwrite author edits", () => {
    const temp = mkdtempSync(join(tmpdir(), "foundry-authoring-test-"));
    const output = join(temp, "task");
    try {
      createTask(process.cwd(), "my-first-task", output);
      expect(JSON.parse(readFileSync(join(output, "task.json"), "utf8")).id).toBe("my-first-task");
      expect(readFileSync(join(output, "private/alternative/entry.mjs"), "utf8")).toContain("subject");
      writeFileSync(join(output, "public/entry.mjs"), "author work");
      expect(() => createTask(process.cwd(), "other-task", output)).toThrow("OUTPUT_EXISTS");
      expect(readFileSync(join(output, "public/entry.mjs"), "utf8")).toBe("author work");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("rejects source path traversal and unrecognized manifest fields", () => {
    const valid = { schemaVersion: 1, id: "my-task", familyId: "my-family", version: "0.1.0" };
    expect(parseTaskManifest(valid)).toEqual(valid);
    for (const change of [
      { id: "../task" },
      { id: "__proto__" },
      { version: "latest" },
      { grader: "some-code" },
    ])
      expect(() => parseTaskManifest({ ...valid, ...change })).toThrow("TASK_MANIFEST");
  });

  it("requires execution opt-in before reading a config or touching credentials", async () => {
    await expect(runFirstTrial("/missing-config", false)).rejects.toThrow("TRIAL_EXECUTION_REQUIRED");
    await expect(developerCommand("/missing-root", ["trial", "run", "/missing-config"])).rejects.toThrow(
      "--execute",
    );
  });

  it("bounds single-trial resources and accepts only immutable image identities", () => {
    const config = {
      schemaVersion: 1,
      target: "codex",
      package: "built",
      receipt: "receipt.json",
      store: "jobs",
      runId: "trial-1",
      authoringImage: `sha256:${"a".repeat(64)}`,
      wallSeconds: 900,
      memoryMiB: 2048,
      contractReviewed: false,
    };
    expect(parseFirstTrialConfig(config)).toEqual(config);
    for (const change of [
      { wallSeconds: 0 },
      { wallSeconds: 18001 },
      { memoryMiB: 1 },
      { authoringImage: "node:latest" },
      { target: "other" },
      { runId: "../escape" },
      { apiKey: "not-allowed" },
      { automaticRetries: true },
    ])
      expect(() => parseFirstTrialConfig({ ...config, ...change })).toThrow();
  });
});
