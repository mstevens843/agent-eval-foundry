// Tests for the evolution layer: kill analysis, the operator engine, the two new families, and the
// consistency checks that keep the ledger honest about all of it.
//
// The group that earns its place is "a knob that cannot change an outcome". Both families here
// shipped with a scenario selector whose stride aligned with the innermost knob, so that knob was
// frozen at one value across every measured scenario — and everything downstream looked healthy. The
// reference passed, the mutants were caught, the axis meter produced a number. Those tests pin the
// fix and, more importantly, pin the check that would have caught it.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { measure } from "../src/axis-meter.js";
import { checkChallengePackage } from "../src/challenge/package-check.js";
import { BUILT_FAMILIES, BUILT_FAMILY_IDS, builtFamily, scenarioSetIdFor } from "../src/families/registry.js";
import { MEASURED_DEFAULTS, buildsPerShippedFamily, planBudget } from "../src/foundry/budget.js";
import { assertLedgerConsistency } from "../src/foundry/consistency.js";
import {
  OPERATORS,
  assertPromotionEvidence,
  assertVariantNovel,
  evolve,
  operator,
  variantToShape,
} from "../src/foundry/evolve.js";
import {
  DISPOSITIONS,
  KILL_REASONS,
  KILL_REASON_SPECS,
  analyzeFamily,
  assertKillAnalysis,
  killReasonSpec,
} from "../src/foundry/kill.js";
import { loadRegistry } from "../src/foundry/load.js";
import { familyLoop, loopAll } from "../src/foundry/loop.js";
import { assertKnobCoverage, hash32, sampleSpace } from "../src/foundry/sample.js";
import { renderEvolutionReport } from "../src/reports/evolution-report.js";
import { renderKillReport } from "../src/reports/kill-report.js";
import { assessFamily } from "../src/reports/ship-report.js";

const ROOT = new URL("..", import.meta.url).pathname;
const registry = loadRegistry(ROOT);
const picState = familyLoop(ROOT, "prompt-injection-containment", registry);

describe("the kill taxonomy", () => {
  it("every reason has a spec, and every spec a valid disposition", () => {
    expect(KILL_REASON_SPECS.length).toBe(KILL_REASONS.length);
    for (const reason of KILL_REASONS) {
      const spec = killReasonSpec(reason);
      expect(DISPOSITIONS).toContain(spec.disposition);
      expect(spec.evidenceRequirement.length).toBeGreaterThan(10);
    }
  });

  it("absences of evidence never dispose to abandon", () => {
    // The distinction the whole layer exists for: "we have not measured it" is not "it is bad".
    for (const spec of KILL_REASON_SPECS.filter((s) => s.kind === "absence")) {
      expect(spec.disposition, spec.reason).not.toBe("abandon");
      expect(["trial", "schedule"]).toContain(spec.disposition);
    }
  });

  it("the containment family is already-solved, derived from trial records", () => {
    expect(picState.analysis.primary?.reason).toBe("already_solved");
    expect(picState.analysis.disposition).toBe("harden");
    const finding = picState.analysis.findings.find((f) => f.reason === "already_solved");
    expect(finding?.source).toBe("derived");
    expect(finding?.gates).toContain("not-already-solved");
    expect(finding?.evidence.join(" ")).toMatch(/counted agent trial/);
  });

  it("declared judgements are labelled as declared and never as derived", () => {
    const declared = picState.analysis.findings.filter((f) => f.source === "declared");
    expect(declared.length).toBeGreaterThan(0);
    for (const f of declared) expect(f.evidence.length).toBeGreaterThan(0);
    expect(picState.analysis.fullyDerived).toBe(false);
  });

  it("a family with no counted trials reports absence, not weakness", () => {
    const shape = registry.shapes.find((s) => s.familyId === "browser-action-replay");
    const target = shape as NonNullable<typeof shape>;
    const analysis = analyzeFamily(target, assessFamily(target, registry));
    expect(analysis.findings.some((f) => f.reason === "already_solved")).toBe(false);
    expect(analysis.findings.some((f) => f.reason === "no_difficulty_evidence")).toBe(true);
    expect(analysis.disposition).toBe("trial");
  });
});

