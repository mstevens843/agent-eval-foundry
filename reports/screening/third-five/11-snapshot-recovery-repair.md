# 11 — Snapshot recovery repair

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
