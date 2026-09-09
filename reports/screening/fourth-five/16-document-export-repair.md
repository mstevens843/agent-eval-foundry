# 16 — Document export repair

One Codex attempt, requested Sol / xhigh. Authoring **15m 30s**. Recorded reward **1**: service **29/29 scenarios**, checker **13/13 candidates**, including both correct implementations and all eleven negative controls with the required obligation named. No execution error or retry was recorded.

## What the task was, in plain English

Repair a support-record export pipeline. Tickets contain message headers, nested messages, JSON attachments, text attachments and binary attachments. Some payloads are base64 or gzip encoded. The service must remove exactly the information identified by an explicit privacy policy while retaining the useful document, its relationships and its encoding choices.

Deleting everything is wrong. So is finding most private text while missing a nested header. Literal matches are case-sensitive and choose the longest match at each position in the original string; replacement text must not itself be redacted again. JSON field rules and structural metadata follow different policies.

## What was in the frozen package

A functioning multi-file exporter, public format/policy/API definitions, one visible test, hidden service scenarios and a separate checker requirement. The independent host records actual publications and decoded documents; a claimed count is not a deliverable. Binary bytes, message/part identities and relationships are checked alongside privacy.

Before this attempt, preflight corrected a checker-input defect: the old author witness pooled other candidates' read results to discover the source population. The frozen version instead supplies each checker cell's original ticket list, policy and raw source tickets independently. Local tests confirm that empty work is accepted and no work on a nonempty request is rejected even without a companion correct candidate. This was a pre-dispatch validity repair, not a change made after seeing the solve.

## What Codex actually changed

The service repair was small and concentrated in two modules.

First, the original literal filter performed successive replacements, one literal at a time. That can select a shorter overlapping match first or reprocess inserted replacement text. Codex replaced it with a scan over the original input, selecting the longest matching literal and appending unchanged spans plus the marker.

Second, the transform handled text and JSON attachments but omitted the nested-message media type. Codex added recursive decode-transform-encode handling for that case. Existing recursive JSON-field traversal, codec support and binary preservation were already present; the diff does not support crediting those as newly implemented repairs, even though its final summary listed them as supported behavior.

The other substantial deliverable was a **485-line standalone checker**. It decodes actual successful publications, compares messages/parts with raw sources, checks requested identities and duplicate successful publications, and separates privacy from preservation reasons. It accepts semantic equivalence in decoded JSON and gzip content instead of demanding identical serialization bytes. Diagnostic reports are not its authority.

## How it tested the submission

The capture contains eight completed shell-command events. An initial Git-status command failed because the staged workspace was not a Git repository; the agent continued normally. That recovered inspection error is not a failed trial execution.

It ran the single supplied test and module syntax checks. It then created synthetic execution traces covering nested compressed JSON/messages, overlapping literals, JSON-field replacement, altered relationships, swapped publication identity, duplicate publication, missing work and an empty request. The recorded checker output accepted the good and empty cases and rejected the five bad variants with relevant reasons. Repeated checker calls returned the same output in that local exercise.

A separate shell assertion program checked decoded nested values, binary byte preservation, original relationship arrays and literal-replacement behavior. No new retained test files were submitted, and the capture does not show a large randomized fuzz campaign. The useful distinction is between targeted assertions that actually ran and broader testing claims the record does not establish.

## Why the package was solved

The privacy/preservation tension is genuine, but most supporting machinery already worked. The two missing behaviors map directly to explicit contract paragraphs: original-input longest-match scanning and recursive nested-message handling. Once those were implemented, much of the transformation followed ordinary structured traversal.

The checker imposed additional work, but the newly complete raw input made the correct comparison identifiable. The agent implemented both sides of the contract rather than choosing privacy at the expense of useful content. This attempt does not demonstrate a model weakness or establish that a larger document wrapper would make the underlying repair difficult.

## What to retain and what to test next

Keep raw authoritative inputs, decoded semantic comparison, exact structural preservation and both empty/nonempty controls. The ability to accept alternative gzip/JSON serialization is important: byte-level equality would manufacture failures for correct implementations.

A useful successor audit would compare the saved checker against independent correct transformations with varied serialization, field nesting and literal overlap, as well as narrower mutations affecting only one obligation. The checker's classification of a wrong transformation into privacy versus preservation deserves separate scrutiny; passing this thirteen-candidate bank is not proof that every possible malformed export receives precisely the right reason.

