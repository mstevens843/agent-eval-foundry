# Axis report: ui-replay-live-dom

## Headline

| | |
|---|---|
| graded instances | **864** |
| checks in the suite | **864** |
| checks that have ever fired | **17** of 17 (100%) |
| subjects in the bank | 24 |
| instances that separate nothing in this bank | **0** (0%) |
| distinct catch sets | **56** |
| independent axes (antichain width) | **19** |
| redundancy (discriminating instances per distinct catch set) | 15.43× |

864 of 864 instances separate at least one subject. Between them they produce 56 distinct catch sets, of which 19 cannot be explained as one defect observed at different sensitivities.

## Provenance — read before quoting any number above

> Subjects are MUTANTS and two hand-written DISPOSITIONS, all authored alongside the verifier, so any width computed here is a property of the bank and a lower bound on what the verifier separates. It is mutant-detection evidence, not real-agent difficulty evidence; the latter comes only from counted trial directories and is reported separately. The constructed antichain is witnessed at seed 11 and re-derived at seed 41 by the build gates. The application is simulated: a mutable tree with a logical clock, not a browser, so a pass here does not transfer to a real DOM without further evidence. Isolation is in-process for this sweep.

## The curve: what survives a stronger bank

Apparent diversity is a property of the suite *paired with its bank*. Each row removes the
most-caught remaining subject and recounts. A count that collapses on the left is a suite whose
measured richness depends on weak subjects being present.

Read the **independent axes** column, not the catch-set column. Distinct catch sets is the
statistic this report argues is inflated, and the two decay at different rates.

| weakest dropped | subjects left | distinct catch sets | **independent axes** | instances separating nothing |
|---:|---:|---:|---:|---:|
| 0 | 24 | 56 | **19** | 0 / 864 |
| 1 | 23 | 56 | **19** | 0 / 864 |
| 2 | 22 | 56 | **19** | 0 / 864 |
| 3 | 21 | 56 | **19** | 0 / 864 |
| 4 | 20 | 56 | **19** | 0 / 864 |
| 5 | 19 | 56 | **19** | 0 / 864 |
| 6 | 18 | 56 | **19** | 0 / 864 |
| 7 | 17 | 56 | **19** | 0 / 864 |
| 8 | 16 | 55 | **19** | 4 / 864 |
| 9 | 15 | 52 | **18** | 4 / 864 |
| 10 | 14 | 52 | **18** | 4 / 864 |
| 11 | 13 | 40 | **14** | 4 / 864 |
| 12 | 12 | 40 | **14** | 4 / 864 |
| 13 | 11 | 39 | **13** | 292 / 864 |
| 14 | 10 | 38 | **13** | 292 / 864 |
| 15 | 9 | 19 | **7** | 300 / 864 |
| 16 | 8 | 9 | **4** | 316 / 864 |
| 17 | 7 | 7 | **4** | 374 / 864 |
| 18 | 6 | 5 | **4** | 491 / 864 |
| 19 | 5 | 4 | **3** | 681 / 864 |
| 20 | 4 | 4 | **3** | 681 / 864 |
| 21 | 3 | 3 | **3** | 691 / 864 |
| 22 | 2 | 2 | **2** | 771 / 864 |
| 23 | 1 | 1 | **1** | 841 / 864 |

## Clusters — instances sharing one identical catch set

