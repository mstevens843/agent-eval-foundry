// The shared-bank completion report: what is missing, how much it costs, and who could run it.
//
// The predecessor report answered "refused, partial or measured" and stopped. That verdict is the
// least useful sentence available, because the reader's next question — what exactly would fix this
// — was left to prose that went stale the moment a trial landed. Everything here is computed.

import type { BankCompletion, BankHole, HoleReason } from "../trials/bank-completion.js";
import { HOLE_MEANING } from "../trials/bank-completion.js";

export interface CompletionReportInput {
  readonly completions: readonly BankCompletion[];
  /** Combined width, only ever present for a completion whose verdict is `measured`. */
  readonly combined: ReadonlyMap<string, CombinedResult>;
  /**
   * Every PAIR of difficulty families, judged separately.
   *
   * The verdict is not a property of the repository, it is a property of the family set being
   * combined, and reporting only the all-families verdict hides that. Three families where one has
   * a subject the others lack is PARTIAL as a group and can contain a MEASURED pair — and the pair
   * is a real, quotable cross-family number that the group verdict would have suppressed.
   */
  readonly pairs: readonly {
    readonly completion: BankCompletion;
    readonly combined: CombinedResult | null;
  }[];
}

export interface CombinedResult {
  readonly perFamilyAxes: Readonly<Record<string, number>>;
  readonly combinedAxes: number;
  readonly sumOfParts: number;
  readonly nullBaseline: number | null;
  /** The largest width this bank could report: one axis per discriminating instance. */
  readonly ceiling: number | null;
  readonly instances: number;
  readonly measuredCells: number;
}

/**
 * Is the combined width distinguishable from chance?
 *
 * The threshold on shared subjects decides whether the QUESTION is askable. This decides whether the
 * ANSWER carries signal, and it is a different test with a different failure mode.
 *
 * THE DIRECTION IS THE WHOLE POINT AND IT IS EASY TO GET BACKWARDS — this function did, on its first
 * version. The null model keeps every subject's failure COUNT and redraws WHICH instances it fails at
 * random. Destroying the structure and keeping the noise makes the width go UP: unrelated failure
 * sets rarely nest, so almost every instance ends up on its own axis. The null is therefore an UPPER
 * bound, and a real corpus scoring far BELOW it is the good case — it means instances genuinely fail
 * together, which is the structure an axis count exists to detect.
 *
 * So the uninformative case is `real >= null`: a corpus as fragmented as randomness has a width
 * explained by bank size and run noise rather than by anything about the families. That is what this
 * returns true for.
 *
 * Parameter-free on purpose: it compares against the null the repository already computes rather than
 * against a hand-chosen margin. A margin would be a knob, and a knob gets tuned until the answer
 * flatters.
 */
export function indistinguishableFromChance(c: CombinedResult): boolean {
  return c.nullBaseline !== null && c.combinedAxes >= c.nullBaseline;
}

/** How far below chance the corpus sits — the compression ratio the memo's SWE-bench run reports. */
export function compressionRatio(c: CombinedResult): number | null {
  if (c.nullBaseline === null || c.combinedAxes === 0) return null;
  return c.nullBaseline / c.combinedAxes;
}

const VERDICT_BADGE: Readonly<Record<string, string>> = {
  measured: "**MEASURED**",
  partial: "**PARTIAL**",
  refused: "**REFUSED**",
};

