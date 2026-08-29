// The descendant UI family: what changed, what it measures, and what it still is not.
//
// This family exists because of one measurement on its parent. `ui-action-record-replay` has five
// counted trials across four subjects and two labs whose failure sets are TOTALLY ORDERED —
// 33 ⊂ 46 ⊂ 62 ⊂ 90 of 324 — so it measures one thing at four sensitivities and no additional
// subject can change that. The cause was structural rather than unlucky: every scenario in the
// parent rewards the same disposition, so a stricter replayer dominates a looser one everywhere.
//
// A descendant rather than an edit, for the reason the whole evidence layer exists: changing the
// parent would change its challenge package, change its hash, and stop all five of its counted
// trials from counting. The measurement that motivated the upgrade would be its first casualty.

import type { Matrix } from "../types.js";

export interface LiveDomInput {
  readonly familyId: string;
  readonly parentId: string;
  readonly declaredPoints: number;
  readonly measuredScenarios: number;
  readonly subjects: number;
  readonly mutants: number;
  readonly checks: readonly string[];
  readonly referenceFailures: number;
  readonly axes: number;
  readonly distinctCatchSets: number;
  readonly blindInstances: number;
  readonly matrix: Matrix;
  /** The two opposed strategies and how their catch sets relate. */
  readonly poles: {
    readonly strictId: string;
    readonly patientId: string;
    readonly strictFails: number;
    readonly patientFails: number;
    readonly shared: number;
    readonly relation: string;
    readonly onlyStrict: number;
    readonly onlyPatient: number;
  };
  readonly realism: string;
  readonly parentRealism: string;
  /** What the harness now does that the parent's did not. */
  readonly gains: readonly { readonly mechanic: string; readonly parent: string; readonly here: string }[];
}

export function renderLiveDom(input: LiveDomInput): string {
  const p = input.poles;
  const incomparable = p.relation === "incomparable";

  return [
    `# ${input.familyId}`,
    "",
    `The descendant of \`${input.parentId}\`, built to fix one measured defect in it.`,
    "",
    "## Why it exists",
    "",
    `\`${input.parentId}\` has five counted trials across four subjects and two labs. They fail 33, 46,`,
    "62, 62 and 90 of 324 scenarios — five different numbers that read as breadth — and **every pair",
    "nests**, with two Anthropic models failing the identical 62. A totally ordered family of sets has",
    "antichain width 1: one defect observed at four sensitivities.",
    "",
    "That was not bad luck. Every scenario in the parent rewards the same disposition — bail out when a",
    "target does not resolve — so a stricter replayer dominates a looser one on every point, and its",
    "failures are a subset of the looser one's *by construction*. **A family with no trade-off in it",
    "cannot produce incomparable catch sets.**",
    "",
    "So the descendant's design requirement was not 'more realistic'. It was: contain a genuine",
    "trade-off, such that the strategy winning the parent's scenarios LOSES on some of these.",
    "",
    "## Did that work?",
    "",
    "Two opposed implementations are graded alongside the mutant bank so the trade-off is measured",
    "rather than asserted:",
    "",
    "| | |",
    "|---|---:|",
    `| \`${p.strictId}\` fails | ${p.strictFails} |`,
    `| \`${p.patientId}\` fails | ${p.patientFails} |`,
    `| shared | ${p.shared} |`,
    `| only \`${p.strictId}\` | ${p.onlyStrict} |`,
    `| only \`${p.patientId}\` | ${p.onlyPatient} |`,
    `| **relation** | **${p.relation.toUpperCase()}** |`,
    "",
    incomparable
      ? [
          "**Incomparable.** Neither set contains the other, so neither strategy can be described as a",
          "more-sensitive version of the other. That is the only structure that raises an antichain",
          "width above 1, and it is exactly what the parent could not express — a scenario class where",
          "bailing out early is *wrong* sitting beside the class where it is right.",
        ].join("\n")
      : [
          `**${p.relation}, not incomparable.** The two opposed strategies still nest, which means this`,
          "family has reproduced its parent's defect in a larger harness. The extra realism has not",
          "bought a second axis, and saying so is more useful than the realism.",
        ].join("\n"),
    "",
    "## What it measures",
    "",
    "| | |",
    "|---|---:|",
    `| declared space | ${input.declaredPoints} points |`,
    `| measured scenarios | ${input.measuredScenarios} |`,
    `| subjects in the bank | ${input.subjects} (${input.mutants} mutants + reference + 2 poles) |`,
    `| checks | ${input.checks.length} |`,
    `| reference failures | ${input.referenceFailures} |`,
    `| distinct catch sets | ${input.distinctCatchSets} |`,
    `| **independent axes** | **${input.axes}** |`,
    `| instances separating nothing | ${input.blindInstances} |`,
    "",
    `The axis count is over a MUTANT bank: it says the verifier can distinguish ${input.axes} kinds of`,
    "wrong, and it is bounded by how many kinds were written. It says nothing about whether the family",
    "is hard, because nothing that could plausibly fail it has attempted it yet. That distinction is a",
    "gate in this repository, not a footnote.",
    "",
    "## The realism upgrade, mechanic by mechanic",
    "",
    `Parent: \`${input.parentRealism}\`. This family: \`${input.realism}\`.`,
    "",
    "| mechanic | parent | here |",
    "|---|---|---|",
    ...input.gains.map((g) => `| ${g.mechanic} | ${g.parent} | ${g.here} |`),
    "",
    "The parent was relabelled DOWN to `simulated-tree` as part of this work. It had carried",
    "`dom-like` while being an immutable seven-node tree with one mutable boolean, resolved by",
    "`data-testid` only — nothing could drift, and nothing an action did changed what a later action",
    "saw. Those are precisely the mechanics the label names. Relabelling is safe because the realism",
    "level is a property of the family record and is kept out of the challenge package: an honesty",
    "correction can never change a hash and invalidate the evidence that motivated it.",
    "",
    "## What this family is NOT",
    "",
    "| | |",
    "|---|---|",
    "| browser-backed | **no.** No renderer, no layout, no compositing, no real CSS matching |",
    "| trialed | **no counted agent trial exists.** Everything above is mutant-bank evidence |",
    "| shippable | **no.** It has no challenge package, so it is not trial-ready and the gate says so |",
    "",
    "**Why there is no challenge package yet, stated rather than left as an omission.** The package's",
    "`SPEC.md` is the fairness contract: it has to publish every rule an implementation is graded",
    "against, in full, with no hidden clause. This family's contract is materially harder to write",
    "than its parent's — a settle budget, an anchor-conflict resolution order, and what counts as",
    "'observed' for a region that is loading all have to be stated precisely enough that a model can",
    "derive the answer and imprecisely nowhere. `unfair_hidden_rule` and `ambiguous_truth_source` are",
    "two of the fifteen kill reasons in this repository's taxonomy, and the parent family has already",
    "cost three counted trials to one ambiguity that a real model exposed. Writing that spec quickly",
    "is how it happens again.",
    "",
    "So the next step is a spec, then a package, then a leak check, then a campaign — in that order,",
    "and the family is honestly marked not-trial-ready until then.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
