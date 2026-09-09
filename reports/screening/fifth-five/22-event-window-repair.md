# 22 — Event window repair

## Outcome

Codex, requested Sol / xhigh, completed in **7 minutes 41 seconds**, with **reward 1**.
The service passed **27/27 protected scenarios**. Its checker correctly classified
**14/14 candidates**—two correct implementations and twelve negative controls—and
supplied an actually violated public obligation on every rejection. No invalid execution
was recorded. This run used the corrected, explicitly public reason-grading policy.

## What the task was, in plain English

A streaming service groups events into time windows and publishes final totals when
all relevant partitions have progressed far enough. Each partition has its own watermark.
An idle partition temporarily stops holding the frontier back; an ended partition is
finished permanently. If every remaining partition is idle, time does not suddenly
jump to infinity. If every partition has ended, remaining windows can close.

The service must deduplicate by partition plus event ID, preserve real windows whose
sum happens to be zero, and route genuinely late events to a separate output exactly
once. A correct final sum emitted at the wrong input boundary is still wrong: consumers
depend on publication before the next event is consumed.

The mechanism is a combination of event identity, aggregation, partition state and
publication ordering. All timestamps, bounds and frontier rules are public; this is
a small deterministic stream, not a full distributed streaming platform.

## What was in the package

The starter had separate frontier, identity, window and orchestration modules, a
visible test suite, precise semantics and API definitions. A standalone checker was
required in addition to the service repair. It received the complete original input
stream, window parameters, actual emitted rows/late events and their authoritative
input positions, plus observed API calls. It did not receive expected answers.

Protected grading used 27 service scenarios and fourteen checker candidates. Repeated
checker execution tested determinism. Correct alternatives could emit independent
windows in different orders. Real external observations, not service summaries, were
used to establish work and timing.

## What the agent actually did

The capture contains eight completed shell commands. The service delta is only
`src/frontier.mjs` and `src/identity.mjs`; it added `checker.mjs` but retained the
supplied window and service-loop implementations unchanged.

1. It changed frontier calculation from the greatest active watermark to the least
   active watermark, then kept the frontier monotonic by comparing with its previous
   value. The former calculation closed windows prematurely.
2. It separated no-active-partition cases: all-ended advances to infinity; all-idle
   holds the previous frontier. The starter conflated them.
3. It changed the deduplication key to a structured pair of partition and event ID.
   IDs reused legitimately across partitions no longer suppress each other's data.
4. It wrote an independent stream replay inside the checker, then compared output
   values, publication positions, late-event multisets, window uniqueness and consumed
   input. It used order-insensitive comparisons where the public contract permits them.

The visible tests and syntax checks passed. In inline shell scripts it built three
targeted correct traces, including equal IDs across partitions, an all-idle/resume
sequence, a zero-total accumulator, repeated late data and negative timestamps. It
then checked deliberately wrong values, wrong boundaries, missing late output,
duplicate windows and a trace with no reads.

Finally, it generated **300 randomized traces from its repaired service** and verified
that its checker accepted them without mutating the input. This is useful internal
consistency testing, but it is not 300 independent oracle validations: service and
checker share the author's interpretation. The separate protected bank provides the
independent result. These scripts are in captured command text rather than retained
new test files. One exploratory `git status` failed because the workspace was not a
Git repository; the agent recovered and continued, so that is not an invalid trial.

## Why the package was solved quickly

Most of the intended behavior was already correctly implemented. The event loop
already deduplicated before late routing, preserved accumulator counts and emitted
closed windows before advancing input. The actual repair reduced to a minimum-versus-
maximum decision, the all-idle distinction and a compound key. Those are compact,
explicitly stated rules that can be checked directly against a few small functions.

Requiring a checker did add implementation work, but the complete small input makes
independent replay straightforward. This attempt is evidence against treating this
version as a strong difficulty contender, despite its valid external grading and
collection of negative controls. It did not expose the intended incomplete-self-check
failure; the delivered service and checker both passed.

