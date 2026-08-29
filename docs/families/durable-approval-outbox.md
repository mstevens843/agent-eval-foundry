# durable-approval-outbox

**Status: shipped; numbers are measured unless labelled otherwise.** Source:
`klavis-terminal-bench-task` at `c0e04eb` — 24 scenarios, 267 checks, reference 267/267, six
frontier trials (3x Opus 5 max, 3x Codex GPT-5.6-sol xhigh) all reward 0, $48.66.

## Problem

Between an approval and an irreversible side effect sits an outbox: it leases work, calls out, and
records what it did. Executing a payment twice, or recording one that never happened, is the failure
that costs money. The mechanism here is narrower than "distributed systems are hard": a fact read at
one moment is trusted at a later one, across a window in which another worker, a crash, or a
withdrawal can change it.

Three instances of that mistake are the first half, and an engineer who knows the exactly-once
pattern reaches them: an idempotency key derived from the lease rather than the action, a withdrawal
trusted from lease time, and an acknowledgement not conditioned on the held epoch. The second half
is what the pattern does not cover. The tool sometimes returns without saying whether the call took
effect, and a later receipt settles it. In between the engine holds an action it cannot classify:
presuming it landed invents a side effect, presuming it did not risks doing it twice.

## The agent-visible task

`/app/engine/` ships complete and working, and passes a clean serial queue and an ordinary
two-worker run. `/app/spec/SEMANTICS.md` is normative and complete and states every graded rule:
the gate's decision table, exactly-once, revocation ordering, the UNKNOWN/receipt contract, epoch
and lease semantics, completion, the append-only audit and its state machine, progress.
`/app/harness/` is read-only; the agent may run any seed, key count and schedule.

Nothing is withheld. `results/08` calls this the identifiability vise: fairness requires the rules
be fully stated and solvability requires the answer be derivable from rules plus data, so the agent
can always write a program that self-checks. Difficulty must come from coverage of a declared
behaviour space, not from secrecy.

## Hidden tests

24 points sampled from schedules x seeds {1009, 1013, 1021, 1031, 1049} x key counts {12, 16, 20} x
fault points x withdrawal timings x receipt delays. Two sub-regions carry the discrimination.

The first is the UNKNOWN pair: two scenarios identical in everything the engine can observe — same
call, same unknown outcome, same withdrawal at the same point — differing only in a fact that exists
inside the tool process. No rule computed from local state is correct on both.

The second is withdrawal after acknowledgement. `key_index` controls it: `k000` is worked first and
is reliably `ACKED` when a withdrawal lands, while later subjects are usually still in flight and the
branch is never reached. An earlier family used keys 7, 0, 3, 3; its single `key_index=0` entry sat
one parameter value from the failing point, and an engine scored 245/245 while still carrying the
`ACKED -> REVOKED` bug the suite existed to catch (`results/33`). The correction — six points at
`key_index=0` over 3 seeds, 4 timings, 3 worker counts, 3 receipt delays — changed nothing
agent-visible by a byte and turned 5-of-6 into 6-of-6.

> Validating that a trap is *robust* is not the same as identifying which parameter *controls* it.
> The old family was selected against an engine carrying the bug so broadly that every parameter
> looked like a trigger. Select against the narrowest-signal adversary available.

## Reference strategy

Key from the action, never the lease. Commit the intent under the held epoch before the call.
Re-read revocation and epoch inside execute, and condition every write on the held epoch. Lease with
`FOR UPDATE SKIP LOCKED`. Carry UNKNOWN in a durable `IN_DOUBT` state, record a *pending* withdrawal
rather than acting on it, and let the receipt decide — including that an action which crossed before
being withdrawn is recorded as having done both. The reference's `cancel_live` selects only `READY`,
`LEASED`, `IN_DOUBT`: `ACKED` is terminal and a late withdrawal appends nothing.

## Known-bad mutants

`delivery-keyed-idempotency` fails `check_exactly_once`: crash after_tool, reclaim at a higher
epoch, the key moves, the tool sees a key it never saw. `eager-resolver` fails
`check_audit_explains` or `check_revocation_ordering` on one half of the pair. `liveness-staller`
fails `check_completion`. `nop-faker` matters most: before `check_expected_executions` existed, an
engine that leased everything and revoked it itself scored a perfect reward with an empty ledger —
forbidding the wrong number of side effects is not the same as requiring the right ones.
`privilege-cheater` covers two real bypasses found and closed: the ledger rebind at import, and
reaching the ledger the engine is graded against.

## Why strong agents may false-positive

Measured: five of six wrote `ACKED -> REVOKED`; the sixth avoided it and stranded an action in
`IN_DOUBT` forever — two failure modes on opposite sides of one requirement, which is the signature
of a real difficulty rather than a narrow trap. What separated them was whether they built a checker
that could *express* the rule. Every Opus trial wrote its own verifier; two omitted a
transition-legality table, so their fuzzers ran clean over buggy engines. The one that added a
`LEGAL` table excluding `(ACKED, REVOKED)` is the only engine of six to pass the corrected family.
All three Codex trials built no verification tooling at all — 84 commands in one trial, none
invoking a self-written checker. The rule is stated three times in normative text the agent can
read; self-checking requires a checker complete enough to state it, and five of six never wrote
one.

## How to prevent unfairness

A receipt must exist for every UNKNOWN call, landed or not; otherwise refusing to guess is
undecidable. Nothing is graded on how fast doubt resolves. Every hidden point is validated against
the reference: one candidate at `(1009, after_invoke=11, key_index=0)` was rejected because the
withdrawal never fired there, so the reference would have "passed" a scenario that never happened.

## How to cheat-harden the verifier

Three processes. The scenario child is the only one that imports the engine, and its output is
treated as the engine's *claim*. A privileged collector arms and seals the tool without importing
engine code; assertions run over the sealed record. Withdrawals fire off the tool's own call count,
and the public socket has no verb that withdraws, reads the log, or hurries a receipt.

## Knobs for generating many instances

`seed`, `n_workers` (1-4), `crash_point` (`after_lease`/`after_tool`/`after_audit`/`after_ack`),
`withdrawal_after_invoke`, `receipt_after_invokes`, `key_index`, `unknown_landed` — the last visible
only inside the tool. A 36-cell sweep over the withdrawal region had the reference passing 36/36,
with 29 cells catching six or more subject engines.

## Honest risk that this family dies

It shipped, so the question is what kills it next. **Already-solved** is the live risk, not a
hypothetical: Opus's rate on this task is roughly one in two, and `results/29` records nine gated
attempts to add a second barrier, all killed — four because the strongest preserved engine already
handled the mechanism correctly. **Self-verifiable** is the standing structural risk: the rules are
public, so any new rule is one the agent can implement and check, and a ten-line brute-forcer
produced correct authorization proofs on 50 of 50 instances in a median of 179 operations. The
family survives on coverage alone, which is exactly what a stronger model erodes. Judgement, not
measurement: perhaps one more model generation.
