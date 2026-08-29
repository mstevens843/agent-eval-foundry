// The third-subject campaign, and the regression guards that came out of it.
//
// Two reports, one file, because they are two halves of the same episode: what it took to make a
// cross-family number exist, and what stops that number rotting once the family underneath it moves.

import type { BankCompletion } from "../trials/bank-completion.js";
import type { EvidenceLedger } from "../trials/evidence-lifecycle.js";
import type { ChallengeMigration } from "../trials/migration.js";
import type { ProviderAvailability } from "../trials/provider-registry.js";

/**
 * Marker for a line that is conditionally omitted.
 *
 * Filtering on `""` deletes the blank lines markdown needs between blocks, which collapses every
 * table into the paragraph above it. Three renderers in this repository shipped that bug before it
 * was given a name.
 */
const SKIP = "\u0000skip";

export interface ThirdSubjectInput {
  readonly completion: BankCompletion;
  readonly availability: readonly ProviderAvailability[];
  /** Trials run to close the bank, in the order they were executed. */
  readonly campaign: readonly {
    readonly runId: string;
    readonly familyId: string;
    readonly subjectId: string;
    readonly providerFamily: string;
    readonly scenariosGraded: number;
    readonly scenariosFailed: number;
    readonly runtimeSeconds: number | null;
    readonly counted: boolean;
  }[];
  readonly usdPerTrial: number;
}

export function renderThirdSubjectCampaign(input: ThirdSubjectInput): string {
  const c = input.completion;
  const total = input.campaign.length;
  const counted = input.campaign.filter((r) => r.counted).length;
  const seconds = input.campaign.reduce((n, r) => n + (r.runtimeSeconds ?? 0), 0);
  const unavailable = input.availability.filter((a) => !a.available);

  return [
    "# Third-subject campaign",
    "",
    "A cross-family axis count needs the same subjects to have attempted every family. This is the",
    "campaign that produced them, what it cost, and what it did and did not buy.",
    "",
    "## The constraint, before",
    "",
    "Two shared subjects — one Anthropic model and one OpenAI model — against a threshold of three.",
    "The combined width was bounded above by two, which cannot distinguish 'these families measure the",
    "same thing' from 'they measure different things'. Every cross-family number was refused, correctly.",
    "",
    "## What was actually available",
    "",
    "Three CLIs are installed here and exactly one of them was a new LAB:",
    "",
    "| provider | family | available | detail |",
    "|---|---|---|---|",
    ...input.availability.map(
      (a) =>
        `| \`${a.provider.id}\` | ${a.provider.family} | ${a.available ? "yes" : "**no**"} | ${a.detail} |`,
    ),
    "",
    "Google's binary answers `--version` and its account is not entitled: authentication fails with",
    "`IneligibleTierError`. That is an infrastructure failure, never a model result, and it counts for",
    "nothing. Codex was probed with five alternative model ids and every one returned `not supported",
    "when using Codex with a ChatGPT account`, so OpenAI contributes exactly one subject here.",
    "",
    "**So the third subject had to come from a lab that already had one.** That is a real and stated",
    "limitation rather than a workaround: `claude-opus-5` and `claude-sonnet-5` are different weights",
    "with different failure sets, so the BANK counts them as two subjects — which is the right unit for",
    "an antichain width. They are one PROVIDER FAMILY, which is the right unit for a transfer claim.",
    "Both numbers are printed everywhere either appears, and the tests assert they are computed",
    "separately.",
    "",
    "## The campaign",
    "",
    "| run | family | subject | lab | graded | failed | runtime |",
    "|---|---|---|---|---:|---:|---:|",
    ...input.campaign.map(
      (r) =>
        `| \`${r.runId}\` | ${r.familyId.split("-").pop()} | \`${r.subjectId}\` | ${r.providerFamily} | ${r.scenariosGraded} | ${r.scenariosFailed} | ${r.runtimeSeconds === null ? "—" : `${r.runtimeSeconds}s`} |`,
    ),
    "",
    "| | |",
    "|---|---:|",
    `| trials run | ${total} |`,
    `| counted | ${counted} |`,
    `| model-minutes | ${Math.round(seconds / 60)} |`,
    `| estimated spend at $${input.usdPerTrial.toFixed(2)}/trial | $${(total * input.usdPerTrial).toFixed(2)} |`,
    "",
    "## The constraint, after",
    "",
    `**${c.verdict.toUpperCase()}.** ${c.rationale}`,
    "",
    "| | |",
    "|---|---:|",
    `| shared subjects | ${c.sharedSubjects.length} |`,
    `| threshold | ${c.threshold} |`,
    `| provider families among them | ${c.sharedProviderFamilies.length} |`,
    `| counted trials still needed | ${c.minimumAdditionalTrials} |`,
    "",
    "## What it bought, and what it did not",
    "",
    "| | |",
    "|---|---|",
    "| a combined cross-family axis count | **yes** — computable for the first time |",
    "| evidence that the families measure different things | **yes** — the axes add over the shared subjects, against a null model twice as large |",
    "| a third lab | **no** — three of the four subjects are Anthropic models |",
    "| a wider UI family | **no** — the new subjects landed inside the existing chain, which is what a chain does |",
    "| a weaker containment kill | **no** — both new subjects also passed 128 of 128, so `already-solved` got stronger |",
    "",
    "The fourth row is the one worth dwelling on. Two of the four trials in this campaign went to a",
    "family whose failure sets were already totally ordered, and both landed on the chain — one of them",
    "failing the *identical* 62 scenarios as another subject. That is the campaign paying to confirm",
    "something the chain analysis predicts for free: **subjects cannot widen a chain.** The money was",
    "not wasted — it produced the shared-bank threshold — but the diversity lesson was available",
    "beforehand, and next time it should be read beforehand.",
    "",
    unavailable.length === 0
      ? SKIP
      : [
          "## For the labs that cannot run here",
          "",
          "Prepared bundles are checked in with the challenge hash pinned, so an imported result either",
          "measures this exact task or is refused on import:",
          "",
          "```bash",
          "foundry trials campaign import --family <family> <directory>",
          "```",
          "",
        ].join("\n"),
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ]
    .filter((l) => l !== SKIP)
    .join("\n");
}

