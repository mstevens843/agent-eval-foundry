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
import { evaluateProductionReadiness } from "../src/foundry/production-readiness.js";
import { evaluatePromotionSmokeGate } from "../src/foundry/smoke-gates.js";
import type { FamilyTrialAnalysis } from "../src/reports/agent-results.js";
import {
  classifyDeploymentAliasSmoke,
  renderDeploymentAliasSmokeDiagnosis,
} from "../src/reports/deployment-alias-diagnosis.js";
import {
  auditDeploymentAliasCrossLabBundles,
  renderDeploymentAliasCrossLabReadiness,
  renderDeploymentAliasProductionReadiness,
} from "../src/reports/deployment-alias-production.js";
import type { TrialDiagnosis } from "../src/reports/diagnosis.js";
import { assertCampaignChallenge, loadCampaigns } from "../src/trials/campaign.js";
import { challengeHash } from "../src/trials/run.js";
import type { TrialRecord, TrialSet } from "../src/trials/types.js";

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

const trialRecordFixture = (overrides: Partial<TrialRecord> = {}): TrialRecord => ({
  runId: "deployment-alias-openai-fixture",
  familyId: FAMILY_ID,
  subjectId: "gpt-5.6-sol",
  subjectType: "agent",
  model: "openai/gpt-5.6-sol",
  effort: null,
  status: "completed",
  counts: true,
  countsReason: "fixture counted completed smoke",
  scenarioSetId: SCENARIO_SET_ID,
  cells: [
    { scenarioId: "scenario-a", failed: ["current_alias_reconciled"] },
    { scenarioId: "scenario-b", failed: [] },
  ],
  runtimeSeconds: null,
  costUsd: null,
  artifactPath: "trials/deployment-model-alias-rollout-drift/fixture/submission",
  isolation: "subprocess",
  notes: "fixture",
  ...overrides,
});

type ProductionReadinessInput = Parameters<typeof evaluateProductionReadiness>[0];

