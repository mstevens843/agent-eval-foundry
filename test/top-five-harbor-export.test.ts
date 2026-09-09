import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

it("exports reproducible native tasks with private complete oracles and parseable verifier code", async () => {
  const root = process.cwd();
  const { buildHarborTask, topFive } = await import(
    pathToFileURL(join(root, "scripts/build-harbor-portfolio.mjs")).href
  );
  const output = mkdtempSync(join(tmpdir(), "top-five-export-"));
  try {
    for (const id of topFive) {
      const directory = join(output, id);
      const first = buildHarborTask(root, id, directory);
      const second = buildHarborTask(root, id, `${directory}-repeat`);
      expect(first.digest).toBe(second.digest);
      const publicFiles = first.exportFiles.filter((f: { path: string }) =>
        f.path.startsWith("environment/"),
      );
      expect(
        publicFiles.every((f: { path: string }) => !/private|solution|checker-utils|\/src\//.test(f.path)),
      ).toBe(true);
      expect(readFileSync(join(directory, "environment/submission/entry.mjs"), "utf8")).not.toContain("api.");
      expect(readdirSync(join(directory, "solution/reference"))).toContain("checker.mjs");
      expect(typeof first.humanReadmeProvided).toBe("boolean");
      for (const file of first.exportFiles.filter(
        (f: { path: string }) => f.path.endsWith(".mjs") && !f.path.includes("/controls/"),
      )) {
        const check = spawnSync(process.execPath, ["--check", join(directory, file.path)], {
          encoding: "utf8",
        });
        expect(check.status, `${id}/${file.path}: ${check.stderr}`).toBe(0);
      }
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}, 30000);
