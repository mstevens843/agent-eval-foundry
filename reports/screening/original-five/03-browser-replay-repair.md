# 03 — Browser replay repair

**Final 3.0.0 screening result (September 11): 6/6 counted trials returned reward=0, with three Codex and three Claude trials.** This task is one of the [nine qualifying tasks](../final-results-2026-09-11.md). Full historical trials, audits and excluded attempts remain below.

Claude solved the frozen browser task: reward 1, **16/16 scenarios**, reported duration **25m 35s** for the completed retry. The earlier 9m 54s attempt ended in a capture infrastructure error, not a model failure.

## The task and package

Replay recorded form actions against real Chromium pages whose live state can differ from the recording. Forms can remount, decoys can share selectors, inputs can lose their value, buttons can be disabled and confirmation dialogs can appear. The service must act on the intended entity, verify current preconditions and avoid duplicate effects across repeated delivery.

The public contract exposed observation, action, settling, dialog and receipt operations. The protected authority owned the browser and real effect ledger; recorded browser trace archives were retained. Hidden checks covered completion, confirmation, current preconditions, exact effects, preservation and truthful reporting.

## What the agent actually worked through

The submission was a substantial rewrite. It surveyed live candidates by entity/field identity, relegated selectors to hints, re-observed after filling, checked receipts around delivery, handled confirmation dialogs and replaced attempt-qualified completion keys with stable step identities.

The captured work included a self-built DOM simulator, checking that tests rejected the original starter, a 3,000-case fuzz exercise and deliberate fault injection. It found bugs in its own repair: conflating a driver error with disconnection, and confusing a leftover dialog with a new dialog when different steps had identical entity/field/value. A final review corrected the priority between genuinely identified-but-disabled elements and merely noncontradictory enabled candidates.

Those are observations of recorded development behavior. The independent result is the sixteen accepted service scenarios, not the agent's self-reported fuzz count.

## Corrections and implications

The early analysis suspected that an unconditional completed report could pass without a real effect. That verifier-blind-spot claim was **retracted**: the independent completion check already compared actual committed effects and would reject missing work. A suspicious reporting path does not establish that the grader accepted an incorrect execution.

Similarly, making completion impossible under a contract that guarantees eventual attainability is not legitimate hardening. Additional interruption or dialog schedules must respect the stated guarantees and be validated against correct alternatives. Separate post-screening crash experiments are not additional model trials or demonstrated improvement and remain outside this publication's maintained baseline.

The capture bug was concrete: valid large streamed JSON events exceeded the old line limit. The maintained capture code now allows a bounded 4 MiB event line, with tests for both acceptance and rejection at the limit. Total capture remains bounded.

## Evidence boundary

[Sanitized records](../evidence/2026-09-07-original-five.json) distinguish the failed capture from the completed retry and preserve artifact hashes. [Maintained task](../../../tasks/browser-replay-repair/) and [batch limitations](../README.md) provide context. The reported CLI dollar estimate is not an actual subscription charge.

## 2026-09-09 — Engineering successor prepared for Trial 2

**Ready for a second exploratory Foundry trial; no second model trial has run for this version.** This section is an engineering record, not a new reward result. Priority in the next group: 2/5. See the [selection and implementation report](../next-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-next-five-implementation.json). Earlier trial results and package descriptions above remain historical.

Integrated the four interruption successor scenarios (20 scenarios total), using a task-private adapter that actually ends the submitted process after a host operation commits and before its response reaches the submission. Restart preserves the real browser, storage and external effects. The public contract describes that failure boundary and redelivery without prescribing a journal design. Added a whole-trace-only memoization negative control with an ordinary non-crash witness. The reference and alternative service closures are now entirely private; the public service entry point is empty.

This version also adds a release-validator deliverable. Its raw inputs include recorded events, complete attempts and confirmation behavior; the independent private checker evaluates committed effects, order, current preconditions and reports. Real Playwright ZIP traces are retained as verifier artifacts, while archive payloads and derived correctness fields are excluded from checker input. This is a versioned task change: compare Trial 2 with the historical service-only trial accordingly.

Local validation passed 13 service-assurance checks, including correct reference and alternative services, semantic failure of the untouched starter, repeatability and negative-control activation. The independent checker correctly classified 10/10 candidates: two correct implementations and 8 negative controls, with zero false accepts or misses. The Foundry export rebuilt identically and passed fresh recipient validation. All 22 native static checks passed. These controls are author-side evidence, not model attempts or proof that an unseen solver will fail.

The earlier native browser integrity attempt timed out at 600 seconds during browser-context shutdown. The final native export adds an init process; direct integrity uses --init. The September 9 rerun passed all six controls on this exact export, including forged reward/output rejection, with the private checker correctly classifying 10/10 candidates. The earlier timeout remains development evidence. The Foundry export is unchanged. September 9 native preflight: this exact final export passed its Harbor oracle with reward 1 and nop with reward 0, with no infrastructure error. Nop rejects the missing required checker; Foundry assurance separately verifies the empty service starter fails semantically. All five packages in this group passed both native jobs. These are local checks, not Trial 2 model attempts.

Use this exact Foundry export:

