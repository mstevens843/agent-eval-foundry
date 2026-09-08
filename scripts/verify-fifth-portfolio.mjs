// Complete offline cohort validation. No provider adapter, credentials, or model calls.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, statfsSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  buildPortfolioPackage,
  validatePortfolioPackage,
  exportPortfolioPackage,
  authoritySourceDigest,
} from "../dist/index.js";
const [destination, runtimeArg] = process.argv.slice(2);
if (!destination || !runtimeArg)
  throw Error("usage: verify-fifth-portfolio.mjs FRESH_OUTPUT RETAINED_RUNTIME");
const root = process.cwd(),
  output = resolve(destination),
  runtime = resolve(runtimeArg);
const ids = [
  "incremental-build-repair",
  "event-window-repair",
  "staged-allocation-repair",
  "diagnostic-transport-repair",
  "issued-report-repair",
];
const original = authoritySourceDigest(root),
  results = [];
mkdirSync(output, { recursive: false });
for (const id of ids) {
  const active = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
    encoding: "utf8",
    timeout: 15000,
  }).trim();
  // This cohort stays serial; unrelated users may use the shared Docker engine.
  // Never stop or remove their containers. Each child retains its own resource limits.
  if (active) console.log(JSON.stringify({ sharedContainersObserved: active.split("\\n") }));
  const space = statfsSync(output);
  if (space.bavail * space.bsize < 3 * 1024 ** 3) throw Error("STORAGE_HEADROOM_REQUIRED");
  const directory = join(output, id);
  mkdirSync(directory);
  const start = Date.now();
  try {
    const record = await buildPortfolioPackage(root, id, join(directory, "build"), runtime);
    const assurance = await validatePortfolioPackage(join(directory, "build"), join(directory, "validation"));
    if (!assurance.results.every((r) => r.status === "pass")) throw Error("LOCAL_ASSURANCE_FAILED");
    const repeated = await buildPortfolioPackage(root, id, join(directory, "rebuild"), runtime);
    if (repeated.digest !== record.digest) throw Error("PACKAGE_REBUILD_DRIFT");
    await exportPortfolioPackage(
      join(directory, "build"),
      join(directory, "export"),
      join(directory, "validation/assurance.json"),
    );
    results.push({
      id,
      packageDigest: record.digest,
      repeatedBuildDigest: repeated.digest,
      passed: true,
      operations: assurance.results.length,
      decision: assurance.decision,
      milliseconds: Date.now() - start,
    });
  } catch (e) {
    results.push({ id, passed: false, error: String(e), milliseconds: Date.now() - start });
  }
  writeFileSync(join(directory, "stage-summary.json"), JSON.stringify(results.at(-1), null, 2) + "\n", {
    flag: "wx",
  });
  writeFileSync(
    join(output, "progress.json"),
    JSON.stringify({ sourceBefore: original, results, providerCallsMade: 0 }, null, 2) + "\n",
  );
  console.log(JSON.stringify(results.at(-1)));
}
if (authoritySourceDigest(root) !== original) throw Error("SOURCE_CHANGED_DURING_VALIDATION");
if (results.every((r) => r.passed)) {
  const recipient = spawnSync(
    process.execPath,
    [
      "scripts/verify-portfolio-exports.mjs",
      join(output, "recipients"),
      ...ids.map((id) => join(output, id, "export")),
    ],
    { encoding: "utf8", timeout: 3600000, maxBuffer: 4 * 1024 * 1024 },
  );
  writeFileSync(join(output, "recipient.log"), (recipient.stdout ?? "") + "\n" + (recipient.stderr ?? ""), {
    flag: "wx",
  });
  if (recipient.error || recipient.status !== 0)
    throw Error("RECIPIENT_REPRODUCTION_FAILED:" + recipient.error);
}
const summary = {
  sourceBefore: original,
  sourceAfter: authoritySourceDigest(root),
  results,
  providerCallsMade: 0,
};
writeFileSync(join(output, "summary.json"), JSON.stringify(summary, null, 2) + "\n", { flag: "wx" });
if (results.some((r) => !r.passed)) process.exitCode = 1;
