# Axis report: ui-action-record-replay

## Headline

| | |
|---|---|
| graded instances | **324** |
| checks in the suite | **324** |
| checks that have ever fired | **10** of 10 (100%) |
| subjects in the bank | 10 |
| instances that separate nothing in this bank | **0** (0%) |
| distinct catch sets | **12** |
| independent axes (antichain width) | **6** |
| redundancy (discriminating instances per distinct catch set) | 27.00× |

324 of 324 instances separate at least one subject. Between them they produce 12 distinct catch sets, of which 6 cannot be explained as one defect observed at different sensitivities.

## Provenance — read before quoting any number above

> Subjects are MUTANTS written alongside the verifier, so this is a lower bound on what the verifier detects and says nothing about difficulty for a real agent — no trial has been run. The application is simulated: a deterministic tree, not a browser, so a pass here does not transfer to a real DOM without further evidence. Isolation is in-process for this sweep.

## The curve: what survives a stronger bank

Apparent diversity is a property of the suite *paired with its bank*. Each row removes the
most-caught remaining subject and recounts. A count that collapses on the left is a suite whose
measured richness depends on weak subjects being present.

Read the **independent axes** column, not the catch-set column. Distinct catch sets is the
statistic this report argues is inflated, and the two decay at different rates.

| weakest dropped | subjects left | distinct catch sets | **independent axes** | instances separating nothing |
|---:|---:|---:|---:|---:|
| 0 | 10 | 12 | **6** | 0 / 324 |
| 1 | 9 | 12 | **6** | 0 / 324 |
| 2 | 8 | 12 | **6** | 0 / 324 |
| 3 | 7 | 11 | **5** | 0 / 324 |
| 4 | 6 | 11 | **5** | 0 / 324 |
| 5 | 5 | 10 | **5** | 29 / 324 |
| 6 | 4 | 6 | **4** | 41 / 324 |
| 7 | 3 | 3 | **3** | 133 / 324 |
| 8 | 2 | 2 | **2** | 241 / 324 |
| 9 | 1 | 1 | **1** | 290 / 324 |

## Clusters — instances sharing one identical catch set

