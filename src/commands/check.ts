// check: extracted compatibility command services. Core APIs remain independent of dispatch.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { assertAdversarialAuditsValid } from "../adversarial-audit/records.js";
import { assertExternalIntakeResultsValid } from "../external-intake/report.js";
import { BUILT_FAMILY_IDS } from "../families/registry.js";
import { assertLedgerConsistency, assertPostmortemExists } from "../foundry/consistency.js";
import {
  loadAdaptiveFunnel,
  loadDiscoveryWorkbench,
  loadLineages,
  loadProbeRunSummary,
  loadPromotions,
  loadRegistry,
} from "../foundry/load.js";
import { loopAll } from "../foundry/loop.js";
import { assertPromotionsValid } from "../foundry/promotion.js";
import { assertCoverage } from "../foundry/registry.js";
import { assertHumanReviewsValid } from "../human-solvability/records.js";

export function checkCommand(root: string): string {
  const registry = loadRegistry(root);
  const cov = assertCoverage(registry);

  // The gate and the ledger must agree, and a killed family must have a postmortem. Both run inside
  // `check` so CI fails on a contradiction rather than a reader finding one.
  const states = loopAll(root, registry);
  assertLedgerConsistency({
    candidates: registry.candidates,
    shapes: registry.shapes,
    verdicts: Object.fromEntries(states.map((st) => [st.shape.familyId, st.assessment.verdict])),
    analyses: Object.fromEntries(states.map((st) => [st.shape.familyId, st.analysis])),
    builtFamilyIds: BUILT_FAMILY_IDS,
  });
  for (const st of states) {
    assertPostmortemExists(
      st.shape.familyId,
      st.assessment,
      existsSync(join(root, "reports", `${st.shape.familyId}-kill-analysis.md`)),
    );
  }
  assertHumanReviewsValid(root);
  assertAdversarialAuditsValid(root);
  assertExternalIntakeResultsValid(root);
  const adaptiveFunnel = loadAdaptiveFunnel(root, registry);
  const discoveryWorkbench = loadDiscoveryWorkbench(root, registry, adaptiveFunnel);
  const probeSummary = loadProbeRunSummary(root, registry, discoveryWorkbench);
  const promotions = loadPromotions(root, registry, discoveryWorkbench);
  assertPromotionsValid(promotions, probeSummary, discoveryWorkbench);
  const lineages = loadLineages(root, registry, discoveryWorkbench, promotions);

  return [
    "registry OK",
    `  mechanisms  ${registry.mechanisms.length} (${cov.measuredMechanisms} measured)`,
    `  mutants     ${registry.mutants.length}`,
    `  families    ${registry.shapes.length}`,
    `  candidates  ${registry.candidates.length}`,
    `  discovery   ${discoveryWorkbench.candidates.length} candidate-pool ideas validate`,
    `  built       ${BUILT_FAMILY_IDS.length} families execute`,
    "  coverage    every mechanism has a mutant; no mutant is orphaned",
    "  consistency ledger statuses agree with the ship gate; every kill has a postmortem",
    "  human       counted clean-room reviews validate against current package hashes",
    "  adversarial current audits validate; changed-package records retain historical scope without current support",
    "  external    returned third-party intake packets validate before countability",
    "  funnel      mechanism probes and transfer tests validate against the registry",
    "  workbench   discovery scoring inputs validate against mechanisms and transfers",
    `  probes     ${probeSummary.probes.length} executable mechanism probes run locally`,
    `  promotions ${promotions.length} probe-to-family promotion record(s) validate`,
    `  lineages   ${lineages.length} lineage learning record(s) validate`,
    "",
  ].join("\n");
}