// ---------------------------------------------------------------- the regression report

export interface RegressionInput {
  readonly migrations: readonly ChallengeMigration[];
  readonly ledgers: readonly EvidenceLedger[];
  /** Reports checked by the stale-evidence guard on the last run of `all`. */
  readonly reportsChecked: number;
  readonly guards: readonly { readonly code: string; readonly what: string; readonly caught: string }[];
}

export function renderStaleEvidenceRegression(input: RegressionInput): string {
  const superseded = input.ledgers.flatMap((l) => l.superseded);
  return [
    "# Stale evidence: the regression guards",
    "",
    "A content hash already invalidates evidence automatically when a family changes. What it cannot",
    "do is stop a report from quoting the invalidated run anyway — because the run's own record still",
    "says `counts: true`. `counts` is about grading, and says nothing about whether the task it was",
    "graded against still exists.",
    "",
    "**That bug shipped once.** A run that cited 7 of 8 rule codes and failed 47 scenarios reappeared as",
    "a report's headline example weeks after the repair that invalidated it, because the new report",
    "read `record.counts` instead of the evidence ledger. Everything below exists because of that.",
    "",
    "## The guards",
    "",
    "| rule | what it refuses | what it caught |",
    "|---|---|---|",
    ...input.guards.map((g) => `| \`${g.code}\` | ${g.what} | ${g.caught} |`),
    "",
    "## Migrations on record",
    "",
    input.migrations.length === 0
      ? "_None: no family has changed since its first counted trial._"
      : [
          "| family | from | to | discovered by | invalidated | reissued as | date |",
          "|---|---|---|---|---|---|---|",
          ...input.migrations.map(
            (m) =>
              `| \`${m.familyId}\` | \`${m.fromHash.slice(0, 8)}\` | \`${m.toHash.slice(0, 8)}\` | \`${m.discoveredBy ?? "—"}\` | ${m.invalidated.map((r) => `\`${r}\``).join(", ")} | ${m.reissuedAs ?? "—"} | ${m.date} |`,
          ),
          "",
          ...input.migrations.flatMap((m) => [`**Why \`${m.familyId}\` changed.** ${m.reason}`, ""]),
        ].join("\n"),
    "",
    "## Currently superseded",
    "",
    superseded.length === 0
      ? "_None._"
      : [
          `${superseded.length} trial(s) are preserved and do not count: ${superseded.map((r) => `\`${r}\``).join(", ")}.`,
          "",
          "They are visible in every report that touches them, and every one of those mentions is",
          "checked by the guard below. Invalidated trials are real spend; deleting them would make a",
          "repair look cheaper than it was.",
        ].join("\n"),
    "",
    "## The guard that runs on output, not on inputs",
    "",
    `\`assertStaleRunsLabelled\` runs over the rendered text of **all ${input.reportsChecked} reports** that`,
    "`foundry all` produces, and it enforces two rules per superseded run:",
    "",
    "1. the markdown SECTION naming the run must say somewhere that it is superseded, invalidated or",
    "   stale — scoped by heading rather than by a line window, because a window is a knob and a knob",
    "   gets widened until the report passes;",
    "2. and no individual LINE may name the run and call it counted, because a label elsewhere in the",
    "   section does not rescue a table row that states the opposite on its own line.",
    "",
    "Checking the output rather than the inputs is deliberate. The bug this replaces lived *inside* a",
    "report builder that had the right data and read the wrong field, so no assertion on the data would",
    "have caught it. This one caught three more instances the first time it ran — two in reports written",
    "in the same session that added it.",
    "",
    "## What a repair costs, and why that is the point",
    "",
    "The last repair invalidated three counted trials that had already been paid for, and it was",
    "prompted by one of those trials being **right**: the model cited the rule the published evaluation",
    "order said was correct, and the verifier demanded another. A benchmark without a challenge hash",
    "would have kept the numbers. A benchmark without real trials would never have found the ambiguity.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ]
    .filter((l) => l !== SKIP)
    .join("\n");
}
