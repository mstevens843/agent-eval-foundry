// A full report for a family that exists only as a shape.
//
// Generic over any `TaskShape`, because the alternative — a hand-written document per family — is
// exactly the drift this repository exists to prevent. The shape is the source of truth; this
// renders it, sizes its declared space, runs the ship gate over it, and states plainly which numbers
// are estimates.
//
// The `estimated` banner is not decoration. A shape can claim any axis count it likes, and a reader
// skimming a well-formatted document will absorb the number without noticing where it came from. So
// every estimated figure is labelled at the point of use, not in a footnote.

import type { Registry } from "../foundry/registry.js";
import type { TaskShape } from "../foundry/schema.js";
import { type FamilyEvidence, assessFamily } from "./ship-report.js";

const esc = (s: string): string => s.replace(/\|/g, "\\|");

/** Size of the space the knobs declare: the product of their value counts. */
export const declaredSpace = (shape: TaskShape): number =>
  shape.knobs.reduce((n, k) => n * Math.max(1, k.values.length), 1);

export function renderShapeReport(shape: TaskShape, registry: Registry, evidence?: FamilyEvidence): string {
  const a = assessFamily(shape, registry, evidence);
  const space = declaredSpace(shape);
  const measured = shape.dataQuality === "measured";
  const q = (n: number | null): string => (n === null ? "—" : measured ? `${n}` : `${n} _(estimated)_`);

  return [
    `# ${shape.name}`,
    "",
    `\`${shape.familyId}\` — ${shape.domain}`,
    "",
    measured
      ? "Every figure below is measured: produced by running the family, not by declaring it."
      : "**This family is a shape, not a build.** Nothing here has been executed. Every quantity is an" +
        " author's estimate and is labelled as one; the report exists so the estimate can be argued" +
        " with before any money is spent on it.",
    "",
    "## Verdict",
    "",
    "| | |",
    "|---|---|",
    `| ship gate | **${a.verdict}** |`,
    `| blocking failures | ${a.blockingFailures.map((f) => `\`${f}\``).join(", ") || "none"} |`,
    `| data quality | \`${shape.dataQuality}\` |`,
    `| status | \`${shape.status}\` |`,
    `| agent trials run | ${shape.agentTrialsRun ?? "none"} |`,
    "",
    "| gate | blocking | verdict | detail |",
    "|---|---|---|---|",
    ...a.results.map(
      (r) => `| \`${r.gate.id}\` | ${r.gate.blocking ? "yes" : "no"} | ${r.verdict} | ${esc(r.detail)} |`,
    ),
    "",
    "## Mechanisms",
    "",
    "| mechanism | what it is | mutants in the bank |",
    "|---|---|---|",
    ...shape.mechanisms.map((id) => {
      const m = registry.mechanisms.find((x) => x.id === id);
      const mutants = registry.mutants.filter((x) => x.mechanisms.includes(id)).map((x) => `\`${x.id}\``);
      return `| \`${id}\` | ${esc(m?.summary ?? "**not in the registry**")} | ${mutants.join(", ") || "none"} |`;
    }),
    "",
    "## The declared space",
    "",
    `${shape.knobs.length} knobs, ${space} points. The hidden suite samples this space more densely than`,
    "the visible examples and adds no rule — that is the fairness contract, and it is what makes a",
    "hidden set legitimate rather than a trap.",
    "",
    "| knob | type | values | what it controls |",
    "|---|---|---|---|",
    ...shape.knobs.map(
      (k) =>
        `| \`${k.name}\` | ${k.type} | ${k.values.map((v) => `\`${String(v)}\``).join(", ")} | ${esc(k.purpose)} |`,
    ),
    "",
    `**Hidden graded region.** ${esc(shape.hiddenGradedRegion)}`,
    "",
    "## Visible rules",
    "",
    "These are published to the subject in full. A family whose difficulty comes from withholding the",
    "rules is measuring guessing.",
    "",
    ...shape.visibleRules.map((r, i) => `${i + 1}. ${r}`),
    "",
    "## Reference contract",
    "",
    "What a correct implementation must do. The reference exists to prove the family is solvable at",
    "all; a family whose reference does not pass is measuring its own bugs.",
    "",
    ...shape.referenceContract.map((r) => `- ${r}`),
    "",
    "## Authoritative sources",
    "",
    "What settles each question, and why the subject cannot forge it. This is the trust boundary: a",
    "grader that asks the subject what happened is not a grader.",
    "",
    ...shape.authoritativeSources.flatMap((s) => [
      `### ${s.name}`,
      "",
      `**Settles:** ${s.whatItSettles}`,
      "",
      `**Why the subject cannot forge it:** ${s.whyEngineCannotForge}`,
      "",
    ]),
    "## Expected mutants",
    "",
    "Each mutant is a wrong implementation written to fail one named check. If a mutant passes, the",
    "check is decorative and the suite has a hole where a measurement should be.",
    "",
    "| mutant | must fail | in the registry |",
    "|---|---|---|",
    ...shape.expectedMutants.map(
      (m) =>
        `| \`${m.mutantId}\` | \`${m.mustFailCheck}\` | ${registry.mutants.some((x) => x.id === m.mutantId) ? "yes" : "**no**"} |`,
    ),
    "",
    "## Expected failure modes",
    "",
    "How a real attempt is expected to go wrong. Written before any trial, so the trials can disagree.",
    "",
    ...shape.expectedFailureModes.map((m) => `- ${m}`),
    "",
    "## Fairness",
    "",
    ...shape.fairnessConstraints.map((c) => `- ${c}`),
    "",
    "## Cheat resistance",
    "",
    ...shape.cheatResistance.map((c) => `- ${c}`),
    "",
    "## Cost",
    "",
    "| | |",
    "|---|---:|",
    `| build hours | ${q(shape.estimatedBuildHours)} |`,
    `| frontier spend to measure | ${shape.estimatedFrontierUsd === null ? "—" : measured ? `$${shape.estimatedFrontierUsd}` : `$${shape.estimatedFrontierUsd} _(estimated)_`} |`,
    `| independent axes | ${q(shape.estimatedAxes)} |`,
    "",
    measured
      ? ""
      : [
          "## What would make these numbers real",
          "",
          "1. Build the reference and confirm it passes every scenario.",
          "2. Write the expected mutants and confirm each fails the check it was written to fail.",
          "3. Run counted agent trials under subprocess isolation or stronger.",
          "4. Compute the axis count from the resulting matrix rather than estimating it.",
          "",
          "Until step 4, the axis figure above is an author's guess and the ship gate refuses to ship on",
          "it. That refusal is the point: the estimate is allowed to exist, and it is not allowed to be",
          "mistaken for a measurement.",
        ].join("\n"),
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry` from the checked-in task shape. Deterministic — no timestamp.",
    "",
  ].join("\n");
}
