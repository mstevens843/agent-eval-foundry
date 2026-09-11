# Hardened 3.0.0 successors: third trial, coverage-v2, Trial 5

September 11, 2026. **Five attempts launched, four scored, one infrastructure
interruption. Zero solver passes among the four scored attempts — every
submitted repair passed its service deliverable; every attempt failed only the
required checker, each for a different reason than its own package's Trial 4
attempt except one.** Checker defects did not uniformly recur from Trial 4:
each fresh, blind submission independently authored its own checker, and the
specific defect varied per package.

## Results

| Package | Target | Reward | Service | Checker | Authoring | Finding |
| --- | --- | --- | --- | --- | --- | --- |
| [14 — Route policy](third-five/14-route-policy-repair.md) | Claude | 0 | 33/33 | shape-gate failure | 55m 42s | `__proto__` token dropped by plain-object assignment (recurs from Trial 4) |
| [03 — Browser replay](original-five/03-browser-replay-repair.md) | Claude | **unscored** | — | — | 31m 39s | Infrastructure interruption: container exit 134 (SIGABRT) |
| [18 — Recurring calendar](fourth-five/18-recurring-calendar-repair.md) | Codex | 0 | 37/37 | 13/16, 3 false positives | 20m 12s | Rejects `reference`/`alternative`/1 variant — different from Trial 4 |
| [20 — Workflow authority](fourth-five/20-workflow-authority-repair.md) | Codex | 0 | 36/36 | wrong output shape | 16m 00s | Returns array of `{token, accept}`, never attempts required contract |
| [04 — Delegated budget](original-five/04-delegated-budget-repair.md) | Codex | 0 | 21/21 | 14/17, 3 false positives | 17m 08s | Rejects `reference`/`alternative`/1 variant — different from Trial 4 |

Every scored service submission is `semantic-pass` on the full scenario bank
(33/33, 37/37, 36/36, 21/21) — none of the four scored repairs is at fault.
Every scored attempt failed the required checker deliverable. Both service and
independent checker were required; reasons are diagnostic-only.

## Recurrence versus fresh defects

