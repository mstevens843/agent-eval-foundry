#!/usr/bin/env node
// Refuse to ship a credential.
//
// This exists because a live OAuth token reached a working session and the only reason nothing had
// to be scrubbed is that Harbor already stored it as a `${VAR}` placeholder. That was luck in the
// design, not a control. This is the control.
//
// Two properties matter more than coverage:
//
//  1. IT CAN FIRE. A scanner that has never matched anything is indistinguishable from a scanner
//     that cannot match anything. `--self-test` runs every pattern against a synthetic positive and
//     fails if any pattern is dead. CI runs the self-test before the scan.
//  2. IT NEVER PRINTS THE SECRET. A scanner whose output is itself a leak just moves the problem
//     into the CI log. Findings print a fingerprint: the non-secret prefix, the length, and a
//     SHA-256 head. That is enough to find it on disk and to tell two hits apart, and useless to
//     anyone reading the log.
//
// Placeholders are not findings. `${CLAUDE_CODE_OAUTH_TOKEN}`, `sk-ant-oat01-...`, `****`, and
// `<token>` are how the repository is SUPPOSED to refer to a credential, so a match whose body is
// structurally a placeholder is skipped and counted separately. If that count ever drops to zero
// the redaction convention has been abandoned, which is worth knowing.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

// Each pattern carries its own positive control. `probe` MUST match `positive` and MUST NOT match
// `placeholder`; --self-test enforces both directions, so a pattern cannot rot into a no-op.
const PATTERNS = [
  {
    id: "anthropic-oauth",
    what: "Anthropic long-lived OAuth token (claude setup-token)",
    probe: /sk-ant-oat[0-9]{2}-[A-Za-z0-9_-]{40,}/g,
    positive: `sk-ant-oat01-${"A".repeat(60)}`,
    placeholder: "sk-ant-oat01-<token>",
  },
  {
    id: "anthropic-api",
    what: "Anthropic API key",
    probe: /sk-ant-(?:api|admin)[0-9]{2}-[A-Za-z0-9_-]{40,}/g,
    positive: `sk-ant-api03-${"B".repeat(60)}`,
    placeholder: "sk-ant-api03-YOUR-KEY-HERE",
  },
  {
    id: "openai",
    what: "OpenAI API key",
    probe: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g,
    positive: `sk-proj-${"C".repeat(48)}`,
    placeholder: "sk-proj-...",
  },
  {
    id: "github",
    what: "GitHub token",
    probe: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
    positive: `ghp_${"d".repeat(36)}`,
    placeholder: "ghp_<redacted>",
  },
  {
    id: "aws",
    what: "AWS access key id",
    probe: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    positive: "AKIAIOSFODNN7EXAMPLE",
    placeholder: "AKIA<redacted-key-id>",
  },
  {
    id: "google",
    what: "Google API key",
    probe: /\bAIza[A-Za-z0-9_-]{35}\b/g,
    positive: `AIza${"E".repeat(35)}`,
    placeholder: "AIza<redacted>",
  },
  {
    id: "bearer",
    what: "Authorization header carrying a literal credential",
    // A real bearer value, not `Bearer ${token}` and not `Bearer <token>`.
    probe: /(?:Authorization|authorization)\s*[:=]\s*["'`]?\s*(?:Bearer|Basic)\s+(?!\$\{|<|\*|\.\.\.|"|'|`)[A-Za-z0-9+/=_-]{20,}/g,
    positive: `Authorization: Bearer ${"F".repeat(40)}`,
    placeholder: 'Authorization: Bearer ${token}',
  },
  {
    id: "private-key",
    what: "PEM private key block",
    probe: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g,
    positive: "-----BEGIN RSA PRIVATE KEY-----",
    placeholder: "-----BEGIN PUBLIC KEY-----",
  },
];

// Structurally a placeholder rather than a credential.
const PLACEHOLDER = /\$\{|<[a-zA-Z_-]+>|\*{3,}|\bREDACTED\b|\bredacted\b|\bEXAMPLE\b|YOUR[_-]|\bxxx+\b|\.\.\./;

// This file necessarily contains synthetic positives; so does its test. Scanning them would make the
// scanner permanently red, which is the fastest way to teach people to pass --no-verify.
const SELF = new Set(["scripts/secret-scan.mjs", "test/secret-scan.test.ts"]);

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".turbo", "coverage"]);

/** Every file git knows about, plus untracked ones git would accept. Ignored files are ignored. */
function candidateFiles() {
  const out = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.split("\n").filter((p) => p && !SKIP_DIRS.has(p.split("/")[0]));
}

/** Enough to locate the finding, useless to anyone who wants to use it. */
function fingerprint(match) {
  const head = match.slice(0, 12);
  const digest = createHash("sha256").update(match).digest("hex").slice(0, 12);
  return `${head}… len=${match.length} sha256:${digest}`;
}

