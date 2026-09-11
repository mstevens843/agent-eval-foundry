import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(process.argv[2] ?? join(root, `.local/onboarding-${Date.now()}`));
if (existsSync(output)) throw Error(`Choose a new output directory: ${output}`);
mkdirSync(output, { recursive: true });
const cli = join(root, "dist/packages/local-cli.js");
const steps = [];
function run(label, binary, args, cwd = root, expectedExit = 0) {
  console.log(`Onboarding: ${label}`);
  const start = Date.now();
  const result = spawnSync(binary, args, { cwd, encoding: "utf8", timeout: 300000, maxBuffer: 8 * 1024 * 1024 });
  writeFileSync(join(output, `${label}.log`), `${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  assert.ifError(result.error);
  assert.equal(result.status, expectedExit, `${label}: ${result.stderr}; see ${output}/${label}.log`);
  steps.push({ label, passed: true, elapsedMs: Date.now() - start });
  return result.stdout;
}
const command = (label, args, cwd, status) => run(label, process.execPath, [cli, ...args], cwd, status);
const json = path => JSON.parse(readFileSync(path, "utf8"));
try {
  command("help", ["--help"]);
  command("portfolio-help", ["portfolio", "--help"]);
  command("unknown-task", ["portfolio", "build", "does-not-exist", "unused", "unused"], root, 1);
  const listing = JSON.parse(command("list", ["portfolio", "list"]));
  assert.equal(listing.tasks.length, 25);
  run("frozen-replay", process.execPath, [join(root, "examples/replays/premature-publication/replay.mjs")], output);
  const task = join(output, "source"), built = join(output, "built"), runtime = join(output, "runtime");
  const verification = join(output, "verification"), recipient = join(output, "recipient");
  command("create", ["task", "create", "onboarding-example", task]);
  // Exercise real source authoring outside tasks/: rename family/version before assembly.
  const manifest = json(join(task, "task.json"));
  manifest.familyId = "independent-author-example";
  manifest.version = "0.1.1";
  writeFileSync(join(task, "task.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  run("public-tests", process.execPath, ["--test", "test/example.test.mjs"], join(task, "public"));
  command("runtime", ["portfolio", "runtime", runtime]);
  command("doctor", ["doctor"]);
  command("build", ["task", "build", task, built, runtime]);
  command("validate", ["portfolio", "validate", built, verification]);
  const assurance = json(join(verification, "assurance.json"));
  assert(assurance.results.every(r => r.status === "pass"));
  assert(assurance.results.some(r => r.id === "alternative"));
  assert(assurance.results.some(r => r.id === "isolation"));
  const broken = join(output, "broken-grade");
  command("grade-starter", ["portfolio", "grade", built, join(task, "public"), broken]);
  assert(json(join(broken, "result.json")).cells.some(c => c.status === "semantic-fail" && c.failures.includes("latest_value")));
  const fixed = join(output, "fixed-submission");
  cpSync(join(task, "public"), fixed, { recursive: true });
  cpSync(join(task, "private/alternative/entry.mjs"), join(fixed, "entry.mjs"));
  command("grade-alternative", ["portfolio", "grade", built, fixed, join(output, "fixed-grade")]);
  assert(json(join(output, "fixed-grade/result.json")).cells.every(c => c.status === "semantic-pass"));
  command("export", ["portfolio", "export", built, recipient, join(verification, "assurance.json")]);
  assert(readFileSync(join(recipient, "README.md"), "utf8").includes("portfolio validate . recipient-check"));
  // Recipient owns its bundled CLI and frozen files; the working directory is outside the source checkout.
  const recipientCli = join(recipient, "package/tooling/local-cli.mjs");
  run("recipient-help", process.execPath, [recipientCli, "--help"], output);
  run("recipient-validate", process.execPath, [recipientCli, "portfolio", "validate", recipient, join(output, "recipient-check")], output);
  assert(json(join(output, "recipient-check/assurance.json")).results.every(r => r.status === "pass"));
  const config = { schemaVersion: 1, target: "codex", package: "built", receipt: "verification/assurance.json",
    store: "trial-jobs", runId: "example", authoringImage: json(join(runtime, "runtime.json")).image,
    wallSeconds: 60, memoryMiB: 2048, contractReviewed: false };
  const configFile = join(output, "trial.json");
  writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);
  const plan = JSON.parse(command("trial-plan", ["trial", "plan", configFile]));
  assert.equal(plan.providerCallsMade, 0);
  assert.equal(plan.maxAttempts, 1);
  command("trial-needs-execute", ["trial", "run", configFile], root, 1);
  command("trial-needs-review", ["trial", "run", configFile, "--execute"], root, 1);
  assert(!existsSync(join(output, "trial-jobs")));
  const summary = { schemaVersion: 1, passed: true, steps, assuranceChecks: assurance.results.length,
    providerCallsMade: 0, output, scope: "Fresh custom task, local grading, standalone export and trial planning; no real provider dispatch." };
  writeFileSync(join(output, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  writeFileSync(join(output, "summary.json"), `${JSON.stringify({ passed: false, steps, error: String(error), providerCallsMade: 0 }, null, 2)}\n`);
  throw error;
}
