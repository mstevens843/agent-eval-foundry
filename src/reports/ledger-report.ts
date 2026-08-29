// Candidate ledger and family-diversity reports.
//
// The ledger's value is the kill rate, so the report leads with kills rather than ships. Eight of ten
// design cycles in the source project were killed for $0 in model spend, and that ratio -- not the
// one family that shipped -- is what makes the budget model work. A ledger that only recorded
// successes would be a portfolio page and would support no arithmetic at all.
//
// The family-diversity table is the one place this repo mixes measured and estimated numbers in a
// single column, because the whole point is to compare a family that has been measured against
// families that have not. So the marker is rendered inline next to every value rather than explained
// in a footnote: `3 (measured)` beside `4 (est.)`. A reader skimming the column must not be able to
// mistake one for the other.

import type { Registry } from "../foundry/registry.js";
import { type Candidate, TASK_STATUS, type TaskShape } from "../foundry/schema.js";

const mark = (q: string): string => (q === "measured" ? "measured" : "est.");

const money = (n: number | null): string => (n === null ? "—" : `$${n.toFixed(2)}`);

function killTaxonomy(candidates: readonly Candidate[]): readonly string[] {
  // The categories the source project's own screening converged on. Matched by substring against
  // failure notes: crude, but stated, and better than inventing a taxonomy field nobody fills in.
  const buckets: readonly (readonly [string, RegExp])[] = [
    ["already-solved", /already[- ]solved|already handle|solved it|models are already/i],
    ["self-verifiable", /self[- ]verifiab|brute[- ]force|probe the oracle|decompil|differential/i],
    ["unfair-or-defused", /unfair|defus|hatch|deadlock|punish/i],
    ["no-window", /no[- ]window|not reachable|unreachable|race .* not/i],
  ];
  const killed = candidates.filter((c) => c.status === "killed");
  const counts = buckets.map(([name, re]) => {
    const hits = killed.filter((c) => re.test(c.failureNotes ?? "")).length;
    return `| ${name} | ${hits} |`;
  });
  const classified = buckets.reduce(
    (n, [, re]) => n + killed.filter((c) => re.test(c.failureNotes ?? "")).length,
    0,
  );
  return [
    "| kill category | rows |",
    "|---|---:|",
    ...counts,
    `| _unclassified_ | ${Math.max(0, killed.length - classified)} |`,
    "",
    "Categories are matched against each row's failure notes. A row landing in _unclassified_ is not",
    "an error, but it is a row whose lesson has not been made transferable yet.",
    "",
  ];
}

