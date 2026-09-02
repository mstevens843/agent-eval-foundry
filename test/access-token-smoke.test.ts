import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { grantWidener } from "../src/families/access-token-scope-expansion/mutants.js";
import { reference, resetCompletionRecords } from "../src/families/access-token-scope-expansion/reference.js";
import { runCell } from "../src/families/access-token-scope-expansion/runner.js";
import {
  enumerateSpace,
  generateScenarios,
  selectMeasuredSet,
} from "../src/families/access-token-scope-expansion/scenarios.js";
import { parseTransferTest } from "../src/foundry/adaptive-funnel.js";
import {
  loadAdaptiveFunnel,
  loadDiscoveryWorkbench,
  loadProbeDefinitions,
  loadProbeRunSummary,
  loadPromotions,
  loadRegistry,
} from "../src/foundry/load.js";
import { promotedFamilyRecords } from "../src/foundry/promotion.js";
import { evaluatePromotionSmokeGate } from "../src/foundry/smoke-gates.js";
import { classifyAccessTokenSmoke } from "../src/reports/access-token-diagnosis.js";
import type { FamilyTrialAnalysis } from "../src/reports/agent-results.js";
import type { TrialDiagnosis } from "../src/reports/diagnosis.js";
import { renderPromotionReport } from "../src/reports/promotion-report.js";
import { parseCampaignPlan } from "../src/trials/campaign.js";

const ROOT = new URL("..", import.meta.url).pathname;
const FAMILY_ID = "access-token-scope-expansion";
const CAMPAIGN_PATH = `${ROOT}campaigns/access-token-scope-expansion-2026-08.json`;

const campaign = () => parseCampaignPlan(JSON.parse(readFileSync(CAMPAIGN_PATH, "utf8")), CAMPAIGN_PATH);