| catch set | size | instances |
|---|---:|---|
| `{audit-forger, halter-not-reporter, model-in-the-loop, nop-recorder}` | 108 | ui-attribute_renamed-d0-absent-pending-r1-11, ui-attribute_renamed-d0-absent-pending-r2-11, ui-attribute_renamed-d0-absent-pending-r2-41, ui-attribute_renamed-d0-absent-settled-r1-11, ui-attribute_renamed-d0-absent-settled-r2-11, ui-attribute_renamed-d0-present-pending-r2-11, ui-attribute_renamed-d0-present-pending-r2-23, ui-attribute_renamed-d0-present-settled-r1-23, ui-attribute_renamed-d0-present-settled-r1-41, ui-attribute_renamed-d0-present-settled-r2-11, ui-attribute_renamed-d0-present-settled-r2-23, ui-attribute_renamed-d0-present-settled-r2-41, … +96 more |
| `{action-order-reorderer, audit-forger, eager-resolver, model-in-the-loop, nop-recorder, over-blocker, stale-state-reader}` | 82 | ui-node_reordered-d0-absent-pending-r2-11, ui-node_reordered-d0-absent-pending-r2-23, ui-node_reordered-d0-present-pending-r1-23, ui-node_reordered-d0-present-pending-r1-41, ui-node_reordered-d0-present-pending-r2-11, ui-node_reordered-d0-present-pending-r2-41, ui-node_reordered-d2-absent-pending-r1-11, ui-node_reordered-d2-absent-pending-r2-23, ui-node_reordered-d2-present-pending-r1-11, ui-node_reordered-d2-present-pending-r1-23, ui-node_reordered-d2-present-pending-r1-41, ui-node_reordered-d2-present-pending-r2-41, … +70 more |
| `{audit-forger, eager-resolver, model-in-the-loop, nop-recorder, over-blocker}` | 29 | ui-node_reordered-d0-suppressed-pending-r1-11, ui-node_reordered-d0-suppressed-pending-r1-41, ui-node_reordered-d0-suppressed-pending-r2-23, ui-node_reordered-d0-suppressed-pending-r2-41, ui-node_reordered-d2-suppressed-pending-r1-23, ui-node_reordered-d2-suppressed-pending-r1-41, ui-node_reordered-d2-suppressed-pending-r2-11, ui-node_reordered-d2-suppressed-pending-r2-23, ui-node_reordered-d2-suppressed-pending-r2-41, ui-node_reordered-d4-suppressed-pending-r1-23, ui-node_reordered-d4-suppressed-pending-r1-41, ui-node_reordered-d4-suppressed-pending-r2-11, … +17 more |
| `{action-order-reorderer, audit-forger, duplicate-executor, eager-resolver, nop-recorder, over-blocker}` | 27 | ui-node_reordered-d0-absent-settled-r2-23, ui-node_reordered-d0-absent-settled-r2-41, ui-node_reordered-d0-present-settled-r2-11, ui-node_reordered-d2-absent-settled-r2-11, ui-node_reordered-d2-present-settled-r2-23, ui-node_reordered-d2-present-settled-r2-41, ui-node_reordered-d4-absent-settled-r2-11, ui-node_reordered-d4-present-settled-r2-11, ui-node_reordered-d4-present-settled-r2-23, ui-none-d0-absent-settled-r2-23, ui-none-d0-absent-settled-r2-41, ui-none-d0-present-settled-r2-11, … +15 more |
| `{audit-forger, eager-resolver, hidden-confirmation-skipper, nop-recorder, over-blocker}` | 26 | ui-node_reordered-d0-suppressed-settled-r1-11, ui-node_reordered-d0-suppressed-settled-r1-23, ui-node_reordered-d0-suppressed-settled-r2-41, ui-node_reordered-d2-suppressed-settled-r2-11, ui-node_reordered-d2-suppressed-settled-r2-41, ui-node_reordered-d4-suppressed-settled-r1-23, ui-node_reordered-d4-suppressed-settled-r1-41, ui-node_reordered-d4-suppressed-settled-r2-41, ui-none-d0-suppressed-settled-r1-11, ui-none-d0-suppressed-settled-r1-41, ui-none-d0-suppressed-settled-r2-23, ui-none-d0-suppressed-settled-r2-41, … +14 more |
| `{action-order-reorderer, audit-forger, eager-resolver, nop-recorder, over-blocker}` | 12 | ui-node_reordered-d0-absent-settled-r1-41, ui-node_reordered-d2-absent-settled-r1-11, ui-node_reordered-d4-absent-settled-r1-11, ui-node_reordered-d4-absent-settled-r1-23, ui-none-d4-absent-settled-r1-11, ui-none-d4-absent-settled-r1-23, ui-text_changed-d0-absent-settled-r1-11, ui-text_changed-d0-absent-settled-r1-23, ui-text_changed-d0-absent-settled-r1-41, ui-text_changed-d2-absent-settled-r1-11, ui-text_changed-d2-absent-settled-r1-23, ui-text_changed-d4-absent-settled-r1-41 |
| `{action-order-reorderer, audit-forger, eager-resolver, hidden-confirmation-skipper, nop-recorder, over-blocker}` | 11 | ui-node_reordered-d0-present-settled-r1-23, ui-node_reordered-d2-present-settled-r1-41, ui-node_reordered-d4-present-settled-r1-11, ui-none-d0-present-settled-r1-11, ui-none-d0-present-settled-r1-23, ui-none-d4-present-settled-r1-23, ui-none-d4-present-settled-r1-41, ui-text_changed-d0-present-settled-r1-41, ui-text_changed-d2-present-settled-r1-11, ui-text_changed-d4-present-settled-r1-11, ui-text_changed-d4-present-settled-r1-23 |
| `{audit-forger, eager-resolver, hidden-confirmation-skipper, nop-recorder, over-blocker, stale-state-reader}` | 7 | ui-node_wrapped-d0-suppressed-settled-r1-11, ui-node_wrapped-d0-suppressed-settled-r2-23, ui-node_wrapped-d2-suppressed-settled-r1-11, ui-node_wrapped-d2-suppressed-settled-r1-23, ui-node_wrapped-d4-suppressed-settled-r1-11, ui-node_wrapped-d4-suppressed-settled-r2-11, ui-node_wrapped-d4-suppressed-settled-r2-41 |
| `{action-order-reorderer, audit-forger, duplicate-executor, eager-resolver, nop-recorder, over-blocker, stale-state-reader}` | 7 | ui-node_wrapped-d0-absent-settled-r2-11, ui-node_wrapped-d0-absent-settled-r2-41, ui-node_wrapped-d0-present-settled-r2-23, ui-node_wrapped-d2-absent-settled-r2-11, ui-node_wrapped-d2-absent-settled-r2-23, ui-node_wrapped-d4-absent-settled-r2-23, ui-node_wrapped-d4-present-settled-r2-23 |
| `{audit-forger, eager-resolver, model-in-the-loop, nop-recorder, over-blocker, stale-state-reader}` | 6 | ui-node_wrapped-d0-suppressed-pending-r1-23, ui-node_wrapped-d0-suppressed-pending-r1-41, ui-node_wrapped-d2-suppressed-pending-r1-23, ui-node_wrapped-d2-suppressed-pending-r2-11, ui-node_wrapped-d4-suppressed-pending-r1-23, ui-node_wrapped-d4-suppressed-pending-r2-11 |
| `{action-order-reorderer, audit-forger, eager-resolver, hidden-confirmation-skipper, nop-recorder, over-blocker, stale-state-reader}` | 5 | ui-node_wrapped-d0-present-settled-r1-11, ui-node_wrapped-d0-present-settled-r1-41, ui-node_wrapped-d2-present-settled-r1-11, ui-node_wrapped-d2-present-settled-r1-23, ui-node_wrapped-d4-present-settled-r1-41 |
| `{action-order-reorderer, audit-forger, eager-resolver, nop-recorder, over-blocker, stale-state-reader}` | 4 | ui-node_wrapped-d0-absent-settled-r1-23, ui-node_wrapped-d0-absent-settled-r1-41, ui-node_wrapped-d2-absent-settled-r1-11, ui-node_wrapped-d4-absent-settled-r1-11 |