export function renderLedgerReport(r: Registry): string {
  const c = r.candidates;
  const byStatus = TASK_STATUS.map((s) => [s, c.filter((x) => x.status === s).length] as const);
  const measured = c.filter((x) => x.dataQuality === "measured");
  const spend = c.reduce((n, x) => n + (x.costUsd ?? 0), 0);
  const killed = c.filter((x) => x.status === "killed");
  const shipped = c.filter((x) => x.status === "shipped");
  // `costUsd === 0` means it demonstrably cost nothing. `costUsd === null` means nobody recorded it.
  // Folding the second into the first would overstate how cheap screening is, which is the single
  // most load-bearing number in the budget model — so the two are counted separately and reported
  // separately, even though it makes the headline look worse.
  const freeKills = killed.filter((x) => x.costUsd === 0);
  const unpricedKills = killed.filter((x) => x.costUsd === null);
  const paidKills = killed.filter((x) => (x.costUsd ?? 0) > 0);

  const lines: string[] = [
    "# Candidate ledger",
    "",
    "Every task idea that has been screened, promoted or killed. **Kills are the point.** The ratio of",
    "candidates screened to families shipped is the only honest input to a budget plan, and it is a",
    "number you can only get by writing the failures down.",
    "",
    "## Summary",
    "",
    "| | |",
    "|---|---:|",
    `| candidates | **${c.length}** |`,
    ...byStatus.filter(([, n]) => n > 0).map(([s, n]) => `| status \`${s}\` | ${n} |`),
    `| measured (a real result exists) | ${measured.length} |`,
    `| estimated | ${c.length - measured.length} |`,
    `| recorded model spend | ${money(spend)} |`,
    `| kills that demonstrably cost $0 | ${freeKills.length} of ${killed.length} |`,
    `| kills that cost model spend | ${paidKills.length} |`,
    `| kills with no cost recorded | ${unpricedKills.length} |`,
    "",
    killed.length > 0 && shipped.length > 0
      ? `Screened-to-shipped on this record: **${killed.length} killed for ${shipped.length} shipped**. ${freeKills.length} kill(s) demonstrably cost nothing, ${paidKills.length} consumed model spend, and ${unpricedKills.length} have no cost recorded at all — so the true screening cost is a floor, not a total. The budget planner's hit-rate default is set from the ten design cycles this record reconstructs, and it is an input a reader is entitled to change.`
      : "_Not enough measured rows yet to state a screened-to-shipped ratio._",
    "",
    "## Kill taxonomy",
    "",
    ...killTaxonomy(c),
    "## Rows",
    "",
    "| id | status | decision | mechanisms | cost | quality |",
    "|---|---|---|---|---:|---|",
  ];

  for (const x of c) {
    lines.push(
      `| \`${x.id}\` | ${x.status} | ${x.decision} | ${x.mechanisms.join(", ") || "—"} | ${money(x.costUsd)} | ${mark(x.dataQuality)} |`,
    );
  }
  lines.push("");

  for (const x of c) {
    lines.push(
      `### ${x.title} \`${x.id}\``,
      "",
      `**Status** ${x.status} · **Decision** ${x.decision} · **Domain** ${x.domain} · **Data** ${mark(x.dataQuality)}`,
      "",
      `**Hypothesis.** ${x.hypothesis}`,
      "",
      `**Why it should be hard.** ${x.whyHard}`,
      "",
      `**Why it might be unfair.** ${x.whyMightBeUnfair}`,
      "",
      x.results === null
        ? "**Results.** _none — not run_"
        : `**Results.** ${x.results.passed} passed / ${x.results.failed} failed against ${x.results.subjectsTested.join(", ")}. ${x.results.note}`,
      "",
      x.failureNotes === null ? "" : `**Why it died.** ${x.failureNotes}`,
      x.failureNotes === null ? "" : "",
      `**Decision rationale.** ${x.decisionRationale}`,
      "",
      `**Transferability.** ${x.transferability}`,
      "",
      x.links.length > 0 ? `**Evidence.** ${x.links.map((l) => `\`${l}\``).join(", ")}` : "",
      x.links.length > 0 ? "" : "",
    );
  }

  lines.push("---", "", "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.", "");
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

/**
 * Family diversity: how many independent axes the declared families are expected to yield.
 *
 * Only one family here has a measured axis count. The rest are estimates, and the total is therefore
 * an estimate with one measured anchor — which the report says in the same breath as the number.
 */
export function renderFamilyDiversityReport(shapes: readonly TaskShape[]): string {
  const withAxes = shapes.filter((s) => s.estimatedAxes !== null);
  const measured = withAxes.filter((s) => s.dataQuality === "measured");
  const totalAxes = withAxes.reduce((n, s) => n + (s.estimatedAxes ?? 0), 0);
  const measuredAxes = measured.reduce((n, s) => n + (s.estimatedAxes ?? 0), 0);
  const buildHours = shapes.reduce((n, s) => n + s.estimatedBuildHours, 0);
  const frontierUsd = shapes.reduce((n, s) => n + s.estimatedFrontierUsd, 0);

  const lines: string[] = [
    "# Family diversity",
    "",
    "What the declared families are expected to measure, in axes rather than task count. **One family",
    "has a measured axis count; the rest are estimates.** The marker is on every row for that reason —",
    "a column mixing the two without labels is how an estimate becomes a fact.",
    "",
    "| family | status | mechanisms | axes | build h | frontier $ | data |",
    "|---|---|---|---:|---:|---:|---|",
  ];
  for (const s of shapes) {
    lines.push(
      `| \`${s.familyId}\` | ${s.status} | ${s.mechanisms.join(", ")} | ${s.estimatedAxes ?? "—"} | ${s.estimatedBuildHours} | ${s.estimatedFrontierUsd.toFixed(0)} | ${mark(s.dataQuality)} |`,
    );
  }
  lines.push(
    "",
    "## Totals",
    "",
    "| | |",
    "|---|---:|",
    `| families | ${shapes.length} |`,
    `| expected axes (all) | ${totalAxes} |`,
    `| of which measured | **${measuredAxes}** |`,
    `| of which estimated | ${totalAxes - measuredAxes} |`,
    `| declared build hours | ${buildHours} |`,
    `| declared frontier spend | $${frontierUsd.toFixed(2)} |`,
    "",
    `Mechanism coverage across families: ${
      new Set(shapes.flatMap((s) => s.mechanisms)).size
    } distinct mechanisms.`,
    "",
    "**How to read the axes column.** For the measured family it is the antichain width computed from",
    "a real result matrix against a real bank of engines. For every other row it is an author's",
    "estimate of how many independent failure axes the family would yield, and it has the reliability",
    "of any pre-registration: useful for planning, worthless as evidence. The first thing any of these",
    "families should produce after its first trial matrix is a measured number to replace it.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  );
  return lines.join("\n");
}
