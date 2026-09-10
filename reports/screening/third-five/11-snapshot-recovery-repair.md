# 11 — Snapshot recovery repair

> **Final counted result: 5/6 reward=0 — meets the reported ≥5/6 target.** Three Codex and three Claude trials; no slots pending. [Final results and counting method](../final-results-2026-09-09.md). The dated analysis below preserves the complete trial and grading history.

One Codex attempt, requested Sol / xhigh. Authoring **14m 27s**. Recorded reward **1**: service **33/33 scenarios**, checker **12/12 candidates**, with both correct implementations accepted and all ten negative controls rejected with the required obligation named. No execution error or retry was recorded.

## What the task was, in plain English

Repair Northstar, a backup-and-recovery coordinator. It must select the right checkpoint for a particular tenant, branch and cutoff, replay the subsequent transactions, produce a portable archive, and restore that same state into a fresh database. Correctness includes deleted rows, account/entry relationships, zero-valued amounts and the next identifier that the system should allocate. Recovering the visible rows while resetting that allocation counter is not a complete recovery.

This is a documented fictional archive protocol, not an exercise in undocumented PostgreSQL behavior. The grader creates actual SQLite databases and separately tries to restore the submitted backup. A successful return value from the service is not its evidence of success.

## What was in the frozen package

The starter has six service modules, a public API and semantics contract, one visible test, and an explicit checker-input contract. The service suite has 33 scenarios and seven obligations: completion, restored rows, allocation, portable backup, publication, legal operations and preservation. Checker grading used a reference, a separately implemented correct alternative and ten negative controls over eight selected scenarios per candidate. Those are different denominators: 33 service scenarios, not 33 checker candidates.

Before dispatch, the checker instructions were corrected to describe the actual input: original recovery inputs and checkpoint bytes, committed state, publications, restore errors and an independently collected API log. No precomputed expected state was supplied. This correction was included in the frozen, freshly validated package.

## What Codex actually changed

The important distinction is between defects it repaired and code that already worked. Checkpoint selection, tenant/branch filtering and transaction ordering were already implemented in the starter's catalog module; Codex left that module unchanged.

The central repairs were in recovery.mjs. Deletes previously had no effect, and nextId was recomputed from the surviving rows. Codex implemented deletion by row identity and used each transaction's recorded allocation state. It also cloned inserted/replaced rows so the recovered state did not retain mutable input references.

It then tightened the surrounding workflow: explicit backup fields, defensive cache/JSON handling, acknowledgement checks, and a shared call budget. Restore now retries individual operations that made no partial change, but restarts the entire transaction after a failed commit because the contract says that failure rolls it back. Publication occurs only after an acknowledged archive and committed restore.

Finally it wrote a 307-line standalone checker. That checker independently folds checkpoint/log data using maps, normalizes row ordering, compares the restored and archived results, and audits transaction/publication events. It does not judge another implementation by requiring the same row insertion order.

## How it tested the repair

The capture contains twelve completed shell-command events. Codex repeatedly ran the supplied test and performed import/syntax checks. Its own integration example exercised recovery with transient failures: the recorded output shows 21 API calls, acceptance of the correct trace, and rejection of a modified-row trace. Another local check accepted a valid row-order variation and rejected duplicate publication, wrong allocation and a broken backup, naming the corresponding obligations.

These were real recorded checks, but not a large fuzz campaign. The independently protected grade then passed every service scenario and every checker candidate. In particular, the checker caught the rows-only-backup control while accepting the alternative implementation. That is useful evidence that it checked a secondary deliverable, not just final database rows.

## Why this did not produce the failure we wanted

The multiple artifacts and real database make the package credible, but the essential starter defects are still concentrated in a short state-folding function. Reading the contract directly exposes the missing delete branch and the incorrect reconstruction of durable allocation state. The clean result supports a narrower conclusion than “backup recovery is easy”: this version was solved, with a working independent checker, in roughly a quarter hour.

The outbox's uncertainty mechanism is not present here. This protocol supplies complete authoritative logs and unambiguous operation acknowledgements. Calling this an uncertainty-closure failure opportunity would overstate its construction.

## Useful next steps

Retain this submission as a strong correct control. Within the existing contract, extend coverage around delete/recreate transactions, equal timestamps ordered by LSN, zero values, and alternative legal restore orderings. Do not claim those combinations will defeat this submission: it already handles their basic rules.

A substantially harder successor would need genuine additional recovery work, such as a coherent multi-part checkpoint and log-cut reconstruction with a published consistency contract. That would be a new version, not a hidden requirement added to this trial. Preserve real artifact restoration and independent evidence collection; those improve validity even when they do not cause difficulty.

## Evidence boundary

[Sanitized batch record](../evidence/2026-09-08-third-five.json) retains exact package/profile/source hashes, service/checker results, submitted-file deltas and completion/result/grade identities. Every completion-manifest file was size- and hash-verified during analysis. [Current task source](../../../tasks/snapshot-recovery-repair/) may later differ from this frozen version.

This is analysis of observable commands, submitted code and original grading evidence, not private internal reasoning or an independently blind adjudication. One successful screening attempt does not establish a general solve rate. No additional model calls or diagnostic regrades were made for this report.

## 2026-09-09 — Third ranked group: engineering successor for Trial 2

**Ready for a second exploratory trial. No new model attempt was launched for this version.** Priority within the third ranked group: 5/5. Earlier sections describe historical source and results. See the [implementation report](../third-ranked-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-third-ranked-five-implementation.json).

Completed the private service closures, then removed all six public implementation modules, including the already-correct checkpoint selection, blob verification, archive encoding and restore coordinator. The empty starter now requires the complete service as well as its release validator.

Retained the documented checkpoint/transaction rules, archive schema, operation acknowledgement behavior and real SQLite verification. Removed the repeated repair checklist and rejection-label tutorials. Checker reasons are diagnostic only; raw recovery inputs and checkpoint bytes remain available, without a computed expected state.

The independent private checker uses keyed tables to derive the selected recovery state, validates archive identity and allocation as well as rows, and audits publication/transaction boundaries. It accepts both the reference and the independent child-first restore ordering. All 33 existing scenarios remain. No new crash or ambiguous-commit mechanism was silently added to this bounded archive protocol.

Validation passed 15 Foundry assurance checks across 33 scenarios, including the complete reference and alternative services, semantic failure of the untouched service starter, repeatability and control activation. The private checker correctly classified 12/12 candidates: two correct implementations and 10 negative controls, with zero false accepts or misses. Rebuild and fresh recipient reproduction passed.

Native validation passed all 22 static checks and six verifier integrity controls. Harbor's complete oracle returned reward 1; nop returned reward 0, with no Harbor exceptions or verifier infrastructure errors. Nop is rejected for its missing checker deliverable; the separate Foundry starter execution establishes the service's semantic failure. These are provider-free local validation jobs, not new standard/cheat model trials.

Use these exact exports:

- Foundry: `.local/third-ranked-five-implementation-2026-09-09/release-ready/snapshot-recovery-repair/export`
- Foundry digest: `719dab934ecc20172b4a809f69b4b353db18185c1c15f4c2ed417dcf8902fb5b`
- Native Harbor: `.local/third-ranked-five-implementation-2026-09-09/harbor-ready/snapshot-recovery-repair`
- Native digest: `0f6dc04823c9325db86c4b613bd53ccbea9f3c2e46b34001b47c92d048bf6f70`

