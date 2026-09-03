// The gate that would have caught the leaked starters, run against the live families.
//
// WHAT THIS ASSERTS AND WHY IT IS A SEPARATE FILE
//
// `test/trials.test.ts` pins the RULE — the 20% floor, the boundary, the refusal to certify on zero
// cells — against fixtures with an injected grader, in milliseconds. This file pins the FACT: that
// every shipped family's own visible `starter/subject.mjs`, graded by that family's real grader in
// real subprocesses, fails a large fraction of that family's own suite.
//
// Both are needed and neither substitutes for the other. A rule tested only against fixtures is a
// rule nobody has pointed at the repository; a fact asserted only in prose is not asserted at all.
//
// THE FAILURE THIS EXISTS TO CATCH
//
// Measured on 2026-09-01, failing scenarios over graded scenarios:
//
//     prompt-injection-containment           108 / 128
//     prompt-injection-memory-poisoning      288 / 288
//     ui-action-record-replay                174 / 324
//     ui-replay-live-dom                     479 / 864
//     checker-required-memory-poisoning      792 / 792
//     access-token-scope-expansion             0 / 384   <-- shipped a working answer
//     delegated-wallet-scope-reconciliation    0 / 804   <-- shipped a working answer
//     deployment-model-alias-rollout-drift     0 / 339   <-- shipped a working answer
//
// Three of eight families handed the agent a complete solution and called it a stub. Every existing
// leak rule passed all three, because those rules search for identifiers and these starters were
// clean reimplementations. Nothing in a filename or content blocklist can ever see that; the only
// check that can is running the thing.
//
// SLOW, ON PURPOSE, AND NOT SKIPPABLE
//
// This grades nine families in subprocesses and takes roughly 90 seconds. That is why the rule is
// not in `checkChallengePackage`, which runs on every build — but it is also why the rule cannot
// live only behind a CLI flag. This file is the enforcement point: it runs on every `pnpm test`, it
// has no skip condition, and a family that starts shipping its answer key fails here by name.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  STARTER_FILE,
  STARTER_MIN_FAILING_FRACTION,
  checkStarterFailsEnough,
} from "../src/challenge/package-check.js";
import { routeFor } from "../src/trials/router.js";

const ROOT = new URL("..", import.meta.url).pathname;

/**
 * The nine built, routable families. Written out rather than derived from a registry constant on
 * purpose: this is the list a reader can check against the repository by eye, and a family quietly
 * dropping out of a derived list would silently shrink the gate to whatever remained.
 */
const FAMILIES = [
  "prompt-injection-containment",
  "prompt-injection-memory-poisoning",
  "ui-action-record-replay",
  "ui-replay-live-dom",
  "checker-required-memory-poisoning",
  "access-token-scope-expansion",
  "delegated-wallet-scope-reconciliation",
  "dao-descendant",
  "deployment-model-alias-rollout-drift",
] as const;

const packageDir = (id: string): string => `${ROOT}examples/families/${id}/challenge`;

/**
 * The committed visible package, read from disk — the bytes an agent is actually handed.
 *
 * The whole tree rather than the starter alone: the rule materialises what it is given and grades
 * inside it, and a starter that imported a sibling visible file would otherwise fail for a reason
 * that has nothing to do with whether it solves the task.
 */
const visibleFiles = (id: string): readonly { path: string; content: string }[] => {
  const root = packageDir(id);
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    );
  return walk(root).map((abs) => ({ path: relative(root, abs), content: readFileSync(abs, "utf8") }));
};

describe("every family's shipped starter must fail its own suite", () => {
  it("every family ships a starter to grade — an absent one is a hole, not a pass", () => {
    const missing = FAMILIES.filter((id) => !existsSync(`${packageDir(id)}/${STARTER_FILE}`));
    expect(
      missing,
      `no ${STARTER_FILE} to grade for: ${missing.join(", ")}. A skipped family is an ungated family.`,
    ).toEqual([]);
  });

  for (const id of FAMILIES) {
    it(`${id} — starter fails at least ${(STARTER_MIN_FAILING_FRACTION * 100).toFixed(0)}% of its own suite`, () => {
      const result = checkStarterFailsEnough(id, visibleFiles(id), (p) => routeFor(id).grade(p));

      // Stated as an explicit assertion as well as via the throw, so the number is in the record
      // and a future regression reads as "3 of 384" rather than only "it threw".
      expect(
        result.failingFraction,
        [
          `${id} starter failed only ${result.failing}/${result.scenarios} scenarios`,
          `(${result.hostErrors} host error(s)); a stub that nearly passes is an answer key,`,
          "and this family is measuring transcription rather than the mechanism",
        ].join(" "),
      ).toBeGreaterThanOrEqual(STARTER_MIN_FAILING_FRACTION);

      // Not asserted: that `hostErrors` is zero. A stub that throws rather than returning a wrong
      // answer is a perfectly legitimate stub, and the three repairs in flight may well produce
      // one. The count is carried into the message above so a regression reads as "0 of 384, all
      // of them host errors" rather than only "it threw", but it is not itself a failure.
      expect(result.scenarios).toBeGreaterThan(0);
    }, 180_000);
  }
});
