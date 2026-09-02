# Axis report: terminal-bench/durable-approval-outbox

## Headline

| | |
|---|---|
| graded instances | **24** |
| checks in the suite | **267** |
| subjects in the bank | 10 |
| instances that separate nothing in this bank | **7** (29%) |
| distinct catch sets | **9** |
| independent axes (antichain width) | **3** |
| redundancy (discriminating instances per distinct catch set) | 1.89× |

17 of 24 instances separate at least one subject. Between them they produce 9 distinct catch sets, of which 3 cannot be explained as one defect observed at different sensitivities.

## Provenance — read before quoting any number above

> Subjects were not sampled independently of the instances. The six revoke-after-ack instances were SELECTED against seven of these ten engines by prototype/screenM/diversify.py, which gates on len(catch)>=6 over exactly the engines then known to carry the ACKED->REVOKED bug. Read the axis count for this suite as an upper bound.

## The curve: what survives a stronger bank

Apparent diversity is a property of the suite *paired with its bank*. Each row removes the
most-caught remaining subject and recounts. A count that collapses on the left is a suite whose
measured richness depends on weak subjects being present.

Read the **independent axes** column, not the catch-set column. Distinct catch sets is the
statistic this report argues is inflated, and the two decay at different rates.

| weakest dropped | subjects left | distinct catch sets | **independent axes** | instances separating nothing |
|---:|---:|---:|---:|---:|
| 0 | 10 | 9 | **3** | 7 / 24 |
| 1 | 9 | 9 | **3** | 7 / 24 |
| 2 | 8 | 8 | **3** | 7 / 24 |
| 3 | 7 | 6 | **2** | 9 / 24 |
| 4 | 6 | 5 | **2** | 11 / 24 |
| 5 | 5 | 4 | **2** | 11 / 24 |
| 6 | 4 | 3 | **2** | 15 / 24 |
| 7 | 3 | 3 | **2** | 15 / 24 |
| 8 | 2 | 2 | **1** | 21 / 24 |
| 9 | 1 | 1 | **1** | 22 / 24 |

## Clusters — instances sharing one identical catch set

| catch set | size | instances |
|---|---:|---|
| `{codex1, codex2b, codex3b, fhc2, fhc3, opus2, opus3b}` | 5 | revoke-after-ack-a-1009-12, revoke-after-ack-c-1009-12, revoke-after-ack-d-1021-12, revoke-after-ack-e-1049-12, revoke-after-ack-f-1049-12 |
| `{e1}` | 3 | crash-after-tool-1009-12, stale-lease-1009-12, unknown-then-revoke-noop-1009-12 |
| `{codex1, codex2b, codex3b}` | 2 | two-workers-1021-16, crash-after-lease-1021-16 |
| `{codex1, codex2b, codex3b, fhc2}` | 2 | serial-clean-1013-16, revoke-while-leased-1031-16 |
| `{codex2b, e1}` | 1 | stale-lease-1013-16 |
| `{codex3b, e1, fhc1, opus1, opus2}` | 1 | crash-after-tool-1013-16 |
| `{codex1, codex3b, e1, fhc1, opus1, opus2}` | 1 | hostile-mix-1009-12 |
| `{codex1, codex2b, codex3b, e1, fhc1, opus2}` | 1 | hostile-mix-1021-16 |
| `{codex1, codex2b, codex3b, fhc2, fhc3, opus3b}` | 1 | revoke-after-ack-b-1009-12 |

**Separating nothing (7):** serial-clean-1009-12, two-workers-1009-12, revoke-while-leased-1009-12, crash-after-tool-1031-20, crash-after-lease-1009-12, hostile-mix-1031-20, unknown-then-revoke-1009-12

An empty catch set is a statement about the bank as much as about the instance. These may be
redundant, or they may be correctness anchors doing their job by confirming that everything
which should pass does. This tool cannot tell those apart.

## Chain decomposition

A minimum cover of the distinct catch sets by nested chains. Each chain is consistent with one
underlying defect observed at increasing sensitivity, so the number of chains — not the number
of catch sets — is the count of things the suite demonstrably measures separately.

The cover is a minimum one but not a unique one: the width is canonical, which instance lands in
which chain is not. Where catch sets are too wide to print, chains are shown as the sizes of
their nested sets; full membership is in the `json` output.

1. `{codex1, codex2b, codex3b}` ⊂ `{codex1, codex2b, codex3b, fhc2}` ⊂ `{codex1, codex2b, codex3b, fhc2, fhc3, opus3b}` ⊂ `{codex1, codex2b, codex3b, fhc2, fhc3, opus2, opus3b}`
2. `{e1}` ⊂ `{codex2b, e1}` ⊂ `{codex1, codex2b, codex3b, e1, fhc1, opus2}`
3. `{codex3b, e1, fhc1, opus1, opus2}` ⊂ `{codex1, codex3b, e1, fhc1, opus1, opus2}`

## Subjects

`always-caught` subjects separate no pair of instances and are dead weight in the bank.
`never-caught` subjects are invisible to the suite: it cannot distinguish them from correct.

| subject | caught by | measured on | role |
|---|---:|---:|---|
| codex3b | 13 | 24 | discriminating |
| codex1 | 12 | 24 | discriminating |
| codex2b | 12 | 24 | discriminating |
| fhc2 | 8 | 24 | discriminating |
| opus2 | 8 | 24 | discriminating |
| e1 | 7 | 24 | discriminating |
| fhc3 | 6 | 24 | discriminating |
| opus3b | 6 | 24 | discriminating |
| fhc1 | 3 | 24 | discriminating |
| opus1 | 2 | 24 | discriminating |

## Checks

6 distinct check(s) fired in this bank. The suite does not declare its
check universe (`provenance.checks_declared`), so the firing RATE is unknown — not zero, and
not 100%. Declare the universe and this becomes the cheapest coverage diagnostic you own.

| check | cells | instances | subjects |
|---|---:|---:|---:|
| audit_explains | 61 | 13 | 7 |
| completion | 8 | 3 | 3 |
| executed_iff_called | 8 | 7 | 2 |
| exactly_once | 6 | 6 | 1 |
| revocation_ordering | 6 | 6 | 1 |
| expected_executions | 5 | 5 | 1 |

`subjects` is the column that matters. A check firing on every subject separates nothing; a
check firing on one separates exactly that subject.

## Coverage

240 of 240 cells measured (100%); 0 recorded as not measured. Unmeasured cells are excluded from catch sets rather than imputed as passes.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, no randomness, diffable.
