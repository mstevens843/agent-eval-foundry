# Hardened 3.0.0 successors: second trial, coverage-v2, Trial 4

September 11, 2026. **Five scored attempts, zero solver passes, five reward-zero
outcomes — every submitted repair passed its service deliverable; every attempt
failed only the required checker.** All five attempts launched together. No
infrastructure errors occurred (the Trial 3 `EVIDENCE_BYTE_LIMIT` fix held
cleanly). Four checkers share the opaque-token output defect. Budget also has an
input-shape defect; Workflow has a separate content-level defect.

## Results

| Package | Target | Reward | Service | Checker | Authoring | Finding |
| --- | --- | --- | --- | --- | --- | --- |
| [14 — Route policy](third-five/14-route-policy-repair.md) | Claude | 0 | 33/33 | shape-gate failure | 47m 12s | `__proto__` token dropped by plain-object assignment |
| [03 — Browser replay](original-five/03-browser-replay-repair.md) | Claude | 0 | 19/19 | shape-gate failure | 32m 08s | `__proto__` token dropped by plain-object assignment |
| [18 — Recurring calendar](fourth-five/18-recurring-calendar-repair.md) | Codex | 0 | 37/37 | shape-gate failure | 12m 18s | `__proto__` token dropped by plain-object assignment |
| [20 — Workflow authority](fourth-five/20-workflow-authority-repair.md) | Codex | 0 | 36/36 | 12/16, 4 false positives | 15m 57s | Rejects `reference`/`alternative`/two retry variants |
| [04 — Delegated budget](original-five/04-delegated-budget-repair.md) | Codex | 0 | 21/21 | shape-gate failure + cell-shape bug | 16m 11s | Same `__proto__` bug, plus checker never reads real cell data |

Every service submission is `semantic-pass` on the full scenario bank (33/33,
19/19, 37/37, 36/36, 21/21) — none of the five repairs themselves is at fault.
Every attempt failed the required checker deliverable. Both service and
independent checker were required; reasons are diagnostic-only.

## The systemic finding: opaque tokens and the `__proto__` accessor collision

coverage-v2 expanded the existing opaque-token coverage to exercise string keys
such as `"__proto__"` across all five packages. Private candidate names such as
`reference` and `alternative` remain grading labels, not solver-visible answers. This directly generalizes the
gap the September 11 independent audit found in route policy's Trial 3
attempt (a permitted opaque token making the saved submitted checker's
plain-object assignment silently omit a verdict) into a standing, uniform test
applied to every submitted checker in this trial.

Three submitted checkers — route policy, browser replay, recurring calendar —
build their verdicts object as a plain `const verdicts = {}` and populate it
with bracket assignment (`verdicts[token] = …`). Because
`Object.prototype.__proto__` is an inherited accessor property, assigning to
the literal key `"__proto__"` on a plain object does not create an enumerable
own property — it either reassigns the object's internal prototype or is a
no-op — so the resulting JSON is missing exactly that one key. Independently
confirmed against each package's actual `checker-process.log`: 12/13, 13/14
and 15/16 of the expected keys respectively, missing only `"__proto__"` each
time.

The frozen grading harness's `completeVerdicts()` (`src/packages/checker-contract.ts`)
requires an **exact key-count match** against every expected token before
`gradeChecker()` (`src/packages/portfolio.ts`) will compute a real per-candidate
score. One missing key fails that check, and `gradeChecker()` falls through to
its synthetic all-failed fallback: `deterministic:false, correct:0,
missed:total, falsePositives:0, pass:false` — never writing a
`grade-summary.json`. This means the "0 correct" recorded for these three
packages is a **harness-level shape-gate artifact**, not evidence that the
checker misjudged every other candidate; its true judgment on the remaining
12–15 tokens was never actually scored. It is nonetheless a real, reproducible
interface-coverage defect — a plain object literal is not a safe dictionary
for untrusted string keys — and a legitimate reward-zero outcome under the
task contract, since a checker that cannot even structurally represent a
verdict for a valid opaque token fails the checker deliverable.

