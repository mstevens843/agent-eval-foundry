#!/usr/bin/env node
// Does this repository's evidence depend on this machine?
//
// The specific bug: `bundles/*/exploit/` and `submitted-bypass/` are empty ON PURPOSE, git cannot
// store an empty directory, and the fs-sandbox isolation check reads them. They existed here because
// somebody had run `adversarial prepare`. So every package-backed family read `adversarial-ready`
// locally and `audit-pending` on CI, and the generated reports differed between the two — while
// `pnpm verify`, whose whole claim is that a report can be reproduced, passed locally every time.
//
// `test/clone-fidelity.test.ts` catches that instance. This answers the general question, which is
// the one worth asking:
//
//     From a checkout containing ONLY what git tracks, does every gate reach the same verdict?
//
// The method is a real checkout, not an inspection: `git archive HEAD` into a temp directory, which
// by construction contains exactly the tracked files and nothing else. `node_modules` and `dist` are
// linked in rather than reinstalled — the question is which FILES the evidence needs, not which
// dependencies — and both are build outputs that git deliberately ignores.
//
// Anything that diverges is a claim resting on state somebody's machine happens to hold. That is the
// same defect class as the specification withdrawals this project spent four phases on: a rule that
// is true here and nowhere else, invisible precisely because it is true here.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

/** Reports whose content is a statement about gates rather than about the repository's prose. */
const GATE_REPORTS = [
  "ship-gate-report.md",
  "ship-recommendation.md",
  "adversarial-readiness-report.md",
  "adversarial-audit-report.md",
  "evidence-snapshot.md",
  "human-readiness-report.md",
];

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
}

function main() {
  const status = run("git", ["status", "--porcelain"], ROOT).trim();
  const lines = status.length === 0 ? [] : status.split("\n");
  const modified = lines.filter((l) => !l.startsWith("??"));
  if (modified.length > 0) {
    // A MODIFIED tracked file makes the comparison meaningless: `git archive HEAD` would describe
    // the last commit while `reports/` describes the working tree, and every difference would be
    // that gap rather than a machine dependency.
    console.error("REFUSING: tracked files are modified, so `git archive HEAD` does not describe what");
    console.error("is being compared. Commit or stash first.\n");
    console.error(modified.slice(0, 10).join("\n"));
    process.exit(2);
  }
  const untracked = lines.filter((l) => l.startsWith("??")).map((l) => l.slice(3));
  if (untracked.length > 0) {
    // Untracked files are NOT a reason to refuse — they are the thing being hunted. A clean checkout
    // will not have them, so if a gate reads one, this run is exactly what surfaces it.
    console.log(`clean-checkout: ${untracked.length} untracked path(s) will be absent from the checkout:`);
    for (const u of untracked.slice(0, 8)) console.log(`  ${u}`);
    console.log("");
  }

  const scratch = mkdtempSync(join(tmpdir(), "foundry-clean-"));
  const checkout = join(scratch, "repo");
  try {
    // Exactly the tracked files. Nothing this machine happens to hold on the side.
    run("mkdir", ["-p", checkout], scratch);
    execFileSync("sh", ["-c", `git -C ${JSON.stringify(ROOT)} archive HEAD | tar -x -C ${JSON.stringify(checkout)}`], {
      encoding: "utf8",
    });

    // Build outputs, not evidence: git ignores both on purpose, and reinstalling them would only
    // measure npm.
    for (const shared of ["node_modules", "dist"]) {
      if (existsSync(join(ROOT, shared))) symlinkSync(join(ROOT, shared), join(checkout, shared));
    }

    // The `cwd` here is the whole check. `src/cli.ts` takes its root from `process.cwd()`, so running
    // the linked `dist/cli.js` from anywhere else silently reads the REAL repository — including the
    // untracked state this exists to find — and reports zero divergence no matter what is missing.
    // An early version of this check did exactly that and passed vacuously.
    const out = join(scratch, "rendered");
    run("node", [join(checkout, "dist", "cli.js"), "all", "--out", out], checkout);

    const divergent = [];
    for (const name of GATE_REPORTS) {
      const here = join(ROOT, "reports", name);
      const there = join(out, name);
      if (!existsSync(here) || !existsSync(there)) {
        divergent.push({ name, why: "not rendered in one of the two checkouts" });
        continue;
      }
      const a = readFileSync(here, "utf8");
      const b = readFileSync(there, "utf8");
      if (a !== b) {
        const al = a.split("\n");
        const bl = b.split("\n");
        const first = al.findIndex((line, i) => line !== bl[i]);
        divergent.push({
          name,
          why: `differs from line ${first + 1}`,
          here: (al[first] ?? "").slice(0, 160),
          clean: (bl[first] ?? "").slice(0, 160),
        });
      }
    }

    const rendered = readdirSync(out).filter((n) => n.endsWith(".md")).length;
    if (divergent.length === 0) {
      console.log(
        `clean-checkout: ${GATE_REPORTS.length} gate report(s) identical from a tracked-files-only checkout ` +
          `(${rendered} reports rendered). No gate verdict depends on this machine.`,
      );
      return;
    }

    console.error(`clean-checkout: ${divergent.length} gate report(s) DIVERGE from a clean checkout.\n`);
    for (const d of divergent) {
      console.error(`  ${d.name}: ${d.why}`);
      if (d.here !== undefined) {
        console.error(`      here : ${d.here}`);
        console.error(`      clean: ${d.clean}`);
      }
    }
    console.error(`
Each divergence is a gate verdict that depends on state this machine holds and git does not carry.
Find the file or directory the gate reads, and commit it — do NOT relax the gate. An empty directory
that matters needs a \`.gitkeep\` saying why it matters.`);
    process.exit(1);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

main();