Only **route policy** independently reproduced its own Trial 4 defect class:
its checker again builds a plain `{}` keyed by opaque tokens via bracket
assignment, which cannot represent the literal token `"__proto__"` as an own
property (collision with `Object.prototype`'s inherited accessor), tripping
`completeVerdicts()`'s exact-key-count shape gate into `gradeChecker()`'s
synthetic all-failed fallback rather than a real score. Confirmed directly:
`checker-process.log` has 12 of 13 expected keys, missing only `"__proto__"`.

The other three scored packages each hit a **different** failure mode than
their own Trial 4 attempt:

- **Recurring calendar and delegated budget** both moved from Trial 4's
  shape-gate/structural failures to genuine, complete per-candidate scoring
  this time — but both checkers incorrectly reject `reference` and
  `alternative` (the known-good baselines) plus one additional legitimate
  variant as false positives. A real content-level accuracy defect, not a
  shape crash, and the same specific pattern (rejecting `reference` and
  `alternative`) recurring across two independently-authored Codex checkers
  this round.
- **Workflow authority** regressed to arguably a more fundamental problem:
  its `run({cases})` returns a flat array of `{token, accept}` objects and
  never attempts the required `{verdicts: {token: {ok, reasons}}}` shape at
  all — every verdict reads `accept:false` (100% rejection). This checker
  does not implement the required output contract, a different and more
  basic failure than Trial 4's genuine-but-partial content-level defect on
  that package.

This confirms the `__proto__`-in-plain-object pitfall is a real, recurring
risk in how models typically build opaque-token-keyed dictionaries, but not a
deterministic per-package outcome — three of four fresh, independently
generated checkers avoided it entirely this round, each landing on its own
distinct defect instead.

## Infrastructure interruption: browser replay

The container exited with code 134 (SIGABRT) after 1,898,868ms (~31m39s) of
authoring, before grading began. `result.json` already correctly records
`countsAsModelFailure: false` and `usage: null`; this attempt is excluded from
scored results, not counted as a checker or service failure, and was not
automatically retried.

Root-cause investigation, done directly against the actual evidence:

- Docker's own container inspect (`authoring-runtime.json`) shows
  `"ExitCode":134, "OOMKilled":false, "Error":""` — the daemon recorded no
  error of its own and explicitly did not flag a cgroup-level OOM kill.
- `capture/stderr.log` is exactly 0 bytes. A classic V8 "FATAL ERROR:
  JavaScript heap out of memory" abort normally prints a diagnostic to stderr
  before calling `abort()`; the total absence of stderr means either the
  process died too abruptly for that write to flush, or the abort did not
  originate from that specific code path. This is left open, not settled.
- `capture/stdout.log` (970 lines, 817,951 bytes) ends cleanly with a
  complete, well-formed, newline-terminated JSON event (a normal streamed
  "assistant" message with a `thinking` content block) — not a mid-write
  truncation. Nothing more was written after that event.
- `src/execution/capture.ts` was read in full. Its exact control flow proves
  this project's own capture logic did **not** cause the crash: its 4 MiB
  event-line-limit and its overall byte-quota guard each actively kill the
  child and relabel `result.status` *before* any natural process exit, if
  triggered — but the recorded status is `"process-error"`, which is only
  set (lines 174–177) after the child's own `close` event fires naturally.
  The largest single event line observed (10,153 bytes) was nowhere near the
  4 MiB cap. This is unrelated to this package's own historical Trial 1
  line-limit bug (already fixed).

**Conclusion: no confirmed defect in this project's own execution/capture
code.** The crash originated inside the solver CLI process itself (the
container's PID 1, per Docker's exit-code accounting) — the campaign
controller stayed alive throughout and correctly recorded the interruption.
The container's profile caps memory at 2048 MiB; this task runs a full
Chromium instance alongside a long, thinking-heavy session that had
accumulated 163,301 cached input tokens by the crash — a plausible
memory-pressure story, but not proven by a smoking-gun artifact. A separately
authorized single fresh Browser/Claude retry, using the byte-identical task
package and runtime, is being prepared; it has not been launched.

## Execution

The frozen controller (source digest
`b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`, copied
byte-identical from the completed Trial 4 campaign, no rebuild) recorded five
dispatches between **2026-09-11T05:07:22.328Z and 05:07:22.578Z**, a **250ms**
spread — all five solver containers ran concurrently, as requested. Three
Codex Sol/xhigh and two Claude Opus 5/max profiles, subscription-only, no paid
API fallback or automatic retry. The controller exited cleanly
(`campaign-finished`, exit code 0) once all five reached a terminal state.

## Publication infrastructure

The 512 MiB `EVIDENCE_PUBLICATION_BUDGET_BYTES` budget and gzip
`process.log` compression held cleanly for all five attempts, including the
interrupted one — no publication errors occurred. Each completion manifest
was independently re-verified via `verifyEvidence()` during this analysis —
960, 102 (partial, infrastructure-interrupted), 978, 896 and 1,309 files
respectively, all hashes matching, no tampering.

## Recommendations for the opposite-provider block

All four scored packages this trial continue to fail on the required checker
alone, with correct service repairs across the board — three model attempts
in (Trials 3, 4, 5), no package has yet produced a clean checker pass on the
coverage-v2 contract from either provider. This supports proceeding to the
planned opposite-provider block (Claude on the Codex-assigned packages,
Codex on the Claude-assigned packages) to see whether the `__proto__`
opaque-token pitfall and the various content-level/shape defects are
provider-specific tendencies or a shared blind spot. Browser replay's
interrupted attempt should be resolved with its own authorized single retry
before being folded into that block, so its third-attempt result is genuinely
comparable to the other four packages'.

## Evidence and publication

[Sanitized evidence](evidence/2026-09-11-hardened-next-five-trial-three.json)
records all five attempts, including exact package/profile/executor
identities, the opaque token sets used, per-package checker-finding detail,
the infrastructure-interruption forensics for browser replay, durations and
usage. All five original analysis documents linked above contain a dated
Trial 5 section; their Trial 1/2/3/4/audit/coverage-v2 history remains intact.

Raw records remain under
`.local/hardened-next-five-trial-three-2026-09-11/real-campaign-frozen/`.
Runtime records, submissions and package exports were not changed.

This documentation work made zero model calls beyond the five authorized
attempts. Requested settings are separate from observable CLI metadata; CLI
price estimates are not subscription charges. The five existing finalists
(incremental-build-repair, issued-report-repair, variant-cache-repair,
snapshot-recovery-repair, temporal-capacity-repair) and their standings are
unaffected by this trial.


## Subsequent infrastructure review and next campaign

The [Browser runtime follow-up](browser-runtime-reliability-2026-09-11.md) records a tested 4 GiB mitigation, bounded resource diagnostics and a precise correction to the crash attribution: no capture quota guard fired, but the cause of the abort remains unconfirmed. No Trial 5 grade or raw evidence changed. The [next campaign](../../docs/hardened-next-five-trial-four-handoff.md) is historical Trial 6 and switches all five providers. Browser’s interrupted Claude slot remains unscored and pending separately.
