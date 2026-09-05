#!/usr/bin/env node
// Build the blinded Phase 18 reader packet.
//
// The reader sees exactly what an agent sees, plus the verifier's check-to-section
// map, and nothing else. Withheld: the incident this came from, which line is
// wrong, the reference solution, the mutant bank, the fuzzer's scores, and the
// predicted yield. A reader who can be told the answer is not reviewing fairness.
//
//   phase18-reader-packet.mjs <out.json>
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

// Local build output and editor droppings are not part of any surface.
const IGNORED = /^(devauthority|certd|\.DS_Store|\.dockerignore)$|\.test$/;
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const TASK = join(ROOT, "tasks/caa-revalidation-repair");

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (!IGNORED.test(entry.name)) out.push(p);
  }
  return out.sort();
};

const publicFiles = [
  join(TASK, "instruction.md"),
  ...walk(join(TASK, "environment")),
].filter((f) => !f.endsWith(".DS_Store"));

const files = publicFiles.map((f) => ({
  path: relative(TASK, f),
  content: readFileSync(f, "utf8"),
}));

// The verifier's traceability map, read out of checks.py rather than retyped.
const checksSrc = readFileSync(join(TASK, "tests/checks.py"), "utf8");
const block = checksSrc.slice(checksSrc.indexOf("CHECK_SECTIONS = {"), checksSrc.indexOf("CHECK_IDS ="));
const traceability = [...block.matchAll(/"([a-z_]+)":\s*"([0-9,]+)"/g)].map(([, check, sections]) => ({
  check,
  semanticsSections: sections.split(",").map((s) => s.trim()),
}));

const base = {
  schema: "agent-eval-foundry/phase-18-reader-packet@1",
  reviewQuestion:
    "This is a candidate Terminal-Bench task: a repair task over a Go service, graded by a verifier in a " +
    "separate container. Judge its VALIDITY only. Is every graded behaviour traceable to a public " +
    "requirement, is the public text outcome-specified rather than solution-directed, is the task fair to a " +
    "competent engineer who reads only what is here, is the grading resistant to being satisfied without " +
    "doing the work, does it comply with the Terminal-Bench contribution rules, and are the hidden cases a " +
    "legitimate sampling of declared behaviour rather than new rules? Kill on the earliest dimension that " +
    "fails.",
  requiredDimensions: [
    "requirement traceability: every graded check enforces something the public text states",
    "outcome specification: the public text describes end states, not an implementation, a defect, or a repair",
    "fairness: the obligations are determinable by a competent engineer from the shipped text alone",
    "anti-cheat: the grading cannot be satisfied without performing the work the task describes",
    "terminal-bench compliance: instruction style, absolute paths, verifier isolation, determinism, binary reward",
    "hidden-scenario legitimacy: hidden cases vary only declared dimensions and introduce no unstated rule",
  ],
  blindedTo: [
    "the incident or source this candidate was derived from",
    "which behaviour is defective in the shipped service",
    "the reference solution",
    "the mutant bank",
    "scenario-search scores and selection statistics",
    "the predicted agent yield and the campaign decision",
    "the other reader's verdict",
  ],
  gradingContract: {
    note:
      "The verifier grades ten obligations per hidden scenario plus three suite-level checks. Each obligation " +
      "names the section of /app/spec/SEMANTICS.md it enforces; the mapping below is generated from the " +
      "verifier source. Hidden scenarios are sequences of orders against one authorization store, with a " +
      "per-identifier answer and answer latency chosen by the harness.",
    traceability,
    suiteLevelChecks: [
      "every scenario ran to completion",
      "every check names a SEMANTICS.md section and every graded section has a check",
      "at least one graded scenario saw the authority answer out of the order's own order",
    ],
  },
  publicPackage: files,
};

const sha256 = createHash("sha256").update(JSON.stringify(base)).digest("hex");
const packet = { ...base, packetSha256: sha256 };
writeFileSync(process.argv[2], `${JSON.stringify(packet, null, 2)}\n`);
console.log(`packet ${sha256}`);
console.log(`${files.length} public files, ${traceability.length} graded obligations`);
