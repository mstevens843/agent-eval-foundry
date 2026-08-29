# deployment-rollback-partial-effects

**Status: candidate. Nothing here is measured — no instance has been built, screened or trialed.**
Every number in the shape file is an estimate; sources are cited by path.

## Problem

A release rolls out across regions and someone aborts it partway. Some regions are fully applied,
some half-applied, one is holding an apply call that returned without saying whether it took effect. Rollback is not the inverse of apply, because the world has no undo: a DNS cutover
propagated, a migration published a version other services already read, a partner got a
notification. Some effects can be compensated by a *second* external effect, itself exactly-once and
itself interruptible. Some cannot be compensated at all; the only correct handling is to record them
and roll the region *forward* instead.

What makes this more than plumbing is two failure directions one rule cannot cover. Compensate
eagerly and you emit a real external write with no cause. Compensate timidly and a region sits
unresolved forever while regions depending on nothing wait behind it. That is the shape measured on
the source task: five of six frontier engines resolved doubt too eagerly, the sixth refused to
resolve it at all (FINDINGS.md §1).

## The agent-visible task

Repair an orchestrator driving a release DAG. The agent gets the effect catalog with each effect's
reversibility class, the transition table, the fault model, and a harness generating topologies and
interleavings. The load-bearing rules: compensation is exactly-once per `(stage_id, effect_id)`;
an `UNKNOWN` effect may not be rolled back, re-applied or compensated until the region ledger settles
it; compensating an effect that never fired is a violation, not a harmless no-op; and a region holding
a fired `IRREVERSIBLE` effect must roll forward to a pinned repair version rather than down past its
watermark. Nothing is secret — the constraint from results/29 is public rules, enormous behaviour
space, hidden graded region.

## Hidden tests

Drawn from the same grammar as the shipped fixtures, weighted toward two thin corners: aborts
arriving between an effect firing and the orchestrator recording that it fired, and regions holding a
fired irreversible effect whose predecessor is being rolled back concurrently. A sampling statement,
not an extra rule. Validating that a trap is robust is not the same as identifying which parameter
controls it — an earlier source-project artifact scored 5-of-6 because coverage sampled the wrong
parameter — so the generator must be fuzzed over `faultPoint` and `abortArrivalStep` against the
strongest available engine before promotion.

## Reference strategy

Persist per-effect intent, key and class before invoking. Derive every apply and compensation key
from `(release_id, stage_id, effect_id)` alone, byte-identical across restart, repeated abort and
rollback re-entry. Park `UNKNOWN` effects, settle them only from the region ledger. Pick rollback,
compensation or roll-forward from the catalog and the watermark, never from the orchestrator's belief
about what it did. Drive rollback from durable per-effect records so re-entry resumes rather than
restarts. Drain everything terminal while independent regions keep moving, and report from the
ledgers.

## Known-bad mutants

`eager-resolver` compensates an effect it does not know fired, and dies where the ledger settles
NOT_FIRED. `delivery-keyed-idempotency` folds the abort attempt into the compensation key and
double-compensates on `during-rollback-reentry` — invisible in any single clean pass, because there
both keying schemes are unique per effect. `liveness-staller` parks forever and dies on
end-of-schedule terminality. `nop-faker` applies nothing and reports everything cleanly rolled back;
the source project measured that engine at 113/113 with an empty ledger (results/15), which is why
effect counts have a floor.

## Why strong agents may false-positive

Every safety assertion the agent is likely to write passes. An orchestrator that never compensates
never double-compensates; one that halts on first doubt never writes a wrong effect. The agent writes
a property checker, runs it over its own engine, and the checker encodes its belief that a parked
region is legitimately parked — measured on the source task, where one engine's checker explicitly
treated a withdrawn `IN_DOUBT` action as acceptable. Reversibility class invites a second false
positive: it is a lookup, so it *looks* handled once written, while the graded question is when the
watermark is consulted.

## How to prevent unfairness

Ship every reversibility class and compensation in the catalog; none inferable only from reference
behaviour. Guarantee every `UNKNOWN` is settleable within a stated bound, for effects that fired and
effects that did not — the source project had to guarantee receipts for both cases or a correct
implementation is punished for refusing to guess. Assert ledger state and effect counts, never
internal representation, storage layout, or visit order. Read no wall clock. Grade over-refusal, or
the family rewards paralysis.

## How to cheat-harden the verifier

Bound effects from below as well as above. Read region ledgers and the downstream feed from their own
processes, and resolve expected values *before* the orchestrator is imported — one measured bypass was
an engine rebinding `harness.tool.calls` at import, after which a genuinely double-executing engine
scored perfectly. Provision credentials so a password-authenticated connection to any ledger-writing
role fails, and test that rather than trusting a `GRANT`; a third bypass was a privilege hole letting
the engine reach the ledger it was graded against. Randomise scenario identity between runs, and keep
the no-op and per-attempt-keyed orchestrators as standing negative oracles.

## Knobs for generating many instances

`regionTopology` separates a blast-radius error from a correctness error. `reversibilityMix` decides
whether the correct terminal is rollback, compensation or roll-forward. `faultPoint` separates stable
keying from per-attempt keying, and only two of its five values do so. `abortArrivalStep` sweeps the
abort across the apply front. `ledgerSettleDelay` separates parking-and-draining from both guessing
and stalling. `seed` defeats fixture recognition.

## Honest risk that this family dies

**Most likely killer: already-solved, in its re-skin form.** Roughly half the check surface here is
the durable outbox with regions substituted for actions — persist intent, stable key, park the
unknown, drain to terminal. An agent carrying that pattern gets that half free, and under this
project's own axis meter those instances would likely produce catch sets *nested inside* the outbox
instances' against the ten preserved engines: more instances, no new axes.

Two things are, in my judgement, genuinely not the outbox. Compensating a non-fired effect is itself
a graded external write, so both errors are *positive* violations rather than one violation and one
absence. And roll-forward requires moving *away* from the requested target state, which has no
analogue in a system that only ever drains. Whether those two carry the family is what a gate should
answer.

**That gate is cheap and runs first:** score a candidate instance set against the ten preserved outbox
engines before spending build hours, and kill every instance whose catch set nests inside an outbox
instance's. Eight of ten source-project design cycles were killed for $0 by gating before building;
the two built first cost two days and a paid trial each.

Second most likely: **self-verifiable**. This is a declared catalog over a declared state machine, so
a disciplined agent writes a model checker and finds its own bug — which is what the one engine that
avoided the source project's central defect did. The defence is coverage, a bet this family has not
yet won.
