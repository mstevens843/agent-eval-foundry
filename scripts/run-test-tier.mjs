import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { TIERS, testFiles, tierFor } from "./test-tiers.mjs";
const [tier, requestedOutput] = process.argv.slice(2);
if (![...TIERS, "all"].includes(tier)) throw Error("usage: run-test-tier.mjs TIER FRESH_OUTPUT");
const output = resolve(requestedOutput ?? `.local/test-runs/${tier}-${Date.now()}`);
mkdirSync(dirname(output), { recursive: true });
mkdirSync(output, { recursive: false });
const selected = testFiles().filter((p) => tier === "all" || tierFor(p) === tier);
if (!selected.length) throw Error("no tests selected");
const start = performance.now();
const { authoritySourceDigest, assertCurrentAuthorityBundle } = await import("../dist/index.js");
const sourceBefore = authoritySourceDigest(process.cwd());
if (tier === "all" || tier === "protected") {
  assertCurrentAuthorityBundle(process.cwd(), readFileSync("dist/trials/operation-authority.js", "utf8"));
  const probe = spawnSync(
    "docker",
    ["run", "--rm", "--pull=never", "--network=none", "node:22-alpine", "true"],
    { encoding: "utf8", timeout: 60_000, killSignal: "SIGKILL" },
  );
  writeFileSync(join(output, "runtime.log"), `${probe.stdout ?? ""}\n${probe.stderr ?? ""}`);
  if (probe.error || probe.status !== 0) {
    writeFileSync(
      join(output, "summary.json"),
      JSON.stringify(
        {
          tier,
          selected,
          status: "incomplete",
          reason: "required-runtime-unavailable",
          passed: 0,
          skipped: 0,
          providerCallsMade: 0,
        },
        null,
        2,
      ),
    );
    throw Error("REQUIRED_RUNTIME_UNAVAILABLE: protected coverage incomplete, not skipped");
  }
}
const report = join(output, "tests.json");
const result = spawnSync(
  "pnpm",
  ["exec", "vitest", "run", ...selected, "--reporter=json", `--outputFile=${report}`],
  {
    stdio: "inherit",
    env: { ...process.env, FOUNDRY_REQUIRE_CONTAINER: "1" },
    timeout: 90 * 60_000,
  },
);
if (result.error) throw result.error;
const json = JSON.parse(readFileSync(report, "utf8"));
const observed = json.testResults.flatMap((t) => t.assertionResults);
const skipped = observed.filter((a) => ["pending", "skipped", "todo"].includes(a.status));
const summary = {
  tier,
  selected,
  passed: json.numPassedTests,
  failed: json.numFailedTests,
  skipped: skipped.length,
  suitesFailed: json.numFailedTestSuites,
  elapsedMs: performance.now() - start,
  providerCallsMade: 0,
  sourceBefore,
  sourceAfter: authoritySourceDigest(process.cwd()),
};
writeFileSync(join(output, "summary.json"), JSON.stringify(summary, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(summary));
if (
  result.status !== 0 ||
  summary.failed ||
  summary.suitesFailed ||
  skipped.length ||
  !summary.passed ||
  summary.sourceBefore !== summary.sourceAfter
)
  process.exitCode = 1;
