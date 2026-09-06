// Deterministic source inventory for execution handoffs, excluding generated proof outputs.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  maxBuffer: 8 * 1024 * 1024,
})
  .toString()
  .split("\0");
const files = [...new Set(paths)]
  .filter(
    (p) =>
      p &&
      existsSync(p) &&
      !p.startsWith("reports/") &&
      !p.startsWith("examples/") &&
      !p.startsWith("external-intake/") &&
      !p.startsWith("trials/") &&
      !p.startsWith("campaigns/"),
  )
  .sort()
  .map((path) => ({ path, sha256: hash(readFileSync(path)) }));
const historical = [...new Set(paths)]
  .filter((p) => p.startsWith("trials/") || p.startsWith("campaigns/") || p.startsWith("adversarial-audits/"))
  .sort()
  .map((path) => ({ path, sha256: hash(readFileSync(path)) }));
process.stdout.write(
  JSON.stringify(
    {
      schemaVersion: 1,
      base: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
      digest: hash(JSON.stringify(files)),
      files,
      historicalDigest: hash(JSON.stringify(historical)),
      historicalFiles: historical.length,
      historical,
    },
    null,
    2,
  ),
);
process.stdout.write("\n");
