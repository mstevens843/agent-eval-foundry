// Why more runs stopped being more evidence, and what would fix it.
//
// This report exists because of one measurement. The UI family has five counted trials across four
// subjects and two labs, failing 33, 46, 62, 62 and 90 of 324 scenarios — and every pair nests. Two
// of them, from different Anthropic models, failed the IDENTICAL 62.
//
// Five trials. Four subjects. Two labs. One axis.
//
// A pass-rate table cannot say that. It shows five different numbers and reads as breadth. The chain
// is only visible if someone compares the failure SETS, which is what the axis meter does to
// instances and what this does to subjects.

import type { ChainAnalysis, DiversityTarget, KnobRegion } from "./chain-analysis.js";

export interface DiversityReportInput {
  readonly chains: readonly ChainAnalysis[];
  readonly targets: ReadonlyMap<string, DiversityTarget>;
  /** Proposed scenario axes for families that are chains, with the trade-off each introduces. */
  readonly proposals: ReadonlyMap<string, readonly AxisProposal[]>;
}

export interface AxisProposal {
  readonly id: string;
  readonly mechanism: string;
  /** The disposition that wins the EXISTING scenarios. */
  readonly currentWinner: string;
  /** Why that same disposition LOSES here — the source of the anti-correlation. */
  readonly whyItLoses: string;
  readonly newKnob: string;
  readonly risk: string;
}

/** Marker for an optional line. Filtering on `""` would delete the blank lines markdown needs. */
const SKIP = "\u0000skip";

const rate = (n: number): string => `${Math.round(n * 100)}%`;