Increasing nesting or file count alone is not a supported hardness improvement. A substantially different professional workflow would need its own coherent requirements and bounded solution. No confirmed in-contract submission defect or false-positive grade was found here; future probes must remain labeled diagnostic work, not retroactive model trials.

## Evidence boundary

[Sanitized batch record](../evidence/2026-09-08-fourth-five.json) preserves the original package/profile/source identities, results and verified artifact hashes. [Current task source](../../../tasks/document-export-repair/) is separately maintained. This report uses observable commands, outputs and submitted code, not private internal reasoning or independent blind adjudication. No additional provider calls or diagnostic regrades were used for the analysis.

## Changes applied since this trial (2026-09-08)

None to this package specifically — every reviewing agent independently converged that this trial's clean reward-1 result (all 143 batch-wide service scenarios and 66 checker classifications reproduced correct) needed no fix, and recommended parking it. A shared grading-harness fix did land afterward (see [17-analytical-reconciliation-repair](17-analytical-reconciliation-repair.md) and [20-workflow-authority-repair](20-workflow-authority-repair.md)): `gradeChecker`'s `namedRightCheck` previously required a submitted checker to name the ONE privately-designated "primary" obligation for a control, even when that control's own real trace genuinely violated several public obligations at once. Fixed to credit any obligation the control's own authoritative trace actually failed. No scenario, control or reference file belonging to this package was touched, and this package's own checker already named its primary labels correctly (11/11), so this fix changes nothing here.

**Regrade confirms no regression.** This trial's already-preserved checker.mjs was re-run against the fixed harness with zero new model calls: still a full pass (13/13 correct, 0 false positives, 0 missed, all 11 controls correctly named), unchanged from the original result.

**When trials run again:** this package's grading should behave exactly as before.


## Trial 2 preparation — fourth ranked group (2026-09-09)

**Ready for second exploratory trials through Foundry or native Harbor.** No new model attempt is recorded by this engineering work. Removed the public codec, publisher, service and transformation modules after completing the private reference closure. Retained the independent iterative/regex-based alternative. The new checker independently decodes successful publication bytes, derives the required redactions from original documents/policy and verifies structural and binary preservation. Equivalent JSON/gzip serialization remains valid; the checker does not import the grader or rely on its normalized document output.

Both service and checker are required. The public entry is empty, reason strings are optional diagnostics, helper modules are allowed, and the contract retains the facts needed to judge correctness. Existing shared authoring-policy improvements apply; no additional exploration gates were introduced.

Local validation passed 16 assurance checks across 29 service scenarios, including complete reference/alternative services and semantic rejection of the untouched starter. The independent checker classified **13/13** candidates correctly, with zero false accepts or misses. All 22 native static checks and six verifier integrity controls passed. The exact native export earned oracle reward 1 and nop reward 0, with no infrastructure error; nop rejects the absent required checker. Foundry assurance separately verifies the empty service's semantic failure. Export reproduction and targeted regression checks passed.

Foundry export: `.local/fourth-ranked-five-implementation-2026-09-09/release-ready/document-export-repair/export`. Package digest: `3111ac16dd55679ad87eb03666de42479344a0906efb1406ee80bc6abef5e6ab`. Native digest: `ddc03ad7ecda3d7cf6cf129d51dffe455eef13b705b86433ebadb106ba24d1c8`. Suggested Trial 2 target: **Codex**, retaining this package's original model family. Append the eventual Trial 2 result below this engineering record, preserving Trial 1.

