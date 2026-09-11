import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { buildPortfolioTask } from "./portfolio.js";
import { readPackageTree } from "./source.js";

export interface TaskManifest {
  schemaVersion: 1;
  id: string;
  familyId: string;
  version: string;
}

export function parseTaskManifest(value: unknown): TaskManifest {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("TASK_MANIFEST: expected an object");
  const m = value as Record<string, unknown>;
  const id = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
  if (
    m.schemaVersion !== 1 ||
    typeof m.id !== "string" ||
    !id.test(m.id) ||
    m.id.length > 80 ||
    typeof m.familyId !== "string" ||
    !id.test(m.familyId) ||
    m.familyId.length > 80 ||
    typeof m.version !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(m.version) ||
    Object.keys(m).some((k) => !["schemaVersion", "id", "familyId", "version"].includes(k))
  ) {
    throw Error(
      "TASK_MANIFEST: use schemaVersion 1, lowercase-hyphenated id/familyId and a version such as 0.1.0; see docs/task-authoring.md",
    );
  }
  return m as unknown as TaskManifest;
}

export function createTask(root: string, id: string, output: string) {
  const manifest = parseTaskManifest({ schemaVersion: 1, id, familyId: id, version: "0.1.0" });
  if (existsSync(output)) throw Error(`OUTPUT_EXISTS: ${output}`);
  const template = join(root, "examples/task-template");
  if (!existsSync(template))
    throw Error("TASK_TEMPLATE_MISSING: run task create from a Foundry source checkout");
  const files = readPackageTree(template);
  mkdirSync(output, { recursive: true });
  for (const f of files) {
    const path = join(output, f.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, f.bytes, { flag: "wx" });
  }
  writeFileSync(join(output, "task.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  return {
    task: manifest,
    output,
    next: `pnpm foundry task build ${output} BUILD_DIRECTORY RUNTIME_DIRECTORY`,
    providerCallsMade: 0,
  };
}

export async function buildTask(root: string, source: string, output: string, runtime: string) {
  // Validate the regular-file tree before importing trusted authoring code. Do not pass solver submissions here.
  readPackageTree(source);
  const manifest = parseTaskManifest(JSON.parse(readFileSync(join(source, "task.json"), "utf8")));
  for (const path of [
    "public/instruction.md",
    "public/SEMANTICS.md",
    "public/entry.mjs",
    "private/domain.mjs",
    "private/scenarios.mjs",
    "private/control-manifest.json",
    "private/reference/entry.mjs",
    "private/alternative/entry.mjs",
  ]) {
    if (!existsSync(join(source, path)))
      throw Error(
        `TASK_SOURCE_MISSING: ${path}; start with pnpm foundry task create my-task SOURCE_DIRECTORY`,
      );
  }
  const record = await buildPortfolioTask(root, { ...manifest, directory: resolve(source) }, output, runtime);
  return { packageDigest: record.digest, id: record.id, output, providerCallsMade: 0 };
}
