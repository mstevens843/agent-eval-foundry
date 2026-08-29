#!/usr/bin/env node
// Regenerate every checked-in report into a temp directory and diff it against what is committed.
//
// A report that cannot be reproduced is a report nobody can audit, so this is a build gate rather
// than a convenience. It exists as a script instead of a test because it exercises the CLI end to
// end -- the same path a user takes -- rather than the render functions the tests already cover.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = (args) => execFileSync("node", ["dist/cli.js", ...args], { encoding: "utf8" });
const tmp = mkdtempSync(join(tmpdir(), "foundry-verify-"));
let failures = 0;

const axis = [
  ["reports/durable-outbox-axis-report.md", ["report", "examples/durable-outbox/matrix.json"]],
  [
    "reports/public-swebench-verified-axis-report.md",
    [
      "report",
      "--import",
      "swebench",
      "--null-trials",
      "3",
      "examples/public-swebench-verified/swebench-verified.raw.json",
    ],
  ],
];
for (const [path, args] of axis) {
  const fresh = run(args);
  if (fresh !== readFileSync(path, "utf8")) {
    console.error(`STALE  ${path}`);
    failures += 1;
  } else console.log(`ok     ${path}`);
}

// The family artifacts are generated too, so they get the same treatment: regenerate and diff.
for (const [path, args] of [
  ["examples/families/prompt-injection-containment/matrix.json", ["family", "run"]],
  ["examples/families/prompt-injection-containment/scenarios.json", ["family", "scenarios"]],
]) {
  if (run(args) !== readFileSync(path, "utf8")) {
    console.error(`STALE  ${path}`);
    failures += 1;
  } else console.log(`ok     ${path}`);
}

// The challenge package is generated too. Regenerate into a temp dir and diff every file, because a
// package that silently drifts from the family it fronts is how an answer key leaks.
const chalTmp = mkdtempSync(join(tmpdir(), "foundry-chal-"));
run(["challenge", "build", "--out", chalTmp]);
const walk = (dir, prefix = "") =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`],
  );
for (const rel of walk(chalTmp).sort()) {
  const committed = join("examples/families/prompt-injection-containment/challenge", rel);
  if (readFileSync(join(chalTmp, rel), "utf8") !== readFileSync(committed, "utf8")) {
    console.error(`STALE  ${committed}`);
    failures += 1;
  } else console.log(`ok     ${committed}`);
}

run(["all", "--out", tmp]);
for (const name of readdirSync(tmp).sort()) {
  const committed = join("reports", name);
  if (readFileSync(join(tmp, name), "utf8") !== readFileSync(committed, "utf8")) {
    console.error(`STALE  ${committed}`);
    failures += 1;
  } else console.log(`ok     ${committed}`);
}

if (failures > 0) {
  console.error(`\n${failures} report(s) differ from a fresh render. Run \`pnpm report\`.`);
  process.exit(1);
}
console.log("\nall reports reproducible");
