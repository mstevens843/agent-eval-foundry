// Rendering, with one rule enforced in code rather than in review: the provenance caveat is printed
// before any number it could undermine.
//
// The failure mode this exists to prevent is a real one and it happened in the suite this tool was
// first pointed at. A number gets computed under a caveat, the caveat lives three files away in a
// results document, the number gets quoted in a summary, and by the third retelling it is a bare
// fact. Putting the caveat in the same function that formats the headline makes them travel
// together, so a reader who copies the top of the report copies the qualification with it.
//
// Everything here is a pure string transform over an AxisReport. No file access, no template engine,
// no clock -- a timestamp in the output would make runs non-diffable, and diffability is the whole
// point of checking expected reports into the repository.

import type { AxisReport } from "./types.js";

// Detail sections are capped. A 500-instance corpus with a 134-system bank produces 474 clusters
// whose catch sets run to a hundred members each, which is a 1.8 MB report nobody reads. Every cap
// below announces what it dropped: a silent truncation would read as "that is all there was", which
// is exactly the kind of quiet inflation this package exists to refuse.
const MAX_SET_MEMBERS = 12;
const MAX_ROWS = 25;

const set = (ids: readonly string[]): string => {
  if (ids.length === 0) return "{}";
  if (ids.length <= MAX_SET_MEMBERS) return `{${ids.join(", ")}}`;
  return `{${ids.slice(0, MAX_SET_MEMBERS).join(", ")}, … +${ids.length - MAX_SET_MEMBERS} more}`;
};

const elided = (shown: number, total: number, noun: string): readonly string[] =>
  total <= shown ? [] : ["", `*Showing ${shown} of ${total} ${noun}; ${total - shown} not listed.*`];

const pct = (n: number, d: number): string => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(0)}%`);

function headline(r: AxisReport): readonly string[] {
  const discriminating = r.instanceCount - r.blindInstances.length;
  const checksRow =
    r.provenance.checks_total === null ? [] : [`| checks in the suite | **${r.provenance.checks_total}** |`];
  // The denominator that matters, when the suite is willing to name its own checks.
  const firingRow =
    r.provenance.checks_declared === null
      ? []
      : [
          `| checks that have ever fired | **${r.provenance.checks_declared.length - (r.checksNeverFired?.length ?? 0)}** of ${r.provenance.checks_declared.length} (${pct(r.provenance.checks_declared.length - (r.checksNeverFired?.length ?? 0), r.provenance.checks_declared.length)}) |`,
        ];
  return [
    `# Axis report: ${r.suite}`,
    "",
    "## Headline",
    "",
    "| | |",
    "|---|---|",
    `| graded instances | **${r.instanceCount}** |`,
    ...checksRow,
    ...firingRow,
    `| subjects in the bank | ${r.subjectCount} |`,
    `| instances that separate nothing in this bank | **${r.blindInstances.length}** (${pct(r.blindInstances.length, r.instanceCount)}) |`,
    `| distinct catch sets | **${r.distinctMeasurements}** |`,
    `| independent axes (antichain width) | **${r.independentAxes}** |`,
    `| redundancy (discriminating instances per distinct catch set) | ${r.redundancy.toFixed(2)}× |`,
    "",
    `${discriminating} of ${r.instanceCount} instances separate at least one subject. Between them they produce ${r.distinctMeasurements} distinct catch sets, of which ${r.independentAxes} cannot be explained as one defect observed at different sensitivities.`,
    "",
  ];
}

function caveat(r: AxisReport): readonly string[] {
  if (r.provenance.caveat === null) {
    return [
      "## Provenance",
      "",
      "The matrix asserts that subjects were selected independently of instances (`caveat: null`).",
      "",
    ];
  }
  return ["## Provenance — read before quoting any number above", "", `> ${r.provenance.caveat}`, ""];
}

function curve(r: AxisReport): readonly string[] {
  const lines = [
    "## The curve: what survives a stronger bank",
    "",
    "Apparent diversity is a property of the suite *paired with its bank*. Each row removes the",
    "most-caught remaining subject and recounts. A count that collapses on the left is a suite whose",
    "measured richness depends on weak subjects being present.",
    "",
    "Read the **independent axes** column, not the catch-set column. Distinct catch sets is the",
    "statistic this report argues is inflated, and the two decay at different rates.",
    "",
    "| weakest dropped | subjects left | distinct catch sets | **independent axes** | instances separating nothing |",
    "|---:|---:|---:|---:|---:|",
  ];
  for (const p of r.curve) {
    lines.push(
      `| ${p.droppedWeakest} | ${p.remainingSubjects.length} | ${p.distinctMeasurements} | **${p.independentAxes}** | ${p.blindInstances} / ${r.instanceCount} |`,
    );
  }
  lines.push("");
  return lines;
}

