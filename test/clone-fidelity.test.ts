// A fresh clone must be able to run this repository's gates.
//
// This exists because of a bug that is invisible on the machine that has it. Git cannot store an
// empty directory. `bundles/*/exploit/` and `bundles/*/submitted-bypass/` are empty ON PURPOSE — the
// attacker is handed empty directories to write into, and the fs-sandbox isolation check verifies
// both are present and writable. They existed on the author's disk because `adversarial prepare` had
// created them, and they did not exist in git at all.
//
// So every package-backed family read `adversarial-ready` locally and `audit-pending` on CI, the
// generated reports differed between the two, and `pnpm verify` — whose entire claim is that a report
// can be reproduced — failed on a machine that had simply never run the command that made the
// directories. Green locally, red remotely, and no diff anywhere that would explain it.
//
// The class of bug is "state on the author's disk that the repository does not carry". This test
// checks the whole class rather than the one instance: no directory that survives here may be
// missing from a clone.

import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const SKIP = new Set(["node_modules", ".git", "dist", ".turbo", "coverage"]);

/** Everything a fresh clone would have: tracked files, plus untracked files git would accept. */
function clonedFiles(): ReadonlySet<string> {
  const out = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return new Set(out.split("\n").filter(Boolean));
}

/** Directories that exist on disk and hold no file a clone would carry. */
function invisibleDirectories(): string[] {
  const cloned = clonedFiles();
  const found: string[] = [];
  const walk = (dir: string): void => {
    const entries = readdirSync(dir, { withFileTypes: true }).filter((e) => !SKIP.has(e.name));
    const files = entries.filter((e) => e.isFile());
    const subdirs = entries.filter((e) => e.isDirectory());
    for (const sub of subdirs) walk(join(dir, sub.name));
    if (dir === ROOT) return;
    const rel = relative(ROOT, dir);
    if (rel.startsWith(".")) return;
    const carried = files.some((f) => cloned.has(join(rel, f.name)));
    // A directory with subdirectories still reaches a clone through them; only a leaf with no
    // carried file vanishes.
    if (!carried && subdirs.length === 0) found.push(rel);
  };
  walk(ROOT);
  return found.sort();
}

describe("a fresh clone gets everything the gates read", () => {
  it("no directory on disk is missing from a clone", () => {
    // If this fails, the named directory exists only because a command was run here. Add a
    // `.gitkeep` explaining why the directory matters — do NOT weaken whatever check reads it.
    expect(invisibleDirectories()).toEqual([]);
  });

  it("every adversarial bundle carries its empty exploit and submitted-bypass directories", () => {
    // The specific instance, asserted by name so a future `adversarial prepare` that adds a bundle
    // without them fails here rather than on somebody else's machine.
    const cloned = clonedFiles();
    const bundles = readdirSync(join(ROOT, "bundles"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    expect(bundles.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const bundle of bundles) {
      for (const sub of ["exploit", "submitted-bypass"]) {
        const dir = join(ROOT, "bundles", bundle, sub);
        try {
          if (!statSync(dir).isDirectory()) continue;
        } catch {
          continue; // this bundle shape has no such directory
        }
        const carried = readdirSync(dir).some((f) => cloned.has(join("bundles", bundle, sub, f)));
        if (!carried) missing.push(join("bundles", bundle, sub));
      }
    }
    expect(missing).toEqual([]);
  });
});
