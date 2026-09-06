import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { routeFor } from "../trials/router.js";
import {
  COMPONENTS,
  type Component,
  type PackageInput,
  type PackageSnapshot,
  buildPackageRecord,
  canonicalJson,
  isVerifiedSnapshot,
  readSnapshotFile,
  safePackagePath,
  sha256,
} from "./record.js";

type InputFile = PackageInput["files"][Component][number];
/** Only source-seed traversal excludes generated caches. Retained submissions/public trees do not. */
const GENERATED = new Set([".git", "node_modules", "__pycache__", ".pytest_cache", ".venv"]);
export function readPackageTree(root: string, relative = "", excludeGenerated = false): InputFile[] {
  const path = relative ? join(root, safePackagePath(relative)) : root;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error(`PACKAGE_SOURCE_SYMLINK: ${path}`);
  if (stat.isFile())
    return [{ path: relative, bytes: readFileSync(path), executable: (stat.mode & 0o111) !== 0 }];
  if (!stat.isDirectory()) throw new Error(`PACKAGE_SOURCE_FILE_TYPE: ${path}`);
  return readdirSync(path)
    .sort()
    .filter((name) => !excludeGenerated || !GENERATED.has(name))
    .flatMap((name) => readPackageTree(root, relative ? `${relative}/${name}` : name, excludeGenerated));
}

export function verifyPublicPackage(snapshot: PackageSnapshot, directory: string): void {
  if (!isVerifiedSnapshot(snapshot)) throw new Error("PACKAGE_UNVERIFIED");
  const expected = [
    ...snapshot.record.components.contract.files,
    ...snapshot.record.components.workspace.files,
  ];
  const files = readPackageTree(directory);
  const byPath = new Map(expected.map((file) => [file.path, file]));
  if (byPath.size !== expected.length || files.length !== expected.length)
    throw new Error("PACKAGE_PUBLIC_SET_MISMATCH");
  for (const file of files) {
    const match = byPath.get(file.path);
    if (
      !match ||
      sha256(file.bytes) !== match.sha256 ||
      file.bytes.length !== match.size ||
      (file.executable ?? false) !== match.executable
    )
      throw new Error(`PACKAGE_PUBLIC_BYTES_MISMATCH: ${file.path}`);
  }
}

export function expectedPackageScenarioIds(snapshot: PackageSnapshot): readonly string[] {
  return packageStringSet(snapshot, "scenario-ids.json");
}
export function expectedPackageCheckIds(snapshot: PackageSnapshot): readonly string[] {
  return packageStringSet(snapshot, "check-ids.json");
}
function packageStringSet(snapshot: PackageSnapshot, path: string): readonly string[] {
  const value: unknown = JSON.parse(
    Buffer.from(readSnapshotFile(snapshot, "scenarios", path)).toString("utf8"),
  );
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.some((v) => typeof v !== "string" || !v.trim()) ||
    new Set(value).size !== value.length
  )
    throw new Error("PACKAGE_SCENARIO_ID_SCHEMA");
  return value as string[];
}

export function retainedTreeDigest(directory: string): string {
  return sha256(
    canonicalJson(
      readPackageTree(directory).map((f) => ({
        path: f.path,
        sha256: sha256(f.bytes),
        size: f.bytes.length,
        executable: f.executable ?? false,
      })),
    ),
  );
}

/** Conservative closure includes shared sources/scripts/data/config, including new local dependencies. */
export function packageSourceSeed(
  root: string,
  familyId: string,
  version: string,
): ReturnType<typeof buildPackageRecord> {
  const files = Object.fromEntries(COMPONENTS.map((name) => [name, []])) as unknown as Record<
    Component,
    InputFile[]
  >;
  const closure = [
    "src",
    "scripts",
    "data",
    "package.json",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "tsup.config.ts",
  ].flatMap((path) => readPackageTree(root, path, true));
  files.dependencies = closure;
  files.policy = readPackageTree(root, "src/packages/policy.ts");
  const native = familyId === "caa-revalidation-repair";
  if (native) {
    const tree = readPackageTree(join(root, "tasks/caa-revalidation-repair"), "", true);
    // Author README/task.toml can describe the defect; neither enters the public contract manifest.
    files.contract = tree.filter(
      (f) => f.path === "instruction.md" || f.path.startsWith("environment/app/spec/"),
    );
    files.workspace = tree.filter(
      (f) => f.path.startsWith("environment/") && !f.path.startsWith("environment/app/spec/"),
    );
    files.scenarios = tree.filter((f) => /tests\/(scenarios|fixtures)|tests\/(fuzz|select)\.py/.test(f.path));
    files.verifier = tree.filter((f) => f.path.startsWith("tests/"));
    files.collector = tree.filter((f) => /tests\/(collect|artifact_guard)\.py/.test(f.path));
    files.adapters = tree.filter((f) => f.path === "tests/test.sh" || f.path === "task.toml");
    files.reference = tree.filter(
      (f) => f.path.startsWith("solution/") || f.path.startsWith("tests/reference/"),
    );
    files.controls = tree.filter((f) => /mutant|control|test_artifact_guard|test_certd/.test(f.path));
    files.dependencies = [
      ...closure,
      ...tree.map((f) => ({ ...f, path: `tasks/caa-revalidation-repair/${f.path}` })),
    ];
  } else {
    const route = routeFor(familyId);
    const typeSource = readFileSync(join(root, route.family.typesPath), "utf8");
    const publicFiles = route.family
      .challenge(typeSource, route.scenarioSetId())
      .files.map((f) => ({ path: f.path, bytes: Buffer.from(f.content) }));
    files.contract = publicFiles.filter((f) => /^(README|SPEC)\.md$/.test(f.path));
    files.workspace = publicFiles.filter((f) => !files.contract.includes(f));
    const familyDirectory = route.family.typesPath.slice(0, route.family.typesPath.lastIndexOf("/"));
    const tree = readPackageTree(root, familyDirectory);
    const params = [...route.scenarioParams()];
    files.scenarios = [
      ...tree.filter((f) => /scenarios|truth/.test(f.path)),
      { path: "selected-scenarios.json", bytes: Buffer.from(canonicalJson(params)) },
      { path: "scenario-ids.json", bytes: Buffer.from(canonicalJson(params.map(([id]) => id))) },
      { path: "check-ids.json", bytes: Buffer.from(canonicalJson(route.family.checks)) },
    ];
    files.verifier = tree.filter((f) => /verify|harness|policy|spec/.test(f.path));
    files.collector = [
      ...closure.filter((f) => f.path.startsWith("scripts/") || f.path.startsWith("src/trials/")),
      ...readPackageTree(root, "dist/trials/operation-authority.js"),
    ];
    files.adapters = closure.filter(
      (f) =>
        f.path.startsWith("scripts/secure/adapters/") ||
        [
          "src/trials/router.ts",
          "src/trials/operation-authority.ts",
          "src/trials/checker-authority.ts",
        ].includes(f.path),
    );
    files.reference = tree.filter((f) => /reference|alternative/.test(f.path));
    files.controls = tree.filter((f) => /mutants|runner|alternative/.test(f.path));
  }
  return buildPackageRecord({
    id: familyId,
    version,
    familyId: native ? "caa-revalidation" : familyId,
    kind: native ? "professional-package" : "calibration-kernel",
    files,
    dependencies: {
      strategy: "conservative-repository-closure",
      unresolved: [
        "Runtime image/toolchain/dependency resolution has not been pinned and attested for this snapshot; source/build recipes are retained, not a claimed runtime attestation.",
      ],
    },
  });
}
