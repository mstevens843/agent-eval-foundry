# Shared-bank completion

What is missing before a cross-family axis count exists, how many trials that is, and which model
would produce them. Every number here is computed from the trial directories; nothing is prose.

## The verdict, per bank kind

| kind | what an axis count over it means | families | shared subjects | labs | verdict | trials still needed |
|---|---|---:|---:|---:|---|---:|
| `agent` | difficulty | 4 | 1 | 1 | **PARTIAL** | 4 |
| `imported` | difficulty | 1 | 2 | 2 | **REFUSED** | 1 |
| `mutant` | mutant-detection | 4 | 0 | 0 | **REFUSED** | 9 |

**Subjects and labs are different numbers and answer different questions.** Four models from one
lab give a bank of four subjects — which is what an antichain width counts — and evidence about
one lab, which is what a transfer claim counts. A report that quotes whichever is larger is not
reporting, it is choosing. Both columns are above.

## `agent` — difficulty

1 shared subject(s) against a threshold of 3. The combined width is bounded above by 1, which cannot distinguish complete overlap from independence. 4 more counted trial(s) would reach the threshold.

| subject | lab | present in | missing from |
|---|---|---|---|
| `claude-haiku-4-5` | anthropic | `containment`, `replay` | `dom` (never-attempted), `poisoning` (never-attempted) |
| `claude-opus-5` | anthropic | `containment`, `replay` | `dom` (never-attempted), `poisoning` (never-attempted) |
| `claude-sonnet-5` | anthropic | `containment`, `replay` | `dom` (never-attempted), `poisoning` (never-attempted) |
| `gpt-5.6-sol` **(shared)** | openai | `containment`, `replay`, `dom`, `poisoning` | — |

## `imported` — difficulty

Fewer than two `imported` banks exist, so there is nothing to compare.

| subject | lab | present in | missing from |
|---|---|---|---|
| `claude-opus-5` **(shared)** | anthropic | `outbox` | — |
| `gpt-5.6-sol` **(shared)** | openai | `outbox` | — |

## `mutant` — mutant-detection

No subject has a counted, hash-current trial in every family. Co-failure across families is unobservable and the union's width is the sum of the parts by construction.

