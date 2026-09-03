// Screens 3 and 4 -- the leak audit and the identifiability check.
//
// THESE TWO ARE THE HORNS OF THE VISE, MADE MECHANICAL, and they fail in opposite directions. That
// is why they belong in one file: a repair that satisfies one moves the artifact toward failing the
// other, and reading them apart is how an author talks themselves into a task that has neither
// property.
//
//   Horn 1 (leak):            the visible data determines the label, so the agent recovers it.
//   Horn 2 (identifiability): the visible data does not determine the label, so nobody can.
//
// The source project measured both. Horn 1: a truncating shift appearing ~313,515 times in a
// 600,000-record corpus, recovered immediately by residual bucketing against exact labels. Horn 2:
// a skew breakpoint at 0.0000% in the shipped corpus and 86.56% in the graded region -- nothing
// shipped determines it, so grading on it is grading on the author's private convention.
//
// And the worst case, which is the one worth remembering: twenty-five worlds permuted within a
// symmetry of the shipped data hashed to ONE SHA-256 over all shipped columns -- byte-identical
// files carrying twenty-five different truths. Identifiability is not obvious and must be shown.

import { createHash } from "node:crypto";
import type { IdentifiabilityVerdict, LeakVerdict } from "./types.js";

/** One graded row: what a solver can see, and what the grader decided. */
export interface CorpusRow {
  readonly id: string;
  readonly visible: Readonly<Record<string, string | number | null>>;
  readonly label: string;
}

const log2 = (x: number): number => Math.log(x) / Math.LN2;

