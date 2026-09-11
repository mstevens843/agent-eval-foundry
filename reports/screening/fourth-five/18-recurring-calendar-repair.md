# 18 — Recurring calendar repair

**Final 3.0.0 screening result (September 11): 6/6 counted trials returned reward=0, with three Codex and three Claude trials.** This task is one of the [qualifying tasks](../final-results-2026-09-11.md). Full historical trials, audits and excluded attempts remain below.

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


## September 10, 2026 — successor 3.0.0 engineering (no new model trial)

This is a new task version, not a regrade of the successful Trial 2 package. The
original trial evidence and interpretation above are retained verbatim. At the
start of this work all 171 maintained files matched the frozen Trial 2 exports.

### New business requirements and prior simplifying strategy

Versioned series/zone/changes/window records merge by greatest per-record revision, including tombstones. Each delivery must leave persistent source, materialized events and bookings in an atomic generation before acknowledgement. Windows select original recurrence coordinates; moves retain identity; unrelated bookings survive.

The saved Codex solution could materialize one complete snapshot and commit once. Full recomputation is still valid, but it must now reconcile retained state across retroactive, duplicate and out-of-order changes, stale generation fences and response-loss recovery.

### Additional coverage and implementation evidence

Original weekly anchoring, exception/future-change precedence, cancellation, elapsed duration and explicit gap/fold rules remain. Added multi-delivery amendments, publication-window changes, source deletion, concurrent unrelated bookings and six-series/multiple-transition combinations.

The independent interval-inversion alternative publishes rows in a different order and recovers from an invalid request. Arrival-order merge, append-only owned bookings, dropped foreign bookings and displayed-time window filtering are rejected. An implementation-stage collector duplication exceeded 16 MiB; removing redundant per-process history fixed it without raising limits.

Complete private service and checker references, authority/schema updates, legal
alternatives, controls and reproducible Foundry/native Harbor exports are included.
Public core entry points remain empty. The new service reference and alternative
pass 35/35 scenarios; the reference checker passes 11/11 candidate traces.
Untouched starters fail semantically and lack the required checker. These are local
engineering validations, **not provider/model trial results or hardness evidence**.

No new defect in the earlier successful submitted code is asserted: its former
contract differs. Historical defect claims, where present above, retain their
original evidence and scope. The five separate successful finalists and their
standings remain unchanged; this successor adds zero to that count.

See the [consolidated implementation report](../next-five-successor-implementation-2026-09-10.md)
and [machine-readable evidence](../evidence/2026-09-10-next-five-successors.json)
for exact commands, native oracle/nop and integrity outcomes, full export digests,
resolved development failures and the subsequent grading-review handoff.


## Pretrial hardening of successor 3.0.0 — September 10, 2026

Fixed latest-generation acknowledgement bookkeeping after legal recovery. Added lost-ack-response and tombstone-resurrection cases; temporary source/event/booking corruption and missing acknowledgements are covered. Correct republication, reordered attendees and malformed-call recovery pass.

Reference service: **37/37**. Both complete correct alternatives pass. Required checker: **16/16** classifications over the full scenario population, with diagnostic-only reasons. Native oracle returns 1; untouched nop returns 0 without an infrastructure error. All nine native integrity controls pass.

Foundry export: `.local/next-five-hardening-2026-09-10/release-calendar-shapes/recurring-calendar-repair/export`. Digest: `8f438cc74fc23c4357caa4c2a6ce64edd068eb899b5c335bdecd81884444fde3`. Native export: `.local/next-five-hardening-2026-09-10/harbor-frozen-v2/recurring-calendar-repair`. Digest: `409ca52a6f5086d4e31e604d7cf5466cfe8d00641830c9c6174b40eb9fb99dc2`.

The [hardening report](../next-five-hardening-2026-09-10.md), [obligation map](../next-five-hardening-coverage-2026-09-10.md) and [evidence](../evidence/2026-09-10-next-five-hardening.json) record the added cases, mutation audit, protections and frozen artifacts. These are engineering checks before model trials, not another scored trial or a historical regrade. Prior trial results above are unchanged.

