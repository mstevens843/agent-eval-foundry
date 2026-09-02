// The shared DIFFICULTY bank: which real subjects have attempted which families, and what a
// combined number would mean.
//
// Distinct from the existing shared-bank report, which covers every bank kind. This one is only
// about agent banks, because the cross-family claim people actually want — "our benchmark measures N
// independent things" — is a claim about difficulty, and pooling a mutant bank into it is a category
// error dressed as a bigger number.
//
// The report is mostly about what it refuses. A combined axis count over two families needs the same
// subjects to have attempted both, and the width it produces is bounded above by how many subjects
// that is. With one shared subject the combined width can only be 0 or 1, which cannot distinguish
// "these families measure the same thing" from "they measure different things" — so the number is a
// bound, and quoting a bound as a measurement is the thing to avoid.

import { measure } from "../axis-meter.js";
import type { KindedBank } from "../trials/bank.js";
import { combineOverSharedSubjects, computeOverlap } from "../trials/bank.js";
import { PROVIDERS, checkProvider } from "../trials/provider-registry.js";
import { ROUTABLE_FAMILY_IDS } from "../trials/router.js";
import type { Matrix } from "../types.js";

export interface DifficultyBankRow {
  readonly familyId: string;
  readonly subjects: readonly string[];
  readonly countedTrials: number;
  readonly instances: number;
  readonly measuredCells: number;
  readonly axes: number | null;
  readonly realism: string;
}

export interface SharedDifficultyInput {
  readonly banks: readonly KindedBank[];
  readonly rows: readonly DifficultyBankRow[];
  readonly threshold: number;
}

/** The provider whose declared subject id matches, when the registry knows one. */
function providerFor(subject: string): (typeof PROVIDERS)[number] | null {
  return PROVIDERS.find((p) => p.subjectId === subject) ?? null;
}

interface MissingTrial {
  readonly subject: string;
  readonly familyId: string;
}

/**
 * Every (subject, family) pair that would have to exist for the combined count to be available.
 *
 * Deduplicated on the pair, not on the subject: a subject missing from two families needs two
 * trials, and an earlier version of this report emitted the same line twice because it iterated
 * banks rather than pairs. A next-step section that repeats itself reads as a template, and the
 * reader stops trusting the specifics.
 */
function missingPairs(
  difficulty: readonly KindedBank[],
  appearances: ReadonlyMap<string, readonly string[]>,
): readonly MissingTrial[] {
  const pairs = new Map<string, MissingTrial>();
  for (const subject of [...appearances.keys()].sort()) {
    for (const bank of difficulty) {
      if (!bank.subjects.includes(subject)) {
        pairs.set(`${subject}::${bank.familyId}`, { subject, familyId: bank.familyId });
      }
    }
  }
  return [...pairs.values()];
}

/**
 * The exact commands, not a description of them.
 *
 * A next-step section whose code block holds only comments is a to-do list wearing a shell prompt.
 * These are runnable as written; the run ids are the only thing a reader has to choose.
 */
function runCommands(missing: readonly MissingTrial[]): readonly string[] {
  if (missing.length === 0) return ["# Nothing missing."];
  return missing.flatMap((m, i) => {
    const provider = providerFor(m.subject);
    const slug = m.familyId.split("-").pop() ?? m.familyId;
    if (!(ROUTABLE_FAMILY_IDS as readonly string[]).includes(m.familyId)) {
      return [
        ...(i === 0 ? [] : [""]),
        `# ${m.subject} on ${m.familyId}: imported/non-routable bank; run in its source harness and import the result.`,
      ];
    }
    if (provider === null || provider.command === null) {
      return [
        ...(i === 0 ? [] : [""]),
        `foundry trials campaign prepare --family ${m.familyId} --provider external --out bundles/${m.familyId}-external`,
        `foundry trials campaign import --family ${m.familyId} bundles/${m.familyId}-external`,
      ];
    }
    const availability = checkProvider(provider);
    if (!availability.available) {
      return [
        ...(i === 0 ? [] : [""]),
        `foundry trials campaign prepare --family ${m.familyId} --provider ${provider.id} --out bundles/${m.familyId}-${provider.id}`,
        `foundry trials campaign import --family ${m.familyId} bundles/${m.familyId}-${provider.id}`,
      ];
    }
    const rest = provider.command
      .slice(1)
      .map((arg) => (arg === "{instruction}" ? "'{instruction}'" : arg))
      .join(" ");
    return [
      ...(i === 0 ? [] : [""]),
      `foundry trials run --family ${m.familyId} --run-id ${slug}-${provider.id}-1 \\`,
      `  --model ${provider.family === "openai" ? "openai" : provider.family}/${m.subject} --provider shell --inherit-env \\`,
      `  --command ${provider.command[0]} ${rest}`,
    ];
  });
}

