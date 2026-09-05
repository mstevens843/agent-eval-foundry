# Axis report: caa-revalidation

## Headline

| | |
|---|---|
| graded instances | **24** |
| checks in the suite | **24** |
| checks that have ever fired | **6** of 6 (100%) |
| subjects in the bank | 9 |
| instances that separate nothing in this bank | **0** (0%) |
| distinct catch sets | **10** |
| independent axes (antichain width) | **3** |
| redundancy (discriminating instances per distinct catch set) | 2.40× |

24 of 24 instances separate at least one subject. Between them they produce 10 distinct catch sets, of which 3 cannot be explained as one defect observed at different sensitivities.

## Provenance — read before quoting any number above

> A Phase 17 candidate package derived from the 2020 Let's Encrypt CAA rechecking incident. It carries measured local mutant discrimination and the agent-trial result recorded in reports/PHASE-17-CAA-VALIDATION.md. It is not a proven task family.

## The curve: what survives a stronger bank

Apparent diversity is a property of the suite *paired with its bank*. Each row removes the
most-caught remaining subject and recounts. A count that collapses on the left is a suite whose
measured richness depends on weak subjects being present.

Read the **independent axes** column, not the catch-set column. Distinct catch sets is the
statistic this report argues is inflated, and the two decay at different rates.

| weakest dropped | subjects left | distinct catch sets | **independent axes** | instances separating nothing |
|---:|---:|---:|---:|---:|
| 0 | 9 | 10 | **3** | 0 / 24 |
| 1 | 8 | 10 | **3** | 0 / 24 |
| 2 | 7 | 10 | **3** | 0 / 24 |
| 3 | 6 | 9 | **3** | 0 / 24 |
| 4 | 5 | 7 | **3** | 0 / 24 |
| 5 | 4 | 7 | **3** | 0 / 24 |
| 6 | 3 | 4 | **2** | 0 / 24 |
| 7 | 2 | 3 | **2** | 6 / 24 |
| 8 | 1 | 1 | **1** | 13 / 24 |

## Clusters — instances sharing one identical catch set

| catch set | size | instances |
|---|---:|---|
| `{always-issue, boundary-inclusive, boundary-lenient, cardinality-only-queries, fabricated-result, first-name-reuse, no-query, reversed-order}` | 7 | caa-s7-d5-mixed-middle, caa-s7-d5-mixed-last, caa-s31-d5-boundary-eight-last, caa-s19-d5-boundary-eight-last, caa-s7-d5-boundary-nine-first, caa-s7-d5-boundary-eight-first, caa-s31-d5-boundary-eight-first |
| `{always-refuse, boundary-inclusive, boundary-lenient, cardinality-only-queries, fabricated-result, first-name-reuse, no-query, reversed-order}` | 4 | caa-s31-d5-mixed-none, caa-s31-d5-boundary-nine-none, caa-s31-d5-boundary-eight-none, caa-s7-d5-boundary-nine-none |
| `{always-issue, boundary-lenient, cardinality-only-queries, fabricated-result, first-name-reuse, no-query, reversed-order}` | 3 | caa-s7-d3-all-stale-first, caa-s19-d3-all-stale-middle, caa-s31-d3-all-stale-last |
| `{always-refuse, boundary-lenient, cardinality-only-queries, fabricated-result, first-name-reuse, no-query, reversed-order}` | 3 | caa-s7-d5-all-stale-none, caa-s19-d5-all-stale-none, caa-s19-d3-all-stale-none |
| `{always-issue, cardinality-only-queries, fabricated-result, no-query, reversed-order}` | 2 | caa-s19-d2-mixed-middle, caa-s31-d2-mixed-middle |
| `{always-refuse, boundary-inclusive}` | 1 | caa-s7-d1-boundary-eight-none |
| `{always-refuse, boundary-lenient, fabricated-result, no-query}` | 1 | caa-s31-d1-boundary-nine-none |
| `{always-refuse, boundary-lenient, fabricated-result, no-query, reversed-order}` | 1 | caa-s31-d2-boundary-nine-none |
| `{always-issue, cardinality-only-queries, fabricated-result, first-name-reuse, no-query, reversed-order}` | 1 | caa-s7-d2-all-stale-first |
| `{always-refuse, boundary-inclusive, boundary-lenient, fabricated-result, no-query, reversed-order}` | 1 | caa-s7-d3-boundary-eight-none |