The final shape audit also reproduced an unknown source-record kind being accepted as a publication. The authority now returns the documented recoverable shape error. Calendar's final export above includes that fix and the positive variant that verifies recovery; oracle/nop, checker, integrity and recipient checks were rerun on those exact bytes.

## Trial 3 — hardened successor 3.0.0, attempt 1 — September 10–11, 2026

First model trial on the hardened 3.0.0 package, dispatched concurrently with the
other four hardened-next-five-trial-one packages at 2026-09-11T01:13:37.059Z
against the frozen `hardened-next-five-trial-one-2026-09-10` runtime (source digest
`153bdf9d0675e7d4ca59a7fe9b21430e887d24e889db7bbfb134e5dc4d7fa41d`). Requested
profile: `openai/gpt-5.6-sol`, effort `xhigh`, via Codex (`profileDigest`
`a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641`). Package
digest `8f438cc74fc23c4357caa4c2a6ce64edd068eb899b5c335bdecd81884444fde3`, matching
the hardened export above.

Reward **0**. Service **37/37** (`semantic-pass`) — the submitted repair itself
is correct. Checker **14/16** (2 false positives, 0 missed, deterministic): the
submitted checker incorrectly rejects `reference` and `alternative` — two
genuinely correct implementations — as false positives. A checker that rejects
known-correct implementations does not discriminate the contract's real
obligations, so the required-checker failure is a legitimate reward-zero outcome
under the task contract, not a grading artifact. 10m19s of authoring (capture
completed before the incident below), 665,003 input tokens (605,952 cached) and
29,023 output tokens (Codex CLI usage; no price reported). Job id
`recurring-calendar-repair-attempt-1`.

**Publication incident and recovery.** This attempt's capture, grading and
checker evaluation all completed normally, but the campaign's publish step then
raised `EVIDENCE_BYTE_LIMIT`: `publishEvidence`/`verifyEvidence` walked the
staged evidence tree (175 MiB — 37 checker-grade candidates, each contributing a
several-megabyte `process.log`/`result.json` pair, versus roughly 14–15
candidates pre-hardening) against a generic 128 MiB default that had never been
given an explicit, evidence-publication-specific budget. The job was left
"publishing" with its capture, grade and result already written to
`.incomplete/recurring-calendar-repair-attempt-1/` — an infrastructure incident
on publication, not a re-solve, a re-grade, or a change to the score above.

The fix, applied to the live repository (not the frozen campaign runtime): an
explicit `EVIDENCE_PUBLICATION_BUDGET_BYTES` constant (512 MiB) threaded only
into `publishEvidence`/`verifyEvidence` (`src/execution/artifacts.ts`);
`regularTree`'s own default and every solver-submission size limit
(`copyArtifactTree`, `package-route.ts`, `real-provider.ts`) are unchanged. For
future runs, the per-candidate `process.log` is now gzip-compressed at write
time (`src/packages/local-process.ts`, opt-in `logCompression: "gzip"`),
losslessly preserving stdout and stderr — including any diagnostic content not
captured in `result.json` — while removing the near-total byte-for-byte
duplication between `process.log` and `result.json` that drove the growth.
Both changes are covered by new local tests (no provider calls):
`test/execution-lifecycle.test.ts` (budget enforcement, tampering detection) and
`test/package-production.test.ts` (lossless gzip capture).

Because the frozen executor (source digest `153bdf9d...`) predates this fix and
its own executor-version guard correctly refuses to resume a job under a
different source identity, recovery did not resume the frozen campaign in
place. A separate, explicitly non-executor recovery tool
(`.local/hardened-next-five-trial-one-2026-09-10/publication-recovery-2026-09-11/recover.mjs`,
sha256 `ff5d5b53cc812d6a0a68a0508021cf5a7d18560393a80b02ea572ce89f06c4a1`)
independently re-verified the already-complete capture/grade/checker evidence
(byte budget, package/profile/executor identity, checker false-positive detail)
before publishing it, unchanged, with the live repository's corrected budget.
The original identity was read verbatim from the stage's own `prepared.json`,
never reconstructed. Published to
`real-campaign-frozen/jobs/real-provider/publication-recovery/recurring-calendar-repair-attempt-1`
(982 files, verified). A full incident/fix/recovery manifest, hash-linking the
recovery tool separately from the original executor, is at
`.local/hardened-next-five-trial-one-2026-09-10/publication-recovery-2026-09-11/manifest.json`,
and the original `dispatch-errors/recurring-calendar-repair.json` record is
preserved unchanged.

