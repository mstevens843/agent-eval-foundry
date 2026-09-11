// Provider-free preparation for five adaptive successor campaigns. This freezes the execution
// runtime, verifies the audited package bytes, and prepares all conditional single-call slots.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { campaignPlan, providerForTrial } from "./successor-adaptive-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const here = join(root, ".local/successor-adaptive-trials-2026-09-11");
const frozen = join(here, "frozen-source");
const auditPath = join(
  root,
  "reports/screening/evidence/2026-09-11-queue-eleven-fifteen-checker-audit.json",
);
const outputPath = join(
  root,
  "reports/screening/evidence/2026-09-11-successor-adaptive-trials-preparation.json",
);
const slotRunner = join(root, "scripts/run-successor-trial-slot.mjs");
const parentRunner = join(root, "scripts/run-successor-adaptive-trials.mjs");
const policyPath = join(root, "scripts/successor-adaptive-policy.mjs");
const retainedRuntime = join(root, ".local/next-five-successors-2026-09-10/runtime");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const ref = (path) => ({ path: relative(root, path), sha256: hash(path) });
const save = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
};

assert(!existsSync(outputPath), "Preparation already exists; verify it");
assert(
  !existsSync(join(here, "DISPATCH-CLAIM")),
  "A campaign dispatch exists; preparation cannot resume",
);
const plan = campaignPlan();
assert.equal(plan.tasks.length, 5);
assert.equal(plan.maxConcurrent, 6);
assert.equal(plan.maxProviderCalls, 30);
const audit = read(auditPath);
assert.equal(audit.providerCallsMade, 0);
assert.equal(audit.modelTrialsRun, 0);
assert.deepEqual(
  audit.packages.map((task) => task.id),
  plan.tasks.map((task) => task.id),
);

for (const task of plan.tasks) {
  const recorded = audit.packages.find((candidate) => candidate.id === task.id);
  assert(recorded, `Missing audited package: ${task.id}`);
  assert.equal(recorded.version, task.version, `Version changed: ${task.id}`);
  for (const file of recorded.sourceFiles) {
    const source = join(root, "tasks", task.id, file.path);
    assert.equal(hash(source), file.sha256, `Task source changed: ${task.id}/${file.path}`);
  }
}

mkdirSync(frozen, { recursive: true });
const sourcePaths = [
  "src",
  "scripts",
  "data",
  "package.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "tsup.config.ts",
];
const frozenFiles = [];
function capture(path) {
  const source = join(root, path);
  const target = join(frozen, path);
  const stat = lstatSync(source);
  assert(!stat.isSymbolicLink(), `Unexpected source symlink: ${path}`);
  if (stat.isDirectory()) {
    for (const name of readdirSync(source).sort()) capture(join(path, name));
  } else {
    mkdirSync(dirname(target), { recursive: true });
    cpSync(source, target);
    const sha256 = hash(source);
    assert.equal(hash(target), sha256);
    frozenFiles.push({ path, sha256, bytes: stat.size });
  }
}
for (const path of sourcePaths) capture(path);
capture("tasks/portfolio-runtime");
for (const task of plan.tasks) capture(join("tasks", task.id));
if (!existsSync(join(frozen, "node_modules"))) {
  cpSync(join(root, "node_modules"), join(frozen, "node_modules"), {
    recursive: true,
    verbatimSymlinks: true,
  });
}
const build = spawnSync("pnpm", ["build"], {
  cwd: frozen,
  encoding: "utf8",
  timeout: 180_000,
  maxBuffer: 8 * 1024 * 1024,
});
writeFileSync(join(here, "build.log"), `${build.stdout ?? ""}\n${build.stderr ?? ""}`);
assert.equal(build.status, 0, build.error?.message ?? build.stderr);
for (const file of frozenFiles) assert.equal(hash(join(frozen, file.path)), file.sha256);
const frozenApi = await import(pathToFileURL(join(frozen, "dist/index.js")));
const sourceDigest = frozenApi.executionSourceIdentity();
assert.equal(sourceDigest, frozenApi.authoritySourceDigest(frozen), "Frozen build identity mismatch");

