#!/usr/bin/env node
// A5 -- run the ported mechanical screens (2, 3, 4) against outcomes already known.
//
// The prediction registered in data/phase-6-preregistration.json before this ran: the screens kill
// the withdrawn families earlier and more cheaply than the foundry did, at a rate comparable to the
// source project's four-of-five-at-steps-1-to-3.
//
// Subjects are the BUILT families, taken through `builtFamily().sweep()` so the matrix carries the
// declared check universe. A matrix without `checks_declared` cannot be activation-audited at all --
// every check that never fired is invisible in it -- and that is reported as unmeasurable rather
// than as a clean sweep.
//
// Screen 1 is not here. It needs a written evidence chain adjudicated by readers who did not write
// it, so it lives in the derivation-test data rather than in a script that could grade its own work.

import { readFileSync } from "node:fs";
import {
  BUILT_FAMILY_IDS,
  activationAudit,
  builtFamily,
  corpusFromMatrix,
  identifiabilityCheck,
  leakAudit,
} from "../dist/index.js";

const ROOT = new URL("..", import.meta.url).pathname;

const targets = BUILT_FAMILY_IDS.map((id) => {
  const fam = builtFamily(id);
  return { id, matrix: fam.run().matrix };
});

// The durable outbox, which is the artifact both projects actually measured.
try {
  targets.push({
    id: "durable-outbox (shipped matrix)",
    matrix: JSON.parse(readFileSync(`${ROOT}examples/durable-outbox/matrix.json`, "utf8")),
  });
} catch {
  /* optional */
}

const rows = [];
for (const t of targets) {
  const m = t.matrix;
  const act = activationAudit(m);
  const corpus = corpusFromMatrix(m);
  const leak = leakAudit(t.id, corpus);
  const ident = identifiabilityCheck(t.id, corpus);
  const killedAt = !act.passed
    ? "activation"
    : !leak.passed
      ? "leak"
      : !ident.passed
        ? "identifiability"
        : null;
  rows.push({
    id: t.id,
    instances: m.instances.length,
    deadChecks: act.dead.filter((r) => r.kind === "check").length,
    totalChecks: act.records.filter((r) => r.kind === "check").length,
    deadKnobs: act.dead.filter((r) => r.kind === "knob").map((r) => r.name),
    leakPct: (leak.classifierAccuracy * 100).toFixed(1),
    basePct: (leak.majorityBaseline * 100).toFixed(1),
    collisions: ident.collisions.length,
    collidingRows: ident.collisions.reduce((n, c) => n + c.instanceIds.length, 0),
    killedAt,
    act,
    leak,
    ident,
  });
}

const W = 116;
console.log("PHASE 6 / A5 -- retrospective screen validation");
console.log("=".repeat(W));
console.log(
  `${"artifact".padEnd(40)} ${"inst".padStart(4)} ${"dead chk".padStart(9)} ${"dead knobs".padStart(24)} ${"tree/base".padStart(12)} ${"coll".padStart(5)}  killed at`,
);
console.log("-".repeat(W));
for (const r of rows) {
  console.log(
    `${r.id.slice(0, 40).padEnd(40)} ${String(r.instances).padStart(4)} ${`${r.deadChecks}/${r.totalChecks}`.padStart(9)} ${(r.deadKnobs.join(",") || "-").slice(0, 24).padStart(24)} ${`${r.leakPct}/${r.basePct}`.padStart(12)} ${`${r.collisions}/${r.collidingRows}`.padStart(5)}  ${r.killedAt ?? "SURVIVES"}`,
  );
}

const killed = rows.filter((r) => r.killedAt !== null);
console.log("-".repeat(W));
console.log(
  `${killed.length} of ${rows.length} artifacts killed by mechanical screens alone, with no model run and no trial paid for.`,
);
const byScreen = {};
for (const r of killed) byScreen[r.killedAt] = (byScreen[r.killedAt] ?? 0) + 1;
console.log(`   by screen: ${JSON.stringify(byScreen)}`);

console.log("\nWhy each was killed:");
for (const r of killed) {
  const v = r.killedAt === "activation" ? r.act : r.killedAt === "leak" ? r.leak : r.ident;
  console.log(`\n  ${r.id}  [${r.killedAt}]`);
  for (const reason of v.reasons.slice(0, 3)) console.log(`    - ${reason}`);
}

const survivors = rows.filter((r) => r.killedAt === null);
console.log(`\nSurvived all three mechanical screens: ${survivors.length}`);
for (const r of survivors) console.log(`  - ${r.id}`);
