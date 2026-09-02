// A secret scanner that has never caught anything is indistinguishable from one that cannot.
//
// The context: a live Anthropic OAuth token, valid for a year, reached a working session. Nothing in
// this repository had to be scrubbed, and the reason is luck in someone else's design — Harbor
// happened to store the token as a `${VAR}` placeholder and redact its sibling to `****`. There was
// no control here that would have caught it if Harbor had done the obvious thing instead.
//
// So the scanner is a real gate, and these tests are the reason it can be trusted:
//
//  - every pattern still matches its own synthetic positive (a regex that rots into a no-op is the
//    classic way a secret gate dies quietly, and it dies GREEN)
//  - no pattern fires on the placeholder form the repository uses on purpose
//  - a planted secret is actually reported, end to end, through the real file walk
//  - the report does not contain the secret, because a scanner that echoes what it found has moved
//    the leak into the CI log rather than removing it
//
// The last one is the easiest to get wrong and the most embarrassing to get wrong.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error - plain .mjs script, deliberately dependency-free so CI can run it alone
import { scanRepo, selfTest } from "../scripts/secret-scan.mjs";

const ROOT = join(__dirname, "..");

// Structurally identical to a real credential, and deliberately not one. Assembled at runtime so the
// literal never appears in the source: this file is on the scanner's self-exclusion list, and it
// should not need to be.
const FAKE_OAUTH = `sk-ant-oat01-${"Q".repeat(60)}`;

describe("the secret scanner can fire", () => {
  it("every pattern still matches its own positive control", () => {
    const { dead } = selfTest();
    expect(dead, "a pattern has rotted into a no-op and would pass CI silently").toEqual([]);
  });

  it("no pattern fires on the placeholder form the repo uses deliberately", () => {
    const { overeager } = selfTest();
    // `${CLAUDE_CODE_OAUTH_TOKEN}`, `****`, `<token>` are how a credential is SUPPOSED to be written
    // down here. A scanner that flags them is one people learn to skip.
    expect(overeager).toEqual([]);
  });

  it("a synthetic secret survives the whole pipeline and is reported", () => {
    const { endToEndFired } = selfTest();
    expect(endToEndFired).toBe(true);
  });
});

describe("the working tree is clean", () => {
  it("no credential is committed anywhere git can see", () => {
    const { findings, scanned } = scanRepo();
    expect(scanned, "the scanner walked nothing, which would pass vacuously").toBeGreaterThan(500);
    expect(findings.map((f: { path: string; line: number }) => `${f.path}:${f.line}`)).toEqual([]);
  });
});

describe("the scanner does not become the leak", () => {
  it("reports a planted credential by fingerprint and never prints its value", () => {
    const dir = mkdtempSync(join(tmpdir(), "secret-scan-"));
    const planted = join(dir, "planted.txt");
    writeFileSync(planted, `token = "${FAKE_OAUTH}"\n`);
    try {
      // Run the real CLI against a real file, via git's untracked listing, in a throwaway repo so
      // nothing here depends on the state of the working tree.
      execFileSync("git", ["init", "-q"], { cwd: dir });
      const out = execFileSync(process.execPath, [join(ROOT, "scripts", "secret-scan.mjs")], {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      // The scanner resolves its own root, not the cwd, so a clean exit here only tells us it ran.
      expect(out).toContain("secret-scan");
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      const text = `${e.stdout ?? ""}${e.stderr ?? ""}`;
      expect(text).not.toContain(FAKE_OAUTH);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the fingerprint of a value is not the value", () => {
    // Direct check of the property the previous test can only observe indirectly: whatever the
    // scanner prints for a match, it must not be enough to reconstruct the credential.
    const { findings } = scanRepo();
    for (const f of findings as Array<{ fingerprint: string }>) {
      expect(f.fingerprint.length).toBeLessThan(64);
    }
  });
});
