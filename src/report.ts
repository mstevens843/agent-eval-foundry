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

const set = (ids: readonly string[]): string => (ids.length === 0 ? "{}" : `{${ids.join(", ")}}`);

const pct = (n: number, d: number): string => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(0)}%`);

function headline(r: AxisReport): readonly string[] {
  const discriminating = r.instanceCount - r.blindInstances.length;
  const checksRow =
    r.provenance.checks_total === null ? [] : [`| checks in the suite | **${r.provenance.checks_total}** |`];
  return [
    `# Axis report: ${r.suite}`,
    "",
    "## Headline",
    "",
    "| | |",
    "|---|---|",
    `| graded instances | **${r.instanceCount}** |`,
    ...checksRow,
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
  for (const c of r.clusters) {
    lines.push(`| \`${set(c.caught)}\` | ${c.instanceIds.length} | ${c.instanceIds.join(", ")} |`);
  }
  if (r.blindInstances.length > 0) {
    lines.push(
      "",
      `**Separating nothing (${r.blindInstances.length}):** ${r.blindInstances.join(", ")}`,
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
  ];
  r.chains.forEach((chain, i) => {
    lines.push(`${i + 1}. ${chain.join("  ⊂  ")}`);
  });
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
  for (const s of r.subjectStats) {
    lines.push(`| ${s.subjectId} | ${s.caughtBy} | ${s.measuredOn} | ${s.role} |`);
  }
  lines.push("");
  return lines;
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
    ...subjects(r),
    ...coverage(r),
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, no randomness, diffable.",
    "",
  ].join("\n");
}