/** Shannon entropy of a label column, in bits. */
export const entropy = (labels: readonly string[]): number => {
  if (labels.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  let h = 0;
  for (const n of counts.values()) {
    const p = n / labels.length;
    h -= p * log2(p);
  }
  return h;
};

/** I(field; label) in bits: how much of the label one visible column gives away. */
export const mutualInformation = (values: readonly string[], labels: readonly string[]): number => {
  if (values.length !== labels.length || values.length === 0) return 0;
  const byValue = new Map<string, string[]>();
  for (let i = 0; i < values.length; i++) {
    const v = values[i] as string;
    const arr = byValue.get(v) ?? [];
    arr.push(labels[i] as string);
    byValue.set(v, arr);
  }
  let conditional = 0;
  for (const group of byValue.values()) {
    conditional += (group.length / labels.length) * entropy(group);
  }
  return Math.max(0, entropy(labels) - conditional);
};

/**
 * A depth-2 greedy decision tree, which is the cheap classifier the source project's five-minute
 * gradient-boosted stand-in is a heavier version of.
 *
 * Depth 2 is deliberate. The question is not "can a large model fit this", which is always yes
 * given enough capacity; it is "does the answer fall out of two questions any exploring agent
 * would ask in its first minute". A deeper tree would be a better classifier and a worse screen.
 */
export const cheapClassifierAccuracy = (rows: readonly CorpusRow[], fields: readonly string[]): number => {
  if (rows.length === 0) return 0;
  const majority = (rs: readonly CorpusRow[]): string => {
    const counts = new Map<string, number>();
    for (const r of rs) counts.set(r.label, (counts.get(r.label) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "";
  };
  const correctUnder = (rs: readonly CorpusRow[]): number => {
    const m = majority(rs);
    return rs.filter((r) => r.label === m).length;
  };

  let best = correctUnder(rows);
  for (const f1 of fields) {
    const split1 = new Map<string, CorpusRow[]>();
    for (const r of rows) {
      const k = String(r.visible[f1] ?? "");
      const arr = split1.get(k) ?? [];
      arr.push(r);
      split1.set(k, arr);
    }
    let depth1 = 0;
    let depth2 = 0;
    for (const group of split1.values()) {
      depth1 += correctUnder(group);
      let bestInner = correctUnder(group);
      for (const f2 of fields) {
        if (f2 === f1) continue;
        const split2 = new Map<string, CorpusRow[]>();
        for (const r of group) {
          const k = String(r.visible[f2] ?? "");
          const arr = split2.get(k) ?? [];
          arr.push(r);
          split2.set(k, arr);
        }
        let acc = 0;
        for (const g2 of split2.values()) acc += correctUnder(g2);
        if (acc > bestInner) bestInner = acc;
      }
      depth2 += bestInner;
    }
    best = Math.max(best, depth1, depth2);
  }
  return best / rows.length;
};

/**
 * Horn 1. Fails when a cheap model recovers the label from visible data alone, because then the
 * task is a lookup and the difficulty is imaginary.
 *
 * The threshold is stated relative to the majority baseline rather than in absolute accuracy. A
 * corpus with a 90%-common label gives a do-nothing classifier 90%, and reporting that as a leak
 * would fail every imbalanced family for free.
 */
export const leakAudit = (subjectId: string, rows: readonly CorpusRow[]): LeakVerdict => {
  const labels = rows.map((r) => r.label);
  const labelEntropy = entropy(labels);
  const fields = [...new Set(rows.flatMap((r) => Object.keys(r.visible)))].sort();

  let worstField: string | null = null;
  let maxMi = 0;
  for (const f of fields) {
    const mi = mutualInformation(
      rows.map((r) => String(r.visible[f] ?? "")),
      labels,
    );
    if (mi > maxMi) {
      maxMi = mi;
      worstField = f;
    }
  }

  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  const majorityBaseline = rows.length === 0 ? 0 : Math.max(...counts.values()) / rows.length;
  const accuracy = cheapClassifierAccuracy(rows, fields);

  const reasons: string[] = [];
  // A single visible column carrying 95% of the label's entropy is a labelled pointer, not a hint.
  if (labelEntropy > 0 && maxMi / labelEntropy >= 0.95) {
    reasons.push(
      `field "${worstField}" carries ${maxMi.toFixed(3)} of ${labelEntropy.toFixed(3)} bits (${((maxMi / labelEntropy) * 100).toFixed(1)}%): the label is a lookup`,
    );
  }
  // Beating the do-nothing baseline by half its remaining headroom, from two questions.
  const headroom = 1 - majorityBaseline;
  if (headroom > 0 && (accuracy - majorityBaseline) / headroom >= 0.5) {
    reasons.push(
      `a depth-2 tree over visible fields reaches ${(accuracy * 100).toFixed(1)}% against a ${(majorityBaseline * 100).toFixed(1)}% baseline: recoverable without the mechanism`,
    );
  }

  const passed = reasons.length === 0;
  if (passed) {
    reasons.push(
      `no visible field carries the label (max ${maxMi.toFixed(3)}/${labelEntropy.toFixed(3)} bits) and a depth-2 tree reaches ${(accuracy * 100).toFixed(1)}% against a ${(majorityBaseline * 100).toFixed(1)}% baseline`,
    );
  }

  return {
    subjectId,
    maxMutualInformationBits: maxMi,
    labelEntropyBits: labelEntropy,
    worstField,
    classifierAccuracy: accuracy,
    majorityBaseline,
    passed,
    reasons,
  };
};

/** Stable hash of everything a solver can see about one row. */
const visibleHash = (row: CorpusRow): string => {
  const keys = Object.keys(row.visible).sort();
  const canonical = keys.map((k) => `${k}=${String(row.visible[k] ?? "")}`).join(" ");
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
};

/**
 * Horn 2. Fails when two rows a solver cannot tell apart carry different labels.
 *
 * This is the twenty-five-worlds-one-hash test, and it is the formal version of the fairness claim:
 * if the shipped facts do not determine the label, no solver -- human or model -- can be graded on
 * it without being graded on the author's private convention.
 */
export const identifiabilityCheck = (
  subjectId: string,
  rows: readonly CorpusRow[],
): IdentifiabilityVerdict => {
  const byHash = new Map<string, CorpusRow[]>();
  for (const r of rows) {
    const h = visibleHash(r);
    const arr = byHash.get(h) ?? [];
    arr.push(r);
    byHash.set(h, arr);
  }

  const collisions = [...byHash.entries()]
    .filter(([, group]) => new Set(group.map((r) => r.label)).size > 1)
    .map(([h, group]) => ({
      visibleHash: h,
      instanceIds: group.map((r) => r.id).sort(),
      labels: [...new Set(group.map((r) => r.label))].sort(),
    }))
    .sort((a, b) => a.visibleHash.localeCompare(b.visibleHash));

  const reasons =
    collisions.length > 0
      ? collisions.map(
          (c) =>
            `${c.instanceIds.length} rows share visible content ${c.visibleHash} but carry ${c.labels.length} different labels (${c.labels.join(", ")}): the label is not determined by shipped facts`,
        )
      : [`all ${rows.length} rows with identical visible content carry identical labels`];

  return {
    subjectId,
    collisions,
    instancesChecked: rows.length,
    passed: collisions.length === 0,
    reasons,
  };
};
