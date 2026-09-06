import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Conservative build closure, intentionally uncached: a changed source must not silently use an
 * older collector bundle. Only source/config directories, never generated reports or trial data. */
export function authoritySourceDigest(root: string): string {
  const hash = createHash("sha256");
  const visit = (relative: string): void => {
    const path = join(root, relative);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw Error(`AUTHORITY_SOURCE_SYMLINK: ${relative}`);
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) visit(`${relative}/${name}`);
    } else if (stat.isFile()) hash.update(relative).update("\0").update(readFileSync(path)).update("\0");
    else throw Error(`AUTHORITY_SOURCE_TYPE: ${relative}`);
  };
  for (const path of [
    "src",
    "scripts",
    "data",
    "package.json",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "tsup.config.ts",
  ])
    visit(path);
  return hash.digest("hex");
}
export function assertCurrentAuthorityBundle(root: string, source: string): void {
  // esbuild retains the constant-folded fallback ternary when syntax minification is disabled.
  const embedded = /\bAUTHORITY_SOURCE_DIGEST\s*=\s*(?:false\s*\?\s*"unbuilt"\s*:\s*)?"([a-f0-9]{64})"/.exec(
    source,
  )?.[1];
  if (embedded !== authoritySourceDigest(root)) throw Error("AUTHORITY_BUILD_STALE: run pnpm build");
}