const productionReadinessFixture = (
  overrides: Partial<ProductionReadinessInput> = {},
): ProductionReadinessInput => ({
  familyId: FAMILY_ID,
  challengeHash: CHALLENGE_HASH,
  currentChallengeHash: CHALLENGE_HASH,
  localVerifierReady: true,
  packageBacked: true,
  campaignPresent: true,
  campaignHashCurrent: true,
  packageHashCurrent: true,
  countedSmokeTrials: 2,
  countedSmokeFailures: 1,
  countedSmokeSolves: 0,
  providerRefusals: 0,
  infraFailures: 0,
  modelFamilies: ["openai", "second-lab"],
  countedFailureModelFamilies: ["openai", "second-lab"],
  diagnosisStatus: "on-target",
  transferDeclared: true,
  adversarialReady: true,
  countedNoBypassAudits: 1,
  countedBypassAudits: 0,
  unrepairedBypasses: 0,
  humanReady: false,
  cleanHumanSolves: 0,
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

  it("validates the imported Claude cross-lab smoke campaign under the same hash", () => {
    const plan = loadCampaigns(ROOT).find(
      (campaign) => campaign.campaignId === "deployment-model-alias-rollout-drift-cross-lab-smoke-2026-09",
    );

    expect(plan).toBeDefined();
    expect(plan?.challengeHash).toBe(CHALLENGE_HASH);
    expect(plan?.scenarioSetId).toBe(SCENARIO_SET_ID);
    expect(plan?.slots).toHaveLength(1);
    expect(plan?.slots[0]?.model).toBe("anthropic/claude-opus-5");
    expect(plan?.slots[0]?.runner).toBe("external");
    expect(plan?.slots[0]?.state).toBe("IMPORTED");
    expect(plan?.slots[0]?.runId).toBe("deployment-alias-2026-09-claude-1");
    expect(plan?.killSignal).toMatch(/provider-delta/);
    expect(plan?.confirmSignal).toMatch(/cross-lab smoke difficulty/);
    expect(() => assertCampaignChallenge(plan as NonNullable<typeof plan>, CHALLENGE_HASH)).not.toThrow();
  });

  it("validates the transfer declaration without treating transfer as proven evidence", () => {
    const registry = loadRegistry(ROOT);
    const funnel = loadAdaptiveFunnel(ROOT, registry);
    const transfer = funnel.transfers.find(
      (item) => item.id === "deployment-alias-to-routing-incident-response",
    );
    const featureFlagTransfer = funnel.transfers.find(
      (item) => item.id === "deployment-alias-to-feature-flag-rollout-drift",
    );

    expect(transfer).toBeDefined();
    expect(() => parseTransferTest(transfer, "transfer")).not.toThrow();
    expect(transfer?.sourceId).toBe(FAMILY_ID);
    expect(transfer?.status).toBe("proposed");
    expect(transfer?.buildMode).toBe("probe-first");
    expect(transfer?.requiredEvidenceBeforeDeclaringTransfer.join(" ")).toMatch(/Do not claim transfer/);
    expect(featureFlagTransfer).toBeDefined();
    expect(() => parseTransferTest(featureFlagTransfer, "feature-flag-transfer")).not.toThrow();
    expect(featureFlagTransfer?.status).toBe("ready");
    expect(featureFlagTransfer?.targetDomain).toBe("feature-flag rollout drift");
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
    expect(first).toContain("No counted smoke trial exists, so no cross-lab comparison exists");
  });

  it("blocks production matrix readiness after one OpenAI-only on-target smoke failure", () => {
    const readiness = evaluateProductionReadiness({
      familyId: FAMILY_ID,
      challengeHash: CHALLENGE_HASH,
      currentChallengeHash: CHALLENGE_HASH,
      localVerifierReady: true,
      packageBacked: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      countedSmokeTrials: 1,
      countedSmokeFailures: 1,
      countedSmokeSolves: 0,
      providerRefusals: 0,
      infraFailures: 0,
      modelFamilies: ["openai"],
      countedFailureModelFamilies: ["openai"],
      diagnosisStatus: "on-target",
      transferDeclared: true,
      adversarialReady: true,
      countedNoBypassAudits: 0,
      countedBypassAudits: 0,
      unrepairedBypasses: 0,
      humanReady: true,
      cleanHumanSolves: 0,
    });

    expect(readiness.smokeDifficultyEvidenced).toBe(true);
    expect(readiness.crossLabSmokeEvidenced).toBe(false);
    expect(readiness.fullMatrixReady).toBe(false);
    expect(readiness.statuses).toContain("smoke-failed-on-target");
    expect(readiness.statuses).toContain("cross-lab-smoke-needed");
    expect(readiness.statuses).toContain("matrix-blocked");
    expect(readiness.blockers.map((finding) => finding.code)).toContain(
      "PRODUCTION_MATRIX_NEEDS_NON_OPENAI_SMOKE",
    );
    expect(readiness.advisories.map((finding) => finding.code)).toContain(
      "PRODUCTION_OPENAI_ONLY_NO_CROSS_LAB",
    );
  });

  it("keeps a counted Claude clean solve from becoming cross-lab difficulty evidence", () => {
    const readiness = evaluateProductionReadiness({
      familyId: FAMILY_ID,
      challengeHash: CHALLENGE_HASH,
      currentChallengeHash: CHALLENGE_HASH,
      localVerifierReady: true,
      packageBacked: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      countedSmokeTrials: 2,
      countedSmokeFailures: 1,
      countedSmokeSolves: 1,
      providerRefusals: 0,
      infraFailures: 0,
      modelFamilies: ["anthropic", "openai"],
      countedFailureModelFamilies: ["openai"],
      diagnosisStatus: "on-target",
      transferDeclared: true,
      adversarialReady: true,
      countedNoBypassAudits: 1,
      countedBypassAudits: 0,
      unrepairedBypasses: 0,
      humanReady: true,
      cleanHumanSolves: 0,
    });

    expect(readiness.crossLabSmokeEvidenced).toBe(true);
    expect(readiness.crossLabDifficultyEvidenced).toBe(false);
    expect(readiness.mixedCrossLabSmoke).toBe(true);
    expect(readiness.fullMatrixReady).toBe(false);
    expect(readiness.statuses).toContain("cross-lab-smoke-present");
    expect(readiness.statuses).toContain("cross-lab-smoke-mixed");
    expect(readiness.blockers.map((finding) => finding.code)).toContain("PRODUCTION_CROSS_LAB_SMOKE_MIXED");
    expect(readiness.nextAction).toMatch(/provider delta|evolve/);
  });

  it("renders mixed OpenAI failure and Claude clean solve as provider-delta diagnosis", () => {
    const openai = trialRecordFixture();
    const claude = trialRecordFixture({
      runId: "deployment-alias-claude-fixture",
      subjectId: "claude-opus-5",
      model: "anthropic/claude-opus-5",
      cells: [
        { scenarioId: "scenario-a", failed: [] },
        { scenarioId: "scenario-b", failed: [] },
      ],
    });
    const report = renderDeploymentAliasSmokeDiagnosis({
      analysis: analysisFixture({
        counted: 2,
        solves: 1,
        failures: 1,
        modelFamilies: ["anthropic", "openai"],
        checkTotals: [{ check: "current_alias_reconciled", scenarios: 1 }],
        verdict: "discriminates",
      }),
      diagnoses: [diagnosisFixture()],
      plan: undefined,
      gate: evaluatePromotionSmokeGate({
        familyId: FAMILY_ID,
        localEvidencePass: true,
        campaignPresent: true,
        campaignHashCurrent: true,
        packageHashCurrent: true,
        verifierMutantBaselinePass: true,
        countedSmokeTrials: 2,
        countedFailures: 1,
        countedSolves: 1,
        providerRefusals: 0,
        infraFailures: 0,
        transferDeclared: true,
        diagnosisStatus: "on-target",
      }),
      records: [openai, claude],
    });

    expect(report).toContain("Counted provider families: `anthropic`, `openai`.");
    expect(report).toContain("mixed provider result; no cross-lab difficulty claim");
    expect(report).toContain("production `/6` stays blocked pending diagnosis or evolution");
  });

  it("keeps refusal, infra and stale hashes out of production readiness", () => {
    const input = {
      familyId: FAMILY_ID,
      challengeHash: CHALLENGE_HASH,
      currentChallengeHash: CHALLENGE_HASH,
      localVerifierReady: true,
      packageBacked: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      countedSmokeTrials: 0,
      countedSmokeFailures: 0,
      countedSmokeSolves: 0,
      providerRefusals: 1,
      infraFailures: 1,
      modelFamilies: [],
      countedFailureModelFamilies: [],
      diagnosisStatus: "provider-refusal",
      transferDeclared: true,
      adversarialReady: true,
      countedNoBypassAudits: 0,
      countedBypassAudits: 0,
      unrepairedBypasses: 0,
      humanReady: true,
      cleanHumanSolves: 0,
    } as const;
    const refusal = evaluateProductionReadiness(input);
    const stale = evaluateProductionReadiness({
      ...input,
      challengeHash: "old-hash",
      countedSmokeTrials: 1,
      countedSmokeFailures: 1,
      providerRefusals: 0,
      infraFailures: 0,
      modelFamilies: ["openai", "anthropic"],
      countedFailureModelFamilies: ["openai", "anthropic"],
      diagnosisStatus: "on-target",
      countedNoBypassAudits: 1,
    });

    expect(refusal.fullMatrixReady).toBe(false);
    expect(refusal.statuses).toContain("smoke-attempted");
    expect(refusal.blockers.map((finding) => finding.code)).toContain("PRODUCTION_NO_COUNTED_SMOKE");
    expect(refusal.advisories.map((finding) => finding.code)).toContain(
      "PRODUCTION_PROVIDER_FAILURE_NO_COUNT",
    );
    expect(stale.fullMatrixReady).toBe(false);
    expect(stale.statuses).toContain("stale-hash-blocked");
    expect(stale.blockers.map((finding) => finding.code)).toContain("PRODUCTION_STALE_HASH_BLOCKS_MATRIX");
  });

  it("requires counted no-bypass or bypass audit before calling adversarial-ready audited", () => {
    const input = {
      familyId: FAMILY_ID,
      challengeHash: CHALLENGE_HASH,
      currentChallengeHash: CHALLENGE_HASH,
      localVerifierReady: true,
      packageBacked: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      countedSmokeTrials: 1,
      countedSmokeFailures: 1,
      countedSmokeSolves: 0,
      providerRefusals: 0,
      infraFailures: 0,
      modelFamilies: ["openai", "anthropic"],
      countedFailureModelFamilies: ["openai", "anthropic"],
      diagnosisStatus: "on-target",
      transferDeclared: true,
      adversarialReady: true,
      countedNoBypassAudits: 0,
      countedBypassAudits: 0,
      unrepairedBypasses: 0,
      humanReady: true,
      cleanHumanSolves: 0,
    } as const;
    const readyNotAudited = evaluateProductionReadiness(input);
    const audited = evaluateProductionReadiness({
      ...input,
      countedNoBypassAudits: 1,
    });

    expect(readyNotAudited.fullMatrixReady).toBe(true);
    expect(readyNotAudited.advisories.map((finding) => finding.code)).toContain(
      "PRODUCTION_ADVERSARIAL_READY_NOT_AUDITED",
    );
    expect(audited.fullMatrixReady).toBe(true);
    expect(audited.advisories.map((finding) => finding.code)).not.toContain(
      "PRODUCTION_ADVERSARIAL_READY_NOT_AUDITED",
    );
  });

  it("exercises every production-readiness rule code through intended known-bad cases", () => {
    const cases = [
      ["PRODUCTION_LOCAL_VERIFIER_NOT_READY", { localVerifierReady: false }, "blockers"],
      ["PRODUCTION_PACKAGE_NOT_BACKED", { packageBacked: false }, "blockers"],
      [
        "PRODUCTION_NO_COUNTED_SMOKE",
        { countedSmokeTrials: 0, countedSmokeFailures: 0, modelFamilies: [] },
        "blockers",
      ],
      ["PRODUCTION_STALE_HASH_BLOCKS_MATRIX", { challengeHash: "stale" }, "blockers"],
      ["PRODUCTION_PROVIDER_FAILURE_NO_COUNT", { providerRefusals: 1, infraFailures: 1 }, "advisories"],
      [
        "PRODUCTION_CLEAN_PASS_NOT_DIFFICULTY",
        {
          countedSmokeTrials: 1,
          countedSmokeFailures: 0,
          countedSmokeSolves: 1,
          diagnosisStatus: "clean",
        },
        "blockers",
      ],
      ["PRODUCTION_OFF_TARGET_SMOKE_REPAIR", { diagnosisStatus: "off-target" }, "blockers"],
      ["PRODUCTION_TRANSFER_NOT_DECLARED", { transferDeclared: false }, "blockers"],
      ["PRODUCTION_MATRIX_NEEDS_NON_OPENAI_SMOKE", { modelFamilies: ["openai"] }, "blockers"],
      [
        "PRODUCTION_CROSS_LAB_SMOKE_MIXED",
        { modelFamilies: ["openai", "anthropic"], countedFailureModelFamilies: ["openai"] },
        "blockers",
      ],
      ["PRODUCTION_OPENAI_ONLY_NO_CROSS_LAB", { modelFamilies: ["openai"] }, "advisories"],
      ["PRODUCTION_LOCAL_MUTANTS_NOT_DIFFICULTY", {}, "advisories"],
      ["PRODUCTION_ADVERSARIAL_NOT_READY", { adversarialReady: false }, "blockers"],
      [
        "PRODUCTION_ADVERSARIAL_READY_NOT_AUDITED",
        { countedNoBypassAudits: 0, countedBypassAudits: 0 },
        "advisories",
      ],
      ["PRODUCTION_HUMAN_READY_NOT_EVIDENCED", { humanReady: true, cleanHumanSolves: 0 }, "advisories"],
      ["PRODUCTION_UNREPAIRED_BYPASS", { unrepairedBypasses: 1 }, "blockers"],
    ] as const;

    for (const [code, overrides, bucket] of cases) {
      const readiness = evaluateProductionReadiness(productionReadinessFixture(overrides));
      expect(
        readiness[bucket].map((finding) => finding.code),
        `${code} should be asserted by the deployment-alias known-bad case`,
      ).toContain(code);
    }
  });

  it("audits current-hash cross-lab bundles without treating them as evidence", () => {
    const audits = auditDeploymentAliasCrossLabBundles(ROOT, CHALLENGE_HASH, SCENARIO_SET_ID);

    expect(audits.map((audit) => audit.providerId).sort()).toEqual(["claude", "external", "gemini"]);
    expect(audits.every((audit) => audit.present)).toBe(true);
    expect(audits.every((audit) => audit.hashMatches)).toBe(true);
    expect(audits.every((audit) => audit.leakCheck === "pass")).toBe(true);
    expect(audits.every((audit) => audit.metadataTemplate === "pass")).toBe(true);
    expect(audits.every((audit) => audit.hiddenFilesAbsent)).toBe(true);
    expect(audits.every((audit) => audit.generatedReportsAbsent)).toBe(true);

    const report = renderDeploymentAliasCrossLabReadiness({
      expectedHash: CHALLENGE_HASH,
      expectedScenarioSetId: SCENARIO_SET_ID,
      audits,
      analysis: analysisFixture(),
    });
    expect(report).toContain("prepared provider packets");
    expect(report).toContain("No cross-lab smoke claim exists");
  });

  it("renders production readiness deterministically", () => {
    const readiness = evaluateProductionReadiness({
      familyId: FAMILY_ID,
      challengeHash: CHALLENGE_HASH,
      currentChallengeHash: CHALLENGE_HASH,
      localVerifierReady: true,
      packageBacked: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      countedSmokeTrials: 1,
      countedSmokeFailures: 1,
      countedSmokeSolves: 0,
      providerRefusals: 0,
      infraFailures: 0,
      modelFamilies: ["openai"],
      countedFailureModelFamilies: ["openai"],
      diagnosisStatus: "on-target",
      transferDeclared: true,
      adversarialReady: true,
      countedNoBypassAudits: 0,
      countedBypassAudits: 0,
      unrepairedBypasses: 0,
      humanReady: true,
      cleanHumanSolves: 0,
    });
    const input = {
      readiness,
      analysis: analysisFixture({
        counted: 1,
        failures: 1,
        modelFamilies: ["openai"],
        checkTotals: [{ check: "decision_matches_truth", scenarios: 192 }],
      }),
      challengeHash: CHALLENGE_HASH,
      scenarioSetId: SCENARIO_SET_ID,
      measuredScenarios: 339,
      declaredSpace: 663_552,
      mutantDetectionAxes: 6,
      packageFiles: 9,
      packageBytes: 41_000,
    };
    const first = renderDeploymentAliasProductionReadiness(input);
    const second = renderDeploymentAliasProductionReadiness(input);

    expect(first).toBe(second);
    expect(first).toContain("Production matrix: **blocked**");
    expect(first).toContain("PRODUCTION_MATRIX_NEEDS_NON_OPENAI_SMOKE");
  });
});
