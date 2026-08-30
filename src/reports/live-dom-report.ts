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
  readonly challengeFiles: number;
  readonly challengeHash: string;
  readonly countedAgentTrials: number;
  readonly status: "HOLD" | "trial-ready" | "difficulty-evidenced" | "SHIP";
  /** Pairwise address-loyal comparisons proving the categorical anchor axis. */
  readonly anchorPairs: readonly {
    readonly a: string;
    readonly b: string;
    readonly relation: string;
    readonly aOnly: string | null;
    readonly bOnly: string | null;
  }[];
  readonly realism: string;
  readonly parentRealism: string;
  /** What the harness now does that the parent's did not. */
  readonly gains: readonly { readonly mechanic: string; readonly parent: string; readonly here: string }[];
}

export function renderLiveDom(input: LiveDomInput): string {
  const categoricalProven =
    input.anchorPairs.length > 0 && input.anchorPairs.every((p) => p.relation === "incomparable");

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
    "## Did the categorical anchor fix work?",
    "",
    "Three address-loyal implementations are graded alongside the mutant bank. Each is right on the",
    "scenario class where its preferred address still names the recorded object, and wrong on the",
    "classes where another address carries the visible entity/effect/precondition facts.",
    "",
    "| pair | relation | private witness for first | private witness for second |",
    "|---|---|---|---|",
    ...input.anchorPairs.map(
      (p) =>
        `| \`${p.a}\` / \`${p.b}\` | **${p.relation}** | \`${p.aOnly ?? "none"}\` | \`${p.bOnly ?? "none"}\` |`,
    ),
    "",
    categoricalProven
      ? [
          "**Measured categorical axis: pass.** Every pair has a private witness in each direction, so",
          "the address strategies do not reduce to a stricter/looser chain. This is the design-review",
          "fix: testid-loyal, semantic-loyal and path-loyal replay are incomparable under the measured",
          "scenario set.",
        ].join("\n")
      : [
          "**Measured categorical axis: fail.** At least one address-loyal pair still nests. The",
          "family would be bigger than its parent without fixing the parent chain defect.",
        ].join("\n"),
    "",
    "## What it measures",
    "",
    "| | |",
    "|---|---:|",
    `| declared space | ${input.declaredPoints} points |`,
    `| measured scenarios | ${input.measuredScenarios} |`,
    `| subjects in the bank | ${input.subjects} (${input.mutants} mutants + 2 poles; reference checked separately) |`,
    `| checks | ${input.checks.length} |`,
    `| reference failures | ${input.referenceFailures} |`,
    `| distinct catch sets | ${input.distinctCatchSets} |`,
    `| **independent axes** | **${input.axes}** |`,
    `| instances separating nothing | ${input.blindInstances} |`,
    `| challenge package | ${input.challengeFiles} files, hash \`${input.challengeHash}\` |`,
    `| counted real-agent trials | ${input.countedAgentTrials} |`,
    `| live-DOM status | **${input.status}** |`,
    "",
    `The axis count is over a MUTANT bank: it says the verifier can distinguish ${input.axes} kinds of`,
    "wrong, and it is bounded by how many kinds were written.",
    input.countedAgentTrials > 0
      ? "Because at least one real agent trial now counts, difficulty evidence is present. The report still keeps mutant-detection axes and real-agent difficulty separate."
      : "It says nothing about whether the family is hard, because no counted real-agent trial has attempted it yet. That distinction is a gate in this repository, not a footnote.",
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
    `| challenge package | **yes.** ${input.challengeFiles} leak-checked visible files, hash \`${input.challengeHash}\` |`,
    `| trialed | ${input.countedAgentTrials > 0 ? `**yes.** ${input.countedAgentTrials} counted real-agent trial(s)` : "**not yet.** campaign prepared, no counted real-agent trial"} |`,
    `| shippable | **${input.status === "SHIP" ? "yes" : "no"}**. SHIP requires counted agent evidence, not only mutant-detection evidence |`,
    "",
    "The package exists now, and its hash is the stale-evidence guard. Any spec or visible-example",
    "edit changes that hash and invalidates trials run against the older package.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
