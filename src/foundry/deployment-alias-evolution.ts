import type { ProviderDeltaDiagnosis, ProviderDeltaDiagnosisFinding } from "./provider-delta-diagnosis.js";

export const DEPLOYMENT_ALIAS_EVOLUTION_STARTS = ["mechanism_probe", "full_family_draft"] as const;
export type DeploymentAliasEvolutionStart = (typeof DEPLOYMENT_ALIAS_EVOLUTION_STARTS)[number];

export interface DeploymentAliasEvolutionProposal {
  readonly id: string;
  readonly parentFamilyId: "deployment-model-alias-rollout-drift";
  readonly operators: readonly string[];
  readonly whatStaysFixed: readonly string[];
  readonly whatChanges: readonly string[];
  readonly harderBecause: readonly string[];
  readonly expectedKnobs: readonly string[];
  readonly expectedMutants: readonly string[];
  readonly authoritativeTruthSource: string;
  readonly fairnessRisks: readonly string[];
  readonly verifierRisks: readonly string[];
  readonly adversarialRisks: readonly string[];
  readonly confirmSignal: string;
  readonly killSignal: string;
  readonly cheapestNextEvidence: string;
  readonly startAs: DeploymentAliasEvolutionStart;
  readonly selected: boolean;
}

export interface DeploymentAliasEvolutionPlan {
  readonly parentFamilyId: "deployment-model-alias-rollout-drift";
  readonly currentProviderDeltaRoute: ProviderDeltaDiagnosis["route"];
  readonly selectedProposalId: string | null;
  readonly findings: readonly ProviderDeltaDiagnosisFinding[];
  readonly proposals: readonly DeploymentAliasEvolutionProposal[];
  readonly reading: string;
}

