import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  COMPONENTS,
  type Component,
  type PackageInput,
  type PackageSnapshot,
  buildPackageRecord,
  canonicalJson,
  publishPackage,
  readSnapshotFile,
  refreshSnapshot,
  safePackagePath,
  sha256,
} from "./record.js";
import { readPackageTree } from "./source.js";

export interface ExportEntry {
  readonly path: string;
  readonly component: Component;
  readonly source: string;
  readonly audience: "subject" | "recipient-only";
}
export interface AssemblyPlan {
  readonly schemaVersion: 1;
  readonly target: string;
  readonly entries: readonly ExportEntry[];
  readonly required: readonly { path: string; executable?: boolean }[];
}
const PLAN = "assembly.json";

/** One graph maps retained bytes to recipient paths. It has no CAA-specific fields. */
export function assemblePackage(store: string, input: PackageInput, plan: AssemblyPlan): PackageSnapshot {
  if (input.files.policy.some((f) => f.path === PLAN)) throw new Error("ASSEMBLY_RESERVED_PATH");
  const snapshot = publishPackage(
    store,
    buildPackageRecord({
      ...input,
      files: {
        ...input.files,
        policy: [...input.files.policy, { path: PLAN, bytes: Buffer.from(canonicalJson(plan)) }],
      },
    }),
  );
  inspectAssembly(snapshot);
  return snapshot;
}

export function inspectAssembly(snapshot: PackageSnapshot): AssemblyPlan {
  refreshSnapshot(snapshot);
  const plan = JSON.parse(Buffer.from(readSnapshotFile(snapshot, "policy", PLAN)).toString()) as AssemblyPlan;
  if (
    plan.schemaVersion !== 1 ||
    !plan.target ||
    !Array.isArray(plan.entries) ||
    !plan.entries.length ||
    !Array.isArray(plan.required) ||
    !plan.required.length
  )
    throw new Error("ASSEMBLY_SCHEMA");
  const paths = new Set<string>();
  for (const entry of plan.entries) {
    safePackagePath(entry.path);
    safePackagePath(entry.source);
    if (
      !COMPONENTS.includes(entry.component) ||
      !["subject", "recipient-only"].includes(entry.audience) ||
      paths.has(entry.path.toLowerCase())
    )
      throw new Error("ASSEMBLY_DUPLICATE_OR_INVALID");
    paths.add(entry.path.toLowerCase());
    if ((entry.audience === "subject") !== ["contract", "workspace"].includes(entry.component))
      throw new Error("ASSEMBLY_VISIBILITY");
    readSnapshotFile(snapshot, entry.component, entry.source);
  }
  const entriesByPath = new Map<string, ExportEntry>(plan.entries.map((e) => [e.path, e]));
  for (const required of plan.required) {
    const entry = entriesByPath.get(required.path);
    if (!entry) throw new Error(`ASSEMBLY_REQUIRED: ${required.path}`);
    const file = snapshot.record.components[entry.component].files.find((f) => f.path === entry.source);
    if (!file?.size || (required.executable && !file.executable))
      throw new Error(`ASSEMBLY_NOT_EXECUTABLE: ${required.path}`);
    const text = Buffer.from(readSnapshotFile(snapshot, entry.component, entry.source)).toString();
    if (/TO BE WRITTEN|PLACEHOLDER REFERENCE/.test(text) || /^\s*(?:#.*\n\s*)*pass\s*$/.test(text))
      throw new Error(`ASSEMBLY_PLACEHOLDER: ${required.path}`);
  }
  return plan;
}

/** Destination must be new; no merge with a stale package or overwrite of user files. */
export function materializeAssembly(
  snapshot: PackageSnapshot,
  destination: string,
  audience: "recipient" | "subject" = "recipient",
): void {
  const plan = inspectAssembly(snapshot);
  if (existsSync(destination)) throw new Error("ASSEMBLY_DESTINATION_EXISTS");
  mkdirSync(dirname(destination), { recursive: true });
  mkdirSync(destination);
  for (const entry of plan.entries) {
    if (audience === "subject" && entry.audience !== "subject") continue;
    const file = snapshot.record.components[entry.component].files.find((f) => f.path === entry.source);
    const target = join(destination, entry.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readSnapshotFile(snapshot, entry.component, entry.source), {
      flag: "wx",
      mode: file?.executable ? 0o755 : 0o644,
    });
  }
  verifyAssembly(snapshot, destination, audience);
}

export function verifyAssembly(
  snapshot: PackageSnapshot,
  directory: string,
  audience: "recipient" | "subject" = "recipient",
): void {
  const entries = inspectAssembly(snapshot).entries.filter(
    (e) => audience === "recipient" || e.audience === "subject",
  );
  const files = readPackageTree(directory);
  if (files.length !== entries.length) throw new Error("ASSEMBLY_FILE_SET");
  const entriesByPath = new Map(entries.map((e) => [e.path, e]));
  for (const file of files) {
    const entry = entriesByPath.get(file.path);
    const expected =
      entry && snapshot.record.components[entry.component].files.find((f) => f.path === entry.source);
    if (!expected || sha256(file.bytes) !== expected.sha256 || !!file.executable !== expected.executable)
      throw new Error(`ASSEMBLY_BYTES: ${file.path}`);
  }
}

/** A recipient retains all private component bytes alongside (never inside) the visible tree. */
export function copySnapshot(snapshot: PackageSnapshot, store: string): PackageSnapshot {
  const blobs = new Map<string, Uint8Array>();
  for (const name of COMPONENTS)
    for (const file of snapshot.record.components[name].files)
      blobs.set(file.sha256, readSnapshotFile(snapshot, name, file.path));
  return publishPackage(store, { record: snapshot.record, blobs });
}
