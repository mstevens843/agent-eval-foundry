import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const ids = [
  "route-policy-repair",
  "browser-replay-repair",
  "recurring-calendar-repair",
  "workflow-authority-repair",
  "delegated-budget-repair",
];
const base = ".local/next-five-successors-2026-09-10";
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
function files(root) {
  return readdirSync(root, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => (e.isDirectory() ? files(join(root, e.name)) : e.isFile() ? [join(root, e.name)] : []));
}
const target = join(base, "baseline.json");
if (process.argv.includes("--verify")) {
  const before = JSON.parse(readFileSync(target, "utf8"));
  const changed = before.protected.filter((r) => !existsSync(r.path) || hash(r.path) !== r.sha256);
  const analysisPrefixes = before.originalAnalyses.map((r) => ({
    path: r.path,
    originalBytes: r.bytes,
    preserved: existsSync(r.path) && createHash("sha256").update(readFileSync(r.path).subarray(0, r.bytes)).digest("hex") === r.sha256,
  }));
  const result = { checkedFiles: before.protected.length, changed, analysisPrefixes, pass: changed.length === 0 && analysisPrefixes.every((r) => r.preserved) };
  writeFileSync(join(base, "preservation-result.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
  if (!result.pass) process.exitCode = 1;
} else {
  if (existsSync(target)) throw Error("Baseline already exists");
  const maintained = ids.flatMap((id) =>
    files(`tasks/${id}`).map((path) => {
      const frozen = path.replace(
        `tasks/${id}`,
        `.local/next-five-implementation-2026-09-09/release-ready/${id}/export/package`,
      );
      return {
        path,
        frozen,
        sha256: hash(path),
        matchesFrozen: existsSync(frozen) && hash(path) === hash(frozen),
      };
    }),
  );
  const roots = [
    ".local/next-five-implementation-2026-09-09/release-ready",
    ".local/next-five-implementation-2026-09-09/harbor-final",
    ...[
      "incremental-build-repair",
      "issued-report-repair",
      "variant-cache-repair",
      "snapshot-recovery-repair",
      "temporal-capacity-repair",
    ].map((id) => `tasks/${id}`),
    ".local/round-two-top-five-2026-09-09/frozen-source/dist",
  ];
  for (const id of ids)
    roots.push(
      `.local/${id === "route-policy-repair" ? "round-two-route-policy-retry" : "round-two-next-five"}-2026-09-09/real-campaign-frozen/jobs/real-provider/records/${id}-attempt-1/submission`,
    );
  const history = execFileSync("git", ["ls-files", "reports/screening"], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
  const analyses = [
    "third-five/14-route-policy-repair",
    "original-five/03-browser-replay-repair",
    "fourth-five/18-recurring-calendar-repair",
    "fourth-five/20-workflow-authority-repair",
    "original-five/04-delegated-budget-repair",
  ].map((p) => `reports/screening/${p}.md`);
  const paths = [...new Set([...roots.flatMap(files), ...history.filter((p) => !analyses.includes(p))])];
  const result = {
    date: "2026-09-10",
    head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    maintained,
    originalAnalyses: analyses.map((path) => ({
      path,
      bytes: readFileSync(path).length,
      sha256: hash(path),
    })),
    protected: paths.map((path) => ({ path, sha256: hash(path) })),
  };
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(result, null, 2) + "\n");
  console.log(
    JSON.stringify({
      maintained: maintained.length,
      mismatches: maintained.filter((r) => !r.matchesFrozen),
      protected: paths.length,
    }),
  );
  if (maintained.some((r) => !r.matchesFrozen)) process.exitCode = 1;
}
