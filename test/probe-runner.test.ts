import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type DiscoveryCandidate,
  type DiscoveryCandidateEvidence,
  parseDiscoveryCandidate,
  summarizeDiscoveryWorkbench,
} from "../src/foundry/discovery-workbench.js";
import {
  loadDiscoveryWorkbench,
  loadProbeDefinitions,
  loadProbeRunSummary,
  loadRegistry,
} from "../src/foundry/load.js";
import {
  type ProbeDefinition,
  assertProbeDefinitionValid,
  probeEvidenceForDiscovery,
  probeToTaskShapeDraft,
  runMechanismProbes,
  runProbe,
} from "../src/foundry/probe-runner.js";
import { SchemaError } from "../src/foundry/schema.js";
import { renderMechanismProbeReport } from "../src/reports/probe-runner-report.js";

const ROOT = new URL("..", import.meta.url).pathname;
const candidatePool = (): unknown[] =>
  JSON.parse(readFileSync(`${ROOT}data/candidate-pool.json`, "utf8")) as unknown[];

const loaded = () => {
  const registry = loadRegistry(ROOT);
  const workbench = loadDiscoveryWorkbench(ROOT, registry);
  const definitions = loadProbeDefinitions(ROOT, registry, workbench);
  const summary = loadProbeRunSummary(ROOT, registry, workbench);
  return { registry, workbench, definitions, summary };
};

const firstDefinition = (): ProbeDefinition => loaded().definitions[0] as ProbeDefinition;
const PROVIDER_FAILOVER_PROBE_ID = "provider-failover-router-alias-drift-probe";

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