describe("known-bad kill analyses", () => {
  const base = picState.analysis;

  it("KILL_WITHOUT_REASON — a held family with no finding", () => {
    expect(() =>
      assertKillAnalysis({ ...base, findings: [], primary: null, disposition: null }),
    ).toThrowError(expect.objectContaining({ code: "KILL_WITHOUT_REASON" }));
  });

  it("KILL_WITHOUT_EVIDENCE — a reason nobody can cite", () => {
    const first = base.findings[0] as NonNullable<(typeof base.findings)[0]>;
    const naked = { ...base, findings: [{ ...first, evidence: [] }] };
    expect(() => assertKillAnalysis(naked as typeof base)).toThrowError(
      expect.objectContaining({ code: "KILL_WITHOUT_EVIDENCE" }),
    );
  });

  it("KILL_REASON_UNSUPPORTED — derived from no gate at all", () => {
    const first = base.findings[0] as NonNullable<(typeof base.findings)[0]>;
    const floating = { ...base, findings: [{ ...first, gates: [] }] };
    expect(() => assertKillAnalysis(floating as typeof base)).toThrowError(
      expect.objectContaining({ code: "KILL_REASON_UNSUPPORTED" }),
    );
  });

  it("KILL_DISPOSITION_MISSING — a disposition that does not follow from the reason", () => {
    expect(() => assertKillAnalysis({ ...base, disposition: "abandon" })).toThrowError(
      expect.objectContaining({ code: "KILL_DISPOSITION_MISSING" }),
    );
    expect(() => assertKillAnalysis({ ...base, disposition: null })).toThrowError(
      expect.objectContaining({ code: "KILL_DISPOSITION_MISSING" }),
    );
  });

  it("KILL_UNKNOWN_REASON — a reason outside the taxonomy", () => {
    const first = base.findings[0] as NonNullable<(typeof base.findings)[0]>;
    expect(() => killReasonSpec("vibes" as never)).toThrowError(
      expect.objectContaining({ code: "KILL_UNKNOWN_REASON" }),
    );
    expect(() =>
      assertKillAnalysis({ ...base, findings: [{ ...first, reason: "vibes" as never }] }),
    ).toThrowError(expect.objectContaining({ code: "KILL_UNKNOWN_REASON" }));
  });

  it("the real analysis passes its own checker", () => {
    expect(() => assertKillAnalysis(base)).not.toThrow();
  });
});

describe("the evolution engine", () => {
  it("every operator declares what it holds fixed and what it risks", () => {
    for (const op of OPERATORS) {
      expect(op.whatStaysFixed.length, op.id).toBeGreaterThan(10);
      expect(op.whyHarder.length, op.id).toBeGreaterThan(10);
      expect(op.fairnessRisk.length, op.id).toBeGreaterThan(3);
      expect(op.cheatRisk.length, op.id).toBeGreaterThan(3);
    }
  });

  it("proposes variants for `harden` and nothing for an absence of evidence", () => {
    expect(picState.variants.length).toBeGreaterThanOrEqual(3);
    const untried = registry.shapes.find((s) => s.familyId === "ui-action-record-replay");
    const target = untried as NonNullable<typeof untried>;
    const analysis = analyzeFamily(target, assessFamily(target, registry));
    // A family nobody has attempted does not need descendants, it needs a trial. Proposing variants
    // here would be answering a question nobody asked.
    expect(evolve(analysis, target, registry)).toEqual([]);
  });

  it("every proposal differs mechanistically from its parent", () => {
    for (const v of picState.variants) {
      expect(() => assertVariantNovel(v, picState.shape, registry), v.id).not.toThrow();
      const added = v.mechanisms.filter((m) => !picState.shape.mechanisms.includes(m));
      const dropped = picState.shape.mechanisms.filter((m) => !v.mechanisms.includes(m));
      expect(added.length + dropped.length, v.id).toBeGreaterThan(0);
    }
  });

  it("every proposal carries a pre-registered kill risk with a reason", () => {
    for (const v of picState.variants) {
      expect(v.killRisk).toBeGreaterThan(0);
      expect(v.killRisk).toBeLessThan(1);
      expect(v.killRiskRationale.length).toBeGreaterThan(40);
      expect(v.measurementPlan.join(" ")).toMatch(/[Pp]re-registered kill signal/);
    }
  });

  it("every proposal emits a schema-valid shape", async () => {
    const { parseTaskShape } = await import("../src/foundry/validate.js");
    for (const v of picState.variants) {
      const shape = parseTaskShape(variantToShape(v), `variant:${v.id}`);
      expect(shape.dataQuality, v.id).toBe("estimated");
      expect(shape.agentTrialsRun, v.id).toBeNull();
    }
  });
});