const analysis = (overrides: Partial<FamilyTrialAnalysis> = {}): FamilyTrialAnalysis => ({
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

const diagnosis = (overrides: Partial<TrialDiagnosis> = {}): TrialDiagnosis => ({
  runId: "access-token-smoke-fixture",
  familyId: FAMILY_ID,
  model: "openai/gpt-5.6-sol",
  counted: true,
  scenariosGraded: 384,
  scenariosFailed: 12,
  checks: [{ check: "scope_bound_exactly", scenarios: 12, share: 1 }],
  implicated: [],
  reading: "capability",
  matchesHypothesis: true,
  notes: [],
  repairSuspected: false,
  ...overrides,
});

describe("access-token smoke campaign", () => {
  it("validates the checked-in campaign and excludes Anthropic execution slots", () => {
    const plan = campaign();

    expect(plan.familyId).toBe(FAMILY_ID);
    expect(plan.challengeHash).toBe("8ae0950dea093d35d98b12d1c8c1bde5");
    expect(plan.slots).toHaveLength(1);
    expect(plan.slots[0]?.runner).toBe("shell");
    expect(plan.slots.some((slot) => /anthropic|claude/i.test(slot.model))).toBe(false);
    expect(plan.killSignal).toMatch(/already_solved_or_needs_evolution/);
    expect(plan.confirmSignal).toMatch(/smoke-difficulty evidence/);
  });

  it("one planned smoke slot does not satisfy full matrix readiness", () => {
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

  it("provider refusal and infrastructure failure remain uncounted smoke attempts", () => {
    const refusalInput = {
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
    } as const;
    const refusal = evaluatePromotionSmokeGate(refusalInput);
    const infra = evaluatePromotionSmokeGate({
      ...refusalInput,
      providerRefusals: 0,
      infraFailures: 1,
      diagnosisStatus: "infrastructure-error",
    });

    expect(refusal.state).toBe("smoke-attempted-uncounted");
    expect(refusal.fullMatrixReady).toBe(false);
    expect(infra.state).toBe("smoke-attempted-uncounted");
    expect(infra.fullMatrixReady).toBe(false);
  });

  it("stale challenge hash blocks smoke evidence and matrix readiness", () => {
    const gate = evaluatePromotionSmokeGate({
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

    expect(gate.fullMatrixReady).toBe(false);
    expect(gate.blockers).toContain("smoke campaign hash is stale");
    expect(gate.blockers).toContain("challenge package hash is stale");
  });
});

describe("access-token smoke diagnosis and transfer", () => {
  it("classifies on-target and off-target smoke failures", () => {
    expect(
      classifyAccessTokenSmoke(
        analysis({
          counted: 1,
          failures: 1,
          checkTotals: [{ check: "scope_bound_exactly", scenarios: 12 }],
          verdict: "discriminates",
        }),
        [diagnosis()],
      ),
    ).toBe("on-target");

    expect(
      classifyAccessTokenSmoke(
        analysis({
          counted: 1,
          failures: 1,
          checkTotals: [{ check: "scope_bound_exactly", scenarios: 12 }],
          verdict: "discriminates",
        }),
        [diagnosis({ repairSuspected: true, reading: "likely-spec-defect" })],
      ),
    ).toBe("off-target");
  });

  it("validates the access-token transfer declaration without treating it as proven evidence", () => {
    const registry = loadRegistry(ROOT);
    const funnel = loadAdaptiveFunnel(ROOT, registry);
    const transfer = funnel.transfers.find((item) => item.id === "access-token-to-wallet-spending-limit");

    expect(transfer).toBeDefined();
    expect(() => parseTransferTest(transfer, "transfer")).not.toThrow();
    expect(transfer?.sourceId).toBe(FAMILY_ID);
    expect(transfer?.buildMode).toBe("probe-first");
    expect(transfer?.status).toBe("ready");
    expect(transfer?.requiredEvidenceBeforeDeclaringTransfer.join(" ")).toMatch(/Do not claim transfer/);
  });

  it("matrix-ready requires smoke, on-target diagnosis, current hash, local evidence and transfer", () => {
    const missingTransfer = evaluatePromotionSmokeGate({
      familyId: FAMILY_ID,
      localEvidencePass: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      verifierMutantBaselinePass: true,
      countedSmokeTrials: 1,
      countedFailures: 1,
      countedSolves: 0,
      providerRefusals: 0,
      infraFailures: 0,
      transferDeclared: false,
      diagnosisStatus: "on-target",
    });
    const ready = evaluatePromotionSmokeGate({
      familyId: FAMILY_ID,
      localEvidencePass: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      verifierMutantBaselinePass: true,
      countedSmokeTrials: 1,
      countedFailures: 1,
      countedSolves: 0,
      providerRefusals: 0,
      infraFailures: 0,
      transferDeclared: true,
      diagnosisStatus: "on-target",
    });

    expect(missingTransfer.fullMatrixReady).toBe(false);
    expect(missingTransfer.blockers).toContain("transfer test is not declared");
    expect(ready.fullMatrixReady).toBe(true);
    expect(ready.state).toBe("matrix-ready");
  });

  it("promotion report is deterministic and keeps the full matrix blocked before smoke evidence", () => {
    const registry = loadRegistry(ROOT);
    const funnel = loadAdaptiveFunnel(ROOT, registry);
    const workbench = loadDiscoveryWorkbench(ROOT, registry, funnel);
    const definitions = loadProbeDefinitions(ROOT, registry, workbench);
    const summary = loadProbeRunSummary(ROOT, registry, workbench);
    const promotions = loadPromotions(ROOT, registry, workbench);
    const records = promotedFamilyRecords(promotions, definitions, summary, workbench);
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
    const gates = new Map([[FAMILY_ID, gate]]);
    const first = renderPromotionReport(records, summary, [], gates);
    const second = renderPromotionReport(records, summary, [], gates);

    expect(first).toBe(second);
    expect(first).toContain("pipeline state | `smoke-planned`");
    expect(first).toContain("Exact smoke command");
  });
});

// The verifier's `scope_bound_exactly` check used to read decision strings only. A subject that made
// every correct decision and then issued `admin:invoice` on `invoice-*` for `ops-bot` scored 0
// failures out of 384 — a 0% detection rate on the exact mechanism the family exists to measure.
// `grant-widener` is that subject, kept as a mutant so the hole cannot reopen unnoticed.
describe("access-token issued-grant binding", () => {
  it("catches a subject whose decisions are all correct and whose grant is maximally widened", () => {
    const scenarios = generateScenarios(selectMeasuredSet(enumerateSpace()));
    const grantable = scenarios.filter((scenario) => scenario.expected.allowed);

    // One sweep per subject, with the duplicate-grant ledger reset between them, exactly as the
    // runner does it. Grading the same scenario twice without a reset makes the second attempt look
    // like a replay and manufactures failures that say nothing about the grant payload.
    resetCompletionRecords();
    const widened = scenarios.map((scenario) => ({
      scenario,
      checks: runCell(scenario, grantWidener).failures.map((failure) => failure.check),
    }));
    const caught = widened.filter((cell) => cell.checks.includes("scope_bound_exactly"));
    const otherChecks = new Set(
      widened.flatMap((cell) => cell.checks.filter((check) => check !== "scope_bound_exactly")),
    );

    // It is caught in every scenario where it actually issues a grant, and nowhere else: its
    // decisions really are correct, so no other check has anything to say about it.
    expect(grantable.length).toBe(16);
    expect(caught.length).toBe(grantable.length);
    expect([...otherChecks]).toEqual([]);

    // And the same check leaves the reference alone, which is what stops it being a check that
    // simply fires on every issued grant.
    resetCompletionRecords();
    for (const scenario of grantable) {
      expect(runCell(scenario, reference).failures).toEqual([]);
    }
  });
});
