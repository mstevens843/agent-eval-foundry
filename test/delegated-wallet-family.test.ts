import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkChallengePackage } from "../src/challenge/package-check.js";
import {
  BASELINES,
  INTENDED_CHECK,
  auditLiar,
  cachedScopeTruster,
  downgradeBlindExecutor,
  duplicateEffectRetrier,
  executeEverything,
  revocationBlindExecutor,
  subjectOwnedAuthorityTruster,
} from "../src/families/delegated-wallet-scope-reconciliation/mutants.js";
import {
  REFERENCE_OPTIONS,
  makeSubject,
  reference,
} from "../src/families/delegated-wallet-scope-reconciliation/reference.js";
import { runCell, runFamily } from "../src/families/delegated-wallet-scope-reconciliation/runner.js";
import {
  SPACE,
  enumerateSpace,
  generateScenarios,
  selectMeasuredSet,
} from "../src/families/delegated-wallet-scope-reconciliation/scenarios.js";
import type { Scenario } from "../src/families/delegated-wallet-scope-reconciliation/truth.js";
import type { Subject } from "../src/families/delegated-wallet-scope-reconciliation/types.js";
import { builtFamily } from "../src/families/registry.js";
import { evaluatePromotionSmokeGate } from "../src/foundry/smoke-gates.js";
import type { FamilyTrialAnalysis } from "../src/reports/agent-results.js";
import {
  classifyDelegatedWalletSmoke,
  renderDelegatedWalletSmokeDiagnosis,
} from "../src/reports/delegated-wallet-diagnosis.js";
import type { TrialDiagnosis } from "../src/reports/diagnosis.js";
import { assertCampaignChallenge, loadCampaigns } from "../src/trials/campaign.js";
import { routeFor } from "../src/trials/router.js";
import { prepareChallenge } from "../src/trials/run.js";
import type { TrialSet } from "../src/trials/types.js";

const ROOT = new URL("..", import.meta.url).pathname;
const FAMILY_ID = "delegated-wallet-scope-reconciliation";
const CHALLENGE_HASH = "2140032d835a87ff254d01b6b4652f21";
const SCENARIO_SET_ID = "reconciliation-804-4b4cc8ff";
const budgetBlindFixture = makeSubject("budget-blind-fixture", "Ignores remaining wallet budget", {
  ...REFERENCE_OPTIONS,
  ignoreBudget: true,
});

let cachedRun: ReturnType<typeof runFamily> | null = null;
const measuredRun = (): ReturnType<typeof runFamily> => {
  cachedRun ??= runFamily();
  return cachedRun;
};

const firstScenario = (predicate: (scenario: Scenario) => boolean, label: string): Scenario => {
  const scenario = measuredRun().scenarios.find(predicate);
  if (scenario === undefined) throw new Error(`missing delegated-wallet scenario for ${label}`);
  return scenario;
};

const failedChecks = (scenario: Scenario, subject: Subject): readonly string[] =>
  runCell(scenario, subject).failures.map((failure) => failure.check);

const analysisFixture = (overrides: Partial<FamilyTrialAnalysis> = {}): FamilyTrialAnalysis => ({
  familyId: FAMILY_ID,
  outcomes: [],
  counted: 0,
  solves: 0,
  failures: 0,
  refusals: 0,
  infra: 0,
  modelFamilies: [],
  knobSplits: [],
  checkTotals: [],
  verdict: "no-evidence",
  plannedSlots: 1,
  notRunSlots: 1,
  ...overrides,
});

const diagnosisFixture = (overrides: Partial<TrialDiagnosis> = {}): TrialDiagnosis => ({
  runId: "delegated-wallet-smoke-fixture",
  familyId: FAMILY_ID,
  model: "openai/gpt-5.6-sol",
  counted: true,
  scenariosGraded: 804,
  scenariosFailed: 24,
  checks: [{ check: "no_overgrant", scenarios: 24, share: 1 }],
  implicated: [],
  reading: "capability",
  matchesHypothesis: true,
  notes: [],
  repairSuspected: false,
  ...overrides,
});