## Chain decomposition

A minimum cover of the distinct catch sets by nested chains. Each chain is consistent with one
underlying defect observed at increasing sensitivity, so the number of chains — not the number
of catch sets — is the count of things the suite demonstrably measures separately.

The cover is a minimum one but not a unique one: the width is canonical, which instance lands in
which chain is not. Where catch sets are too wide to print, chains are shown as the sizes of
their nested sets; full membership is in the `json` output.

1. `{always-issue, cardinality-only-queries, fabricated-result, no-query, reversed-order}` ⊂ `{always-issue, cardinality-only-queries, fabricated-result, first-name-reuse, no-query, reversed-order}` ⊂ `{always-issue, boundary-lenient, cardinality-only-queries, fabricated-result, first-name-reuse, no-query, reversed-order}` ⊂ `{always-issue, boundary-inclusive, boundary-lenient, cardinality-only-queries, fabricated-result, first-name-reuse, no-query, reversed-order}`
2. `{always-refuse, boundary-lenient, fabricated-result, no-query}` ⊂ `{always-refuse, boundary-lenient, fabricated-result, no-query, reversed-order}` ⊂ `{always-refuse, boundary-lenient, cardinality-only-queries, fabricated-result, first-name-reuse, no-query, reversed-order}` ⊂ `{always-refuse, boundary-inclusive, boundary-lenient, cardinality-only-queries, fabricated-result, first-name-reuse, no-query, reversed-order}`
3. `{always-refuse, boundary-inclusive}` ⊂ `{always-refuse, boundary-inclusive, boundary-lenient, fabricated-result, no-query, reversed-order}`

## Calibration — is the axis count distinguishable from noise?

Exact subset nesting is unforgiving: on a large bank of single-run results, one stray
disagreement between two otherwise-identical instances splits one axis into two. So a big noisy
corpus could report a high axis count for no reason but its size. The test below destroys the
structure and keeps the noise — each subject keeps its own pass count and its own unmeasured
cells, but which instances it passes is redrawn at random.

| | axes |
|---|---:|
| **measured** | **3** |
| null model, mean of 3 trial(s) (seed 20260828) | 8.0 |
| ceiling (one axis per discriminating instance) | 24 |

The measured width sits close to the null. On this corpus the axis count is largely explained by bank size and run-to-run noise rather than by shared structure, and should not be read as a count of distinct capabilities.

Null trials: 9, 8, 7.

## Subjects

`always-caught` subjects separate no pair of instances and are dead weight in the bank.
`never-caught` subjects are invisible to the suite: it cannot distinguish them from correct.

| subject | caught by | measured on | role |
|---|---:|---:|---|
| fabricated-result | 23 | 24 | discriminating |
| no-query | 23 | 24 | discriminating |
| reversed-order | 22 | 24 | discriminating |
| boundary-lenient | 20 | 24 | discriminating |
| cardinality-only-queries | 20 | 24 | discriminating |
| first-name-reuse | 18 | 24 | discriminating |
| always-issue | 13 | 24 | discriminating |
| boundary-inclusive | 13 | 24 | discriminating |
| always-refuse | 11 | 24 | discriminating |

## Checks

**6 of 6 declared checks have ever fired** against any subject in this
bank (100%). A check that has never fired is not evidence of coverage;
it may be a check that cannot fail, or a hygiene rail that is supposed to stay quiet.

| check | cells | instances | subjects |
|---|---:|---:|---:|
| caa_per_name_binding | 102 | 23 | 5 |
| caa_applicable_answer | 70 | 19 | 6 |
| caa_safe_issuance | 65 | 13 | 6 |
| caa_positive_query_work | 49 | 23 | 3 |
| caa_result_shape | 22 | 22 | 1 |
| caa_decision_faithful | 17 | 11 | 2 |

`subjects` is the column that matters. A check firing on every subject separates nothing; a
check firing on one separates exactly that subject.

## Coverage

216 of 216 cells measured (100%); 0 recorded as not measured. Unmeasured cells are excluded from catch sets rather than imputed as passes.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, no randomness, diffable.
