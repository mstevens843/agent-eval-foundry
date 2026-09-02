import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertVariantNovel } from "../src/foundry/evolve.js";
import {
  loadDiscoveryWorkbench,
  loadProbeDefinitions,
  loadProbeRunSummary,
  loadPromotions,
  loadRegistry,
} from "../src/foundry/load.js";
import { familyLoop } from "../src/foundry/loop.js";
import { runProbe } from "../src/foundry/probe-runner.js";
import { promotedFamilyRecords, promotionToFamilyScaffold } from "../src/foundry/promotion.js";
import { evaluatePromotionSmokeGate } from "../src/foundry/smoke-gates.js";
import {
  ACCESS_TOKEN_EVOLUTION_FAMILY,
  ACCESS_TOKEN_EVOLUTION_PROBE,
  renderAccessTokenEvolutionReport,
} from "../src/reports/access-token-evolution-report.js";
import { familyEvidenceFor } from "../src/reports/evidence.js";
import { readFamilyTrials } from "../src/trials/directory.js";
import { prepareChallenge } from "../src/trials/run.js";

const ROOT = new URL("..", import.meta.url).pathname;
const PARENT = "access-token-scope-expansion";
const SELECTED_VARIANT = "access-token-delegated-wallet-scope-reconciliation";

function loaded() {
  const registry = loadRegistry(ROOT);
  const workbench = loadDiscoveryWorkbench(ROOT, registry);
  const definitions = loadProbeDefinitions(ROOT, registry, workbench);
  const summary = loadProbeRunSummary(ROOT, registry, workbench);
  const promotions = loadPromotions(ROOT, registry, workbench);
  const records = promotedFamilyRecords(promotions, definitions, summary, workbench);
  return { registry, workbench, definitions, summary, promotions, records };
}

