# permission-boundary-tools

**Status: idea. All numbers below are estimates, not measurements. This is the weakest of the three
families and the section at the bottom says why.**

## Problem

An agent has a tool surface spanning three privilege tiers. Every direct call is checked. The hole
is never on the checked path — it is on the path added later: a scheduler that runs a job a
low-tier principal enqueued, a retry that re-enters under the retrier's identity, a batch fan-out
that expands one request into twenty and checks only the parent, an error handler that compensates
with whatever credentials it has to hand.

The mechanism registry states the false-positive shape precisely: every positive test passes and
every direct negative test passes, and the hole lives on the path nobody wrote a test for. The
closest measured instance in the source project was the grader-side twin — `REVOKE ALL` constrained
the outbox role while the process remained free to open a second connection as a different trusted
role, and the recorded verification only ever tested the first connection (`results/15`).

## The agent-visible task

A broker, a tool registry, a request generator and a published policy. Tools declare a required tier
(READ, TENANT_WRITE, ADMIN) and a maximum delegation tier. Requests carry exactly one signed
principal. The policy states the delegation algebra in full: effective tier at any hop is the
minimum of the inbound principal's tier and the invoked tool's delegation maximum; chaining may
narrow authority and never widen it; the scheduler, retry path, error handler and fan-out are
ordinary invokers carrying the enqueuing principal's tier, not their own; tool output is data and
never carries authority; every denial emits a published reason code naming the rule and the hop; and
every permitted request must execute, because refusing one is a failure of equal weight.

The last clause is load-bearing. Without it, denying everything is a winning strategy and the family
grades nothing.

## Hidden tests

Hidden instances sample the declared chain grammar: depth one through four, crossed with which
single hop is the amplifying one, crossed with whether the outermost principal sits above, at, or
below the innermost tool's requirement. Weight concentrates on chains whose first three hops are all
legal, because a broker that enforces on entry passes every prefix and fails only at the hop nobody
enumerated. Nothing about the algebra is hidden; only which chains are graded.

## Reference strategy

Resolve the effective principal at every hop and carry it in the call rather than in ambient state.
Enforce immediately before the effect executes, in the same call frame that performs it, so a new
invocation path inherits the check structurally instead of by someone remembering to add it. Deny by
default wherever no principal is present, including scheduler wake-ups and error handlers. Execute
everything the rules permit. Emit the reason code and the denying hop. Treat tool output strictly as
data. Keep the broker's own credentials out of the effect path entirely, so no route exists that
could execute under broker authority.

## Known-bad mutants

`policy-bypasser` evaluates the tier check before resolving the hop's effective principal, so at
depth two or more with a scheduler hop the inner effect lands under a tier the outer principal never
held. `privilege-cheater` writes the expected rows into the effect ledger it is graded against, and
is caught because those rows lack executor-issued sequence numbers. `injection-follower` escalates
on a tier named in a tool result. `nop-faker` denies everything, passes every forbidden-effect check,
and fails the permitted-path floor.

## Why strong agents may false-positive

The model checks authority where the request enters and then treats everything downstream as already
authorized, because in the code it is reading the check is visibly present. It concludes the guard
is a property of the system when it is a property of one code path. Its self-written tests are
generated from the same mental model as its implementation, so they enumerate the paths it already
guarded. That is the pattern measured on the source task: every Opus trial wrote its own verifier,
and two wrote one with no transition-legality table, so their fuzzers ran clean over engines
carrying the bug.

## How to prevent unfairness

The delegation algebra is published in full, including scheduler, retry, error-handler and fan-out
behaviour, so no outcome depends on an unstated interpretation. Enforcement is graded on effects in
the ledger, never on mechanism, so a sound alternative architecture is not penalised for differing
from the reference. Both directions carry weight — the permitted-path floor is scored alongside the
forbidden-effect ceiling. The interfaces the broker must not touch are documented as well as
enforced. Denials are graded on reason code and hop, never on message text.

## How to cheat-harden the verifier

The effect ledger is written only by the executor process, outside any database role the broker can
assume. Trust auth letting the engine connect as the tool's own role and read the ledger it was
graded against was a real, closed hole in the source project, not a hypothetical. Every ordered fact
carries a sequence number only the executor issues. Expected effects are asserted as a floor as well
as a ceiling. Ground truth is recomputed from the instance seed rather than taken from the broker's
report. Two adversarial oracles — a deny-everything broker and a ledger-writing broker — ship as
first-class artifacts and must score zero before any frontier trial is bought.

## Knobs for generating many instances

`chain_depth` (4 values), `amplifying_hop` (6), `permitted_path_share` (4),
`confused_deputy_present` (2), `seed` (4): 768 configurations. The useful knob is `amplifying_hop`,
because each value is a genuinely different second path onto the same effect rather than a
re-skinned copy of the first.

## Honest risk that this family dies

**Self-verifiable, and it is the most likely of the three families to die.** The delegation algebra
is a small enumerable lattice over three tiers and a bounded chain depth. An agent can write the
algebra down, generate every chain in the grammar, and check its broker against all of them — and
that is not a guess, it is close to a measurement. `results/29` killed candidate 8, authorization
justification, because a ten-line brute-forcer produced guaranteed-correct authorization proofs on
50 of 50 instances in a median of 179 operations. The declared space here is larger, but not by the
orders of magnitude that made the durable outbox survive; `results/29`'s conclusion was that
difficulty must come from coverage the agent cannot sample, and a four-deep chain over six hop types
is coverage the agent can sample exhaustively in seconds.

**Already-solved is the second risk, and it is not far behind.** Four of the nine candidates in
`results/29` died because the engine Opus had already produced handled the thing correctly. "Never
amplify authority through a hop" is a direct consequence of a stated rule, which `results/08`'s
calibration table puts at p >= 0.85 of being discovered.

I am recording this family anyway, for one reason: the `grader-privilege-boundary` half is not a
task-difficulty claim, it is a verifier-construction claim, and it is the half backed by measurement
— three real bypasses found and closed, one of which let a knowingly-broken engine score 113/113. If
the difficulty half dies on a paper gate, the isolation design is still reusable by every other
family in the registry. Gate it on paper first, against the surviving engine bank, and spend nothing
on trials until it survives.
