# 24 — Diagnostic transport repair

## Outcome

Claude, requested Opus 5 / max, completed in **12 minutes 43 seconds**, with **reward 1**.
The service passed **28/28 protected scenarios** and its checker passed **13/13
candidates**, accepting both correct implementations and rejecting all eleven controls
with an actually violated obligation named. Repeated checker execution was deterministic.
There was no recorded execution error or retry.

## What the task was, in plain English

A gateway receives interleaved byte fragments from several transport channels. It
must reassemble each channel into newline-delimited JSON records, then interpret those
records by logical request and attempt. A channel is not a request: one attempt can
arrive through multiple channels, and a record or even a UTF-8 character can span frames.

For each requested ID, the gateway selects the newest attempt seen anywhere, even if
an earlier attempt succeeded and the newer one never finished. It preserves the
contiguous chunk prefix from sequence zero. A terminal error remains an error with
its original code and retryable flag, while an unfinished attempt, a gap and a wholly
missing request have different specified outcomes. Successful empty output is also
legitimate; absence of error text is not proof of success.

After draining input, it records exactly the requested population. Returning a flattering
summary is not publication. This is a bounded fictional wire protocol with complete
public definitions, not unspecified behavior of a real provider API.

## What was in the package

The starter separated decoding, attempt selection, outcome construction and service
orchestration. It included public semantics, API definitions and one visible test.
The separate checker received complete original raw wire chunks and requested IDs,
actual recorded rows and observed API calls. It did not have to infer missing requests
from another candidate's output.

Protected grading used 28 service scenarios and thirteen checker candidates—two
correct implementations and eleven negative controls. The checker ran separately,
without access to service helpers or the private verdict channel. Correct alternate
decoding strategies and row/property ordering were allowed.

## What the agent actually did

There are 22 captured shell calls. Claude modified the decoder, outcome constructor
and service loop, added a standalone checker and grew the retained tests from one
to **54 passing tests**.

1. It replaced per-frame decoding with byte buffering per channel. The old decoder
   converted and split each frame separately and swallowed JSON parse errors, silently
   losing fragmented records. The repair concatenates each channel's bytes before
   UTF-8 decoding and record splitting. Under the small declared bounds, whole-channel
   buffering is a valid solution; streaming decoding is not required.
2. It corrected the terminal-error branch, which had returned successful empty output.
   The repaired result preserves the actual error code/retryability and all available
   contiguous prefix data instead of erasing both the failure and partial content.
3. It deduplicated requested IDs before publication. The public list's duplicate-ID
   interpretation was not completely explicit, so this is defensive handling rather
   than an independently established planted defect. The attempt-selection module was
   already correct and remained unchanged.
4. It wrote a checker that independently decodes the original wire, reconstructs each
   request's expected outcome and compares actual effects. It also checks input
   exhaustion from observations and separates missing publication from self-reporting.

The final tests cover one-byte fragments, CRLF and blank lines, a final record without
a newline, retransmissions, unfinished later attempts, empty success, gaps, truncation,
missing requests, and terminal errors with useful prefix data. Its alternative-correct
implementation uses streaming decoding and different output ordering.

Its retained property tests generate **300 randomized wires** and derive expected
outcomes from the generator's logical plan, rather than obtaining the oracle by parsing
the same bytes with the same decoder. They check both correct implementations and
seventeen deliberately wrong variants. Final captured output reports all 54 tests
passing, including the property and mutant tests, plus deterministic, non-mutating
checker behavior on frozen inputs.

The agent also measured a large synthetic checker workload: ten candidates with twelve
cells each, about 9.2 MiB of base64 wire per candidate, judged twice in 306 ms at about
221 MiB RSS. That is its local benchmark, not a protected scenario count or proof of
all future memory behavior.

## Why it solved, and what remains uncertain

The starter's two real defects were direct contradictions of clear public rules:
frames were not complete records, and terminal errors were not successful empty output.
Correct attempt selection and most outcome distinctions already worked. Bounded input
allowed the agent to choose a simple buffered design and invest in checking it.

The strongest practice to transfer is its independent test construction: derive the
expected logical outcome before splitting it into wire fragments, then compare both
buffered and streaming implementations. That is more informative than comparing two
parsers that could share the same framing assumption.

The checker makes explicit leniency choices for duplicate requested IDs and empty-wire
exhaustion. Those should be clarified in a successor contract before using narrow
controls to reject one interpretation. Its parser also retains a catch-and-skip path
for malformed records, but the public contract guarantees valid complete JSON after
reassembly. That path is not a demonstrated in-contract failure and must not be turned
into an unfair hidden malformed-input test.