function isBinary(buf) {
  return buf.includes(0);
}

function scanText(relPath, text, findings, skipped) {
  const lines = text.split("\n");
  for (const pattern of PATTERNS) {
    pattern.probe.lastIndex = 0;
    let m;
    while ((m = pattern.probe.exec(text)) !== null) {
      const value = m[0];
      const before = text.slice(0, m.index);
      const line = before.split("\n").length;
      const context = lines[line - 1] ?? "";
      if (PLACEHOLDER.test(value) || PLACEHOLDER.test(context)) {
        skipped.push({ path: relPath, line, id: pattern.id });
        continue;
      }
      findings.push({
        path: relPath,
        line,
        id: pattern.id,
        what: pattern.what,
        fingerprint: fingerprint(value),
      });
    }
  }
}

export function scanRepo() {
  const findings = [];
  const skipped = [];
  let scanned = 0;
  for (const rel of candidateFiles()) {
    if (SELF.has(rel)) continue;
    const abs = join(ROOT, rel);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue; // deleted between listing and read
    }
    if (!st.isFile() || st.size > 8 * 1024 * 1024) continue;
    const buf = readFileSync(abs);
    if (isBinary(buf)) continue;
    scanned += 1;
    scanText(rel, buf.toString("utf8"), findings, skipped);
  }
  // PATTERNS is ordered specific-to-generic and the generic `sk-` rule overlaps the Anthropic ones
  // on purpose, so that an unrecognised `sk-`-shaped credential is still caught. One secret should
  // still read as one finding: keep the first (most specific) hit per position.
  const seen = new Set();
  const deduped = findings.filter((f) => {
    const key = `${f.path}:${f.line}:${f.fingerprint.split(" ")[0]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { findings: deduped, skipped, scanned };
}

/** Prove every pattern still matches what it claims to, and still ignores placeholders. */
export function selfTest() {
  const dead = [];
  const overeager = [];
  for (const pattern of PATTERNS) {
    pattern.probe.lastIndex = 0;
    if (!pattern.probe.test(pattern.positive)) dead.push(pattern.id);
    const findings = [];
    const skipped = [];
    scanText("synthetic", pattern.placeholder, findings, skipped);
    if (findings.length > 0) overeager.push(pattern.id);
  }
  // And the whole pipeline end to end: a synthetic secret in a synthetic file must be reported.
  // One hit is enough. The generic `sk-` pattern deliberately overlaps the specific Anthropic one,
  // so a single token can legitimately trip two patterns; dedupe collapses that at report time.
  const endToEnd = [];
  scanText("synthetic", `const t = "${PATTERNS[0].positive}"`, endToEnd, []);
  return { dead, overeager, endToEndFired: endToEnd.length >= 1 };
}

function main() {
  const args = new Set(process.argv.slice(2));

  const st = selfTest();
  if (st.dead.length > 0 || !st.endToEndFired) {
    console.error("SECRET SCAN IS BROKEN — it cannot detect what it claims to detect.");
    if (st.dead.length > 0) console.error(`  patterns that no longer match their own positive: ${st.dead.join(", ")}`);
    if (!st.endToEndFired) console.error("  end-to-end: a synthetic secret was NOT reported");
    process.exit(2);
  }
  if (st.overeager.length > 0) {
    console.error(`SECRET SCAN IS TOO EAGER — these patterns flag their own placeholder: ${st.overeager.join(", ")}`);
    process.exit(2);
  }
  if (args.has("--self-test")) {
    console.log(`secret-scan self-test: ${PATTERNS.length} patterns live, placeholders ignored, end-to-end fires`);
    return;
  }

  const { findings, skipped, scanned } = scanRepo();

  if (findings.length === 0) {
    console.log(`secret-scan: clean (${scanned} files, ${PATTERNS.length} patterns, ${skipped.length} placeholders ignored)`);
    return;
  }

  console.error(`secret-scan: ${findings.length} CREDENTIAL(S) FOUND in ${scanned} files\n`);
  for (const f of findings) {
    console.error(`  ${f.path}:${f.line}  [${f.id}] ${f.what}`);
    console.error(`      ${f.fingerprint}`);
  }
  console.error(`
The value is fingerprinted, not printed: a scanner that echoes the secret has moved the leak into
the log. Use the path and line above.

Do NOT delete the file. Preserved artifacts are evidence, and a vanished transcript is worse than a
redacted one. The rule is in docs/TASK-FAMILY-MODEL.md under "Credential redaction":

  1. Rotate at the provider first. Assume disclosure.
  2. Replace the value in place with a stable marker, e.g. [REDACTED:anthropic-oauth].
  3. Record the redaction in the affected artifact's metadata so it is still accounted for.
`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