/**
 * What to do when every subject that exists is already in every bank.
 *
 * This is the state the report reaches once the obvious trials have been run, and the earlier
 * version handled it badly: it said "1 more subject must attempt every family" and then printed
 * "Nothing missing", because it was looking for gaps among subjects rather than for subjects that
 * do not exist. The constraint at this point is a THIRD LAB, and naming which one — and why it is
 * not already here — is the only useful thing the report can say.
 */
function newSubjectSection(needed: number, difficulty: readonly KindedBank[]): readonly string[] {
  const present = new Set(difficulty.flatMap((b) => b.subjects));
  const untried = PROVIDERS.filter((p) => !present.has(p.subjectId));
  return [
    "**Every subject that exists is already in every bank.** The gap is not a missing trial, it is a",
    `missing SUBJECT: ${needed} more model family has to attempt all ${difficulty.length} families before a combined`,
    "width means anything. Re-running the two models already here cannot help — the width is bounded",
    "by how many distinct subjects the banks share, not by how many trials they contain.",
    "",
    ...(untried.length === 0
      ? ["Every provider in the registry has counted trials. A third subject means adding one."]
      : [
          "Providers in the registry with no counted trial:",
          "",
          "| provider | family | why not yet |",
          "|---|---|---|",
          ...untried.map(
            (p) =>
              `| \`${p.id}\` | ${p.family} | ${p.command === null ? "no local CLI: external by declaration" : "declared and runnable; see the refusals and infrastructure table for what happened"} |`,
          ),
          "",
          "For a provider that cannot run here, prepare a bundle and have someone with access run it.",
          "The bundle pins the challenge hash, so an imported result either measures this exact task or",
          "is refused:",
          "",
          "```bash",
          ...difficulty
            .filter((b) => b.kind === "agent")
            .map(
              (b) =>
                `foundry trials campaign prepare --family ${b.familyId} --provider external --out bundles/${b.familyId}-external`,
            ),
          "```",
        ]),
  ];
}

