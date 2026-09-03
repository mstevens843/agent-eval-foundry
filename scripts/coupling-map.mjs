#!/usr/bin/env node
// Lane F -- what each deletion target is actually holding on to.
//
// Net lines rose in Phases 5 and 6 because "delete probe-runner.ts" is not actionable when it has 23
// live exports across six consumers. The question this answers is narrower and useful: for each
// importer, WHICH exports does it need? If most need one or two, a seam exists.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TARGETS = ["src/foundry/probe-runner.ts", "src/adversarial-audit", "src/human-solvability"];

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = join(d, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name === "dist" ? [] : walk(p);
    return /\.(ts|mjs)$/.test(e.name) ? [p] : [];
  });

const files = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "test")), ...walk(join(ROOT, "scripts"))];
const text = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

const exportsOf = (path) => {
  const full = join(ROOT, path);
  const srcs = statSync(full).isDirectory() ? walk(full) : [full];
  const names = new Set();
  for (const s of srcs) {
    for (const m of readFileSync(s, "utf8").matchAll(
      /^export (?:const|function|class|interface|type|enum)\s+([A-Za-z_][A-Za-z0-9_]*)/gm,
    ))
      names.add(m[1]);
  }
  return [...names].sort();
};

for (const target of TARGETS) {
  const names = exportsOf(target);
  const full = join(ROOT, target);
  const own = new Set((statSync(full).isDirectory() ? walk(full) : [full]).map((f) => f));
  const lines = [...own].reduce((n, f) => n + readFileSync(f, "utf8").split("\n").length, 0);

  console.log(`\n${"=".repeat(96)}`);
  console.log(`${target}   ${lines} lines, ${names.length} exports`);
  console.log("=".repeat(96));

  const byImporter = new Map();
  for (const [f, t] of text) {
    if (own.has(f)) continue;
    const needed = names.filter((n) => new RegExp(`\\b${n}\\b`).test(t));
    if (needed.length > 0) byImporter.set(relative(ROOT, f), needed);
  }

  const rows = [...byImporter.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [f, needed] of rows) {
    const kind = f.startsWith("test/") ? "test" : f.startsWith("scripts/") ? "script" : "src";
    console.log(
      `  ${String(needed.length).padStart(3)}  ${kind.padEnd(6)} ${f.padEnd(50)} ${needed.slice(0, 4).join(", ")}${needed.length > 4 ? ", ..." : ""}`,
    );
  }
  const srcOnly = rows.filter(([f]) => f.startsWith("src/") && f !== "src/index.ts" && f !== "src/cli.ts");
  console.log(`\n  importers: ${rows.length}  (src, excluding index/cli: ${srcOnly.length})`);
  const singles = srcOnly.filter(([, n]) => n.length <= 2);
  console.log(`  src importers needing <= 2 exports: ${singles.length} of ${srcOnly.length}`);
  if (singles.length > 0) {
    console.log("  -> a seam exists for:");
    for (const [f, n] of singles) console.log(`       ${f}  needs only ${n.join(", ")}`);
  }
}
