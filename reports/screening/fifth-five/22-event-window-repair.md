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

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `event-window-repair-attempt-1`, package digest
`39ca36d3e401ee3ddce6c772b8033be619078ea79598f1162329063824909258`, route
`professional-multifile/authority-process@1`. Dispatched through this session's
`real-provider` execution route (signed JobStore reservation, Ed25519, realm
`real-provider`, `billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`)
— a fresh campaign slot (`attempt-1`), not an infrastructure retry of any prior run.
Author image `sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`
(`foundry-provider-agent-portfolio:2026-09-07`). Evidence retained at
`.local/round-two-final-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/event-window-repair-attempt-1/`.

Target: **codex**. Requested `openai/gpt-5.6-sol`, effort `xhigh`, CLI
`scaffoldVersion 0.153.2` (verified baked into the pinned author image). Observed
from runtime events: model, effort and scaffold version are not exposed by the
codex CLI's event stream and remain unobserved — a known instrumentation limit,
not a data quality problem.

Dispatched 2026-09-09T17:31:23.413Z as one of five reservations installed within a
334ms window (17:31:23.079Z–17:31:23.413Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently, so this was a genuinely concurrent
five-way campaign, not sequential dispatch. A sixth, separately-authorized job
(route-policy-repair, a retry of a package interrupted in an earlier campaign) was
deliberately dispatched roughly 102 seconds later as an additional concurrent job on
this same host, bringing the round's total to three Claude and three Codex attempts;
that job is unrelated to this one's own valid execution. Completed
2026-09-09T17:40:19.543Z. Total elapsed ≈536,130ms (~8m56s) — the fastest and
leanest job in this batch — with solver authoring time (capture wall clock)
≈526,529ms (~8m47s) and grading ≈9.6s. Token usage was the smallest in the batch
(206,036 input tokens, 177,920 cached; 15,823 output tokens; codex reports no price
estimate). Execution reached a clean `completed` state with no invalid-execution or
infrastructure error.

### B. What changed since Trial 1

The starter is now a single empty `subject.run` entry point (Trial 1's starter
already supplied separate frontier/identity/window/orchestration modules and a
visible test suite); the engineering record above confirms the checker bank grew
from Trial 1's 14 candidates to 15, adding a control where a service produces
correct output but stops without consuming the terminal `null`, which must fail
`completion`.

### C. Results

**Reward 1 — a clean pass on both required deliverables.** Service: all 27
protected scenarios pass, zero missing/unexpected IDs. Checker: `checkerRequired:
true`, `checkerPassed: true`, all 15/15 candidates correctly classified (0 missed,
0 false positives), including the new stopped-before-terminal-null control.
`reasonPolicy` is diagnostic-only; only the boolean verdict was graded.

### D. Observable solving behavior

The capture is lean — 22 events, 4 shell commands total. Codex opened by listing
files and searching the tree, then read `instruction.md`/`SEMANTICS.md` in full
before writing anything, and named the hard parts up front in its own words:
"deduplication before lateness checks, excluding idle partitions from frontier
calculation, and comparing simultaneous window publications without imposing an
artificial row order" — plus checking "the checker's host-record details so it can
reject incomplete consumption, not merely compare final aggregates." It then wrote
both `entry.mjs` and `checker.mjs` in one file-change action, with no starter code
to build from.

`entry.mjs` tracks per-partition `{watermark, active, ended}` state; the frontier
only advances to `Math.max(frontier, Math.min(...activeWatermarks))` when any
partition is active, or to `Infinity` once every partition has ended, and windows
close only once `start + width + lateness <= frontier`. Deduplication uses a
length-prefixed composite key (`` `${partition.length}:${partition}${id}` ``) so
that a partition name and an ID cannot collide when concatenated. `checker.mjs`
deliberately reimplements the same semantics as an independent reference model
(explicitly commented: "This keeps failures in entry.mjs from being repeated by
the oracle") rather than importing anything from `entry.mjs`, and validates timing,
output shape, complete input consumption and determinism from the observation log
alone.

Three rounds of self-testing followed, all captured verbatim, not just claimed:
1. A hand-built 11-event trace (negative-time windows, an idle/resume partition, a
   cancelling delta, a duplicate late event) checked against three verdict cases —
   the correct trace, a corrupted-count variant, and a variant with the terminal
   `null` read dropped — confirming the checker distinguishes all three
   (`{"ok":true}`, then two distinct rejection reasons).
2. A 300-trial seeded random-event generator (variable partition counts, widths,
   lateness, watermark/idle/resume/end sequences, deliberate ID reuse) run through
   both `entry.mjs` and `checker.mjs` together; the actual captured output reads
   `validated 300 randomized executions` — independently confirmed present in the
   raw capture, not inferred from the agent's summary.
3. A final adversarial audit of `checker.mjs` alone: re-running the same input
   twice and asserting byte-identical verdicts and an unmutated input snapshot
   (determinism/immutability), an opaque `[REDACTED_SECRET]`-token case, a
   deliberately mistimed late-event trace expected to fail, and — notably — an
   explicit `assert.equal(one.verdicts.__proto__.ok, true)` check, i.e. a
   prototype-pollution-shaped token probed against the verdicts object and
   confirmed to resolve correctly rather than being silently treated as a real key.

Its final completion claim ("300 randomized executions passed. Negative
timestamps, zero-total accumulators, duplicates, late events, idleness/resume,
malformed results, timing violations, determinism, and input immutability were
tested") matches both the actual capture and the final grading exactly — no
overclaiming found.

### E. Comparison and next step

Trial 1, working from a starter with most of the machinery already in place,
reached the same reward 1 with 14/14 on the checker in 7m41s. Trial 2, writing
both files from nothing against an empty starter, reached the same clean outcome
in 8m47s of authoring (8m56s total), compared with Trial 1's 7m41s of authoring and
against a checker bank one control larger. That is consistent with this package
remaining a low-difficulty result for this Codex pairing rather than one that
depended on the removed starter scaffolding — echoing Trial 1's own conclusion
that the intended behavior was already mostly correct and the remaining repair was
compact. Given two independent clean passes across different starter conditions,
retain its passing submissions as controls and prioritize observed reward-zero
candidates for the next failure-finding trials.

### F. Verified publication record — September 9, 2026

Reward **1**; service **27/27**; checker **15/15**. All **934** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-final-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-final-five.json). Earlier trial records are preserved.