## What could make a successor stronger

First preserve this solved submission as a positive regression control. Combine
partition resumption, repeated late identities, zero-sum windows and exact closure
boundaries against narrow near-correct implementations to identify any remaining
coverage gap. Do not mistake a broader scenario count for new difficulty.

A materially stronger descendant may need a real ingestion/publication workflow with
additional legitimate cross-component obligations. Such a redesign must publish its
new semantics and validate attainability before being tested. Inventing inaccessible
future data, silently changing late-event rules, or merely making the stream larger
would not be fair hardening. Nothing in this pass establishes a new failure mechanism
or warrants claiming that the original successful submission is wrong.

## Evidence and limits

[Sanitized batch evidence](../evidence/2026-09-08-fifth-five.json) records timing,
original reward, service/checker counts, source changes, exact reason policy and
capture hashes. Raw commands and submitted files remain retained privately. This is
one exploratory attempt, not official qualification, a replicated solve rate or a
backend attestation. The analysis describes observable actions, not private reasoning.

## Changes applied since this trial (2026-09-08)

All three reviewers independently recommended no package change for #22 — the reward-1
result and clean 14/14 checker classification stand as genuine evidence of a well-built
package. No SEMANTICS.md-supported defect was found, and none is introduced here.

**One infrastructure inconsistency was found and fixed, unrelated to this trial's
outcome.** While auditing all five batch-5 packages for the class of bug found in #21
(a checker-required `input` field silently absent from a `runScenario` return object),
the canonical `fifth-five` development tree's `private/domain.mjs` was found missing
`input: { events: s.events }` — present in the frozen dispatch tree
(`source-fifth-v2`) this trial actually ran against. The real submitted checker reads
`cell.input.events` to recompute its own expected rows (`checker.mjs:122`); confirmed
empirically that removing this field causes 2 false positives (reference and
alternative both wrongly rejected for `completion`), and restoring it returns the
checker to **14/14 correct, 0 false positives, 0 missed, pass: true**.

**This trial was never at risk** — the frozen tree it actually dispatched against
already had the field; only the separate canonical development copy was stale. The
field has been added there for consistency, verified via real Docker build+validate
(`local-valid: true`) and a full free regrade of the real preserved checker. No control,
scenario, or check semantics changed. **When trials run again:** #22 should continue to
score exactly as it did here.

## Trial 2 preparation — final group (2026-09-09)

**Ready for second exploratory trials through Foundry or native Harbor.** Removed the public frontier, deduplication, aggregation and service implementations after completing private closures. Added an independent checker deriving rows and late events from raw input and observed publication boundaries. The terminal-null completion boundary is explicit. A new control produces correct output but stops after the final end marker without consuming the terminal response, and fails completion.

Local validation passed **18 assurance checks**, including a semantic failure for the untouched starter. Its independent checker classifies **15/15 candidates** correctly; reason text is diagnostic. The final native export passed 22 static checks, Harbor oracle reward 1 and nop reward 0, with no infrastructure exceptions. Both export formats reproduce. No model attempt was launched by this engineering work.

Foundry export: `.local/final-five-implementation-2026-09-09/release-ready/event-window-repair/export`. Package digest: `39ca36d3e401ee3ddce6c772b8033be619078ea79598f1162329063824909258`. Native export: `.local/final-five-implementation-2026-09-09/harbor-ready/event-window-repair`. Native digest: `6f1ee379fa6aed8db6bb5d98042c8c1b58fbb9d8cdc51651d7092e1ab3120cdc`. Suggested target: **Codex**, retaining the original model family. Append the eventual Trial 2 outcome below this engineering record; preserve Trial 1.

[Implementation and completed checks](../final-five-implementation-plan-2026-09-09.md) · [Exact evidence](../evidence/2026-09-09-final-five-implementation.json).