export function renderSharedDifficultyBank(input: SharedDifficultyInput): string {
  const difficulty = input.banks.filter((b) => b.kind === "agent" || b.kind === "imported");
  const overlap = difficulty.length >= 2 ? computeOverlap(difficulty) : null;
  const shared = overlap?.sharedSubjects ?? [];

  const appearances = new Map<string, string[]>();
  for (const bank of difficulty) {
    for (const subject of bank.subjects) {
      appearances.set(subject, [...(appearances.get(subject) ?? []), bank.familyId]);
    }
  }
  const multi = [...appearances.entries()]
    .filter(([, families]) => families.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));

  const combined =
    overlap !== null && shared.length > 0 ? combineOverSharedSubjects(difficulty, shared) : null;
  const combinedAxes: number | null =
    combined === null ? null : measure(combined.matrix, { nullTrials: 3 }).independentAxes;

  return [
    "# Shared difficulty bank",
    "",
    "Which real subjects have attempted which families, and what a cross-family number would mean.",
    "",
    "Only **difficulty** banks appear here — banks whose subjects are real models. Mutant banks measure",
    "what a verifier detects and are a different question; they are in",
    "`shared-subject-bank-report.md` and they are never pooled with these.",
    "",
    "## The difficulty banks",
    "",
    difficulty.length === 0
      ? "_No family has a bank of real subjects._"
      : [
          "| family | subjects | counted trials | instances | measured cells | axes | realism |",
          "|---|---|---:|---:|---:|---:|---|",
          ...input.rows.map(
            (r) =>
              `| \`${r.familyId}\` | ${r.subjects.map((s) => `\`${s}\``).join(", ") || "none"} | ${r.countedTrials} | ${r.instances} | ${r.measuredCells} | ${r.axes ?? "—"} | ${r.realism} |`,
          ),
        ].join("\n"),
    "",
    "An axis count over a bank of one subject is not meaningful — a single subject cannot separate",
    "anything from anything — so a family with one model's trials shows its instances and leaves the",
    "axis column empty rather than reporting a degenerate 1.",
    "",
    "## Subjects that attempted more than one family",
    "",
    multi.length === 0
      ? "_None._ No model has attempted two families, so no cross-family comparison is available at any strength."
      : [
          "| subject | families |",
          "|---|---|",
          ...multi.map(
            ([subject, families]) => `| \`${subject}\` | ${families.map((f) => `\`${f}\``).join(", ")} |`,
          ),
        ].join("\n"),
    "",
    "## The verdict",
    "",
    overlap === null
      ? "**REFUSED.** Fewer than two difficulty banks exist, so there is nothing to compare."
      : [
          `**${overlap.verdict.toUpperCase()}.** ${overlap.rationale}`,
          "",
          "| | |",
          "|---|---:|",
          `| difficulty banks | ${difficulty.length} |`,
          `| subjects attempting every family | ${shared.length} |`,
          `| threshold for a quoted combined count | ${input.threshold} |`,
          combinedAxes === null
            ? "| combined axes | not computable |"
            : `| combined axes over the shared bank | ${combinedAxes} — **a bound, not a measurement** |`,
          "",
          shared.length > 0 && shared.length < input.threshold
            ? [
                `With ${shared.length} shared subject(s) the combined antichain width is bounded above by ${shared.length}.`,
                "A bound that small cannot distinguish 'these families measure the same thing' from 'they",
                "measure different things', so the number above is reported and not quoted.",
              ].join("\n")
            : "",
        ].join("\n"),
    "",
    "## Are these families independent?",
    "",
    multi.length === 0
      ? [
          "**Unknown, and honestly so.** Independence is a statement about co-failure: do the same",
          "implementations fail both families, or different ones? With no subject in both banks there is",
          "no co-failure to observe, and any answer would be inferred from the families' descriptions",
          "rather than measured.",
        ].join("\n")
      : [
          `\`${multi[0]?.[0]}\` has attempted ${multi[0]?.[1].length} families, which makes a qualitative`,
          "comparison possible: how the same model fares on each. That is a real observation and it is",
          `not an axis count — for that, ${input.threshold} shared subjects are needed.`,
        ].join("\n"),
    "",
    "## The exact trial that unlocks the next claim",
    "",
    ...(shared.length >= input.threshold
      ? ["Nothing: the combined count is available. Widen the bank to narrow it."]
      : difficulty.length < 2
        ? [
            "A counted trial on a second family. Every built family is routable and packaged, so this is",
            "model time rather than engineering:",
            "",
            "```bash",
            ...runCommands([{ subject: "claude-opus-5", familyId: "ui-action-record-replay" }]),
            "```",
          ]
        : missingPairs(difficulty, appearances).length > 0
          ? [
              `${input.threshold - shared.length} more subject(s) must attempt every difficulty family. The cheapest`,
              "path is running or importing the models that already have trials on one family against the others.",
              "Each line below is a trial that does not exist yet:",
              "",
              "```bash",
              ...runCommands(missingPairs(difficulty, appearances)),
              "```",
            ]
          : newSubjectSection(input.threshold - shared.length, difficulty)),
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}

/** Count cells that are neither null nor absent — the denominator behind any axis claim. */
export function measuredCells(matrix: Matrix): number {
  let n = 0;
  for (const instance of matrix.instances) {
    const row = matrix.results[instance.id] ?? {};
    for (const subject of matrix.subjects) {
      if (row[subject.id] != null) n += 1;
    }
  }
  return n;
}
