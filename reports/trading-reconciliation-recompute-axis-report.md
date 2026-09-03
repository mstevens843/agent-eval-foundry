# Axis report: trading-reconciliation-recompute

## Headline

| | |
|---|---|
| graded instances | **24** |
| checks in the suite | **24** |
| checks that have ever fired | **4** of 5 (80%) |
| subjects in the bank | 4 |
| instances that separate nothing in this bank | **0** (0%) |
| distinct catch sets | **2** |
| independent axes (antichain width) | **1** |
| redundancy (discriminating instances per distinct catch set) | 12.00× |

24 of 24 instances separate at least one subject. Between them they produce 2 distinct catch sets, of which 1 cannot be explained as one defect observed at different sensitivities.

## Provenance — read before quoting any number above

> This is local transfer and mutant-discrimination evidence over a synthetic venue. No paid agent trial or production exchange is represented.

## The curve: what survives a stronger bank

Apparent diversity is a property of the suite *paired with its bank*. Each row removes the
most-caught remaining subject and recounts. A count that collapses on the left is a suite whose
measured richness depends on weak subjects being present.

Read the **independent axes** column, not the catch-set column. Distinct catch sets is the
statistic this report argues is inflated, and the two decay at different rates.

| weakest dropped | subjects left | distinct catch sets | **independent axes** | instances separating nothing |
|---:|---:|---:|---:|---:|
| 0 | 4 | 2 | **1** | 0 / 24 |
| 1 | 3 | 1 | **1** | 6 / 24 |
| 2 | 2 | 1 | **1** | 6 / 24 |
| 3 | 1 | 1 | **1** | 6 / 24 |

## Clusters — instances sharing one identical catch set

| catch set | size | instances |
|---|---:|---|
| `{forged-stable-report, no-op, recompute-current-authority, recompute-from-attempt-counter}` | 18 | order-recovery-11-r2-o4-after_venue_accept, order-recovery-11-r2-o6-after_venue_accept, order-recovery-11-r2-o12-after_venue_accept, order-recovery-11-r3-o4-after_venue_accept, order-recovery-11-r3-o6-after_venue_accept, order-recovery-11-r3-o12-after_venue_accept, order-recovery-11-r4-o4-after_venue_accept, order-recovery-11-r4-o6-after_venue_accept, order-recovery-11-r4-o12-after_venue_accept, order-recovery-23-r2-o4-after_venue_accept, order-recovery-23-r2-o6-after_venue_accept, order-recovery-23-r2-o12-after_venue_accept, … +6 more |
| `{no-op}` | 6 | order-recovery-41-r1-o4-after_venue_accept, order-recovery-41-r1-o6-after_venue_accept, order-recovery-41-r1-o12-after_venue_accept, order-recovery-41-r2-o4-none, order-recovery-41-r3-o6-none, order-recovery-41-r4-o12-none |

## Chain decomposition

A minimum cover of the distinct catch sets by nested chains. Each chain is consistent with one
underlying defect observed at increasing sensitivity, so the number of chains — not the number
of catch sets — is the count of things the suite demonstrably measures separately.

The cover is a minimum one but not a unique one: the width is canonical, which instance lands in
which chain is not. Where catch sets are too wide to print, chains are shown as the sizes of
their nested sets; full membership is in the `json` output.

1. `{no-op}` ⊂ `{forged-stable-report, no-op, recompute-current-authority, recompute-from-attempt-counter}`

## Calibration — is the axis count distinguishable from noise?

Exact subset nesting is unforgiving: on a large bank of single-run results, one stray
disagreement between two otherwise-identical instances splits one axis into two. So a big noisy
corpus could report a high axis count for no reason but its size. The test below destroys the
structure and keeps the noise — each subject keeps its own pass count and its own unmeasured
cells, but which instances it passes is redrawn at random.

| | axes |
|---|---:|
| **measured** | **1** |
| null model, mean of 3 trial(s) (seed 20260828) | 3.0 |
| ceiling (one axis per discriminating instance) | 24 |

The measured width sits close to the null. On this corpus the axis count is largely explained by bank size and run-to-run noise rather than by shared structure, and should not be read as a count of distinct capabilities.

Null trials: 3, 3, 3.

## Subjects

`always-caught` subjects separate no pair of instances and are dead weight in the bank.
`never-caught` subjects are invisible to the suite: it cannot distinguish them from correct.

| subject | caught by | measured on | role |
|---|---:|---:|---|
| no-op | 24 | 24 | always-caught |
| forged-stable-report | 18 | 24 | discriminating |
| recompute-current-authority | 18 | 24 | discriminating |
| recompute-from-attempt-counter | 18 | 24 | discriminating |

## Checks

**4 of 5 declared checks have ever fired** against any subject in this
bank (80%). A check that has never fired is not evidence of coverage;
it may be a check that cannot fail, or a hygiene rail that is supposed to stay quiet.

Never fired: `local_confirmation_green`

| check | cells | instances | subjects |
|---|---:|---:|---:|
| exactly_once | 78 | 24 | 4 |
| committed_order_key_recovered | 54 | 18 | 3 |
| report_matches_venue_ledger | 42 | 24 | 2 |
| liveness | 24 | 24 | 1 |

`subjects` is the column that matters. A check firing on every subject separates nothing; a
check firing on one separates exactly that subject.

## Coverage

96 of 96 cells measured (100%); 0 recorded as not measured. Unmeasured cells are excluded from catch sets rather than imputed as passes.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, no randomness, diffable.
