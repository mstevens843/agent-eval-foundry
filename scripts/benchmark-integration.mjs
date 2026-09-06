// Fresh-process measurements. No providers; output is an exclusive local proof artifact.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { cpus, platform, arch, totalmem } from "node:os";
import { performance } from "node:perf_hooks";
const [mode, output] = process.argv.slice(2);
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
if (mode === "matrix") {
  const { measure } = await import("../dist/index.js");
  const measurements = [];
  for (const [instances, subjects, patterns] of [
    [256, 16, 32],
    [512, 32, 128],
    [1000, 48, 512],
  ]) {
    const matrix = {
      schema: "agent-eval-foundry/matrix@1",
      suite: "profile",
      reference_subject: null,
      provenance: { caveat: "synthetic performance fixture, not task evidence" },
      subjects: Array.from({ length: subjects }, (_, i) => ({
        id: `s${i}`,
        label: `s${i}`,
        family: "fixture",
      })),
      instances: Array.from({ length: instances }, (_, i) => ({ id: `i${i}`, family: "fixture" })),
      results: {},
    };
    for (let i = 0; i < instances; i++)
      matrix.results[`i${i}`] = Object.fromEntries(
        matrix.subjects.map((s, j) => [
          s.id,
          (i + j) % 17 === 0
            ? null
            : { failed: (Math.imul((i % patterns) + 1, 1103515245) >>> (j % 25)) & 1 ? ["check"] : [] },
        ]),
      );
    for (const temperature of ["cold", "warm"]) {
      const start = performance.now();
      const result = measure(matrix, { nullTrials: 2, nullSeed: 71 });
      measurements.push({
        instances,
        subjects,
        patterns,
        distinct: result.distinctMeasurements,
        temperature,
        elapsedMs: performance.now() - start,
        rssBytes: process.memoryUsage().rss,
        maxRssKiB: process.resourceUsage().maxRSS,
        outputBytes: Buffer.byteLength(JSON.stringify(result)),
        digest: hash(result),
      });
    }
  }
  process.stdout.write(JSON.stringify(measurements));
} else if (mode === "run" && output) {
  const start = performance.now();
  const matrix = JSON.parse(
    execFileSync(process.execPath, [import.meta.filename, "matrix"], { maxBuffer: 8 * 1024 * 1024 }),
  );
  const proof = {
    schemaVersion: 1,
    revision: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
    node: process.version,
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0].model,
    memoryBytes: totalmem(),
    source: hash(
      ["src/axis-meter.ts", "src/catch-sets.ts", "src/similarity.ts", "src/null-model.ts"].map((p) => [
        p,
        readFileSync(p, "utf8"),
      ]),
    ),
    method:
      "fresh Node process, then repeated measurements; RSS includes V8; two seeded null trials; no process reuse across evidence cells",
    subprocesses: 1,
    elapsedMs: performance.now() - start,
    matrix,
  };
  writeFileSync(output, JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(proof, null, 2));
} else throw Error("usage: benchmark-integration.mjs run FRESH_OUTPUT");
