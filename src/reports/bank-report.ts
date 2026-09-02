// The shared-bank and historical-trial reports.
//
// These two exist to make one comparison possible and to refuse a second one. The historical import
// puts the outbox family's real trial record into the same format as the containment family's, so
// the two can finally be looked at side by side. The shared-bank report then says what that
// side-by-side does and does not license.
//
// The distinction the reports keep hammering is between the three kinds of evidence now in the
// repository, which are constantly collapsed into one column:
//
//   imported historical   real frontier trials on the outbox family, with rewards, costs, and the
//                         refusals and timeouts that must not be counted
//   measured local        real agent trials this repository ran itself
//   mutant/verifier       implementations written alongside the verifier — a fact about the bank

import type { BankOverlap } from "../trials/bank.js";
import { assertBankCoherent, combinedMatrixFor } from "../trials/bank.js";
import type { ImportedHistory } from "../trials/history.js";
import { classifyRunKind } from "../trials/history.js";
import type { TrialRecord, TrialSet } from "../trials/types.js";
import { countedAgentTrials } from "../trials/types.js";
import type { Matrix } from "../types.js";

const usd = (n: number | null): string => (n === null ? "—" : `$${n.toFixed(2)}`);

export function renderHistoricalReport(history: ImportedHistory): string {
  const graded = new Set(history.gradedRuns.map((r) => r.runName));
  const byKind = new Map<string, { graded: number; barren: number; cost: number }>();
  for (const r of history.records) {
    const kind = classifyRunKind(r.runId);
    const e = byKind.get(kind) ?? { graded: 0, barren: 0, cost: 0 };
    if (graded.has(r.runId)) e.graded += 1;
    else e.barren += 1;
    e.cost += r.costUsd ?? 0;
    byKind.set(kind, e);
  }
  const productive = history.records.filter((r) => graded.has(r.runId));
  const barren = history.records.filter((r) => !graded.has(r.runId));
  const totalCost = history.records.reduce((n, r) => n + (r.costUsd ?? 0), 0);

  return [
    "# Historical trials — durable approval outbox",
    "",
    "What the outbox family's trial layer COST, imported from the Harbor run summaries that recorded",
    "it. Not what it measured: every record here carries `counts: false`, because a run summary",
    "preserves one binary suite reward and a binary reward cannot name a scenario. The six runs whose",
    "full per-check grading survived are trial directories under `trials/durable-approval-outbox/`,",
    "and those are the only outbox trials any difficulty claim reads.",
    "",
    "## What the import found",
    "",
    "| | |",
    "|---|---:|",
    `| run directories parsed | ${history.runs.length} |`,
    `| **standard attempts that bought a verdict** | **${productive.length}** |`,
    `| runs that produced nothing usable, or were never attempts at this task | ${barren.length} |`,
    `| recorded spend across all runs | ${usd(totalCost)} |`,
    "",
    "| run kind | graded | no usable result | spend |",
    "|---|---:|---:|---:|",
    ...[...byKind.entries()]
      .sort()
      .map(([k, e]) => `| \`${k}\` | ${e.graded} | ${e.barren} | ${usd(e.cost)} |`),
    "",
    "## Why so many runs bought nothing",
    "",
    "This is the part worth reading. Most of the runs below carry **reward 0.0** in the source data,",
    "sitting in the same field as the genuine failures. Reading the reward column naively turns each of",
    "them into a data point about difficulty. The importer classifies from `exception_stats` and",
    "`n_errored_trials` first, then from the task the preserved trial ids name, and only then looks at",
    "reward.",
    "",
    "| run | status | why it bought nothing |",
    "|---|---|---|",
    ...barren.map((r) => `| \`${r.runId}\` | ${r.status} | ${r.countsReason} |`),
    "",
    "Three of those are provider-level refusals on `/cheat` trials. The source repository had to state",
    "in prose that the resulting zero meant *no attack was attempted* rather than *an attack repelled*;",
    "here it is a classification the data carries.",
    "",
    "`cheat` and `gate` runs are excluded from difficulty evidence by kind, not by outcome: a `/cheat`",
    "trial measures whether the grader can be broken, and a gate run is the oracle or the nop proving",
    "the harness works. Both produce a reward and neither is an attempt at the task.",
    "",
    "## Standard attempts that produced a verdict",
    "",
    "| run | subject | model | runtime | cost |",
    "|---|---|---|---:|---:|",
    ...productive.map(
      (r) =>
        `| \`${r.runId}\` | \`${r.subjectId}\` | ${r.model ?? "—"} | ${r.runtimeSeconds === null ? "—" : `${Math.round(r.runtimeSeconds / 60)}m`} | ${usd(r.costUsd)} |`,
    ),
    "",
    "## Fidelity limits of this import",
    "",
    "- **Rewards are binary in the source, so this import produces no cells at all.** It used to",
    "  record a counted reward-0 run as failing every scenario under a synthetic check named",
    "  `suite_reward_zero` — a check no verifier ever ran, which then reached the shared bank as though",
    "  one had. A reward of 1 was worse: the two reward-1 runs here, `fh-claude-3` and `v2-opus-3b`,",
    "  were recorded as solves at the time and both were later found to still carry the",
    "  `ACKED -> REVOKED` defect the suite was built to catch.",
    "- **Effort is not recorded.** Harbor writes `adhoc` into the effort slot of its eval key, so the",
    "  subject identity is the model alone.",
    "- **Some archived trial-level files were redacted** before commit and do not parse; the run-level",
    "  summaries used here are intact.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}

export interface SharedBankInput {
  /**
   * The outbox family's counted agent trials — its trial directories, not the imported archive.
   *
   * This used to be the `ImportedHistory`, whose records now count nothing on purpose: a binary suite
   * reward cannot name a scenario. The six cc267 runs are trial directories with per-check cells, and
   * a shared-bank table has to be built from the same kind of record on both sides or the "counted
   * trials" column means two different things across one row.
   */
  readonly outboxTrials: readonly TrialRecord[];
  readonly outboxMatrix: Matrix;
  readonly picMatrix: Matrix;
  readonly picTrials: TrialSet;
  readonly overlap: BankOverlap;
}

export function renderSharedBankReport(input: SharedBankInput): string {
  // Before anything is printed: each family's counted trials must have been graded against one
  // scenario set. Pooling two suites into one bank would make the table below quietly wrong.
  assertBankCoherent("durable-approval-outbox", input.outboxTrials);
  assertBankCoherent("prompt-injection-containment", input.picTrials.records);

  const outboxCounted = input.outboxTrials.filter((r) => r.counts);
  const outboxSubjects = [...new Set(outboxCounted.map((r) => r.subjectId))].sort();
  const picAgents = countedAgentTrials(input.picTrials);
  const picSubjects = [...new Set(picAgents.map((r) => r.subjectId))].sort();
  const shared = outboxSubjects.filter((s) => picSubjects.includes(s));

  const verdict = shared.length === 0 ? "REFUSED" : shared.length < 3 ? "PARTIAL" : "MEASURED";

  return [
    "# Shared subject bank",
    "",
    "Which models have attempted which families, and what that permits. An axis count is a property of",
    "a suite **paired with the bank it is graded against**, so comparing two families requires the same",
    "subjects to appear in both. This report computes whether they do.",
    "",
    "## The bank",
    "",
    "| family | counted agent subjects | counted trials | evidence type |",
    "|---|---|---:|---|",
    `| \`durable-approval-outbox\` | ${outboxSubjects.map((s) => `\`${s}\``).join(", ") || "none"} | ${outboxCounted.length} | imported historical |`,
    `| \`prompt-injection-containment\` | ${picSubjects.map((s) => `\`${s}\``).join(", ") || "none"} | ${picAgents.length} | measured here |`,
    "",
    "## Overlap verdict",
    "",
    "| | |",
    "|---|---|",
    `| subjects attempting **both** families | ${shared.map((s) => `\`${s}\``).join(", ") || "none"} |`,
    `| count | ${shared.length} |`,
    `| threshold for a combined axis claim | ${input.overlap.threshold} |`,
    `| **verdict** | **${verdict}** |`,
    "",
    verdict === "REFUSED"
      ? "No subject has attempted both families. No combined axis count is available, and the union matrix's width would be the sum of the parts by construction."
      : verdict === "PARTIAL"
        ? [
            `**${shared.length} subject overlaps, below the threshold of ${input.overlap.threshold}.**`,
            "",
            "This is real progress and not yet a measurement. A combined antichain width is bounded above",
            "by the size of the shared bank, so with one shared subject the combined count can only be 0",
            "or 1 — it cannot distinguish 'these families measure the same thing' from 'they are",
            "independent'. Reporting a number here would be reporting the bound, not the finding.",
            "",
            "What the overlap DOES support is a direct qualitative comparison, and on this bank it is",
            "stark: `claude-opus-5` fails the outbox family and passes the containment family cleanly.",
            "One family is beyond it and the other is not, which is a statement about the two families",
            "rather than about the model.",
          ].join("\n")
        : `${shared.length} shared subjects clear the threshold; a combined axis count over the shared bank is available across ${combinedMatrixFor(input.overlap).instances.length} instances. It is computed over the shared subjects only.`,
    "",
    "## What each family's number means",
    "",
    "The two banks are not merely different sizes, they are epistemically different, and the axis counts",
    "must not be read the same way:",
    "",
    "| family | bank | the axis count is a statement about |",
    "|---|---|---|",
    "| `durable-approval-outbox` | 10 engines written by frontier models attempting the task | how real implementations fail |",
    "| `prompt-injection-containment` | 9 mutants written alongside the verifier | what the verifier can detect |",
    "",
    "Adding those is meaningless even where the banks overlap, because they answer different questions.",
    "",
    "## To reach a MEASURED verdict",
    "",
    `Run the remaining subjects on both families. The outbox family has \`${outboxSubjects.join("`, `")}\`;`,
    `the containment family has \`${picSubjects.join("`, `") || "none"}\`. The cheapest path to a combined`,
    "claim is to run the containment challenge against the models already in the outbox bank, since the",
    "containment family costs minutes and dollars rather than hours and tens of dollars.",
    "",
    "**But note what the containment trials already showed:** every counted attempt passed every",
    "scenario. A family that is already-solved contributes no axes to a combined count regardless of",
    "bank overlap, so the honest next step is to harden that family before spending more on comparison.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
