# ui-replay-live-dom

The descendant of `ui-action-record-replay`, built to fix one measured defect in it.

## Why it exists

`ui-action-record-replay` has five counted trials across four subjects and two labs. They fail 33, 46,
62, 62 and 90 of 324 scenarios — five different numbers that read as breadth — and **every pair
nests**, with two Anthropic models failing the identical 62. A totally ordered family of sets has
antichain width 1: one defect observed at four sensitivities.

That was not bad luck. Every scenario in the parent rewards the same disposition — bail out when a
target does not resolve — so a stricter replayer dominates a looser one on every point, and its
failures are a subset of the looser one's *by construction*. **A family with no trade-off in it
cannot produce incomparable catch sets.**

So the descendant's design requirement was not 'more realistic'. It was: contain a genuine
trade-off, such that the strategy winning the parent's scenarios LOSES on some of these.

## Did that work?

Two opposed implementations are graded alongside the mutant bank so the trade-off is measured
rather than asserted:

| | |
|---|---:|
| `strict-bailer` fails | 148 |
| `patient-waiter` fails | 46 |
| shared | 18 |
| only `strict-bailer` | 130 |
| only `patient-waiter` | 28 |
| **relation** | **INCOMPARABLE** |

**Incomparable.** Neither set contains the other, so neither strategy can be described as a
more-sensitive version of the other. That is the only structure that raises an antichain
width above 1, and it is exactly what the parent could not express — a scenario class where
bailing out early is *wrong* sitting beside the class where it is right.

## What it measures

| | |
|---|---:|
| declared space | 864 points |
| measured scenarios | 432 |
| subjects in the bank | 22 (20 mutants + reference + 2 poles) |
| checks | 16 |
| reference failures | 0 |
| distinct catch sets | 34 |
| **independent axes** | **10** |
| instances separating nothing | 0 |

The axis count is over a MUTANT bank: it says the verifier can distinguish 10 kinds of
wrong, and it is bounded by how many kinds were written. It says nothing about whether the family
is hard, because nothing that could plausibly fail it has attempted it yet. That distinction is a
gate in this repository, not a footnote.

## The realism upgrade, mechanic by mechanic

Parent: `simulated-tree`. This family: `dom-like`.

| mechanic | parent | here |
|---|---|---|
| tree mutability | immutable; one mutable boolean for the confirmation dialog | acting changes the tree — regions mount late, get superseded, are removed, or are remounted under a new key |
| selector drift | `data-testid` only, and a mutation either renames it or does not | testids, semantic anchors and structural paths can disagree, and the scenario decides which survives |
| disabled / enabled | attributes are static | controls arm and disarm as a consequence of earlier steps, so a precondition can be satisfied later than it was recorded |
| asynchrony | `pending` is a string test on whether the selector contains 'async' | a settle budget with regions that resolve after a stated number of observations — the source of the strict-vs-patient trade-off |
| stale state | none; the tree a step sees is the tree every step sees | an earlier step's effect can invalidate a later step's recorded precondition mid-replay |
| honest vs misleading busy signals | none | `aria-busy` can lie, so 'wait until it settles' is not a free strategy |

The parent was relabelled DOWN to `simulated-tree` as part of this work. It had carried
`dom-like` while being an immutable seven-node tree with one mutable boolean, resolved by
`data-testid` only — nothing could drift, and nothing an action did changed what a later action
saw. Those are precisely the mechanics the label names. Relabelling is safe because the realism
level is a property of the family record and is kept out of the challenge package: an honesty
correction can never change a hash and invalidate the evidence that motivated it.

## What this family is NOT

| | |
|---|---|
| browser-backed | **no.** No renderer, no layout, no compositing, no real CSS matching |
| trialed | **no counted agent trial exists.** Everything above is mutant-bank evidence |
| shippable | **no.** It has no challenge package, so it is not trial-ready and the gate says so |

**Why there is no challenge package yet, stated rather than left as an omission.** The package's
`SPEC.md` is the fairness contract: it has to publish every rule an implementation is graded
against, in full, with no hidden clause. This family's contract is materially harder to write
than its parent's — a settle budget, an anchor-conflict resolution order, and what counts as
'observed' for a region that is loading all have to be stated precisely enough that a model can
derive the answer and imprecisely nowhere. `unfair_hidden_rule` and `ambiguous_truth_source` are
two of the fifteen kill reasons in this repository's taxonomy, and the parent family has already
cost three counted trials to one ambiguity that a real model exposed. Writing that spec quickly
is how it happens again.

So the next step is a spec, then a package, then a leak check, then a campaign — in that order,
and the family is honestly marked not-trial-ready until then.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
