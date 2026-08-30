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

## Did the categorical anchor fix work?

Three address-loyal implementations are graded alongside the mutant bank. Each is right on the
scenario class where its preferred address still names the recorded object, and wrong on the
classes where another address carries the visible entity/effect/precondition facts.

| pair | relation | private witness for first | private witness for second |
|---|---|---|---|
| `testid-loyalist` / `semantic-loyalist` | **incomparable** | `live-disabled_then_enabled-arming-b2-duplicated-none-honest-r1-s11` | `live-disabled_then_enabled-arming-b2-duplicated-none-misleading-r1-s41` |
| `testid-loyalist` / `path-loyalist` | **incomparable** | `live-disabled_then_enabled-arming-b2-duplicated-path_wins-honest-r1-s11` | `live-disabled_then_enabled-arming-b2-duplicated-testid_wins-honest-r2-s11` |
| `semantic-loyalist` / `path-loyalist` | **incomparable** | `live-disabled_then_enabled-arming-b2-duplicated-none-misleading-r1-s41` | `live-disabled_then_enabled-arming-b2-duplicated-none-honest-r1-s11` |

**Measured categorical axis: pass.** Every pair has a private witness in each direction, so
the address strategies do not reduce to a stricter/looser chain. This is the design-review
fix: testid-loyal, semantic-loyal and path-loyal replay are incomparable under the measured
scenario set.

## What it measures

| | |
|---|---:|
| declared space | 3456 points |
| measured scenarios | 864 |
| subjects in the bank | 24 (22 mutants + 2 poles; reference checked separately) |
| checks | 17 |
| reference failures | 0 |
| distinct catch sets | 56 |
| **independent axes** | **19** |
| instances separating nothing | 0 |
| challenge package | 9 files, hash `18c3f5afc5973604205cd7df23ce4cad` |
| counted real-agent trials | 1 |
| live-DOM status | **SHIP** |

The axis count is over a MUTANT bank: it says the verifier can distinguish 19 kinds of
wrong, and it is bounded by how many kinds were written.
Because at least one real agent trial now counts, difficulty evidence is present. The report still keeps mutant-detection axes and real-agent difficulty separate.

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
| challenge package | **yes.** 9 leak-checked visible files, hash `18c3f5afc5973604205cd7df23ce4cad` |
| trialed | **yes.** 1 counted real-agent trial(s) |
| shippable | **yes**. SHIP requires counted agent evidence, not only mutant-detection evidence |

The package exists now, and its hash is the stale-evidence guard. Any spec or visible-example
edit changes that hash and invalidates trials run against the older package.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
