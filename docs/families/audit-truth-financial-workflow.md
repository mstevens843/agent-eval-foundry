# audit-truth-financial-workflow

**Status: candidate. Nothing here is measured — no instance has been built, screened or trialed.**
Cost figures are estimates; source-project results are measured and cited by path.

## Problem

In a regulated approval workflow the audit trail *is* the deliverable: a regulator asks not what
state an item is in but what the system believed on the fourteenth, and under what authority. Two
obligations pull against each other: never record a transition that did not occur, and never erase
one that did — including under correction and reversal, where the natural move is to make the past
agree with what is now known.

What makes this more than logging is bitemporality. Every fact carries a transaction time (when the
system learned it, append-only) and an effective time (when it applies). A delegation revoked today
effective last Tuesday does **not** make last Wednesday's approval unauthorized in the record; it
appends a finding as of now and reopens the item. An implementation that collapses the two clocks
produces a trail that is internally consistent, chains perfectly, agrees with the terminal state —
and asserts a transition that never happened. The source project measured five of six frontier
engines writing that shape's analogue, the illegal `ACKED -> REVOKED` edge (results/34, results/31).

## The agent-visible task

Build the trail-keeping service. Inputs: a regulator event bus of workflow events including
retroactive authority changes and reversals, plus an authority service answering point-in-time
queries. Outputs: an append-only trail and answers to `as-of(tt)` queries. The eight rules are in
the shape file; the load-bearing ones are authority-as-of, non-rewriting of the past under
retroactive authority change, and terminality for reopened items. No rule is hidden.

## Hidden tests

Sampled from the shipped fixtures' own grammar, weighted toward corners those leave thin:
`as-of` queries at transaction times strictly *between* an event and its correction; retroactive
authority changes whose effective time precedes an already-terminal approval; and reversals of
reversals. Shipped fixtures sample the easy interior, so generalising and interpolating score
identically on what the agent sees. Since validating that a trap is robust is not the same as
identifying which parameter controls it, the generator must be fuzzed over `retroAuthorityTiming`
and `asOfQueryDensity` before promotion.

## Reference strategy

`as-of(tt)` is a replay over immutable entries at or before `tt`, never a read of current state.
Entries come from an explicit legal-transition table that rejects at write time, the discipline the
one engine that avoided the source project's central bug used. Authority is resolved at the
approval's transaction time and never re-resolved against a later graph. A retroactive change
appends a finding as of now plus a reopen entry per affected item, leaving earlier entries
byte-identical. Segregation of duties is enforced at recording time on all three paths, including
re-approval after reopen.

## Known-bad mutants

`audit-liar` keeps current state plus a version column and renders history on read; it agrees at the
endpoints and diverges at every intermediate `as-of`. `policy-bypasser` evaluates segregation of
duties at submission, or against the current delegation graph rather than the graph as of the
approval. `oracle-prober` tunes until the shipped linter is silent rather than to the spec.
`privilege-cheater` writes to the authority store or notary chain, descendant of three real bypasses
closed in the source project.

## Why strong agents may false-positive

Every check a competent agent writes unprompted will pass: append-only (if you only inspect the
visible latest rows), continuity, terminal agreement — the trail was *built* from the terminal
state. That is the measured shape from the source task, where two frontier runs ran fuzzers with no
legal-transition table clean over their own engines. None of those checks asks the question that
matters here: does `as-of(tt)` return what was knowable at `tt`? An implementation that never
materialised that question cannot fail it locally.

## How to prevent unfairness

State the transition table, the authority algebra, and the `as-of` tie-break at equal timestamps —
each is a place two reasonable engineers diverge, and a graded answer resting on an unstated
convention is an auto-reject on hidden requirements. The authority service must answer every
`(actor, authority, tt)` the graded queries touch. Grade trail content and query answers, never
schema, field order or wording. Refusing a legally authorized approval must fail as hard as
recording an unauthorized one, and terminality is asserted eventually, never on latency.

## How to cheat-harden the verifier

Replay expected answers from the bus and authority service where the workflow cannot reach them,
resolved *before* it is imported. Check the notary chain independently of trail self-consistency, so
an implementation that rewrote earlier entries and then made everything agree still fails; internal
consistency is never evidence of append-only behaviour. Give entry counts a floor — a trail
recording almost nothing has fewer chances to write an illegal entry and must not profit from that —
the reasoning that made a no-op engine scoring 113/113 a standing negative oracle. Treat the shipped
linter as an attack surface, and randomise fixture identity.

## Knobs for generating many instances

`correctionLag` is the width of the window in which a bitemporal implementation and a single-clock
one differ; at lag 0 they are indistinguishable, which is where shipped fixtures sit.
`retroAuthorityTiming` carries the family. `delegationDepth` exercises chain evaluation as of the
approval's own transaction time; `reversalChainLength` is where a mutable version column stops being
able to answer at all; `asOfQueryDensity` decides whether graded points land where the designs
differ; `seed` defeats fixture recognition.

## Honest risk that this family dies

**Most likely killer: self-verifiable.** This is the identifiability vise from results/08, and the
family walks into it more directly than the outbox did. The deliverable is a deterministic pure
function of two fully-declared inputs: no concurrency, no faults, no external nondeterminism, no
unknown outcome — every ingredient that made the outbox's behaviour space uncoverable is absent. An
agent can write that reference in an afternoon, diff its service against it, and win.

The counter-argument is only an argument: that reference encodes the agent's own belief about
retroactivity. If it believes a retroactive revocation invalidates the past approval, its reference
says so too, and the diff runs clean over a wrong implementation — the measured shape of the source
project's central result, where an engine's own checker confirmed green on precisely the reasoning
that was wrong. The family is a bet that bitemporal retroactivity is a belief agents hold wrongly
and confidently rather than a rule they look up, and that bet should be settled by a screen against
preserved engines before a build hour is spent.

Second: **unfair-or-defused**. Bitemporal edge cases — ties at equal transaction time, simultaneous
corrections, whether reopen resets effective time — either get nailed down, in which case the agent
implements them and they stop being hard, or they do not, and a correct implementation is marked
down for a defensible reading. Same vise, other side.

Least likely: **already-solved**. This is *not* a re-skin of the durable outbox: it shares one
mechanism and none of the others, there is no external side effect to make exactly-once, no lease
and no crash-recovery boundary, and the graded artifact is a query interface rather than a state
machine's terminal states. It will die for its own reasons.