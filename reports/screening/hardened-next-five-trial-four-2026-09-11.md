# Hardened 3.0.0 successors: fourth trial, provider switch, Trial 6

**Subsequent counting decision, September 11:** [Browser coverage-v3 and Round 5 preparation](browser-coverage-v3-2026-09-11.md) records the user-authorized exclusion of Browser’s historical Trial 6 from counting. Original reward 1 and diagnostic regrade 0 remain preserved; counted reward is null. Route’s reward 1 remains counted. The original results below remain historical evidence.

**Subsequent independent pass audit:** [Browser’s checker rejects a valid recovery execution that the original bank omitted; Route’s pass is retained after additional checks](hardened-round-four-pass-audit-2026-09-11.md). The table below preserves original grades. “Clean” in the original write-up must not be read as resolving the newly demonstrated Browser coverage gap.

September 11, 2026. **Five attempts, all scored, no infrastructure errors. Two
clean passes, three required-checker failures — and a striking provider split:
both Codex attempts passed cleanly, all three Claude attempts independently
hit the same `"__proto__"` opaque-token shape-gate bug.** Task and coverage-v2
grader packages are byte-identical to Trials 4 and 5; only the browser-replay
authoring memory limit changed (2 GiB → 4 GiB), plus new resource diagnostics
unrelated to grading.

## Results

| Package | Provider (was) | Reward | Service | Checker | Authoring | Finding |
| --- | --- | --- | --- | --- | --- | --- |
| [14 — Route policy](third-five/14-route-policy-repair.md) | Codex (Claude) | **1** | 33/33 | **13/13, clean** | 20m 29s | First clean checker pass after two prior `__proto__` failures |
| [03 — Browser replay](original-five/03-browser-replay-repair.md) | Codex (Claude) | **1** | 19/19 | **14/14, clean** | 6m 26s | Clean, no infrastructure issue (4 GiB memory) — does not fill missing Claude slot |
| [18 — Recurring calendar](fourth-five/18-recurring-calendar-repair.md) | Claude (Codex) | 0 | 37/37 | shape-gate failure | 29m 30s | `__proto__` token dropped by plain-object assignment |
| [20 — Workflow authority](fourth-five/20-workflow-authority-repair.md) | Claude (Codex) | 0 | 36/36 | shape-gate failure | 21m 05s | Same bug — this package's *first* time hitting it (3 distinct defects across 3 trials) |
| [04 — Delegated budget](original-five/04-delegated-budget-repair.md) | Claude (Codex) | 0 | 21/21 | shape-gate failure | 26m 03s | Same bug — recurs from this package's Trial 4 attempt |

Every service submission is `semantic-pass` on the full scenario bank (33/33,
19/19, 37/37, 36/36, 21/21) — all five repairs are correct. The split is
entirely on the required checker.

## The provider split

This is the first trial in this campaign where the checker outcome divides
cleanly along provider lines: **both Codex attempts (route policy, browser
replay) reached full, valid per-candidate scoring with zero false positives
and zero missed classifications** (`grade-summary.json`: 13/13 and 14/14,
both deterministic). **All three Claude attempts (recurring calendar,
workflow authority, delegated budget) independently hit the identical
shape-gate bug**: each checker builds `const verdicts = {}` and assigns via
bracket notation (`verdicts[token] = ...`), which cannot represent the opaque
token `"__proto__"` as an enumerable own property — the assignment collides
with `Object.prototype`'s inherited `__proto__` accessor instead of creating
an own property. Confirmed directly against each package's actual
`checker-process.log`: all three are missing exactly one key, `"__proto__"`,
out of their expected token counts (16, 16, 17 respectively). This trips the
harness's `completeVerdicts()` exact-key-count shape gate, and `gradeChecker()`
falls through to its synthetic all-failed result rather than a real score.

This is a real, single-trial observation, not a proven general tendency —
three data points per provider is not enough to establish that Claude
checkers are systematically more prone to this pitfall than Codex checkers.
It is, however, a striking coincidence worth tracking across future trials:
if it recurs, it would suggest a genuine difference in how the two providers
typically construct string-keyed dictionaries from untrusted input.

