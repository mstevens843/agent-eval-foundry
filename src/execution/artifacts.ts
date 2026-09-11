import { createHash, randomUUID } from "node:crypto";
import {
  constants,
  closeSync,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { canonicalJson, safePackagePath } from "../packages/record.js";
import { safeId } from "./store.js";

export function writeEvidence(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const fd = openSync(path, "wx", 0o600);
  try {
    writeFileSync(fd, `${canonicalJson(value)}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
/** Aggregate bound on total bytes in one published grading-evidence record (captures plus
 * every checker-grade candidate's execution artifacts). Independent of regularTree's generic
 * default and of the unrelated solver-submission size limits enforced in package-route.ts,
 * real-provider.ts and copyArtifactTree — those stay at their own explicit values. */
export const EVIDENCE_PUBLICATION_BUDGET_BYTES = 512 * 1024 * 1024;
export function regularTree(root: string, maxBytes = 128 * 1024 * 1024) {
  let bytes = 0;
  let nodes = 0;
  const files: { path: string; size: number; sha256: string }[] = [];
  const walk = (rel: string, depth: number) => {
    if (++nodes > 4096 || depth > 24) throw Error("EVIDENCE_TREE_LIMIT");
    const path = join(root, rel);
    const st = lstatSync(path);
    if (st.isSymbolicLink() || (!st.isFile() && !st.isDirectory()) || (st.isFile() && st.nlink !== 1))
      throw Error("EVIDENCE_SPECIAL_FILE");
    if (st.isDirectory()) {
      for (const n of readdirSync(path).sort()) walk(rel ? `${rel}/${n}` : n, depth + 1);
      return;
    }
    safePackagePath(rel);
    bytes += st.size;
    if (bytes > maxBytes) throw Error("EVIDENCE_BYTE_LIMIT");
    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const hash = createHash("sha256");
    const chunk = Buffer.alloc(65536);
    let total = 0;
    try {
      const initial = fstatSync(fd);
      if (!initial.isFile() || initial.ino !== st.ino || initial.size !== st.size)
        throw Error("EVIDENCE_CHANGED");
      let n = readSync(fd, chunk, 0, chunk.length, null);
      while (n) {
        total += n;
        if (total > st.size) throw Error("EVIDENCE_CHANGED");
        hash.update(chunk.subarray(0, n));
        n = readSync(fd, chunk, 0, chunk.length, null);
      }
      if (total !== st.size || fstatSync(fd).mtimeMs !== initial.mtimeMs) throw Error("EVIDENCE_CHANGED");
    } finally {
      closeSync(fd);
    }
    files.push({ path: rel, size: st.size, sha256: hash.digest("hex") });
  };
  walk("", 0);
  return files;
}
export function reserveDirectory(root: string, id: string) {
  safeId(id);
  const base = resolve(root);
  mkdirSync(join(base, ".reservations"), { recursive: true, mode: 0o700 });
  if (existsSync(join(base, id))) throw Error("EVIDENCE_ALREADY_PUBLISHED");
  mkdirSync(join(base, ".reservations", id));
  const stage = join(base, ".incomplete", `${id}-${randomUUID()}`);
  mkdirSync(stage, { recursive: true, mode: 0o700 });
  return { stage, destination: join(base, id) };
}
export function copyArtifactTree(source: string, target: string, maxBytes = 8 * 1024 * 1024) {
  const files = regularTree(source, maxBytes);
  if (existsSync(target)) throw Error("ARTIFACT_TARGET_EXISTS");
  mkdirSync(target, { recursive: true, mode: 0o700 });
  for (const file of files) {
    const fd = openSync(
      join(source, file.path),
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      const st = fstatSync(fd);
      if (!st.isFile() || st.nlink !== 1 || st.size !== file.size) throw Error("ARTIFACT_CHANGED");
      const path = join(target, file.path);
      mkdirSync(dirname(path), { recursive: true });
      const output = openSync(path, "wx", 0o644);
      const data = Buffer.alloc(65536);
      const digest = createHash("sha256");
      let total = 0;
      try {
        for (;;) {
          const n = readSync(fd, data, 0, data.length, null);
          if (!n) break;
          total += n;
          if (total > file.size) throw Error("ARTIFACT_CHANGED");
          digest.update(data.subarray(0, n));
          let written = 0;
          while (written < n) written += writeSync(output, data, written, n - written);
        }
        if (total !== file.size || digest.digest("hex") !== file.sha256) throw Error("ARTIFACT_CHANGED");
        fsyncSync(output);
      } finally {
        closeSync(output);
      }
    } finally {
      closeSync(fd);
    }
  }
  return files;
}
export function publishEvidence(
  stage: string,
  destination: string,
  identity: Record<string, unknown>,
  maxBytes = EVIDENCE_PUBLICATION_BUDGET_BYTES,
): string {
  if (existsSync(destination)) throw Error("EVIDENCE_ALREADY_PUBLISHED");
  if (existsSync(join(stage, "completion.json"))) verifyEvidence(stage, maxBytes);
  else
    writeEvidence(join(stage, "completion.json"), {
      schemaVersion: 1,
      identity,
      files: regularTree(stage, maxBytes),
      complete: true,
    });
  // A manifest flush alone does not make captured data durable across host failure.
  for (const file of regularTree(stage, maxBytes)) {
    const fd = openSync(join(stage, file.path), constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }
  const flushDirectories = (path: string) => {
    for (const entry of readdirSync(path, { withFileTypes: true }))
      if (entry.isDirectory()) flushDirectories(join(path, entry.name));
    const fd = openSync(path, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  };
  flushDirectories(stage);
  // The exclusive durable reservation owns this destination. No overwrite API is exposed.
  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
  renameSync(stage, destination);
  const fd = openSync(dirname(destination), "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  return destination;
}
export function verifyEvidence(directory: string, maxBytes = EVIDENCE_PUBLICATION_BUDGET_BYTES) {
  const raw = readFileSync(join(directory, "completion.json"));
  if (raw.length > 1024 * 1024) throw Error("EVIDENCE_MANIFEST_LIMIT");
  const m = JSON.parse(raw.toString()) as {
    schemaVersion: number;
    complete: boolean;
    files: unknown;
    identity: Record<string, unknown>;
  };
  if (
    m.schemaVersion !== 1 ||
    m.complete !== true ||
    canonicalJson(m.files) !==
      canonicalJson(regularTree(directory, maxBytes).filter((f) => f.path !== "completion.json"))
  )
    throw Error("EVIDENCE_CONTENT_MISMATCH");
  return m;
}
