# model-alias-drift-sentinel

**Status: idea. All numbers below are estimates, not measurements.**

## Problem

An eval harness pins `vendor/assistant-pro` in its config and calls that string a pinned model. It
is an alias. The provider moves it, and every stored number in the results database silently becomes
a number about a different subject. Nothing errors. The suite that was supposed to notice cannot,
because it never recorded which model produced its numbers — model identity was an input it assumed,
not an output it stored.

The second half is the same disease in the environment. The harness works because of something in
the room it was authored in — a set variable, a preinstalled wheel, a leftover resolution cache. It
passes on the author's machine and in the first CI run, because CI inherits the base image, and
fails on a rebuild, which is the one thing a suite that runs once in one place never does.

Both mechanisms share a structure worth building a family around: the failure raises no signal when
it occurs, and the artifact that would have detected it is the artifact nobody wrote.

## The agent-visible task

A working harness, a mock provider process, a results store, and a manifest. The rules document
states in full: the response envelope carries a `resolved_model_id` separate from the requested
alias; a row without one is UNATTRIBUTED and may not be aggregated; calibration artifacts are bound
to the resolved id they were derived under; an aggregate spanning several ids must be reported
partitioned; every row must reach a terminal disposition before exit; and the harness must run from
its declared manifest alone.

The agent's job is to make the harness a sentinel: detect drift, invalidate what the drift
invalidates, attribute what can be attributed, quarantine what cannot, and finish.

Nothing is secret. This follows the identifiability vise recorded in `results/08`: fairness requires
the rules be fully stated and solvability requires the answer be derivable from rules plus data, so
the agent can always write the program that checks its own work. Difficulty must come from coverage
of a declared space, not from withheld rules.

## Hidden tests

Hidden instances sample the declared drift-event space: which of five drift schedules fires, at
which request index, and which envelopes lose their resolved id. Sampling weight concentrates on two
regions. The first is flap-back (`A -> B -> A`), where a harness holding one last-seen id compares
start against end, finds them equal, and reports a clean single-id aggregate over a run that spanned
two models. The second is drift landing between the calibration pass and the scoring pass, where
every response is well-formed and only the binding between calibration and subject is broken.

This is the sampling lesson from `results/33` applied before the fact. There, an engine carrying the
central bug passed because the hidden schedules aimed withdrawals at subjects usually still in
flight rather than at the one reliably acknowledged subject; the fix added no rule and re-aimed the
sampling. A family should aim it correctly on the first build.

## Reference strategy

Record the resolved id on every row at response time, never backfilled. Keep the observed id *set*
per alias, not a slot. Invalidate any calibration whose provenance id differs from the serving id,
and refuse to score that row rather than scoring it approximately. Give a missing resolved id its
own disposition. Drain everything. Declare every dependency and pass a functional check inside a
container built from the manifest alone.

## Known-bad mutants

`stale-state-reader` resolves once at startup and stamps that id everywhere; it dies on mid-batch
drift against the resolution log. `audit-liar` reconstructs the manifest from final state, so on a
flap-back it reports one id for a two-id run. `nop-faker` emits a complete results file without
issuing requests and dies on the request-count floor — not hypothetical: the equivalent engine
scored 113/113 against an empty ledger in the source project before that floor existed.
`oracle-prober` passes by reading the leftover cache and vanishes in the fresh container.

## Why strong agents may false-positive

The predicted split mirrors the measured one: on the source task five of six engines resolved doubt
too eagerly and one refused to resolve it at all, stranding an action forever. Here, most
implementations widen a missing resolved id into the requested alias — the code has a success branch
and an error branch and no third state — while a strong one builds the third state and then
quarantines everything, passing safety and failing liveness. Failing from both directions is the
signature that separates a real requirement from a narrow trap.

The reproducibility half has its own false positive: a green run in the container the agent is
standing in reads as a correct artifact.

## How to prevent unfairness

The resolved id must always be recoverable on some channel — envelope or replayable lookup — or an
implementation that refuses to guess has no legal route to a terminal state, and the task punishes
the right call. Quarantine is a graded success, but graded against rows that genuinely could not be
attributed, so over-refusal is not free. The fresh container is built from a base the manifest
names, never derived from the authoring image, or the check is circular. Output equality across runs
is never graded, since the backend is legitimately non-deterministic.

## How to cheat-harden the verifier

Ground truth comes from a collector that never imports harness code, reading only the provider
process's own sequence-numbered log. Request counts are asserted as a floor and a ceiling. The
grader compares the provider's recorded id against the row's claimed id, so echoing the requested
alias into the resolved field is caught rather than credited. A stubbed-provider cheat oracle ships
as a first-class artifact and must score zero, because stubbing makes every drift check pass while
measuring nothing about the real call path. That discipline is why three real bypasses were found in
the source verifier, two by writing the exploit and running it rather than by inspection.

## Knobs for generating many instances

`drift_schedule` (5 values), `missing_resolved_id_rate` (4), `undeclared_dep` (5), `alias_count` (3),
`seed` (4) — a 1200-configuration cross product. The point is not volume but that the hidden region
can be re-aimed cheaply after the first trial round rather than re-authored.

## Honest risk that this family dies

**Self-verifiable is the most likely killer.** Every rule is stated, the state space per row is
tiny, and the checker is short: compare `resolved_model_id` against the calibration provenance and
partition. `results/29` measured a ten-line brute-forcer producing guaranteed-correct authorization
proofs on 50 of 50 instances in a median of 179 operations, and killed the candidate for it. The
same shape is present here — an agent that writes the obvious invariant checker catches its own
flap-back bug.

The bet is that flap-back and the missing-id case are absent from the checker an agent writes,
because writing them requires already believing model identity is a per-row fact rather than a
config constant. That is judgement, not measurement, and it is the kind of judgement this project
has been wrong about before — by roughly 50x, in `results/08`'s Screen C. Second risk is
**already-solved**: pinning immutable ids is standard advice. The gate before any build is a
three-sample mini-trial on the flap-back schedule alone; if two of three engines partition it
correctly, the family is dead and costs nothing further.
