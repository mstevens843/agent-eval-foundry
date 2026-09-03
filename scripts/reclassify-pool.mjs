#!/usr/bin/env node
// B1 -- reclassify the candidate pool against the calibration table.
//
// Registered prediction P3: most of the pool lands in rows 1-4 (p >= 0.80), which would explain the
// funnel's yield better than any scoring model in this repository. Kill signal 5 fires if fewer
// than 3 candidates land in rows 5-6.

import { readFileSync } from "node:fs";
import { CALIBRATION_TABLE, classify, summarisePool } from "../dist/index.js";

const pool = JSON.parse(readFileSync(new URL("../data/candidate-pool.json", import.meta.url), "utf8"));
const classifications = pool.map((c) => classify(c));
const s = summarisePool(classifications);

console.log("PHASE 6 / B1 -- candidate pool against the calibration table");
console.log("=".repeat(96));
console.log(`${"discovery shape".padEnd(38)} ${"p".padStart(11)} ${"n".padStart(4)}  worth building`);
console.log("-".repeat(96));
for (const row of CALIBRATION_TABLE) {
  const n = s.byShape[row.shape] ?? 0;
  console.log(
    `${row.shape.padEnd(38)} ${`${row.pLow}-${row.pHigh}`.padStart(11)} ${String(n).padStart(4)}  ${row.worthBuilding ? "YES" : "no"}`,
  );
}
console.log("-".repeat(96));
console.log(`total candidates: ${s.total}`);
const easy = CALIBRATION_TABLE.filter((r) => !r.worthBuilding).reduce(
  (n, r) => n + (s.byShape[r.shape] ?? 0),
  0,
);
console.log(`rows 1-4 (p >= 0.80, not worth building): ${easy}  (${((easy / s.total) * 100).toFixed(1)}%)`);
console.log(
  `rows 5-6 (the only interior):             ${s.worthBuilding}  (${((s.worthBuilding / s.total) * 100).toFixed(1)}%)`,
);
console.log();
console.log("Candidates in rows 5-6:");
for (const id of s.worthBuildingIds) {
  const c = classifications.find((x) => x.candidateId === id);
  console.log(`  ${id}`);
  console.log(`      ${c.shape}  ${c.evidence[0]}`);
}
console.log();
console.log(`P3 ${easy / s.total >= 0.5 ? "HOLDS" : "FAILS"}: ${easy} of ${s.total} land in rows 1-4.`);
console.log(
  `Kill signal 5 ${s.worthBuilding < 3 ? "FIRES" : "does not fire"}: ${s.worthBuilding} candidates in rows 5-6 (fires below 3).`,
);
