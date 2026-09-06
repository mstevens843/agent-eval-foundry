/** Reproducible microbenchmarks, not an overall foundry throughput claim.
 * Build with tsup, then run with node. Baseline implementations are retained here
 * only to characterize the old algorithm; production uses src/foundry/sample.ts.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpus } from "node:os";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import {
  enumerateSpace,
  selectMeasuredSet,
} from "../src/families/delegated-wallet-scope-reconciliation/scenarios.js";
import {
  type ScenarioParams,
  buildScenarioFromParts,
} from "../src/families/delegated-wallet-scope-reconciliation/truth.js";
import { type SampleOptions, hash32, sampleSpace } from "../src/foundry/sample.js";

function legacySample<T>(items: readonly T[], options: SampleOptions<T>): readonly T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = options.groupOf?.(item) ?? "all";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const out: T[] = [];
  for (const key of [...groups.keys()].sort()) {
    const ranked = [...(groups.get(key) ?? [])].sort((a, b) => {
      const ha = hash32(options.keyOf(a));
      const hb = hash32(options.keyOf(b));
      return ha === hb ? options.keyOf(a).localeCompare(options.keyOf(b)) : ha - hb;
    });
    out.push(...ranked.slice(0, Math.max(1, Math.round(ranked.length * options.fraction))));
  }
  return out.sort((a, b) => options.keyOf(a).localeCompare(options.keyOf(b)));
}
const keyOf = (p: ScenarioParams) =>
  [
    p.seed,
    p.initialApprovedLimit,
    p.requestedAmount,
    p.authorityTransition,
    p.tokenState,
    p.cacheFreshness,
    p.priorSpend,
    p.policySource,
    p.requestSurface,
    p.repeatCount,
  ].join("|");
function eagerWallet(
  space: readonly ScenarioParams[],
  sample: typeof sampleSpace,
): readonly ScenarioParams[] {
  const map = new Map<string, ScenarioParams>();
  const add = (ps: readonly ScenarioParams[]) => {
    for (const p of ps) map.set(keyOf(p), p);
  };
  const rows = space.map((params) => ({ params, scenario: buildScenarioFromParts(params) }));
  add(
    sample(space, { keyOf, groupOf: (p) => `${p.authorityTransition}/${p.tokenState}`, fraction: 1 / 216 }),
  );
  add(
    sample(
      rows.filter((r) => r.scenario.expected.allowed).map((r) => r.params),
      { keyOf, groupOf: (p) => `${p.requestSurface}/${p.repeatCount}/${p.priorSpend}`, fraction: 1 / 12 },
    ),
  );
  add(
    sample(
      rows.filter((r) => r.scenario.expected.allowed && r.params.repeatCount === 2).map((r) => r.params),
      { keyOf, groupOf: (p) => `${p.requestSurface}/${p.requestedAmount}`, fraction: 1 / 4 },
    ),
  );
  add(
    sample(
      rows
        .filter(
          (r) =>
            r.params.authorityTransition === "downgraded" &&
            r.scenario.expected.reason === "DWS5_REQUEST_WITHIN_CURRENT_LIMIT",
        )
        .map((r) => r.params),
      {
        keyOf,
        groupOf: (p) => `${p.initialApprovedLimit}/${p.requestedAmount}/${p.cacheFreshness}`,
        fraction: 1 / 18,
      },
    ),
  );
  return [...map.values()].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
}

const [mode, variant, size] = process.argv.slice(2);
if (mode) {
  const operation = () => {
    if (mode === "wallet")
      return variant === "optimized"
        ? selectMeasuredSet(enumerateSpace())
        : eagerWallet(enumerateSpace(), variant === "baseline" ? legacySample : sampleSpace);
    const items = Array.from({ length: Number(size) }, (_, i) => String(i).padStart(8, "0"));
    return (variant === "baseline" ? legacySample : sampleSpace)(items, { keyOf: String, fraction: 0.05 });
  };
  operation();
  const runs = [];
  for (let i = 0; i < 3; i++) {
    global.gc?.();
    const before = process.memoryUsage();
    const start = performance.now();
    const out = operation();
    runs.push({
      milliseconds: performance.now() - start,
      selected: out.length,
      selectionDigest: createHash("sha256").update(JSON.stringify(out)).digest("hex"),
      before,
      after: process.memoryUsage(),
    });
  }
  console.log(
    JSON.stringify({ mode, variant, size: size ?? 82944, runs, maxRssKiB: process.resourceUsage().maxRSS }),
  );
} else {
  const specs = [
    ...[2000, 8000, 32000].flatMap((n) => ["baseline", "optimized"].map((v) => ["sampler", v, String(n)])),
    ...["baseline", "sampler-only", "optimized"].map((v) => ["wallet", v]),
  ];
  const results = specs.map((args) =>
    JSON.parse(
      execFileSync(process.execPath, ["--expose-gc", fileURLToPath(import.meta.url), ...args], {
        encoding: "utf8",
        maxBuffer: 2 * 1024 * 1024,
      }),
    ),
  );
  for (const mode of ["sampler", "wallet"]) {
    for (const size of mode === "wallet" ? [82944] : [2000, 8000, 32000]) {
      const hashes = new Set(
        results
          .filter((r) => r.mode === mode && Number(r.size) === size)
          .flatMap((r) => r.runs.map((v: { selectionDigest: string }) => v.selectionDigest)),
      );
      if (hashes.size !== 1) throw new Error("benchmark changed selection");
    }
  }
  console.log(
    JSON.stringify(
      {
        schemaVersion: 1,
        node: process.version,
        cpu: cpus()[0]?.model,
        platform: process.platform,
        arch: process.arch,
        scope:
          "Separate child per algorithm/size, one warmup, three measured repeats, GC before each. RSS is process high-water, not isolated algorithm memory. Wallet includes enumeration. No overall foundry speedup claim.",
        results,
      },
      null,
      2,
    ),
  );
}
