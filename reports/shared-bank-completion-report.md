# Shared-bank completion

What is missing before a cross-family axis count exists, how many trials that is, and which model
would produce them. Every number here is computed from the trial directories; nothing is prose.

## The verdict, per bank kind

| kind | what an axis count over it means | families | shared subjects | labs | verdict | trials still needed |
|---|---|---:|---:|---:|---|---:|
| `agent` | difficulty | 3 | 4 | 2 | **MEASURED** | 0 |
| `imported` | difficulty | 1 | 2 | 2 | **REFUSED** | 1 |

**Subjects and labs are different numbers and answer different questions.** Four models from one
lab give a bank of four subjects — which is what an antichain width counts — and evidence about
one lab, which is what a transfer claim counts. A report that quotes whichever is larger is not
reporting, it is choosing. Both columns are above.

## `agent` — difficulty

4 shared subject(s) across 2 provider family(ies). "Did the same implementation fail both?" has an answer, and the combined width below is computed over the shared subjects only.

| subject | lab | present in | missing from |
|---|---|---|---|
| `claude-haiku-4-5` **(shared)** | anthropic | `containment`, `poisoning`, `replay` | — |
| `claude-opus-5` **(shared)** | anthropic | `containment`, `poisoning`, `replay` | — |
| `claude-sonnet-5` **(shared)** | anthropic | `containment`, `poisoning`, `replay` | — |
| `gpt-5.6-sol` **(shared)** | openai | `containment`, `poisoning`, `replay` | — |

### Combined width, over the shared subjects only

| | |
|---|---:|
| `prompt-injection-containment` alone | 0 |
| `prompt-injection-memory-poisoning` alone | 2 |
| `ui-action-record-replay` alone | 1 |
| sum of the parts | 3 |
| **combined, measured** | **3** |
| null-model baseline | 6 |
| instances | 740 |
| measured cells | 2960 |

**The combined width equals the sum of the parts (3).** Over these subjects, no instance in
one family is failed by the same set that fails an instance in the other: the families
separate different implementations, and the axes add. Two cautions before that is quoted as
independence — the bank is small, and additivity is also what a disjoint bank produces by
construction, which is why the shared-subject restriction above is load-bearing.

The null model redraws which instances each subject fails at random, holding each subject's failure count fixed. It scores **6**; the real data scores **3**. The real corpus is meaningfully more compressible than chance.

## `imported` — difficulty

Fewer than two `imported` banks exist, so there is nothing to compare.

| subject | lab | present in | missing from |
|---|---|---|---|
| `claude-opus-5` **(shared)** | anthropic | `outbox` | — |
| `gpt-5.6-sol` **(shared)** | openai | `outbox` | — |

## Pairwise, because the verdict is a property of the family SET

A group verdict is the minimum over its members: one family missing a subject makes the whole
group PARTIAL even when two of its members share enough subjects to support a real number. That
number exists, so it is computed and quoted here rather than suppressed by a third family's gap.

| families | shared subjects | labs | verdict | combined width | sum of parts | null |
|---|---:|---:|---|---:|---:|---:|
| `containment` + `poisoning` | 4 | 2 | **MEASURED** | **2** | 2 | 6.0 |
| `containment` + `replay` | 4 | 2 | **MEASURED** | **1** | 1 | 6.0 |
| `poisoning` + `replay` | 4 | 2 | **MEASURED** | **3** | 3 | 6.0 |

**3 pair(s) reach the threshold**, so a combined width is available for them and quoted above.

### `prompt-injection-containment` + `prompt-injection-memory-poisoning`

Shared subjects: `claude-haiku-4-5`, `claude-opus-5`, `claude-sonnet-5`, `gpt-5.6-sol` — 2 lab(s).

| | |
|---|---:|
| `prompt-injection-containment` alone | 0 |
| `prompt-injection-memory-poisoning` alone | 2 |
| sum of the parts | 2 |
| **combined over shared subjects** | **2** |
| null-model mean | 6.0 |
| ceiling for this bank | 89 |
| instances | 416 |
| measured cells | 1664 |

> **The corpus is meaningfully more compressible than chance.** Real width **2**, null model
> **6.0**, ceiling **89** — a 3.0× reduction that randomness does not produce. The null
> keeps every subject's failure count and redraws which instances it fails, so it measures what
> this bank would report with no structure at all. Instances in these families genuinely fail
> together, and the width is not an artifact of bank size.
>
> **The threshold and this test are different gates on purpose.** The threshold asks whether
> co-failure across families is observable at all; the null model asks whether the observed
> structure beats noise. Both are reported because a bank can pass either and fail the other.

