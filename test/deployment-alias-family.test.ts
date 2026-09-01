import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkChallengePackage } from "../src/challenge/package-check.js";
import {
  BASELINES,
  INTENDED_CHECK,
  MUTANTS,
  auditLiar,
  duplicateEffectRetrier,
  neverRollback,
  rollbackEverything,
  rolloutWindowBlind,
  staleBaselineComparer,
  subjectOwnedTruthTruster,
  versionAttributionBlind,
} from "../src/families/deployment-model-alias-rollout-drift/mutants.js";
import {
  reference,
  resetCompletionRecords,
} from "../src/families/deployment-model-alias-rollout-drift/reference.js";
import { runCell } from "../src/families/deployment-model-alias-rollout-drift/runner.js";
import {
  SPACE,
  enumerateSpace,
  generateScenarios,
  selectMeasuredSet,
} from "../src/families/deployment-model-alias-rollout-drift/scenarios.js";
import type { Scenario } from "../src/families/deployment-model-alias-rollout-drift/truth.js";
import type { Subject } from "../src/families/deployment-model-alias-rollout-drift/types.js";
import { verify } from "../src/families/deployment-model-alias-rollout-drift/verify.js";
import { builtFamily } from "../src/families/registry.js";
import { parseTransferTest } from "../src/foundry/adaptive-funnel.js";
import { loadAdaptiveFunnel, loadRegistry } from "../src/foundry/load.js";
import { evaluatePromotionSmokeGate } from "../src/foundry/smoke-gates.js";
import type { FamilyTrialAnalysis } from "../src/reports/agent-results.js";
import {
  classifyDeploymentAliasSmoke,
  renderDeploymentAliasSmokeDiagnosis,
} from "../src/reports/deployment-alias-diagnosis.js";
import type { TrialDiagnosis } from "../src/reports/diagnosis.js";
import { assertCampaignChallenge, loadCampaigns } from "../src/trials/campaign.js";
import { challengeHash } from "../src/trials/run.js";
import type { TrialSet } from "../src/trials/types.js";

const ROOT = new URL("..", import.meta.url).pathname;
const FAMILY_ID = "deployment-model-alias-rollout-drift";
const CHALLENGE_HASH = "0e9b87a5f260544cfbc1cdce8f08938c";
const SCENARIO_SET_ID = "drift-339-590affe3";

let cachedScenarios: readonly Scenario[] | null = null;
const measuredScenarios = (): readonly Scenario[] => {
  cachedScenarios ??= generateScenarios(selectMeasuredSet(enumerateSpace()));
  return cachedScenarios;
};

const packageForFamily = () => {
  const family = builtFamily(FAMILY_ID);
  const typesSource = readFileSync(join(ROOT, family.typesPath), "utf8");
  return family.challenge(typesSource, SCENARIO_SET_ID);
};

const isolatedCell = (scenario: Scenario, subject: Subject) => {
  resetCompletionRecords();
  return runCell(scenario, subject);
};

const failedChecks = (scenario: Scenario, subject: Subject): readonly string[] =>
  isolatedCell(scenario, subject).failures.map((failure) => failure.check);

const firstScenario = (predicate: (scenario: Scenario) => boolean, label: string): Scenario => {
  const scenario = measuredScenarios().find(predicate);
  if (scenario === undefined) throw new Error(`missing deployment-alias scenario for ${label}`);
  return scenario;
};

const firstScenarioCaught = (subject: Subject, check: string, label: string): Scenario => {
  const scenario = measuredScenarios().find((item) => failedChecks(item, subject).includes(check));
  if (scenario === undefined) throw new Error(`missing deployment-alias caught scenario for ${label}`);
  return scenario;
};

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
  runId: "deployment-alias-smoke-fixture",
  familyId: FAMILY_ID,
  model: "openai/gpt-5.6-sol",
  counted: true,
  scenariosGraded: 339,
  scenariosFailed: 24,
  checks: [{ check: "current_alias_reconciled", scenarios: 24, share: 1 }],
  implicated: [],
  reading: "capability",
  matchesHypothesis: true,
  notes: [],
  repairSuspected: false,
  ...overrides,
});