- Directory: `.local/next-five-implementation-2026-09-09/release-ready/browser-replay-repair/export`
- Package digest: `ab3f64e81500aa342ff899eba2a0a9a24421345e91a78f7d900cfd044aec1d71`
- Native build, with the validation boundary above: `.local/next-five-implementation-2026-09-09/harbor-final/browser-replay-repair`
- Native digest: `87ee896596d463215fa65ca067ba308f68161a370c8154909d2b9fd08ae061d9`

Both deliverables are required. The checker must return complete deterministic Boolean verdicts; reasons are optional diagnostics and submitted helpers are available. Public API, output schemas and observable requirements remain provided, without a worked implementation.

When Trial 2 finishes, append its actual model/profile, frozen package digest, service and checker outcomes, elapsed time, infrastructure exclusions and observed submission defects here. Do not overwrite Trial 1 or count an infrastructure error, an author control or an old label dispute as a new standard model failure.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `browser-replay-repair-attempt-1`, package digest
`ab3f64e81500aa342ff899eba2a0a9a24421345e91a78f7d900cfd044aec1d71`, route
`professional-multifile/authority-process@1`. Dispatched through the `real-provider`
execution route (signed JobStore reservation, Ed25519, realm `real-provider`,
`billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`) — a fresh
campaign slot (`attempt-1`), not an infrastructure retry. Controller:
`.local/round-two-next-five-2026-09-09/campaign.mjs`, a small, independently-verified
adaptation of the completed top-five campaign's controller; it imports the same
isolated runtime built and verified earlier (`.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js`,
re-verified byte-identical immediately before this dispatch). Author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`
(`foundry-provider-agent-portfolio:2026-09-07`). Evidence retained at
`.local/round-two-next-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/browser-replay-repair-attempt-1/`.

Target: **claude**. Requested `anthropic/claude-opus-5`, effort `max`, CLI
`scaffoldVersion 2.1.263` (verified baked into the pinned author image). Observed
from runtime events: `model="claude-opus-5"` (matches requested); effort and
scaffold version are not exposed by the CLI's event stream and remain unobserved.

Dispatched 2026-09-09T13:43:45.310Z as one of five reservations installed within a
230ms window (13:43:45.249Z–13:43:45.479Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently at launch. One sibling job in this
same batch (route-policy-repair) was later interrupted by a host memory-pressure
kill of the controller process — written up separately as inconclusive — but that
had no effect on this job's own execution, which ran to a clean, valid completion.
Completed 2026-09-09T14:10:53.059Z. Total elapsed ≈1,627,749ms (~27m8s); solver
authoring time ≈1,564,889ms (~26m5s); grading ≈63s (this package's grading route
replays real browser traces, longer than the other packages' grading). CLI-reported
usage: 6,231,871 input tokens (6,072,113 cached), 127,035 output tokens; the CLI's
own `total_cost_usd` reports $7.91 — a metered-price estimate only, not an actual
charge, since billing was subscription-only with `maxMicroUsd: 0`. Execution reached
a clean `completed` state with no invalid-execution or infrastructure error.

### B. What changed since Trial 1

Most significant: **this successor adds a required, independently-graded checker**.
Trial 1 graded the service only. The starter is now a single empty `subject.run`
entry point (Trial 1's starter already supplied observation/action plumbing); the
four interruption successor scenarios and the whole-trace-only memoization control
noted in the September 9 engineering record above are part of the protected bank
this submission was graded against.

### C. Results

**Reward 1 — both required deliverables passed cleanly, the first time this
package's checker has ever been graded.** Service: all 20 expected scenarios
observed, zero failures, zero missing/unexpected IDs. Checker: `checkerRequired:
true`, `checkerPassed: true`, 10/10 candidates correctly classified — 0 missed
defects, 0 false positives. `reasonPolicy` is diagnostic-only for this package;
only the boolean verdict was graded.

### D. Observable solving behavior

21 `Bash`, 18 `Edit`, 9 `Write`, 2 `Read` tool calls captured (829 total events).
The submitted `entry.mjs` (a single 354-line `Replayer` class) is built around five
explicit invariants stated in its own header comment: receipts are the only durable
truth (every submission gated on a fresh `receipts({})` read, with the run itself
*starting* by settling to stability before that first read, so render work an
interrupted predecessor left pending becomes visible rather than silently repeated);
recorded selectors are treated as hints only — a candidate is accepted solely by
`observe`-ing it live (connected, matching entity/field), so a decoy that merely
*claims* the recorded identity in the `query` record is rejected on observation;
nothing is ever clicked without an immediately preceding `observe` confirming a
connected, ready form holding the exact recorded value, with remounts triggering a
refill; and a dialog is confirmed only after a fresh `dialog({})` read still shows
the intended entity/field/value, with an already-open dialog also checked at step
entry to recover from an interruption that ate the response to the submit that
opened it. Everything is bounded (RPC and wall-clock budgets, capped retries per
step) — its own final report notes peak observed usage of 137 RPCs against a 4,000
budget.

Per its own final summary (captured verbatim in `capture/stdout.log`), the agent
built a self-contained driver simulator before finalizing either file — injecting
decoys, moved selectors, disabled-until-settled forms, two distinct remount-timing
patterns (on-settle and immediately-after-query), stale candidates, dialogs opening
on settle, commit-on-settle, a "live twin" form that commits nothing, drifting
dialogs, and interruption injection that completes the host operation but loses the
response — then ran the service against it: **122/122 self-test scenarios**,
including a randomized flag sweep and interruptions injected at each method and at
the fill-vs-submit boundary. It self-tested the checker separately and more broadly
than the service: 244 correct cells accepted (every scenario run through two
structurally different correct implementations), 15 buggy candidate classes
rejected, 29 hand-built discrimination cases landing on the expected side, plus
explicit determinism, non-mutation (deep-frozen inputs), malformed-input and
verdict-completeness contracts. This self-testing regime is consistent with, and
plausibly explains, the clean 10/10 official checker result — unlike the
issued-report-repair (25) and incremental-build-repair (21) trials in the prior
top-five campaign, this agent's own broad self-testing did not leave an
undetected gap. The final completion claim ("both artifacts are in place... and
green across every suite I built") matches the actual grading outcome.

### E. Comparison and next step

Trial 1 reached reward 1 on the service alone (16/16, no checker requirement) after
one capture-infrastructure retry; this trial reached reward 1 on both required
deliverables from a single attempt, with the service scenario count now 20 (the
successor's four added interruption scenarios plus the memoization control) and,
for the first time, a graded standalone checker at 10/10. Starter removal does not
appear to have produced material extra difficulty here: the agent still built a
complete driver simulator and passed both deliverables cleanly. Retain this submission as a correct control and prioritize the observed reward-zero
candidates for further trials. Its broad checker self-testing is useful evidence
about why this attempt succeeded at the task; it is not a Foundry failure-finding win.

### F. Verified publication record — September 9, 2026

Reward **1**; service **20/20**; checker **10/10**. All **770** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-next-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-next-five.json). Trial 1 is preserved.


## September 10, 2026 — successor 3.0.0 engineering (no new model trial)

This is a new task version, not a regrade of the successful Trial 2 package. The
original trial evidence and interpretation above are retained verbatim. At the
start of this work all 171 maintained files matched the frozen Trial 2 exports.

### New business requirements and prior simplifying strategy

The author receives the same functioning Meridian Records application, DOM/Chromium bridge and server protocol used by evaluation, plus a public demo and replay command. Navigation, session renewal, remounts, competing dialogs, operation IDs and deterministic background commitment are observable. Identity is JSON.stringify([traceId, step]); receipts can lag both commitment and UI updates.

The saved Claude submission reasoned against a purpose-built simulator with step-filtered candidates and durable receipts. The successor queries all current-page forms and operates against the accessible application. The old observe-after-fill prescription is replaced with an atomic current-form precondition.

### Additional coverage and implementation evidence

Repeated entity/field/value at different steps; navigation/session expiry; query/fill remounts; stale same-tuple dialogs; commitment before visible receipt; interrupted execution and independent redelivery. Public application facts contain no hidden expected results.

An alternative submits using the returned fill state without another observe call, recovering on stale responses, and passes. Negative controls conflate tuples, trust pending UI, confirm the competing dialog or stop after early steps. Playwright UI inspection confirmed the author-visible app; protected execution uses pinned Chromium.

Complete private service and checker references, authority/schema updates, legal
alternatives, controls and reproducible Foundry/native Harbor exports are included.
Public core entry points remain empty. The new service reference and alternative
pass 18/18 scenarios; the reference checker passes 8/8 candidate traces.
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

Added incorrect reports, reordered effects and an incorrect accepted action after correct effects; accepted idempotent repeats and exact/empty identities. Authenticated private HTTP ingress prevents bypassing the real DOM boundary.

Reference service: **19/19**. Both complete correct alternatives pass. Required checker: **12/12** classifications over the full scenario population, with diagnostic-only reasons. Native oracle returns 1; untouched nop returns 0 without an infrastructure error. All nine native integrity controls pass.

Foundry export: `.local/next-five-hardening-2026-09-10/release-browser/browser-replay-repair/export`. Digest: `7511a91b15231268c3fe86e12e67b644805efc35e546edd83a5629eba2508ace`. Native export: `.local/next-five-hardening-2026-09-10/harbor-frozen-v2/browser-replay-repair`. Digest: `1e04c8674236b4d7395cefb37e12a34c80ec228d2fe84ccebceb86b058eddfa0`.

The [hardening report](../next-five-hardening-2026-09-10.md), [obligation map](../next-five-hardening-coverage-2026-09-10.md) and [evidence](../evidence/2026-09-10-next-five-hardening.json) record the added cases, mutation audit, protections and frozen artifacts. These are engineering checks before model trials, not another scored trial or a historical regrade. Prior trial results above are unchanged.

## Trial 3 — hardened successor 3.0.0, attempt 1 — September 10–11, 2026

First model trial on the hardened 3.0.0 package, dispatched concurrently with the
other four hardened-next-five-trial-one packages at 2026-09-11T01:13:36.985Z
against the frozen `hardened-next-five-trial-one-2026-09-10` runtime (source digest
`153bdf9d0675e7d4ca59a7fe9b21430e887d24e889db7bbfb134e5dc4d7fa41d`). Requested
profile: `anthropic/claude-opus-5`, effort `max`, via Claude Code (`profileDigest`
`d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794`). Package
digest `7511a91b15231268c3fe86e12e67b644805efc35e546edd83a5629eba2508ace`, matching
the hardened export above.

Reward **1**. Service **19/19** (`semantic-pass`). Checker **12/12**, no false
positives, no missed classifications, deterministic. 41m58s of authoring
(job completed 2026-09-11T01:57:28.291Z), 6,011,476 input tokens (5,858,441
cached) and 113,202 output tokens, $7.2901915 (subscription billing). No infrastructure
interruption on this attempt. Job id `browser-replay-repair-attempt-1`, published
to `real-campaign-frozen/jobs/real-provider/records/browser-replay-repair-attempt-1`
with a verified 1,236-file completion manifest.

This is the first scored trial on the hardened 3.0.0 revision. It stands
independently of the successful Trial 2 (successor) pass recorded above; the
earlier package's contract, checker and scenario population all differ. See
[the campaign summary](../hardened-next-five-trial-one-2026-09-10.md) and
[sanitized evidence](../evidence/2026-09-10-hardened-next-five-trial-one.json)
for the other four packages' results and the publication-recovery incident
affecting two of them (not this one).


## Independent post-trial audit — September 11, 2026

The recorded reward remains **1**, but two actual negative executions expose missing checker coverage. In `case-006`, a correct reference-based service returns `null` on the second completed delivery after an interruption occurred during the first; the saved checker wrongly excuses that missing report. Another control returns `{report: correctSummary}` rather than the required top-level summary, which the checker wrongly unwraps. Frozen service grading rejects both for `reports`; the submitted checker accepts both twice, while the reference checker rejects them and accepts unchanged baselines. Integrate both controls before further trials. The existing completion-report requirement already covers these failures.

See the [full independent audit](../../hardened-next-five-pass-audit-2026-09-11.md) and [hashed evidence](../../evidence/2026-09-11-hardened-next-five-pass-audit.json). This audit made zero provider calls and preserved the original trial records.


## Coverage-v2 integrated and next trial prepared — September 11, 2026

Both missing-report-after-interruption and wrapped-report controls are integrated. The saved service passes 19/19; its checker misses those two controls under both opaque and ordinary tokens (12/14). The reference accepts all valid candidates and rejects both new violations.

Public 3.0.0 instructions, interfaces and starters are byte-identical to Trial 3. The corrected private Foundry package is `712f97575821006724eef7f3b3161c97512019897af62e46ab32b9c32dcddf31`. Reference validation passes **19/19 service scenarios and 14/14 checker candidates**. Native oracle/nop and integrity checks pass. These are replays and engineering checks, not new model attempts; the historical reward remains recorded.

The next authorized run is **Trial 4**, one fresh **Claude** attempt alongside the other four packages. It has been prepared but not dispatched. See the [integrated coverage report](../next-five-coverage-v2-2026-09-11.md), [exact evidence](../evidence/2026-09-11-next-five-coverage-v2.json) and [operator handoff](../../../docs/hardened-next-five-trial-two-handoff.md).

## Trial 4 — 3.0.0 / coverage-v2 — September 11, 2026

Second model attempt on the unchanged public 3.0.0 contract, first on the corrected private grading revision coverage-v2. Campaign `.local/hardened-next-five-trial-two-2026-09-11/`, frozen runtime source digest `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`. Job `browser-replay-repair-attempt-1`, package digest `712f97575821006724eef7f3b3161c97512019897af62e46ab32b9c32dcddf31`, profile digest `d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794` (requested `anthropic/claude-opus-5`, effort `max`, via Claude Code). Dispatched 2026-09-11T03:55:41.235Z, completed 04:30:07.956Z (34m27s wall; 1,928,450ms / 32m8s authoring per `capture.json`). Usage: 6,827,118 input tokens (6,660,317 cached), 116,562 output tokens, $7.912739 (subscription billing). Published to `.../real-campaign-frozen/jobs/real-provider/records/browser-replay-repair-attempt-1/`, independently re-verified via `verifyEvidence` this session: 1,387 files, all hashes match. No infrastructure error.

Reward **0**. Service **semantic-pass, 19/19** scenarios (`grade.json`'s `evaluation`: expected/observed ids match exactly, no missing/unexpected/problems) — the submitted repair itself is correct.

Checker: coverage-v2 replaced descriptive checker-grade candidate names with opaque per-run tokens (`.../grading/checker-grade/cases/cases.json` lists 14 tokens for this package, one of which is the literal string `"__proto__"`). The submitted checker (`.../grading/submission/checker.mjs`) builds its verdicts as a plain `const verdicts = {}` (line 345) and assigns results via bracket notation, `verdicts[key] = ...` (line 359, also read at line 357). Because `Object.prototype.__proto__` is an inherited accessor, assigning to a plain object's `"__proto__"` key via bracket notation never creates an enumerable own property — it reassigns the prototype (or no-ops) instead, so the emitted JSON never contains a `"__proto__"` key. Independently confirmed: the actual `checker-process.log` output has exactly 13 of the 14 expected token keys, missing only `"__proto__"`.

The frozen harness's `completeVerdicts()` shape check (`src/packages/portfolio.ts`) requires an exact key-count match against every expected token; this single missing key throws `CHECKER_OUTPUT_SHAPE`, and `gradeChecker()`'s catch branch returns a synthetic all-failed result (`deterministic:false, correct:0, missed:14, falsePositives:0, pass:false`) instead of a real per-candidate score. The checker's actual judgment on the other 13 tokens was never scored — the harness's binary shape gate discarded the whole output before any content comparison. So `grade.json`'s effective "0/14 correct" is a harness-level shape-validation short-circuit caused by one specific object-literal-as-dictionary bug, not a demonstrated finding that the checker misjudged 13 legitimate candidates. It is still a real, reproducible interface-coverage defect — a plain object literal is an unsafe dictionary for untrusted opaque keys — and a legitimate reward-zero outcome under the task contract, since the required checker deliverable never produced a valid verdict set.

This is distinct from, not a restatement of, the independent audit's earlier finding above (checker accepts invalid completion reports under an earlier grading revision) and from the "12/14 under both opaque and ordinary tokens" replay figure in the coverage-v2 integration note above (that figure replayed Trial 3's saved submission and checker code against the new candidate bank — different code from this fresh Trial 4 attempt's own submission and checker). No infrastructure interruption; no additional model calls. This trial's evidence is independent of the Trial 1/2/audit/replay sections above, which used a different task version or grading revision; those sections are unchanged.


## Third 3.0.0 attempt prepared — historical Trial 5

September 11, 2026 UTC: one fresh **Claude** attempt is prepared, concurrently with the other four tasks, using the exact package, profile and frozen runtime from Trial 4. This is attempt **3** on the public 3.0.0 task and is labeled **Trial 5** in this document's full history. No new model call has been launched by preparation. The provider remains the same for this round; any opposite-provider block comes later under a separate handoff. Previous results and replay accounting are unchanged.

See the [prepared execution handoff](../../../docs/hardened-next-five-trial-three-handoff.md) and [verification manifest](../evidence/2026-09-11-hardened-next-five-trial-three-preparation.json).

## Trial 5 — 3.0.0 / coverage-v2, attempt 3 — September 11, 2026 (infrastructure interruption, unscored)

This attempt is an infrastructure interruption, not a scored checker or service result. **No reward, service score, or checker verdict is recorded for it.**

Campaign `.local/hardened-next-five-trial-three-2026-09-11/`, byte-identical packages/grading/runtime to Trial 4 (source digest `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`). Job `browser-replay-repair-attempt-1`, package digest `712f97575821006724eef7f3b3161c97512019897af62e46ab32b9c32dcddf31`, profile digest `d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794` (requested `anthropic/claude-opus-5`, effort `max`, same profile as Trial 4). Dispatched 2026-09-11T05:07:22.390Z. The container crashed after 1,898,868ms (~31m39s) of authoring, at 2026-09-11T05:39:01.386Z. `result.json` records `outcome: "invalid-execution"`, `countsAsModelFailure: false`, `usage: null` — the harness's own bookkeeping already excludes this from model-failure and reward accounting. Published (partial record only) to `.../real-campaign-frozen/jobs/real-provider/records/browser-replay-repair-attempt-1/`, independently re-verified via `verifyEvidence`: 102 files, all hashes match — a much smaller manifest than a completed attempt, since grading never started.

**Crash forensics.** `capture.json`: `{"status":"process-error","error":"exit 134, signal null","exitCode":134,"eventCount":970,"bytesSeen":817951,"milliseconds":1898868}`. Exit code 134 is signal 6, SIGABRT. Docker's own container inspect (`authoring-runtime.json`) reports `{"ExitCode":134,"OOMKilled":false,"Error":"","Status":"exited"}` — the daemon recorded no error of its own and explicitly did not flag this as a cgroup-level OOM kill. `capture/stderr.log` is exactly 0 bytes: no diagnostic was captured before the crash. A classic V8 "FATAL ERROR: JavaScript heap out of memory" abort normally prints to stderr before calling `abort()`, so this absence leaves open whether the process died too abruptly for that write to flush, or the abort came from a different code path entirely — this is an open question, not a settled one.

`capture/stdout.log` (970 lines, 817,951 bytes) ends cleanly with a complete, well-formed, newline-terminated JSON line: an ordinary streamed `assistant` event carrying a `thinking` content block, `usage: {"input_tokens":2,"cache_read_input_tokens":163301,"output_tokens":2,...}`. This is not a mid-write truncation — the last fully-written event was normal, and nothing more was written before the process died.

`src/execution/capture.ts` was read in full and its control flow rules out this project's own capture/buffering logic as the cause. That file's `MAX_EVENT_LINE_BYTES` (4 MiB) guard and its overall byte-quota guard each actively set `result.status` to `"malformed-events"` or `"output-limit"` and kill the child *before* any natural process exit, if triggered (lines 107, 114, 155). But the actual final status recorded is `"process-error"`, which lines 174–175 only set when `result.status` was still `"completed"` at the moment the child's own `close` event fired naturally with `(134, null)` — proving neither guard fired. The largest single event line observed (10,154 bytes, the final assistant/thinking event) was nowhere near the 4 MiB per-line cap. This is unrelated to this package's own historical Trial-1-era line-limit bug (already fixed by raising that cap to 4 MiB; not what happened here).

**Conclusion: no confirmed defect in this project's own execution/capture code.** The crash originated inside the solver CLI process itself — the container's PID 1, per Docker's exit-code accounting, not the campaign controller, which stayed alive throughout and correctly recorded the failure. The container's profile caps memory at 2048 MiB; this task runs a full Chromium instance alongside a long, thinking-heavy Claude session that had accumulated 163,301 cached input tokens by the crash. This is a plausible memory-pressure story but is not proven by a smoking-gun stderr or crash-log artifact — it should be read as plausible, not confirmed.

Infrastructure interruptions are unscored and were not automatically retried within this five-attempt campaign. A separately-authorized single fresh Browser/Claude retry, on this same unchanged task package, is being prepared separately and is not part of this trial's scored results.


## Trial 6 preparation — fourth 3.0.0 attempt, provider switch

Prepared September 11, 2026 UTC. The next attempt uses **Codex**, switching from the previous provider, with 4 GiB of authoring memory. It is one of five concurrent attempts in the [new handoff](../../../docs/hardened-next-five-trial-four-handoff.md). Public version 3.0.0, the coverage-v2 grader, package digest and solver instruction remain unchanged. No model call occurred during preparation and this section records no new trial result.

The [infrastructure report](../browser-runtime-reliability-2026-09-11.md) documents the independent runtime build, bounded resource diagnostics, core-dump prevention, local regression checks and recovered disk headroom. The [preparation manifest](../evidence/2026-09-11-hardened-next-five-trial-four-preparation.json) binds the exact next profile and all unchanged package bytes. All Trial 5 completion manifests were reverified. Prior trial outcomes remain intact.

Trial 5 remains an unscored infrastructure interruption. Its 817,951 stdout bytes and 103,522-byte maximum event line did not hit the capture guards; the earlier large-payload theory is unsupported. The 4 GiB profile is a resource mitigation, not a confirmed diagnosis. A real offline Chromium workload peaked at 2,474.8 MiB and completed; a deliberate abort remained an execution error. This Codex attempt does not fill the missing scored Claude slot. The old standalone Claude retry stays deferred and unlaunched.

## Trial 6 — fourth 3.0.0 attempt / coverage-v2 / provider switch — September 11, 2026

Fourth model attempt on the unchanged public 3.0.0 contract, with all five providers switched from Trial 5 (this package moves from Claude to Codex). Task and coverage-v2 grader packages are byte-identical to Trials 4/5; the frozen runtime was rebuilt only to add browser-authoring memory mitigation (2 GiB → 4 GiB, specifically for this package) and resource diagnostics (source digest `597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`), which does not affect grading — see [the infrastructure report](../browser-runtime-reliability-2026-09-11.md) for the mitigation's own validation record. The solver is blind to all previous submissions, grades, reference solutions and analysis docs. Campaign `.local/hardened-next-five-trial-four-2026-09-11/`. Job id `browser-replay-repair-attempt-1`, package digest `712f97575821006724eef7f3b3161c97512019897af62e46ab32b9c32dcddf31` (unchanged from Trials 4/5), profile digest `552855d36d4339bb73a354a610053478e653297b2db17d5bcd85739318a0bfc3` (requested `openai/gpt-5.6-sol`, effort `xhigh`, via Codex — switched from Claude; this profile digest differs from other Codex packages this trial because this package's authoring memory limit is 4 GiB, not 2 GiB). Dispatched 2026-09-11T06:41:21.762Z, completed 2026-09-11T06:50:08.015Z (8m46s wall; 385,718ms / 6m26s authoring per `capture.json`). Usage: 319,483 input tokens (270,336 cached), 18,798 output tokens (Codex CLI usage; no price reported). Published to `.local/hardened-next-five-trial-four-2026-09-11/real-campaign-frozen/jobs/real-provider/records/browser-replay-repair-attempt-1/`, independently re-verified via `verifyEvidence` this session: 1,389 files, all hashes match, no infrastructure error.

Result: reward **1**. Service **semantic-pass, 19/19** scenarios. Checker **passed**: `grading/checker-grade/grade-summary.json` reports `total:14, correct:14, falsePositives:0, missed:0, deterministic:true` — every candidate, including `reference`, correctly classified.

This is a clean pass with **no infrastructure interruption** — a meaningful contrast with Trial 5's `browser-replay-repair` attempt, which crashed (container exit 134/SIGABRT) after ~31m39s of authoring under the old 2 GiB memory limit, before grading ever began. This attempt completed the full pipeline (capture through grading) in about 8m46s total under the new 4 GiB limit, with no `captureStatus` anomaly. This is one successful completion under the new memory limit, consistent with — but not proof of — the memory-pressure hypothesis from Trial 5's unconfirmed root-cause investigation; the original crash cause was never conclusively established (see the Trial 5 section above and the infrastructure report), so the mitigation should not be described as confirmed to have fixed anything.

**This Codex clean pass does not fill browser-replay-repair's still-missing Claude slot.** Trial 5's interrupted Claude attempt remains infrastructure-interrupted and unscored, and the separately-authorized Claude retry (`hardened-next-five-trial-three-browser-retry-2026-09-11`) stays deferred and unlaunched. This trial's clean Codex pass and that still-open Claude gap are two distinct facts; do not conflate them.

No additional model calls were made. This trial's evidence and interpretation are independent of the Trial 1/2/3/4/5/audit/infrastructure sections above, which used earlier task versions, grading revisions, providers, or concerned a different attempt; do not alter or reinterpret those earlier sections.


## Independent pass audit — Round 4 / historical Trial 6

September 11, 2026. The recorded reward 1 does not establish a clean required-checker pass: an actual frozen-reference execution with valid step `-1` completes through an existing operation-bound dialog, but the submitted checker incorrectly requires a form submission too. The original 14-candidate bank plus three positive scenarios scores **16/17** for the saved checker and **17/17** for the reference checker. Both services pass the three new scenarios. The supplementary diagnostic reward is 0; original reward and qualification accounting remain unchanged pending integration/disposition.

[Full audit and rule analysis](../hardened-round-four-pass-audit-2026-09-11.md) · [Evidence and reproduction](../evidence/2026-09-11-hardened-round-four-pass-audit.json). No model calls were made; frozen task/grader exports, saved submissions and original trial records were preserved.


## Round 5 preparation — historical Trial 7 (September 11, 2026)

The user explicitly excluded Round 4 / historical Trial 6 from counting after the independent audit reproduced a required-checker false positive. The immutable original reward is 1; diagnostic regrade is 0; counted reward is **null**. A fresh Codex attempt will fill that voided slot. The integrated bank now detects the saved checker’s defect: **12/14**, rejecting reference and alternative on a permitted existing-dialog confirmation, while the saved service passes **22/22**. Reference and alternative pass all 22 scenarios; the reference checker passes 14/14. Harbor oracle/nop, nine integrity controls, 22 static checks and export reproduction pass. The public task remains 3.0.0 with unchanged requirements. The earlier Claude crash, Round 3 / historical Trial 5, remains separately unscored; its missing Claude slot is still pending.

The next attempt is prepared on **Codex**, the same provider as Round 4, using **coverage-v3**. All five tasks launch concurrently into fresh blind workspaces. Round 5 is the fifth campaign on public 3.0.0 and historical Trial 7 in this document. Preparation itself makes no model call and contributes no outcome.

[Coverage and counting report](../browser-coverage-v3-2026-09-11.md) · [Counting disposition](../evidence/2026-09-11-browser-round-four-disposition.json) · [Round 5 handoff](../../../docs/hardened-next-five-trial-five-handoff.md).


## Conditional continuation after Round 5 — prepared September 11, 2026

The user authorized continuing after new reward-zero results, stopping this task on its next pass or at six counted trials with three Codex and three Claude. The already-running Round 5 is unchanged and must finish before the continuation starts. The [explicit counting ledger](../evidence/2026-09-11-hardened-six-counting-ledger.json) records the previously documented first-round regrades and retains excluded attempts separately; preparation adds no trial result. See the [remaining-slot plan](../hardened-six-continuation-preparation-2026-09-11.md) and [operator handoff](../../../docs/hardened-six-continuation-handoff.md).

## Round 5 through continuation — historical Trials 7-10 — 3.0.0 / coverage-v3 — September 11, 2026

This package now grades under **private coverage-v3** starting this round (adds a permitted existing-dialog recovery case that coverage-v2 omitted; public requirements unchanged). Round 4 / historical Trial 6's Codex attempt is **excluded from counting**: original reward 1, diagnostic regrade 0 (an independent audit found the saved checker rejected a valid existing-dialog completion under the augmented bank), counted reward **null** — that record is unchanged by this round. The four fresh attempts below (T7–T10) are what actually fill that previously void slot and pursue the six-counted-trial target with three Codex and three Claude. All four solvers were blind to all previous submissions, grades, reference solutions, analysis docs, and to each other's attempts. Package digest `3968e17e770da1476aec1ec0a5f742f6d31e248fc295ad55d33ad8bce0f9b644` (coverage-v3, distinct from the coverage-v2 digest used in earlier trials on this package) for all four. Runtime for T7–T9: byte-identical copy of the completed Round 4 frozen runtime (source digest `597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`), not rebuilt; T10 runs on the same runtime. Browser authoring memory 4 GiB throughout.

**T7 — historical Trial 7 (Round 5), Codex.** Job id `browser-replay-repair-attempt-1`, campaign `.local/hardened-next-five-trial-five-2026-09-11/`. Profile digest `552855d36d4339bb73a354a610053478e653297b2db17d5bcd85739318a0bfc3` (requested `openai/gpt-5.6-sol`, effort `xhigh`, via Codex). Dispatched 2026-09-11T08:20:44.946Z, completed 2026-09-11T08:35:14.481Z (14m30s wall; 708,140ms / 11m48s authoring). Usage: 427,780 input tokens (378,624 cached), 21,453 output tokens (Codex CLI usage; no price reported). Reward **0**. Service semantic-pass, 22/22. Checker: `grading/checker-grade/grade-summary.json` — 11/14 correct, 3 false positives (`variant-repeat-committed-operation`, `reference`, `alternative`), deterministic. This checker correctly avoids the `__proto__`-opaque-token shape-gate bug seen elsewhere in this campaign: `grading/submission/checker.mjs` builds its verdicts with `Object.defineProperty(verdicts, token, {...})` (line 269), not plain bracket assignment. The false positives are a genuine content-level defect instead — traced directly against the raw `checker-process.log`: all three rejected candidates fail with the identical reasons `"cell 19: confirmation action 0 precedes its submission"` and `"cell 19: operation [\"signed-step\",-1] has no accepted submission"`, meaning `validateActions`/`validateEffectList`'s ordering check for confirmation actions misjudges a legitimate action sequence in cell 19 (plausibly the new coverage-v3 existing-dialog recovery case), incorrectly rejecting the reference implementation itself along with two other genuinely valid candidates.

**T8 — historical Trial 8 (Round 6 continuation), Codex.** Job id `browser-replay-repair-attempt-1`, campaign `.local/hardened-six-continuation-2026-09-11/slots/browser-replay-repair/trial-8/`. Same profile digest as T7. Launched immediately on T7's failure; 383,483ms / 6m23s authoring. Usage: 322,555 input tokens (285,696 cached), 19,114 output tokens. Reward **0**. Service semantic-pass, 22/22. Checker: 12/14 correct, 2 false positives (`reference`, `alternative`), deterministic. Confirmed by hash comparison that this attempt's `checker.mjs`/`entry.mjs` are byte-different from T7's — a genuinely fresh, independent submission, not a resubmission, despite converging on a related failure pattern (rejecting the same two known-good candidates, one fewer false positive than T7).

**T9 — historical Trial 9 (Round 7 continuation), Codex.** Job id `browser-replay-repair-attempt-1`, campaign `.local/hardened-six-continuation-2026-09-11/slots/browser-replay-repair/trial-9/`. Same profile digest. Launched immediately on T8's failure; 488,638ms / 8m09s authoring. Usage: 501,976 input tokens (448,256 cached), 23,156 output tokens. Reward **0**. Service semantic-pass, 22/22. Checker: 12/14 correct, 2 false positives (`reference`, `alternative` again). Confirmed by hash comparison that this attempt's `checker.mjs`/`entry.mjs` are byte-different from T8's — a third genuinely independent submission, again converging on rejecting the same two known-good candidates.

**T10 — historical Trial 10 (Round 8 continuation), Claude — this package's final authorized slot.** Job id `browser-replay-repair-attempt-1`, campaign `.local/hardened-six-continuation-2026-09-11/slots/browser-replay-repair/trial-10/`. Profile digest `d71ffd4cecad05cd941f30bb8b3ba2dc377537b2a188b650f27ca233b0a01cfd` (requested `anthropic/claude-opus-5`, effort `max`, via Claude Code — the missing counted Claude slot this attempt fills). Launched immediately on T9's failure; 3,209,089ms / 53m29s authoring. Usage: 14,743,482 input tokens (14,531,644 cached), 152,495 output tokens, $13.196718 (subscription billing). Reward **0**. Service semantic-pass, 22/22. Checker: shape-gate failure — the same `__proto__`-into-plain-object bug seen throughout this campaign. `grading/checker-grade/cases/cases.json` lists 14 opaque tokens for this package including the literal `"__proto__"`; the raw `checker-process.log` output has 13 of 14 keys, missing only `"__proto__"`; the submitted `checker.mjs` builds `const verdicts = {}` (line 333) and assigns via bracket notation (line 344), which cannot represent that key as an own property. A different failure class than T7–T9's content-level false positives: the one Claude attempt this round hit the shape-gate bug while all three Codex attempts reached genuine, if flawed, per-candidate scoring — consistent with the pattern seen elsewhere in this campaign of Claude checkers disproportionately hitting this specific bug.

All four completion manifests independently re-verified via `verifyEvidence`: T7 1,476 files, T8 1,476 files, T9 1,476 files, T10 1,519 files, all hashes match, no infrastructure error on any of the four.

**Final disposition.** With T10 (this package's last authorized slot regardless of outcome) now resolved, its counted record stands at **6 scored, 6 failures, providers 3 Codex + 3 Claude** — a complete, balanced six-trial record that specifically resolves the long-standing missing-Claude-slot left by the earlier Round 3 / historical Trial 5 Claude infrastructure interruption. That interrupted attempt remains separately unscored; its own standalone retry campaign remains deferred and was not launched. No further Browser attempts are authorized. Round 4 / Trial 6's original reward 1, diagnostic regrade 0, and counted null remain unchanged historical record — T7–T10 are four genuinely new, separately counted attempts, not a replacement of that earlier disposition.

No infrastructure interruption on any of these four attempts. No additional model calls were made beyond these four authorized attempts. This section's evidence and interpretation are independent of the Trial 1–6 / audit / coverage-v3-preparation sections above, which used earlier task versions, grading revisions, or preceded these specific attempts.
