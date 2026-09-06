// Assemble intended tracked + nonignored source bytes, never HEAD with ambient dist linked in.
// This is a candidate snapshot, not a claim that an uncommitted tree is a committed release.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
const [destination, mode = "verify"] = process.argv.slice(2);
if (!destination || !["assemble", "verify"].includes(mode))
  throw Error("usage: candidate-snapshot.mjs NEW_DIRECTORY [assemble|verify]");
const root = process.cwd(),
  output = resolve(destination);
if (existsSync(output)) throw Error("SNAPSHOT_EXISTS");
const paths = [
  ...new Set(
    execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      maxBuffer: 16 * 1024 * 1024,
    })
      .toString()
      .split("\0"),
  ),
]
  .filter((p) => p && existsSync(p))
  .sort();
const hash = (b) => createHash("sha256").update(b).digest("hex");
const files = paths.map((path) => {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error(`unsupported source entry: ${path}`);
  if (path.split("/").some((p) => [".git", ".local", "node_modules", "dist"].includes(p)))
    throw Error(`private/generated dependency in manifest: ${path}`);
  return { path, bytes: stat.size, executable: !!(stat.mode & 0o111), sha256: hash(readFileSync(path)) };
});
mkdirSync(output, { recursive: true });
for (const f of files) {
  const target = join(output, f.path);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(f.path, target);
  assert.equal(hash(readFileSync(target)), f.sha256);
}
const manifest = {
  schemaVersion: 1,
  kind: "candidate-source-snapshot",
  base: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
  digest: hash(JSON.stringify(files)),
  files,
  ambientBuildReused: false,
  ignoredInputsIncluded: false,
};
writeFileSync(join(output, "candidate-source.json"), JSON.stringify(manifest, null, 2) + "\n", {
  flag: "wx",
});
if (mode === "verify") {
  const env = { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", CI: "true" };
  const run = (cmd, args) =>
    execFileSync(cmd, args, {
      cwd: output,
      env,
      encoding: "utf8",
      timeout: 1200000,
      maxBuffer: 16 * 1024 * 1024,
    });
  // Dependency cache is permitted; source, dist and evidence are never shared symlinks.
  const verification = [];
  for (const [cmd, args] of [
    ["pnpm", ["install", "--offline", "--frozen-lockfile"]],
    ["pnpm", ["typecheck"]],
    ["pnpm", ["lint"]],
    ["pnpm", ["build"]],
    ["node", ["dist/cli.js", "check"]],
  ]) {
    const start = Date.now();
    const stdout = run(cmd, args);
    verification.push({ command: [cmd, ...args], milliseconds: Date.now() - start, stdout });
  }
  const rendered = join(output, "candidate-rendered");
  run("node", ["dist/cli.js", "all", "--out", rendered]);
  for (const name of [
    "ship-gate-report.md",
    "ship-recommendation.md",
    "adversarial-readiness-report.md",
    "adversarial-audit-report.md",
    "evidence-snapshot.md",
    "human-readiness-report.md",
  ]) {
    const expected = join(root, "reports", name),
      actual = join(rendered, name);
    assert.equal(
      readFileSync(actual, "utf8"),
      readFileSync(expected, "utf8"),
      `${name}: recipient verdict differs`,
    );
  }
  writeFileSync(
    join(output, "candidate-verification.json"),
    JSON.stringify({ verification, sourceDigest: manifest.digest, providerCallsMade: 0 }, null, 2) + "\n",
    { flag: "wx" },
  );
}
console.log(
  JSON.stringify({
    directory: relative(root, output),
    kind: manifest.kind,
    digest: manifest.digest,
    files: files.length,
    bytes: files.reduce((s, f) => s + f.bytes, 0),
    mode,
  }),
);