[Group implementation and selection](../fourth-ranked-five-implementation-plan-2026-09-09.md) and [exact validation evidence](../evidence/2026-09-09-fourth-ranked-five-implementation.json) retain file hashes, native trial identities and the remaining final-qualification requirements.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `document-export-repair-attempt-1`, package digest
`3111ac16dd55679ad87eb03666de42479344a0906efb1406ee80bc6abef5e6ab`, route
`professional-multifile/authority-process@1`. Dispatched through the `real-provider`
execution route (signed JobStore reservation, Ed25519, realm `real-provider`,
`billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`) — a fresh
campaign slot (`attempt-1`), not an infrastructure retry. Controller adapted from the
third-ranked-five campaign, importing the same isolated runtime built and
independently verified earlier in this session (`.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js`,
re-hashed unchanged immediately before this dispatch). Author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`. Evidence
retained at `.local/round-two-fourth-ranked-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/document-export-repair-attempt-1/`.

Target: **codex**. Requested `openai/gpt-5.6-sol`, effort `xhigh`, CLI
`scaffoldVersion 0.153.2` (verified baked into the pinned author image). Observed:
model, effort and scaffold version are all unobservable from the Codex CLI's event
stream — a known instrumentation limit, not a data quality problem.

Dispatched 2026-09-09T16:47:55.106Z as one of five reservations installed within a
216ms window (16:47:54.943Z–16:47:55.159Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently, so this was a genuinely concurrent
five-way campaign. Completed 2026-09-09T17:07:07.039Z. Total elapsed ≈1,151,933ms
(~19m12s) — solver authoring time (capture wall clock) ≈1,141,164ms (~19m1s), grading
≈10.8s. Execution reached a clean `completed` state with no invalid-execution or
infrastructure error.

### B. What changed since Trial 1

Trial 1's starter already contained a functioning multi-file exporter with two
specific defects (successive-replacement literal matching instead of longest-match
scanning, and missing recursive nested-message handling); Codex's Trial 1 fix was
concentrated in those two modules, on top of substantial pre-existing machinery.
This successor's starter is empty — the public codec, publisher, service and
transformation modules were all removed after the private reference closure was
completed, so Trial 2 had to author the entire service and its independent checker
from nothing, not patch two functions in an otherwise-working implementation.
Reason strings remain optional diagnostics; both service and checker stay required
deliverables.

### C. Results

Reward **1**. Service: all 29 expected scenario IDs observed, zero failures, zero
missing/unexpected IDs — full pass. Checker: `checkerRequired: true`,
`checkerPassed: true`, 13/13 candidates correctly classified (0 missed, 0 false
positives), deterministic. A clean pass on both required deliverables, matching
Trial 1's outcome under the same Codex/xhigh pairing despite starting from an empty
starter this time.

### D. Observable solving behavior

The capture is lean: 40 events total (5 agent messages, 22 command executions, 10
file edits) — the leanest of this round's five attempts. Codex opened by listing the
workspace and reading `SEMANTICS.md`, `api.d.ts` and `CHECKER-INPUT.md` in one
command, then the (empty) `entry.mjs`/`instruction.md` in a second. It wrote
`entry.mjs` and `checker.mjs` together before any test ran, then validated
iteratively via `node --check` plus a sequence of ad hoc `node --input-type=module`
heredoc scripts rather than a persistent test suite file — each one constructing a
synthetic ticket/policy pair and importing both `subject.run` and the checker's
`run()` directly.

Two concrete, evidenced revisions during that validation: (1) it caught and fixed a
BOM/edge-case literal-matching scenario using a `﻿`-prefixed string it
constructed by hand; (2) its own agent messages record that the checker's
decompression-size guard was originally too tight — "a 256 KiB compressed text part
can legitimately become about 2.5 MiB" once a one-character literal expands to the
ten-byte `[REDACTED]` marker — and it widened `MAX_INFLATED_PART` accordingly while
keeping the decompression-bomb protection. Its final message lists exactly what it
built and tested ("syntax checks, complex nested fixtures, alternate valid
serialization, negative cases, empty input, and maximum redaction expansion") and
that claim matches the actual grading result — no overclaiming found.

### E. Comparison and next step

Trial 1 (working from a substantially pre-implemented starter with two isolated
defects) reached reward 1 in 15m30s. Trial 2 (empty starter, full from-scratch
implementation of both `entry.mjs` and `checker.mjs`) reached the same reward-1
outcome in 19m1s of authoring time — modestly longer, consistent with writing
materially more code, but not a large gap given the starter removed nearly
everything. Both trials are clean passes on the same model/effort pairing with no
disputed element on either dimension. This package now has two independent clean
passes (one against a partial starter, one from empty) using the same Codex
assignment; it looks like a stable, low-difficulty result for this specific
package/model pairing rather than one that depended on the removed starter
scaffolding. Recommend treating it as a control/calibration task rather than a
priority for further failure-finding trials, consistent with the existing
recommendation in the "Changes applied since this trial" section above.

### F. Verified publication record — September 9, 2026

Reward **1**; service **29/29**; checker **13/13**. All **850** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-fourth-ranked-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-fourth-ranked-five.json). Earlier trial records are preserved.
