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

## Changes applied since this trial (2026-09-08)

This is the one case, of three label-attribution zeros in this batch, that a harness-level fix alone could not rescue — exactly as this report anticipated ("a public precise mapping" is what's actually missing). A shared multi-label harness fix landed first (see [17-analytical-reconciliation-repair](17-analytical-reconciliation-repair.md)); regrading this trial's preserved checker.mjs against it confirmed the prediction: still only 10/11 controls correctly named, because `drop-external-bookings`'s authoritative trace fails ONLY `bookings` (`domain.mjs`'s `preservation` check reads only the committed events array and has zero visibility into `externalBookings` — confirmed by two independent reads of the code), so there is no second, alternate-but-still-true label for the harness fix to credit.

**Root cause confirmed and fixed: a genuine documentation defect, not a code inconsistency.** `domain.mjs`'s six-check boundary was already internally coherent and matched the control-manifest's own labeling in every instance checked — but `SEMANTICS.md`'s external-bookings sentence used the word "Preserve," directly beside a check literally named `preservation`, without ever tying either word to the actual six checker-obligation names. A careful checker author reading "Preserve every externalBookings row exactly" would reasonably map that to the `preservation` check — exactly the mistake made here. Fixed: reworded that sentence to state explicitly that a dropped/altered externalBookings row names `bookings`, and added a new paragraph to `instruction.md` defining every check's scope (the same treatment given to a prior batch's `causal-replica-repair` package). Also clarified, addressing this report's other flagged ambiguity: a move applied to an already-cancelled occurrence has NO effect on scheduled fields either — the code was already unambiguous on this (verified against `reference/src/changes.mjs`'s `else if (!cancelled)` gate and a dedicated existing scenario, `case-029`), only the prose was under-specified. Zero `domain.mjs`, scenario or control changes — this is documentation-only, independently re-verified by a second, separately-dispatched investigation before being applied.

**This cannot retroactively change the recorded zero.** The already-submitted checker's own code still says `preservation` for this defect; the spec fix protects a *future* checker author from making the same mistake, it cannot rewrite an already-submitted implementation. Real build+validate confirms the fix breaks nothing (`local-valid: true`, every candidate including reference/alternative still pass).

**When trials run again:** a fresh attempt against this package should now correctly attribute a dropped external booking to `bookings`, since the contract explicitly rules out the `preservation` misreading.

## 2026-09-09 — Engineering successor prepared for Trial 2

**Ready for a second exploratory Foundry trial; no second model trial has run for this version.** This section is an engineering record, not a new reward result. Priority in the next group: 3/5. See the [selection and implementation report](../next-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-next-five-implementation.json). Earlier trial results and package descriptions above remain historical.

Replaced the supplied implementation modules with an empty entry point and completed both private service closures. Removed the worked rejection-label mappings; accept/reject is now graded and reason text is diagnostic only. The previous label-related zero remains historical evidence and is not credited as a demonstrated capability failure for this version. Retained the clarification that moving an already-cancelled occurrence does not change its scheduled fields, and retained all 31 scenarios. The independent private checker inverts civil-time offset intervals rather than using the grader's minute-by-minute search, and checks occurrence identity, cancelled history, attendee state and external bookings. The earlier instructions about mandatory reason names in this document describe prior versions and no longer govern this successor.

Local validation passed 16 service-assurance checks, including correct reference and alternative services, semantic failure of the untouched starter, repeatability and negative-control activation. The independent checker correctly classified 13/13 candidates: two correct implementations and 11 negative controls, with zero false accepts or misses. The Foundry export rebuilt identically and passed fresh recipient validation. All 22 native static checks passed. These controls are author-side evidence, not model attempts or proof that an unseen solver will fail.

Six native verifier integrity controls passed. That run matches the final native export digest. September 9 native preflight: this exact final export passed its Harbor oracle with reward 1 and nop with reward 0, with no infrastructure error. Nop rejects the missing required checker; Foundry assurance separately verifies the empty service starter fails semantically. All five packages in this group passed both native jobs. These are local checks, not Trial 2 model attempts.

Use this exact Foundry export:

- Directory: `.local/next-five-implementation-2026-09-09/release-ready/recurring-calendar-repair/export`
- Package digest: `3ab3d6dc391d7b438424d3b3784153b0f93675b762cf07351aefb6c7105397e6`
- Native build, with the validation boundary above: `.local/next-five-implementation-2026-09-09/harbor-final/recurring-calendar-repair`
- Native digest: `631657ce7c2a68b5796edc8cad938cd1463b9d73474efb7563d4058d4acfd915`

Both deliverables are required. The checker must return complete deterministic Boolean verdicts; reasons are optional diagnostics and submitted helpers are available. Public API, output schemas and observable requirements remain provided, without a worked implementation.

When Trial 2 finishes, append its actual model/profile, frozen package digest, service and checker outcomes, elapsed time, infrastructure exclusions and observed submission defects here. Do not overwrite Trial 1 or count an infrastructure error, an author control or an old label dispute as a new standard model failure.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `recurring-calendar-repair-attempt-1`, package digest
`3ab3d6dc391d7b438424d3b3784153b0f93675b762cf07351aefb6c7105397e6`, route
`professional-multifile/authority-process@1`. Dispatched through this session's
`real-provider` execution route (signed JobStore reservation, Ed25519, realm
`real-provider`, `billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`)
— a fresh campaign slot (`attempt-1`), not an infrastructure retry. The controller is
a verified adaptation of the prior top-five campaign's controller, reusing that
campaign's independently-built and re-verified `frozen-source/` runtime unchanged.
Author image `sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`
(`foundry-provider-agent-portfolio:2026-09-07`). Evidence retained at
`.local/round-two-next-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/recurring-calendar-repair-attempt-1/`.

Target: **codex**. Requested `openai/gpt-5.6-sol`, effort `xhigh`, CLI
`scaffoldVersion 0.153.2` (verified baked into the pinned author image). Observed
from runtime events: model, effort and scaffold version are all unexposed by the
Codex CLI's event stream and remain unobserved — a known instrumentation limit, not
a data quality problem.

Dispatched 2026-09-09T13:43:45.368Z as one of five reservations installed within a
230ms window (13:43:45.249Z–13:43:45.479Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently at launch — a genuinely concurrent
five-way campaign. Completed 2026-09-09T13:56:19.358Z. Total elapsed ≈753,990ms
(~12m34s) — solver authoring time ≈747,487ms (~12m27s), grading ≈6.5s. Execution
reached a clean `completed` state with no invalid-execution or infrastructure error.
(A separate sibling package in this same launch batch, route-policy-repair, was later
interrupted by a host memory-pressure kill of the controller process; that is
unrelated to this job, which had already finished and been graded well before that
kill.)

### B. What changed since Trial 1

Trial 1 (documented above) used **Claude**; this round the assignment switches to
**Codex** — any difference in outcome cannot be attributed to the same model
improving or regressing, only compared side by side. Per the engineering record
above, the starter is now a single empty `subject.run` entry point (Trial 1's
starter already supplied time/expansion/change-application/publication/orchestration
modules); the checker is a required, separately-graded deliverable; reasons are
diagnostic-only. The label-taxonomy defect that caused Trial 1's reward-0
(`preservation` vs. `bookings` for a dropped external booking) was fixed at the
documentation level before this trial — `SEMANTICS.md` and `instruction.md` now
state explicitly which check name each obligation maps to.

### C. Results

**Reward 1 — a clean pass on both required deliverables.** Service: all 31 expected
scenario IDs observed, zero failures, zero missing/unexpected IDs. Checker: present,
deterministic, `checkerRequired: true`, `checkerPassed: true`, all 13 candidates
(two correct implementations, eleven negative controls) correctly classified — 0
missed, 0 false positives. `reasonPolicy` is diagnostic-only for this package; only
the boolean verdict was graded.

### D. Observable solving behavior

48 captured tool-call events (24 command executions, 12 file changes, 5 progress
messages). The agent's own stated plan, verbatim from its first message: *"I'll read
the contract, API declarations, and checker input format first, then implement both
sides and exercise them against focused trace cases."* It followed that plan exactly:

1. Read `SEMANTICS.md`, `api.d.ts`, `CHECKER-INPUT.md`, the empty starter `entry.mjs`
   and stub `checker.mjs` in one pass (first command touched all of them together).
2. Stated the central edge cases up front, verbatim: *"original recurrence gaps
   remove identity entirely, while gaps introduced by exceptions or moves retain a
   skipped row; cancellation then takes precedence while preserving null schedule
   fields."* It explicitly chose to build **one shared deterministic model** —
   `reconcile.mjs`, a dependency-free, `Date`-free pure module implementing its own
   proleptic-Gregorian civil-date conversion (`daysFromCivil`/`civilFromDays`) so
   neither the service nor the checker can silently drift from each other or depend
   on the host's timezone database. `entry.mjs` and `checker.mjs` both import from
   it.
3. Wrote `reconcile.mjs`, `entry.mjs`, `checker.mjs` together (one `file_change`
   event lists all three: `checker.mjs` added, `entry.mjs` updated, `reconcile.mjs`
   added), then immediately re-read all three back before proceeding.
4. Ran `node --check` on all three files, then began targeted boundary testing —
   its own stated checklist: *"Gregorian rollover, weekly anchoring, offset
   gaps/folds, exception eligibility, cancelled-move behavior, and checker
   acceptance/rejection."* It exercised these via inline `node --input-type=module`
   heredoc scripts constructing hand-built `view` fixtures and calling `reconcile`,
   `subject.run` and the checker's `run` directly — not a separate test framework,
   but real executable probes against its own code, several of which failed on
   first attempt (one heredoc run exited 1 with a stack trace) and were corrected in
   the next command.
5. Iterated on `checker.mjs` four more times (four separate `file_change` "update"
   events) while testing it against constructed candidates. One probe explicitly
   used a candidate token of `__proto__` and checked the resulting verdicts object
   for prototype pollution (`{"verdicts":{"__proto__":{"ok":true}}}`) — a
   security-aware self-test of its own verdict-construction code, not something the
   task instructions asked for.
6. Ran `git diff` against the three changed files as a final review step, then a
   last combined `node --check` plus semantic smoke test before its closing message:
   *"The reconciliation and validator behaviors now agree on a pure,
   timezone-independent model. The validator also canonicalizes only the
   contract-declared fields, so reordered rows/attendees pass while duplicates,
   extra fields, wrong publications, and multiple successful commits fail."*

Its final completion message accurately described what it had built (service entry,
independent validator, shared recurrence model covering recurrence generation, DST
gaps/folds, exceptions, ordered changes, cancellations, bookings, external-booking
preservation, and commit-trace validation) — this matches the actual grading result;
the agent did not overclaim.

### E. Comparison and next step

Trial 1 (Claude, empty-starter era not yet in effect — it worked from a
substantially pre-implemented starter) reached the same service/checker correctness
(31/31, 13/13) but scored reward 0 purely on the since-fixed `preservation`/
`bookings` label ambiguity — not a capability gap. Trial 2 (Codex, empty starter, the
label ambiguity already resolved in the contract text) reached full correctness on
both deliverables and scored reward 1 cleanly. Starter removal did not visibly
increase difficulty for this package on this attempt: the agent still isolated the
task to two independent concerns (a shared timezone/recurrence model, and validator
logic built against that same model) inside 12.5 minutes. Given a clean pass here and
in causal-replica-repair/diagnostic-transport-repair from the prior round, this
package is a reasonable candidate to deprioritize in the immediate difficulty search
relative to packages with unresolved service or checker defects — one clean
exploratory pass does not establish six-run qualification, but nothing here suggests
this task currently discriminates model capability at this difficulty level.

### F. Verified publication record — September 9, 2026

Reward **1**; service **31/31**; checker **13/13**. All **770** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-next-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-next-five.json). Trial 1 is preserved.
