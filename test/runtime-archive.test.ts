import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalizeRuntimeArchive } from "../src/packages/runtime-archive.js";

// Minimal regular tar fixtures isolate top-level image order from layer/blob content.
function entry(name: string, text: string): Buffer {
  const header = Buffer.alloc(512);
  const bytes = Buffer.from(text);
  header.write(name);
  header.write(`${bytes.length.toString(8).padStart(11, "0")}\0`, 124);
  header[156] = 48;
  return Buffer.concat([header, bytes, Buffer.alloc((512 - (bytes.length % 512)) % 512)]);
}
describe("runtime archive image order", () => {
  it("normalizes both image indexes without changing layer order or blobs", () => {
    const root = mkdtempSync(join(tmpdir(), "runtime-order-"));
    const manifest = [
      { Config: "b", Layers: ["z", "a"] },
      { Config: "a", Layers: ["x", "w"] },
    ];
    const descriptors = [
      { digest: "sha256:b", platform: { os: "linux" } },
      { digest: "sha256:a", platform: { os: "linux" } },
    ];
    const archive = (reverse: boolean) =>
      Buffer.concat([
        entry("blobs/sha256/content", "untouched payload"),
        entry("manifest.json", JSON.stringify(reverse ? [...manifest].reverse() : manifest)),
        entry(
          "index.json",
          JSON.stringify({ schemaVersion: 2, manifests: reverse ? [...descriptors].reverse() : descriptors }),
        ),
        Buffer.alloc(1024),
      ]);
    const a = join(root, "a.tar");
    const b = join(root, "b.tar");
    writeFileSync(a, archive(false));
    writeFileSync(b, archive(true));
    canonicalizeRuntimeArchive(a);
    canonicalizeRuntimeArchive(b);
    expect(readFileSync(a)).toEqual(readFileSync(b));
    expect(readFileSync(a).toString()).toContain('"Layers":["z","a"]');
    expect(readFileSync(a).subarray(0, 1024)).toEqual(archive(false).subarray(0, 1024));
    const before = readFileSync(a);
    canonicalizeRuntimeArchive(a);
    expect(readFileSync(a)).toEqual(before);
  });
  it("rejects missing, oversized or truncated metadata before modifying bytes", () => {
    const root = mkdtempSync(join(tmpdir(), "runtime-invalid-"));
    const path = join(root, "invalid.tar");
    for (const bytes of [
      Buffer.alloc(1024),
      entry("manifest.json", "[]").subarray(0, 513),
      entry("manifest.json", "{}"),
      entry("manifest.json", " ".repeat(4 * 1024 * 1024 + 1)),
    ]) {
      writeFileSync(path, bytes);
      expect(() => canonicalizeRuntimeArchive(path)).toThrow(/RUNTIME_ARCHIVE/);
      expect(readFileSync(path)).toEqual(bytes);
    }
  });
});
