// Tests for the generated evidence snapshot.
//
// The document this replaced was a hand-typed table in README.md. It drifted the way hand-typed
// tables always drift, and by the time it was removed it claimed counted trials for families that
// have none, a mutant-axis count no sweep produces, five package hashes no package hashes to any
// more, and a verdict label — `PROVIDER-DELTA` — that nothing in this repository emits.
//
// So the assertions here are about the one property the README table could not have: the snapshot is
// a projection of the ship gate rather than a second opinion about it. Every verdict must be a
// `ShipVerdict` that `assessFamily` actually returned for that family, every counted-trial number
// must be the number in the evidence map, and no cell may carry a verdict vocabulary the gate cannot
// produce.

import { describe, expect, it } from "vitest";
import { loadRegistry } from "../src/foundry/load.js";
import { renderEvidenceSnapshotReport } from "../src/reports/evidence-snapshot.js";
import { type FamilyEvidence, assessFamily } from "../src/reports/ship-report.js";

const ROOT = process.cwd();

/** The complete `ShipVerdict` vocabulary. Anything else in a verdict cell is invented. */
const SHIP_VERDICTS = ["SHIP", "HOLD", "NOT-READY"] as const;

const evidenceFor = (familyId: string, over: Partial<FamilyEvidence> = {}): FamilyEvidence => ({
  familyId,
  referencePasses: true,
  baselinesBlocked: ["nop", "over-blocker"],
  baselinesTotal: 2,
  mutantsCaught: [{ mutantId: "m1", check: "c1", caught: true }],
  mechanismsExercised: true,
  mechanismScenarios: 128,
  mechanismScenariosExercised: 128,
  mechanismScenariosBlind: 0,
  mechanismScenariosMisattributed: 0,
  isolation: "subprocess",
  countedAgentTrials: 0,
  agentTrialsPassed: 0,
  sharedBankSubjects: 0,
  reportsDeterministic: true,
  ...over,
});

const snapshotRows = (markdown: string): readonly string[] =>
  markdown.split("\n").filter((line) => line.startsWith("| `") && line.includes("**"));

describe("the evidence snapshot is a projection of the ship gate", () => {
  const registry = loadRegistry(ROOT);

  it("prints, for every family, exactly the verdict assessFamily returns", () => {
    const evidence = Object.fromEntries(
      registry.shapes.map((shape) => [
        shape.familyId,
        evidenceFor(shape.familyId, { countedAgentTrials: 1, capabilityEvidencedTrials: 1 }),
      ]),
    );
    const markdown = renderEvidenceSnapshotReport({ registry, evidence, ledgers: [] });

    for (const shape of registry.shapes) {
      const expected = assessFamily(shape, registry, evidence[shape.familyId]).verdict;
      const row = markdown
        .split("\n")
        .find((line) => line.startsWith(`| \`${shape.familyId}\` |`) && line.includes("**"));
      expect(row, `no snapshot row for ${shape.familyId}`).toBeDefined();
      expect(row).toContain(`**${expected}**`);
    }
  });

  // KNOWN-BAD, restated as an assertion: README.md printed `**PROVIDER-DELTA**` as the verdict for
  // `deployment-model-alias-rollout-drift`. No code path in this repository produces that string,
  // and there is no gate that could. A verdict cell may only carry a real ShipVerdict.
  it("uses no verdict vocabulary the gate cannot emit", () => {
    const evidence = Object.fromEntries(
      registry.shapes.map((shape) => [shape.familyId, evidenceFor(shape.familyId)]),
    );
    const markdown = renderEvidenceSnapshotReport({ registry, evidence, ledgers: [] });

    expect(markdown).not.toMatch(/PROVIDER-DELTA/);
    expect(markdown).not.toMatch(/SMOKE-EVIDENCED/);
    for (const row of snapshotRows(markdown)) {
      const bolded = [...row.matchAll(/\*\*([A-Z][A-Z-]+)\*\*/g)].map((m) => m[1]);
      expect(bolded.length).toBeGreaterThan(0);
      for (const label of bolded) {
        expect(SHIP_VERDICTS as readonly string[]).toContain(label);
      }
    }
  });

  it("reports counted trials and failures from the evidence map rather than a claim", () => {
    const familyId = registry.shapes[0]?.familyId ?? "";
    const evidence = {
      [familyId]: evidenceFor(familyId, {
        countedAgentTrials: 5,
        agentTrialsPassed: 3,
        capabilityEvidencedTrials: 2,
        mechanismScenarios: 324,
      }),
    };
    const markdown = renderEvidenceSnapshotReport({ registry, evidence, ledgers: [] });
    const row = markdown.split("\n").find((line) => line.startsWith(`| \`${familyId}\` |`));
    expect(row).toBeDefined();
    // scenarios | counted | failed >=1 | capability-attributed
    expect(row).toContain("| 324 | 5 | 2 | 2 |");
  });

  // KNOWN-BAD: README.md printed `>=2` agent axes for three families whose counted failing subject
  // count was ONE. Fewer than two failing subjects cannot yield an axis count at all, and the
  // snapshot must say so rather than round up.
  it("refuses to state an agent-axis count when fewer than two subjects have failed", () => {
    const familyId = registry.shapes[0]?.familyId ?? "";
    const evidence = {
      [familyId]: evidenceFor(familyId, { countedAgentTrials: 1, agentTrialsPassed: 0, agentAxes: null }),
    };
    const markdown = renderEvidenceSnapshotReport({ registry, evidence, ledgers: [] });
    const row = markdown.split("\n").find((line) => line.startsWith(`| \`${familyId}\` |`));
    expect(row).toContain("not measurable — fewer than 2 counted failing subjects");
    expect(row).not.toMatch(/>=\s*2/);
  });

  it("separates mutant-bank axes from agent axes and marks estimates as estimates", () => {
    const markdown = renderEvidenceSnapshotReport({ registry, evidence: {}, ledgers: [] });
    expect(markdown).toContain("measured axes (mutant bank)");
    for (const shape of registry.shapes) {
      if (shape.dataQuality === "measured" || shape.estimatedAxes === null) continue;
      const row = markdown.split("\n").find((line) => line.startsWith(`| \`${shape.familyId}\` |`));
      expect(row, `${shape.familyId} declares estimated axes`).toContain(`${shape.estimatedAxes} (est.)`);
    }
  });

  it("takes package hashes from the evidence ledger, never from a literal", () => {
    const markdown = renderEvidenceSnapshotReport({
      registry,
      evidence: {},
      ledgers: [
        {
          familyId: "ui-replay-live-dom",
          currentHash: "deadbeefdeadbeefdeadbeefdeadbeef",
          entries: [],
          counted: ["run-a"],
          superseded: ["run-b", "run-c"],
        },
      ],
    });
    expect(markdown).toContain("| `ui-replay-live-dom` | `deadbeefdeadbeefdeadbeefdeadbeef` | 1 | 2 |");
    expect(markdown).toContain("**1 counted**, 2 superseded");
  });
});
