# 18 — Recurring calendar repair

## Outcome

Claude, requested Opus 5 / max, completed in **27 minutes 16 seconds**. The service
passed **31/31 protected scenarios** and its checker correctly classified **13/13
candidates**. The original **reward is 0** because one of eleven negative candidates
was rejected under `preservation` instead of the grader's required `bookings` label.

This is a **reason-taxonomy alignment concern**, not a demonstrated missed defect.
The checker accurately described a deleted external booking. Unlike the two other
batch-4 label cases, the authority lists only `bookings` as failing here: its
`preservation` check happens to compare event rows, not external bookings. The public
contract requires preserving external bookings but does not define that internal
division between the two label names. Do not call this a clean capability failure.

## What the task was, in plain English

A scheduling exporter expands recurring series, applies source exceptions and requested
changes, and publishes occurrences plus room bookings. An occurrence's identity is
its original recurrence coordinate, not the time currently displayed on the calendar.
Moving a Monday occurrence to Tuesday must not make it a different occurrence or cause
a later change aimed at Monday to miss it.

Timezones are complete supplied offset/transition tables, not the machine's timezone
database. Some civil times occur twice; others do not exist. The earlier realization
is required for a repeated time, an impossible original recurrence is omitted, and a
moved occurrence landing in a gap remains a skipped history row without a booking.
Durations are elapsed minutes. Unaffected occurrences, attendee responses and external
bookings must survive the transformation.

This is a bounded fictional recurrence format, not a full iCalendar implementation.
The rules are explicit and the working set is small enough for direct expansion.

## What was in the package

The service had time, expansion, change-application, publication and orchestration
modules, public semantics/API definitions and visible tests. A standalone checker
had to reconstruct the required artifact from the original view and actual committed
events/bookings. Diagnostic reports were not authoritative.

Protected grading used 31 service scenarios and thirteen checker candidates—two
correct alternatives and eleven negative controls. Correct output ordering could vary.
Complete original inputs made independent checking possible without inspecting another
candidate's result or requiring a particular sequence of local calculations.

## What the agent actually did

The capture contains 48 shell calls. Only `src/time.mjs` and `src/changes.mjs` were
changed in the service; expansion, publication and orchestration remained untouched.
It added a substantial standalone checker and expanded the retained tests.

1. The old timezone conversion subtracted the initial offset and ignored transitions.
   The repair tries candidate offsets, computes each possible UTC minute, and retains
   only those whose active offset maps back to the requested civil time. It returns
   null for a gap and the earliest valid realization for a repeat.
2. Changes originally matched the current displayed start. The repair matches the
   original recurrence ID, using equality for a single change and the inclusive
   original-ID boundary for future changes.
3. A move originally rewrote the recurrence ID to the new display time. The repair
   leaves the ID intact, including when two occurrences end up displayed at the same
   time. That preserves event and booking identity across successive changes.
4. Its checker independently expands the supplied series, applies changes and compares
   actual event, attendee and booking records, treating ordering as irrelevant.
   It also uses successful commit observations to distinguish publication from a claim.

The final local suite passed **30 tests**. Captured self-verification includes 43,840
timezone probes against a brute-force minute scan and 1,008 series checks, with zero
mismatches reported. It also ran a 2,000-seed service/mutant sweep, reported as 80,000
candidate judgments, and benchmarked the checker at roughly 1.1 seconds for two calls
over 60 candidates × eight cells with about 130 MiB RSS.

These are the agent's own testing results, not 80,000 hidden scenarios. Some self-made
stress payloads exceeded the public joint transport-size guarantee, so they are
checker stress experiments rather than additional valid end-to-end task instances.
The agent removed its temporary `.scratch` tools before submission; their commands
and output remain captured, while the repaired source and thirty tests are retained.

## Where interpretation entered the result

The sole private-label miss was `drop-external-bookings`. The checker rejected it as
`preservation`, explaining that the named foreign booking was not preserved exactly.
The service authority marked `bookings` false and `preservation` true, because the
latter implementation only compared generated event rows. The public instruction
lists both names but does not say preservation excludes external bookings.

This is different from a checker accepting damaged output. Every bad candidate was
rejected and every correct candidate accepted. A label taxonomy needs a public precise
mapping before disagreement with its hidden implementation can measure model ability.
Keep the original zero and annotate the concern; do not silently relabel it as a pass.

The agent also raised a separate semantic ambiguity: does moving a cancelled occurrence
leave its scheduled fields untouched, or change those fields while leaving it cancelled?
It chose the starter's skip-cancelled interpretation. Its own alternative initially
accepted both interpretations, then became stricter after observing that permissiveness
masked a boundary mutant. That is not a sound way to settle an ambiguous specification:
the fact that one reading catches a mutant does not make it the required reading.
The service passed the frozen suite under the chosen interpretation, but future versions
should state the intended behavior directly and validate appropriate alternatives.

## What to improve next

The package elicited real timezone and identity reasoning, substantial local tests and
a full checker, but the service defects still occupied two compact modules. The agent
found and repaired all of them within half an hour. The observed zero does not show
that its self-check missed the intended calendar defect.

Clarify label scope and cancelled-move semantics first. Then consider stronger legitimate
interactions between successive changes, exception identity, gaps/repeats and preservation,
validated against narrow near-correct implementations. Do not introduce timezone facts
outside the supplied complete tables or require one recurrence library. More calendar
volume alone is not evidence of a better difficulty mechanism.

## Evidence and limits

[Sanitized batch evidence](../evidence/2026-09-08-fourth-five.json) retains the original
reward, service/checker counts, timing, changes and capture hashes. Original authority
results and checker reasons establish the label disagreement without rerunning the
submission. This is one exploratory attempt and an analyst's alignment assessment,
not independent blind adjudication, a replicated failure rate or backend attestation.
The narrative uses observable actions and submitted artifacts, not private reasoning.
