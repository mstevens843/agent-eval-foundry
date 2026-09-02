// The checked-in challenge packages must match what the builders produce today.
//
// This exists because of a real miss during the truth-repair phase. Three families shipped a starter
// that was a complete passing solution; the fix landed in `src/challenge/*-package.ts`, and the new
// starter-must-fail gate went green — while `examples/families/*/challenge/` still held the OLD
// generated package. The gate was grading a stale artifact and would have kept grading it.
//
// Everything downstream reads the generated directory, not the builder: the package gate, the
// human-package claim, and every hash quoted in a report. So a generated package that has drifted
// from its builder is the same class of defect as a stale report, and gets the same treatment.
//
// The filename is legacy: this file began as a scratch probe and could not be renamed in place.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUILT_FAMILY_IDS } from "../src/families/registry.js";
import { prepareChallenge } from "../src/trials/run.js";

const ROOT = process.cwd();

describe("checked-in challenge packages are not stale", () => {
  for (const familyId of BUILT_FAMILY_IDS) {
    it(`${familyId} — every generated file matches its builder`, () => {
      const generatedDir = join(ROOT, "examples/families", familyId, "challenge");
      if (!existsSync(generatedDir)) return;

      const built = prepareChallenge(ROOT, familyId);
      const drifted: string[] = [];
      for (const file of built.pkg.files) {
        const onDisk = join(generatedDir, file.path);
        if (!existsSync(onDisk)) {
          drifted.push(`${file.path}: missing on disk`);
          continue;
        }
        if (readFileSync(onDisk, "utf8") !== file.content) drifted.push(`${file.path}: content differs`);
      }

      const regenerate = `node dist/cli.js challenge build --family ${familyId} --out examples/families/${familyId}/challenge`;
      expect(
        drifted,
        `${familyId}'s checked-in package has drifted from its builder — regenerate with \`${regenerate}\`. Anything grading the checked-in copy is grading a package the code no longer produces`,
      ).toEqual([]);
    });
  }
});