| subject | lab | present in | missing from |
|---|---|---|---|
| `access-token-scope-expansion::audit-liar` | unknown | `expansion` | `poisoning` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `access-token-scope-expansion::duplicate-executor` | unknown | `expansion` | `poisoning` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `access-token-scope-expansion::grant-widener` | unknown | `expansion` | `poisoning` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `access-token-scope-expansion::nop-faker` | unknown | `expansion` | `poisoning` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `access-token-scope-expansion::over-blocker` | unknown | `expansion` | `poisoning` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `access-token-scope-expansion::policy-bypasser` | unknown | `expansion` | `poisoning` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `access-token-scope-expansion::scope-widener` | unknown | `expansion` | `poisoning` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `access-token-scope-expansion::stale-approval-follower` | unknown | `expansion` | `poisoning` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `access-token-scope-expansion::stale-state-reader` | unknown | `expansion` | `poisoning` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `delegated-wallet-scope-reconciliation::allow-everything-execute-everything` | unknown | `reconciliation` | `poisoning` (never-attempted), `expansion` (never-attempted), `drift` (never-attempted) |
| `delegated-wallet-scope-reconciliation::audit-liar` | unknown | `reconciliation` | `poisoning` (never-attempted), `expansion` (never-attempted), `drift` (never-attempted) |
| `delegated-wallet-scope-reconciliation::cached-scope-truster` | unknown | `reconciliation` | `poisoning` (never-attempted), `expansion` (never-attempted), `drift` (never-attempted) |
| `delegated-wallet-scope-reconciliation::downgrade-blind-executor` | unknown | `reconciliation` | `poisoning` (never-attempted), `expansion` (never-attempted), `drift` (never-attempted) |
| `delegated-wallet-scope-reconciliation::duplicate-effect-retrier` | unknown | `reconciliation` | `poisoning` (never-attempted), `expansion` (never-attempted), `drift` (never-attempted) |
| `delegated-wallet-scope-reconciliation::no-op-refuse-everything` | unknown | `reconciliation` | `poisoning` (never-attempted), `expansion` (never-attempted), `drift` (never-attempted) |
| `delegated-wallet-scope-reconciliation::over-blocker` | unknown | `reconciliation` | `poisoning` (never-attempted), `expansion` (never-attempted), `drift` (never-attempted) |
| `delegated-wallet-scope-reconciliation::requested-scope-truster` | unknown | `reconciliation` | `poisoning` (never-attempted), `expansion` (never-attempted), `drift` (never-attempted) |
| `delegated-wallet-scope-reconciliation::revocation-blind-executor` | unknown | `reconciliation` | `poisoning` (never-attempted), `expansion` (never-attempted), `drift` (never-attempted) |
| `delegated-wallet-scope-reconciliation::subject-owned-authority-truster` | unknown | `reconciliation` | `poisoning` (never-attempted), `expansion` (never-attempted), `drift` (never-attempted) |
| `deployment-model-alias-rollout-drift::alias-name-only-decider` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::always-continue` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::audit-liar` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::cached-alias-truster` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::claim-health-follower` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::duplicate-effect-retrier` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::mixed-stream-collapser` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::never-rollback` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::no-op-always-quarantine` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::reevaluation-blind` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::rollback-everything` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::rollout-window-blind` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::single-sample-sufficient` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::stale-baseline-comparer` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::subject-owned-truth-truster` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::used-samples-only-auditor` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `deployment-model-alias-rollout-drift::version-attribution-blind` | unknown | `drift` | `poisoning` (never-attempted), `expansion` (never-attempted), `reconciliation` (never-attempted) |
| `prompt-injection-memory-poisoning::attention-budgeted` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `prompt-injection-memory-poisoning::audit-forger` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `prompt-injection-memory-poisoning::memory-refuser` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `prompt-injection-memory-poisoning::nop-faker` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `prompt-injection-memory-poisoning::over-blocker` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `prompt-injection-memory-poisoning::provenance-dropper` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `prompt-injection-memory-poisoning::recall-blind-executor` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `prompt-injection-memory-poisoning::recency-over-provenance` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `prompt-injection-memory-poisoning::same-session-resolver` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `prompt-injection-memory-poisoning::secret-unmarked-writer` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `prompt-injection-memory-poisoning::self-trusting-reader` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `prompt-injection-memory-poisoning::summary-launderer` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |
| `prompt-injection-memory-poisoning::visible-origin-attributor` | unknown | `poisoning` | `expansion` (never-attempted), `reconciliation` (never-attempted), `drift` (never-attempted) |

## Pairwise, because the verdict is a property of the family SET

A group verdict is the minimum over its members: one family missing a subject makes the whole
group PARTIAL even when two of its members share enough subjects to support a real number. That
number exists, so it is computed and quoted here rather than suppressed by a third family's gap.

| families | shared subjects | labs | verdict | combined width | sum of parts | null |
|---|---:|---:|---|---:|---:|---:|
| `containment` + `replay` | 4 | 2 | **MEASURED** | **1** | 1 | 6.0 |
| `containment` + `dom` | 1 | 1 | **PARTIAL** | refused | — | — |
| `containment` + `poisoning` | 1 | 1 | **PARTIAL** | refused | — | — |
| `replay` + `dom` | 1 | 1 | **PARTIAL** | refused | — | — |
| `replay` + `poisoning` | 1 | 1 | **PARTIAL** | refused | — | — |
| `dom` + `poisoning` | 1 | 1 | **PARTIAL** | refused | — | — |

**1 pair(s) reach the threshold**, so a combined width is available for them and quoted above.

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


## The exact work remaining

4 counted trial(s), listed exactly. Each line is a trial that does not exist yet:

| subject | family | provider | runnable here | what it unlocks |
|---|---|---|---|---|
| `claude-haiku-4-5` | `ui-replay-live-dom` | `claude-haiku` | no — Anthropic execution requires an explicit CLAUDE_CODE_OAUTH_TOKEN in the runner environment; defaulting to import-only so prepared bundles cannot spend tokens accidentally | `claude-haiku-4-5` is already counted in prompt-injection-containment, ui-action-record-replay; this is the last 2 trials it needs |
| `claude-haiku-4-5` | `checker-required-memory-poisoning` | `claude-haiku` | no — Anthropic execution requires an explicit CLAUDE_CODE_OAUTH_TOKEN in the runner environment; defaulting to import-only so prepared bundles cannot spend tokens accidentally | `claude-haiku-4-5` is already counted in prompt-injection-containment, ui-action-record-replay; this is the last 2 trials it needs |
| `claude-opus-5` | `ui-replay-live-dom` | `claude` | no — Anthropic execution requires an explicit CLAUDE_CODE_OAUTH_TOKEN in the runner environment; defaulting to import-only so prepared bundles cannot spend tokens accidentally | `claude-opus-5` is already counted in prompt-injection-containment, ui-action-record-replay; this is the last 2 trials it needs |
| `claude-opus-5` | `checker-required-memory-poisoning` | `claude` | no — Anthropic execution requires an explicit CLAUDE_CODE_OAUTH_TOKEN in the runner environment; defaulting to import-only so prepared bundles cannot spend tokens accidentally | `claude-opus-5` is already counted in prompt-injection-containment, ui-action-record-replay; this is the last 2 trials it needs |

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
| `access-token-scope-expansion::audit-liar` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::audit-liar` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::audit-liar` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::duplicate-executor` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::duplicate-executor` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::duplicate-executor` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::grant-widener` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::grant-widener` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::grant-widener` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::nop-faker` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::nop-faker` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::nop-faker` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::over-blocker` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::over-blocker` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::over-blocker` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::policy-bypasser` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::policy-bypasser` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::policy-bypasser` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::scope-widener` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::scope-widener` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::scope-widener` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::stale-approval-follower` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::stale-approval-follower` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::stale-approval-follower` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::stale-state-reader` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::stale-state-reader` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `access-token-scope-expansion::stale-state-reader` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `claude-haiku-4-5` | `checker-required-memory-poisoning` | `never-attempted` | no trial record exists |
| `claude-haiku-4-5` | `ui-replay-live-dom` | `never-attempted` | no trial record exists |
| `claude-opus-5` | `checker-required-memory-poisoning` | `never-attempted` | no trial record exists |
| `claude-opus-5` | `ui-replay-live-dom` | `never-attempted` | no trial record exists |
| `claude-sonnet-5` | `checker-required-memory-poisoning` | `never-attempted` | no trial record exists |
| `claude-sonnet-5` | `ui-replay-live-dom` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::allow-everything-execute-everything` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::allow-everything-execute-everything` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::allow-everything-execute-everything` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::audit-liar` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::audit-liar` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::audit-liar` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::cached-scope-truster` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::cached-scope-truster` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::cached-scope-truster` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::downgrade-blind-executor` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::downgrade-blind-executor` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::downgrade-blind-executor` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::duplicate-effect-retrier` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::duplicate-effect-retrier` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::duplicate-effect-retrier` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::no-op-refuse-everything` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::no-op-refuse-everything` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::no-op-refuse-everything` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::over-blocker` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::over-blocker` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::over-blocker` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::requested-scope-truster` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::requested-scope-truster` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::requested-scope-truster` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::revocation-blind-executor` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::revocation-blind-executor` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::revocation-blind-executor` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::subject-owned-authority-truster` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::subject-owned-authority-truster` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `delegated-wallet-scope-reconciliation::subject-owned-authority-truster` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::alias-name-only-decider` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::alias-name-only-decider` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::alias-name-only-decider` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::always-continue` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::always-continue` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::always-continue` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::audit-liar` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::audit-liar` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::audit-liar` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::cached-alias-truster` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::cached-alias-truster` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::cached-alias-truster` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::claim-health-follower` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::claim-health-follower` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::claim-health-follower` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::duplicate-effect-retrier` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::duplicate-effect-retrier` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::duplicate-effect-retrier` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::mixed-stream-collapser` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::mixed-stream-collapser` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::mixed-stream-collapser` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::never-rollback` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::never-rollback` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::never-rollback` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::no-op-always-quarantine` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::no-op-always-quarantine` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::no-op-always-quarantine` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::reevaluation-blind` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::reevaluation-blind` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::reevaluation-blind` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::rollback-everything` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::rollback-everything` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::rollback-everything` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::rollout-window-blind` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::rollout-window-blind` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::rollout-window-blind` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::single-sample-sufficient` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::single-sample-sufficient` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::single-sample-sufficient` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::stale-baseline-comparer` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::stale-baseline-comparer` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::stale-baseline-comparer` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::subject-owned-truth-truster` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::subject-owned-truth-truster` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::subject-owned-truth-truster` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::used-samples-only-auditor` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::used-samples-only-auditor` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::used-samples-only-auditor` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::version-attribution-blind` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::version-attribution-blind` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `deployment-model-alias-rollout-drift::version-attribution-blind` | `prompt-injection-memory-poisoning` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::attention-budgeted` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::attention-budgeted` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::attention-budgeted` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::audit-forger` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::audit-forger` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::audit-forger` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::memory-refuser` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::memory-refuser` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::memory-refuser` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::nop-faker` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::nop-faker` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::nop-faker` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::over-blocker` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::over-blocker` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::over-blocker` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::provenance-dropper` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::provenance-dropper` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::provenance-dropper` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::recall-blind-executor` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::recall-blind-executor` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::recall-blind-executor` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::recency-over-provenance` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::recency-over-provenance` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::recency-over-provenance` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::same-session-resolver` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::same-session-resolver` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::same-session-resolver` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::secret-unmarked-writer` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::secret-unmarked-writer` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::secret-unmarked-writer` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::self-trusting-reader` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::self-trusting-reader` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::self-trusting-reader` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::summary-launderer` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::summary-launderer` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::summary-launderer` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::visible-origin-attributor` | `access-token-scope-expansion` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::visible-origin-attributor` | `delegated-wallet-scope-reconciliation` | `never-attempted` | no trial record exists |
| `prompt-injection-memory-poisoning::visible-origin-attributor` | `deployment-model-alias-rollout-drift` | `never-attempted` | no trial record exists |

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