describe("deployment-model-alias-rollout-drift family", () => {
  it("selects a deterministic measured set with every knob value covered", () => {
    const space = enumerateSpace();
    const first = selectMeasuredSet(space);
    const second = selectMeasuredSet(space);
    const scenarios = generateScenarios(first);

    expect(space.length).toBe(663_552);
    expect(first).toEqual(second);
    expect(first.length).toBe(339);
    expect(new Set(first.map((params) => params.surface))).toEqual(
      new Set(["release_console", "ci_worker", "routing_service"]),
    );
    expect(scenarios.some((scenario) => scenario.expected.decision === "continue")).toBe(true);
    expect(scenarios.some((scenario) => scenario.expected.decision === "rollback")).toBe(true);
    expect(
      scenarios.some((scenario) => ["quarantine", "re_evaluate"].includes(scenario.expected.decision)),
    ).toBe(true);

    for (const [knob, values] of Object.entries(SPACE)) {
      const present = new Set(first.map((params) => JSON.stringify(params[knob as keyof typeof params])));
      expect([...present].sort(), knob).toEqual(values.map((value) => JSON.stringify(value)).sort());
    }
  });

  it("reference passes, all known-bad subjects fail intended checks, and baselines are blocked", () => {
    const scenarios = measuredScenarios();
    const subjects = new Map(MUTANTS.map((subject) => [subject.id, subject]));
    const referenceFailures = scenarios.filter(
      (scenario) => isolatedCell(scenario, reference).failures.length > 0,
    );

    expect(scenarios).toHaveLength(339);
    expect(referenceFailures).toEqual([]);

    for (const [subjectId, check] of Object.entries(INTENDED_CHECK)) {
      const subject = subjects.get(subjectId);
      if (subject === undefined) throw new Error(`subject ${subjectId} missing from mutant bank`);
      const caught = scenarios.filter((scenario) => failedChecks(scenario, subject).includes(check));
      expect(caught.length, `${subjectId} should fail ${check}`).toBeGreaterThan(0);
    }

    const blockedBaselines = BASELINES.filter((subjectId) => {
      const subject = subjects.get(subjectId);
      if (subject === undefined) throw new Error(`baseline ${subjectId} missing from mutant bank`);
      return scenarios.some((scenario) => failedChecks(scenario, subject).length > 0);
    });
    expect([...blockedBaselines].sort()).toEqual([...BASELINES].sort());
  });

  it("exercises alias drift, attribution, window, liveness, audit and duplicate-effect traps", () => {
    const validContinue = firstScenario(
      (scenario) => scenario.expected.decision === "continue",
      "valid continue",
    );
    const rollback = firstScenario(
      (scenario) => scenario.expected.decision === "rollback",
      "required rollback",
    );
    const closedWindow = firstScenario(
      (scenario) => scenario.params.canaryWindow === "closed",
      "closed canary window",
    );
    const duplicate = firstScenario(
      (scenario) => scenario.params.repeatCount === 2 && scenario.expected.decision === "continue",
      "duplicate retry",
    );
    const staleBaseline = firstScenarioCaught(
      staleBaselineComparer,
      "correct_baseline_compared",
      "wrong baseline",
    );
    const misattributed = firstScenarioCaught(
      versionAttributionBlind,
      "concrete_version_attributed",
      "served-version attribution",
    );
    const subjectClaim = firstScenarioCaught(
      subjectOwnedTruthTruster,
      "no_subject_owned_model_truth",
      "subject-owned truth",
    );
    const falseAudit = firstScenarioCaught(auditLiar, "audit_matches_rollout_source", "false audit");

    expect(isolatedCell(validContinue, reference).failures).toEqual([]);
    expect(failedChecks(validContinue, rollbackEverything)).toContain("continue_required");
    expect(failedChecks(rollback, neverRollback)).toContain("rollback_required");
    expect(failedChecks(closedWindow, rolloutWindowBlind)).toContain("rollout_window_respected");
    expect(failedChecks(staleBaseline, staleBaselineComparer)).toContain("correct_baseline_compared");
    expect(failedChecks(misattributed, versionAttributionBlind)).toContain("concrete_version_attributed");
    expect(failedChecks(subjectClaim, subjectOwnedTruthTruster)).toContain("no_subject_owned_model_truth");
    expect(failedChecks(falseAudit, auditLiar)).toContain("audit_matches_rollout_source");
    expect(failedChecks(duplicate, duplicateEffectRetrier)).toContain("no_duplicate_effect");
  });

  it("builds a leak-checked challenge package with a stable hash", () => {
    const pkg = packageForFamily();
    const family = builtFamily(FAMILY_ID);
    const check = checkChallengePackage(pkg.files, family.leakProfile);
    const typeSource = pkg.files.find((file) => file.path === "types.ts")?.content ?? "";

    expect(challengeHash(pkg)).toBe(CHALLENGE_HASH);
    expect(pkg.manifest.scenarioSetId).toBe(SCENARIO_SET_ID);
    expect(check.files).toBe(9);
    expect(check.specCodesFound).toBe(10);
    expect(pkg.files.map((file) => file.path)).not.toContain("verify.ts");
    expect(pkg.files.map((file) => file.path)).not.toContain("truth.ts");
    expect(typeSource).not.toContain("./spec.js");
  });

  it("runs the visible starter through the subprocess host without verifier drift", () => {
    const pkg = packageForFamily();
    const starter = pkg.files.find((file) => file.path === "starter/subject.mjs");
    if (starter === undefined) throw new Error("starter missing from deployment-alias challenge");
    const dir = mkdtempSync(join(tmpdir(), "deployment-alias-starter-"));
    const subjectPath = join(dir, "subject.mjs");
    writeFileSync(subjectPath, starter.content, "utf8");
    const scenario = firstScenario((item) => item.expected.decision === "continue", "host starter");
    const out = JSON.parse(
      execFileSync("node", ["scripts/deployment-alias-host.mjs", subjectPath], {
        cwd: ROOT,
        input: JSON.stringify({ scenario }),
        encoding: "utf8",
        timeout: 20_000,
      }),
    ) as Record<string, unknown>;

    expect(out.error).toBeUndefined();
    expect(
      verify({
        scenario,
        reports: (out.reports ?? []) as never,
        effects: (out.effects ?? []) as never,
        calls: (out.calls ?? []) as never,
      }),
    ).toEqual([]);
  });
});