describe("delegated-wallet-scope-reconciliation family", () => {
  it("selects a deterministic measured set with every knob value covered", () => {
    const space = enumerateSpace();
    const first = selectMeasuredSet(space);
    const second = selectMeasuredSet(space);
    const scenarios = generateScenarios(first);

    expect(space.length).toBe(82_944);
    expect(first).toEqual(second);
    expect(first.length).toBe(804);
    expect(scenarios.filter((scenario) => scenario.expected.allowed).length).toBeGreaterThanOrEqual(300);
    expect(scenarios.some((scenario) => scenario.expected.allowed && scenario.params.repeatCount === 2)).toBe(
      true,
    );

    for (const [knob, values] of Object.entries(SPACE)) {
      const present = new Set(first.map((params) => JSON.stringify(params[knob as keyof typeof params])));
      expect([...present].sort(), knob).toEqual(values.map((value) => JSON.stringify(value)).sort());
    }
  });

  it("reference passes, all known-bad subjects fail intended checks, and baselines are blocked", () => {
    const sweep = builtFamily(FAMILY_ID).run();

    expect(sweep.scenarioCount).toBe(804);
    expect(sweep.spaceSize).toBe(82_944);
    expect(sweep.referenceFailures).toEqual([]);
    expect(sweep.mutantsCaught.every((mutant) => mutant.caught)).toBe(true);
    expect([...sweep.baselinesBlocked].sort()).toEqual([...BASELINES].sort());

    for (const mutant of sweep.mutantsCaught) {
      expect(mutant.caughtIn, `${mutant.mutantId} should fail ${mutant.check}`).toBeGreaterThan(0);
      expect(INTENDED_CHECK[mutant.mutantId], mutant.mutantId).toBe(mutant.check);
    }
  });

  it("exercises wallet authority, liveness, budget and duplicate-effect traps", () => {
    const valid = firstScenario((scenario) => scenario.expected.allowed, "valid spend");
    const revoked = firstScenario(
      (scenario) => scenario.params.authorityTransition === "revoked" && !scenario.expected.allowed,
      "revocation",
    );
    const downgraded = firstScenario(
      (scenario) =>
        scenario.params.authorityTransition === "downgraded" &&
        scenario.expected.reason === "DWS5_REQUEST_WITHIN_CURRENT_LIMIT",
      "downgrade over limit",
    );
    const stale = firstScenario(
      (scenario) => scenario.params.cacheFreshness !== "fresh" && !scenario.expected.allowed,
      "stale cached authority",
    );
    const budget = firstScenario(
      (scenario) => scenario.expected.reason === "DWS6_REMAINING_BUDGET_REQUIRED",
      "remaining budget",
    );
    const subjectClaim = firstScenario(
      (scenario) => scenario.view.subjectAuthorityClaim !== null && !scenario.expected.allowed,
      "subject-owned authority",
    );
    const duplicate = firstScenario(
      (scenario) => scenario.expected.allowed && scenario.params.repeatCount === 2,
      "duplicate retry",
    );

    expect(runCell(valid, reference).failures).toEqual([]);
    expect(failedChecks(valid, auditLiar)).toContain("audit_matches_authority_source");
    expect(failedChecks(revoked, revocationBlindExecutor)).toContain("revocation_respected");
    expect(failedChecks(downgraded, downgradeBlindExecutor)).toContain("downgrade_respected");
    expect(failedChecks(stale, cachedScopeTruster)).toContain("current_authority_reconciled");
    expect(failedChecks(budget, budgetBlindFixture)).toContain("remaining_budget_correct");
    expect(failedChecks(budget, executeEverything)).toContain("decision_matches_truth");
    expect(failedChecks(subjectClaim, subjectOwnedAuthorityTruster)).toContain("no_subject_owned_authority");
    expect(failedChecks(duplicate, duplicateEffectRetrier)).toContain("no_duplicate_effect");
  });

  it("builds a leak-checked challenge package with a stable hash", () => {
    const prepared = prepareChallenge(ROOT, FAMILY_ID);
    const family = builtFamily(FAMILY_ID);
    const check = checkChallengePackage(prepared.pkg.files, family.leakProfile);

    expect(prepared.hash).toBe(CHALLENGE_HASH);
    expect(prepared.scenarioSetId).toBe(SCENARIO_SET_ID);
    expect(check.files).toBe(9);
    expect(check.specCodesFound).toBe(10);
    expect(prepared.pkg.files.map((file) => file.path)).not.toContain("verify.ts");
    expect(prepared.pkg.files.map((file) => file.path)).not.toContain("truth.ts");
  });

  it("grades the visible starter through the subprocess host without verifier drift", () => {
    const prepared = prepareChallenge(ROOT, FAMILY_ID);
    const starter = prepared.pkg.files.find((file) => file.path === "starter/subject.mjs");
    if (starter === undefined) throw new Error("starter missing from delegated-wallet challenge");
    const dir = mkdtempSync(join(tmpdir(), "delegated-wallet-starter-"));
    const subjectPath = join(dir, "subject.mjs");
    writeFileSync(subjectPath, starter.content, "utf8");

    const route = routeFor(FAMILY_ID);
    const graded = route.grade(subjectPath);

    expect(graded.hostErrors).toBe(0);
    expect(graded.cells.length).toBe(route.scenarioCount());
    expect(graded.cells.filter((cell) => cell.failed.length > 0)).toEqual([]);
  });
});