Both deliverables are required. The checker returns complete deterministic Boolean verdicts; optional reason text does not affect grading, and submitted helper modules are available. Public requirements and custom schemas remain supplied without a worked implementation.

When Trial 2 completes, append the actual model/profile, frozen digest, service/checker outcomes, elapsed time, exclusions and final submission defect here. Keep original Trial 1 rewards intact. Local controls, old grading disputes and infrastructure errors are not additional model failures. The final hiring submission still requires its human-authored material and rubric, standard and cheat qualification on the final selected version.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `snapshot-recovery-repair-attempt-1`, package digest
`719dab934ecc20172b4a809f69b4b353db18185c1c15f4c2ed417dcf8902fb5b`, route
`professional-multifile/authority-process@1`. Dispatched through this session's
`real-provider` execution route (signed JobStore reservation, Ed25519, realm
`real-provider`, `billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`) —
a fresh campaign slot (`attempt-1`), not an infrastructure retry of any prior run.
Author image `sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.
Evidence retained at
`.local/round-two-third-ranked-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/snapshot-recovery-repair-attempt-1/`.

Target: **codex**. Requested `openai/gpt-5.6-sol`, effort `xhigh`, CLI
`scaffoldVersion 0.153.2` (verified baked into the pinned author image). Model,
effort and scaffold version were all unobservable from the codex CLI's event
stream — a known instrumentation limit, not a data quality problem.

Dispatched 2026-09-09T15:08:42.029Z as one of five reservations installed within a
231ms window (15:08:41.798Z–15:08:42.029Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently — a genuinely concurrent five-way
campaign. Completed 2026-09-09T15:26:50.649Z. Total elapsed ≈1,088,620ms (~18m9s);
solver authoring time ≈1,081,036ms (~18m1s); grading ≈7.6s. Token usage: 686,479
input tokens (640,640 cached), 31,438 output; the codex CLI reports no price
estimate. Execution reached a clean `completed` state, no invalid execution.

### B. What changed since Trial 1

Per the September 9 engineering successor section above, the starter's six public
implementation modules — including the already-correct checkpoint selection,
blob verification, archive encoding and restore coordinator — were removed
entirely; only an empty entry point remained. The independent checker remains a required, separately graded deliverable, as
in Trial 1. Its reason text is now diagnostic-only.

### C. Results

**Foundry success: reward 0 from a substantive required-checker failure.** The
submitted service (`entry.mjs`) passes all 33 service scenarios. The failure is entirely in the submitted
`checker.mjs`: `checkerRequired: true`, `checkerPassed: false`, 10 of 12
candidates correctly classified, 0 missed, but **2 false positives** — the
checker wrongly rejected *both* known-good candidates (`reference` and
`alternative`, `expectedFailingCheck: null` for both). This is the same failure
pattern documented for `issued-report-repair` in the earlier round-two campaign:
a checker that rejects genuinely valid implementations, not merely one that
misses a bad one.

Direct execution of the submitted `checker.mjs` against the actual graded
fixtures (`grading/checker-grade/cases/cases.json`) shows the defect is not
narrow — **all 12 candidates are rejected**, including the two that should pass;
the 10 negative controls happen to get the right verdict only because rejecting
a genuinely broken candidate is correct regardless of the checker's actual
reasoning. The concrete mechanical cause: `checker.mjs`'s `archiveBytes()`
helper assumes `cell.publications[0].archive` is either a raw base64 string or
an object with a `.bytes` string field, and unconditionally routes it through
`parseJsonBytes()` (base64-decode, then `JSON.parse`). But the actual harness
input for `archive` is **already the decoded state object** —
`{tenant,branch,cutoff,accounts,entries,nextId}` — confirmed directly from
`cases.json`: `candidate-A`'s `cell.publications[0].archive` is
`{"tenant":"t2","branch":"b0","cutoff":20,"accounts":[...],"entries":[...],"nextId":50}`,
not a `.bytes` field. `archiveBytes()` therefore falls through to
`fail("published archive is missing its bytes")` on essentially every cell for
every candidate. (A second, distinct pattern, `"actual restore.nextId is
incorrect"`, appears on some candidates/cells too and was not fully traced
within this review's scope — it does not change the overall diagnosis, since
the archive-decoding defect alone is sufficient to explain rejecting the two
valid candidates.) `SEMANTICS.md`'s `api.archive({bytes})` describes the
*solver's outbound call payload* to the service API — the checker's author
appears to have conflated that wire format with the shape of the
already-materialized `publications[].archive` field the checker itself
receives as input.

### D. Observable solving behavior

The capture (37 events, 20 command executions) shows a compact, focused build:
after reading `SEMANTICS.md`, `api.d.ts`, `CHECKER-INPUT.md` and
`instruction.md` in full, the agent implemented `entry.mjs` and `checker.mjs`
together, then ran `node --check` on both repeatedly (16 occurrences) alongside
one self-built integration test: `import { subject } from './entry.mjs'; import
{ run as check... } from './checker.mjs'` — i.e., it validated its own checker
against its own service's actual behavior, with fault injection ("a stale
cache, failed writes, a rolled-back commit, replayed deletes, cross-branch
noise, zero amounts, and retrying publication"). Its own agent message reports
this fault-injected end-to-end run passed. That self-test is real and non-trivial,
but it used data shapes the agent itself constructed. The public checker
interface also supplied ordered API observations, and the archive API contract
documented the encoded request bytes. The checker already contained code to
read those observations, but its earlier aggregate-field assertion rejected valid
cases before it reached that code. Its self-tests did not expose that assumption. Its
final message ("Implemented both deliverables... checker.mjs — independent
recovery computation and validation of restore...") describes what was built
without a fabricated pass-rate claim; the actual gap is a wire-format
assumption invisible to self-testing, not a claim contradicted by its own
stated evidence.

### E. Comparison and next step

Trial 1 reached reward 1; this empty-starter successor reached **reward 0** while
its service still passed 33/33. This is the completed-but-wrong result the Foundry
is seeking: a required validator that rejects correct implementations. A passing
service does not cancel failure of the other required deliverable.

The unchanged-checker offline diagnostic rejected all twelve candidates. For both
correct candidates, all four cells supplied archive bytes through the documented
successful `archive` API observations; decoding those bytes reproduced the published
archive object in all eight positive cells. The submitted checker already had an
observation-reading path, but failed its earlier `archiveBytes()` assertion. The
necessary facts were available without revealing a solution or private fixture.

**Prioritize another exploratory attempt on this unchanged package version.** Keep
the failed submission as evidence; do not repair the agent's checker or add a decoder
tutorial as a prerequisite to retrial. Another attempt measures whether this failure
recurs. One observed failure does not yet establish a repeated failure rate.

### F. Verified publication record — September 9, 2026

Reward **0**; service **33/33**; checker **10/12**. All **785** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-third-ranked-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-third-ranked-five.json). Trial 1 is preserved.

## Trial 3 — repeat attempt — September 9, 2026

### A. Identity and execution