describe("Mechanism Probe Runner v1", () => {
  it("accepts the valid executable probe bank", () => {
    const { definitions, summary } = loaded();

    // Floor lowered from 8 to 5 when eleven probes nothing referenced were deleted. It is still a
    // floor on bank size, not an equality, and every surviving probe is one a checked-in artifact
    // depends on: three carry promotions/lineages, one is the scaffold smoke in verify-reports, and
    // one supplies the probe evidence in the deployment-alias evolution-options report.
    expect(definitions.length).toBeGreaterThanOrEqual(5);
    expect(summary.probes).toHaveLength(definitions.length);
    expect(summary.totalScenarios).toBeGreaterThanOrEqual(24);
    expect(summary.totalBadSubjectsCaught).toBe(summary.totalBadSubjects);
  });

  it("rejects a probe with no authoritative truth source", () => {
    expectSchemaCode(
      () =>
        assertProbeDefinitionValid({
          ...firstDefinition(),
          authoritativeTruthSource: { ...firstDefinition().authoritativeTruthSource, name: "" },
        }),
      "PROBE_NO_TRUTH_SOURCE",
    );
  });

  it("rejects a probe with no hidden behavior sketch", () => {
    expectSchemaCode(
      () => assertProbeDefinitionValid({ ...firstDefinition(), hiddenBehaviorSketch: "" }),
      "PROBE_NO_HIDDEN_BEHAVIOR",
    );
  });

  it("rejects a probe with no bad subject", () => {
    expectSchemaCode(
      () =>
        assertProbeDefinitionValid({
          ...firstDefinition(),
          subjects: firstDefinition().subjects.filter((subject) => subject.kind === "reference"),
        }),
      "PROBE_NO_BAD_SUBJECT",
    );
  });

  it("rejects a probe with no scenarios", () => {
    expectSchemaCode(
      () => assertProbeDefinitionValid({ ...firstDefinition(), scenarios: [] }),
      "PROBE_NO_SCENARIOS",
    );
  });

  it("rejects a probe with no promotion criteria", () => {
    expectSchemaCode(
      () => assertProbeDefinitionValid({ ...firstDefinition(), promotionCriteria: [] }),
      "PROBE_NO_PROMOTION_CRITERIA",
    );
  });

  it("reference-like behavior passes every executable probe", () => {
    const { summary } = loaded();

    expect(summary.probes.every((probe) => probe.referencePassed)).toBe(true);
    expect(
      summary.probes.every((probe) =>
        probe.subjectResults
          .filter((subject) => subject.kind === "reference")
          .every((subject) => subject.failedChecks.length === 0),
      ),
    ).toBe(true);
  });

  it("known-bad probe subjects fail their intended checks", () => {
    const { summary } = loaded();

    expect(
      summary.probes.every((probe) =>
        probe.subjectResults
          .filter((subject) => subject.kind !== "reference")
          .every((subject) => subject.caughtByIntendedChecks),
      ),
    ).toBe(true);
  });

  it("runs the provider-failover router alias probe with deterministic scenario coverage", () => {
    const { definitions, summary } = loaded();
    const definition = definitions.find((item) => item.id === PROVIDER_FAILOVER_PROBE_ID);
    const result = summary.probes.find((item) => item.probeId === PROVIDER_FAILOVER_PROBE_ID);

    expect(definition).toBeDefined();
    expect(result).toBeDefined();
    expect(definition?.scenarios.map((scenario) => scenario.id)).toEqual([
      "failover-provider-b-clean-continue",
      "late-receipt-provider-b-rollback",
      "ledger-disagreement-quarantine",
      "valid-failback-after-b-regression",
      "invalid-failback-cache-stale",
      "mixed-provider-eval-attribution",
      "router-receipt-absent-quarantine",
      "rollback-provider-route-not-alias",
    ]);
    expect(result?.verdict).toBe("promote_to_task_shape");
    expect(result?.referencePassed).toBe(true);
    expect(result?.badSubjectsCaught).toBe(result?.badSubjectsTotal);
    expect(result?.distinctFailedChecks).toEqual(
      expect.arrayContaining([
        "current_route_reconciled",
        "router_receipt_respected",
        "provider_model_attributed",
        "ledger_disagreement_preserved",
        "rollback_target_correct",
        "failback_target_correct",
        "continue_when_clean",
        "audit_matches_router_sources",
        "liveness",
      ]),
    );
  });

  it("catches provider-failover bad subjects by their intended named checks", () => {
    const { summary } = loaded();
    const result = summary.probes.find((item) => item.probeId === PROVIDER_FAILOVER_PROBE_ID);
    if (result === undefined) throw new Error("expected provider-failover probe result");
    const bySubject = new Map(result.subjectResults.map((subject) => [subject.subjectId, subject]));

    expect(bySubject.get("cached-router-truster")?.failedChecks).toEqual(
      expect.arrayContaining(["current_route_reconciled", "no_stale_router_assumption"]),
    );
    expect(bySubject.get("receipt-blind-rollbacker")?.failedChecks).toEqual(
      expect.arrayContaining(["router_receipt_respected", "rollback_target_correct"]),
    );
    expect(bySubject.get("always-failback")?.failedChecks).toEqual(
      expect.arrayContaining(["failback_target_correct", "continue_when_clean"]),
    );
    expect(bySubject.get("never-failback")?.failedChecks).toEqual(
      expect.arrayContaining(["failback_target_correct", "liveness"]),
    );
    expect(bySubject.get("audit-router-liar")?.failedChecks).toEqual(
      expect.arrayContaining(["audit_matches_router_sources", "provider_model_attributed"]),
    );
    expect(bySubject.get("always-quarantine")?.failedChecks).toEqual(
      expect.arrayContaining(["continue_when_clean", "liveness"]),
    );
  });

  it("rejects a failed reference-like probe subject", () => {
    const definition = firstDefinition();
    expectSchemaCode(
      () =>
        runProbe({
          ...definition,
          subjects: definition.subjects.map((subject) =>
            subject.kind === "reference" ? { ...subject, strategy: "status-only" as const } : subject,
          ),
        }),
      "PROBE_REFERENCE_FAILS",
    );
  });

  it("rejects a known-bad subject that escapes intended checks", () => {
    const definition = firstDefinition();
    expectSchemaCode(
      () =>
        runProbe({
          ...definition,
          subjects: definition.subjects.map((subject) =>
            subject.kind === "known-bad"
              ? { ...subject, intendedChecks: ["missing-intended-check"] }
              : subject,
          ),
        }),
      "PROBE_BAD_SUBJECT_NOT_CAUGHT",
    );
  });

  it("does not promote a probe that catches everything through one narrow check", () => {
    const definition = firstDefinition();
    expectSchemaCode(
      () =>
        runProbe({
          ...definition,
          scenarios: [definition.scenarios[0] as NonNullable<(typeof definition.scenarios)[number]>],
          subjects: [
            definition.subjects[0] as NonNullable<(typeof definition.subjects)[number]>,
            {
              id: "duplicate-only",
              kind: "known-bad",
              strategy: "duplicate-executor",
              label: "duplicates the one allowed effect",
              intendedChecks: ["no_duplicate_effect"],
            },
          ],
          preferredVerdict: "promote_to_task_shape",
        }),
      "PROBE_UNINTENDED_FAILURE",
    );
  });

  it("lets executable probe evidence dominate raw score in the discovery queue", () => {
    const base = parseDiscoveryCandidate({ ...(candidatePool()[0] as Record<string, unknown>) }, "candidate");
    const highScoreOnly: DiscoveryCandidate = { ...base, id: "high-score-only", expectedAxisPotential: 5 };
    const lowerWithProbe: DiscoveryCandidate = {
      ...base,
      id: "lower-with-probe",
      expectedAxisPotential: 2,
      expectedBuildHours: 18,
    };
    const evidence: readonly DiscoveryCandidateEvidence[] = [
      {
        candidateId: "lower-with-probe",
        status: "task-shape-ready",
        sourceId: "lower-with-probe-probe",
        verdict: "promote_to_task_shape",
        rankBoost: 3,
        reason: "cheap probe caught known-bad subjects",
      },
    ];

    const summary = summarizeDiscoveryWorkbench({ candidates: [highScoreOnly, lowerWithProbe] }, evidence);

    expect(summary.topBuildOrProbeCandidates[0]?.candidateId).toBe("lower-with-probe");
  });

  it("generates a task-shape scaffold from a promoted probe", () => {
    const { workbench, definitions, summary } = loaded();
    const probe = definitions.find((definition) => definition.id === "payment-unknown-capture-receipt-probe");
    const candidate = workbench.candidates.find((item) => item.id === "payment-unknown-capture-receipt");
    const result = summary.probes.find((item) => item.probeId === "payment-unknown-capture-receipt-probe");

    expect(probe).toBeDefined();
    expect(candidate).toBeDefined();
    expect(result?.verdict).toBe("promote_to_task_shape");
    const draft = probeToTaskShapeDraft(probe as ProbeDefinition, candidate as DiscoveryCandidate, result);
    expect(draft.sourceCandidateId).toBe("payment-unknown-capture-receipt");
    expect(draft.visibleRulesDraft.length).toBeGreaterThan(0);
    expect(draft.knobs.length).toBeGreaterThanOrEqual(2);
    expect(draft.expectedMutants.length).toBeGreaterThan(0);
    expect(draft.transferLinks.length).toBeGreaterThan(0);
  });

  it("generates a task-shape scaffold from the provider-failover probe", () => {
    const { workbench, definitions, summary } = loaded();
    const probe = definitions.find((definition) => definition.id === PROVIDER_FAILOVER_PROBE_ID);
    const candidate = workbench.candidates.find((item) => item.id === "provider-failover-router-alias-drift");
    const result = summary.probes.find((item) => item.probeId === PROVIDER_FAILOVER_PROBE_ID);

    expect(probe).toBeDefined();
    expect(candidate).toBeDefined();
    expect(result?.verdict).toBe("promote_to_task_shape");
    const draft = probeToTaskShapeDraft(probe as ProbeDefinition, candidate as DiscoveryCandidate, result);
    expect(draft.familyId).toBe("provider-failover-router-alias-drift");
    expect(draft.hiddenRegionDraft).toContain("router receipts");
    expect(draft.knobs.map((knob) => knob.name)).toEqual(
      expect.arrayContaining(["actionRequired", "routerReceiptDelay", "ledgerDisagreement"]),
    );
    expect(draft.adversarialAuditNotes.join("\n")).toContain("router receipts");
  });

  it("renders the mechanism probe report deterministically", () => {
    const { definitions, workbench, summary } = loaded();
    const first = renderMechanismProbeReport(summary, definitions, workbench.candidates);
    const second = renderMechanismProbeReport(summary, definitions, workbench.candidates);

    expect(first).toBe(second);
    expect(first).toContain("Mechanism Probe Runner v1");
    expect(first).toContain("Probe evidence is not a challenge package");
  });
});

describe("Probe evidence for the discovery queue", () => {
  it("exports probe evidence for discovery queue integration", () => {
    const { summary } = loaded();
    const evidence = probeEvidenceForDiscovery(summary);

    expect(evidence.length).toBe(summary.probes.length);
    expect(evidence.some((item) => item.status === "task-shape-ready")).toBe(true);
    expect(evidence.every((item) => item.reason.length > 0)).toBe(true);
  });
});
