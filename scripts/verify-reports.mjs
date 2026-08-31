#!/usr/bin/env node
// Regenerate every checked-in report into a temp directory and diff it against what is committed.
//
// A report that cannot be reproduced is a report nobody can audit, so this is a build gate rather
// than a convenience. It exists as a script instead of a test because it exercises the CLI end to
// end -- the same path a user takes -- rather than the render functions the tests already cover.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = (args) =>
  execFileSync("node", ["dist/cli.js", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const tmp = mkdtempSync(join(tmpdir(), "foundry-verify-"));
let failures = 0;

const axis = [
  ["reports/durable-outbox-axis-report.md", ["report", "examples/durable-outbox/matrix.json"]],
  [
    "reports/public-swebench-verified-axis-report.md",
    [
      "report",
      "--import",
      "swebench",
      "--null-trials",
      "3",
      "examples/public-swebench-verified/swebench-verified.raw.json",
    ],
  ],
];
for (const [path, args] of axis) {
  const fresh = run(args);
  if (fresh !== readFileSync(path, "utf8")) {
    console.error(`STALE  ${path}`);
    failures += 1;
  } else console.log(`ok     ${path}`);
}

// The family artifacts are generated too, so they get the same treatment: regenerate and diff.
// Every built family's matrix and shape are here: a family whose axis count moves and whose shape
// does not is a build failure rather than a discrepancy someone notices in six months.
for (const [path, args] of [
  ["examples/families/prompt-injection-containment/matrix.json", ["family", "run"]],
  ["examples/families/prompt-injection-containment/scenarios.json", ["family", "scenarios"]],
  [
    "examples/families/prompt-injection-memory-poisoning/matrix.json",
    ["family", "run", "--family", "prompt-injection-memory-poisoning"],
  ],
  [
    "examples/families/ui-action-record-replay/matrix.json",
    ["family", "run", "--family", "ui-action-record-replay"],
  ],
  ["examples/families/ui-replay-live-dom/matrix.json", ["family", "run", "--family", "ui-replay-live-dom"]],
  [
    "examples/families/checker-required-memory-poisoning/matrix.json",
    ["family", "run", "--family", "checker-required-memory-poisoning"],
  ],
  [
    "examples/shapes/prompt-injection-memory-poisoning.json",
    ["family", "shape", "--family", "prompt-injection-memory-poisoning"],
  ],
  [
    "examples/shapes/ui-action-record-replay.json",
    ["family", "shape", "--family", "ui-action-record-replay"],
  ],
  ["examples/shapes/ui-replay-live-dom.json", ["family", "shape", "--family", "ui-replay-live-dom"]],
  [
    "examples/shapes/checker-required-memory-poisoning.json",
    ["family", "shape", "--family", "checker-required-memory-poisoning"],
  ],
]) {
  if (run(args) !== readFileSync(path, "utf8")) {
    console.error(`STALE  ${path}`);
    failures += 1;
  } else console.log(`ok     ${path}`);
}

// The challenge package is generated too. Regenerate into a temp dir and diff every file, because a
// package that silently drifts from the family it fronts is how an answer key leaks.
for (const [familyId, committedDir] of [
  ["prompt-injection-memory-poisoning", "examples/families/prompt-injection-memory-poisoning/challenge"],
  ["ui-action-record-replay", "examples/families/ui-action-record-replay/challenge"],
  ["ui-replay-live-dom", "examples/families/ui-replay-live-dom/challenge"],
  ["checker-required-memory-poisoning", "examples/families/checker-required-memory-poisoning/challenge"],
]) {
  const tmpDir = mkdtempSync(join(tmpdir(), "foundry-fam-"));
  run(["challenge", "build", "--family", familyId, "--out", tmpDir]);
  const walkDir = (dir, prefix = "") =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walkDir(join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`],
    );
  for (const rel of walkDir(tmpDir).sort()) {
    const committed = join(committedDir, rel);
    if (readFileSync(join(tmpDir, rel), "utf8") !== readFileSync(committed, "utf8")) {
      console.error(`STALE  ${committed}`);
      failures += 1;
    } else console.log(`ok     ${committed}`);
  }
}

const chalTmp = mkdtempSync(join(tmpdir(), "foundry-chal-"));
run(["challenge", "build", "--out", chalTmp]);
const walk = (dir, prefix = "") =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`],
  );
for (const rel of walk(chalTmp).sort()) {
  const committed = join("examples/families/prompt-injection-containment/challenge", rel);
  if (readFileSync(join(chalTmp, rel), "utf8") !== readFileSync(committed, "utf8")) {
    console.error(`STALE  ${committed}`);
    failures += 1;
  } else console.log(`ok     ${committed}`);
}

// CLI smoke paths. Not a diff — a check that every command the README documents still exists, exits
// zero, and says something. A query command that silently stopped working would be invisible to the
// report diffs above, because nothing regenerates from it.
//
// `trials campaign statsu` is here deliberately: a mistyped subcommand used to fall through to the
// plan listing and exit zero, which is worse than failing, and this asserts it now fails.
const SMOKE = [
  [["trials", "shared-bank"], /MEASURED|PARTIAL|REFUSED/],
  [["trials", "third-subject-plan"], /verdict/],
  [["trials", "quality"], /Submission quality/],
  [["trials", "self-check"], /Self-check behaviour/],
  [["trials", "providers"], /claude/],
  [["trials", "campaign", "status"], /campaign/],
  [["human", "readiness"], /Human readiness/],
  [["human", "solvability"], /Human solvability/],
  [["adversarial", "readiness"], /Adversarial verifier-integrity readiness/],
  [["adversarial", "report"], /Adversarial verifier-integrity audit/],
  [["adversarial", "v2", "report"], /Adversarial Audit v2/],
  [["adversarial", "container", "report"], /Adversarial container isolation/],
  [["adversarial", "import-report"], /Adversarial import evidence/],
  [["adversarial", "campaign", "ui-replay-live-dom"], /Threat Models/],
  [["adversarial", "replay", "live-dom-adversarial-codex-2026-08"], /Exploit replay/],
  [["adversarial", "triage", "live-dom-adversarial-codex-2026-08"], /Bypass triage/],
  [["adversarial", "isolate", "verify", "bundles/ui-replay-live-dom-adversarial"], /Isolation verification/],
  [
    ["adversarial", "isolate", "container", "verify", "bundles/ui-replay-live-dom-adversarial-container"],
    /Container isolation verification/,
  ],
  [["adversarial", "probe", "ui-replay-live-dom"], /Adversarial hardening probes/],
  [["browser-backed", "verify"], /Browser-backed measurement verification/],
  [["browser-backed", "report"], /ui-replay-browser-backed report/],
  [["browser-backed", "axis"], /ui-replay-browser-backed axis report/],
  [["family", "diagnose", "--family", "ui-action-record-replay"], /chain/],
  [["family", "evolve-scenarios", "--family", "ui-action-record-replay"], /chain/],
  [["ui", "replay", "upgrade"], /realism ladder/],
  [["check"], /registry OK/],
  [["ship"], /SHIP|NOT-READY|HOLD/],
];
for (const [args, expected] of SMOKE) {
  const label = args.join(" ");
  let out;
  try {
    out = run(args);
  } catch (err) {
    console.error(`SMOKE  \`${label}\` exited non-zero: ${String(err).split("\n")[0]}`);
    failures += 1;
    continue;
  }
  if (!expected.test(out)) {
    console.error(`SMOKE  \`${label}\` ran but its output does not match ${expected}`);
    failures += 1;
  } else console.log(`ok     cli: ${label}`);
}
try {
  run(["trials", "campaign", "statsu"]);
  console.error("SMOKE  a mistyped campaign subcommand exited zero instead of failing");
  failures += 1;
} catch {
  console.log("ok     cli: a mistyped campaign subcommand fails loudly");
}

// The adversarial campaign files are generated artifacts too. They are the threat model that
// decides what the attacker saw and which hashes can count, so a stale campaign file is a stale
// verifier-integrity claim.
const ADVERSARIAL_FAMILIES = [
  "checker-required-memory-poisoning",
  "prompt-injection-containment",
  "prompt-injection-memory-poisoning",
  "ui-action-record-replay",
  "ui-replay-live-dom",
];
for (const familyId of ADVERSARIAL_FAMILIES) {
  const generatedCampaign = run(["adversarial", "campaign", familyId, "--json"]);
  const committed = join("adversarial-audits", "campaigns", `${familyId}-adversarial.json`);
  if (generatedCampaign !== readFileSync(committed, "utf8")) {
    console.error(`STALE  ${committed}`);
    failures += 1;
  } else console.log(`ok     ${committed}`);
}

// The prepared external bundles are generated too, and they are the artifact a third party actually
// runs. A bundle that has drifted from the family it fronts would send someone off to measure a task
// this repository no longer produces, and its pinned challengeHash would then refuse the result they
// came back with -- after they had spent the money. So it gets the same regenerate-and-diff gate as
// everything else, including the challenge/ tree it carries.
const BUNDLE_TARGETS = [
  ["prompt-injection-containment", "external", "prompt-injection-containment-external"],
  ["prompt-injection-memory-poisoning", "external", "prompt-injection-memory-poisoning-external"],
  ["ui-action-record-replay", "external", "ui-action-record-replay-external"],
  ["ui-replay-live-dom", "external", "ui-replay-live-dom-external"],
  ["ui-replay-live-dom", "claude", "ui-replay-live-dom-claude"],
  ["ui-replay-live-dom", "claude-sonnet", "ui-replay-live-dom-claude-sonnet"],
  ["ui-replay-live-dom", "claude-haiku", "ui-replay-live-dom-claude-haiku"],
  ["ui-replay-live-dom", "gemini", "ui-replay-live-dom-gemini"],
  ["checker-required-memory-poisoning", "external", "checker-required-memory-poisoning-external"],
  ["checker-required-memory-poisoning", "claude", "checker-required-memory-poisoning-claude"],
  ["checker-required-memory-poisoning", "claude-sonnet", "checker-required-memory-poisoning-claude-sonnet"],
  ["checker-required-memory-poisoning", "claude-haiku", "checker-required-memory-poisoning-claude-haiku"],
  ["checker-required-memory-poisoning", "gemini", "checker-required-memory-poisoning-gemini"],
];
for (const [familyId, providerId, bundleDir] of BUNDLE_TARGETS) {
  const bunTmp = mkdtempSync(join(tmpdir(), "foundry-bundle-"));
  run(["trials", "campaign", "prepare", "--family", familyId, "--provider", providerId, "--out", bunTmp]);
  const walkBundle = (dir, prefix = "") =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walkBundle(join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`],
    );
  for (const rel of walkBundle(bunTmp).sort()) {
    const committed = join("bundles", bundleDir, rel);
    if (readFileSync(join(bunTmp, rel), "utf8") !== readFileSync(committed, "utf8")) {
      console.error(`STALE  ${committed}`);
      failures += 1;
    } else console.log(`ok     ${committed}`);
  }
}

// Verifier-integrity bundles carry a different objective from model trials: attack the grader rather
// than solve the task. They still pin the same public challenge package and must be reproducible.
for (const familyId of ADVERSARIAL_FAMILIES) {
  const advTmp = mkdtempSync(join(tmpdir(), "foundry-adv-bundle-"));
  run(["adversarial", "prepare", familyId, "--out", advTmp]);
  const walkAdversarialBundle = (dir, prefix = "") =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? walkAdversarialBundle(join(dir, e.name), `${prefix}${e.name}/`)
        : [`${prefix}${e.name}`],
    );
  for (const rel of walkAdversarialBundle(advTmp).sort()) {
    const committed = join("bundles", `${familyId}-adversarial`, rel);
    if (readFileSync(join(advTmp, rel), "utf8") !== readFileSync(committed, "utf8")) {
      console.error(`STALE  ${committed}`);
      failures += 1;
    } else console.log(`ok     ${committed}`);
  }
}

// Container/no-network bundles are generated separately from fs-sandbox bundles. The committed
// form deliberately records "smoke not run" so this diff is deterministic across machines where
// Docker may or may not be running; the runtime smoke is a separate command.
for (const familyId of ADVERSARIAL_FAMILIES) {
  const advTmp = mkdtempSync(join(tmpdir(), "foundry-adv-container-bundle-"));
  run(["adversarial", "isolate", "container", "prepare", familyId, "--out", advTmp]);
  const walkContainerBundle = (dir, prefix = "") =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? walkContainerBundle(join(dir, e.name), `${prefix}${e.name}/`)
        : [`${prefix}${e.name}`],
    );
  for (const rel of walkContainerBundle(advTmp).sort()) {
    const committed = join("bundles", `${familyId}-adversarial-container`, rel);
    if (readFileSync(join(advTmp, rel), "utf8") !== readFileSync(committed, "utf8")) {
      console.error(`STALE  ${committed}`);
      failures += 1;
    } else console.log(`ok     ${committed}`);
  }
}

// The scaffolded family artifacts are generated too. Regenerating into a temp directory and diffing
// catches the case where a shape changes and its checked-in scaffold silently does not.
// The scaffold's job is the paperwork an UNBUILT family needs before it earns build time, so the
// families scaffolded here are the three proposed variants nobody has built. The UI family used to
// be scaffolded too; it is a built family now, and a scaffold beside a real implementation is a
// second source of truth waiting to disagree with the first.
for (const variant of [
  "prompt-injection-capability-routing",
  "prompt-injection-cross-tool-escalation",
  "prompt-injection-approval-scope-drift",
]) {
  const varTmp = mkdtempSync(join(tmpdir(), "foundry-var-"));
  run(["scaffold", "--shape", `examples/shapes/${variant}.json`, "--out", varTmp]);
  for (const rel of readdirSync(varTmp).sort()) {
    const committed = join("examples/families", variant, "package", rel);
    if (readFileSync(join(varTmp, rel), "utf8") !== readFileSync(committed, "utf8")) {
      console.error(`STALE  ${committed}`);
      failures += 1;
    } else console.log(`ok     ${committed}`);
  }
}

// Every report `all` writes, diffed against what is committed. New reports are covered automatically
// by being written here, but the count is asserted so a report that stops being generated is caught
// rather than silently skipped.
run(["all", "--out", tmp]);
const EXPECTED_REPORTS = 70;
const generated = readdirSync(tmp);
if (generated.length !== EXPECTED_REPORTS) {
  console.error(`WRONG COUNT  \`all\` wrote ${generated.length} reports, expected ${EXPECTED_REPORTS}`);
  failures += 1;
}
// Nothing may sit in reports/ that no command regenerates: an orphan is a document that has stopped
// being checked and starts drifting the moment the code under it changes.
const covered = new Set([...generated, ...axis.map(([path]) => path.replace("reports/", ""))]);
for (const name of readdirSync("reports").filter((n) => !covered.has(n))) {
  console.error(`ORPHAN ${join("reports", name)} is committed but nothing regenerates it`);
  failures += 1;
}
for (const name of readdirSync(tmp).sort()) {
  const committed = join("reports", name);
  if (readFileSync(join(tmp, name), "utf8") !== readFileSync(committed, "utf8")) {
    console.error(`STALE  ${committed}`);
    failures += 1;
  } else console.log(`ok     ${committed}`);
}

if (failures > 0) {
  console.error(
    `\n${failures} generated artifact(s) differ from a fresh render. Run \`pnpm report && pnpm bundles\`.`,
  );
  process.exit(1);
}
console.log("\nall reports reproducible");
