import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { measure } from "../src/axis-meter.js";
import { checkChallengePackage } from "../src/challenge/package-check.js";
import { builtFamily } from "../src/families/registry.js";
import {
  loadDiscoveryWorkbench,
  loadProbeDefinitions,
  loadProbeRunSummary,
  loadPromotions,
  loadRegistry,
} from "../src/foundry/load.js";
import {
  assertPromotionsValid,
  parsePromotion,
  promotedFamilyRecords,
  promotionToFamilyScaffold,
} from "../src/foundry/promotion.js";
import { SchemaError } from "../src/foundry/schema.js";
import { renderPromotionReport } from "../src/reports/promotion-report.js";
import { prepareChallenge } from "../src/trials/run.js";

const ROOT = new URL("..", import.meta.url).pathname;
const FAMILY_ID = "access-token-scope-expansion";
const PROMOTION_ID = "access-token-scope-expansion-from-probe";

const rawPromotion = (): Record<string, unknown> =>
  (JSON.parse(readFileSync(`${ROOT}data/promotions.json`, "utf8")) as Record<string, unknown>[])[0] as Record<
    string,
    unknown
  >;

const loaded = () => {
  const registry = loadRegistry(ROOT);
  const workbench = loadDiscoveryWorkbench(ROOT, registry);
  const definitions = loadProbeDefinitions(ROOT, registry, workbench);
  const summary = loadProbeRunSummary(ROOT, registry, workbench);
  const promotions = loadPromotions(ROOT, registry, workbench);
  const records = promotedFamilyRecords(promotions, definitions, summary, workbench);
  return { registry, workbench, definitions, summary, promotions, records };
};

function expectSchemaCode(fn: () => unknown, code: string) {
  let thrown: unknown;
  try {
    fn();
  } catch (err) {
    thrown = err;
  }
  expect(thrown).toBeInstanceOf(SchemaError);
  expect((thrown as SchemaError).code).toBe(code);
}