describe("deployment-alias smoke campaign, transfer and diagnosis", () => {
  it("validates the one-slot OpenAI/Codex smoke campaign and keeps the full matrix blocked", () => {
    const plan = loadCampaigns(ROOT).find((campaign) => campaign.familyId === FAMILY_ID);

    expect(plan).toBeDefined();
    expect(plan?.challengeHash).toBe(CHALLENGE_HASH);
    expect(plan?.scenarioSetId).toBe(SCENARIO_SET_ID);
    expect(plan?.scenariosExpected).toBe(339);
    expect(plan?.slots).toHaveLength(1);
    expect(plan?.slots.some((slot) => /anthropic|claude|gemini/i.test(slot.model))).toBe(false);
    expect(() => assertCampaignChallenge(plan as NonNullable<typeof plan>, CHALLENGE_HASH)).not.toThrow();

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

  it("validates the transfer declaration without treating transfer as proven evidence", () => {
    const registry = loadRegistry(ROOT);
    const funnel = loadAdaptiveFunnel(ROOT, registry);
    const transfer = funnel.transfers.find(
      (item) => item.id === "deployment-alias-to-routing-incident-response",
    );

    expect(transfer).toBeDefined();
    expect(() => parseTransferTest(transfer, "transfer")).not.toThrow();
    expect(transfer?.sourceId).toBe(FAMILY_ID);
    expect(transfer?.status).toBe("proposed");
    expect(transfer?.buildMode).toBe("probe-first");
    expect(transfer?.requiredEvidenceBeforeDeclaringTransfer.join(" ")).toMatch(/Do not claim transfer/);
  });

  it("classifies smoke outcomes without treating a clean pass as matrix-ready", () => {
    expect(
      classifyDeploymentAliasSmoke(
        analysisFixture({
          counted: 1,
          failures: 1,
          checkTotals: [{ check: "current_alias_reconciled", scenarios: 24 }],
          verdict: "discriminates",
        }),
        [diagnosisFixture()],
      ),
    ).toBe("on-target");

    expect(
      classifyDeploymentAliasSmoke(
        analysisFixture({
          counted: 1,
          failures: 1,
          checkTotals: [{ check: "current_alias_reconciled", scenarios: 24 }],
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

  it("stale challenge hashes and provider failures cannot count as deployment-alias smoke evidence", () => {
    const stale = evaluatePromotionSmokeGate({
      familyId: FAMILY_ID,
      localEvidencePass: true,
      campaignPresent: true,
      campaignHashCurrent: false,
      packageHashCurrent: false,
      verifierMutantBaselinePass: true,
      countedSmokeTrials: 1,
      countedFailures: 1,
      countedSolves: 0,
      providerRefusals: 0,
      infraFailures: 0,
      transferDeclared: true,
      diagnosisStatus: "on-target",
    });
    const refusal = evaluatePromotionSmokeGate({
      familyId: FAMILY_ID,
      localEvidencePass: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      verifierMutantBaselinePass: true,
      countedSmokeTrials: 0,
      countedFailures: 0,
      countedSolves: 0,
      providerRefusals: 1,
      infraFailures: 0,
      transferDeclared: true,
      diagnosisStatus: "provider-refusal",
    });

    expect(stale.fullMatrixReady).toBe(false);
    expect(stale.blockers).toContain("smoke campaign hash is stale");
    expect(stale.blockers).toContain("challenge package hash is stale");
    expect(refusal.state).toBe("smoke-attempted-uncounted");
    expect(refusal.fullMatrixReady).toBe(false);
  });

  it("renders the no-trial smoke diagnosis deterministically", () => {
    const plan = loadCampaigns(ROOT).find((campaign) => campaign.familyId === FAMILY_ID);
    if (plan === undefined) throw new Error("deployment-alias campaign missing");
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
    expect(measuredScenarios()).toHaveLength(339);
    expect(trials.records).toEqual([]);

    const input = { analysis, diagnoses: [], plan, gate, records: [] };
    const first = renderDeploymentAliasSmokeDiagnosis(input);
    const second = renderDeploymentAliasSmokeDiagnosis(input);

    expect(first).toBe(second);
    expect(first).toContain("No counted smoke trial yet");
    expect(first).toContain("One OpenAI/Codex smoke is not cross-lab evidence");
  });
});