export function renderBankCompletion(input: CompletionReportInput): string {
  const agent = input.completions.find((c) => c.kind === "agent" || c.kind === "imported");
  const anyMeasured = input.completions.some((c) => c.verdict === "measured");

  return [
    "# Shared-bank completion",
    "",
    "What is missing before a cross-family axis count exists, how many trials that is, and which model",
    "would produce them. Every number here is computed from the trial directories; nothing is prose.",
    "",
    "## The verdict, per bank kind",
    "",
    "| kind | what an axis count over it means | families | shared subjects | labs | verdict | trials still needed |",
    "|---|---|---:|---:|---:|---|---:|",
    ...input.completions.map(
      (c) =>
        `| \`${c.kind}\` | ${c.axisKind} | ${c.families.length} | ${c.sharedSubjects.length} | ${c.sharedProviderFamilies.length} | ${VERDICT_BADGE[c.verdict] ?? c.verdict} | ${c.minimumAdditionalTrials} |`,
    ),
    "",
    "**Subjects and labs are different numbers and answer different questions.** Four models from one",
    "lab give a bank of four subjects — which is what an antichain width counts — and evidence about",
    "one lab, which is what a transfer claim counts. A report that quotes whichever is larger is not",
    "reporting, it is choosing. Both columns are above.",
    "",
    ...input.completions.flatMap((c) => perKindSection(c, input.combined.get(c.kind) ?? null)),
    ...pairwiseSection(input),
    "## The exact work remaining",
    "",
    agent === undefined
      ? "_No difficulty bank exists._"
      : agent.unlocks.length === 0
        ? "**None.** The difficulty bank is at or above threshold; widening it from here narrows the estimate rather than unlocking a claim."
        : [
            `${agent.minimumAdditionalTrials} counted trial(s), listed exactly. Each line is a trial that does not exist yet:`,
            "",
            "| subject | family | provider | runnable here | what it unlocks |",
            "|---|---|---|---|---|",
            ...agent.unlocks.map(
              (u) =>
                `| \`${u.subjectId}\` | \`${u.familyId}\` | \`${u.providerId}\` | ${u.runnableHere ? "**yes**" : `no — ${u.availability}`} | ${u.unlocks} |`,
            ),
            "",
            ...(agent.unlocks.some((u) => u.runnableHere && u.command !== null)
              ? [
                  "Runnable here, as written:",
                  "",
                  "```bash",
                  ...agent.unlocks
                    .filter((u) => u.runnableHere && u.command !== null)
                    .flatMap((u, i) => [
                      ...(i === 0 ? [] : [""]),
                      `foundry trials run --family ${u.familyId} --run-id ${u.familyId.split("-").pop()}-${u.providerId}-1 \\`,
                      `  --model ${u.providerFamily}/${u.subjectId} --provider shell --inherit-env \\`,
                      `  --command ${(u.command ?? []).map((a) => (a === "{instruction}" ? "'{instruction}'" : a)).join(" ")}`,
                    ]),
                  "```",
                  "",
                ]
              : []),
            ...(agent.unlocks.some((u) => !u.runnableHere)
              ? [
                  "For the subjects that cannot run here, prepare a bundle. The bundle pins the challenge",
                  "hash, so a result someone else produces either measures this exact task or is refused on",
                  "import:",
                  "",
                  "```bash",
                  ...[...new Set(agent.unlocks.filter((u) => !u.runnableHere).map((u) => u.familyId))].map(
                    (f) =>
                      `foundry trials campaign prepare --family ${f} --provider external --out bundles/${f}-external`,
                  ),
                  "```",
                  "",
                ]
              : []),
          ].join("\n"),
    "",
    "## Why a hole is a hole",
    "",
    "Four different things stop a subject counting, and only some of them are fillable by spending",
    "money. Collapsing them into 'missing' is how a work list becomes a wish.",
    "",
    "| reason | fillable by another trial? | meaning |",
    "|---|---|---|",
    ...(Object.keys(HOLE_MEANING) as HoleReason[]).map(
      (r) =>
        `| \`${r}\` | ${r === "refused" || r === "infrastructure" ? "**no**" : "yes"} | ${HOLE_MEANING[r]} |`,
    ),
    "",
    ...(() => {
      const holes = input.completions.flatMap((c) => c.holes);
      if (holes.length === 0)
        return ["_No holes: every subject has a counted trial in every family of its kind._", ""];
      return [
        "### Every hole on record",
        "",
        "| subject | family | reason | detail |",
        "|---|---|---|---|",
        ...holes
          .slice()
          .sort((a, b) => a.subjectId.localeCompare(b.subjectId) || a.familyId.localeCompare(b.familyId))
          .map((h: BankHole) => `| \`${h.subjectId}\` | \`${h.familyId}\` | \`${h.reason}\` | ${h.detail} |`),
        "",
      ];
    })(),
    "## Are the families even comparable?",
    "",
    ...input.completions.map(
      (c) => `- \`${c.kind}\`: **${c.comparability.verdict}**. ${c.comparability.detail}`,
    ),
    "",
    "A bank below threshold is a sample-size problem and is fixed by spending. A bank that is not",
    "comparable is a structural problem and no number of trials fixes it: cells graded against",
    "different scenario sets cannot sit in one matrix, because an instance absent from the smaller set",
    "reads as never-caught rather than never-run, and that is a pass the family never observed.",
    "",
    anyMeasured
      ? "## The combined width is available and computed above."
      : [
          "## The combined width, refused",
          "",
          "No combined axis count appears anywhere in this repository's reports, and the refusal is",
          "enforced in code rather than by convention: `assertCombinedWidthAllowed` throws for a bank",
          "below threshold and for one whose families are incomparable, and `combinedMatrixFor` throws",
          "for a bank with no overlap at all. The number is easy to compute and would be the most",
          "flattering figure available — a portfolio total — which is exactly why it is guarded.",
        ].join("\n"),
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}

function perKindSection(c: BankCompletion, combined: CombinedResult | null): readonly string[] {
  return [
    `## \`${c.kind}\` — ${c.axisKind}`,
    "",
    c.rationale,
    "",
    "| subject | lab | present in | missing from |",
    "|---|---|---|---|",
    ...c.presence.map(
      (p) =>
        `| \`${p.subjectId}\`${p.shared ? " **(shared)**" : ""} | ${p.providerFamily} | ${p.present.map((f) => `\`${f.split("-").pop()}\``).join(", ") || "—"} | ${p.absent.map((h) => `\`${h.familyId.split("-").pop()}\` (${h.reason})`).join(", ") || "—"} |`,
    ),
    "",
    ...(combined === null
      ? []
      : [
          "### Combined width, over the shared subjects only",
          "",
          "| | |",
          "|---|---:|",
          ...Object.entries(combined.perFamilyAxes)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([f, n]) => `| \`${f}\` alone | ${n} |`),
          `| sum of the parts | ${combined.sumOfParts} |`,
          `| **combined, measured** | **${combined.combinedAxes}** |`,
          `| null-model baseline | ${combined.nullBaseline ?? "—"} |`,
          `| instances | ${combined.instances} |`,
          `| measured cells | ${combined.measuredCells} |`,
          "",
          combined.combinedAxes < combined.sumOfParts
            ? [
                `**The combined width (${combined.combinedAxes}) is below the sum of the parts (${combined.sumOfParts}).** Some instance in one`,
                "family is failed by exactly the subjects that fail an instance in the other, so the two",
                "collapse into one axis under subset inclusion. That is the only kind of evidence that says",
                "two families overlap, and it is only available because the same subjects attempted both.",
              ].join("\n")
            : combined.combinedAxes === combined.sumOfParts
              ? [
                  `**The combined width equals the sum of the parts (${combined.sumOfParts}).** Over these subjects, no instance in`,
                  "one family is failed by the same set that fails an instance in the other: the families",
                  "separate different implementations, and the axes add. Two cautions before that is quoted as",
                  "independence — the bank is small, and additivity is also what a disjoint bank produces by",
                  "construction, which is why the shared-subject restriction above is load-bearing.",
                ].join("\n")
              : "",
          "",
          combined.nullBaseline === null
            ? ""
            : `The null model redraws which instances each subject fails at random, holding each subject's failure count fixed. It scores **${combined.nullBaseline}**; the real data scores **${combined.combinedAxes}**. ${combined.combinedAxes < combined.nullBaseline ? "The real corpus is meaningfully more compressible than chance." : "The real corpus is not distinguishable from chance at this bank size, which is a statement about the bank rather than about the families."}`,
          "",
        ]),
  ];
}

