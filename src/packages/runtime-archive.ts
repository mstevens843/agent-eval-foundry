import { constants, closeSync, fstatSync, openSync, readSync, writeSync } from "node:fs";

/** Docker's multi-image save walks a map when emitting its image indexes. Canonicalize
 * only those unordered image lists, never layer order or content-addressed blobs.
 * Fixed-length metadata replacement keeps tar headers/checksums/offsets unchanged.
 * Archive input is a newly saved trusted local runtime, not a submitted artifact. */
export function canonicalizeRuntimeArchive(path: string): void {
  const fd = openSync(path, constants.O_RDWR | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1) throw Error("RUNTIME_ARCHIVE_TYPE");
    const patches: { offset: number; bytes: Buffer }[] = [];
    const seen = new Set<string>();
    for (let offset = 0; offset + 512 <= stat.size; ) {
      const header = Buffer.alloc(512);
      if (readSync(fd, header, 0, 512, offset) !== 512) throw Error("RUNTIME_ARCHIVE_TRUNCATED");
      if (header.every((b) => b === 0)) break;
      const field = (start: number, length: number) =>
        header
          .subarray(start, start + length)
          .toString()
          .replace(/\0.*$/s, "");
      const sizeText = field(124, 12).trim();
      if (!/^[0-7]+$/.test(sizeText)) throw Error("RUNTIME_ARCHIVE_SIZE");
      const size = Number.parseInt(sizeText, 8);
      if (!Number.isSafeInteger(size) || offset + 512 + size > stat.size)
        throw Error("RUNTIME_ARCHIVE_TRUNCATED");
      const name = field(0, 100);
      if (name === "manifest.json" || name === "index.json") {
        if (seen.has(name) || size > 4 * 1024 * 1024 || ![0, 48].includes(header[156] ?? -1))
          throw Error("RUNTIME_ARCHIVE_INDEX");
        seen.add(name);
        const bytes = Buffer.alloc(size);
        if (readSync(fd, bytes, 0, size, offset + 512) !== size) throw Error("RUNTIME_ARCHIVE_TRUNCATED");
        const value = JSON.parse(bytes.toString());
        const entries = name === "manifest.json" ? value : value.manifests;
        const key = name === "manifest.json" ? "Config" : "digest";
        if (!Array.isArray(entries) || entries.some((e) => !e || typeof e[key] !== "string"))
          throw Error("RUNTIME_ARCHIVE_INDEX");
        entries.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
        const canonical = Buffer.from(JSON.stringify(value));
        if (canonical.length > size) throw Error("RUNTIME_ARCHIVE_INDEX_LENGTH");
        patches.push({
          offset: offset + 512,
          bytes: Buffer.concat([canonical, Buffer.alloc(size - canonical.length, 32)]),
        });
      }
      offset += 512 + Math.ceil(size / 512) * 512;
    }
    if (!seen.has("manifest.json")) throw Error("RUNTIME_ARCHIVE_MANIFEST_MISSING");
    // Parse and validate every metadata entry before changing any byte.
    for (const patch of patches)
      if (writeSync(fd, patch.bytes, 0, patch.bytes.length, patch.offset) !== patch.bytes.length)
        throw Error("RUNTIME_ARCHIVE_WRITE");
  } finally {
    closeSync(fd);
  }
}