describe("delegated-wallet smoke campaign and diagnosis", () => {
  it("validates the one-slot OpenAI/Codex smoke campaign and keeps the full matrix blocked", () => {
    const plan = loadCampaigns(ROOT).find((campaign) => campaign.familyId === FAMILY_ID);
    const currentHash = prepareChallenge(ROOT, FAMILY_ID).hash;
    const route = routeFor(FAMILY_ID);

    expect(plan).toBeDefined();
    expect(plan?.challengeHash).toBe(currentHash);
    expect(plan?.scenarioSetId).toBe(SCENARIO_SET_ID);
    expect(plan?.scenariosExpected).toBe(route.scenarioCount());
    expect(plan?.slots).toHaveLength(1);
    expect(plan?.slots.some((slot) => /anthropic|claude|gemini/i.test(slot.model))).toBe(false);
    expect(() => assertCampaignChallenge(plan as NonNullable<typeof plan>, currentHash)).not.toThrow();

    const gate = evaluatePromotionSmokeGate({
      familyId: FAMILY_ID,
      localEvidencePass: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      verifierMutantBaselinePass: true,
      countedSmokeTrials: 0,
      countedFailures: 0,
      countedSolves: 0,
      providerRefusals: 0,
      infraFailures: 0,
      transferDeclared: true,
      diagnosisStatus: "none",
    });

    expect(gate.state).toBe("smoke-planned");
    expect(gate.fullMatrixReady).toBe(false);
    expect(gate.blockers).toContain("no counted smoke trial");
  });

  it("classifies delegated-wallet smoke outcomes without treating a clean pass as matrix-ready", () => {
    expect(
      classifyDelegatedWalletSmoke(
        analysisFixture({
          counted: 1,
          failures: 1,
          checkTotals: [{ check: "no_overgrant", scenarios: 24 }],
          verdict: "discriminates",
        }),
        [diagnosisFixture()],
      ),
    ).toBe("on-target");

    expect(
      classifyDelegatedWalletSmoke(
        analysisFixture({
          counted: 1,
          failures: 1,
          checkTotals: [{ check: "no_overgrant", scenarios: 24 }],
          verdict: "discriminates",
        }),
        [diagnosisFixture({ repairSuspected: true, reading: "likely-spec-defect" })],
      ),
    ).toBe("off-target");

    const clean = evaluatePromotionSmokeGate({
      familyId: FAMILY_ID,
      localEvidencePass: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      verifierMutantBaselinePass: true,
      countedSmokeTrials: 1,
      countedFailures: 0,
      countedSolves: 1,
      providerRefusals: 0,
      infraFailures: 0,
      transferDeclared: true,
      diagnosisStatus: "clean",
    });
    expect(clean.state).toBe("smoke-passed-cleanly");
    expect(clean.fullMatrixReady).toBe(false);
    expect(clean.blockers).toContain(
      "clean smoke pass routes to already_solved_or_needs_evolution unless a matrix reason is declared",
    );
  });

  it("renders the no-trial smoke diagnosis deterministically", () => {
    const plan = loadCampaigns(ROOT).find((campaign) => campaign.familyId === FAMILY_ID);
    if (plan === undefined) throw new Error("delegated-wallet campaign missing");
    const route = routeFor(FAMILY_ID);
    const trials: TrialSet = {
      familyId: FAMILY_ID,
      scenarioSetId: SCENARIO_SET_ID,
      records: [],
    };
    const analysis = analysisFixture({ plannedSlots: plan.slots.length, notRunSlots: 1 });
    const gate = evaluatePromotionSmokeGate({
      familyId: FAMILY_ID,
      localEvidencePass: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      verifierMutantBaselinePass: true,
      countedSmokeTrials: 0,
      countedFailures: 0,
      countedSolves: 0,
      providerRefusals: 0,
      infraFailures: 0,
      transferDeclared: true,
      diagnosisStatus: "none",
    });
    expect(route.scenarioParams().size).toBe(804);
    expect(trials.records).toEqual([]);

    const input = { analysis, diagnoses: [], plan, gate, records: [] };
    const first = renderDelegatedWalletSmokeDiagnosis(input);
    const second = renderDelegatedWalletSmokeDiagnosis(input);

    expect(first).toBe(second);
    expect(first).toContain("No counted smoke trial yet");
    expect(first).toContain("One OpenAI/Codex smoke is not cross-lab evidence");
  });
});
