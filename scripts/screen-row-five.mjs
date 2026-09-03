#!/usr/bin/env node
// C2/C4 -- screen the generated instances of the row-5 shape.
//
// Registered prediction P3 / kill signal 4: the shape is generative, and at least 5 candidates
// survive. If fewer do, the central hypothesis of Phase 7 is refuted and the screens are NOT lowered.

import { readFileSync } from "node:fs";
import { screenRowFive, simulateRecoverVsRecompute } from "../dist/index.js";

const cands = JSON.parse(readFileSync(new URL("../data/row-five-candidates.json", import.meta.url), "utf8"));
const results = cands.map((c) => ({ c, r: screenRowFive(c) }));

const W = 104;
console.log("PHASE 7 / C4 -- the row-5 shape, screened");
console.log("=".repeat(W));
console.log(`${"candidate".padEnd(30)} ${"domain".padEnd(22)} ${"verdict".padEnd(20)} p`);
console.log("-".repeat(W));
for (const { c, r } of results) {
  const p = r.pBand ? `${r.pBand[0]}-${r.pBand[1]}` : "-";
  console.log(`${c.id.padEnd(30)} ${c.domain.slice(0, 22).padEnd(22)} ${r.verdict.padEnd(20)} ${p}`);
}
const survivors = results.filter(({ r }) => r.verdict === "row-five");
console.log("-".repeat(W));
console.log(`${survivors.length} of ${results.length} have the shape.`);

console.log("\nWhy each non-survivor was rejected:");
for (const { c, r } of results.filter((x) => x.r.verdict !== "row-five")) {
  console.log(`  ${c.id}  [${r.verdict}]`);
  console.log(`     ${r.reasons[0]}`);
}

// The mechanical demonstration: recover vs recompute, against an idempotent authority.
console.log("\nThe shape, demonstrated rather than asserted:");
for (const strategy of ["recover", "recompute"]) {
  const t = simulateRecoverVsRecompute({
    stableId: "action-1",
    valueBefore: "idem::action-1::req-1::0",
    valueAfter: "idem::action-1::req-1::1",
    strategy,
  });
  console.log(
    `  ${strategy.padEnd(10)} external effects=${t.externalEffects}  local check passes=${t.localCheckPasses}  graded as failure=${t.gradedAsFailure}`,
  );
}
console.log("\n  The local check is green in BOTH strategies. That is the whole mechanism.");
console.log(
  `\nP3 / kill signal 4: ${survivors.length >= 5 ? "does NOT fire" : "FIRES"} - ${survivors.length} survivors (fires below 5).`,
);