This is the first scored trial on the hardened 3.0.0 revision. It stands
independently of the Trial 2 (successor) pass recorded above; the earlier
package's contract, checker and scenario population all differ. See
[the campaign summary](../hardened-next-five-trial-one-2026-09-10.md) and
[sanitized evidence](../evidence/2026-09-10-hardened-next-five-trial-one.json)
for the other four packages' results.


## Independent post-trial audit — September 11, 2026

The recovered **reward 0** is confirmed. All 982 recovered files match their pre-recovery backup; no solve or grade was rerun during publication recovery. Separate offline invocations of the submitted checker reject the saved correct reference trace for `delivery old: no successful publication` and `delivery duplicate: no successful publication`, while the frozen reference checker accepts it. Those deliveries acknowledge an already current consistent generation; unchanged source does not require a fabricated fresh generation. The `-37` run-directory suffix denotes scenarios per candidate, not candidates; this bank contains 16 candidates. The original service pass and checker failure remain recorded.

See the [full independent audit](../../hardened-next-five-pass-audit-2026-09-11.md) and [hashed evidence](../../evidence/2026-09-11-hardened-next-five-pass-audit.json). This audit made zero provider calls and preserved the original trial records.


## Coverage-v2 integrated and next trial prepared — September 11, 2026

Existing duplicate-update acknowledgement coverage is retained. The saved service passes 37/37; its checker again rejects the valid reference and alternative (14/16). The original completed reward-zero evidence remains in publication-recovery, without a model rerun.

Public 3.0.0 instructions, interfaces and starters are byte-identical to Trial 3. The corrected private Foundry package is `e36fc1f3bd8ac60f4a6dab0683513e42693ecea397693d536198a3a10772a467`. Reference validation passes **37/37 service scenarios and 16/16 checker candidates**. Native oracle/nop and integrity checks pass. These are replays and engineering checks, not new model attempts; the historical reward remains recorded.

The next authorized run is **Trial 4**, one fresh **Codex** attempt alongside the other four packages. It has been prepared but not dispatched. See the [integrated coverage report](../next-five-coverage-v2-2026-09-11.md), [exact evidence](../evidence/2026-09-11-next-five-coverage-v2.json) and [operator handoff](../../../docs/hardened-next-five-trial-two-handoff.md).

## Trial 4 — 3.0.0 / coverage-v2 — September 11, 2026

The second model attempt on the unchanged public 3.0.0 contract, and the first fresh attempt graded under the corrected private grading revision coverage-v2. Campaign `.local/hardened-next-five-trial-two-2026-09-11/`, frozen runtime source digest `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`. Job `recurring-calendar-repair-attempt-1`, package digest `e36fc1f3bd8ac60f4a6dab0683513e42693ecea397693d536198a3a10772a467`, profile digest `a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641` (requested `openai/gpt-5.6-sol`, effort `xhigh`, via Codex). Dispatched 2026-09-11T03:55:41.302Z, completed 2026-09-11T04:09:25.819Z (13m45s wall; 738,363ms / 12m18s authoring per `capture.json`). Usage: 1,024,574 input tokens (976,768 cached), 35,922 output tokens (Codex CLI usage; no price reported). Published to `.local/hardened-next-five-trial-two-2026-09-11/real-campaign-frozen/jobs/real-provider/records/recurring-calendar-repair-attempt-1/`, independently re-verified this session (`verifyEvidence`): 977 files, all hashes match. No infrastructure error this time — `grading/process.log.gz` confirms the compressed-log fix and the 512 MiB publication budget both held.

