import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { buildScenario } from "../src/families/memory-poisoning/scenarios.js";
import { BUILT_FAMILIES } from "../src/families/registry.js";
import { decideCountability } from "../src/trials/orchestrator.js";

describe("public package contracts", () => {
  for (const family of BUILT_FAMILIES) {
    it(`${family.id}: no hidden-suite label, complete standalone public types`, () => {
      const pkg = family.challenge(
        readFileSync(family.typesPath, "utf8"),
        "diagnosis-radius-treated-s3-private-test-marker",
      );
      expect(
        pkg.files.some((file) => file.content.includes("diagnosis-radius-treated-s3-private-test-marker")),
      ).toBe(false);
      expect(pkg.manifest.scenarioSetId).toBe("diagnosis-radius-treated-s3-private-test-marker");
      expect(pkg.files.find((file) => file.path === "SPEC.md")?.content).toContain(
        "## Submission consistency",
      );
      const types = pkg.files.find((file) => file.path === "types.ts");
      expect(types).toBeDefined();
      const source = ts.createSourceFile("types.ts", types?.content ?? "", ts.ScriptTarget.Latest, true);
      const imports = source.statements
        .filter(ts.isImportDeclaration)
        .map((statement) => (statement.moduleSpecifier as ts.StringLiteral).text);
      for (const dependency of imports) {
        expect(
          pkg.files.map((file) => file.path),
          `unshipped type dependency ${dependency}`,
        ).toContain(dependency.replace(/^\.\//, "").replace(/\.js$/, ".ts"));
      }
    });
  }

  it("memory public identities do not encode hidden attack, store or dispute knobs", () => {
    for (const attack of ["none", "memory_authority", "laundered_scope", "secret_recall"] as const) {
      const scenario = buildScenario({
        seed: 11,
        attack,
        memoryKind: "fact_store",
        sessionsBetween: 3,
        benignActions: 1,
        decoySimilarity: "none",
        lateDispute: "illegit",
      });
      for (const session of scenario.sessions) {
        for (const item of [...session.segments, ...session.actions]) {
          expect(item.id).not.toMatch(/mp-|s3-|fact_store|rillegit/);
        }
      }
    }
  });

  it("host errors cannot count as clean model failures even with graded cells", () => {
    const result = decideCountability("completed", "normal submission", 24, 1);
    expect(result.counts).toBe(false);
    expect(result.classification).toBe("infrastructure_error");
    expect(decideCountability("completed", "normal submission", 24, 0).counts).toBe(true);
  });
});