const packageRecords = [];
for (const task of plan.tasks) {
  const recorded = audit.packages.find((candidate) => candidate.id === task.id);
  const artifact = join(here, "packages", task.id);
  const packageDirectory = join(artifact, "build");
  const assurancePath = join(artifact, "validation/assurance.json");
  mkdirSync(artifact, { recursive: true });
  let built;
  if (existsSync(packageDirectory) && existsSync(assurancePath)) {
    built = { digest: frozenApi.executionPackage(packageDirectory).snapshot.record.digest };
  } else {
    assert(
      !existsSync(packageDirectory) && !existsSync(join(artifact, "validation")),
      `Incomplete package artifact requires manual inspection: ${task.id}`,
    );
    built = await frozenApi.buildPortfolioPackage(
      frozen,
      task.id,
      packageDirectory,
      retainedRuntime,
    );
    await frozenApi.validatePortfolioPackage(
      packageDirectory,
      join(artifact, "validation"),
    );
  }
  const assurance = read(assurancePath);
  const pkg = frozenApi.executionPackage(packageDirectory);
  assert.equal(pkg.snapshot.record.digest, built.digest);
  assert.equal(assurance.packageDigest, built.digest);
  assert(assurance.results.length > 0 && assurance.results.every((result) => result.status === "pass"));
  packageRecords.push({
    ...task,
    packageDigest: built.digest,
    nativeDigest: recorded.nativeDigest,
    predecessorPackageDigest: recorded.foundryDigest,
    packageDirectory: relative(root, packageDirectory),
    assurancePath: relative(root, assurancePath),
    assurance: ref(assurancePath),
  });
}

mkdirSync(join(here, "slots"), { recursive: true });
const slots = [];
for (const task of packageRecords) {
  for (let trial = 1; trial <= 6; trial++) {
    const directory = join(here, "slots", task.id, `trial-${trial}`);
    const configPath = join(directory, "slot.json");
    const runRoot = join(directory, "real-campaign-frozen");
    const config = {
      schemaVersion: 1,
      id: task.id,
      version: task.version,
      trial,
      target: providerForTrial(trial),
      condition:
        trial === 1
          ? "initial"
          : trial === 6
            ? "five-prior-clean-failures"
            : "all-prior-counted-trials-clean-failed",
      analysisDocument: task.analysisDocument,
      packageDigest: task.packageDigest,
      packageDirectory: task.packageDirectory,
      assurancePath: task.assurancePath,
      frozenRoot: relative(root, frozen),
      runRoot: relative(root, runRoot),
      maxProviderCalls: 1,
      automaticRetries: false,
    };
    save(configPath, config);
    execFileSync(process.execPath, [slotRunner, "prepare", relative(root, configPath)], {
      cwd: root,
      stdio: "pipe",
      timeout: 60_000,
    });
    execFileSync(process.execPath, [slotRunner, "verify", relative(root, configPath)], {
      cwd: root,
      stdio: "pipe",
      timeout: 60_000,
    });
    const readyPath = join(runRoot, "READY.json");
    assert(!existsSync(join(runRoot, "DISPATCH-CLAIM")));
    slots.push({
      id: task.id,
      trial,
      target: config.target,
      condition: config.condition,
      config: ref(configPath),
      ready: ref(readyPath),
      runRoot: relative(root, runRoot),
    });
  }
}
assert.equal(slots.length, 30);
const preparation = {
  ...plan,
  date: "2026-09-11",
  purpose:
    "Run each hardened successor until its first valid pass or six clean failures; trials 1-3 Claude and 4-6 Codex",
  concurrencyNote:
    "Global ceiling is six. Five package loops start concurrently; one in-flight trial per package preserves stop-on-pass.",
  billingMode: "subscription-only",
  noPaidApiFallback: true,
  audit: ref(auditPath),
  runtime: {
    directory: relative(root, frozen),
    sourceDigest,
    bundleSha256: hash(join(frozen, "dist/index.js")),
    buildLog: ref(join(here, "build.log")),
    files: frozenFiles,
  },
  packageBuild:
    "Fresh build and protected assurance from the frozen merged source; predecessor audit digests retained separately",
  packages: packageRecords,
  slots,
  outputRoot: relative(root, here),
  files: {
    parentRunner: ref(parentRunner),
    slotRunner: ref(slotRunner),
    policy: ref(policyPath),
  },
  providerCallsMade: 0,
};
save(outputPath, preparation);
save(join(here, "READY.json"), {
  preparation: ref(outputPath),
  sourceDigest,
  slots: slots.length,
  maxConcurrent: 6,
  maxProviderCalls: 30,
  providerCallsMade: 0,
});
execFileSync(process.execPath, [parentRunner, "verify"], {
  cwd: root,
  stdio: "inherit",
  timeout: 180_000,
});
console.log(
  JSON.stringify({
    prepared: true,
    tasks: packageRecords.length,
    slots: slots.length,
    initialClaudePerTask: 3,
    initialCodexPerTask: 2,
    conditionalSixthProvider: "codex",
    maxConcurrent: 6,
    providerCallsMade: 0,
  }),
);
