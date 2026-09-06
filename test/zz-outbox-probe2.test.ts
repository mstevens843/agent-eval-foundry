import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUILT_FAMILY_IDS } from "../src/families/registry.js";
import { phase14ChallengeVariantRegistrations } from "../src/phase-14/packages.js";
import { readFamilyTrials } from "../src/trials/directory.js";
import { evidenceLedger } from "../src/trials/evidence-lifecycle.js";
import { assertStaleRunsLabelled } from "../src/trials/migration.js";
import { prepareChallenge } from "../src/trials/run.js";

describe("stale label audit", () => {
  it("rejects unlabelled current reports and requires explicit retained-document scope", () => {
    const ROOT = process.cwd();
    const variants = phase14ChallengeVariantRegistrations(ROOT);
    const ledgers = BUILT_FAMILY_IDS.map((id) =>
      evidenceLedger(
        id,
        prepareChallenge(ROOT, id).hash,
        readFamilyTrials(join(ROOT, "trials"), id),
        variants,
      ),
    );
    // These are manually authored historical narratives, never regenerated current views.
    // Their bodies are preserved; the mandatory notice withdraws current-package claims.
    const retained = new Set([
      "PHASE-1-TRUTH-REPAIR.md",
      "PHASE-3-CALIBRATION.md",
      "PHASE-4-SETTLED.md",
      "PHASE-7-ROW-FIVE.md",
      "PHASE-20-VERIFIER-TRUST-BOUNDARY.md",
      "PHASE-22-TRANSFER-AND-CONSTRUCTION.md",
    ]);
    const violations: string[] = [];
    for (const name of readdirSync(join(ROOT, "reports")).filter((f) => f.endsWith(".md"))) {
      const contents = readFileSync(join(ROOT, "reports", name), "utf8");
      if (retained.has(name)) {
        expect(contents.startsWith("> Historical report —"), name).toBe(true);
        expect(contents.split("\n")[0], name).toContain("not current-package qualification");
        continue;
      }
      try {
        assertStaleRunsLabelled(name, contents, ledgers);
      } catch (e) {
        violations.push(`${name}: ${String((e as Error).message)}`);
      }
    }
    expect(violations).toEqual([]);
  }, 900_000);
});
