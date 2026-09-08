// Local author controls only. Never imports a provider adapter or launches a model.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildPortfolioPackage, validatePortfolioPackage, exportPortfolioPackage } from "../dist/index.js";

const [outputArg, runtimeArg, mode = "validate"] = process.argv.slice(2);
if (!outputArg || !runtimeArg || !["validate", "export"].includes(mode))
  throw Error("usage: verify-next-portfolio.mjs FRESH_OUTPUT RETAINED_RUNTIME [validate|export]");
const root = process.cwd(),
  output = resolve(outputArg),
  runtime = resolve(runtimeArg);
const ids = [
  "partition-index-repair",
  "causal-replica-repair",
  "partial-release-repair",
  "ticket-consolidation-repair",
  "temporal-capacity-repair",
];
mkdirSync(output, { recursive: false });
const results = [];
for (const id of ids) {
  // Bounded single-container work. Yield shared capacity to the screening agent.
  const active = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
    encoding: "utf8",
    timeout: 15000,
  }).trim();
  if (active) throw Error("SHARED_DOCKER_BUSY: " + active);
  const start = Date.now(),
    directory = join(output, id);
  mkdirSync(directory);
  try {
    const record = await buildPortfolioPackage(root, id, join(directory, "build"), runtime);
    const assurance = await validatePortfolioPackage(join(directory, "build"), join(directory, "validation"));
    const passed = assurance.results.every((r) => r.status === "pass");
    if (passed && mode === "export")
      await exportPortfolioPackage(
        join(directory, "build"),
        join(directory, "export"),
        join(directory, "validation/assurance.json"),
      );
    results.push({
      id,
      packageDigest: record.digest,
      passed,
      milliseconds: Date.now() - start,
      results: assurance.results.map((r) => ({
        id: r.id,
        status: r.status,
        milliseconds: r.milliseconds,
        ...(r.status !== "pass" ? { detail: r.detail } : {}),
      })),
      decision: assurance.decision,
    });
  } catch (error) {
    results.push({ id, passed: false, milliseconds: Date.now() - start, error: String(error) });
  }
  writeFileSync(join(directory, "stage-summary.json"), JSON.stringify(results.at(-1), null, 2) + "\n", {
    flag: "wx",
  });
  console.log(JSON.stringify({ id, passed: results.at(-1).passed, milliseconds: Date.now() - start }));
}
writeFileSync(
  join(output, "summary.json"),
  JSON.stringify(
    {
      sourceBase: existsSync("candidate-source.json")
        ? JSON.parse(readFileSync("candidate-source.json", "utf8")).base
        : execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      providerCallsMade: 0,
      results,
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
if (results.some((r) => !r.passed)) process.exitCode = 1;