describe("Promoted Family Build Pipeline v1", () => {
  it("validates the checked-in promotion record against the actual probe result", () => {
    const { promotions, summary, workbench } = loaded();

    expect(promotions.length).toBeGreaterThanOrEqual(2);
    expect(promotions.some((promotion) => promotion.id === PROMOTION_ID)).toBe(true);
    expect(() => assertPromotionsValid(promotions, summary, workbench)).not.toThrow();
    expect(summary.promoted[0]?.probeId).toBe("access-token-scope-expansion-probe");
  });

  it("PROMOTION_NO_SOURCE_PROBE — rejects a promotion with no source probe", () => {
    expectSchemaCode(
      () => parsePromotion({ ...rawPromotion(), sourceProbeId: "" }, "fixture"),
      "PROMOTION_NO_SOURCE_PROBE",
    );
  });

  it("PROMOTION_SOURCE_NOT_PROMOTED — rejects a promotion from a non-promoted probe verdict", () => {
    const { promotions, summary, workbench } = loaded();
    const altered = {
      ...summary,
      probes: summary.probes.map((probe) =>
        probe.probeId === "access-token-scope-expansion-probe"
          ? { ...probe, verdict: "needs_repair" as const }
          : probe,
      ),
    };

    expectSchemaCode(
      () => assertPromotionsValid(promotions, altered, workbench),
      "PROMOTION_SOURCE_NOT_PROMOTED",
    );
  });

  it("PROMOTION_NO_FIXED — rejects a promotion that loses the preserved mechanism statement", () => {
    const raw = rawPromotion();
    expectSchemaCode(
      () =>
        parsePromotion(
          {
            ...raw,
            delta: { ...(raw.delta as Record<string, unknown>), whatStaysFixed: [] },
          },
          "fixture",
        ),
      "PROMOTION_NO_FIXED",
    );
  });

  it("PROMOTION_NO_CHANGED — rejects a promotion that does not expand beyond the probe", () => {
    const raw = rawPromotion();
    expectSchemaCode(
      () =>
        parsePromotion(
          {
            ...raw,
            delta: { ...(raw.delta as Record<string, unknown>), whatChanges: [] },
          },
          "fixture",
        ),
      "PROMOTION_NO_CHANGED",
    );
  });

  it("PROMOTION_NO_TRUTH_SOURCE — rejects a promotion without carried-forward authority", () => {
    expectSchemaCode(
      () => parsePromotion({ ...rawPromotion(), authoritativeTruthSourceCarriedForward: "" }, "fixture"),
      "PROMOTION_NO_TRUTH_SOURCE",
    );
  });

  it("PROMOTION_NO_EXPECTED_MUTANTS — rejects a promotion with no known-bad bank", () => {
    expectSchemaCode(
      () => parsePromotion({ ...rawPromotion(), expectedMutantsCarriedForward: [] }, "fixture"),
      "PROMOTION_NO_EXPECTED_MUTANTS",
    );
  });

  it("PROMOTION_NO_KILL_SIGNAL — rejects a promotion without a pre-registered kill signal", () => {
    expectSchemaCode(
      () => parsePromotion({ ...rawPromotion(), preRegisteredKillSignal: "" }, "fixture"),
      "PROMOTION_NO_KILL_SIGNAL",
    );
  });

  it("PROMOTION_CLAIMS_DIFFICULTY_PRETRIAL — rejects difficulty claims without counted trials", () => {
    const raw = rawPromotion();
    expectSchemaCode(
      () =>
        parsePromotion(
          {
            ...raw,
            evidence: {
              ...(raw.evidence as Record<string, unknown>),
              claimedEvidenceLevel: "difficulty-evidenced",
              countedAgentTrials: 0,
            },
          },
          "fixture",
        ),
      "PROMOTION_CLAIMS_DIFFICULTY_PRETRIAL",
    );
  });

  it("PROMOTION_HIDDEN_RULE_SURFACE_UNDECLARED — rejects private hidden-rule expansion", () => {
    const raw = rawPromotion();
    expectSchemaCode(
      () =>
        parsePromotion(
          {
            ...raw,
            delta: {
              ...(raw.delta as Record<string, unknown>),
              hiddenRuleSurfaceChange: "expanded",
              hiddenRuleSurfaceNote: "expanded privately in hidden tests",
            },
          },
          "fixture",
        ),
      "PROMOTION_HIDDEN_RULE_SURFACE_UNDECLARED",
    );
  });

  it("scaffold includes every required draft family file", () => {
    const { records } = loaded();
    const record = records.find((item) => item.promotion.id === PROMOTION_ID);
    expect(record).toBeDefined();
    const scaffold = promotionToFamilyScaffold(record as NonNullable<typeof record>);

    expect(scaffold.files.map((file) => file.path).sort()).toEqual(
      [
        `${FAMILY_ID}/challenge-notes.md`,
        `${FAMILY_ID}/example-shape.json`,
        `${FAMILY_ID}/mutants.ts`,
        `${FAMILY_ID}/reference.ts`,
        `${FAMILY_ID}/runner.ts`,
        `${FAMILY_ID}/scenarios.ts`,
        `${FAMILY_ID}/spec.ts`,
        `${FAMILY_ID}/types.ts`,
        `${FAMILY_ID}/verify.ts`,
        `docs/families/${FAMILY_ID}.md`,
      ].sort(),
    );
    expect(scaffold.files.find((file) => file.path.endsWith("example-shape.json"))?.content).toContain(
      `"sourceCandidateId": "${FAMILY_ID}"`,
    );
  });

  it("renders the promotion report deterministically", () => {
    const { records, summary } = loaded();
    const first = renderPromotionReport(records, summary, [builtFamily(FAMILY_ID)]);
    const second = renderPromotionReport(records, summary, [builtFamily(FAMILY_ID)]);

    expect(first).toBe(second);
    expect(first).toContain("Promoted Family Build Pipeline v1");
    expect(first).toContain("real-agent difficulty");
  });
});

describe("access-token-scope-expansion promoted family", () => {
  it("reference passes, known-bad subjects fail intended checks, and baselines are rejected", () => {
    const sweep = builtFamily(FAMILY_ID).run();

    expect(sweep.scenarioCount).toBe(384);
    expect(sweep.spaceSize).toBe(1152);
    expect(sweep.referenceFailures).toEqual([]);
    expect(sweep.mutantsCaught.every((mutant) => mutant.caught)).toBe(true);
    expect(sweep.baselinesBlocked).toEqual(["nop-faker", "over-blocker"]);
  });

  it("matrix generation is deterministic and has local mutant-detection axes", () => {
    const first = builtFamily(FAMILY_ID).run().matrix;
    const second = builtFamily(FAMILY_ID).run().matrix;

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(measure(first, { nullTrials: 3 }).independentAxes).toBeGreaterThanOrEqual(2);
  });

  it("challenge package is leak-checked and hashable", () => {
    const prepared = prepareChallenge(ROOT, FAMILY_ID);
    const family = builtFamily(FAMILY_ID);
    const check = checkChallengePackage(prepared.pkg.files, family.leakProfile);

    expect(check.files).toBeGreaterThanOrEqual(4);
    expect(check.specCodesFound).toBe(8);
    expect(prepared.hash).toHaveLength(32);
    expect(prepared.pkg.files.map((file) => file.path)).not.toContain("verify.ts");
  });
});