Result: reward **0**. Service **semantic-pass, 37/37** scenarios (`grade.json`'s `evaluation`: `expectedIds`/`observedIds` match exactly, no `missingIds`/`unexpectedIds`/`problems`) — the submitted repair itself is correct.

The required checker failed, but not by making 16 individually wrong judgments. Coverage-v2 replaced the descriptive checker-grade candidate names used in Trial 3 (`reference`, `alternative`, …) with opaque per-run tokens for every candidate, specifically to test whether a submitted checker can safely use arbitrary key names — `grading/checker-grade/cases/cases.json` lists 16 such tokens for this package, one of which is literally the string `"__proto__"`. The submitted `checker.mjs` builds its verdicts as a plain object and assigns by bracket notation (`export function run({ cases }) { const verdicts = {}; ...; verdicts[token] = reasons.length === 0 ? { ok: true } : { ok: false, reasons: reasons.slice(0, 32) }; return { verdicts }; }`, lines 610–628). Because `Object.prototype.__proto__` is an inherited accessor, assigning to a plain object's `"__proto__"` key via bracket notation never creates an enumerable own property — it either reassigns the object's prototype or is a no-op. Directly inspecting `grading/checker-grade/checker-process.log` confirms this: the emitted verdicts object has exactly 15 of the 16 expected keys, missing only `"__proto__"`.

The frozen grading harness's `completeVerdicts()` shape check (`src/packages/checker-contract.ts`) requires an exact key-count match against every expected token; one missing key sends `gradeChecker()` (`src/packages/portfolio.ts`) into its synthetic catch-branch fallback (`deterministic: false, correct: 0, missed: total, falsePositives: 0, pass: false`) instead of a real per-candidate score — which is why `grading/checker-grade/grade-summary.json` does not exist for this attempt. The reported "0 correct" is a harness-level shape-gate artifact triggered by one specific object-literal-as-dictionary bug, not a demonstrated finding that the checker misjudged all 15 other candidates. It is nonetheless a real, reproducible interface-coverage defect — a plain object is an unsafe dictionary for untrusted opaque string keys — and the required-checker failure it causes is a legitimate reward-zero outcome under the task contract. The identical `__proto__`-drop bug, from the identical bracket-assignment-on-a-plain-object pattern, independently occurred in this trial's route-policy-repair and browser-replay-repair attempts as well: a systemic pattern across three independently generated checkers, not three unrelated coincidences.

No infrastructure interruption. No additional model calls were made. This evidence and interpretation are independent of the Trial 1/2/audit sections above, which used a different task version or grading revision; those sections are unchanged.


## Third 3.0.0 attempt prepared — historical Trial 5

September 11, 2026 UTC: one fresh **Codex** attempt is prepared, concurrently with the other four tasks, using the exact package, profile and frozen runtime from Trial 4. This is attempt **3** on the public 3.0.0 task and is labeled **Trial 5** in this document's full history. No new model call has been launched by preparation. The provider remains the same for this round; any opposite-provider block comes later under a separate handoff. Previous results and replay accounting are unchanged.

See the [prepared execution handoff](../../../docs/hardened-next-five-trial-three-handoff.md) and [verification manifest](../evidence/2026-09-11-hardened-next-five-trial-three-preparation.json).

## Trial 5 — 3.0.0 / coverage-v2, attempt 3 — September 11, 2026

The third model attempt on the unchanged public 3.0.0 contract, byte-identical packages/grading/runtime to Trial 4 (source digest `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`). The solver is blind to all previous submissions, grades, reference solutions and analysis docs — this is an independent fresh attempt, not a continuation. Campaign `.local/hardened-next-five-trial-three-2026-09-11/`. Job `recurring-calendar-repair-attempt-1`, package digest `e36fc1f3bd8ac60f4a6dab0683513e42693ecea397693d536198a3a10772a467`, profile digest `a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641` (requested `openai/gpt-5.6-sol`, effort `xhigh`, via Codex, same profile as Trial 4). Dispatched 2026-09-11T05:07:22.454Z, completed 2026-09-11T05:28:54.919Z (21m32s wall; 1,211,819ms / 20m12s authoring per `capture.json`). Usage: 1,158,604 input tokens (1,089,664 cached), 39,977 output tokens (Codex CLI usage; no price reported). Published to `.local/hardened-next-five-trial-three-2026-09-11/real-campaign-frozen/jobs/real-provider/records/recurring-calendar-repair-attempt-1/`, independently re-verified this session (`verifyEvidence`): 978 files, all hashes match, no infrastructure error.

Result: reward **0**. Service **semantic-pass, 37/37** scenarios (`grade.json`'s `evaluation`: `expectedIds`/`observedIds` match exactly, no `missingIds`/`unexpectedIds`/`problems`) — the submitted repair itself is correct.

This attempt's checker does **not** repeat this package's own Trial 4 defect. Coverage-v2's opaque per-run tokens (including `"__proto__"`) are handled correctly this time — the checker reaches full, valid per-candidate scoring rather than tripping the harness's shape gate. `grading/checker-grade/grade-summary.json` reports `total:16, correct:13, falsePositives:3, missed:0, deterministic:true`. The 3 false positives are `reference`, `alternative`, and `variant-republish-and-reack` — the checker genuinely, incorrectly rejects both known-good baseline implementations plus one legitimate positive variant, a real content-level accuracy defect, not a shape/structural crash.

The submitted `checker.mjs` re-derives an independent "expected" materialized state for each cell and does strict structural comparison against the actual submission's behavior (`auditCell`, starting line 300; comparisons via `sameRecords`/`sameEvents`/`sameBookings` against `expectedMaterialization(...)`, called around line 375). The re-derivation itself has a bug: `combineRecords` (lines 90–97) merges a delivery's updates into prior records using `table.get(key).revision < record.revision` (line 94) to decide whether an update should replace the stored record. This is a **strict** less-than comparison — when a legitimate republish or acknowledgment retry resends a record at the **same** revision it was already stored at (an idempotent redelivery, exactly what `"variant-republish-and-reack"` exercises), `revision < revision` is `false`, so the checker's internally recomputed "expected" state silently keeps the stale record instead of accepting the republished one. The submission's actual (correct) records then no longer match the checker's own miscomputed expectation, and `auditCell` logs `"publication ... has incorrect source records/events/bookings"` — a false failure caused by the checker's own state model, not the submission. This plausibly also explains `reference` and `alternative`: both are known-good implementations that legitimately exercise the same republish/idempotent-redelivery path the checker mis-models.

This is a **different** failure mode from this package's Trial 4 attempt (the `__proto__` shape-gate collision, where the checker never reached real per-candidate scoring at all) — not a recurrence of that specific bug, and the two should not be conflated. Both are real, independent defects found in two independently-generated checkers for this same task.

No infrastructure interruption. No additional model calls were made. This trial's evidence and interpretation are independent of the Trial 1/2/3/4/audit sections above, which used earlier task versions or grading revisions; those sections are unchanged.


## Trial 6 preparation — fourth 3.0.0 attempt, provider switch

Prepared September 11, 2026 UTC. The next attempt uses **Claude**, switching from the previous provider, with 2 GiB of authoring memory. It is one of five concurrent attempts in the [new handoff](../../../docs/hardened-next-five-trial-four-handoff.md). Public version 3.0.0, the coverage-v2 grader, package digest and solver instruction remain unchanged. No model call occurred during preparation and this section records no new trial result.

The [infrastructure report](../browser-runtime-reliability-2026-09-11.md) documents the independent runtime build, bounded resource diagnostics, core-dump prevention, local regression checks and recovered disk headroom. The [preparation manifest](../evidence/2026-09-11-hardened-next-five-trial-four-preparation.json) binds the exact next profile and all unchanged package bytes. All Trial 5 completion manifests were reverified. Prior trial outcomes remain intact.

## Trial 6 — fourth 3.0.0 attempt / coverage-v2 / provider switch — September 11, 2026

This is the fourth model attempt on the unchanged public 3.0.0 contract, with all five providers switched from Trial 5 (this package moves from Codex to Claude). Task and coverage-v2 grader packages are byte-identical to Trials 4/5; the frozen runtime was rebuilt only to add browser-authoring memory mitigation and resource diagnostics for a different package (source digest `597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`), which does not affect this package's grading. The solver is blind to all previous submissions, grades, reference solutions and analysis docs. Campaign: `.local/hardened-next-five-trial-four-2026-09-11/`. Job id `recurring-calendar-repair-attempt-1`, package digest `e36fc1f3bd8ac60f4a6dab0683513e42693ecea397693d536198a3a10772a467` (unchanged from Trials 4/5), profile digest `d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794` (requested `anthropic/claude-opus-5`, effort `max`, via Claude Code — switched from Codex). Dispatched 2026-09-11T06:41:21.832Z, completed 2026-09-11T07:12:11.571Z (30m50s wall; 1,770,153ms / 29m30s authoring per `capture.json`). Usage: 11,291,840 input tokens (11,099,151 cached), 149,964 output tokens, $11.2258555 (subscription billing). Published to `.local/hardened-next-five-trial-four-2026-09-11/real-campaign-frozen/jobs/real-provider/records/recurring-calendar-repair-attempt-1/`, independently re-verified via `verifyEvidence` this session: 1,026 files, all hashes match, no infrastructure error.

Result: reward **0**. Service **semantic-pass, 37/37** scenarios (`grade.json`'s `evaluation`: `expectedIds`/`observedIds` match exactly, no `missingIds`/`unexpectedIds`/`problems`) — the submitted repair itself is correct.

Checker: this attempt hits the `"__proto__"` shape-gate defect class — the same class as this package's own Trial 4 attempt, though not its Trial 5 attempt, which had a different content-level defect (the `combineRecords` strict-inequality bug documented above). The submitted `checker.mjs` (`run({cases})`, lines 579–601) builds `const verdicts = {}` at line 580 and assigns each verdict via bracket notation at line 599 (`verdicts[token] = reasons.length ? {...} : {ok:true}`). `grading/checker-grade/cases/cases.json` lists 16 opaque tokens for this attempt, one of which is the literal string `"__proto__"`. Because `Object.prototype.__proto__` is an inherited accessor, assigning to that key on a plain object does not create an enumerable own property — confirmed directly against this attempt's `checker-process.log`: its output has exactly 15 of the 16 expected keys, missing only `"__proto__"`. The frozen harness's `completeVerdicts()` shape check requires an exact key-count match, so `gradeChecker()` falls through to its synthetic all-failed fallback (no `grade-summary.json` written) rather than a real per-candidate score — the checker's true judgment on the other 15 tokens was never scored.

Worth noting precisely: all three Claude attempts in this Trial 6 campaign (recurring calendar, workflow authority, delegated budget) independently hit this identical `__proto__` shape-gate bug this round, while both Codex attempts (route policy, browser replay) achieved clean checker passes. That is a notable split from this one trial's five data points — not a proven general Claude-vs-Codex tendency, but worth watching in subsequent trials.

No infrastructure interruption. No additional model calls were made. This trial's evidence and interpretation are independent of the Trial 1/2/3/4/5/audit sections above, which used earlier task versions, grading revisions, or providers; those sections are unchanged.


## Round 5 preparation — historical Trial 7 (September 11, 2026)

The preceding Round 4 / historical Trial 6 reward 0 remains counted. This package’s export is byte-identical to the last trial.

The next attempt is prepared on **Claude**, the same provider as Round 4, using **coverage-v2**. All five tasks launch concurrently into fresh blind workspaces. Round 5 is the fifth campaign on public 3.0.0 and historical Trial 7 in this document. Preparation itself makes no model call and contributes no outcome.

[Coverage and counting report](../browser-coverage-v3-2026-09-11.md) · [Counting disposition](../evidence/2026-09-11-browser-round-four-disposition.json) · [Round 5 handoff](../../../docs/hardened-next-five-trial-five-handoff.md).


## Conditional continuation after Round 5 — prepared September 11, 2026

The user authorized continuing after new reward-zero results, stopping this task on its next pass or at six counted trials with three Codex and three Claude. The already-running Round 5 is unchanged and must finish before the continuation starts. The [explicit counting ledger](../evidence/2026-09-11-hardened-six-counting-ledger.json) records the previously documented first-round regrades and retains excluded attempts separately; preparation adds no trial result. See the [remaining-slot plan](../hardened-six-continuation-preparation-2026-09-11.md) and [operator handoff](../../../docs/hardened-six-continuation-handoff.md).

## Round 5 and continuation — historical Trials 7-8 — 3.0.0 — September 11, 2026

Both solvers were blind to all previous submissions, grades, reference solutions, analysis docs, and to each other's attempt. Private coverage-v2, unchanged from Round 4. Package digest `e36fc1f3bd8ac60f4a6dab0683513e42693ecea397693d536198a3a10772a467` (unchanged), profile digest `d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794` (requested `anthropic/claude-opus-5`, effort `max`, via Claude Code, same provider as Round 4) for both attempts. Runtime: byte-identical copy of the completed Round 4 frozen runtime (source digest `597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`), not rebuilt.

**T7 — historical Trial 7 (Round 5).** Job id `recurring-calendar-repair-attempt-1`, campaign `.local/hardened-next-five-trial-five-2026-09-11/`. Dispatched 2026-09-11T08:20:45.008Z, completed 2026-09-11T08:49:47.768Z (29m43s wall; 1,658,441ms / 27m38s authoring per `capture.json`). Usage: 5,093,128 input tokens (4,942,342 cached), 128,764 output tokens, $7.198756 (subscription billing). Reward **0**. Service semantic-pass, 37/37. Checker: shape-gate failure. `grading/checker-grade/cases/cases.json` lists 16 opaque tokens including the literal `"__proto__"`; the actual `checker-process.log` output has 15 of 16 keys, missing only `"__proto__"`. The submitted `checker.mjs` builds `const verdicts = {}` (line 32) and assigns via bracket notation, `verdicts[token] = reasons.length === 0 ? { ok: true } : { ok: false, reasons: reasons.slice(0, MAX_REASONS) }` (line 46) — a plain-object dictionary that cannot represent the literal key `"__proto__"` as an enumerable own property (it collides with `Object.prototype`'s inherited accessor instead), so `completeVerdicts()`'s exact-key-count shape gate fails and `gradeChecker()` falls through to its synthetic all-failed result rather than a real per-candidate score.

**T8 — historical Trial 8 (Round 6 continuation), user-authorized follow-up since T7 failed.** Job id `recurring-calendar-repair-attempt-1`, campaign `.local/hardened-six-continuation-2026-09-11/slots/recurring-calendar-repair/trial-8/`. Same provider/profile as T7. Completed 2026-09-11T09:17:50.264Z (1,544,177ms / 25m44s authoring per `capture.json`). Usage: 5,615,833 input tokens (5,448,655 cached), 132,210 output tokens, $7.702032 (subscription billing). Reward **0**. Service semantic-pass, 37/37. Checker: the same defect *class* independently reproduced by genuinely different code — `cases.json` again lists 16 opaque tokens, and the actual output again has exactly 15 of 16 keys, missing `"__proto__"`. This submission's `checker.mjs` builds `const verdicts = {}` (line 407) and assigns via `verdicts[token] = reasons.length ? { ok: false, reasons } : { ok: true }` (line 418) — a distinct implementation from T7's (different line numbers, different surrounding structure) that happens to share the identical `__proto__`-into-plain-object pitfall.

Both completion manifests independently re-verified via `verifyEvidence` this session: T7 1,022 files, T8 1,010 files, all hashes match, no infrastructure error.

**Final disposition.** With T8's failure, this task reached the six-counted-trial stop condition automatically, per the user's explicit continuation rule (continue after clean reward-zero results until six counted trials with three Codex and three Claude): final tally **6 scored, 6 failures, providers 3 Codex + 3 Claude**, `stopReason: "six-counted"`, 0 unused slots. This is a complete, balanced six-trial record meeting the ≥5/6 target with room to spare.

No infrastructure interruption on either attempt. This trial's evidence and interpretation are independent of the earlier Trial 1-6/audit sections above, which used earlier task versions, grading revisions, or occurred before these specific attempts; do not alter or reinterpret those earlier sections.
