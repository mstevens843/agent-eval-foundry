// The loop, shown running.
//
// Every other report in this repository describes a state. This one describes a CYCLE, because the
// claim being made is not "these families are good" — several of them are not — but "a family that
// failed produced the next one, and the reason it failed is written down in a form the next one was
// built against".
//
// The honest shape of that claim, stated up front rather than buried: the loop has completed exactly
// one full turn. One family was measured, trialed, killed for a named reason, evolved into four
// proposals, and one proposal was built and measured. The built descendant has NOT been trialed, so
// the turn is not yet closed — and the report says so in the same table as the good news.

import type { VariantProposal } from "../foundry/evolve.js";
import { KILL_REASON_SPECS } from "../foundry/kill.js";
import type { FamilyLoopState } from "../foundry/loop.js";
import type { Registry } from "../foundry/registry.js";

const esc = (s: string): string => s.replace(/\|/g, "\\|");
const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

export interface EvolutionReportInput {
  readonly registry: Registry;
  readonly states: readonly FamilyLoopState[];
  /** Families that actually execute, as opposed to families that exist as a shape. */
  readonly builtFamilyIds: readonly string[];
  /** Variant ids that have been promoted to a built family. */
  readonly promoted: readonly string[];
  readonly sharedBankSubjects: number;
  readonly sharedBankThreshold: number;
}