function clusters(r: AxisReport): readonly string[] {
  const lines = [
    "## Clusters — instances sharing one identical catch set",
    "",
    "| catch set | size | instances |",
    "|---|---:|---|",
  ];
  const shownClusters = r.clusters.slice(0, MAX_ROWS);
  for (const c of shownClusters) {
    const ids =
      c.instanceIds.length <= MAX_SET_MEMBERS
        ? c.instanceIds.join(", ")
        : `${c.instanceIds.slice(0, MAX_SET_MEMBERS).join(", ")}, … +${c.instanceIds.length - MAX_SET_MEMBERS} more`;
    lines.push(`| \`${set(c.caught)}\` | ${c.instanceIds.length} | ${ids} |`);
  }
  lines.push(...elided(shownClusters.length, r.clusters.length, "distinct catch sets"));
  if (r.blindInstances.length > 0) {
    lines.push(
      "",
      `**Separating nothing (${r.blindInstances.length}):** ${
        r.blindInstances.length <= MAX_ROWS
          ? r.blindInstances.join(", ")
          : `${r.blindInstances.slice(0, MAX_ROWS).join(", ")}, … +${r.blindInstances.length - MAX_ROWS} more`
      }`,
      "",
      "An empty catch set is a statement about the bank as much as about the instance. These may be",
      "redundant, or they may be correctness anchors doing their job by confirming that everything",
      "which should pass does. This tool cannot tell those apart.",
    );
  }
  lines.push("");
  return lines;
}

function chains(r: AxisReport): readonly string[] {
  if (r.chains.length === 0) return [];
  const lines = [
    "## Chain decomposition",
    "",
    "A minimum cover of the distinct catch sets by nested chains. Each chain is consistent with one",
    "underlying defect observed at increasing sensitivity, so the number of chains — not the number",
    "of catch sets — is the count of things the suite demonstrably measures separately.",
    "",
    "The cover is a minimum one but not a unique one: the width is canonical, which instance lands in",
    "which chain is not. Where catch sets are too wide to print, chains are shown as the sizes of",
    "their nested sets; full membership is in the `json` output.",
    "",
  ];
  const shownChains = [...r.chains].sort((a, b) => b.length - a.length).slice(0, 10);
  shownChains.forEach((chain, i) => {
    // Large banks make membership lists useless: a chain of 130-member catch sets says nothing a
    // reader can hold. Cardinalities carry the actual claim -- one defect seen at rising
    // sensitivity -- so switch to sizes once any set in the chain is too wide to print.
    const wide = chain.some((s) => s.length > MAX_SET_MEMBERS);
    const parts = wide ? chain.map((s) => `${s.length}`) : chain.map((s) => `\`${set(s)}\``);
    const shown = parts.length <= 6 ? parts : [...parts.slice(0, 6), `… (+${parts.length - 6})`];
    lines.push(`${i + 1}. ${shown.join(" ⊂ ")}${wide ? " subjects" : ""}`);
  });
  lines.push(...elided(shownChains.length, r.chains.length, "chains (longest first)"));
  lines.push("");
  return lines;
}

function subjects(r: AxisReport): readonly string[] {
  const lines = [
    "## Subjects",
    "",
    "`always-caught` subjects separate no pair of instances and are dead weight in the bank.",
    "`never-caught` subjects are invisible to the suite: it cannot distinguish them from correct.",
    "",
    "| subject | caught by | measured on | role |",
    "|---|---:|---:|---|",
  ];
  const shownSubjects = r.subjectStats.slice(0, MAX_ROWS);
  for (const s of shownSubjects) {
    lines.push(`| ${s.subjectId} | ${s.caughtBy} | ${s.measuredOn} | ${s.role} |`);
  }
  lines.push(...elided(shownSubjects.length, r.subjectStats.length, "subjects (most-caught first)"));
  lines.push("");
  return lines;
}

/**
 * How many of your checks have ever fired.
 *
 * A one-line diagnostic almost no suite owner has run, and the most legible form of the argument
 * this whole tool makes. The best suite in this project has eleven checks and 267 check executions;
 * against the six frontier agents that failed it, TWO checks ever fired. It was not measuring eleven
 * things and finding two problems. It was measuring two things, nine times over, and the check count
 * was never evidence of breadth.
 *
 * A silent check is not automatically dead weight, and this section does not say it is. Hygiene
 * checks — determinism, duplicate effects, mechanism-fired — are SUPPOSED to stay silent on a valid
 * scenario, and a suite whose safety rails all fire has a broken harness, not a good suite. So the
 * silent ones are named and the reader judges.
 */