| catch set | size | instances |
|---|---:|---|
| `{audit-forger, nop-recorder, over-blocker, precondition-assumer, stale-handle-holder, stale-id-replayer, step-reorderer, txn-blind}` | 288 | live-disabled_then_enabled-foreign_hold-b0-duplicated-none-honest-r1-s11, live-disabled_then_enabled-foreign_hold-b0-duplicated-none-honest-r2-s11, live-disabled_then_enabled-foreign_hold-b0-duplicated-none-misleading-r1-s11, live-disabled_then_enabled-foreign_hold-b0-duplicated-path_wins-honest-r2-s11, live-disabled_then_enabled-foreign_hold-b0-duplicated-path_wins-misleading-r2-s41, live-disabled_then_enabled-foreign_hold-b0-duplicated-semantic_wins-honest-r2-s41, live-disabled_then_enabled-foreign_hold-b0-duplicated-semantic_wins-misleading-r1-s11, live-disabled_then_enabled-foreign_hold-b0-duplicated-semantic_wins-misleading-r1-s41, live-disabled_then_enabled-foreign_hold-b0-duplicated-testid_wins-honest-r1-s11, live-disabled_then_enabled-foreign_hold-b0-exact-none-honest-r2-s11, live-disabled_then_enabled-foreign_hold-b0-exact-none-misleading-r1-s41, live-disabled_then_enabled-foreign_hold-b0-exact-path_wins-honest-r1-s41, … +276 more |
| `{audit-forger, budget-spinner, nop-recorder, over-blocker, precondition-assumer, stale-handle-holder, stale-id-replayer, step-reorderer}` | 97 | live-disabled_then_enabled-arming-b0-duplicated-path_wins-honest-r1-s11, live-disabled_then_enabled-arming-b0-duplicated-path_wins-misleading-r2-s41, live-disabled_then_enabled-arming-b0-duplicated-semantic_wins-honest-r2-s11, live-disabled_then_enabled-arming-b0-duplicated-testid_wins-honest-r1-s41, live-disabled_then_enabled-arming-b0-exact-none-honest-r1-s41, live-disabled_then_enabled-arming-b0-exact-none-misleading-r1-s41, live-disabled_then_enabled-arming-b0-exact-path_wins-honest-r2-s11, live-disabled_then_enabled-arming-b0-exact-path_wins-honest-r2-s41, live-disabled_then_enabled-arming-b0-exact-semantic_wins-honest-r1-s41, live-disabled_then_enabled-arming-b0-exact-semantic_wins-honest-r2-s11, live-disabled_then_enabled-arming-b0-exact-semantic_wins-misleading-r1-s11, live-disabled_then_enabled-arming-b0-exact-semantic_wins-misleading-r2-s11, … +85 more |
| `{audit-forger, confirmation-skipper, dom-prober, halter-not-reporter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, region-blind, silent-abandoner, stale-handle-holder, … +2 more}` | 27 | live-removed-clean-b0-duplicated-none-honest-r1-s41, live-removed-clean-b0-duplicated-path_wins-honest-r1-s41, live-removed-clean-b0-duplicated-semantic_wins-honest-r1-s41, live-removed-clean-b0-duplicated-semantic_wins-misleading-r1-s11, live-removed-clean-b0-duplicated-semantic_wins-misleading-r1-s41, live-removed-clean-b0-exact-none-honest-r1-s41, live-removed-clean-b0-exact-none-misleading-r1-s11, live-removed-clean-b0-exact-path_wins-misleading-r1-s41, live-removed-clean-b0-exact-testid_wins-honest-r1-s41, live-removed-clean-b0-exact-testid_wins-misleading-r1-s11, live-removed-clean-b2-duplicated-none-misleading-r1-s11, live-removed-clean-b2-duplicated-none-misleading-r1-s41, … +15 more |
| `{anchor-credulous, audit-forger, confirmation-skipper, dom-prober, duplicate-executor, halter-not-reporter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, patient-waiter, precondition-assumer, … +7 more}` | 26 | live-superseded-clean-b0-duplicated-semantic_wins-honest-r2-s41, live-superseded-clean-b0-duplicated-testid_wins-honest-r2-s41, live-superseded-clean-b0-duplicated-testid_wins-misleading-r2-s41, live-superseded-clean-b0-exact-none-honest-r2-s41, live-superseded-clean-b0-exact-none-misleading-r2-s41, live-superseded-clean-b0-exact-path_wins-misleading-r2-s41, live-superseded-clean-b0-exact-semantic_wins-misleading-r2-s41, live-superseded-clean-b0-exact-testid_wins-honest-r2-s41, live-superseded-clean-b0-exact-testid_wins-misleading-r2-s41, live-superseded-clean-b2-duplicated-path_wins-misleading-r2-s11, live-superseded-clean-b2-duplicated-path_wins-misleading-r2-s41, live-superseded-clean-b2-duplicated-semantic_wins-misleading-r2-s11, … +14 more |
| `{audit-forger, confirmation-skipper, dom-prober, impatient-halter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, stale-handle-holder, stale-id-replayer, step-reorderer, … +2 more}` | 25 | live-disabled_then_enabled-arming-b2-duplicated-semantic_wins-misleading-r1-s11, live-disabled_then_enabled-arming-b6-duplicated-semantic_wins-misleading-r1-s11, live-disabled_then_enabled-arming-b6-exact-semantic_wins-misleading-r1-s41, live-disabled_then_enabled-clean-b2-duplicated-semantic_wins-misleading-r1-s11, live-disabled_then_enabled-clean-b6-duplicated-semantic_wins-honest-r1-s41, live-disabled_then_enabled-clean-b6-exact-semantic_wins-misleading-r1-s41, live-late_mount-arming-b6-duplicated-semantic_wins-honest-r1-s11, live-late_mount-arming-b6-duplicated-semantic_wins-honest-r1-s41, live-late_mount-arming-b6-duplicated-semantic_wins-misleading-r1-s11, live-late_mount-arming-b6-exact-semantic_wins-honest-r1-s11, live-late_mount-arming-b6-exact-semantic_wins-misleading-r1-s11, live-late_mount-clean-b2-exact-semantic_wins-honest-r1-s11, … +13 more |
| `{audit-forger, budget-spinner, confirmation-skipper, dom-prober, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, silent-abandoner, stale-handle-holder, stale-id-replayer, … +1 more}` | 24 | live-late_mount-clean-b0-duplicated-none-misleading-r1-s11, live-late_mount-clean-b0-duplicated-semantic_wins-honest-r1-s11, live-late_mount-clean-b0-duplicated-semantic_wins-misleading-r1-s11, live-late_mount-clean-b0-exact-none-misleading-r1-s41, live-late_mount-clean-b0-exact-path_wins-misleading-r1-s11, live-late_mount-clean-b0-exact-semantic_wins-honest-r1-s11, live-late_mount-clean-b0-exact-testid_wins-honest-r1-s41, live-late_mount-clean-b0-exact-testid_wins-misleading-r1-s11, live-late_mount-clean-b2-duplicated-semantic_wins-honest-r1-s41, live-late_mount-clean-b2-duplicated-semantic_wins-misleading-r1-s41, live-late_mount-clean-b2-exact-none-misleading-r1-s41, live-late_mount-clean-b2-exact-testid_wins-honest-r1-s41, … +12 more |
| `{audit-forger, budget-spinner, confirmation-skipper, dom-prober, duplicate-executor, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, silent-abandoner, stale-handle-holder, … +2 more}` | 23 | live-late_mount-clean-b0-duplicated-none-honest-r2-s11, live-late_mount-clean-b0-duplicated-none-honest-r2-s41, live-late_mount-clean-b0-duplicated-path_wins-misleading-r2-s11, live-late_mount-clean-b0-duplicated-path_wins-misleading-r2-s41, live-late_mount-clean-b0-duplicated-semantic_wins-honest-r2-s11, live-late_mount-clean-b0-duplicated-testid_wins-misleading-r2-s41, live-late_mount-clean-b0-exact-none-honest-r2-s11, live-late_mount-clean-b0-exact-path_wins-honest-r2-s11, live-late_mount-clean-b0-exact-path_wins-misleading-r2-s11, live-late_mount-clean-b2-duplicated-none-honest-r2-s41, live-late_mount-clean-b2-duplicated-testid_wins-misleading-r2-s41, live-late_mount-clean-b2-exact-path_wins-misleading-r2-s41, … +11 more |
| `{audit-forger, confirmation-skipper, dom-prober, duplicate-executor, impatient-halter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, stale-handle-holder, stale-id-replayer, … +3 more}` | 21 | live-disabled_then_enabled-arming-b2-duplicated-semantic_wins-honest-r2-s11, live-disabled_then_enabled-arming-b6-duplicated-semantic_wins-honest-r2-s11, live-disabled_then_enabled-clean-b2-exact-semantic_wins-honest-r2-s11, live-disabled_then_enabled-clean-b6-duplicated-semantic_wins-honest-r2-s41, live-disabled_then_enabled-clean-b6-duplicated-semantic_wins-misleading-r2-s11, live-disabled_then_enabled-clean-b6-exact-semantic_wins-honest-r2-s11, live-disabled_then_enabled-clean-b6-exact-semantic_wins-honest-r2-s41, live-disabled_then_enabled-clean-b6-exact-semantic_wins-misleading-r2-s11, live-late_mount-arming-b6-duplicated-semantic_wins-honest-r2-s41, live-late_mount-arming-b6-exact-semantic_wins-misleading-r2-s11, live-late_mount-clean-b2-duplicated-semantic_wins-honest-r2-s11, live-remount_rekeyed-arming-b6-duplicated-semantic_wins-misleading-r2-s41, … +9 more |
| `{audit-forger, confirmation-skipper, dom-prober, duplicate-executor, halter-not-reporter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, region-blind, silent-abandoner, … +3 more}` | 21 | live-removed-clean-b0-duplicated-none-misleading-r2-s11, live-removed-clean-b0-duplicated-semantic_wins-honest-r2-s41, live-removed-clean-b0-exact-testid_wins-honest-r2-s11, live-removed-clean-b2-duplicated-none-honest-r2-s11, live-removed-clean-b2-duplicated-none-misleading-r2-s41, live-removed-clean-b2-duplicated-path_wins-honest-r2-s41, live-removed-clean-b2-duplicated-semantic_wins-honest-r2-s11, live-removed-clean-b2-duplicated-testid_wins-honest-r2-s41, live-removed-clean-b2-exact-path_wins-honest-r2-s41, live-removed-clean-b2-exact-path_wins-misleading-r2-s11, live-removed-clean-b2-exact-testid_wins-misleading-r2-s11, live-removed-clean-b6-duplicated-none-misleading-r2-s41, … +9 more |
| `{audit-forger, confirmation-skipper, dom-prober, halter-not-reporter, impatient-halter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, region-blind, silent-abandoner, … +4 more}` | 19 | live-removed-arming-b2-duplicated-none-honest-r1-s11, live-removed-arming-b2-duplicated-testid_wins-honest-r1-s11, live-removed-arming-b2-exact-none-honest-r1-s11, live-removed-arming-b2-exact-none-misleading-r1-s11, live-removed-arming-b2-exact-path_wins-misleading-r1-s11, live-removed-arming-b2-exact-semantic_wins-honest-r1-s11, live-removed-arming-b2-exact-semantic_wins-misleading-r1-s11, live-removed-arming-b6-duplicated-none-honest-r1-s11, live-removed-arming-b6-duplicated-none-misleading-r1-s11, live-removed-arming-b6-duplicated-path_wins-misleading-r1-s41, live-removed-arming-b6-duplicated-semantic_wins-honest-r1-s11, live-removed-arming-b6-exact-none-honest-r1-s11, … +7 more |
| `{audit-forger, confirmation-skipper, dom-prober, duplicate-executor, impatient-halter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, semantic-loyalist, stale-handle-holder, … +3 more}` | 16 | live-late_mount-arming-b6-duplicated-testid_wins-honest-r2-s41, live-late_mount-arming-b6-exact-testid_wins-misleading-r2-s11, live-late_mount-arming-b6-exact-testid_wins-misleading-r2-s41, live-late_mount-clean-b2-duplicated-testid_wins-honest-r2-s11, live-late_mount-clean-b6-duplicated-testid_wins-misleading-r2-s11, live-late_mount-clean-b6-exact-testid_wins-honest-r2-s41, live-late_mount-clean-b6-exact-testid_wins-misleading-r2-s41, live-remount_rekeyed-arming-b2-duplicated-testid_wins-honest-r2-s41, live-remount_rekeyed-arming-b2-duplicated-testid_wins-misleading-r2-s41, live-remount_rekeyed-arming-b6-duplicated-testid_wins-honest-r2-s41, live-remount_rekeyed-arming-b6-exact-testid_wins-honest-r2-s11, live-remount_rekeyed-arming-b6-exact-testid_wins-misleading-r2-s11, … +4 more |
| `{anchor-credulous, audit-forger, confirmation-skipper, dom-prober, halter-not-reporter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, patient-waiter, precondition-assumer, semantic-loyalist, … +6 more}` | 15 | live-superseded-clean-b0-duplicated-path_wins-honest-r1-s11, live-superseded-clean-b0-duplicated-semantic_wins-misleading-r1-s11, live-superseded-clean-b0-duplicated-semantic_wins-misleading-r1-s41, live-superseded-clean-b0-exact-none-misleading-r1-s41, live-superseded-clean-b0-exact-path_wins-misleading-r1-s11, live-superseded-clean-b2-duplicated-path_wins-honest-r1-s11, live-superseded-clean-b2-duplicated-path_wins-misleading-r1-s41, live-superseded-clean-b2-duplicated-semantic_wins-misleading-r1-s41, live-superseded-clean-b2-duplicated-testid_wins-honest-r1-s11, live-superseded-clean-b2-duplicated-testid_wins-misleading-r1-s11, live-superseded-clean-b2-exact-none-misleading-r1-s41, live-superseded-clean-b2-exact-testid_wins-honest-r1-s41, … +3 more |
| `{anchor-credulous, audit-forger, confirmation-skipper, dom-prober, duplicate-executor, halter-not-reporter, impatient-halter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, patient-waiter, … +8 more}` | 15 | live-superseded-arming-b2-duplicated-path_wins-misleading-r2-s41, live-superseded-arming-b2-duplicated-testid_wins-honest-r2-s41, live-superseded-arming-b2-exact-none-honest-r2-s41, live-superseded-arming-b2-exact-none-misleading-r2-s11, live-superseded-arming-b2-exact-path_wins-honest-r2-s41, live-superseded-arming-b2-exact-semantic_wins-misleading-r2-s41, live-superseded-arming-b2-exact-testid_wins-misleading-r2-s11, live-superseded-arming-b6-duplicated-path_wins-honest-r2-s11, live-superseded-arming-b6-duplicated-semantic_wins-honest-r2-s11, live-superseded-arming-b6-duplicated-semantic_wins-misleading-r2-s11, live-superseded-arming-b6-duplicated-semantic_wins-misleading-r2-s41, live-superseded-arming-b6-duplicated-testid_wins-misleading-r2-s11, … +3 more |
| `{audit-forger, confirmation-skipper, duplicate-executor, impatient-halter, nop-recorder, over-blocker, precondition-assumer, semantic-loyalist, stale-handle-holder, stale-id-replayer, step-reorderer, strict-bailer, … +1 more}` | 14 | live-disabled_then_enabled-arming-b2-duplicated-path_wins-misleading-r2-s11, live-disabled_then_enabled-arming-b2-exact-path_wins-honest-r2-s11, live-disabled_then_enabled-arming-b6-exact-path_wins-honest-r2-s41, live-disabled_then_enabled-clean-b2-duplicated-path_wins-honest-r2-s11, live-disabled_then_enabled-clean-b6-duplicated-path_wins-honest-r2-s11, live-disabled_then_enabled-clean-b6-duplicated-path_wins-honest-r2-s41, live-disabled_then_enabled-clean-b6-exact-path_wins-honest-r2-s41, live-disabled_then_enabled-clean-b6-exact-path_wins-misleading-r2-s11, live-stable-arming-b2-duplicated-path_wins-honest-r2-s11, live-stable-arming-b2-exact-path_wins-honest-r2-s11, live-stable-arming-b2-exact-path_wins-misleading-r2-s41, live-stable-arming-b6-duplicated-path_wins-honest-r2-s41, … +2 more |
| `{audit-forger, confirmation-skipper, dom-prober, impatient-halter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, semantic-loyalist, stale-handle-holder, stale-id-replayer, … +3 more}` | 14 | live-late_mount-arming-b2-exact-path_wins-honest-r1-s11, live-late_mount-arming-b6-duplicated-path_wins-misleading-r1-s11, live-late_mount-arming-b6-duplicated-path_wins-misleading-r1-s41, live-late_mount-clean-b2-duplicated-path_wins-honest-r1-s11, live-late_mount-clean-b2-exact-path_wins-honest-r1-s11, live-late_mount-clean-b2-exact-path_wins-misleading-r1-s11, live-late_mount-clean-b6-exact-path_wins-misleading-r1-s11, live-remount_rekeyed-arming-b2-duplicated-path_wins-misleading-r1-s41, live-remount_rekeyed-arming-b6-duplicated-path_wins-honest-r1-s11, live-remount_rekeyed-arming-b6-duplicated-path_wins-honest-r1-s41, live-remount_rekeyed-clean-b2-duplicated-path_wins-misleading-r1-s41, live-remount_rekeyed-clean-b2-exact-path_wins-honest-r1-s41, … +2 more |
| `{anchor-credulous, audit-forger, confirmation-skipper, dom-prober, halter-not-reporter, impatient-halter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, patient-waiter, precondition-assumer, … +7 more}` | 14 | live-superseded-arming-b2-duplicated-path_wins-misleading-r1-s41, live-superseded-arming-b2-duplicated-semantic_wins-misleading-r1-s11, live-superseded-arming-b2-duplicated-testid_wins-misleading-r1-s41, live-superseded-arming-b2-exact-none-honest-r1-s41, live-superseded-arming-b2-exact-path_wins-honest-r1-s11, live-superseded-arming-b2-exact-semantic_wins-honest-r1-s11, live-superseded-arming-b6-duplicated-path_wins-honest-r1-s41, live-superseded-arming-b6-duplicated-semantic_wins-honest-r1-s41, live-superseded-arming-b6-duplicated-semantic_wins-misleading-r1-s41, live-superseded-arming-b6-exact-none-misleading-r1-s41, live-superseded-arming-b6-exact-path_wins-honest-r1-s41, live-superseded-arming-b6-exact-semantic_wins-misleading-r1-s41, … +2 more |
| `{audit-forger, confirmation-skipper, dom-prober, duplicate-executor, halter-not-reporter, impatient-halter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, region-blind, … +5 more}` | 13 | live-removed-arming-b2-duplicated-path_wins-honest-r2-s41, live-removed-arming-b2-duplicated-path_wins-misleading-r2-s11, live-removed-arming-b2-duplicated-path_wins-misleading-r2-s41, live-removed-arming-b2-exact-none-honest-r2-s11, live-removed-arming-b6-duplicated-semantic_wins-misleading-r2-s11, live-removed-arming-b6-duplicated-semantic_wins-misleading-r2-s41, live-removed-arming-b6-duplicated-testid_wins-honest-r2-s11, live-removed-arming-b6-duplicated-testid_wins-honest-r2-s41, live-removed-arming-b6-duplicated-testid_wins-misleading-r2-s11, live-removed-arming-b6-exact-none-misleading-r2-s11, live-removed-arming-b6-exact-none-misleading-r2-s41, live-removed-arming-b6-exact-semantic_wins-misleading-r2-s41, … +1 more |
| `{audit-forger, confirmation-skipper, dom-prober, impatient-halter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, semantic-loyalist, stale-handle-holder, stale-id-replayer, … +2 more}` | 12 | live-late_mount-arming-b2-duplicated-testid_wins-honest-r1-s11, live-late_mount-arming-b2-exact-testid_wins-misleading-r1-s11, live-late_mount-arming-b6-exact-testid_wins-honest-r1-s41, live-late_mount-clean-b2-exact-testid_wins-honest-r1-s11, live-late_mount-clean-b6-duplicated-testid_wins-honest-r1-s41, live-late_mount-clean-b6-exact-testid_wins-misleading-r1-s41, live-remount_rekeyed-arming-b6-duplicated-testid_wins-misleading-r1-s41, live-remount_rekeyed-arming-b6-exact-testid_wins-honest-r1-s11, live-remount_rekeyed-arming-b6-exact-testid_wins-misleading-r1-s11, live-remount_rekeyed-clean-b2-exact-testid_wins-misleading-r1-s41, live-remount_rekeyed-clean-b6-duplicated-testid_wins-honest-r1-s11, live-remount_rekeyed-clean-b6-duplicated-testid_wins-honest-r1-s41 |
| `{audit-forger, confirmation-skipper, dom-prober, duplicate-executor, impatient-halter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, semantic-loyalist, stale-handle-holder, … +4 more}` | 12 | live-late_mount-arming-b2-duplicated-path_wins-honest-r2-s11, live-late_mount-arming-b6-duplicated-path_wins-misleading-r2-s41, live-late_mount-clean-b2-duplicated-path_wins-honest-r2-s11, live-late_mount-clean-b6-duplicated-path_wins-honest-r2-s41, live-remount_rekeyed-arming-b2-exact-path_wins-misleading-r2-s41, live-remount_rekeyed-arming-b6-duplicated-path_wins-honest-r2-s41, live-remount_rekeyed-arming-b6-exact-path_wins-honest-r2-s11, live-remount_rekeyed-arming-b6-exact-path_wins-misleading-r2-s41, live-remount_rekeyed-clean-b2-duplicated-path_wins-misleading-r2-s41, live-remount_rekeyed-clean-b2-exact-path_wins-misleading-r2-s41, live-remount_rekeyed-clean-b6-duplicated-path_wins-honest-r2-s41, live-remount_rekeyed-clean-b6-duplicated-path_wins-misleading-r2-s11 |
| `{audit-forger, confirmation-skipper, nop-recorder, over-blocker, precondition-assumer, semantic-loyalist, stale-handle-holder, stale-id-replayer, step-reorderer, strict-bailer, testid-loyalist}` | 10 | live-stable-clean-b0-duplicated-path_wins-honest-r1-s41, live-stable-clean-b0-duplicated-path_wins-misleading-r1-s11, live-stable-clean-b0-duplicated-path_wins-misleading-r1-s41, live-stable-clean-b2-duplicated-path_wins-honest-r1-s11, live-stable-clean-b2-duplicated-path_wins-misleading-r1-s41, live-stable-clean-b2-exact-path_wins-honest-r1-s41, live-stable-clean-b6-duplicated-path_wins-honest-r1-s41, live-stable-clean-b6-exact-path_wins-honest-r1-s11, live-stable-clean-b6-exact-path_wins-honest-r1-s41, live-stable-clean-b6-exact-path_wins-misleading-r1-s11 |
| `{audit-forger, confirmation-skipper, duplicate-executor, impatient-halter, nop-recorder, over-blocker, path-loyalist, precondition-assumer, semantic-loyalist, stale-handle-holder, stale-id-replayer, step-reorderer, … +1 more}` | 10 | live-disabled_then_enabled-arming-b2-duplicated-testid_wins-honest-r2-s11, live-disabled_then_enabled-arming-b2-duplicated-testid_wins-misleading-r2-s11, live-disabled_then_enabled-arming-b2-exact-testid_wins-honest-r2-s11, live-disabled_then_enabled-arming-b2-exact-testid_wins-misleading-r2-s11, live-disabled_then_enabled-arming-b6-duplicated-testid_wins-misleading-r2-s11, live-disabled_then_enabled-arming-b6-exact-testid_wins-honest-r2-s41, live-disabled_then_enabled-clean-b6-exact-testid_wins-honest-r2-s11, live-stable-arming-b2-exact-testid_wins-honest-r2-s11, live-stable-arming-b6-duplicated-testid_wins-honest-r2-s41, live-stable-arming-b6-duplicated-testid_wins-misleading-r2-s11 |
| `{audit-forger, budget-spinner, confirmation-skipper, dom-prober, duplicate-executor, impatient-halter, model-in-the-loop, nop-recorder, over-blocker, path-loyalist, precondition-assumer, silent-abandoner, … +4 more}` | 10 | live-late_mount-arming-b2-duplicated-none-honest-r2-s41, live-late_mount-arming-b2-duplicated-none-misleading-r2-s41, live-late_mount-arming-b2-duplicated-path_wins-honest-r2-s41, live-late_mount-arming-b2-duplicated-semantic_wins-honest-r2-s41, live-late_mount-arming-b2-duplicated-testid_wins-misleading-r2-s41, live-remount_rekeyed-arming-b2-duplicated-none-honest-r2-s11, live-remount_rekeyed-arming-b2-duplicated-semantic_wins-honest-r2-s11, live-remount_rekeyed-arming-b2-exact-none-honest-r2-s11, live-remount_rekeyed-arming-b2-exact-path_wins-misleading-r2-s11, live-remount_rekeyed-arming-b2-exact-testid_wins-honest-r2-s11 |
| `{audit-forger, budget-spinner, confirmation-skipper, nop-recorder, over-blocker, precondition-assumer, silent-abandoner, stale-handle-holder, stale-id-replayer, step-reorderer}` | 9 | live-disabled_then_enabled-clean-b0-duplicated-testid_wins-honest-r1-s41, live-disabled_then_enabled-clean-b0-exact-none-honest-r1-s41, live-disabled_then_enabled-clean-b0-exact-none-misleading-r1-s11, live-disabled_then_enabled-clean-b0-exact-none-misleading-r1-s41, live-disabled_then_enabled-clean-b0-exact-path_wins-honest-r1-s11, live-disabled_then_enabled-clean-b2-duplicated-path_wins-misleading-r1-s41, live-disabled_then_enabled-clean-b2-duplicated-testid_wins-honest-r1-s41, live-disabled_then_enabled-clean-b2-duplicated-testid_wins-misleading-r1-s41, live-disabled_then_enabled-clean-b2-exact-testid_wins-honest-r1-s41 |
| `{audit-forger, confirmation-skipper, duplicate-executor, impatient-halter, nop-recorder, over-blocker, precondition-assumer, stale-handle-holder, stale-id-replayer, step-reorderer, strict-bailer}` | 9 | live-disabled_then_enabled-arming-b2-exact-none-misleading-r2-s11, live-disabled_then_enabled-arming-b6-exact-none-honest-r2-s11, live-disabled_then_enabled-arming-b6-exact-none-misleading-r2-s41, live-disabled_then_enabled-clean-b2-exact-none-misleading-r2-s11, live-disabled_then_enabled-clean-b6-exact-none-honest-r2-s11, live-disabled_then_enabled-clean-b6-exact-none-honest-r2-s41, live-stable-arming-b2-exact-none-honest-r2-s41, live-stable-arming-b6-exact-none-honest-r2-s41, live-stable-arming-b6-exact-none-misleading-r2-s41 |
| `{audit-forger, confirmation-skipper, impatient-halter, nop-recorder, over-blocker, path-loyalist, precondition-assumer, semantic-loyalist, stale-handle-holder, stale-id-replayer, step-reorderer, strict-bailer}` | 9 | live-disabled_then_enabled-arming-b6-exact-testid_wins-honest-r1-s41, live-disabled_then_enabled-clean-b2-duplicated-testid_wins-honest-r1-s11, live-disabled_then_enabled-clean-b6-duplicated-testid_wins-misleading-r1-s11, live-disabled_then_enabled-clean-b6-exact-testid_wins-honest-r1-s11, live-disabled_then_enabled-clean-b6-exact-testid_wins-misleading-r1-s41, live-stable-arming-b2-duplicated-testid_wins-misleading-r1-s11, live-stable-arming-b2-exact-testid_wins-honest-r1-s11, live-stable-arming-b2-exact-testid_wins-misleading-r1-s11, live-stable-arming-b6-duplicated-testid_wins-honest-r1-s41 |

