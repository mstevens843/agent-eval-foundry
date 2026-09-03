import type { HardnessOperatorLedger } from "../foundry/hardness-ledger.js";
import type { MaterialDelta, TaskShape } from "../foundry/schema.js";

export interface DescendantFoundationFacts {
  readonly challengeHash: string;
  readonly challengeFiles: number;
  readonly declaredSpace: number;
  readonly selectedScenarios: number;
  readonly activatedScenarios: number;
  readonly referenceFailures: number;
  readonly narrowMutantFailures: number;
  readonly narrowMutantLocalGreen: number;
  readonly nonActivationControls: number;
  readonly nonActivationMutantFailures: number;
  readonly mutantsCaught: number;
  readonly mutantsTotal: number;
  readonly rigUsable: boolean;
  readonly malformedInputRefused: boolean;
  readonly packageGatePassed: boolean;
}

export function renderHardnessOperatorLedger(ledger: HardnessOperatorLedger): string {
  const lines = [
    "# Measured hardness-operator ledger",
    "",
    `Extracted ${ledger.extractedOn}. Scope: ${ledger.scope}.`,
    "",
    "An operator is not called hardening merely because reward-0 outcomes increased. Validity",
    "controls repair what reward means; difficulty operators change the reasoning burden; scenario",
    "selection operators change how reliably an existing mechanism activates.",
    "",
    "| operator | class | status | solve-rate evidence | capability attribution | confidence |",
    "|---|---|---:|---|---|---:|",
    ...ledger.operators.map(
      (row) =>
        `| \`${row.id}\` | ${row.category} | ${row.measurementStatus} | ${
          row.solveRateEffect.countable
            ? `${row.solveRateEffect.before} -> ${row.solveRateEffect.after}`
            : "not countable"
        } | ${row.capabilityAttribution} | ${row.confidence} |`,
    ),
    "",
  ];
  for (const row of ledger.operators) {
    lines.push(
      `## ${row.name}`,
      "",
      `- **Changed:** ${row.changed}`,
      `- **Stayed fixed:** ${row.stayedFixed}`,
      `- **Before:** ${row.beforeEvidence}`,
      `- **After:** ${row.afterEvidence}`,
      `- **Fairness:** ${row.fairnessOutcome}`,
      `- **Verifier integrity:** ${row.verifierIntegrityEffect}`,
      `- **Solve-rate interpretation:** ${row.solveRateEffect.note}`,
      `- **Provenance:** ${row.provenance.map((source) => `\`${source}\``).join("; ")}`,
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}

export function renderDaoDescendantFoundation(facts: DescendantFoundationFacts): string {
  return `${[
    "# DAO recompute descendant: packaged calibration task",
    "",
    "This report is generated from the runnable family, package checker and B6-gated sweep. Phase 9",
    "is provenance for the recipe; the numbers below are recomputed from this package.",
    "",
    "| property | measured value |",
    "|---|---:|",
    `| challenge files | ${facts.challengeFiles} |`,
    `| challenge hash | \`${facts.challengeHash}\` |`,
    `| declared scenario space | ${facts.declaredSpace} |`,
    `| selected scenarios | ${facts.selectedScenarios} |`,
    `| activated target stratum | ${facts.activatedScenarios} |`,
    `| non-activation controls | ${facts.nonActivationControls} |`,
    `| reference failures | ${facts.referenceFailures} |`,
    `| narrow recompute failures in target stratum | ${facts.narrowMutantFailures}/${facts.activatedScenarios} |`,
    `| narrow mutant locally green in target stratum | ${facts.narrowMutantLocalGreen}/${facts.activatedScenarios} |`,
    `| narrow mutant failures in non-activation controls | ${facts.nonActivationMutantFailures}/${facts.nonActivationControls} |`,
    `| intended mutants caught | ${facts.mutantsCaught}/${facts.mutantsTotal} |`,
    `| B6 controls usable | ${facts.rigUsable ? "yes" : "no"} |`,
    `| malformed input refused | ${facts.malformedInputRefused ? "yes" : "no"} |`,
    `| challenge leak/manifest gate | ${facts.packageGatePassed ? "pass" : "fail"} |`,
    "",
    "## Isolation claim",
    "",
    "The package contains no ACKED or REVOKED state. The narrow mutant differs from the reference",
    "only by recovering the committed idempotency key versus deriving it from the current lease",
    "epoch. Its own tool confirmations remain green while the sealed per-action ledger diverges.",
    "",
    "## Evidence boundary",
    "",
    "This is deterministic local verifier and packaging evidence. It is not frontier-agent",
    "difficulty evidence, and the measured 0.18 build hours remain descendant-only.",
    "",
    "## Durable trial capture contract",
    "",
    "The descendant is registered in the family-aware trial router. Native runs use the shared",
    "orchestrator and `writeTrialDirectory`, preserving the content-hashed challenge, submission,",
    "full event trajectory, agent workspace files, verifier output, metadata, normalized result and",
    "countability decision. A summary row without that directory remains uncountable. No paid run or",
    "trial directory was created in this phase.",
  ].join("\n")}\n`;
}

export function renderVariantSchemaMigration(input: {
  readonly descendant: TaskShape;
  readonly exampleDeltas: readonly MaterialDelta[];
  readonly operators: readonly {
    readonly id: string;
    readonly evidenceStatus: "measured" | "estimated";
    readonly evidenceScope: string;
  }[];
}): string {
  const recipe = input.descendant.hardnessRecipe;
  const measuredOperators = input.operators.filter((operator) => operator.evidenceStatus === "measured");
  return `${[
    "# Variant schema migration: mechanism plus recipe",
    "",
    "A task variant is now identified by material differences across six independently reviewable",
    "surfaces. A mechanism change is sufficient but no longer required.",
    "",
    "| material delta | supported | descendant value |",
    "|---|---:|---|",
    `| mechanism set | yes | ${input.descendant.mechanisms.join(", ")} |`,
    `| operator bundle | yes | ${recipe?.operatorBundle.join(", ") ?? "legacy-unreconstructed"} |`,
    `| verifier profile | yes | ${recipe?.verifierProfile ?? "legacy-unreconstructed"} |`,
    `| specification profile | yes | ${recipe?.specificationProfile ?? "legacy-unreconstructed"} |`,
    `| starter profile | yes | ${recipe?.starterProfile ?? "legacy-unreconstructed"} |`,
    `| scenario-selection strategy | yes | ${recipe?.scenarioSelectionStrategy ?? "legacy-unreconstructed"} |`,
    "",
    "## Guard behavior",
    "",
    "`assertVariantNovel` recomputes material deltas from the parent and proposed profiles. Renames,",
    "stale delta declarations, and operational-only actions such as scheduling another trial are",
    "rejected. Existing shapes migrate as `hardnessRecipe: null`; that preserves uncertainty instead",
    "of inventing construction evidence. New variants carry estimated profiles until measurements",
    "cite evidence.",
    "",
    `Existing evolution operators: ${measuredOperators.length}/${input.operators.length} have measured precedent. The rest remain explicitly estimated.`,
    ...measuredOperators.map(
      (operator) => `- \`${operator.id}\`: measured scope - ${operator.evidenceScope}`,
    ),
    "",
    "Example generated deltas:",
    "",
    ...input.exampleDeltas.map(
      (delta) => `- \`${delta.kind}\`: \`${delta.before}\` -> \`${delta.after}\` (${delta.rationale})`,
    ),
  ].join("\n")}\n`;
}

export function renderPhase12FoundationSummary(input: {
  readonly ledger: HardnessOperatorLedger;
  readonly facts: DescendantFoundationFacts;
}): string {
  const counts = Object.fromEntries(
    ["validity-control", "difficulty", "scenario-selection"].map((category) => [
      category,
      input.ledger.operators.filter((row) => row.category === category).length,
    ]),
  );
  return `${[
    "# Phase 12 - Hardness-recipe foundation",
    "",
    "## Result",
    "",
    "The recompute descendant is now a built, routable, leak-checked calibration family. Family",
    "identity and construction recipe are separate schema dimensions, so a controlled verifier,",
    "specification, starter or selection change no longer has to pretend it introduced a mechanism.",
    "",
    `The ledger contains ${input.ledger.operators.length} operators: ${counts["validity-control"]} validity controls, ${counts["difficulty"]} difficulty operators, and ${counts["scenario-selection"]} scenario-selection operators.`,
    `The local target stratum catches the narrow recompute mutant ${input.facts.narrowMutantFailures}/${input.facts.activatedScenarios} while its own confirmations remain green ${input.facts.narrowMutantLocalGreen}/${input.facts.activatedScenarios}.`,
    "",
    "## Corrections preserved",
    "",
    "- The A2 sentence is recorded as an explicitness repair with a measured causal failure-cell effect, not as proof the control omitted all necessary information.",
    "- The first Phase 9 fatality rig is recorded as void; only the corrected `_tool` measurement is cited.",
    "- The 5/6 -> 6/6 change is a measured scenario-selection result, not a new family or mechanism.",
    "- `descendantBuildHours = 0.18` is descendant-only and is not substituted for `hoursPerFamily`.",
    "- No paid model trials were run in this phase.",
  ].join("\n")}\n`;
}
