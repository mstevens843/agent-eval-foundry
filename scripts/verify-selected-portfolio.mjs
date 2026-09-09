// Targeted package assurance. Full rebuild/export reproduction is an explicit release option.
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join, dirname } from "node:path";
import { buildPortfolioPackage, validatePortfolioPackage, exportPortfolioPackage, gradeChecker, materializeCandidate } from "../dist/index.js";
const [destination, retainedRuntime, ...args] = process.argv.slice(2);
const release = args.includes("--release");
const ids = args.filter((x) => x !== "--release");
if (!destination || !retainedRuntime || !ids.length) throw Error("Usage: verify-selected-portfolio.mjs FRESH_OUTPUT RUNTIME TASK... [--release]");
const output = resolve(destination), results = [];
const runtimeDirectory = statSync(retainedRuntime).isFile() ? dirname(resolve(retainedRuntime)) : resolve(retainedRuntime);
mkdirSync(output, { recursive: false });
for (const id of ids) {
  const directory = join(output, id);
  mkdirSync(directory);
  const record = await buildPortfolioPackage(process.cwd(), id, join(directory, "build"), runtimeDirectory);
  const assurance = await validatePortfolioPackage(join(directory, "build"), join(directory, "validation"));
  if (assurance.results.some((r) => r.status !== "pass")) throw Error(`Assurance failed: ${id}`);
  materializeCandidate(join(directory, "build"), join(directory, "oracle"), "reference");
  const checker = await gradeChecker(join(directory, "build"), join(directory, "oracle"), join(directory, "oracle-checker"));
  if (!checker.pass) throw Error(`Reference checker failed: ${id}`);
  if (release) {
    const repeated = await buildPortfolioPackage(process.cwd(), id, join(directory, "rebuild"), runtimeDirectory);
    if (record.digest !== repeated.digest) throw Error(`Rebuild drift: ${id}`);
    await exportPortfolioPackage(join(directory, "build"), join(directory, "export"), join(directory, "validation/assurance.json"));
  }
  results.push({ id, digest: record.digest, serviceAssurance: true, oracleChecker: checker, releaseExport: release });
  writeFileSync(join(output, "summary.json"), JSON.stringify({ results, providerCallsMade: 0 }, null, 2) + "\n");
  console.log(JSON.stringify({ id, passed: true, release }));
}
if (release) {
  const recipient = spawnSync(process.execPath, ["scripts/verify-portfolio-exports.mjs", join(output, "recipient"), ...ids.map((id) => join(output, id, "export"))], { stdio: "inherit", timeout: 1200000 });
  if (recipient.error || recipient.status !== 0) throw Error("Recipient reproduction failed");
  writeFileSync(join(output, "summary.json"), JSON.stringify({ results, recipientReproduction: true, providerCallsMade: 0 }, null, 2) + "\n");
}
