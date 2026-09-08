// Required offline integration after explicit runtime setup. Authors are inert fixtures only.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, statfsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";
const exec = promisify(execFile);
const requested = process.argv[2];
if (!requested) throw Error("usage: verify-local-integration.mjs FRESH_OUTPUT");
const output = resolve(requested);
const api = await import("../dist/index.js");
// Two GiB/package for build and recipient archives plus six GiB reserve/build overhead.
const requiredBytes = (2 * (Object.keys(api.PORTFOLIO_PACKAGES).length + 1) + 6) * 1024 ** 3;
const space = statfsSync(process.cwd());
const availableBytes = space.bavail * space.bsize;
if (availableBytes < requiredBytes)
  throw Error(
    `INTEGRATION_STORAGE_INCOMPLETE: need ${requiredBytes} bytes free, found ${availableBytes} bytes`,
  );
mkdirSync(output, { recursive: false });
const stages = [];
const packages = [];
const storage = { initialAvailableBytes: availableBytes, minimumAvailableBytes: availableBytes };
async function stage(name, fn) {
  console.log(`integration: ${name}`);
  const started = performance.now();
  try {
    const before = api.assertStorageHeadroom(output, 0);
    storage.minimumAvailableBytes = Math.min(storage.minimumAvailableBytes, before);
    const result = await fn();
    const after = api.assertStorageHeadroom(output, 0);
    storage.minimumAvailableBytes = Math.min(storage.minimumAvailableBytes, after);
    stages.push({ name, status: "pass", elapsedMs: performance.now() - started });
    return result;
  } catch (e) {
    stages.push({ name, status: "fail", elapsedMs: performance.now() - started, error: String(e) });
    throw e;
  } finally {
    writeFileSync(
      join(output, "progress.json"),
      `${JSON.stringify({ stages, packages, storage, providerCallsMade: 0 }, null, 2)}\n`,
    );
  }
}
async function call(name, script, args) {
  const result = await exec(process.execPath, [script, ...args], {
    timeout: 3600000,
    maxBuffer: 4 * 1024 * 1024,
  });
  writeFileSync(join(output, `${name}.log`), `${result.stdout}\n${result.stderr}`, { flag: "wx" });
  return result;
}
const cli = resolve("dist/packages/local-cli.js");
try {
  const native = join(output, "native");
  const nativeExport = join(output, "native-export");
  await stage("native production and local assurance", () =>
    call("native", cli, ["produce", native, nativeExport]),
  );
  const repeat = join(output, "native-repeat");
  await stage("native repeat build", () => call("native-repeat", cli, ["build", repeat]));
  await stage("native byte-identical reproduction", () =>
    call("native-reproduction", resolve("scripts/verify-native-package-reproduction.mjs"), [
      native,
      repeat,
      nativeExport,
    ]),
  );
  packages.push({
    id: "caa-revalidation-repair",
    export: nativeExport,
    ...JSON.parse(readFileSync(join(nativeExport, "package.json"), "utf8")),
  });
  const runtime = join(output, "runtime");
  await stage("pinned portfolio runtime capture", () => api.preparePortfolioRuntime(process.cwd(), runtime));
  for (const id of Object.keys(api.PORTFOLIO_PACKAGES)) {
    const build = join(output, id);
    const validation = join(output, `${id}-validation`);
    const recipient = join(output, `${id}-export`);
    await stage(`${id} assembly`, () => api.buildPortfolioPackage(process.cwd(), id, build, runtime));
    await stage(`${id} complete controls and visible parity`, () =>
      api.validatePortfolioPackage(build, validation),
    );
    await stage(`${id} export`, () =>
      api.exportPortfolioPackage(build, recipient, join(validation, "assurance.json")),
    );
    packages.push({
      id,
      export: recipient,
      ...JSON.parse(readFileSync(join(recipient, "package.json"), "utf8")),
    });
  }
  const exports = packages.map((p) => p.export);
  await stage("unapproved reservations fail before dispatch", async () => {
    const store = new api.JobStore(join(output, "denied-jobs"));
    try {
      for (const path of exports.slice(0, 2)) {
        const pkg = api.executionPackage(path);
        assert.throws(
          () =>
            store.reserve(
              {
                id: pkg.snapshot.record.id,
                packageDigest: pkg.snapshot.record.digest,
                profileDigest: api.profileDigest(api.profileFor("codex", pkg.image, pkg.route)),
                realm: "real-provider",
                operation: "standard",
                slot: "unapproved",
                attempt: 1,
                retryOf: null,
                estimatedMicroUsd: 1,
                memoryMiB: 512,
                cpus: 1,
                outputBytes: 1024,
              },
              "no-such-approval",
              "inert-owner",
            ),
          /AUTHORIZATION_MISSING/,
        );
      }
      assert.equal(store.list().length, 0);
    } finally {
      store.close();
    }
  });
  await stage("all portfolio recipient controls", () =>
    call("recipients", resolve("scripts/verify-portfolio-exports.mjs"), [
      join(output, "recipients"),
      ...exports.slice(1),
    ]),
  );
  const go = (await exec("docker", ["inspect", "golang:1.25-bookworm", "--format", "{{.Id}}"])).stdout.trim();
  const execution = join(output, "execution");
  await stage("inert authoring capture recovery and regrade", () =>
    call("execution", resolve("scripts/verify-authorized-execution.mjs"), [
      exports[0],
      exports[1],
      go,
      execution,
    ]),
  );
  const learning = join(process.cwd(), ".local", "learning", `integration-${Date.now()}`);
  mkdirSync(join(process.cwd(), ".local", "learning"), { recursive: true });
  await stage("read-only findings corrections and transfer", () =>
    call("learning", resolve("scripts/verify-evidence-learning.mjs"), [...exports, execution, learning]),
  );
  const record = await api.inspectRun(join(execution, "jobs/simulation/records/browser-correct"));
  assert.equal(record.observation.newAgentAttempts, 0);
  const result = {
    schemaVersion: 1,
    status: "pass",
    stages,
    packages,
    storage,
    learning,
    providerCallsMade: 0,
    qualification: "pending independent human review, destination and explicitly authorized real trials",
  };
  writeFileSync(join(output, "result.json"), `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify(result));
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}