Route policy's result is also notable on its own: this package independently
hit the `"__proto__"` bug in both its Trial 4 and Trial 5 attempts (both
Claude); its first Codex attempt this trial produced a clean pass, using a
safe `Object.defineProperty` construction rather than plain-object bracket
assignment. Workflow authority now has three genuinely distinct checker
defects across its three attempts (Trial 4: content-level false positives;
Trial 5: wrong output shape entirely; Trial 6: this shape-gate bug) —
confirming each fresh submission is independently authored, not a repeated
artifact of one underlying checker.

## Browser replay's still-missing Claude slot

This trial's `browser-replay-repair` attempt ran on Codex under the new 4 GiB
authoring memory limit and completed cleanly in 6m26s of authoring with no
infrastructure issue — a meaningful contrast with Trial 5's Claude attempt on
the same package, which crashed (container exit 134/SIGABRT) after ~31m39s,
before grading began, for a cause that was never conclusively confirmed. This
trial's clean Codex pass is **consistent with, but not proof of**, the
memory-pressure hypothesis behind that mitigation.

**This does not fill the missing Claude slot.** Trial 5's interrupted Claude
attempt remains infrastructure-interrupted and unscored. A separately
authorized single Claude retry
(`.local/hardened-next-five-trial-three-browser-retry-2026-09-11/`) remains
fully prepared and independently verified — byte-identical task package,
matching digests — but is deliberately deferred and was not launched as part
of this campaign, per explicit instruction.

## Execution

The frozen controller (source digest
`597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`, rebuilt
from the completed Trial 5 runtime specifically to add browser-authoring
memory mitigation and resource diagnostics — `src/execution/real-provider.ts`
modified, `src/execution/authoring-diagnostics.ts` added; task/checker/grading
logic unchanged) recorded five dispatches between
**2026-09-11T06:41:21.692Z and 06:41:21.957Z**, a **265ms** spread — all five
solver containers ran concurrently, as requested. Two Codex Sol/xhigh and
three Claude Opus 5/max profiles (all five providers switched from Trial 5),
subscription-only, no paid API fallback or automatic retry. The controller
exited cleanly (`campaign-finished`, exit code 0) once all five reached
`completed` — no infrastructure interruptions this trial.

## Publication infrastructure

The 512 MiB `EVIDENCE_PUBLICATION_BUDGET_BYTES` budget and gzip
`process.log` compression held cleanly for all five attempts. Each
completion manifest was independently re-verified via `verifyEvidence()`
during this analysis — 910, 1,389, 1,026, 929 and 1,353 files respectively,
all hashes matching, no tampering.

## Recommendations

- **Route policy and browser replay** now have clean checker passes under
  Codex; both packages' checkers should be spot-checked in a future trial to
  confirm the pass is durable, not a one-off.
- **Recurring calendar, workflow authority and delegated budget** all failed
  on the same shape-gate defect this round under Claude. Given each package
  has now shown this defect at least once (workflow authority for the first
  time), and given three of five packages hit it simultaneously this trial,
  this specific interface-coverage gap (opaque tokens colliding with
  `Object.prototype` property names) looks like a genuinely common blind spot
  worth calling out explicitly in task-authoring guidance, rather than
  something to keep independently rediscovering per attempt.
- **Browser replay's missing Claude slot remains the one open gap** in this
  four-trial series. The prepared, verified single-package retry is ready to
  resolve it whenever authorized.
- Given the provider-correlated split observed this trial, a fifth attempt
  swapping only the three Claude packages back to Codex (or vice versa) would
  help distinguish "provider tendency" from "coincidence" — but that is a
  recommendation, not an action taken here.

## Evidence and publication

[Sanitized evidence](evidence/2026-09-11-hardened-next-five-trial-four.json)
records all five attempts, including exact package/profile/executor
identities, the opaque token sets used, per-package checker-finding detail,
durations and usage. All five original analysis documents linked above
contain a dated Trial 6 section; their Trial 1–5/audit/coverage-v2/
browser-runtime-reliability history remains intact.

Raw records remain under
`.local/hardened-next-five-trial-four-2026-09-11/real-campaign-frozen/`.
Runtime records, submissions and package exports were not changed. The
deferred Browser/Claude retry campaign was not launched.

This documentation work made zero model calls beyond the five authorized
attempts. Requested settings are separate from observable CLI metadata; CLI
price estimates are not subscription charges. The five existing finalists
(incremental-build-repair, issued-report-repair, variant-cache-repair,
snapshot-recovery-repair, temporal-capacity-repair) and their standings are
unaffected by this trial.