export function deploymentAliasEvolutionProposals(): readonly DeploymentAliasEvolutionProposal[] {
  return [
    {
      id: "provider-failover-router-alias-drift-probe",
      parentFamilyId: "deployment-model-alias-rollout-drift",
      operators: ["add_provider_failover", "add_router_fallback_drift", "add_delayed_authoritative_receipts"],
      whatStaysFixed: [
        "alias name is not model identity",
        "current routing truth comes from an authoritative ledger",
        "eval results must be attributed to concrete served versions",
        "subject-owned model reports are claims, not truth",
      ],
      whatChanges: [
        "the alias can route to different providers during failover",
        "the model router and rollout ledger can briefly disagree",
        "receipts arrive after the subject has a tempting cached route",
        "rollback may need to target a provider route rather than only a model version",
      ],
      harderBecause: [
        "the truth boundary moves outside the local alias map",
        "the subject must reconcile router receipts with rollout/eval ledgers",
        "the valid action may be continue, quarantine, provider failback or rollback",
      ],
      expectedKnobs: [
        "failoverTiming",
        "routerReceiptDelay",
        "fallbackProvider",
        "ledgerDisagreement",
        "evalProviderMix",
        "rollbackTargetKind",
        "cachedRouteStaleness",
      ],
      expectedMutants: [
        "cached-router-truster",
        "provider-name-only-decider",
        "receipt-blind-rollbacker",
        "always-failback",
        "never-failback",
        "audit-router-liar",
      ],
      authoritativeTruthSource: "router receipt ledger plus rollout ledger plus concrete eval stream",
      fairnessRisks: [
        "public spec must define when router receipts outrank cached alias maps",
        "hidden cases may sample timing, but must not add secret precedence rules",
      ],
      verifierRisks: [
        "verifier must own router/effect ledgers and not trust subject summaries",
        "provider failback effects need idempotency checks",
      ],
      adversarialRisks: [
        "subject may forge router receipts",
        "subject may substitute provider labels without preserving concrete served versions",
      ],
      confirmSignal:
        "A one-agent smoke failure lands on router receipt reconciliation, provider failover attribution, or truthful route/eval audit checks.",
      killSignal:
        "A strong subject solves the probe cleanly by applying the current deployment-alias rules without new failure, or failures are off-target/spec ambiguity.",
      cheapestNextEvidence: "build an executable mechanism probe with 5-8 router/failover scenarios",
      startAs: "mechanism_probe",
      selected: true,
    },
    {
      id: "multi-region-alias-propagation-delay-probe",
      parentFamilyId: "deployment-model-alias-rollout-drift",
      operators: ["add_multi_region_state", "add_time_separation", "add_partial_observability"],
      whatStaysFixed: [
        "alias names remain labels, not concrete model identity",
        "rollback/continue decisions must use authoritative ledgers",
        "audit must preserve the facts observed at decision time",
      ],
      whatChanges: [
        "current alias mapping differs by region during propagation",
        "eval samples come from region-specific served versions",
        "a rollback in one region can be invalid in another",
      ],
      harderBecause: [
        "there is no single global current alias until propagation settles",
        "the subject must reconcile region, time and served-version evidence",
      ],
      expectedKnobs: [
        "region",
        "propagationLag",
        "regionalAliasState",
        "regionalEvalMix",
        "rollbackScope",
        "settleWindow",
      ],
      expectedMutants: [
        "global-alias-truster",
        "region-blind-rollbacker",
        "settle-window-skipper",
        "all-region-overblocker",
      ],
      authoritativeTruthSource: "per-region alias propagation ledger plus regional eval stream",
      fairnessRisks: [
        "region precedence and propagation windows must be public",
        "examples must show a valid regional continue case",
      ],
      verifierRisks: [
        "region-specific effects must not collapse into one global ledger",
        "settling windows must be deterministic",
      ],
      adversarialRisks: [
        "subject may claim all regions share one route",
        "subject may forge a global receipt from one region's ledger",
      ],
      confirmSignal:
        "Smoke failure concentrates on region/propagation knobs while reference and mutants remain cleanly separated.",
      killSignal: "Probe failures collapse to the same local alias comparison already solved by Claude.",
      cheapestNextEvidence: "run a mechanism probe before any full family build",
      startAs: "mechanism_probe",
      selected: false,
    },
    {
      id: "incident-audit-ledger-contradiction-probe",
      parentFamilyId: "deployment-model-alias-rollout-drift",
      operators: [
        "add_incident_ledger_contradiction",
        "add_audit_truth_requirement",
        "add_authoritative_reconciliation",
      ],
      whatStaysFixed: [
        "deployment action must follow authoritative rollout/eval evidence",
        "subject-written audit is not truth",
        "incorrect rollout continuation remains forbidden",
      ],
      whatChanges: [
        "incident ledger and deployment ledger can disagree temporarily",
        "the correct action may require preserving the contradiction instead of resolving it away",
        "audit truth becomes a first-class success condition",
      ],
      harderBecause: [
        "the subject must avoid flattening contradictory sources into a convenient status",
        "a pass requires transparent uncertainty, not just the final action",
      ],
      expectedKnobs: [
        "incidentLedgerDelay",
        "contradictionKind",
        "evidencePrecedence",
        "auditVisibility",
        "operatorOverride",
        "finalReceiptTiming",
      ],
      expectedMutants: [
        "status-only-decider",
        "incident-ledger-ignorer",
        "audit-rewriter",
        "operator-override-truster",
      ],
      authoritativeTruthSource: "deployment ledger plus incident ledger plus final effect receipt",
      fairnessRisks: [
        "the spec must publish source precedence and allowed uncertainty states",
        "hidden scenarios must sample contradictions without adding hidden rules",
      ],
      verifierRisks: [
        "audit-grading must distinguish truthful uncertainty from no-op refusal",
        "verifier must preserve source-specific facts",
      ],
      adversarialRisks: [
        "subject may rewrite the audit after final receipt",
        "subject may output only final status and hide the contradiction",
      ],
      confirmSignal: "Smoke failure lands on audit-source contradiction or status-only decision checks.",
      killSignal:
        "Probe solves reduce to already-solved deployment-alias logic with no added diagnosis value.",
      cheapestNextEvidence: "build a tiny contradiction probe with two source ledgers and one final receipt",
      startAs: "mechanism_probe",
      selected: false,
    },
    {
      id: "prompt-template-alias-drift-probe",
      parentFamilyId: "deployment-model-alias-rollout-drift",
      operators: ["add_prompt_template_alias", "add_baseline_alias_drift", "add_eval_source_dependency"],
      whatStaysFixed: [
        "alias labels are not concrete deployed artifacts",
        "eval attribution and baseline comparison must use authoritative artifact ids",
      ],
      whatChanges: [
        "the drifting artifact is a prompt template alias rather than a model version alias",
        "model version and prompt version jointly determine eval comparability",
        "baseline may be stale for one artifact while current for the other",
      ],
      harderBecause: [
        "a correct subject must avoid blaming model drift for prompt-template drift",
        "there are two interacting alias layers instead of one",
      ],
      expectedKnobs: [
        "promptAliasState",
        "modelAliasState",
        "baselineArtifactKind",
        "evalAttributionCompleteness",
        "templateRolloutPhase",
      ],
      expectedMutants: [
        "model-only-attributor",
        "prompt-alias-truster",
        "baseline-artifact-collapser",
        "template-audit-liar",
      ],
      authoritativeTruthSource: "prompt-template rollout ledger plus model rollout ledger plus eval stream",
      fairnessRisks: [
        "public rules must explain joint comparability of model and prompt artifacts",
        "examples should show model-current but prompt-stale cases",
      ],
      verifierRisks: [
        "expected decision must not depend on hidden product semantics",
        "artifact ids must be harness-owned",
      ],
      adversarialRisks: [
        "subject may relabel prompt ids to match the preferred baseline",
        "subject may omit one alias layer from audit",
      ],
      confirmSignal: "Probe catches subjects that attribute every regression to the model alias alone.",
      killSignal: "Probe behaves like wording-only variation of deployment-alias and adds no new axis.",
      cheapestNextEvidence: "paper screen plus mechanism probe; do not jump to full family",
      startAs: "mechanism_probe",
      selected: false,
    },
  ];
}

