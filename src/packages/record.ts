import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const COMPONENTS = [
  "contract",
  "workspace",
  "scenarios",
  "verifier",
  "collector",
  "adapters",
  "reference",
  "controls",
  "dependencies",
  "policy",
] as const;
export type Component = (typeof COMPONENTS)[number];
export type PackageKind = "calibration-kernel" | "professional-package";
export interface PackageFile {
  readonly path: string;
  readonly sha256: string;
  readonly size: number;
  readonly executable: boolean;
}
export interface PackageComponent {
  readonly digest: string;
  readonly files: readonly PackageFile[];
}
export interface PackageRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly familyId: string;
  readonly kind: PackageKind;
  readonly components: Readonly<Record<Component, PackageComponent>>;
  readonly dependencies: {
    readonly strategy: "conservative-repository-closure" | "explicit-fixture";
    readonly unresolved: readonly string[];
  };
  readonly parent: string | null;
  readonly digest: string;
}
export interface PackageInput {
  readonly id: string;
  readonly version: string;
  readonly familyId: string;
  readonly kind: PackageKind;
  readonly dependencies: PackageRecord["dependencies"];
  readonly parent?: string | null;
  readonly files: Readonly<
    Record<
      Component,
      readonly {
        readonly path: string;
        readonly bytes: Uint8Array;
        readonly executable?: boolean;
      }[]
    >
  >;
}
export interface PackageSnapshot {
  readonly record: PackageRecord;
  readonly verified: true;
}
const verifiedSnapshots = new WeakSet<object>();
const snapshotStores = new WeakMap<object, string>();
export const isVerifiedSnapshot = (value: PackageSnapshot | undefined): value is PackageSnapshot =>
  value !== undefined && verifiedSnapshots.has(value);

export const sha256 = (bytes: string | Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`)
      .join(",")}}`;
  }
  throw new Error("PACKAGE_SCHEMA: canonical JSON requires plain, finite JSON values");
}
export function safePackagePath(path: string): string {
  if (
    !path ||
    path !== path.normalize("NFC") ||
    /[\\:]/.test(path) ||
    [...path].some((c) => c.charCodeAt(0) < 32) ||
    path.split("/").some((p) => !p || p === "." || p === "..")
  ) {
    throw new Error(`PACKAGE_PATH: invalid relative path ${JSON.stringify(path)}`);
  }
  return path;
}
const digestPattern = /^[a-f0-9]{64}$/;
function digest(value: unknown): asserts value is string {
  if (typeof value !== "string" || !digestPattern.test(value))
    throw new Error("PACKAGE_SCHEMA: invalid digest");
}
function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("PACKAGE_SCHEMA: expected object");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, expected: readonly string[]): void {
  if (Object.keys(value).sort().join("\0") !== [...expected].sort().join("\0"))
    throw new Error("PACKAGE_SCHEMA: missing or unknown field");
}
function nonempty(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error("PACKAGE_SCHEMA: expected nonempty string");
}

/** Parses untrusted metadata; recomputes component and aggregate identities, not blob contents. */
export function parsePackageRecord(value: unknown): PackageRecord {
  const row = object(value);
  keys(row, [
    "schemaVersion",
    "id",
    "version",
    "familyId",
    "kind",
    "components",
    "dependencies",
    "parent",
    "digest",
  ]);
  if (row.schemaVersion !== 1) throw new Error("PACKAGE_SCHEMA: unsupported version");
  for (const field of ["id", "version", "familyId"]) nonempty(row[field]);
  if (!["calibration-kernel", "professional-package"].includes(String(row.kind)))
    throw new Error("PACKAGE_SCHEMA: invalid kind");
  if (row.parent !== null) digest(row.parent);
  const deps = object(row.dependencies);
  keys(deps, ["strategy", "unresolved"]);
  if (
    !["conservative-repository-closure", "explicit-fixture"].includes(String(deps.strategy)) ||
    !Array.isArray(deps.unresolved)
  )
    throw new Error("PACKAGE_SCHEMA: dependency identity");
  for (const issue of deps.unresolved) nonempty(issue);
  const components = object(row.components);
  keys(components, COMPONENTS);
  for (const name of COMPONENTS) {
    const component = object(components[name]);
    keys(component, ["digest", "files"]);
    if (!Array.isArray(component.files)) throw new Error("PACKAGE_SCHEMA: expected files");
    const seen = new Set<string>();
    let previous = "";
    for (const raw of component.files) {
      const file = object(raw);
      keys(file, ["path", "sha256", "size", "executable"]);
      nonempty(file.path);
      const path = safePackagePath(file.path);
      const portable = path.toLowerCase();
      if (seen.has(portable) || path <= previous)
        throw new Error("PACKAGE_PATH: duplicate/case-colliding or unsorted path");
      seen.add(portable);
      previous = path;
      digest(file.sha256);
      if (
        !Number.isSafeInteger(file.size) ||
        (file.size as number) < 0 ||
        typeof file.executable !== "boolean"
      )
        throw new Error("PACKAGE_SCHEMA: size/mode");
    }
    if (component.digest !== sha256(canonicalJson(component.files)))
      throw new Error(`PACKAGE_COMPONENT_MISMATCH: ${name}`);
  }
  const { digest: claimed, ...body } = row;
  if (claimed !== sha256(canonicalJson(body))) throw new Error("PACKAGE_DIGEST_MISMATCH");
  return JSON.parse(canonicalJson(row)) as PackageRecord;
}