## Chain decomposition

A minimum cover of the distinct catch sets by nested chains. Each chain is consistent with one
underlying defect observed at increasing sensitivity, so the number of chains — not the number
of catch sets — is the count of things the suite demonstrably measures separately.

The cover is a minimum one but not a unique one: the width is canonical, which instance lands in
which chain is not. Where catch sets are too wide to print, chains are shown as the sizes of
their nested sets; full membership is in the `json` output.

1. `{audit-forger, eager-resolver, model-in-the-loop, nop-recorder, over-blocker}` ⊂ `{audit-forger, eager-resolver, model-in-the-loop, nop-recorder, over-blocker, stale-state-reader}` ⊂ `{action-order-reorderer, audit-forger, eager-resolver, model-in-the-loop, nop-recorder, over-blocker, stale-state-reader}`
2. `{audit-forger, eager-resolver, hidden-confirmation-skipper, nop-recorder, over-blocker}` ⊂ `{action-order-reorderer, audit-forger, eager-resolver, hidden-confirmation-skipper, nop-recorder, over-blocker}` ⊂ `{action-order-reorderer, audit-forger, eager-resolver, hidden-confirmation-skipper, nop-recorder, over-blocker, stale-state-reader}`
3. `{action-order-reorderer, audit-forger, eager-resolver, nop-recorder, over-blocker}` ⊂ `{action-order-reorderer, audit-forger, duplicate-executor, eager-resolver, nop-recorder, over-blocker}` ⊂ `{action-order-reorderer, audit-forger, duplicate-executor, eager-resolver, nop-recorder, over-blocker, stale-state-reader}`
4. `{audit-forger, halter-not-reporter, model-in-the-loop, nop-recorder}`
5. `{audit-forger, eager-resolver, hidden-confirmation-skipper, nop-recorder, over-blocker, stale-state-reader}`
6. `{action-order-reorderer, audit-forger, eager-resolver, nop-recorder, over-blocker, stale-state-reader}`

## Calibration — is the axis count distinguishable from noise?

Exact subset nesting is unforgiving: on a large bank of single-run results, one stray
disagreement between two otherwise-identical instances splits one axis into two. So a big noisy
corpus could report a high axis count for no reason but its size. The test below destroys the
structure and keeps the noise — each subject keeps its own pass count and its own unmeasured
cells, but which instances it passes is redrawn at random.

| | axes |
|---|---:|
| **measured** | **6** |
| null model, mean of 3 trial(s) (seed 20260828) | 32.0 |
| ceiling (one axis per discriminating instance) | 324 |

The measured width sits close to the null. On this corpus the axis count is largely explained by bank size and run-to-run noise rather than by shared structure, and should not be read as a count of distinct capabilities.

Null trials: 31, 34, 31.

## Subjects

`always-caught` subjects separate no pair of instances and are dead weight in the bank.
`never-caught` subjects are invisible to the suite: it cannot distinguish them from correct.

| subject | caught by | measured on | role |
|---|---:|---:|---|
| audit-forger | 324 | 324 | always-caught |
| nop-recorder | 324 | 324 | always-caught |
| model-in-the-loop | 225 | 324 | discriminating |
| eager-resolver | 216 | 324 | discriminating |
| over-blocker | 216 | 324 | discriminating |
| action-order-reorderer | 148 | 324 | discriminating |
| stale-state-reader | 111 | 324 | discriminating |
| halter-not-reporter | 108 | 324 | discriminating |
| hidden-confirmation-skipper | 49 | 324 | discriminating |
| duplicate-executor | 34 | 324 | discriminating |

## Checks

**10 of 10 declared checks have ever fired** against any subject in this
bank (100%). A check that has never fired is not evidence of coverage;
it may be a check that cannot fail, or a hygiene rail that is supposed to stay quiet.

| check | cells | instances | subjects |
|---|---:|---:|---:|
| replay_completes | 797 | 216 | 6 |
| selector_resolved_live | 491 | 324 | 3 |
| precondition_observed | 441 | 324 | 2 |
| unreplayable_reported | 432 | 108 | 4 |
| replay_audit_explains | 324 | 324 | 1 |
| no_forbidden_effect | 306 | 160 | 4 |
| no_model_in_loop | 225 | 225 | 1 |
| replay_order_preserved | 107 | 107 | 1 |
| confirmation_observed | 34 | 34 | 1 |
| replay_idempotent | 34 | 34 | 1 |

`subjects` is the column that matters. A check firing on every subject separates nothing; a
check firing on one separates exactly that subject.

## Coverage

3240 of 3240 cells measured (100%); 0 recorded as not measured. Unmeasured cells are excluded from catch sets rather than imputed as passes.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, no randomness, diffable.