export function planDeploymentAliasEvolution(
  diagnosis: ProviderDeltaDiagnosis,
  proposals: readonly DeploymentAliasEvolutionProposal[] = deploymentAliasEvolutionProposals(),
): DeploymentAliasEvolutionPlan {
  const findings = validateDeploymentAliasEvolutionProposals(proposals);
  const selected = proposals.find((proposal) => proposal.selected) ?? null;
  return {
    parentFamilyId: "deployment-model-alias-rollout-drift",
    currentProviderDeltaRoute: diagnosis.route,
    selectedProposalId: diagnosis.route === "evolve_family" ? (selected?.id ?? null) : null,
    findings,
    proposals: [...proposals].sort(
      (a, b) => Number(b.selected) - Number(a.selected) || a.id.localeCompare(b.id),
    ),
    reading:
      diagnosis.route === "evolve_family"
        ? "Mixed provider smoke makes the current family a diagnosis/evolution candidate. Start with the selected probe; do not build a full descendant until the probe survives."
        : "No evolution is selected yet because the current provider-delta diagnosis does not route to family evolution.",
  };
}

export function validateDeploymentAliasEvolutionProposals(
  proposals: readonly DeploymentAliasEvolutionProposal[],
): readonly ProviderDeltaDiagnosisFinding[] {
  const findings: ProviderDeltaDiagnosisFinding[] = [];
  const requiredArrayFields = [
    "operators",
    "whatStaysFixed",
    "whatChanges",
    "harderBecause",
    "expectedKnobs",
    "expectedMutants",
    "fairnessRisks",
    "verifierRisks",
    "adversarialRisks",
  ] as const;
  for (const proposal of proposals) {
    for (const field of requiredArrayFields) {
      if (proposal[field].length === 0) {
        findings.push({
          code: "PROVIDER_DELTA_EVOLUTION_PROPOSAL_INCOMPLETE",
          severity: "blocker",
          detail: `${proposal.id} has empty ${field}`,
        });
      }
    }
    for (const field of [
      "authoritativeTruthSource",
      "confirmSignal",
      "killSignal",
      "cheapestNextEvidence",
    ] as const) {
      if (proposal[field].trim().length === 0) {
        findings.push({
          code: "PROVIDER_DELTA_EVOLUTION_PROPOSAL_INCOMPLETE",
          severity: "blocker",
          detail: `${proposal.id} has empty ${field}`,
        });
      }
    }
  }
  const selected = proposals.filter((proposal) => proposal.selected);
  if (selected.length !== 1) {
    findings.push({
      code: "PROVIDER_DELTA_EVOLUTION_PROPOSAL_INCOMPLETE",
      severity: "blocker",
      detail: `expected exactly one selected proposal, saw ${selected.length}`,
    });
  }
  return findings.sort((a, b) => a.detail.localeCompare(b.detail));
}