describe("Access-Token Evolution v1", () => {
  // This test used to assert the opposite: one counted trial, one clean pass, `already_solved`.
  // That reading came from a package whose visible starter was a complete passing solution and whose
  // `scope_bound_exactly` check never looked at the issued grant, so the pass measured transcription
  // and grant-blindness rather than the mechanism. Repairing both changed the challenge hash, which
  // supersedes that trial by design. What has to hold now is that the evidence went to zero and the
  // preserved trial directory is still on disk.
  it("supersedes the clean access-token smoke pass once the repaired package changes the hash", () => {
    const { registry } = loaded();
    const state = familyLoop(ROOT, PARENT, registry, (familyId) => familyEvidenceFor(ROOT, familyId));
    const bundle = familyEvidenceFor(ROOT, PARENT);
    const preserved = readFamilyTrials(join(ROOT, "trials"), PARENT).map((trial) => trial.runId);
    const gate = evaluatePromotionSmokeGate({
      familyId: PARENT,
      localEvidencePass: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      verifierMutantBaselinePass: true,
      countedSmokeTrials: bundle.evidence.countedAgentTrials,
      countedFailures: 0,
      countedSolves: bundle.evidence.agentTrialsPassed,
      providerRefusals: 0,
      infraFailures: 0,
      transferDeclared: true,
      diagnosisStatus: "none",
    });

    expect(preserved).toContain("access-token-2026-08-o1");
    expect(bundle.evidence.countedAgentTrials).toBe(0);
    expect(bundle.evidence.agentTrialsPassed).toBe(0);
    expect(state.analysis.primary?.reason).not.toBe("already_solved");
    expect(state.analysis.disposition).toBe("trial");
    expect(gate.state).toBe("smoke-planned");
    expect(gate.fullMatrixReady).toBe(false);
    expect(gate.blockers).toContain("no counted smoke trial");
  });

  // The descendant proposal is driven by a clean-pass reading, and the real evidence no longer
  // supplies one: the repair superseded the only counted trial. So the evidence is an explicit
  // fixture here — one counted, fully passing trial — and the test keeps measuring what it was
  // written to measure, which is the proposal machinery, not the trial ledger.
  it("proposes access-token-specific descendants that are novel versus the parent", () => {
    const { registry } = loaded();
    const state = familyLoop(ROOT, PARENT, registry, (familyId) => {
      const bundle = familyEvidenceFor(ROOT, familyId);
      return {
        ...bundle,
        evidence: { ...bundle.evidence, countedAgentTrials: 1, agentTrialsPassed: 1 },
      };
    });
    const selected = state.variants.find((variant) => variant.id === SELECTED_VARIANT);

    expect(state.variants.length).toBeGreaterThanOrEqual(3);
    expect(selected).toBeDefined();
    expect(selected?.operators).toEqual(
      expect.arrayContaining([
        "add_durable_state",
        "add_authoritative_reconciliation",
        "add_delegation_chain",
        "add_scope_downgrade_or_revocation",
        "add_audit_truth_requirement",
        "add_liveness_pressure",
      ]),
    );
    expect(() =>
      assertVariantNovel(selected as NonNullable<typeof selected>, state.shape, registry),
    ).not.toThrow();
  });

  it("runs the delegated-wallet descendant probe and catches every intended bad subject", () => {
    const { definitions } = loaded();
    const probe = definitions.find((definition) => definition.id === ACCESS_TOKEN_EVOLUTION_PROBE);
    expect(probe).toBeDefined();

    const result = runProbe(probe as NonNullable<typeof probe>);
    expect(result.verdict).toBe("evolve_existing");
    expect(result.referencePassed).toBe(true);
    expect(result.scenarioCount).toBeGreaterThanOrEqual(4);
    expect(result.badSubjectsCaught).toBe(result.badSubjectsTotal);
    expect(result.distinctFailedChecks).toEqual(
      expect.arrayContaining([
        "audit_matches_authority_source",
        "current_authority_reconciled",
        "liveness",
        "no_overgrant",
        "stale_scope_rejected",
        "valid_scope_executes",
      ]),
    );

    const cached = result.subjectResults.find((subject) => subject.subjectId === "cached-scope-truster");
    const auditLiar = result.subjectResults.find((subject) => subject.subjectId === "audit-liar");
    const overBlocker = result.subjectResults.find((subject) => subject.subjectId === "over-blocker");
    expect(cached?.failedChecks).toEqual(
      expect.arrayContaining(["current_authority_reconciled", "stale_scope_rejected"]),
    );
    expect(auditLiar?.failedChecks).toEqual(expect.arrayContaining(["audit_matches_authority_source"]));
    expect(overBlocker?.failedChecks).toEqual(expect.arrayContaining(["liveness", "valid_scope_executes"]));
  });

  it("keeps the built descendant as local evidence, not real-agent difficulty evidence", () => {
    const { records } = loaded();
    const record = records.find((item) => item.promotion.familyId === ACCESS_TOKEN_EVOLUTION_FAMILY);
    expect(record).toBeDefined();
    expect(record?.promotion.status).toBe("family-built");
    expect(record?.promotion.evidence.countedAgentTrials).toBe(0);
    expect(record?.promotion.evidence.claimedEvidenceLevel).toBe("local-evidence");

    const scaffold = promotionToFamilyScaffold(record as NonNullable<typeof record>);
    expect(scaffold.files.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        `${ACCESS_TOKEN_EVOLUTION_FAMILY}/types.ts`,
        `${ACCESS_TOKEN_EVOLUTION_FAMILY}/spec.ts`,
        `${ACCESS_TOKEN_EVOLUTION_FAMILY}/example-shape.json`,
        `docs/families/${ACCESS_TOKEN_EVOLUTION_FAMILY}.md`,
      ]),
    );
    expect(scaffold.files.find((file) => file.path.endsWith("example-shape.json"))?.content).toContain(
      `"sourceCandidateId": "${ACCESS_TOKEN_EVOLUTION_FAMILY}"`,
    );
  });

  it("renders the access-token evolution report deterministically", () => {
    const { registry, summary, records } = loaded();
    const state = familyLoop(ROOT, PARENT, registry, (familyId) => familyEvidenceFor(ROOT, familyId));
    const probe = summary.probes.find((item) => item.probeId === ACCESS_TOKEN_EVOLUTION_PROBE) ?? null;
    const promotion =
      records.find((item) => item.promotion.familyId === ACCESS_TOKEN_EVOLUTION_FAMILY) ?? null;
    const selected = state.variants.find((variant) => variant.id === SELECTED_VARIANT) ?? null;
    const gate = evaluatePromotionSmokeGate({
      familyId: PARENT,
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
    const challengeHash = prepareChallenge(ROOT, PARENT).hash;
    const first = renderAccessTokenEvolutionReport({
      parentState: state,
      smokeGate: gate,
      selectedVariant: selected,
      selectedProbeResult: probe,
      selectedPromotion: promotion,
      challengeHash,
    });
    const second = renderAccessTokenEvolutionReport({
      parentState: state,
      smokeGate: gate,
      selectedVariant: selected,
      selectedProbeResult: probe,
      selectedPromotion: promotion,
      challengeHash,
    });

    expect(first).toBe(second);
    expect(first).toContain("A clean smoke pass is useful evidence");
    expect(first).toContain("Full `/6` matrix spend remains blocked");
    expect(first).toContain(ACCESS_TOKEN_EVOLUTION_FAMILY);
  });
});