/**
 * Every pair of difficulty families, judged on its own.
 *
 * A group verdict is the minimum over its members, so one family with a missing subject makes the
 * whole group PARTIAL even when two of its members share three subjects and support a real combined
 * width. That number exists and is worth quoting; suppressing it because a third family is behind
 * would be conservatism at the cost of accuracy, which is the same error as over-claiming with the
 * sign flipped.
 */
function pairwiseSection(input: CompletionReportInput): readonly string[] {
  if (input.pairs.length === 0) return [];
  const measured = input.pairs.filter((p) => p.completion.verdict === "measured");
  return [
    "## Pairwise, because the verdict is a property of the family SET",
    "",
    "A group verdict is the minimum over its members: one family missing a subject makes the whole",
    "group PARTIAL even when two of its members share enough subjects to support a real number. That",
    "number exists, so it is computed and quoted here rather than suppressed by a third family's gap.",
    "",
    "| families | shared subjects | labs | verdict | combined width | sum of parts | null |",
    "|---|---:|---:|---|---:|---:|---:|",
    ...input.pairs.map(
      (p) =>
        `| ${p.completion.families.map((f) => `\`${f.split("-").pop()}\``).join(" + ")} | ${p.completion.sharedSubjects.length} | ${p.completion.sharedProviderFamilies.length} | ${VERDICT_BADGE[p.completion.verdict] ?? p.completion.verdict} | ${p.combined === null ? "refused" : indistinguishableFromChance(p.combined) ? `${p.combined.combinedAxes} (chance-level)` : `**${p.combined.combinedAxes}**`} | ${p.combined === null ? "—" : p.combined.sumOfParts} | ${p.combined?.nullBaseline?.toFixed(1) ?? "—"} |`,
    ),
    "",
    measured.length === 0
      ? "**No pair reaches the threshold.** Every cross-family number in this repository is refused, and the work list above says by how much."
      : [
          `**${measured.length} pair(s) reach the threshold**, so a combined width is available for them and quoted above.`,
          "",
          ...measured.flatMap((p) => {
            const c = p.combined;
            if (c === null) return [];
            return [
              `### ${p.completion.families.map((f) => `\`${f}\``).join(" + ")}`,
              "",
              `Shared subjects: ${p.completion.sharedSubjects.map((s) => `\`${s}\``).join(", ")} — ${p.completion.sharedProviderFamilies.length} lab(s).`,
              "",
              "| | |",
              "|---|---:|",
              ...Object.entries(c.perFamilyAxes)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([f, n]) => `| \`${f}\` alone | ${n} |`),
              `| sum of the parts | ${c.sumOfParts} |`,
              `| **combined over shared subjects** | **${c.combinedAxes}**${indistinguishableFromChance(c) ? " — _indistinguishable from chance; see below_" : ""} |`,
              `| null-model mean | ${c.nullBaseline === null ? "—" : c.nullBaseline.toFixed(1)} |`,
              `| ceiling for this bank | ${c.ceiling ?? "—"} |`,
              `| instances | ${c.instances} |`,
              `| measured cells | ${c.measuredCells} |`,
              "",
              ...(indistinguishableFromChance(c)
                ? [
                    "> **This number is not distinguishable from chance and must not be quoted as a result.** The",
                    `> combined width is ${c.combinedAxes} and the null model scores ${c.nullBaseline?.toFixed(1)}. The null keeps every subject's`,
                    "> failure COUNT and redraws WHICH instances it fails at random, which destroys the structure and",
                    "> keeps the noise — so it is an upper bound, and a corpus that reaches it is as fragmented as",
                    "> randomness. Reaching the shared-subject threshold made the question askable; it did not make",
                    "> the answer informative.",
                    "",
                  ]
                : [
                    `> **The corpus is meaningfully more compressible than chance.** Real width **${c.combinedAxes}**, null model`,
                    `> **${c.nullBaseline?.toFixed(1)}**, ceiling **${c.ceiling ?? "—"}** — a ${compressionRatio(c)?.toFixed(1) ?? "?"}× reduction that randomness does not produce. The null`,
                    "> keeps every subject's failure count and redraws which instances it fails, so it measures what",
                    "> this bank would report with no structure at all. Instances in these families genuinely fail",
                    "> together, and the width is not an artifact of bank size.",
                    ">",
                    "> **The threshold and this test are different gates on purpose.** The threshold asks whether",
                    "> co-failure across families is observable at all; the null model asks whether the observed",
                    "> structure beats noise. Both are reported because a bank can pass either and fail the other.",
                    "",
                  ]),
              c.combinedAxes < c.sumOfParts
                ? `**${c.combinedAxes} < ${c.sumOfParts}: the families overlap.** Some instance in one is failed by exactly the subjects that fail an instance in the other, so the two collapse into one axis under subset inclusion. This is the only evidence that says two families measure the same thing, and it is only available because the same subjects attempted both.`
                : `**${c.combinedAxes} = ${c.sumOfParts}: the axes add over these subjects.** No instance in one family is failed by the same subject set as an instance in the other. Two cautions before that is read as independence: the shared bank is ${p.completion.sharedSubjects.length} subjects, and additivity is also what a DISJOINT bank produces by construction — which is why the restriction to shared subjects above is the load-bearing part.`,
              "",
              p.completion.sharedProviderFamilies.length < 2
                ? "Every shared subject here is from one lab, so this width is a statement about that lab's models rather than about models."
                : `The shared subjects span ${p.completion.sharedProviderFamilies.length} labs (${p.completion.sharedProviderFamilies.join(", ")}), so the width is not an artifact of one lab's training.`,
              "",
            ];
          }),
        ].join("\n"),
    "",
  ];
}