describe("known-bad variants", () => {
  const parent = picState.shape;
  const good = picState.variants[0] as NonNullable<(typeof picState.variants)[0]>;

  it("VARIANT_NO_MECHANISM_DELTA — a rename of the parent", () => {
    expect(() =>
      assertVariantNovel({ ...good, mechanisms: [...parent.mechanisms] }, parent, registry),
    ).toThrowError(expect.objectContaining({ code: "VARIANT_NO_MECHANISM_DELTA" }));
  });

  it("VARIANT_WITHOUT_OPERATOR — a proposal with no operator applied", () => {
    expect(() => assertVariantNovel({ ...good, operators: [] }, parent, registry)).toThrowError(
      expect.objectContaining({ code: "VARIANT_WITHOUT_OPERATOR" }),
    );
  });

  it("VARIANT_UNKNOWN_MECHANISM — a mechanism nobody can look up", () => {
    expect(() =>
      assertVariantNovel({ ...good, mechanisms: ["vibes-based-failure"] }, parent, registry),
    ).toThrowError(expect.objectContaining({ code: "VARIANT_UNKNOWN_MECHANISM" }));
  });

  it("VARIANT_IDENTICAL_TO_PARENT — the parent's own id, or purely infrastructural change", () => {
    expect(() => assertVariantNovel({ ...good, id: parent.familyId }, parent, registry)).toThrowError(
      expect.objectContaining({ code: "VARIANT_IDENTICAL_TO_PARENT" }),
    );
    expect(() =>
      assertVariantNovel({ ...good, operators: ["require_agent_trial"] }, parent, registry),
    ).toThrowError(expect.objectContaining({ code: "VARIANT_IDENTICAL_TO_PARENT" }));
  });

  it("VARIANT_PROMOTED_WITHOUT_BUILD — promoted with nothing that executes", () => {
    expect(() =>
      assertPromotionEvidence("prompt-injection-capability-routing", BUILT_FAMILY_IDS, [
        "prompt-injection-capability-routing",
      ]),
    ).toThrowError(expect.objectContaining({ code: "VARIANT_PROMOTED_WITHOUT_BUILD" }));
    // The one that WAS built passes.
    expect(() =>
      assertPromotionEvidence(
        "prompt-injection-memory-poisoning",
        BUILT_FAMILY_IDS,
        registry.shapes.map((s) => s.familyId),
      ),
    ).not.toThrow();
  });

  it("an unknown operator id is rejected", () => {
    expect(() => operator("wishful_thinking" as never)).toThrow(/unknown operator/);
  });
});

describe("scenario-space sampling", () => {
  it("hash32 is stable and order-independent of enumeration", () => {
    expect(hash32("abc")).toBe(hash32("abc"));
    expect(hash32("abc")).not.toBe(hash32("abd"));
  });

  it("SAMPLE_KNOB_FROZEN — a stride that freezes the innermost knob", () => {
    // The exact bug both families shipped with, reproduced: enumeration order puts `inner` fastest,
    // and a stride of two keeps only one of its values.
    const space = [0, 1].flatMap((outer) => [true, false].map((inner) => ({ outer, inner })));
    const strided = space.filter((_, i) => i % 2 === 0);
    expect(() =>
      assertKnobCoverage(
        strided,
        { outer: [0, 1], inner: [true, false] },
        (item, knob) => (item as unknown as Record<string, unknown>)[knob],
        "test.space",
      ),
    ).toThrowError(expect.objectContaining({ code: "SAMPLE_KNOB_FROZEN" }));
  });

  it("hash sampling keeps every declared value", () => {
    const space = [0, 1].flatMap((outer) => [true, false].map((inner) => ({ outer, inner })));
    const sampled = sampleSpace(space, { keyOf: (x) => `${x.outer}|${x.inner}`, fraction: 0.5 });
    expect(() =>
      assertKnobCoverage(
        sampled,
        { outer: [0, 1], inner: [true, false] },
        (item, knob) => (item as unknown as Record<string, unknown>)[knob],
        "test.space",
      ),
    ).not.toThrow();
  });

  it("sampling is deterministic across calls", () => {
    const space = Array.from({ length: 40 }, (_, i) => ({ i }));
    const a = sampleSpace(space, { keyOf: (x) => `${x.i}`, fraction: 0.25 });
    const b = sampleSpace(space, { keyOf: (x) => `${x.i}`, fraction: 0.25 });
    expect(a).toEqual(b);
  });
});