Delegated budget's checker has the identical `__proto__` bug **plus** an
independent, more severe defect: its `run({cases})` passes each outer case
object (shaped `{token, cells: [...]}`) directly to `validateCell()`, which
reads `.input` straight off that argument — but `.input` only exists one level
down, on each entry of `cells`. `cell.input` is therefore always `undefined`,
so `validateCell`'s first shape check fails unconditionally, returning
`["malformed checker cell input"]` for every single candidate regardless of
whether the underlying scenario data is valid. This checker never inspects
real scenario data at all. Its reported "0 correct" is still the shape-gate
fallback, not a per-candidate semantic score: rejecting all candidates can
coincidentally classify negative candidates correctly while rejecting valid ones.

Workflow authority's checker is the one attempt that avoided this class of bug
entirely: it builds its verdicts with `Object.defineProperty(verdicts, token,
{...})`, which correctly creates an own property for any key name including
`"__proto__"`. Its output passed `completeVerdicts()` and reached full
per-candidate scoring: 12/16 correct, 4 false positives, deterministic. This is
a genuine, content-level checker defect — it incorrectly rejects `reference`
and `alternative` (the two known-good baselines) plus two dispatch-retry
variants — and differs from the previous saved checker described in the handoff.
That description was an earlier replay result, not a prediction about this
fresh submission: this time `reference` itself is rejected too.

## Execution

The frozen controller (source digest
`b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`, its own
`frozen-source/`, copied and built fresh for this campaign) recorded five
dispatches between **2026-09-11T03:55:41.162Z and 03:55:41.439Z**, a **277ms**
spread — all five solver containers ran concurrently, as requested. Three
Codex Sol/xhigh and two Claude Opus 5/max profiles, subscription-only, no paid
API fallback or automatic retry. The controller exited cleanly (`campaign-finished`,
exit code 0) once all five reached `completed` — no job was left in
`publishing`, unlike Trial 3.

## Publication infrastructure

The 512 MiB `EVIDENCE_PUBLICATION_BUDGET_BYTES` budget and gzip
`process.log` compression added after Trial 3's `EVIDENCE_BYTE_LIMIT`
incident held cleanly for all five attempts: no publication errors occurred,
and every `grading/process.log.gz` confirms the compression path is active.
Each completion manifest was independently re-verified via `verifyEvidence()`
during this analysis — 984, 1,387, 977, 897 and 1,312 files respectively, all
hashes matching, no tampering.

## What the trial taught us

- **Route policy, browser replay, recurring calendar (shape-gate failures):**
  the repairs are correct; the checkers cannot structurally represent a
  verdict for the specific opaque token `"__proto__"` because they use a
  plain object as a token-keyed dictionary. This is the same class of gap the
  independent audit found in route policy's Trial 3 attempt, now reproduced
  independently by three different model-generated checkers under coverage-v2's
  uniform opaque-token scheme — a systemic finding about typical
  checker-construction habits, not three unrelated coincidences.
- **Workflow authority (content-level failure):** the repair is correct and
  the checker's shape is valid, but it genuinely misjudges the reference and
  alternative implementations as well as two legitimate retry variants — a
  real accuracy defect, worse than anticipated.
- **Delegated budget (stacked defects):** the same `__proto__` shape-gate bug,
  compounded by a checker that never correctly reads any scenario's input
  data at all, regardless of the opaque-token issue.

## Evidence and publication

[Sanitized evidence](evidence/2026-09-11-hardened-next-five-trial-two.json)
records all five attempts, including exact package/profile/executor
identities, the opaque token sets used, per-package checker-finding detail,
durations and usage. All five original analysis documents linked above
contain a dated Trial 4 section; their Trial 1/Trial 2/Trial 3/hardening/audit
history remains intact.

Raw records remain under
`.local/hardened-next-five-trial-two-2026-09-11/real-campaign-frozen/`.
Runtime records, submissions and package exports were not changed.

This documentation work made zero model calls beyond the five authorized
attempts. Requested settings are separate from observable CLI metadata; CLI
price estimates are not subscription charges. The five existing finalists
(incremental-build-repair, issued-report-repair, variant-cache-repair,
snapshot-recovery-repair, temporal-capacity-repair) and their standings are
unaffected by this trial.


## Next campaign prepared

[Historical Trial 5](../../docs/hardened-next-five-trial-three-handoff.md) is prepared as the third model attempt on each public 3.0.0 task, with the same providers and byte-identical packages/runtime as Trial 4. All five will run concurrently. No next-round attempts have been launched by preparation. Four Trial 4 checkers lacked `grade-summary.json`, including Budget; the three shape-only failures and one compound failure are separate reporting categories, not three total shape-gate failures. Original recorded rewards and evidence are unchanged.