*Showing 25 of 56 distinct catch sets; 31 not listed.*

## Chain decomposition

A minimum cover of the distinct catch sets by nested chains. Each chain is consistent with one
underlying defect observed at increasing sensitivity, so the number of chains — not the number
of catch sets — is the count of things the suite demonstrably measures separately.

The cover is a minimum one but not a unique one: the width is canonical, which instance lands in
which chain is not. Where catch sets are too wide to print, chains are shown as the sizes of
their nested sets; full membership is in the `json` output.

1. 10 ⊂ 11 ⊂ 13 ⊂ 14 ⊂ 16 subjects
2. 10 ⊂ 12 ⊂ 14 ⊂ 15 ⊂ 19 subjects
3. 11 ⊂ 13 ⊂ 15 ⊂ 16 subjects
4. 8 ⊂ 14 ⊂ 15 ⊂ 17 subjects
5. 13 ⊂ 14 ⊂ 15 ⊂ 18 subjects
6. 9 ⊂ 11 ⊂ 13 ⊂ 15 subjects
7. 16 ⊂ 18 ⊂ 19 ⊂ 20 subjects
8. 8 ⊂ 13 ⊂ 15 subjects
9. 11 ⊂ 12 ⊂ 13 subjects
10. 13 ⊂ 14 ⊂ 17 subjects

