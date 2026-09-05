#!/usr/bin/env node
// Phase 18's focused verification gate.
//
// Phase 18's claim is not "the agents failed" — they did not. Its claim is that a
// specific construction bundle was transferred faithfully and still produced no
// difficulty. That claim only survives if the package that was graded is the
// package on disk, if the numbers in the report come from the generated artifacts,
// and if Phase 17's evidence was corrected in interpretation rather than rewritten.
// This gate checks exactly that, and nothing about the repository at large.
//
//   verify-phase-18.mjs [--campaign <dir>]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const argCampaign = (() => {
  const i = process.argv.indexOf("--campaign");
  return i > -1 ? process.argv[i + 1] : null;
})();

let failures = 0;
let skipped = 0;
const ok = (m) => console.log(`ok     ${m}`);
const bad = (m) => {
  console.error(`FAIL   ${m}`);
  failures += 1;
};
const skip = (m) => {
  console.log(`skip   ${m}`);
  skipped += 1;
};
const check = (cond, m) => (cond ? ok(m) : bad(m));

// ---------------------------------------------------------------- 1. artifacts
const ARTIFACTS = [
  "data/phase-18-preregistration.json",
  "data/phase-18-construction-comparison.json",
  "data/phase-18-package-lock.json",
  "data/phase-18-package-controls.json",
  "data/phase-18-scenario-selection.json",
  "data/phase-18-fuzz-results.json",
  "data/phase-18-reader-reviews.json",
  "data/phase-18-operator-bundle.json",
  "data/phase-18-trial-ledger.json",
  "data/phase-18-lazy-repair-probe.json",
];
for (const path of ARTIFACTS) {
  if (!existsSync(join(ROOT, path))) bad(`${path} is missing`);
  else {
    try {
      const d = read(path);
      check(typeof d.schema === "string" && d.schema.startsWith("agent-eval-foundry/"), `${path} parses and names its schema`);
    } catch (e) {
      bad(`${path} is not valid JSON: ${e.message}`);
    }
  }
}

// ------------------------------------------------- 2. the graded package is frozen
const lock = read("data/phase-18-package-lock.json");
const tmp = join(mkdtempSync(join(tmpdir(), "p18-")), "lock.json");
execFileSync("node", [join(ROOT, "scripts/phase18-lock.mjs"), tmp], { stdio: ["ignore", "ignore", "pipe"] });
const fresh = JSON.parse(readFileSync(tmp, "utf8"));
// Every surface that decided a trial must be byte-identical. `mutants` is verifier-side
// research material that grew after the campaign (the lazy-repair probe); it is
// excluded here on purpose and the probe file records the drift explicitly.
for (const name of ["challenge", "selected", "balanced", "controls", "verifier", "solution"]) {
  check(lock.surfaces[name].sha256 === fresh.surfaces[name].sha256, `${name} surface still hashes to its frozen value`);
}
const probe = read("data/phase-18-lazy-repair-probe.json");
check(
  probe.ran_after_the_campaign?.surfaces?.mutants?.to === fresh.surfaces.mutants.sha256,
  "the mutants surface matches the value the probe recorded when it moved it",
);

// -------------------------------------------- 3. every counted trial names that package
const ledger = read("data/phase-18-trial-ledger.json");
const counted = ledger.attempts.filter((a) => a.counts);
check(counted.length > 0, "the ledger holds at least one countable attempt");
for (const a of counted) {
  check(a.challengeSha256 === lock.surfaces.challenge.sha256, `${a.job} was graded against the frozen challenge`);
  check(a.selectedSha256 === lock.surfaces.selected.sha256, `${a.job} was graded against the frozen selected suite`);
}
check(
  ledger.attempts.every((a) => a.counts || typeof a.countabilityReason === "string"),
  "every non-counting attempt states why it does not count",
);

// ------------------------------------------------------ 4. artifacts regenerate
if (argCampaign && existsSync(argCampaign)) {
  const out = join(mkdtempSync(join(tmpdir(), "p18-")), "ledger.json");
  execFileSync("node", [join(ROOT, "scripts/phase18-ledger.mjs"), argCampaign, out], { stdio: ["ignore", "ignore", "pipe"] });
  check(
    readFileSync(out, "utf8") === readFileSync(join(ROOT, "data/phase-18-trial-ledger.json"), "utf8"),
    "the trial ledger regenerates byte for byte from the preserved jobs",
  );
} else {
  skip("ledger regeneration (pass --campaign <dir>; the Harbor jobs live outside the repository)");
}
if (existsSync(join(ROOT, "reports/PHASE-18-CAA-V2.md"))) {
  const out = join(mkdtempSync(join(tmpdir(), "p18-")), "report.md");
  execFileSync("node", [join(ROOT, "scripts/phase18-report.mjs"), out], { stdio: ["ignore", "ignore", "pipe"] });
  check(
    readFileSync(out, "utf8") === readFileSync(join(ROOT, "reports/PHASE-18-CAA-V2.md"), "utf8"),
    "the report regenerates byte for byte from the artifacts",
  );
} else {
  skip("report regeneration (reports/PHASE-18-CAA-V2.md not written yet)");
}

// --------------------------------------------------------- 5. claim discipline
const prereg = read("data/phase-18-preregistration.json");
for (const rule of ["ELIGIBLE-FOR-5-OF-6", "BUNDLE-DID-NOT-TRANSFER", "INCONCLUSIVE", "INVALID"]) {
  check(Boolean(prereg.decisionRules[rule]), `a decision rule exists for ${rule}`);
}
check(/written after/i.test(prereg.processDeviation), "the preregistration records its own process deviation");
const bundle = read("data/phase-18-operator-bundle.json");
check(
  bundle.elements.every((e) => e.status !== "measured-difficulty"),
  "no bundle element claims a measured difficulty effect",
);

// ------------------------------------------------------- 6. the probe's own claim
check(probe.verdict === "ASSERTION-HELD", "the lazy-repair probe records its verdict");
for (const id of ["serial-repair", "mutex-serialized"]) {
  const r = probe.results[id];
  check(r && r.selected.reward === 0 && r.balanced.reward === 0, `${id} scores zero on both frozen suites`);
}
check(probe.results.reference.selected.reward === 1, "the reference still passes the selected suite");

// ------------------------------------------- 7. Phase 17 evidence is not rewritten
const p17 = read("data/phase-17-trial-ledger.json");
check(p17.summary.countable === 4 && p17.summary.cleanSolves === 4, "Phase 17 still records 4/4 clean solves");
check(p17.decision === "VALID-BUT-EASY", "Phase 17 still records its own decision");
check(existsSync(join(ROOT, "reports/PHASE-17-CAA-VALIDATION.md")), "the Phase 17 report is still present");

// --------------------------------------------------- 8. no credential material
const CRED = /(sk-ant-[a-z0-9-]{6,}|CLAUDE_CODE_OAUTH_TOKEN\s*=\s*\S|"access_token"\s*:\s*"[^"]{12,})/;
const scan = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) scan(p);
    else if (/phase-18|PHASE-18/.test(e.name) && CRED.test(readFileSync(p, "utf8"))) bad(`${p} contains credential material`);
  }
};
scan(join(ROOT, "data"));
if (existsSync(join(ROOT, "reports"))) scan(join(ROOT, "reports"));
ok("no Phase 18 artifact carries credential material");

console.log(`\n${failures === 0 ? "PHASE 18 VERIFIED" : `PHASE 18 FAILED (${failures})`}${skipped ? `, ${skipped} skipped` : ""}`);
process.exit(failures === 0 ? 0 : 1);
