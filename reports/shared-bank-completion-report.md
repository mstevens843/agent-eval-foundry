# Shared-bank completion

What is missing before a cross-family axis count exists, how many trials that is, and which model
would produce them. Every number here is computed from the trial directories; nothing is prose.

## The verdict, per bank kind

| kind | what an axis count over it means | families | shared subjects | labs | verdict | trials still needed |
|---|---|---:|---:|---:|---|---:|
| `agent` | difficulty | 5 | 1 | 1 | **PARTIAL** | 4 |
| `imported` | difficulty | 1 | 2 | 2 | **REFUSED** | 1 |
| `mutant` | mutant-detection | 1 | 8 | 0 | **REFUSED** | 0 |

**Subjects and labs are different numbers and answer different questions.** Four models from one
lab give a bank of four subjects — which is what an antichain width counts — and evidence about
one lab, which is what a transfer claim counts. A report that quotes whichever is larger is not
reporting, it is choosing. Both columns are above.

## `agent` — difficulty

1 shared subject(s) against a threshold of 3. The combined width is bounded above by 1, which cannot distinguish complete overlap from independence. 4 more counted trial(s) would reach the threshold.

| subject | lab | present in | missing from |
|---|---|---|---|
| `claude-haiku-4-5` | anthropic | `containment`, `poisoning`, `replay` | `dom` (never-attempted), `poisoning` (never-attempted) |
| `claude-opus-5` | anthropic | `containment`, `poisoning`, `replay` | `dom` (never-attempted), `poisoning` (never-attempted) |
| `claude-sonnet-5` | anthropic | `containment`, `poisoning`, `replay` | `dom` (never-attempted), `poisoning` (never-attempted) |
| `gpt-5.6-sol` **(shared)** | openai | `containment`, `poisoning`, `replay`, `dom`, `poisoning` | — |

## `imported` — difficulty

Fewer than two `imported` banks exist, so there is nothing to compare.

| subject | lab | present in | missing from |
|---|---|---|---|
| `claude-opus-5` **(shared)** | anthropic | `outbox` | — |
| `gpt-5.6-sol` **(shared)** | openai | `outbox` | — |

## `mutant` — mutant-detection

Fewer than two `mutant` banks exist, so there is nothing to compare.

| subject | lab | present in | missing from |
|---|---|---|---|
| `access-token-scope-expansion::audit-liar` **(shared)** | unknown | `expansion` | — |
| `access-token-scope-expansion::duplicate-executor` **(shared)** | unknown | `expansion` | — |
| `access-token-scope-expansion::nop-faker` **(shared)** | unknown | `expansion` | — |
| `access-token-scope-expansion::over-blocker` **(shared)** | unknown | `expansion` | — |
| `access-token-scope-expansion::policy-bypasser` **(shared)** | unknown | `expansion` | — |
| `access-token-scope-expansion::scope-widener` **(shared)** | unknown | `expansion` | — |
| `access-token-scope-expansion::stale-approval-follower` **(shared)** | unknown | `expansion` | — |
| `access-token-scope-expansion::stale-state-reader` **(shared)** | unknown | `expansion` | — |

## Pairwise, because the verdict is a property of the family SET

A group verdict is the minimum over its members: one family missing a subject makes the whole
group PARTIAL even when two of its members share enough subjects to support a real number. That
number exists, so it is computed and quoted here rather than suppressed by a third family's gap.

| families | shared subjects | labs | verdict | combined width | sum of parts | null |
|---|---:|---:|---|---:|---:|---:|
| `containment` + `poisoning` | 4 | 2 | **MEASURED** | **2** | 2 | 5.8 |
| `containment` + `replay` | 4 | 2 | **MEASURED** | **1** | 1 | 6.0 |
| `containment` + `dom` | 1 | 1 | **PARTIAL** | refused | — | — |
| `containment` + `poisoning` | 1 | 1 | **PARTIAL** | refused | — | — |
| `poisoning` + `replay` | 4 | 2 | **MEASURED** | **2** | 3 | 6.0 |
| `poisoning` + `dom` | 1 | 1 | **PARTIAL** | refused | — | — |
| `poisoning` + `poisoning` | 1 | 1 | **PARTIAL** | refused | — | — |
| `replay` + `dom` | 1 | 1 | **PARTIAL** | refused | — | — |
| `replay` + `poisoning` | 1 | 1 | **PARTIAL** | refused | — | — |
| `dom` + `poisoning` | 1 | 1 | **PARTIAL** | refused | — | — |

**3 pair(s) reach the threshold**, so a combined width is available for them and quoted above.

### `prompt-injection-containment` + `prompt-injection-memory-poisoning`

Shared subjects: `claude-haiku-4-5`, `claude-opus-5`, `claude-sonnet-5`, `gpt-5.6-sol` — 2 lab(s).

| | |
|---|---:|
| `prompt-injection-containment` alone | 0 |
| `prompt-injection-memory-poisoning` alone | 2 |
| sum of the parts | 2 |
| **combined over shared subjects** | **2** |
| null-model mean | 5.8 |
| ceiling for this bank | 55 |
| instances | 416 |
| measured cells | 1664 |