function checks(r: AxisReport): readonly string[] {
  if (r.checkStats.length === 0 && r.checksNeverFired === null) return [];
  const declared = r.provenance.checks_declared;
  const lines = [
    "## Checks",
    "",
  ];
  if (declared === null) {
    lines.push(
      `${r.checkStats.length} distinct check(s) fired in this bank. The suite does not declare its`,
      "check universe (`provenance.checks_declared`), so the firing RATE is unknown — not zero, and",
      "not 100%. Declare the universe and this becomes the cheapest coverage diagnostic you own.",
    );
  } else {
    const fired = declared.length - (r.checksNeverFired?.length ?? 0);
    lines.push(
      `**${fired} of ${declared.length} declared checks have ever fired** against any subject in this`,
      `bank (${pct(fired, declared.length)}). A check that has never fired is not evidence of coverage;`,
      "it may be a check that cannot fail, or a hygiene rail that is supposed to stay quiet.",
    );
    if ((r.checksNeverFired?.length ?? 0) > 0) {
      lines.push("", `Never fired: ${(r.checksNeverFired ?? []).map((c) => `\`${c}\``).join(", ")}`);
    }
  }
  lines.push("", "| check | cells | instances | subjects |", "|---|---:|---:|---:|");
  const shown = r.checkStats.slice(0, MAX_ROWS);
  for (const c of shown) {
    lines.push(`| ${c.check} | ${c.firedOnCells} | ${c.firedOnInstances} | ${c.firedOnSubjects} |`);
  }
  lines.push(...elided(shown.length, r.checkStats.length, "checks (busiest first)"));
  lines.push(
    "",
    "`subjects` is the column that matters. A check firing on every subject separates nothing; a",
    "check firing on one separates exactly that subject.",
    "",
  );
  return lines;
}

function calibration(r: AxisReport): readonly string[] {
  const nb = r.nullBaseline;
  if (nb === undefined) return [];
  const pct = nb.ceiling === 0 ? 0 : (100 * r.independentAxes) / nb.ceiling;
  return [
    "## Calibration — is the axis count distinguishable from noise?",
    "",
    "Exact subset nesting is unforgiving: on a large bank of single-run results, one stray",
    "disagreement between two otherwise-identical instances splits one axis into two. So a big noisy",
    "corpus could report a high axis count for no reason but its size. The test below destroys the",
    "structure and keeps the noise — each subject keeps its own pass count and its own unmeasured",
    "cells, but which instances it passes is redrawn at random.",
    "",
    "| | axes |",
    "|---|---:|",
    `| **measured** | **${r.independentAxes}** |`,
    `| null model, mean of ${nb.trials} trial(s) (seed ${nb.seed}) | ${nb.meanWidth.toFixed(1)} |`,
    `| ceiling (one axis per discriminating instance) | ${nb.ceiling} |`,
    "",
    nb.meanWidth - r.independentAxes > (nb.ceiling - r.independentAxes) / 2
      ? `The measured width is **${pct.toFixed(0)}% of the ceiling** while randomised data with identical subject marginals scores ${nb.meanWidth.toFixed(1)}. The compression is structural: instances genuinely fail together, and the axis count is not an artifact of bank size.`
      : "The measured width sits close to the null. On this corpus the axis count is largely explained " +
        "by bank size and run-to-run noise rather than by shared structure, and should not be read as " +
        "a count of distinct capabilities.",
    "",
    `Null trials: ${nb.widths.join(", ")}.`,
    "",
  ];
}

function coverage(r: AxisReport): readonly string[] {
  const total = r.measuredCells + r.unmeasuredCells;
  return [
    "## Coverage",
    "",
    `${r.measuredCells} of ${total} cells measured (${pct(r.measuredCells, total)}); ${r.unmeasuredCells} recorded as not measured. Unmeasured cells are excluded from catch sets rather than imputed as passes.`,
    "",
  ];
}

/** Render a full markdown report. Deterministic: same input, byte-identical output. */
export function renderReport(r: AxisReport): string {
  return [
    ...headline(r),
    ...caveat(r),
    ...curve(r),
    ...clusters(r),
    ...chains(r),
    ...calibration(r),
    ...subjects(r),
    ...checks(r),
    ...coverage(r),
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, no randomness, diffable.",
    "",
  ].join("\n");
}