*Showing 10 of 19 chains (longest first); 9 not listed.*

## Calibration — is the axis count distinguishable from noise?

Exact subset nesting is unforgiving: on a large bank of single-run results, one stray
disagreement between two otherwise-identical instances splits one axis into two. So a big noisy
corpus could report a high axis count for no reason but its size. The test below destroys the
structure and keeps the noise — each subject keeps its own pass count and its own unmeasured
cells, but which instances it passes is redrawn at random.

| | axes |
|---|---:|
| **measured** | **19** |
| null model, mean of 3 trial(s) (seed 20260828) | 303.0 |
| ceiling (one axis per discriminating instance) | 864 |

The measured width sits close to the null. On this corpus the axis count is largely explained by bank size and run-to-run noise rather than by shared structure, and should not be read as a count of distinct capabilities.

Null trials: 302, 308, 299.

## Subjects

`always-caught` subjects separate no pair of instances and are dead weight in the bank.
`never-caught` subjects are invisible to the suite: it cannot distinguish them from correct.

| subject | caught by | measured on | role |
|---|---:|---:|---|
| audit-forger | 864 | 864 | always-caught |
| nop-recorder | 864 | 864 | always-caught |
| over-blocker | 864 | 864 | always-caught |
| precondition-assumer | 864 | 864 | always-caught |
| stale-handle-holder | 864 | 864 | always-caught |
| stale-id-replayer | 864 | 864 | always-caught |
| step-reorderer | 864 | 864 | always-caught |
| confirmation-skipper | 479 | 864 | discriminating |
| path-loyalist | 395 | 864 | discriminating |
| dom-prober | 355 | 864 | discriminating |
| model-in-the-loop | 355 | 864 | discriminating |
| strict-bailer | 344 | 864 | discriminating |
| txn-blind | 288 | 864 | discriminating |
| silent-abandoner | 276 | 864 | discriminating |
| impatient-halter | 266 | 864 | discriminating |
| duplicate-executor | 243 | 864 | discriminating |
| testid-loyalist | 219 | 864 | discriminating |
| semantic-loyalist | 191 | 864 | discriminating |
| budget-spinner | 190 | 864 | discriminating |
| halter-not-reporter | 183 | 864 | discriminating |
| patient-waiter | 103 | 864 | discriminating |
| region-blind | 80 | 864 | discriminating |
| anchor-credulous | 70 | 864 | discriminating |
| first-match-picker | 23 | 864 | discriminating |