This run provides no evidence that the package currently defeats the target model.
A larger transport workload alone would mostly test buffering limits already made
generous for fairness. Any genuinely stronger workflow would need additional natural,
fully stated obligations and new reference/control validation, while keeping simple
correct buffering legal where the product requirements permit it.

## Evidence and limits

[Sanitized batch evidence](../evidence/2026-09-08-fifth-five.json) retains original
results, exact reason policy, timing, source deltas and capture hashes. The submitted
tests and original command output substantiate the verification account; they were
not executed unprotected during analysis. This is a single exploratory pass, not
universal correctness, official qualification or a backend attestation. Observable
actions are described, not private internal reasoning.

## Changes applied since this trial (2026-09-08)

Despite reward 1 on this trial, reviewers identified two real gaps in the checker's own
judgment (not the package's grading of this submission), plus one severe pre-existing
infrastructure bug was found independently while implementing the fixes. All three are
now closed.

**Fix 1 — publish-before-exhaustion ordering**, in `private/domain.mjs`. SEMANTICS.md
requires publishing "after exhausting input", but `completion`'s original formula
(`index > s.chunks.length && equal(...)`) only checked that both eventually became true,
never that exhaustion happened *before* any `record()` call. Folded into `completion`
(not a new check id, since SEMANTICS.md groups these as one obligation and the public
`instruction.md` reason-code table has no free slot): a candidate must have observed the
first terminal-null `next()` before any of its `record()` calls, computed directly from
the real ordered `observations` call log. Verified via direct construction (a trace that
records fully correct rows but calls `record()` before ever draining input): rejected
for `completion` after the fix, silently accepted before it. Regression-checked against
all 28 scenarios and every existing control — no failure-set shape changed.

**Fix 2 — four new negative controls**, in `control-manifest.json` and
`private/controls/{skip-processing-when-empty,omit-data-when-empty,omit-attempt-when-null,omit-error-when-null}.mjs`,
targeting missing-key-vs-null/empty normalization blind spots the real checker's own
code exhibits (`dataOf`/`attemptOf`/`sameError` in `checker.mjs` all coalesce a missing
key to `""`/`null` before comparing). Each isolates cleanly to its predicted check
(`completion`/`content`/`attempt_identity`/`exact_rows` respectively, verified via
direct isolation checks matching exact scenario counts).

**Fix 3 — a severe pre-existing exposure bug, found while verifying Fixes 1–2.** A free
regrade of the real preserved checker against the newly-fixed package showed reference
and alternative *both* rejected as false positives, with the checker reporting "the
greatest observed attempt is null" for every request — i.e. it believed zero wire
records existed anywhere. Root cause: the real checker's `framesOf(cell)` reads
`cell.input.chunks` (`checker.mjs:24-27`) to reassemble the raw transport bytes it
independently decodes and grades against, but the canonical tree's `domain.mjs` never
exposed this field at all — only `requests: s.requests` was present. The frozen dispatch
tree this trial actually ran against already had `input: { chunks: s.chunks }`; this was
a canonical-tree-only staleness bug (the same class as #21's and #22's), not a defect in
the dispatched package. Added to canonical for consistency.

**Combined result**, verified via real Docker build+validate (`local-valid: true` in
both trees) and a full free regrade of the real preserved checker against the fully
fixed package: **0 false positives** (reference/alternative correctly accepted) and
**exactly the 4 new controls "missed"** — confirming, with zero new model calls, that
the real checker genuinely has the missing-vs-null/empty blind spot reviewers predicted,
now with concrete distinguishing evidence for future checker submissions. All fixes
ported to and independently re-verified in `source-fifth-v2`. **When trials run again:**
#24 should continue to pass; a future checker will need to handle the 4 new controls and
the ordering case correctly to earn full credit.

## September 9 implementation successor — ready for exploratory trials

The checker input retains exact wire and result shapes but no longer tells the solver to concatenate channel bytes before decoding. Four successor controls cover omitted output properties and empty-drain processing. Attempt selection, decoding, outcome classification and service orchestration are no longer supplied in the starter.

Both deliverables now have complete private oracle implementations. The public service
starts from an empty entry point. The checker classifies every supplied case with a
Boolean verdict; optional reasons are ungraded diagnostics, and helper modules are
allowed. Original results above remain historical; no second model trial was run.

Executed validation on this successor:

- Service oracle: 28/28 scenarios; checker oracle: 17/17 candidates.
- Protected Foundry assurance: 20 operations passed; deterministic rebuild and
  exported-CLI recipient reproduction passed, including drift and invalid-execution checks.
- Native Harbor oracle reward 1; native nop reward 0; no Harbor exceptions.
- All 22 pinned upstream static checks and all six local checker/integrity controls passed.
  These local controls are not the official model-powered cheat qualification trials.

Canonical source: `tasks/diagnostic-transport-repair`. Native export:
`.local/top-five-implementation-2026-09-09/harbor-ready/diagnostic-transport-repair`.

Native export digest: `3bb08ac6038ab6f3019ab9243472c035ef02be42b1085f02f2b0d3fb8f2aca21`.
Foundry package digest: `72f4c5c5ccd89bf7c80804c0ab5536396a5911caa8c7eff7afd9dde92c59cef9`.

[Versioned evidence](../evidence/2026-09-09-top-five-implementation.json) records source
hashes, logs, per-check CTRF results and both package identities. The
[shared implementation record](../top-five-implementation-plan-2026-09-09.md) explains
policy and tooling changes. Use these maintained sources or the identified exports
for the next trial, rather than the older local successor copies named above.

Readiness means engineering readiness for exploration. Removing supplied implementation
code changes the difficulty hypothesis and invalidates any attempt to reuse earlier
model results as qualification for this version. Fresh model evidence is still needed.
The eventual chosen submission also needs human-authored reviewer material and the
required rubric, standard and cheat qualification runs; those requirements do not
justify delaying exploration to qualify all five candidates.

## Trial 2 — implementation successor — September 9, 2026

### Identity and execution

Run `diagnostic-transport-repair-attempt-1`, package digest
`72f4c5c5ccd89bf7c80804c0ab5536396a5911caa8c7eff7afd9dde92c59cef9`. Requested target **codex**,
`openai/gpt-5.6-sol`, effort `xhigh`. Frozen execution source:
`2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`.
The pinned author image was
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.

Started `2026-09-09T11:35:51.003Z`, completed `2026-09-09T11:45:08.072Z`.
One of exactly five fresh campaign attempts, reserved within **232 ms** and reported
running concurrently by the dispatching agent's `docker ps` observation. Budget:
10,800 seconds, 2 CPUs, 2 GiB; signed subscription-only authorization, one attempt,
no automatic retries or recorded paid-API fallback. No timeout is recorded.
Requested settings are not runtime attestations: Claude model strings were observed;
Codex model identity and effort/scaffold versions were unobservable in the captures.
CLI dollar estimates are not subscription charges.

### Changes and results

The starter now supplies only an empty entry point. Decoder, attempt-selection and
outcome modules are no longer pre-implemented; the concatenate-before-decoding hint
was removed. The exact output schema remains available. The checker was already
required in Trial 1; Trial 2 makes reason text diagnostic-only and adds four controls
for missing/null/empty output distinctions.

**Reward 1. Service 28/28; checker 17/17.** Both valid candidates and all fifteen
negative controls were classified correctly, including the four additions. No timeout,
missing scenario or infrastructure error is recorded.

The capture analysis records a new `gateway-core.mjs`, a separately implemented
checker, and self-tests for fragmented Unicode, multiple channels, literal special
identifier names and missing/duplicate/foreign outputs. Its completion claim is
consistent with both frozen suites passing.

### Comparison and decision

Trial 1 used Claude and scored reward 1, service 28/28 and checker 13/13 in about
12m43s of authoring. Trial 2 explicitly switched to Codex and passed the expanded
bank in about 9m06s. Both model and package changed, so this is not a controlled
same-model comparison or evidence that starter removal made solving faster.

The optimized package still produced a complete pass. Lower its immediate priority
in the search for repeatable failures; no package repair is indicated by this attempt.
The new controls caught no omission in this fresh checker. That does not establish
that any particular prior engineering intervention caused the successful coverage.

### Evidence and qualification boundary

The publication audit checked **1060 manifest-listed files**
for this record with zero mismatches and compared all four supplied contract/interface
files against the frozen export. Raw evidence remains at
`.local/round-two-top-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/diagnostic-transport-repair-attempt-1/`.
The earlier Trial 1 text and dated engineering additions above are preserved.

[Campaign results and audited decisions](../round-two-top-five-2026-09-09.md) ·
[Sanitized trial evidence](../evidence/2026-09-09-round-two-top-five.json) ·
[Integrity and diagnostic evidence](../evidence/2026-09-09-round-two-top-five-audit.json).

This is an exploratory repository assessment. The immutable result still records
`adjudication: unlabelled`, `modelEvidenceEligible: false` and
`countsAsModelFailure: false`; publication does not change those fields or claim
six standard failures, official cheat qualification or independent blind review.
