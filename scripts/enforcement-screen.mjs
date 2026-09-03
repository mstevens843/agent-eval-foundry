#!/usr/bin/env node
// D1 -- the enforcement screen. For every rule a family PUBLISHES, does any check enforce it?
//
// Every screen this repository has built points at the specification. Class B1 in DEFECT-TAXONOMY --
// a stated rule no check enforces -- points the other way, at the verifier, and it has appeared three
// times independently by accident. Nothing looks for it on purpose.
//
// The cause is general and worth naming: END-STATE CHECKS CANNOT CATCH TRANSIENT VIOLATIONS. A rule
// about what must never happen DURING a run is invisible to a check that inspects the run's final
// state, and most checks inspect final state because that is the easy thing to write.
//
// Registered prediction P2 / kill signal 3: this finds at least one more instance. If it finds zero
// the screen is wrong, because the class has already appeared three times.
//
// The mechanical part: a family's `ruleCodes` are the rule identifiers its SPEC publishes verbatim,
// and its `checks` are what the verifier can fail a subject on. A published rule whose identifier is
// never referenced by any check name, and whose subject matter appears in no check, is decoration.

import { BUILT_FAMILY_IDS, builtFamily } from "../dist/index.js";

// The FIRST version of this screen matched rule-code names against check names and reported 17
// findings. Every one was a false positive from a naming-convention mismatch: `prompt-injection-
// containment` publishes DECISION REASON CODES (`P5_SECRET_EGRESS`) and enforces all of them through
// one generic check (`block_reason_correct`) that compares a decision's reason against truth. There
// is even a mutant, `secretExfiltrator`, built to violate P5 specifically. A screen that reported
// 8-of-8 unenforced for that family was measuring naming, not enforcement.
//
// The brief asked for the constructive test and the constructive test is what the mutant bank IS: a
// subject that violates one rule and nothing else, run against the real verifier, with the check
// that caught it recorded. So the question becomes mechanical and the data already exists --
// A RULE IS ENFORCED IF SOME MUTANT VIOLATES IT AND IS CAUGHT.
const rows = [];
for (const id of BUILT_FAMILY_IDS) {
  const fam = builtFamily(id);
  const sweep = fam.run();
  const caught = sweep.mutantsCaught;
  const uncaught = caught.filter((m) => !m.caught);
  // Checks that no mutant is aimed at: nothing has ever demonstrated they can fail a subject.
  const aimedAt = new Set(caught.map((m) => m.check));
  const unexercised = fam.checks.filter((c) => !aimedAt.has(c));
  rows.push({
    id,
    nCodes: fam.ruleCodes.length,
    nChecks: fam.checks.length,
    nMutants: caught.length,
    uncaught: uncaught.map((m) => `${m.mutantId} -> ${m.check}`),
    unexercised,
  });
}

const W = 100;
console.log("PHASE 7 / D1 -- the enforcement screen");
console.log("=".repeat(W));
console.log(
  `${"family".padEnd(38)} ${"checks".padStart(6)} ${"mutants".padStart(7)} ${"uncaught".padStart(8)} ${"unexercised checks".padStart(18)}`,
);
console.log("-".repeat(W));
for (const r of rows) {
  console.log(
    `${r.id.slice(0, 38).padEnd(38)} ${String(r.nChecks).padStart(6)} ${String(r.nMutants).padStart(7)} ${String(r.uncaught.length).padStart(8)} ${String(r.unexercised.length).padStart(18)}`,
  );
}
console.log("-".repeat(W));

const withFindings = rows.filter((r) => r.uncaught.length > 0 || r.unexercised.length > 0);
const total = rows.reduce((n, r) => n + r.uncaught.length + r.unexercised.length, 0);
console.log(`\n${total} finding(s) across ${withFindings.length} family(ies).\n`);
for (const r of withFindings) {
  console.log(`  ${r.id}`);
  for (const c of r.uncaught) console.log(`     UNCAUGHT MUTANT  ${c}`);
  for (const c of r.unexercised)
    console.log(`     UNEXERCISED      ${c}  (no mutant is aimed at it, so nothing shows it can fail anyone)`);
}

console.log(
  `\nP2 / kill signal 3: ${total > 0 ? "does NOT fire" : "FIRES"} - ${total} finding(s) (fires at zero).`,
);
if (total === 0) console.log("  The class has appeared three times by accident, so a screen finding none is wrong.");