describe("the built families", () => {
  for (const family of BUILT_FAMILIES) {
    describe(family.id, () => {
      const sweep = family.run();

      it("the reference passes every measured scenario", () => {
        expect(sweep.referenceFailures).toEqual([]);
      });

      it("every mutant is caught by the check it was written to trip", () => {
        const missed = sweep.mutantsCaught.filter((m) => !m.caught);
        expect(missed.map((m) => `${m.mutantId}:${m.check}`)).toEqual([]);
      });

      it("both baselines are rejected", () => {
        expect(sweep.baselinesBlocked.length).toBe(sweep.baselinesTotal);
      });

      it("the measured set is a strict subset of the declared space", () => {
        expect(sweep.scenarioCount).toBeGreaterThan(0);
        expect(sweep.scenarioCount).toBeLessThan(sweep.spaceSize);
      });

      it("measures at least two independent axes", () => {
        expect(measure(sweep.matrix, { nullTrials: 3 }).independentAxes).toBeGreaterThanOrEqual(2);
      });

      it("its challenge package ships no hidden artifact", () => {
        const typesSource = readFileSync(join(ROOT, family.typesPath), "utf8");
        const pkg = family.challenge(typesSource, scenarioSetIdFor(family, sweep.matrix));
        expect(() => checkChallengePackage(pkg.files, family.leakProfile)).not.toThrow();
        const names = pkg.files.map((f) => f.path.split("/").pop());
        for (const hidden of pkg.manifest.hiddenArtifacts) expect(names).not.toContain(hidden);
      });
    });
  }

  it("the promoted descendant differs from its parent in mechanism and in shape", () => {
    const parent = builtFamily("prompt-injection-containment");
    const child = builtFamily("prompt-injection-memory-poisoning");
    expect(child.mechanisms).not.toEqual(parent.mechanisms);
    expect(Object.keys(child.space)).not.toEqual(Object.keys(parent.space));
    // The knob that carries the evolution: time separation, which the parent has no notion of.
    expect(Object.keys(child.space)).toContain("sessionsBetween");
  });

  it("the UI family measures the widest structure here", () => {
    const ui = builtFamily("ui-action-record-replay").run();
    expect(measure(ui.matrix, { nullTrials: 3 }).independentAxes).toBeGreaterThanOrEqual(4);
  });
});

describe("ledger consistency", () => {
  const states = loopAll(ROOT, registry);
  const verdicts = Object.fromEntries(states.map((s) => [s.shape.familyId, s.assessment.verdict]));
  const analyses = Object.fromEntries(states.map((s) => [s.shape.familyId, s.analysis]));
  const base = {
    candidates: registry.candidates,
    shapes: registry.shapes,
    verdicts,
    analyses,
    builtFamilyIds: BUILT_FAMILY_IDS,
  };

  it("the checked-in ledger agrees with the gate", () => {
    expect(() => assertLedgerConsistency(base)).not.toThrow();
  });

  it("LEDGER_STATUS_CONTRADICTS_GATE — shipped in the ledger, NOT-READY at the gate", () => {
    const lying = registry.candidates.map((c) =>
      c.id === "prompt-injection-containment-built" ? { ...c, status: "shipped" as const } : c,
    );
    expect(() => assertLedgerConsistency({ ...base, candidates: lying })).toThrowError(
      expect.objectContaining({ code: "LEDGER_STATUS_CONTRADICTS_GATE" }),
    );
  });

  it("LEDGER_STATUS_CONTRADICTS_GATE — `built` with nothing that executes and nothing cited", () => {
    const shapeless = registry.shapes.map((s) =>
      s.familyId === "ui-action-record-replay" ? { ...s, evidence: null } : s,
    );
    const claimed = registry.candidates.map((c) =>
      c.id === "ui-action-record-replay-built" ? { ...c, status: "built" as const } : c,
    );
    expect(() =>
      assertLedgerConsistency({
        ...base,
        candidates: claimed,
        shapes: shapeless,
        builtFamilyIds: [],
      }),
    ).toThrowError(expect.objectContaining({ code: "LEDGER_STATUS_CONTRADICTS_GATE" }));
  });

  it("LEDGER_STATUS_CONTRADICTS_GATE — descendant evidence cannot overwrite the parent family", () => {
    expect(() =>
      assertLedgerConsistency({
        ...base,
        shapes: registry.shapes.filter((s) => s.familyId !== "ui-action-record-replay"),
      }),
    ).toThrowError(expect.objectContaining({ code: "LEDGER_STATUS_CONTRADICTS_GATE" }));
  });

  it("LEDGER_STATUS_CONTRADICTS_GATE — checker-required measured claims require checker mutants", () => {
    const weakened = registry.shapes.map((s) =>
      s.familyId === "checker-required-memory-poisoning"
        ? { ...s, expectedMutants: s.expectedMutants.filter((m) => m.mutantId !== "no-checker") }
        : s,
    );
    expect(() => assertLedgerConsistency({ ...base, shapes: weakened })).toThrowError(
      expect.objectContaining({ code: "LEDGER_STATUS_CONTRADICTS_GATE" }),
    );
  });

  it("LEDGER_KILL_WITHOUT_ANALYSIS — a kill with no reason recorded anywhere", () => {
    const killed = registry.candidates.map((c) =>
      c.id === "prompt-injection-containment-built"
        ? { ...c, decision: "kill" as const, failureNotes: null }
        : c,
    );
    expect(() => assertLedgerConsistency({ ...base, candidates: killed, analyses: {} })).toThrowError(
      expect.objectContaining({ code: "LEDGER_KILL_WITHOUT_ANALYSIS" }),
    );
  });
});