const variantBlock = (v: VariantProposal, parentMechanisms: readonly string[]): readonly string[] => [
  `### \`${v.id}\``,
  "",
  `**${v.name}** — parent \`${v.parentId}\`, kill risk ${pct(v.killRisk)}, ${v.estimatedBuildHours}h, expected ${v.expectedAxisContribution} axes.`,
  "",
  `**Operators applied:** ${v.operators.map((o) => `\`${o}\``).join(", ")}`,
  "",
  `**Mechanism delta:** adds ${
    v.mechanisms
      .filter((m) => !parentMechanisms.includes(m))
      .map((m) => `\`${m}\``)
      .join(", ") || "nothing"
  }; drops ${
    parentMechanisms
      .filter((m) => !v.mechanisms.includes(m))
      .map((m) => `\`${m}\``)
      .join(", ") || "nothing"
  }.`,
  "",
  "| what changes | what stays fixed |",
  "|---|---|",
  ...v.whatChanges.map((c, i) => `| ${esc(c)} | ${esc(v.whatStaysFixed[i] ?? "—")} |`),
  "",
  "**Why it should be harder**",
  "",
  ...v.whyHarder.map((w) => `- ${w}`),
  "",
  v.fairnessRisks.length === 0 ? "" : "**Fairness risks introduced**\n",
  ...v.fairnessRisks.map((r) => `- ${r}`),
  "",
  v.cheatRisks.length === 0 ? "" : "**Cheat risks introduced**\n",
  ...v.cheatRisks.map((r) => `- ${r}`),
  "",
  "**Kill risk, pre-registered**",
  "",
  v.killRiskRationale,
  "",
  "**Measurement plan**",
  "",
  ...v.measurementPlan.map((p, i) => `${i + 1}. ${p}`),
  "",
  `**Required mutants:** ${v.requiredMutants.map((m) => `\`${m.mutantId}\` (must fail \`${m.mustFailCheck}\`)`).join(", ")}`,
  "",
];

export function renderEvolutionReport(input: EvolutionReportInput): string {
  const { states, builtFamilyIds, promoted } = input;
  const killed = states.filter((s) => s.analysis.primary !== null && s.analysis.disposition === "harden");
  const withVariants = states.filter((s) => s.variants.length > 0);
  const allVariants = states.flatMap((s) => s.variants);
  const built = states.filter((s) => builtFamilyIds.includes(s.shape.familyId));
  const trialed = states.filter((s) => (s.evidence?.countedAgentTrials ?? 0) > 0);

  return [
    "# The foundry loop",
    "",
    "A benchmark program is not a list of tasks; it is a process that produces tasks and discards most",
    "of them. This report is the process, running.",
    "",
    "## One full turn, and where it stopped",
    "",
    "| step | what happened | evidence |",
    "|---|---|---|",
    "| 1. build | `prompt-injection-containment` built end to end: 128 measured scenarios, 9 mutants, verifier | `reports/prompt-injection-containment-family-report.md` |",
    "| 2. measure | 4 measured axes against the mutant bank | `reports/prompt-injection-containment-axis-report.md` |",
    "| 3. trial | 3 counted Claude trials, subprocess isolation, artifacts preserved | `trials/prompt-injection-containment/` |",
    "| 4. **kill** | all 3 passed 128/128 → `already_solved`, disposition `harden` | `reports/prompt-injection-containment-kill-analysis.md` |",
    "| 5. evolve | 4 variants proposed from named operators | this report, below |",
    "| 6. promote | `prompt-injection-memory-poisoning` built end to end | `reports/prompt-injection-memory-poisoning-family-report.md` |",
    "| 7. measure | 3 measured axes; reference clean; every mutant caught | `reports/prompt-injection-memory-poisoning-axis-report.md` |",
    "| 8. **trial** | **not done** — no agent has attempted the descendant | — |",
    "",
    "**The turn is not closed.** Step 8 is the one that decides whether the evolution worked, and it",
    "has not been run. Until it is, the descendant carries exactly the caveat that killed its parent:",
    "a measured axis count against hand-written mutants is a statement about the verifier.",
    "",
    "## Where every family stands",
    "",
    "| family | verdict | primary kill reason | disposition | axes | trials | built |",
    "|---|---|---|---|---:|---:|---|",
    ...states.map((s) => {
      const counted = s.evidence?.countedAgentTrials ?? s.shape.agentTrialsRun ?? 0;
      return `| \`${s.shape.familyId}\` | ${s.assessment.verdict} | ${s.analysis.primary === null ? "—" : `\`${s.analysis.primary.reason}\``} | ${s.analysis.disposition === null ? "—" : `\`${s.analysis.disposition}\``} | ${s.shape.estimatedAxes ?? "—"}${s.shape.dataQuality === "measured" ? "" : " _(est.)_"} | ${counted} | ${builtFamilyIds.includes(s.shape.familyId) ? "yes" : "no"} |`;
    }),
    "",
    `${built.length} of ${states.length} families execute. ${trialed.length} has been attempted by a real agent.`,
    "",
    "## What the kill taxonomy has actually found",
    "",
    "Reasons with no families under them are as informative as the ones with families: a taxonomy where",
    "every category fires is usually a taxonomy that is not discriminating.",
    "",
    "| reason | kind | disposition | families |",
    "|---|---|---|---|",
    ...KILL_REASON_SPECS.map((spec) => {
      const hits = states.filter((s) => s.analysis.findings.some((f) => f.reason === spec.reason));
      return `| \`${spec.reason}\` | ${spec.kind} | \`${spec.disposition}\` | ${hits.map((h) => `\`${h.shape.familyId}\``).join(", ") || "—"} |`;
    }),
    "",
    "## The variants this produced",
    "",
    killed.length === 0
      ? "_No family currently has a `harden` disposition, so no structural variants are proposed._"
      : [
          `${allVariants.length} proposals from ${withVariants.length} parent(s). Each is a composition of named`,
          "operators rather than a fresh idea, which is what makes the reasoning auditable: every clause",
          "below traces to an operator in `src/foundry/evolve.ts`.",
          "",
          "| variant | operators | axes | kill risk | build h | status |",
          "|---|---|---:|---:|---:|---|",
          ...allVariants.map(
            (v) =>
              `| \`${v.id}\` | ${v.operators.length} | ${v.expectedAxisContribution} | ${pct(v.killRisk)} | ${v.estimatedBuildHours} | ${promoted.includes(v.id) ? "**promoted and built**" : "proposed"} |`,
          ),
        ].join("\n"),
    "",
    ...allVariants.flatMap((v) => {
      const parent = states.find((s) => s.shape.familyId === v.parentId);
      return variantBlock(v, parent?.shape.mechanisms ?? []);
    }),
    "## Why the promoted variant was the one",
    "",
    "`prompt-injection-memory-poisoning` carried the lowest pre-registered kill risk of the four, and",
    "the rationale is specific rather than a preference: the parent's three passing submissions all",
    "tracked provenance correctly *within a request*, where it costs nothing because the value never",
    "leaves memory. None of them was ever asked to write provenance down and read it back. The",
    "persistence boundary is the crutch they leaned on hardest, so removing it attacks the thing that",
    "was actually load-bearing.",
    "",
    "The other three each depend on a mechanism the parent's trials demonstrably handled — chained tool",
    "authority, approval confusion — so their kill risk is higher for a reason the evidence supports.",
    "",
    "## What the promotion cost, and what it bought",
    "",
    "| | |",
    "|---|---:|",
    "| parent family, build | ~70 h |",
    "| parent family, trials | 3 counted runs, ~17 minutes of model time |",
    "| the kill | one gate, zero additional spend |",
    "| descendant, build | ~75 h |",
    "| descendant, measured axes | 3 |",
    "| descendant, counted trials | **0** |",
    "",
    "The kill is the cheap part and the build is the expensive part, which is the entire argument for",
    "gating before building rather than after. What this cycle demonstrates is that the gate can fire",
    "on the author's own work; what it does not yet demonstrate is that the descendant is harder.",
    "",
    "## Shared bank",
    "",
    `${input.sharedBankSubjects} subject(s) have attempted more than one family, against a threshold of ${input.sharedBankThreshold}.`,
    "",
    "Cross-family axis counts are not available until that clears, and the two new families make it",
    "harder rather than easier: three built families and one trialed family is a wider bank to fill.",
    "The cheapest path remains running the existing challenge packages against models already in the",
    "outbox bank.",
    "",
    "## What would falsify the loop",
    "",
    "Stated in advance, because a process that cannot fail is a process that is not measuring anything:",
    "",
    "1. **The descendant is also already-solved.** Three counted trials passing 128/128 on",
    "   `prompt-injection-memory-poisoning` would mean the persistence hypothesis was wrong and the",
    "   operator that produced it does not produce difficulty.",
    "2. **The descendant is unfair rather than hard.** Trials that fail on `M4_UNPROVENANCED_RECALL`",
    "   scenarios only would suggest the store-type knob punishes rather than measures.",
    "3. **The variants are indistinguishable.** If two evolved families produce the same catch sets on a",
    "   shared bank, the operators are relabelling rather than diversifying.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
