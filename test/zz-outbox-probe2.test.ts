import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import { BUILT_FAMILY_IDS } from "../src/families/registry.js";
import { phase14ChallengeVariantRegistrations } from "../src/phase-14/packages.js";
import { readFamilyTrials } from "../src/trials/directory.js";
import { evidenceLedger } from "../src/trials/evidence-lifecycle.js";
import { assertStaleRunsLabelled } from "../src/trials/migration.js";
import { prepareChallenge } from "../src/trials/run.js";

describe("stale label audit", () => {
  it("lists every unlabelled report", () => {
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
    for (const name of readdirSync(join(ROOT, "reports")).filter((f) => f.endsWith(".md"))) {
      try {
        assertStaleRunsLabelled(name, readFileSync(join(ROOT, "reports", name), "utf8"), ledgers);
      } catch (e) {
        console.log(`VIOLATION ${name}: ${String((e as Error).message).slice(0, 170)}`);
      }
    }
  }, 900_000);
});