describe("the budget prices death", () => {
  const inputs = { ...MEASURED_DEFAULTS, totalUsd: 100_000, labourRateUsdPerHour: 120 };

  it("a plan assuming every built family survives buys more than one that does not", () => {
    // The known-bad: `postBuildKillRate: 0` is the plan that prices only the survivor. It used to be
    // expressible two ways — a kill rate of 0 or a cycle count of 1 — and only the second was read.
    const optimistic = planBudget({ ...inputs, postBuildKillRate: 0 });
    const honest = planBudget(inputs);
    expect(optimistic.families).toBeGreaterThan(honest.families);
    expect(optimistic.familiesKilledAfterBuild).toBe(0);
    expect(honest.familiesKilledAfterBuild).toBeGreaterThan(0);
  });

  it("builds per survivor is DERIVED from the kill rate, not declared beside it", () => {
    // The retired `evolutionCyclesPerSurvivor: 2` and `postBuildKillRate: 0.5` agreed by luck, which
    // is why the duplication survived three phases. Deriving one from the other is what stops them
    // disagreeing, and at the measured rate it reproduces the retired value exactly — so correcting
    // the defect moves no headline number.
    expect(buildsPerShippedFamily(0.5)).toBe(2);
    expect(buildsPerShippedFamily(0)).toBe(1);
    expect(buildsPerShippedFamily(0.75)).toBe(4);
    const plan = planBudget(inputs);
    expect(plan.familiesBuilt).toBe(plan.families * buildsPerShippedFamily(inputs.postBuildKillRate));
  });

  it("builds exceed survivors, and the report can say by how much", () => {
    const plan = planBudget(inputs);
    expect(plan.familiesBuilt).toBeGreaterThan(plan.families);
    expect(plan.familiesBuilt - plan.familiesKilledAfterBuild).toBe(plan.families);
  });

  it("labour still dominates once deaths are priced", () => {
    expect(planBudget(inputs).labourShare).toBeGreaterThan(0.95);
  });
});

describe("the evolution reports", () => {
  const states = loopAll(ROOT, registry);

  it("the kill report is deterministic and names the disposition", () => {
    const render = (): string =>
      renderKillReport({
        shape: picState.shape,
        analysis: picState.analysis,
        ...(picState.evidence === undefined ? {} : { evidence: picState.evidence }),
        variants: picState.variants,
        trials: picState.trials,
      });
    expect(render()).toBe(render());
    expect(render()).toMatch(/already_solved/);
    expect(render()).toMatch(/What it did \*\*not\*\* prove/);
  });

  it("the evolution report is deterministic and records the clean-pass evolution loop", () => {
    const render = (): string =>
      renderEvolutionReport({
        registry,
        states,
        builtFamilyIds: BUILT_FAMILY_IDS,
        promoted: ["prompt-injection-memory-poisoning"],
        sharedBankSubjects: 1,
        sharedBankThreshold: 3,
      });
    expect(render()).toBe(render());
    expect(render()).toMatch(/loop, now closed again/);
    expect(render()).toMatch(/access-token-scope-expansion/);
    expect(render()).toMatch(/clean pass blocks `\/6` matrix/);
    expect(render()).toMatch(
      /delegated-wallet-scope-reconciliation` descendant probe was promoted into a full family/,
    );
    expect(render()).toMatch(/cross-family\s+and cross-lab claims remain bounded/);
    expect(render()).toMatch(/What would falsify the loop/);
  });

  it("both reports are checked in", () => {
    expect(existsSync(join(ROOT, "reports/prompt-injection-containment-kill-analysis.md"))).toBe(true);
    expect(existsSync(join(ROOT, "reports/foundry-evolution-report.md"))).toBe(true);
  });
});