export function buildPackageRecord(input: PackageInput): {
  record: PackageRecord;
  blobs: ReadonlyMap<string, Uint8Array>;
} {
  const blobs = new Map<string, Uint8Array>();
  const components = Object.fromEntries(
    COMPONENTS.map((name) => {
      const files = input.files[name]
        .map((file): PackageFile => {
          const bytes = Uint8Array.from(file.bytes);
          const hash = sha256(bytes);
          blobs.set(hash, bytes);
          return {
            path: safePackagePath(file.path),
            sha256: hash,
            size: bytes.length,
            executable: file.executable ?? false,
          };
        })
        .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
      return [name, { digest: sha256(canonicalJson(files)), files }];
    }),
  ) as unknown as Record<Component, PackageComponent>;
  const body = {
    schemaVersion: 1,
    id: input.id,
    version: input.version,
    familyId: input.familyId,
    kind: input.kind,
    components,
    dependencies: input.dependencies,
    parent: input.parent ?? null,
  };
  return { record: parsePackageRecord({ ...body, digest: sha256(canonicalJson(body)) }), blobs };
}

function regularBytes(path: string): Buffer {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`PACKAGE_FILE_TYPE: ${path}`);
  return readFileSync(path);
}
function directory(path: string): void {
  if (!lstatSync(path).isDirectory()) throw new Error(`PACKAGE_STORE_DIRECTORY: ${path}`);
}
function immutableWrite(path: string, bytes: Uint8Array): void {
  try {
    writeFileSync(path, bytes, { flag: "wx", mode: 0o444 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (!regularBytes(path).equals(Buffer.from(bytes)))
      throw new Error(`PACKAGE_IMMUTABLE_CONFLICT: ${path}`);
  }
}

/** Host-owned CAS. Blobs publish first; an interrupted write can never produce a verified snapshot. */
export function publishPackage(store: string, input: ReturnType<typeof buildPackageRecord>): PackageSnapshot {
  const record = parsePackageRecord(input.record);
  mkdirSync(store, { recursive: true });
  directory(store);
  for (const name of ["blobs", "records"]) {
    mkdirSync(join(store, name), { recursive: true });
    directory(join(store, name));
  }
  for (const component of Object.values(record.components))
    for (const file of component.files) {
      const bytes = input.blobs.get(file.sha256);
      if (!bytes || bytes.length !== file.size || sha256(bytes) !== file.sha256)
        throw new Error(`PACKAGE_BLOB_MISMATCH: ${file.path}`);
      immutableWrite(join(store, "blobs", file.sha256), bytes);
    }
  immutableWrite(join(store, "records", `${record.digest}.json`), Buffer.from(canonicalJson(record)));
  return resolvePackage(store, record.digest);
}

/** Always read and rehash retained bytes. No metadata hash or process-global cache outranks them. */
export function resolvePackage(store: string, hash: string): PackageSnapshot {
  digest(hash);
  directory(store);
  directory(join(store, "records"));
  directory(join(store, "blobs"));
  const record = parsePackageRecord(
    JSON.parse(regularBytes(join(store, "records", `${hash}.json`)).toString("utf8")),
  );
  if (record.digest !== hash) throw new Error("PACKAGE_RECORD_ADDRESS_MISMATCH");
  for (const component of Object.values(record.components))
    for (const file of component.files) {
      const path = join(store, "blobs", file.sha256);
      if (!existsSync(path)) throw new Error(`PACKAGE_BLOB_MISSING: ${file.path}`);
      const bytes = regularBytes(path);
      if (bytes.length !== file.size || sha256(bytes) !== file.sha256)
        throw new Error(`PACKAGE_BLOB_MISMATCH: ${file.path}`);
    }
  const freeze = (value: object): void => {
    for (const item of Object.values(value)) if (item !== null && typeof item === "object") freeze(item);
    Object.freeze(value);
  };
  freeze(record);
  const snapshot = Object.freeze({ record, verified: true as const });
  verifiedSnapshots.add(snapshot);
  snapshotStores.set(snapshot, store);
  return snapshot;
}

export function readSnapshotFile(snapshot: PackageSnapshot, component: Component, path: string): Uint8Array {
  const store = snapshotStores.get(snapshot);
  if (!store) throw new Error("PACKAGE_UNVERIFIED");
  const file = snapshot.record.components[component].files.find((entry) => entry.path === path);
  if (!file) throw new Error(`PACKAGE_FILE_MISSING: ${component}/${path}`);
  const bytes = regularBytes(join(store, "blobs", file.sha256));
  if (bytes.length !== file.size || sha256(bytes) !== file.sha256)
    throw new Error(`PACKAGE_BLOB_MISMATCH: ${path}`);
  return bytes;
}

/** Recheck at the action boundary, not merely when an object was first loaded. */
export function refreshSnapshot(snapshot: PackageSnapshot): PackageSnapshot {
  const store = snapshotStores.get(snapshot);
  if (!store) throw new Error("PACKAGE_UNVERIFIED");
  return resolvePackage(store, snapshot.record.digest);
}

/** Public export deliberately contains no aggregate hash, private paths, or private identities. */
export function publicPackageManifest(snapshot: PackageSnapshot): unknown {
  if (!isVerifiedSnapshot(snapshot)) throw new Error("PACKAGE_UNVERIFIED");
  return {
    schemaVersion: 1,
    files: [...snapshot.record.components.contract.files, ...snapshot.record.components.workspace.files],
  };
}
