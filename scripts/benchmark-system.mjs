// Profile real inputs as well as the synthetic scaling fixture; never dispatch a provider.
import childProcess, { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { cpus, totalmem } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
const [mode, arg, artifactRoot] = process.argv.slice(2);
if (mode === "worker") {
  let subprocesses = 0;
  // Count direct child launches by these real service calls, not a guessed constant.
  for (const name of ["spawn", "spawnSync", "execFile", "execFileSync", "fork"]) {
    const original = childProcess[name];
    childProcess[name] = new Proxy(original, {
      apply(target, receiver, args) {
        subprocesses++;
        return Reflect.apply(target, receiver, args);
      },
    });
  }
  syncBuiltinESMExports();
  const api = await import("../dist/index.js");
  const rows = [];
  for (const temperature of ["cold", "warm"]) {
    const start = performance.now();
    const startedProcesses = subprocesses;
    let result;
    if (arg === "registry") result = api.loadRegistry(process.cwd());
    else if (arg === "history-index")
      result = api.inspectRun(resolve("trials/durable-approval-outbox/cc267-claude-1"));
    else if (arg === "wallet-selection")
      result = api.routeFor("delegated-wallet-scope-reconciliation").scenarioParams();
    else if (arg === "memory-validation") result = api.builtFamily("prompt-injection-memory-poisoning").run();
    else if (arg === "one-family" || arg === "all-reports") {
      const { main } = await import("../dist/cli.js");
      const original = process.stdout.write;
      let stdout = "";
      try {
        process.stdout.write = (chunk) => {
          stdout += chunk;
          return true;
        };
        const args =
          arg === "one-family"
            ? ["family", "axis", "--family", "ui-replay-live-dom"]
            : ["all", "--out", join(artifactRoot, temperature)];
        if (main(args) !== 0) throw Error("report command failed");
      } finally {
        process.stdout.write = original;
      }
      if (arg === "all-reports") {
        const dir = join(artifactRoot, temperature);
        result = {
          files: readdirSync(dir)
            .sort()
            .map((path) => {
              const bytes = readFileSync(join(dir, path));
              return { path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
            }),
        };
      } else result = { stdout };
    } else throw Error("unknown worker");
    const bytes = JSON.stringify(result instanceof Map ? [...result] : result);
    rows.push({
      temperature,
      elapsedMs: performance.now() - start,
      maxRssKiB: process.resourceUsage().maxRSS,
      rssBytes: process.memoryUsage().rss,
      outputBytes: Buffer.byteLength(bytes),
      artifactBytes: result?.files?.reduce((n, file) => n + file.bytes, 0) ?? null,
      directSubprocesses: subprocesses - startedProcesses,
      digest: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  process.stdout.write(JSON.stringify(rows));
} else if (mode === "run" && arg) {
  const out = resolve(arg);
  mkdirSync(out, { recursive: false });
  const measurements = [];
  for (const name of [
    "registry",
    "history-index",
    "wallet-selection",
    "memory-validation",
    "one-family",
    "all-reports",
  ]) {
    const start = performance.now();
    const stdout = execFileSync(process.execPath, [import.meta.filename, "worker", name, out], {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    });
    measurements.push({
      name,
      workerSubprocesses: 1,
      totalMs: performance.now() - start,
      rows: JSON.parse(stdout),
    });
  }
  const result = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpu: cpus()[0].model,
    memoryBytes: totalmem(),
    revision: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
    sourceDigest: (await import("../dist/index.js")).authoritySourceDigest(process.cwd()),
    measurements,
    method:
      "fresh Node per workload, repeated direct calls within each worker; no cache shared between evidence operations",
    providerCallsMade: 0,
  };
  writeFileSync(join(out, "result.json"), `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify(result));
} else throw Error("usage: benchmark-system.mjs run FRESH_OUTPUT");
