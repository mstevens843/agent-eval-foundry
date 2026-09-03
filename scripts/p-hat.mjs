#!/usr/bin/env node
// E1 -- p-hat with a 95% interval per family, and both bars derived from it.
//
// The reframing INHERITED-EVIDENCE 1.1 forces: do not estimate p from the calibration table's prior
// when trials exist. Six clean zero-solve trials bound p <= 0.39; twelve bound it <= 0.22. Six cannot
// distinguish p = 0.05 from p = 0.35, which is an argument for more trials on a SCREENED candidate,
// not for abandoning the bar.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TRIALS = join(ROOT, "trials");

// Rule of three, and its generalisation: with 0 solves in n trials the 95% upper bound is 1-0.05^(1/n).
const upper95 = (n) => (n === 0 ? 1 : 1 - 0.05 ** (1 / n));
// Jeffreys point estimate for 0 successes in n: (0+0.5)/(n+1).
const jeffreys = (n) => 0.5 / (n + 1);
const p6 = (p) => (1 - p) ** 6;
const p5plus = (p) => (1 - p) ** 6 + 6 * p * (1 - p) ** 5;

const rows = [];
for (const fam of readdirSync(TRIALS).sort()) {
  const dir = join(TRIALS, fam);
  if (!existsSync(dir)) continue;
  let counted = 0;
  let solves = 0;
  for (const run of readdirSync(dir)) {
    const cf = join(dir, run, "countability.json");
    const rf = join(dir, run, "result.json");
    if (!existsSync(cf) || !existsSync(rf)) continue;
    try {
      const c = JSON.parse(readFileSync(cf, "utf8"));
      const r = JSON.parse(readFileSync(rf, "utf8"));
      if (c.counts !== true && c.counted !== true) continue;
      if (r.subjectType !== "agent") continue;
      counted++;
      const failed = (r.cells ?? []).some((x) => (x.failed ?? []).length > 0);
      if (!failed) solves++;
    } catch {
      /* skip unreadable */
    }
  }
  if (counted > 0) rows.push({ fam, counted, solves });
}

const W = 96;
console.log("PHASE 7 / E1 -- p-hat per family, from counted agent trials");
console.log("=".repeat(W));
console.log(`${"family".padEnd(38)} ${"n".padStart(3)} ${"solves".padStart(6)} ${"p<=95%".padStart(8)} ${"p-hat".padStart(7)} ${"P(6/6)".padStart(8)} ${"P(>=5/6)".padStart(9)}`);
console.log("-".repeat(W));
for (const r of rows.sort((a, b) => b.counted - a.counted)) {
  if (r.solves > 0) {
    console.log(`${r.fam.slice(0, 38).padEnd(38)} ${String(r.counted).padStart(3)} ${String(r.solves).padStart(6)}   (solved - bound does not apply)`);
    continue;
  }
  const u = upper95(r.counted);
  const j = jeffreys(r.counted);
  console.log(
    `${r.fam.slice(0, 38).padEnd(38)} ${String(r.counted).padStart(3)} ${String(r.solves).padStart(6)} ${u.toFixed(3).padStart(8)} ${j.toFixed(3).padStart(7)} ${p6(j).toFixed(3).padStart(8)} ${p5plus(j).toFixed(3).padStart(9)}`,
  );
}
console.log("-".repeat(W));
const best = Math.max(0, ...rows.filter((r) => r.solves === 0).map((r) => r.counted));
console.log(`\nMost counted zero-solve trials on any one family: ${best}`);
console.log(`Its 95% upper bound on p: ${upper95(best).toFixed(3)}`);
console.log(`\nFor reference, the shipped outbox task: 12 clean trials, 0 solves -> p <= ${upper95(12).toFixed(3)}`);
console.log(`P5: no family bounds p below 0.39 -> ${best >= 6 ? "FALSIFIED" : "HOLDS"} (needs 6+ clean zero-solve trials to reach 0.39)`);