## Checks

**17 of 17 declared checks have ever fired** against any subject in this
bank (100%). A check that has never fired is not evidence of coverage;
it may be a check that cannot fail, or a hygiene rail that is supposed to stay quiet.

| check | cells | instances | subjects |
|---|---:|---:|---:|
| replay_completes | 4809 | 864 | 13 |
| precondition_observed | 2901 | 864 | 4 |
| unreplayable_reported | 1975 | 183 | 16 |
| no_forbidden_effect | 1758 | 813 | 12 |
| action_applied | 1728 | 864 | 2 |
| replay_audit_explains | 1728 | 864 | 2 |
| selector_resolved_live | 1440 | 864 | 2 |
| correct_anchor_resolution | 837 | 169 | 7 |
| anchor_ambiguity_refused | 799 | 68 | 15 |
| effect_targets_recorded_entity | 585 | 355 | 5 |
| no_orphaned_transaction | 552 | 276 | 2 |
| replay_order_preserved | 496 | 496 | 1 |
| confirmation_observed | 479 | 479 | 1 |
| no_model_in_loop | 355 | 355 | 1 |
| no_speculative_write | 355 | 355 | 1 |
| replay_idempotent | 243 | 243 | 1 |
| settle_budget_respected | 190 | 190 | 1 |

`subjects` is the column that matters. A check firing on every subject separates nothing; a
check firing on one separates exactly that subject.

## Coverage

20736 of 20736 cells measured (100%); 0 recorded as not measured. Unmeasured cells are excluded from catch sets rather than imputed as passes.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, no randomness, diffable.
