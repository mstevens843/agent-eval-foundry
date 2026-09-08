import { execFileSync } from "node:child_process";
import { constants, copyFileSync, linkSync, lstatSync, mkdtempSync, rmSync, statfsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// Operational safety margin, not a benchmark score or a production throughput SLO.
// The observed largest runtime is about one GiB; keep four GiB outside planned copies.
export const STORAGE_RESERVE_BYTES = 4 * 1024 ** 3;

export function requireStorageHeadroom(available: number, additional: number, reserve: number): void {
  if ([available, additional, reserve].some((n) => !Number.isSafeInteger(n) || n < 0))
    throw Error("STORAGE_INVALID_BUDGET");
  if (additional > available || reserve > available - additional)
    throw Error(`STORAGE_INCOMPLETE: available=${available} planned=${additional} reserve=${reserve}`);
}

export function assertStorageHeadroom(
  directory: string,
  additional: number,
  reserve = STORAGE_RESERVE_BYTES,
): number {
  const space = statfsSync(directory);
  const available = space.bavail * space.bsize;
  requireStorageHeadroom(available, additional, reserve);
  return available;
}

/** Trusted runtime bytes only. Each published archive has an independent inode.
 * Node's forced reflink returns ENOSYS on the measured macOS runtime: its best-effort
 * flag silently made full copies. macOS cp -c actually clones on APFS. Never use a
 * hardlink to the source, which would let recipient edits modify another package.
 */
export function copyRuntimeArchive(source: string, destination: string): "clone" | "copy" {
  const input = resolve(source);
  const target = resolve(destination);
  const stat = lstatSync(input);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw Error("RUNTIME_ARCHIVE_TYPE");
  assertStorageHeadroom(dirname(target), stat.size);
  const temporary = mkdtempSync(join(dirname(target), ".runtime-copy-"));
  const staged = join(temporary, "archive");
  let method: "clone" | "copy" = "clone";
  try {
    try {
      if (process.platform === "darwin") {
        execFileSync("/bin/cp", ["-c", input, staged], {
          timeout: 30_000,
          killSignal: "SIGKILL",
          maxBuffer: 8192,
        });
      } else {
        copyFileSync(input, staged, constants.COPYFILE_FICLONE_FORCE | constants.COPYFILE_EXCL);
      }
    } catch {
      // Only an unpublished, task-owned temporary path can be replaced on fallback.
      rmSync(staged, { force: true });
      assertStorageHeadroom(dirname(target), stat.size);
      copyFileSync(input, staged, constants.COPYFILE_EXCL);
      method = "copy";
    }
    if (lstatSync(staged).size !== stat.size) throw Error("RUNTIME_ARCHIVE_COPY_SIZE");
    // Exclusive publication; cleanup removes the temporary link before returning.
    // This link is to our independent copied inode, NEVER to the source archive.
    linkSync(staged, target);
    return method;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