**2 = 2: the axes add over these subjects.** No instance in one family is failed by the same subject set as an instance in the other. Two cautions before that is read as independence: the shared bank is 4 subjects, and additivity is also what a DISJOINT bank produces by construction — which is why the restriction to shared subjects above is the load-bearing part.

The shared subjects span 2 labs (anthropic, openai), so the width is not an artifact of one lab's training.

### `prompt-injection-containment` + `ui-action-record-replay`

Shared subjects: `claude-haiku-4-5`, `claude-opus-5`, `claude-sonnet-5`, `gpt-5.6-sol` — 2 lab(s).

| | |
|---|---:|
| `prompt-injection-containment` alone | 0 |
| `ui-action-record-replay` alone | 1 |
| sum of the parts | 1 |
| **combined over shared subjects** | **1** |
| null-model mean | 6.0 |
| ceiling for this bank | 90 |
| instances | 452 |
| measured cells | 1808 |

> **The corpus is meaningfully more compressible than chance.** Real width **1**, null model
> **6.0**, ceiling **90** — a 6.0× reduction that randomness does not produce. The null
> keeps every subject's failure count and redraws which instances it fails, so it measures what
> this bank would report with no structure at all. Instances in these families genuinely fail
> together, and the width is not an artifact of bank size.
>
> **The threshold and this test are different gates on purpose.** The threshold asks whether
> co-failure across families is observable at all; the null model asks whether the observed
> structure beats noise. Both are reported because a bank can pass either and fail the other.

**1 = 1: the axes add over these subjects.** No instance in one family is failed by the same subject set as an instance in the other. Two cautions before that is read as independence: the shared bank is 4 subjects, and additivity is also what a DISJOINT bank produces by construction — which is why the restriction to shared subjects above is the load-bearing part.

The shared subjects span 2 labs (anthropic, openai), so the width is not an artifact of one lab's training.

### `prompt-injection-memory-poisoning` + `ui-action-record-replay`

Shared subjects: `claude-haiku-4-5`, `claude-opus-5`, `claude-sonnet-5`, `gpt-5.6-sol` — 2 lab(s).

| | |
|---|---:|
| `prompt-injection-memory-poisoning` alone | 2 |
| `ui-action-record-replay` alone | 1 |
| sum of the parts | 3 |
| **combined over shared subjects** | **3** |
| null-model mean | 6.0 |
| ceiling for this bank | 179 |
| instances | 612 |
| measured cells | 2448 |

> **The corpus is meaningfully more compressible than chance.** Real width **3**, null model
> **6.0**, ceiling **179** — a 2.0× reduction that randomness does not produce. The null
> keeps every subject's failure count and redraws which instances it fails, so it measures what
> this bank would report with no structure at all. Instances in these families genuinely fail
> together, and the width is not an artifact of bank size.
>
> **The threshold and this test are different gates on purpose.** The threshold asks whether
> co-failure across families is observable at all; the null model asks whether the observed
> structure beats noise. Both are reported because a bank can pass either and fail the other.

**3 = 3: the axes add over these subjects.** No instance in one family is failed by the same subject set as an instance in the other. Two cautions before that is read as independence: the shared bank is 4 subjects, and additivity is also what a DISJOINT bank produces by construction — which is why the restriction to shared subjects above is the load-bearing part.

The shared subjects span 2 labs (anthropic, openai), so the width is not an artifact of one lab's training.


## The exact work remaining

**None.** The difficulty bank is at or above threshold; widening it from here narrows the estimate rather than unlocking a claim.

## Why a hole is a hole

Four different things stop a subject counting, and only some of them are fillable by spending
money. Collapsing them into 'missing' is how a work list becomes a wish.

| reason | fillable by another trial? | meaning |
|---|---|---|
| `never-attempted` | yes | no trial exists; this is the only hole that is purely a question of budget |
| `refused` | **no** | the provider declined. Re-running until it complies would manufacture a sample, so this hole is not fillable by retrying |
| `infrastructure` | **no** | the provider could not authenticate or the harness broke. Fixable, but not by the model, and never counted as a failure |
| `superseded` | yes | a trial exists and was graded, then the family was repaired underneath it. It measures a task that no longer exists |
| `uncounted` | yes | a trial exists and did not meet the counting rules; the record says why |

_No holes: every subject has a counted trial in every family of its kind._

## Are the families even comparable?

- `agent`: **comparable**. Every family's counted trials were graded against a single scenario set, so their cells sit in one matrix without imputation.
- `imported`: **unknown**. No counted trial exists in any family, so comparability is not yet decidable.

A bank below threshold is a sample-size problem and is fixed by spending. A bank that is not
comparable is a structural problem and no number of trials fixes it: cells graded against
different scenario sets cannot sit in one matrix, because an instance absent from the smaller set
reads as never-caught rather than never-run, and that is a pass the family never observed.

## The combined width is available and computed above.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