Run `snapshot-recovery-repair-attempt-1` in a fresh campaign slot
(`.local/round-three-failing-five-2026-09-09/`), package digest
`719dab934ecc20172b4a809f69b4b353db18185c1c15f4c2ed417dcf8902fb5b` — byte-identical
to Trial 2's package; the public contract and private controls did not change.
Route `professional-multifile/authority-process@1`. Target: **codex**, the same
provider as Trial 2. Requested `openai/gpt-5.6-sol`, effort `xhigh`, CLI
`scaffoldVersion 0.153.2`; model/effort/scaffold version were unobservable from
the codex CLI's event stream, as before. The controller re-verified the profile
and instruction hash were identical to the retained Trial 2 record before
dispatching, and gave the solver only the original public task inputs — no prior
submission, analysis, or this handoff.

Dispatched 2026-09-09T19:02:12.794Z as one of five reservations installed within
a 217ms window (19:02:12.628Z–19:02:12.845Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently. Completed 2026-09-09T19:20:05.212Z.
Total elapsed ≈1,072,418ms (~17m52s); solver authoring time ≈1,065,515ms (~17m45s);
grading ≈6.9s. Token usage: 527,349 input tokens (481,920 cached), 32,368 output;
codex reports no price estimate. Execution reached a clean `completed` state, no
invalid execution or infrastructure error.

### B. Results

**Reward 1 — a clean pass, resolving Trial 2's reward-zero outcome.** Service
(`entry.mjs`) passes all 33 scenarios, matching Trial 2's already-correct service.
Checker: `checkerRequired: true`, `checkerPassed: true`, 12/12 candidates correctly
classified — 0 missed, 0 false positives. Both known-good candidates (`reference`,
`alternative`) are accepted this time, and all ten negative controls are rejected.

### C. Comparison with Trial 2 and recurrence assessment

**Trial 2's specific checker defect did not recur.** Trial 2's `archiveBytes()`
unconditionally treated `publications[0].archive` as either a base64 string or a
`{bytes: string}` wrapper, and threw "missing its bytes" on the actual harness
shape — an already-decoded state object — failing all twelve candidates on that
path alone. This Trial 3 submission's equivalent function, `decodeArchiveValue()`
(`checker.mjs:156-165`), is defensive by construction:

```js
function decodeArchiveValue(value) {
  if (value && typeof value === "object" && typeof value.bytes === "string") value = value.bytes;
  if (typeof value !== "string") return value;
  ...
}
```

It checks the runtime type of `value` before deciding whether to unwrap or
base64-decode it: an already-materialized object is returned unchanged (line 158),
a `{bytes}` wrapper is unwrapped first (line 157), and only an actual string gets
the base64/JSON decode path. This single type check is exactly the generalization
Trial 2's checker lacked — it never assumed one fixed wire shape for the archive
field, so the ambiguity between `SEMANTICS.md`'s documented `api.archive({bytes})`
outbound-call shape and the checker's actual already-decoded input shape never
produced a false rejection.

This attempt avoided Trial 2's input-parsing mistake. It ends the literal
consecutive-zero streak, while preserving Trial 2's failure in the six-attempt
record. One failure and one pass are insufficient to establish a stable failure
rate or label the earlier failure a one-off.

### D. Observable solving behavior

The capture is compact: 31 events, 14 command executions, 10 file changes, 4 agent
messages. After implementing `entry.mjs` and `checker.mjs`, the agent's self-testing
included direct scrutiny of the observation/publication shapes it would receive —
`decodeArchiveValue`'s type-guarded structure itself is evidence the agent considered
more than one possible input shape for `archive`, rather than assuming the wire-format
description in `SEMANTICS.md` also described the checker's own input. No failed
self-test or reverted approach is visible in the capture; the file-change history
shows a single, direct implementation of both deliverables without a later patch to
fix an archive-decoding assumption, unlike a scenario where the bug would have been
caught and fixed after failing self-tests — here it appears to have been avoided by
construction rather than caught and repaired.

### E. Next step

Retest the unchanged package on Codex. It has used the one solver pass permitted
by the reported 5-of-6 acceptance threshold and needs four failures in the
remaining four attempts. A second pass would put this planned six-run set below
that threshold; one pass alone does not require optimization or a restart.

### Acceptance progress and next prepared attempt

This unchanged successor has **1 failure and 1 solver pass in two scored attempts**, both on Codex. The user reports that the CEO accepts at least **five failures out of six**, with three attempts per provider; six consecutive failures is the stricter aspiration, not the acceptance threshold. This package remains within that threshold and needs **4 failures from the remaining four attempts**. Different failure mechanisms can count; no identical-bug requirement is added.

The next attempt is **Trial 4 in this document, the third attempt on this successor**, using the same provider, package and saved profile again. Afterward, this package will have three runs on its original provider and will need three on the other provider. [Prepared Trial 4 handoff](../../../docs/round-four-failing-five-handoff.md). Preparation launches no model calls.

### Trial 4 — third unchanged-successor attempt — September 9, 2026

#### A. Identity and execution

Run `snapshot-recovery-repair-attempt-1` in a fresh campaign slot
(`.local/round-four-failing-five-2026-09-09/`), package digest
`719dab934ecc20172b4a809f69b4b353db18185c1c15f4c2ed417dcf8902fb5b` — byte-identical
to Trial 2 and Trial 3's package; public contract and private controls unchanged.
Route `professional-multifile/authority-process@1`, profile digest
`a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641` — identical to
Trial 3's. Target: **codex**, the third consecutive attempt with this provider.
Requested `openai/gpt-5.6-sol`, effort `xhigh`, CLI `scaffoldVersion 0.153.2`, same
author image and frozen runtime as Trials 2–3; model/effort/scaffold identity were
again unobservable from the Codex CLI's event stream. The controller hard-asserted
the profile and instruction hash matched the retained Trial 3 record before
dispatch, and the solver received only the original public task inputs — no prior
submission, analysis, or this campaign's handoff.

Dispatched as one of five reservations installed within a 223ms window
(2026-09-09T19:56:46.857Z–19:56:47.080Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently. Completed 2026-09-09T20:14:46.043Z.
Elapsed ≈1,079,020ms (~17m59s), well under the 10,800,000ms (3h) cap. Token usage:
660,084 input tokens (610,048 cached), 32,372 output; Codex reports no price
estimate. Execution reached a clean `completed` state, no invalid execution or
infrastructure error. `completionSha256 bc61d25e8b3e42ba9d9e7415d0d2bff5a1f316e3c705b4ade0b6dad5fbf395c5`,
`resultSha256 454675027f6f209ce920c8ee2c20151a1dea16596e40ccc112d8113df4bd1f24`,
`gradeSha256 a0ffadc5012ac85ec683a1097998828ddcb035ab6a1f59843809104025093387`; all 785
manifest-listed files (2,665,141 bytes) reverified against these hashes with no errors.

#### B. Results

**Reward 1 — a second consecutive clean pass.** Service (`entry.mjs`) passes all
33 scenarios, matching Trials 2 and 3. Checker: 12/12 candidates correctly
classified — 0 missed, 0 false positives, `pass: true`. Both known-good candidates
(`reference`, `alternative`) are accepted; all ten negative controls are rejected
with their named required obligation observed.

#### C. Comparison with Trials 2–3

Trial 2's specific defect — `archiveBytes()` assuming the archive field always
arrived as a base64 string or a `{bytes}` wrapper, rejecting the harness's actual
already-decoded object shape — did not recur for a second independent submission.
Trial 3's checker avoided it with `decodeArchiveValue()`, which type-checks the
value before deciding whether to unwrap or decode it. This Trial 4 submission
uses a differently-named but equally defensive function, `archiveObject()`
(`checker.mjs:142-149`):

```js
function archiveObject(publication) {
  if (ownKeysAre(publication.archive, ['tenant', 'branch', 'cutoff', 'accounts', 'entries', 'nextId'])) {
    return publication.archive;
  }
  const encoded = typeof publication.archive === 'string'
    ? publication.archive
    : publication.archive?.bytes;
  ...
}
```

Rather than type-checking the value directly (Trial 3's approach), this submission
checks whether `publication.archive` already carries the expected materialized-object
keys and returns it unchanged if so (line 143-144), only falling through to the
string/`{bytes}`-wrapper cases otherwise. Two independent Codex sessions, with no
shared context, arrived at structurally different but equally defensive solutions
to the same ambiguity — neither assumed the `SEMANTICS.md` outbound wire-format
description also described the checker's own input shape.

#### D. Acceptance-threshold ceiling — this package's six-run set can no longer reach 5-of-6

This package's Codex run history is now **fail (Trial 2, reward 0) → pass (Trial 3,
reward 1) → pass (Trial 4, reward 1)**: 1 failure and 2 passes across its first three
of six planned attempts. The user-reported CEO acceptance rule for this project is
**at least 5 failures out of 6 scored attempts**, three Claude and three Codex, with
the explicit corollary that a second solver pass puts the planned six-run set below
5-of-6. With 2 passes already recorded and only 3 attempts remaining — all Claude,
the opposite provider — the maximum possible total failures for this package's
six-run set is now **1 + 3 = 4**, which is below the 5-of-6 threshold even in the
worst case where all three remaining Claude attempts fail. **This package's planned
six-run set can no longer reach the reported 5-of-6 acceptance bar, regardless of the
outcome of its remaining attempts.** This is a hard ceiling that follows directly
from the recorded run count, not a prediction about future attempts. The three
remaining Claude attempts still have independent value for characterizing this
package's failure rate; they just cannot restore this specific six-run set to the
reported threshold.

[Round Four results](../round-four-failing-five-2026-09-09.md) ·
[Sanitized evidence](../evidence/2026-09-09-round-four-failing-five.json). Trials 1–3
are preserved above.

### Next-round selection — September 9, 2026

The user excluded this package from the next campaign. Its unchanged successor
record is **0 → 1 → 1**, one failure and two passes from three Codex attempts;
even three later Claude failures would produce only 4/6. Preserve all three
results. This exclusion applies to the current six-run set, not a claim that a
future revised package cannot qualify. No further attempt is prepared here.
[Four continuing packages](../../../docs/round-five-continuing-four-handoff.md).


### Final-six audit and preparation — September 9, 2026

The Trial 3 reward remains recorded as 1. Its checker falsely rejects a valid service
that replaces a temporary account name inside the transaction before committing and
publishing the exact restore. No unrelated row is written and no temporary value is
published. The unchanged contract allows transactional row replacement; both the frozen
service grader and private reference checker accept the alternative. Trial 4’s checker
also accepts it. Regrading all three retained submissions gives effective history
**0 → 0 → 1**. The earlier exclusion is superseded: **2 failures in 3 attempts**, with
three Claude slots left. All three must fail to reach 5/6.

The [audit](../final-six-pass-audit-2026-09-09.md) preserves raw records and documents
the separate `final-six-coverage-v1` regrade. The same revision applies to all retained
and future attempts for affected tasks; this is no new public task requirement. See the
[prepared identities](../evidence/2026-09-09-final-six-preparation.json) and
[operator handoff](../../../docs/final-six-handoff.md). No new model trial has launched.

## Trial 5 — final-six campaign, coverage correction and stopped after a pass — September 9, 2026

### A. Identity and execution

Run `snapshot-recovery-repair-attempt-1` in the final-six campaign slot
`.local/final-six-2026-09-09/snapshot-recovery-repair/trial-5/real-campaign-frozen/jobs/real-provider/records/snapshot-recovery-repair-attempt-1/`,
package digest `719dab934ecc20172b4a809f69b4b353db18185c1c15f4c2ed417dcf8902fb5b` —
byte-identical to Trials 2–4; profile digest
`d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794`, route
`professional-multifile/authority-process@1`. Author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a` — the same
author image and frozen runtime as every prior trial for this package.

Target: **Claude**, requested `anthropic/claude-opus-5`, effort `max`, CLI
`scaffoldVersion 2.1.263`. **This is this package's first-ever Claude attempt; all
four prior trials (2–4, and Trial 1) ran on Codex.** Reserved
2026-09-09T22:36:02.596Z, dispatched 2026-09-09T22:36:02.672Z; authoring captured
2026-09-09T23:01:28.124Z, graded 2026-09-09T23:01:35.304Z. Total elapsed ≈1,532,720ms
(~25m33s). Token usage: 5,698,582 input tokens (5,542,977 cached), 126,262 output;
CLI cost estimate $7.48 (subscription-only billing — not a charge). Dispatched under
this campaign's [concurrency amendment](../final-six-pass-audit-2026-09-09.md), which
launched this trial alongside build Trial 7 and temporal Trial 6. Execution reached a
clean `completed` state, no invalid execution or infrastructure error.
`completionSha256 d54e0b6dd2ef1db9d09bb019eeb307875c19006bfb7fe60bf46baeae9bb95fe8`,
`resultSha256 5f53c10cdf771ca68a321e3598cdcec0799e71851a0714c636c3696c0109381d`,
`gradeSha256 a0ffadc5012ac85ec683a1097998828ddcb035ab6a1f59843809104025093387`; all 789
manifest-listed files (4,272,759 bytes) reverified against these hashes with no errors
this session.

### B. Why this trial exists: the coverage correction

This trial was authorized only because of a targeted pass audit — published as
[final-six-pass-audit-2026-09-09.md](../final-six-pass-audit-2026-09-09.md),
regrading revision `final-six-coverage-v1` — that found a checker-grading coverage
gap specific to this package: no existing candidate had tested a valid service
pattern where a temporary value is written to a requested account inside a
transaction and then replaced with the correct value before commit. That is a
legitimate atomic-transaction pattern the unchanged public contract permits; the
frozen service grader and the private reference checker both accept it. The audit
reproduced the gap directly from the actual unchanged grading harness, not from an
invented scenario.

Under that regrade, this package's **Trial 3 (Codex)** — recorded and published
above as reward 1 (pass), and **left untouched in this document** — is now known
to have been a **false pass**: Trial 3's checker rejected the temp-write pattern as
an "out-of-scope write," because it wrongly required every intermediate write during
the transaction to already equal the final committed row, rather than judging
correctness at commit and publication. Under the coverage-corrected accounting,
Trial 3's **effective** reward is 0, while its recorded reward of 1 stays exactly as
originally published in the Trial 3 section above — this section only adds the
correction, it does not alter that record. Trial 4's checker already accepted the
pattern correctly, so Trial 4's effective reward is unchanged at 1.

That gives an effective run history through Trial 4 of **T2=0, T3=0 (effective; was
recorded as 1), T4=1** — 2 failures out of 3 scored Codex attempts. This is exactly
what reopened this package as a candidate for further testing: without the
correction, the *raw*-recorded numbers (1 failure out of 3 scored) were already
below the 5-of-6 threshold on their own, before this trial ever ran. The coverage
correction is what changed that from "excluded, no path to threshold" to "still
mathematically alive, pending the opposite-provider attempts this package had never
run" — it is the reason Trial 5 exists at all.

### C. Results

**Recorded reward 1, effective reward 1 — a clean pass, and the first Claude checker
run against this package's new coverage case.** Base service (`entry.mjs`) passes
all 33 scenarios (33/33). Base checker (`checker.mjs`): `checkerRequired: true`,
`checkerPassed: true`, 12/12 candidates correctly classified — 0 missed, 0 false
positives, `pass: true`. Both known-good candidates (`reference`, `alternative`) are
accepted; all ten negative controls are rejected, each with its expected obligation
observed as failing.

The supplemental `final-six-coverage-v1` grade
(`.local/final-six-2026-09-09/snapshot-recovery-repair/trial-5/supplement/grade.json`)
— the new fixture built specifically for this package's coverage gap — ran this same
submitted `checker.mjs` against two cases in an isolated, network-disabled Docker
sandbox: **2/2 correct, deterministic, `pass: true`**. This checker correctly accepts
both the original reference pattern and the new intermediate-write-then-replace
pattern as valid, closing the exact gap the audit identified. Because both the base
grade and the supplemental grade pass, effective reward equals recorded reward here:
1.

Reading the submitted `checker.mjs` confirms why by construction rather than
coincidence: its out-of-scope-write check (`ALLOWED_TABLES`, around line 275) flags a
write only when it targets a table outside `{'accounts', 'entries'}` — it never
compares an intermediate write's value against the final row. Correctness of the
recovered state is instead judged from the committed restore and publication
(`describeStateDiff` against `cell.actual` and the published state), which is exactly
the commit-time judgment the audit says the contract requires. This submission never
carried Trial 3's assumption that every intermediate write must already equal the
final value.

### D. Observable execution

The capture recorded 953 events over the full authoring window, producing a 286-line
`entry.mjs` and a 315-line `checker.mjs` — both deliverables required, as in every
prior trial on this package. No execution error, retry, or truncated capture is
present (`exitCode 0`, `status: completed`, `truncated: false`). This is the same
frozen starter and public contract Trials 2–4 received; nothing about the coverage
correction changed the package the solver saw.

### E. Final classification — this six-run set is incomplete and cannot reach 5-of-6

Effective history for this package is now **T2=0 (Codex), T3=0 effective — recorded
1, Codex — T4=1 (Codex), Trial 5=1 (Claude, pass)**: **2 failures out of 4 scored
attempts**, using only 3 Codex + 1 Claude — not the full 3-Claude/3-Codex balance this
project's six-run sets otherwise complete. Two more Claude slots, Trials 6 and 7, were
authorized under this campaign's prepared schedule but **never dispatched**: with 2
failures already recorded and at most 2 attempts remaining, the maximum reachable
total is 2 + 2 = 4 failures, below the reported 5-of-6 acceptance bar regardless of
how Trials 6–7 would have resolved. That is why they were skipped — this package's
six-run set stopped immediately after Trial 5's pass, the same "stop after a pass"
rule applied to the other continuing packages in this campaign's remaining schedule.

To state the full picture plainly: without the coverage correction, this package's
raw-recorded numbers (1 failure out of 3 scored, already below threshold on raw
numbers alone even before this trial) would have looked even further from the
threshold than the corrected picture does. The coverage correction is precisely what
reopened this package as a candidate for further testing in the first place, by
revealing that Trial 3's recorded pass did not reflect a checker that actually covered
this contract. Trial 5's result confirms that, under the consistently applied
coverage repair, this package's six-run set still cannot reach the 5-of-6 threshold: 2
failures and only 2 remaining possible attempts cap the total at 4.

[Final campaign and standings](../final-six-2026-09-09.md) ·
[Sanitized evidence](../evidence/2026-09-09-final-six.json).

## Post-final pass audit — September 9, 2026

**Current effective score: 3 failures / 4 scored trials. Reopened for the remaining provider slots.**

The new invalid control changes account name "001" to "1" in both the database and portable backup. Trial 5's shared recovery.mjs compares account names with numeric coercion and accepts the corruption. The frozen verifier, private reference checker and Trial 4 checker reject it. The earlier Trial 3 valid temporary-write correction remains in force.

| Trial | Provider | Original reward | Previous effective reward | Current effective reward | Cumulative supplemental classifications |
| --- | --- | --- | --- | --- | --- |
| 2 | Codex | 0 | 0 | **0** | 1/4 |
| 3 | Codex | 1 | 0 | **0** | 3/4 |
| 4 | Codex | 1 | 1 | **1** | 4/4 |
| 5 | Claude | 1 | 1 | **0** | 3/4 |

Trials 6 and 7, Claude: both must fail to reach 5/6. No new model trial was launched by this audit.

All retained attempts received the same cumulative `post-final-coverage-v2` controls. Original rewards, manifests and the preceding trial sections remain unchanged. Local replay of both previously passing services on this task's new scenario passed; the new failure is in the required checker.

[Full audit and contract basis](../post-final-pass-audit-2026-09-09.md) · [Sanitized per-trial evidence](../evidence/2026-09-09-post-final-pass-audit.json).

## Trials 6–7 — post-final-coverage-v2 campaign, both final attempts — September 9, 2026

### A. Identity and execution

This package's last two remaining authorized attempts. Trial 6 ran in
`.local/final-six-2026-09-09/snapshot-recovery-repair/trial-6/real-campaign-frozen/jobs/real-provider/records/snapshot-recovery-repair-attempt-1/`;
Trial 7 ran in the sibling
`.local/final-six-2026-09-09/snapshot-recovery-repair/trial-7/real-campaign-frozen/jobs/real-provider/records/snapshot-recovery-repair-attempt-1/`.
Both share package digest
`719dab934ecc20172b4a809f69b4b353db18185c1c15f4c2ed417dcf8902fb5b` — byte-identical
to every prior trial on this package — and profile digest
`d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794`, the same
profile as Trial 5. Author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a` — the
same author image and frozen runtime as every prior trial for this package,
Trial 5 included.

Target: **Claude**, requested `anthropic/claude-opus-5`, effort `max`, CLI
`scaffoldVersion 2.1.263` — identical identity to Trial 5. Both were dispatched
together as one concurrency batch and ran in fully independent, blind
workspaces: the controller logged `dispatching` for Trial 6 at
2026-09-10T00:51:23.811Z and for Trial 7 at 2026-09-10T00:51:23.779Z (32ms
apart), and their two containers report `StartedAt`
2026-09-10T00:51:24.039597799Z and 2026-09-10T00:51:24.017969799Z respectively
(22ms apart) — a genuinely concurrent, independent launch, not a queued
sequence. Trial 7 completed at 2026-09-10T01:12:26.015Z, roughly nine minutes
before Trial 6 completed at 2026-09-10T01:21:05.924Z: Trial 7 did not, and
could not, wait for Trial 6's result. Neither workspace had access to the
other's submission, capture, or grade. Both executions reached a clean
`completed` state, no invalid execution or infrastructure error.

Trial 6: authoring ≈29m42s. Tokens: 3,966,705 input (3,787,448 cached),
151,876 output; CLI cost estimate $7.48 (subscription-only billing — not a
charge). `completionSha256 f83eb12a4e4fef2b2d6e75759bae5dfb3b519f82effc91a87e0d595ca29ec801`,
`resultSha256 c76aedea0faa8c201a0a0ba443d9b38c45e212dce612bef0e0db62b8ef00ffaf`,
`gradeSha256 a0ffadc5012ac85ec683a1097998828ddcb035ab6a1f59843809104025093387`;
all 829 manifest-listed files (4,778,327 bytes) reverified against these
hashes with no errors this session.

Trial 7: authoring ≈21m2s. Tokens: 5,094,782 input (4,942,159 cached),
111,353 output; CLI cost estimate $6.78. `completionSha256 20b9ba1be744e03a59562cfeb8f66993f5be3595d4804ee415b87bde7def5f4c`,
`resultSha256 6af2d6aa3498997721041dbb2ee83cb0d31e26163cf30a1bed3ccbfb842e5f6a`,
`gradeSha256 a0ffadc5012ac85ec683a1097998828ddcb035ab6a1f59843809104025093387`;
all 785 manifest-listed files (4,660,055 bytes) reverified against these
hashes with no errors this session. Both reverifications are combined into
this batch's 4,263-file/81,542,893-byte reverification.

### B. Why these trials exist: the new post-final-coverage-v2 control

The post-final pass audit above already reopened this package at 3 failures
out of 4 scored attempts by adding a new invalid control on top of the
standing v1 intermediate-write control: change account name `"001"` to `"1"`
in both the restored database and the portable backup. The contract treats
this as a genuinely invalid corruption — account names are string data in a
TEXT column, not numeric, even though `"001"` and `"1"` look like numbers.
That audit found Trial 5's checker wrongly accepted this corruption because
its `sameScalar()` helper coerced both values to the number `1` before
comparing. Trials 6 and 7 are this package's two remaining authorized
attempts — its last two slots — both scored under this same cumulative
`post-final-coverage-v2` supplemental policy, which carries forward the v1
intermediate-write-then-replace control alongside this new name-corruption
control. Both needed to fail to reach the reported 5-of-6 threshold.

### C. Results — Trial 6 (fail)

Base service (`entry.mjs`) passes all 33 scenarios (33/33). Base checker
(`checker.mjs`): `checkerRequired: true`, `checkerPassed: true`, 12/12
candidates correctly classified — 0 missed, 0 false positives, `pass: true`.

The supplemental `post-final-coverage-v2` grade tells a different story:
**3/4 correct, deterministic, `exactTokens: true`, `pass: false`.** This
checker failed the new v2 control specifically. For token
`617d7a6c7ad87c9ea0833f65` (`expectedOk: false`), the checker returned
`actualOk: true` — it incorrectly accepted the `"001"`→`"1"` name corruption
as valid, with observed verdict
`{ ok: true, reasons: ["every cell reproduces the requested point exactly once"] }`
for the token that should have been rejected. Recorded (raw) reward: 1.
Effective reward: 0.

### D. Results — Trial 7 (pass)

Base service (`entry.mjs`) passes all 33 scenarios (33/33). Base checker
(`checker.mjs`): `checkerRequired: true`, `checkerPassed: true`, 12/12
candidates correctly classified — 0 missed, 0 false positives, `pass: true`.

The supplemental `post-final-coverage-v2` grade: **4/4 correct,
deterministic, `exactTokens: true`, `pass: true`.** This checker correctly
rejected the same `"001"`→`"1"` corruption on the same token,
`617d7a6c7ad87c9ea0833f65`, with an exact-string-mismatch detection recorded
across all three views the checker inspects:

```
cell 0: published restore accounts: missing (1,"001")
cell 0: published restore accounts: unexpected (1,"1")
cell 0: backup accounts: missing (1,"001")
cell 0: backup accounts: unexpected (1,"1")
cell 0: committed restore accounts: missing (1,"001")
cell 0: committed restore accounts: unexpected (1,"1")
```

The account names in those reasons are literally the strings `001` and `1`.
Recorded (raw) reward: 1. Effective reward: 1.

### E. Code-level finding: a third instance of the same coercion mistake — and the first fix

Reading both submitted checkers directly against this same defect confirms it
is not a coincidence of outcome; it is the identical class of bug, independently
written for a third time, plus — for the first time on this package — a
correct fix.

**Trial 6 has the same structurally-coercing defect as Trial 5.** Its
`checker.mjs` compares every account/entry field, `name` included, through one
shared scalar-equality helper:

```js
function numeric(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') {
    const t = v.trim();
    if (/^[+-]?\d+$/.test(t)) { const n = Number(t); return Number.isFinite(n) ? n : null; }
  }
  return null;
}

function sameValue(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const na = numeric(a); const nb = numeric(b);
  if (na !== null && nb !== null) return na === nb;
  return false;
}
```

`diffRows()` then calls `sameValue(er[f], gr[f])` for every field named in
`ACCOUNT_FIELDS = ['id', 'name']` — it applies the same helper to `name` that
it applies to `id`, with no field-specific exemption. Because `numeric()`
accepts any all-digit string, `numeric("001")` and `numeric("1")` both
evaluate to `1`, so `sameValue("001", "1")` returns `true` and the corrupted
name is judged identical to the expected one. This is the same structural
mistake documented for Trial 5's `sameScalar()`: a generic numeric-coercion
comparator applied to a field the contract defines as string data, written
independently by a different session with no shared code. **This is the
third occurrence of the identical "numeric-looking string coerced to number"
mistake on this package (Trial 5 and Trial 6 both wrong this way).**
(Trial 6's `projectRow()` does skip numeric coercion when *storing* the
`name` field — `if (f !== 'name') { ... }` — but that exemption never reaches
the comparison step, since `sameValue()`/`numeric()` re-coerces both sides
from scratch at compare time regardless of which field they came from.)

**Trial 7 avoids it by keying rows on an explicitly string-typed name.**
Instead of a shared scalar comparator, Trial 7's `checker.mjs` compares
account rows via a composite key that stringifies `id` and `name` through
two different, deliberately-chosen helpers:

```js
function accountKey(row) {
  return "(" + label(numOf(row.id)) + "," + label(nameOf(row.name)) + ")";
}

// Names round-trip through a TEXT column, so compare them as text rather than
// letting a host-side coercion look like a divergence. Absent stays distinct.
function nameOf(value) {
  return value === null || value === undefined ? "<<absent>>" : String(value);
}
```

`id` goes through `numOf()` (numeric coercion, appropriate for a numeric
column); `name` goes through `nameOf()`, which always calls `String(value)` —
never attempting numeric coercion — and the code comment explicitly names the
reason: names are TEXT-column data, and a host-side coercion must not be
allowed to look like a divergence. `"001"` and `"1"` therefore produce
different keys, `(1,"001")` and `(1,"1")`, so `compareRows()` correctly
reports one as missing and the other as unexpected — exactly the six reasons
observed in Trial 7's supplemental grade above. **Trial 7 is this package's
first-ever checker, across all seven trials, to get this specific comparison
right**, by treating `id` and `name` as different types requiring different
comparison rules instead of running every field through one shared coercion
path.

### F. Final classification — this six-run set is closed at 4/6, below the reported threshold

**This package needed both Trial 6 and Trial 7 to fail to reach the reported
5-of-6 threshold. Only one of the two failures occurred.** Trial 6 failed
(effective reward 0); Trial 7 passed (effective reward 1).

The complete effective history across this package's full six-run set is now:

| Trial | Provider | Recorded reward | Effective reward |
| --- | --- | --- | --- |
| 2 | Codex | 0 | 0 |
| 3 | Codex | 1 | 0 (corrected by the first audit) |
| 4 | Codex | 1 | 1 |
| 5 | Claude | 1 | 0 (corrected by this campaign's audit) |
| 6 | Claude | 1 | 0 (corrected by this campaign's audit) |
| 7 | Claude | 1 | 1 |

That is **4 failures out of 6 scored attempts** — a complete, balanced 3
Codex + 3 Claude provider split, with Trials 5–7 standing as this package's
first-ever Claude attempts, following the three Codex attempts of Trials 2–4.
4/6 cannot reach the reported "at least 5 failures out of 6" acceptance
threshold. This package's six-run set is now **closed**: its six authorized
attempts are exhausted, both of the final two authorized slots have now been
used, and no further attempt is authorized or possible under the fixed
six-run design.

Raw evidence (private, not linked): Trial 6 and Trial 7 records at
`.local/final-six-2026-09-09/snapshot-recovery-repair/trial-{6,7}/real-campaign-frozen/jobs/real-provider/records/snapshot-recovery-repair-attempt-1/`,
with supplemental adjudications at
`.local/post-final-five-2026-09-09/adjudicated/snapshot-recovery-repair-trial-{6,7}.json`.


## Remaining-pass audit and replacement disposition — September 9, 2026

Trial 4 Codex rejects a valid empty recovery: the source checkpoint, fresh database
and correct staged backup all have empty tables and nextId 1. Publication needs no
database write transaction. The frozen verifier and private reference checker accept
it, while T4's `validateObservations()` requires `successfulCommits > 0` and rejects
it as a publication-contract violation. That additional process restriction is absent
from the contract. T4's actual service still passes all seven new scenario replays.

The user elected a **grading void, not a counted failure**, for T4. Its original
reward remains 1, diagnostic v3 reward is 0, and counted reward is null. The remaining
five attempts contain four failures and one pass. Fresh Codex T8 replaces T4 and must
fail to reach 5/6; the two existing Claude T6/T7 attempts are not repeated.

Trial 7 Claude remains a pass: 18/18 cumulative checker classifications and seven
passing service replays. It handles empty publication, rollback/retry, staged backup
replacement, row ordering and the negative allocation/publication/backup controls.
The prior campaign's "first ever" numeric-name statement was too broad: T4 already
rejected that corruption. No additional defect was reproduced in T7 during this audit.

| Trial | Provider | Original reward | Cumulative v3 diagnostic reward | Counted reward |
| --- | --- | --- | --- | --- |
| 2 | codex | 0 | 0 | 0 |
| 3 | codex | 1 | 0 | 0 |
| 4 | codex | 1 | 0 | Unscored — grading void |
| 5 | claude | 1 | 0 | 0 |
| 6 | claude | 1 | 0 | 0 |
| 7 | claude | 1 | 1 | 1 |

Current counted record: **4/5 failures**; 1 fresh replacement slot(s) pending.

[Full audit](../remaining-pass-audit-2026-09-09.md) · [Verified evidence](../evidence/2026-09-09-remaining-pass-audit.json) · [User-selected counting disposition](../evidence/2026-09-09-three-replacement-disposition.json).

Original submissions and grades were preserved and manifest-verified before and after
the audit. The same cumulative controls covered all 24 retained submissions across
the four audited packages. No new model calls were made during this audit.

## Trial 8 — remaining-pass-coverage-v3 replacement for voided Trial 4 — September 9, 2026

### A. Identity and execution

Run `snapshot-recovery-repair-attempt-1` in the replacement campaign slot
`.local/three-replacements-2026-09-09/snapshot-recovery-repair/trial-8/real-campaign-frozen/jobs/real-provider/records/snapshot-recovery-repair-attempt-1/`,
package digest `719dab934ecc20172b4a809f69b4b353db18185c1c15f4c2ed417dcf8902fb5b` —
byte-identical to every prior trial on this package — profile digest
`a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641`, route
`professional-multifile/authority-process@1`. Author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a` — the same
author image and frozen runtime as every prior trial for this package.

Target: **codex**, requested `openai/gpt-5.6-sol`, effort `xhigh`, CLI
`scaffoldVersion 0.153.2` — identical requested identity to Trials 2–4, this
package's three prior Codex attempts; model, effort and scaffold version were again
unobservable from the Codex CLI's event stream, as in every earlier trial. Authoring
took **20m20s**. Token usage: 642,877 input tokens (590,848 cached), 36,800 output;
the Codex CLI reports no price estimate (subscription-only billing). Execution
reached a clean `completed` state, no invalid execution or infrastructure error.
`completionSha256 8525627ae5de62a798ebe04a53f6626d4a07f4f8aee4091007373a4bf65f62eb`,
`resultSha256 53e533cc4756267e6b5e3ac2cbcb56fcf9ac0894adf088ddfc7de5117362b1a1`,
`gradeSha256 a0ffadc5012ac85ec683a1097998828ddcb035ab6a1f59843809104025093387` —
the same `gradeSha256` as every prior trial on this package, since the base grading
harness itself never changed. All 785 manifest-listed files (2,764,828 bytes)
reverified against these hashes with no errors this session.

### B. Why this trial exists: replacing the voided Trial 4

The [remaining-pass-coverage-v3 audit](../remaining-pass-audit-2026-09-09.md) found
that Trial 4's submitted checker, `validateObservations()`, required
`successfulCommits > 0` before accepting a publication — rejecting a genuinely valid
empty recovery (source checkpoint, fresh database and staged backup all empty,
`nextId: 1`) that legitimately needs no database write transaction, since there is
nothing to change. The frozen verifier and private reference checker both accept
that empty recovery; Trial 4's own service replayed correctly against it. Rather
than count this as an ordinary sixth failure, the user elected a **void-and-replace**
policy for Trial 4 specifically: Trial 4's original recorded reward stays **1**
forever, its diagnostic `remaining-pass-coverage-v3` regrade is recorded as **0** for
transparency, but its **counted** reward is set to **null** — it is permanently
excluded from this package's six-run tally, neither a pass nor a failure, and is
never renumbered or overwritten. This Trial 8 is the one fresh Codex replacement
attempt dispatched to fill that voided slot, graded under the same cumulative
`remaining-pass-coverage-v3` policy as the rest of this package's retained
submissions.

### C. Results

**Recorded (raw) reward: 1. Counted (effective) reward: 0.** Base service
(`entry.mjs`) passes all 33 scenarios (33/33), matching every prior trial on this
package. Base checker (`checker.mjs`): `checkerRequired: true`, `checkerPassed:
true`, 12/12 original candidates correctly classified — 0 missed, 0 false
positives, `pass: true`. Both known-good candidates (`reference`, `alternative`)
are accepted; all ten negative controls are rejected.

The cumulative `remaining-pass-coverage-v3` supplemental grade
(`.local/three-replacements-2026-09-09/supplements/snapshot-recovery-repair-trial-8/grade.json`)
tells a different story: **17/18 correct, deterministic, `exactTokens: true`, `pass:
false`.** This bank is cumulative across all three revisions (v1 + v2 + v3
combined) — the numeric-name-coercion control, the intermediate-write control, and
six new v3 controls (`empty-no-commit`, `retry-rolled-back-transaction`,
`replace-staged-archive`, `reverse-archive-row-order`, `wrong-allocation`,
`no-publication`, `missing-backup-row`), each contributing a baseline/control token
pair. The one failing token, `c04f215f1c245d5ed81b8989` (`expectedOk: true`,
`actualOk: false`), is the `replace-staged-archive` positive control, with the
checker's observed reason: `"cell 0: archive used an out-of-contract request"`. The
numeric-name-coercion token (`617d7a6c7ad87c9ea0833f65`) and every other new v3
control were classified correctly by this checker — only the staged-archive-
replacement case tripped it up.

A separate service-level replay of all seven new v3 scenarios against the submitted
`entry.mjs` (`.local/three-replacements-2026-09-09/service-supplements/snapshot-recovery-repair-trial-8/grade.json`)
passed all seven, `pass: true` — this is entirely a required-checker failure, not a
service defect.

### D. Code-level finding: a distinct new defect, not a recurrence of Trial 4's mistake

The `replace-staged-archive` control tests a pattern the contract explicitly
permits: the service stages one `archive()` payload, then legitimately **replaces**
it with a different, correct payload before publication completes. Only the final
published state has to be correct — not every intermediate call made while staging
it. Reading the fixture directly
(`.local/three-replacements-2026-09-09/supplements/snapshot-recovery-repair-trial-8/cases/input.json`,
token `c04f215f1c245d5ed81b8989`) shows exactly what the submitted service does:
its first observation is `archive({ bytes: "e30=" })` — `"e30="` base64-decodes to
the literal empty object `{}` — followed by fetching the real checkpoint, and only
then a second `archive()` call carrying the fully correct, schema-complete portable
payload, before `begin`/`put`/`commit`/`publish`. The final published archive and
database both match the expected state exactly; this is a legitimate stage-then-
replace sequence, not a corrupted one.

Trial 8's `checker.mjs` breaks on this because its per-observation request
validation is applied to **every** `archive` call in the trace, not only the
final one before publish:

```js
if (method === "archive") {
  const portable = exactKeys(request, ["bytes"])
    ? normalizedPortable(decodeJson(request.bytes))
    : null;
  requestValid = portable !== null &&
    portable.tenant === expected.portable.tenant &&
    portable.branch === expected.portable.branch &&
    portable.cutoff === expected.portable.cutoff;
} else if (...) { ... }
if (!requestValid) {
  fail(`${method} used an out-of-contract request`);
  continue;
}
```

For the placeholder call, `decodeJson("e30=")` yields `{}`, and `normalizedPortable({})`
returns `null` because `{}` has none of the six required portable keys — so
`portable !== null` is false, `requestValid` is false, and the checker immediately
records `"archive used an out-of-contract request"` for that observation and
`continue`s. The second, real `archive()` call two steps later passes this same
check fine and correctly becomes the trace's authoritative `stagedArchive` value
(the code reassigns `stagedArchive` on every accepted `archive` call, so the
*last* one wins by construction — the replacement logic itself is not broken).
The problem is that the checker still applies the same full-schema request check to
the *first*, placeholder call, and a single failure anywhere in the `failures` array
is enough to fail the whole cell — so a legitimate empty/placeholder archive
opener, made before the real payload is ready, gets treated as a contract violation
in its own right, even though nothing about the final committed and published
result is wrong.

This is a genuinely different, independently-discovered defect from Trial 4's
mistake, not the same bug recurring. Trial 4's `validateObservations()` imposed an
extra *process* requirement on **publication** — it demanded at least one committed
write transaction (`successfulCommits > 0`) regardless of whether the recovery
actually needed one. Trial 8's defect is in the **request-shape validation applied
to every `archive` call**, unrelated to commit counting — it fails a legitimate
staging call's schema, not the number or presence of commits. Both are instances of
a checker being stricter than the contract requires by judging an intermediate step
of the trace instead of only the final committed/published result, but they sit in
different validation paths, over different obligations, and were written by two
independent Codex sessions with no shared code between them.

### E. Final classification — this package's six-run set is closed at 5/6, meeting the reported threshold

**This package's counted six-run history is now complete, with Trial 4 permanently
void and Trial 8 as its replacement:**

| Counted slot | Trial | Provider | Recorded reward | Counted (effective) reward |
| --- | --- | --- | --- | --- |
| 1 | 2 | Codex | 0 | 0 |
| 2 | 3 | Codex | 1 | 0 |
| 3 | 5 | Claude | 1 | 0 |
| 4 | 6 | Claude | 1 | 0 |
| 5 | 7 | Claude | 1 | 1 |
| 6 | 8 (replaces voided 4) | Codex | 1 | 0 |

That is **5 counted failures out of 6 counted trials**, with exactly 3 Codex (Trials
2, 3, 8) and 3 Claude (Trials 5, 6, 7) counted attempts — the required balanced
split. Trial 4 itself remains permanently **void** and outside this table: its
original recorded reward stays 1, its diagnostic `remaining-pass-coverage-v3`
regrade stays 0, and its counted reward stays null — it is never counted as either a
pass or a failure, and this table does not renumber it. This package's six-run set
now **meets the reported "at least 5 failures out of 6" threshold, at exactly 5/6,
the minimum boundary** — the last counted slot, Trial 8, was the one attempt that
still needed to fail for the threshold to be met, and it did, through this
newly-identified staged-archive-replacement defect rather than any repeat of an
earlier mistake. No further attempt is authorized or possible under the fixed
six-run design; this package's screening record is closed.

[Full audit](../remaining-pass-audit-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-remaining-pass-audit.json).

Raw evidence (private, not linked): Trial 8 record at
`.local/three-replacements-2026-09-09/snapshot-recovery-repair/trial-8/real-campaign-frozen/jobs/real-provider/records/snapshot-recovery-repair-attempt-1/`,
with the cumulative supplemental grade at
`.local/three-replacements-2026-09-09/supplements/snapshot-recovery-repair-trial-8/grade.json`
and the service-level v3 replay at
`.local/three-replacements-2026-09-09/service-supplements/snapshot-recovery-repair-trial-8/grade.json`.