> **The corpus is meaningfully more compressible than chance.** Real width **2**, null model
> **5.8**, ceiling **55** — a 2.9× reduction that randomness does not produce. The null
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
| **combined over shared subjects** | **2** |
| null-model mean | 6.0 |
| ceiling for this bank | 145 |
| instances | 612 |
| measured cells | 2448 |

> **The corpus is meaningfully more compressible than chance.** Real width **2**, null model
> **6.0**, ceiling **145** — a 3.0× reduction that randomness does not produce. The null
> keeps every subject's failure count and redraws which instances it fails, so it measures what
> this bank would report with no structure at all. Instances in these families genuinely fail
> together, and the width is not an artifact of bank size.
>
> **The threshold and this test are different gates on purpose.** The threshold asks whether
> co-failure across families is observable at all; the null model asks whether the observed
> structure beats noise. Both are reported because a bank can pass either and fail the other.

**2 < 3: the families overlap.** Some instance in one is failed by exactly the subjects that fail an instance in the other, so the two collapse into one axis under subset inclusion. This is the only evidence that says two families measure the same thing, and it is only available because the same subjects attempted both.

The shared subjects span 2 labs (anthropic, openai), so the width is not an artifact of one lab's training.


## The exact work remaining

4 counted trial(s), listed exactly. Each line is a trial that does not exist yet:

| subject | family | provider | runnable here | what it unlocks |
|---|---|---|---|---|
| `claude-haiku-4-5` | `ui-replay-live-dom` | `claude-haiku` | no — Anthropic execution disabled for this phase because the account is out of tokens; prepare import-only bundles | `claude-haiku-4-5` is already counted in prompt-injection-containment, prompt-injection-memory-poisoning, ui-action-record-replay; this is the last 2 trials it needs |
| `claude-haiku-4-5` | `checker-required-memory-poisoning` | `claude-haiku` | no — Anthropic execution disabled for this phase because the account is out of tokens; prepare import-only bundles | `claude-haiku-4-5` is already counted in prompt-injection-containment, prompt-injection-memory-poisoning, ui-action-record-replay; this is the last 2 trials it needs |
| `claude-opus-5` | `ui-replay-live-dom` | `claude` | no — Anthropic execution disabled for this phase because the account is out of tokens; prepare import-only bundles | `claude-opus-5` is already counted in prompt-injection-containment, prompt-injection-memory-poisoning, ui-action-record-replay; this is the last 2 trials it needs |
| `claude-opus-5` | `checker-required-memory-poisoning` | `claude` | no — Anthropic execution disabled for this phase because the account is out of tokens; prepare import-only bundles | `claude-opus-5` is already counted in prompt-injection-containment, prompt-injection-memory-poisoning, ui-action-record-replay; this is the last 2 trials it needs |

For the subjects that cannot run here, prepare a bundle. The bundle pins the challenge
hash, so a result someone else produces either measures this exact task or is refused on
import:

```bash
foundry trials campaign prepare --family ui-replay-live-dom --provider external --out bundles/ui-replay-live-dom-external
foundry trials campaign prepare --family checker-required-memory-poisoning --provider external --out bundles/checker-required-memory-poisoning-external
```


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

### Every hole on record

| subject | family | reason | detail |
|---|---|---|---|
| `claude-haiku-4-5` | `checker-required-memory-poisoning` | `never-attempted` | no trial record exists |
| `claude-haiku-4-5` | `ui-replay-live-dom` | `never-attempted` | no trial record exists |
| `claude-opus-5` | `checker-required-memory-poisoning` | `never-attempted` | no trial record exists |
| `claude-opus-5` | `ui-replay-live-dom` | `never-attempted` | no trial record exists |
| `claude-sonnet-5` | `checker-required-memory-poisoning` | `never-attempted` | no trial record exists |
| `claude-sonnet-5` | `ui-replay-live-dom` | `never-attempted` | no trial record exists |

## Are the families even comparable?

- `agent`: **comparable**. Every family's counted trials were graded against a single scenario set, so their cells sit in one matrix without imputation.
- `imported`: **unknown**. No counted trial exists in any family, so comparability is not yet decidable.
- `mutant`: **unknown**. No counted trial exists in any family, so comparability is not yet decidable.

A bank below threshold is a sample-size problem and is fixed by spending. A bank that is not
comparable is a structural problem and no number of trials fixes it: cells graded against
different scenario sets cannot sit in one matrix, because an instance absent from the smaller set
reads as never-caught rather than never-run, and that is a pass the family never observed.

## The combined width, refused

No combined axis count appears anywhere in this repository's reports, and the refusal is
enforced in code rather than by convention: `assertCombinedWidthAllowed` throws for a bank
below threshold and for one whose families are incomparable, and `combinedMatrixFor` throws
for a bank with no overlap at all. The number is easy to compute and would be the most
flattering figure available — a portfolio total — which is exactly why it is guarded.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