export function renderDiversityUpgrade(input: DiversityReportInput): string {
  const chains = input.chains.filter((c) => c.subjects.length > 0);

  return [
    "# Scenario diversity: when more runs stop being more evidence",
    "",
    "An axis count over instances asks whether the suite measures more than one thing. The same",
    "question applies to the trials themselves: if every subject's failure set nests inside the next,",
    "the family separates subjects perfectly and measures **one** thing at several sensitivities.",
    "",
    "That state is invisible in a pass-rate table — five runs, five different numbers, two labs, and it",
    "reads as breadth — and it has a hard operational consequence: **adding subjects cannot fix it.**",
    "A chain stays a chain however many implementations are laid along it.",
    "",
    "## Per family",
    "",
    "| family | failing subjects | pairs | incomparable | chain? | agent axes |",
    "|---|---:|---:|---:|---|---:|",
    ...chains.map(
      (c) =>
        `| \`${c.familyId}\` | ${c.subjects.length} | ${c.pairs.length} | ${c.incomparable.length} | ${c.isChain ? "**YES — one axis**" : "no"} | ${c.isChain ? "1" : `≥${c.agentAxes}`} |`,
    ),
    "",
    ...chains.flatMap((c) => [
      `### \`${c.familyId}\``,
      "",
      c.reading,
      "",
      "| subject A | subject B | \\|A\\| | \\|B\\| | shared | relation | cross-lab |",
      "|---|---|---:|---:|---:|---|---|",
      ...c.pairs.map(
        (p) =>
          `| \`${p.a}\` | \`${p.b}\` | ${p.sizeA} | ${p.sizeB} | ${p.shared} | **${p.relation}** | ${p.crossLab ? "yes" : "no"} |`,
      ),
      "",
      ...(c.isChain
        ? [
            "**What this rules out.** A fifth subject cannot raise the width. Neither can a sixth trial of",
            "an existing subject: repeated runs of one model are samples of the same subject and the bank",
            "takes their union. The only lever is scenarios.",
            "",
            "**Why it happened.** Every scenario in this family rewards the same disposition. When one",
            "strategy dominates another everywhere, the weaker strategy's failures are a superset of the",
            "stronger one's by construction, and the catch sets are forced into a total order. Nesting is",
            "not bad luck here — it is what a family with no trade-off in it must produce.",
            "",
          ]
        : [
            `**${c.incomparable.length} incomparable pair(s)**, so the family separates subjects in more than one`,
            "direction. That is what a family measuring several things looks like, and it is the state the",
            "chained families above need to reach.",
            "",
            ...c.incomparable.map(
              (p) =>
                `- \`${p.a}\` and \`${p.b}\` are **${p.relation}**: ${p.shared} shared out of ${p.sizeA} and ${p.sizeB}. Neither dominates the other, so neither can be explained as a more-sensitive version of the other.`,
            ),
            "",
          ]),
    ]),
    "## Where an independent axis could live",
    "",
    "A knob value that every failing subject fails, and one that none of them fails, are the same thing",
    "to the meter: neither separates anything. Both are listed, because a diversity upgrade needs a",
    "target rather than an intention.",
    "",
    ...[...input.targets.entries()].flatMap(([familyId, target]) => [
      `### \`${familyId}\``,
      "",
      "| knob | value | scenarios | per-subject failure rate | separating? |",
      "|---|---|---:|---|---|",
      ...target.regions
        .filter((r) => Object.values(r.perSubject).some((v) => v > 0) || r.scenarios > 0)
        .slice(0, 40)
        .map((r: KnobRegion) => {
          // Full subject ids. An earlier version took `id.split("-")[1]` for brevity and rendered
          // `gpt-5.6-sol` as `5.6`, which is not a model anyone can look up.
          const rates = Object.entries(r.perSubject)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([id, v]) => `\`${id}\` ${rate(v)}`)
            .join(", ");
          return `| \`${r.knob}\` | \`${r.value}\` | ${r.scenarios} | ${rates || "—"} | ${r.separating ? "**yes**" : "no"} |`;
        }),
      "",
      target.saturated.length === 0
        ? SKIP
        : `**Saturated** — every failing subject fails all of these, so they contribute nothing to the width: ${target.saturated
            .map((r) => `\`${r.knob}=${r.value}\``)
            .join(", ")}.`,
      target.untouched.length === 0
        ? SKIP
        : `**Untouched** — declared, measured, and no subject has ever failed here: ${target.untouched
            .map((r) => `\`${r.knob}=${r.value}\``)
            .join(", ")}. A region nothing fails is either genuinely easy or not being reached.`,
      "",
    ]),
    "## The fix, and why it has to be a trade-off",
    "",
    "Breaking a chain requires a scenario class where **the strategy that wins the existing scenarios",
    "loses**. Anything else adds another point on the same line.",
    "",
    "The proposals below each name that trade-off explicitly. A proposal that cannot say what the",
    "current winner gets wrong is not a new axis, it is a new sensitivity.",
    "",
    ...[...input.proposals.entries()].flatMap(([familyId, proposals]) => [
      `### \`${familyId}\``,
      "",
      ...proposals.flatMap((p) => [
        `**\`${p.id}\`** — ${p.mechanism}`,
        "",
        `- Wins today: ${p.currentWinner}`,
        `- Loses here: ${p.whyItLoses}`,
        `- New knob: \`${p.newKnob}\``,
        `- Kill risk: ${p.risk}`,
        "",
      ]),
    ]),
    "## Why this cannot be fixed inside the existing family",
    "",
    "Adding scenarios changes the measured set, which changes the challenge package, which changes its",
    "content hash — and every trial run against the old hash **stops counting automatically**. The five",
    "UI trials that produced this finding would be the first casualties of acting on it.",
    "",
    "So the upgrade is a DESCENDANT family, which is the same discipline the kill/evolve layer applies",
    "everywhere else: the parent keeps its evidence and its honest one-axis verdict, and the descendant",
    "carries the structural change with a pre-registered claim about what it should separate.",
    "",
    "## The guard this report installs",
    "",
    "A family whose counted subjects form a chain may not report its subject count as evidence of",
    "breadth. `analyseChain` computes it, and the ship gate and every report that quotes an agent axis",
    "count read the chain verdict rather than the trial count.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ]
    .filter((l) => l !== SKIP)
    .join("\n");
}
