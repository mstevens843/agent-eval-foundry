// The calibration table, and the p^N collapse -- FINDINGS.md section 6.
//
// WHY A TABLE AND NOT A MODEL. The source project's note on its own estimates is the whole
// justification: "Every difficulty estimate on this project -- mine, and a judge that correctly
// scored an already-solved design at 0.93 -- was optimistic, in one consistent direction." A judge
// that is wrong in a consistent direction is a bias, and the fix for a bias is not a better judge,
// it is a lookup table built from outcomes. This repository has a scoring model with fitted weights
// and it has never once predicted a kill. Six rows of measured p do better.
//
// THE QUANTITATIVE HALF. Reward is binary, so a task needing N independent discoveries each at
// probability p passes at p^N. Design 4 had N=1 at p~=1.0. Every subsequent candidate claimed 3-5
// independent discoveries and adversarial judging collapsed all of them to N=1 or 1.5, because
// DISCOVERIES THAT FOLLOW FROM A SINGLE REALISATION ARE ONE DISCOVERY.
//
// That is the same result this repository derived independently with its axis meter, which measures
// independent axes as an antichain width over catch sets and has never returned more than 2 for any
// family. Two methods, two projects, one number. Where they disagree the disagreement is reported
// rather than averaged, because a claimed axis that the antichain merges and the p^N rule keeps is
// a fact about the measurement, not a fact about the task.

import { CALIBRATION_TABLE, type CalibrationRow, type DiscoveryShape } from "./types.js";

export const rowFor = (shape: DiscoveryShape): CalibrationRow => {
  const row = CALIBRATION_TABLE.find((r) => r.shape === shape);
  if (row === undefined) throw new Error(`no calibration row for ${shape}`);
  return row;
};

/**
 * Pass-rate band for a task requiring `n` independent discoveries of one shape.
 *
 * `n` should come from a MEASURED axis count, not a claimed one. Passing the claimed count here
 * reproduces exactly the optimism the table exists to correct.
 */
export const passRateBand = (shape: DiscoveryShape, n: number): { low: number; high: number } => {
  const row = rowFor(shape);
  return { low: row.pLow ** n, high: row.pHigh ** n };
};

/** The fields a candidate declares that this classifier is allowed to read. */
export interface ClassifiableCandidate {
  readonly id: string;
  readonly whyAgentsMightFail?: string;
  readonly taskFamilyHypothesis?: string;
  readonly visibleRulesSketch?: readonly string[];
  readonly hiddenRegionSketch?: readonly string[] | string;
  readonly riskNotes?: readonly string[] | string;
  readonly failureMechanisms?: readonly string[];
  readonly authoritativeTruthSource?: { readonly whyIndependent?: string };
}

export interface Classification {
  readonly candidateId: string;
  readonly shape: DiscoveryShape;
  readonly worthBuilding: boolean;
  readonly pLow: number;
  readonly pHigh: number;
  /** The declared text that drove the call, so a reader can overrule it with the evidence in hand. */
  readonly evidence: readonly string[];
}

const textOf = (c: ClassifiableCandidate): string =>
  [
    c.whyAgentsMightFail ?? "",
    c.taskFamilyHypothesis ?? "",
    ...(c.visibleRulesSketch ?? []),
    ...(Array.isArray(c.hiddenRegionSketch) ? c.hiddenRegionSketch : [c.hiddenRegionSketch ?? ""]),
    ...(Array.isArray(c.riskNotes) ? c.riskNotes : [c.riskNotes ?? ""]),
    ...(c.failureMechanisms ?? []),
    c.authoritativeTruthSource?.whyIndependent ?? "",
  ]
    .join(" \n ")
    .toLowerCase();

/**
 * Markers for each row, in the language candidates in this repository actually use.
 *
 * These are ordered most-specific-first and the first match wins, because the interesting rows are
 * the rare ones: a candidate that mentions both a settlement ledger and a confirmed-green self-check
 * should be classified by the self-check, which is the thing that makes it hard, not the ledger,
 * which is the thing that makes it describable.
 */
const MARKERS: readonly (readonly [DiscoveryShape, readonly string[]])[] = [
  [
    "choose-against-confirmed-green",
    [
      "self-check",
      "own tests pass",
      "locally green",
      "confirmed green",
      "looks complete",
      "looks correct",
      "appears consistent",
      "own verifier",
      "plausible attempt",
      "believes it has",
    ],
  ],
  [
    "abstraction-model-cannot-justify",
    ["cannot justify", "must justify", "abstraction", "principled reason", "no local evidence"],
  ],
  [
    "memorised-public-implementation",
    ["well-known", "standard algorithm", "public implementation", "textbook", "canonical library"],
  ],
  [
    "standard-tool-residual",
    ["residual", "diff", "profiler", "linter", "standard tool", "run the tool", "grep"],
  ],
  [
    "consequence-of-stated-rule",
    ["stated in the", "spec says", "the rule states", "follows from the rule", "declared rule"],
  ],
];

/**
 * Deterministic classification into the calibration table.
 *
 * THIS IS A SCREEN, NOT A JUDGE. It reads only what the candidate declared about itself, so a
 * candidate that undersells its own mechanism will be misclassified, and the evidence strings exist
 * so a reader can see exactly which sentence drove the call. The default is the top row and that is
 * the conservative default: "uses an evidence channel present in the container" is p >= 0.85, so
 * defaulting there says "assume this is easy until the text shows otherwise", which is the direction
 * every estimate on both projects has historically been wrong in.
 */
export const classify = (c: ClassifiableCandidate): Classification => {
  const text = textOf(c);
  for (const [shape, markers] of MARKERS) {
    const hits = markers.filter((m) => text.includes(m));
    if (hits.length > 0) {
      const row = rowFor(shape);
      return {
        candidateId: c.id,
        shape,
        worthBuilding: row.worthBuilding,
        pLow: row.pLow,
        pHigh: row.pHigh,
        evidence: hits.map((h) => `declared text contains "${h}"`),
      };
    }
  }
  const row = rowFor("evidence-channel-present");
  return {
    candidateId: c.id,
    shape: "evidence-channel-present",
    worthBuilding: row.worthBuilding,
    pLow: row.pLow,
    pHigh: row.pHigh,
    evidence: ["no marker for a harder row: defaulted to the easiest row, which is the safe default"],
  };
};

export interface PoolSummary {
  readonly total: number;
  readonly byShape: Readonly<Record<string, number>>;
  readonly worthBuilding: number;
  readonly worthBuildingIds: readonly string[];
}

export const summarisePool = (classifications: readonly Classification[]): PoolSummary => {
  const byShape: Record<string, number> = {};
  for (const c of classifications) byShape[c.shape] = (byShape[c.shape] ?? 0) + 1;
  const worth = classifications.filter((c) => c.worthBuilding);
  return {
    total: classifications.length,
    byShape,
    worthBuilding: worth.length,
    worthBuildingIds: worth.map((c) => c.candidateId).sort(),
  };
};
