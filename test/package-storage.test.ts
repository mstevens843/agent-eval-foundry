import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { copyRuntimeArchive, requireStorageHeadroom } from "../src/packages/storage.js";

describe("runtime storage safety", () => {
  it("budgets the full fallback copy and reserve, without assuming CoW", () => {
    expect(() => requireStorageHeadroom(12, 8, 4)).not.toThrow();
    expect(() => requireStorageHeadroom(11, 8, 4)).toThrow("STORAGE_INCOMPLETE");
    expect(() => requireStorageHeadroom(10, 11, 0)).toThrow("STORAGE_INCOMPLETE");
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(() => requireStorageHeadroom(bad, 0, 0)).toThrow("STORAGE_INVALID_BUDGET");
      expect(() => requireStorageHeadroom(10, bad, 0)).toThrow("STORAGE_INVALID_BUDGET");
      expect(() => requireStorageHeadroom(10, 0, bad)).toThrow("STORAGE_INVALID_BUDGET");
    }
  });
  it("preserves exact bytes while recipient writes cannot affect the source", () => {
    const root = mkdtempSync(join(tmpdir(), "runtime-copy-test-"));
    try {
      const source = join(root, "source");
      const target = join(root, "target");
      writeFileSync(source, "immutable runtime bytes");
      expect(["clone", "copy"]).toContain(copyRuntimeArchive(source, target));
      expect(readFileSync(target)).toEqual(readFileSync(source));
      expect(lstatSync(target).ino).not.toEqual(lstatSync(source).ino);
      expect(lstatSync(target).nlink).toBe(1);
      writeFileSync(target, "recipient changed its own copy");
      expect(readFileSync(source, "utf8")).toBe("immutable runtime bytes");
      expect(() => copyRuntimeArchive(source, target)).toThrow();
      expect(readFileSync(target, "utf8")).toBe("recipient changed its own copy");
      expect(readdirSync(root).sort()).toEqual(["source", "target"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("does not import a symlink as trusted runtime bytes", () => {
    const root = mkdtempSync(join(tmpdir(), "runtime-copy-type-"));
    try {
      writeFileSync(join(root, "source"), "runtime");
      symlinkSync(join(root, "source"), join(root, "link"));
      expect(() => copyRuntimeArchive(join(root, "link"), join(root, "out"))).toThrow("RUNTIME_ARCHIVE_TYPE");
      expect(readdirSync(root).sort()).toEqual(["link", "source"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
