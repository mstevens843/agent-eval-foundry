#!/usr/bin/env node
// B3 -- the 33 checks with no mutant aimed at them. Which are real gaps and which are structural?
//
// The enforcement screen measured "no mutant's INTENDED check is X", which is weaker than "X never
// fires". A mutant aimed at check A may fail check B incidentally. Crossing the two answers the
// sharper question: a check that no mutant targets AND that never fires against any subject has
// never been shown to discriminate at all.

import { BUILT_FAMILY_IDS, builtFamily } from "../dist/index.js";

// Checks that assert a property of the RUN rather than a rule a subject can violate on purpose.
// A mutant for one of these would have to break the harness, not the subject.
const STRUCTURAL = /mechanism_fired|deterministic|determinism|liveness|_present$|^checker_present/;

const rows = [];
for (const id of BUILT_FAMILY_IDS) {
  const fam = builtFamily(id);
  const sweep = fam.run();
  const m = sweep.matrix;
  const subjects = m.subjects.map((s) => s.id).filter((s) => s !== m.reference_subject);

  const everFired = new Set();
  for (const inst of m.instances)
    for (const s of subjects) {
      const cell = m.results[inst.id]?.[s];
      if (cell) for (const c of cell.failed) everFired.add(c);
    }

  const aimedAt = new Set(sweep.mutantsCaught.map((x) => x.check));
  for (const check of fam.checks) {
    if (aimedAt.has(check)) continue;
    rows.push({
      family: id,
      check,
      firesAnyway: everFired.has(check),
      structural: STRUCTURAL.test(check),
    });
  }
}

const W = 96;
console.log("PHASE 8 / B3 -- checks with no mutant aimed at them");
console.log("=".repeat(W));
console.log(`${"family".padEnd(38)} ${"check".padEnd(34)} ${"fires?".padStart(7)} ${"kind".padStart(12)}`);
console.log("-".repeat(W));
for (const r of rows)
  console.log(
    `${r.family.slice(0, 38).padEnd(38)} ${r.check.slice(0, 34).padEnd(34)} ${(r.firesAnyway ? "yes" : "NEVER").padStart(7)} ${(r.structural ? "structural" : "rule").padStart(12)}`,
  );
console.log("-".repeat(W));

const dead = rows.filter((r) => !r.firesAnyway);
const structural = rows.filter((r) => r.structural);
console.log(`\n${rows.length} checks with no mutant aimed at them.`);
console.log(`  of those, ${dead.length} ALSO never fire against any subject  <- the real gap`);
console.log(`  of those, ${structural.length} are structural (a mutant would have to break the harness)`);
console.log(`\nP4: a majority are structural -> ${structural.length > rows.length / 2 ? "HOLDS" : "FALSIFIED"} (${structural.length} of ${rows.length})`);
console.log("\nThe real gap - no mutant, and never fires:");
for (const r of dead) console.log(`  ${r.family}  ${r.check}  ${r.structural ? "(structural)" : "(RULE CHECK - nothing has ever shown it can fail anyone)"}`);
