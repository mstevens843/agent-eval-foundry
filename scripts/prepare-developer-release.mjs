import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requested = process.argv[2];
if (!requested) throw Error("Usage: pnpm release:prepare .local/NEW_RELEASE_DIRECTORY");
const output = resolve(requested);
if (!relative(root, output).startsWith(".local/")) throw Error("Release candidates belong in a new .local/ directory, outside tracked source");
if (existsSync(output)) throw Error(`OUTPUT_EXISTS: ${output}`);
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert.match(version, /^\d+\.\d+\.\d+$/);
mkdirSync(output, { recursive: true });
const name = `agent-eval-foundry-${version}`;
const source = join(output, name);
const run = (binary, args, cwd = root) => execFileSync(binary, args, {
  cwd, encoding: "utf8", timeout: 300000, maxBuffer: 16 * 1024 * 1024,
});
run(process.execPath, [join(root, "scripts/candidate-snapshot.mjs"), source, "assemble"]);
const snapshot = JSON.parse(readFileSync(join(source, "candidate-source.json"), "utf8"));
writeFileSync(join(source, "release-candidate.json"), `${JSON.stringify({ schemaVersion: 1, version,
  status: "release-candidate", sourceDigest: snapshot.digest, baseCommit: snapshot.base,
  guide: "docs/quickstart.md", providerCallsMade: 0,
  note: "Candidate source, not a claim that these changes are committed, tagged or published. Validate the extracted source before distribution." }, null, 2)}\n`);
const scan = run(process.execPath, [join(source, "scripts/secret-scan.mjs")], source);
writeFileSync(join(output, "secret-scan.log"), scan);
const archive = join(output, `${name}.tar.gz`);
run("tar", ["-czf", archive, "-C", output, name]);
const sha256 = createHash("sha256").update(readFileSync(archive)).digest("hex");
writeFileSync(join(output, "SHA256SUMS"), `${sha256}  ${name}.tar.gz\n`);
const result = { version, status: "release-candidate", sourceDigest: snapshot.digest,
  files: snapshot.files.length, archive, sha256, providerCallsMade: 0 };
writeFileSync(join(output, "release.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
