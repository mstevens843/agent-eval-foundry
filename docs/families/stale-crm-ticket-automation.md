# stale-crm-ticket-automation

**Status: candidate. All numbers below are estimates, not measurements.**

## Problem

Support automation reads a ticket, decides, and writes. Between the read and the write the world
moves: a human agent replies, the customer closes the ticket, a refund posts and the ticket becomes
terminal. Meanwhile the webhook feed delivers the same logical event three times with three delivery
ids, out of order. And the CRM's write acknowledgement is the same envelope whether the write
applied, was a no-op against an identical existing update, was queued for async processing, or was
rejected on a version conflict.

Three mechanisms meet on one line of code. The automation holds a version it read a moment ago
(`stale-state`), sends a write, receives an acknowledgement that does not say what happened
(`tool-result-ambiguity`), and decides whether to send a second refund (`duplicate-side-effects`).
None of them shows up in a suite whose events arrive once, in order, against a ticket nobody else
touched.

## The agent-visible task

A running automation, a CRM behind a socket, a webhook dispatcher, an outbound comms service, and a
rules document. The rules state: writes carry the version they intend to replace and apply only if
it is current; the CRM mutates at the step points named in the shipped schedule grammar; the
acknowledgement does not distinguish four outcomes and is not evidence of effect; the change log is
the only authoritative statement about what took effect; delivery is at-least-once and unordered;
outbound effects occur exactly once per logical intent across duplicates and restarts;
`CLOSED_REFUNDED` is terminal; and every accepted intent must reach a terminal disposition before
the feed drains.

That last pair is deliberately two-sided, and it is the same shape as the requirement that produced
opposite-direction failures across six frontier trials on the source task: never guess while the
outcome is unknown, and still finish work nobody cancelled.

## Hidden tests

Hidden instances sample the declared mutation-point space: which documented step point the CRM's
interleaved mutation lands on, crossed with duplicate multiplicity, the true meaning of the
ambiguous acknowledgement, and whether the ticket reaches `CLOSED_REFUNDED` before or after the
intent forms. Weight concentrates on `between-read-and-write` paired with a true outcome of
`rejected-on-version`, the one region where a correct implementation and one that trusts its
acknowledgement actually diverge. Every deciding rule is visible; only the coordinates are not.

## Reference strategy

Re-read the version immediately before the write and pass it as the compare-and-set precondition,
rather than reusing the version from when the event was first handled. Derive the idempotency key
from ticket id plus logical intent, commit it before the outbound call, and reuse it byte-identically
after a restart and on every duplicate. Model the acknowledgement as a sum type including the
indeterminate case and narrow it only from the change log. Refuse writes onto a terminal ticket and
record the abandonment rather than rewriting history to make the write legal. Drain every intent.

## Known-bad mutants

`stale-state-reader` supplies the version it captured at handling time and, with the mutation
between read and write, either clobbers a human reply or reports success for a rejected write.
`delivery-keyed-idempotency` keys on the delivery id, unique per copy, so at multiplicity three the
comms ledger holds three refunds for one intent. `eager-resolver` reads the envelope as success and
marks a rejected write applied. `duplicate-executor` writes unconditioned on the held version and
lands an intent on a `CLOSED_REFUNDED` ticket.

## Why strong agents may false-positive

Reads look free, so the model caches the row it read at the top of the handler and concludes that
because nothing on its own code path mutated the value, nothing did. It picks the delivery id as its
idempotency key, because within a single successful run every candidate key is unique and all of
them work; the key's job looks like uniqueness when its job is stability across crash and
redelivery. And its self-written checker encodes its own belief about what an acknowledgement means,
so the checker runs green over exactly the reasoning that is wrong — measured on the source task,
where the only engine that avoided the central bug was the one that wrote a legal-transition table,
a fuzzer and mutation tests against its own checker, while all three Codex runs built no
verification tooling at all.

The predicted terminal-state failure is the same instinct that produced `ACKED -> REVOKED` in five
of six engines, restamped: rewrite the terminal state so the pending intent becomes legal.

## How to prevent unfairness

The change log must always eventually answer whether a write took effect, or an implementation that
refuses to widen an ambiguous acknowledgement is stuck forever and the task punishes the correct
call. The CRM's dedup window is unbounded within the instance, so late reconciliation is not
punished. Every mutation point and crash point is reachable through the documented stepping API and
named in the schedule grammar. Windows are step-numbered, never wall-clock. Grading counts committed
effects, not retries or call counts.

## How to cheat-harden the verifier

Expected outbound effects are a floor as well as a ceiling: an automation that performs no side
effects trivially never duplicates one, and that exact degenerate engine scored 113/113 against an
empty ledger in the source project. The comms ledger and change log belong to processes the
automation cannot open under any role. Scenario inputs are regenerated from the seed rather than
taken from the automation's report. Ground truth is assembled by a collector that never imports
automation code — the fix for the measured bypass where an engine rebound the verifier's
ground-truth accessor at import time. Two cheat oracles, self-abandon-everything and
write-the-ledger-directly, must both score zero before any trial is bought.

## Knobs for generating many instances

`mutation_point` (4), `duplicate_delivery_multiplicity` (4), `ack_true_outcome` (4), `crash_point`
(4), `terminal_state_present` (2), `seed` (4): 2048 configurations. Unlike the other two families
the space is large in a direction the agent cannot enumerate, because it crosses interleaving with
delivery with crash recovery.

## Honest risk that this family dies

**Unfair-or-defused, by the exact route that killed `results/23`.** Fairness requires the change log
be readable at any time, because without it the ambiguity is undecidable. But "re-read the change
log after every write" is cheap, obviously correct, and something a competent implementation may
simply do unconditionally — at which point the ambiguity never bites and the trap is defused by the
hatch that makes it fair. That is not speculation: the v3 bounded idempotency window broke the
reference engine 7 out of 7 and was still killed, because the mechanism that makes such a task
solvable is the same mechanism that defuses its trap. The mitigation is to make unconditional
re-reading visibly expensive in the rules rather than forbidden — but a rate limit grades speed, and
the source project disallowed timing pressure outright, so I do not yet have a mitigation I believe
in.

**No-window is the second risk and it is measured.** In the source project an epoch race fired in 0
of 5 scenarios and snapshot staleness in 4 of 144 configurations, because a single-threaded driver
advancing one unit of work per step makes time-of-check and time-of-use adjacent. This family exists
only if the interleaving is a declared, deterministic, first-class feature of the driver rather than
a race — a build requirement, not a hope, and the first thing to prove.

**Already-solved is third and least likely,** since the source task's engines split five-to-one on
the analogous requirement rather than solving it.
