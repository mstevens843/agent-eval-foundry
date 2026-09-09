# Trial 4: third same-provider attempt on the unchanged successors

**Three packages now have three consecutive recorded reward-zero results on unchanged
successors: incremental build (21), issued report (25) and variant cache (19).** All
five Trial 4 attempts completed without infrastructure errors. Snapshot recovery (11)
passed a second consecutive time and can no longer reach the user-reported five-of-six
threshold regardless of its remaining attempts. Temporal capacity (10) reverted to
failing after passing in Trial 3.

September 9, 2026. One fresh, independently-written attempt for each of the five packages
that recorded reward 0 in Trial 2, keeping each package's original provider a third
consecutive time: variant-cache-repair (19, Claude), incremental-build-repair (21, Codex),
issued-report-repair (25, Claude), snapshot-recovery-repair (11, Codex) and
temporal-capacity-repair (10, Claude). Package bytes, public contract, private controls
and requested profile are byte-identical to each package's Trial 2 and Trial 3 records —
the controller hard-asserted this before dispatch and accepted either a 0 or 1 prior
reward, since two packages passed in Trial 3. Solvers received only the original public
task inputs: no prior submissions, analysis, or this campaign's operator handoff. This
publication does not change any Trial 1, 2 or 3 result, which remain unchanged in their
respective documents.

## Execution record

All five jobs were reserved and dispatched within a 223ms window
(2026-09-09T19:56:46.857Z – 19:56:47.080Z), confirmed running concurrently via `docker ps`
immediately after dispatch. Each ran under a signed, subscription-only JobStore
reservation (`maxMicroUsd: 0`, `maxAttempts: 1`, no automatic retries, no paid API
fallback), the same 10,800-second (3h) wall-clock budget, 2 CPUs / 2 GiB per container,
and the same requested model/effort/CLI as each package's prior successor attempts
(Claude `anthropic/claude-opus-5` / `max` / CLI `2.1.263`; Codex `openai/gpt-5.6-sol` /
`xhigh` / CLI `0.153.2`). No attempt came close to the timeout; the longest
(variant-cache-repair) ran 31m38s. All five reached a clean `completed` state with no
invalid execution or infrastructure error. The dispatch controller reused, byte-for-byte,
the isolated runtime built and independently verified for the first round-two campaign;
its own read-only `verify` mode and this session's independent hash checks both confirmed
zero drift before dispatch. All 4,488 manifest-listed files (116,996,666 bytes) across
the five completed records were reverified with zero errors.

## Results

| Package | Provider | Trial 2 | Trial 3 | Trial 4 | Service | Checker | Recurrence vs. Trial 3 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Variant cache (19) | Claude | 0 | 0 | **0** | 3/25 pass; 22 fail (`cache_provenance`) | 14/15 (`wildcard-eviction` missed, 3rd time) | Checker exact (3/3); service reverted to Trial 2's exact root cause, not Trial 3's |
| Incremental build (21) | Codex | 0 | 0 | **0** | 27/27 (fully correct, 3×) | 14/15 (`premature-publication` missed, 3rd time) | Exact — identical ordering gap, 3 independent Codex sessions |
| Issued report (25) | Claude | 0 | 0 | **0** | 27/27 (fully correct, 3×) | 13/14 (`reverse-dependency-order` missed; reference/alternative now correctly accepted) | Third failure; different mechanism from the Trial 2/3 wrapper bugs |
| Snapshot recovery (11) | Codex | 0 | 1 | **1** | 33/33 | 12/12 | Second consecutive pass — **6-run set can no longer reach 5/6** |
| Temporal capacity (10) | Claude | 0 | 1 | **0** | 34/34 | 12/13 (`unread-empty-source` missed — same name as Trial 2, different cause) | Reverted; same named gap as Trial 2 but a different, more fundamental omission |

Three of five repeated their Trial 2 zero for a third consecutive time; one passed a
second consecutive time; one reverted from a Trial 3 pass back to a fail. A pass ends a
literal failure streak but does not erase an earlier failure from the five-of-six record,
and — as this round demonstrates directly — a third raw-reward-zero does not by itself
mean a third instance of the same underlying defect.

### What actually recurred, and how precisely

- **Incremental build (21) — exact recurrence, confirmed by code reading, three for
  three.** All three independently-written `checker.mjs` submissions verify
  content-addressed correctness recursively (bytes match recomputed
  `[tool, flags, source, deps]`) and per-round current-handle matching, but none of them
  ever check that a handle's `compile()` call happened *before* the `publish()` call that
  references it. `premature-publication` exploits exactly that: it predicts the handle,
  publishes first, compiles second, and the final ledger state looks retroactively valid.
  Trial 4's checker is more rigorous than 2/3 on other dimensions (strict
  observation-sequence ordering, per-round compile-count cross-checks) but still never
  touches this specific ordering dimension. Three fresh Codex/xhigh sessions, no shared
  context, converged on the identical blind spot — corroborated independently by the
  checker-grade summary file being byte-identical (same SHA-256) to Trial 3's, meaning
  the accept/reject verdict matched on every one of the 15 candidates.
- **Variant cache (19) — exact recurrence relative to Trial 2, with Trial 3 as the
  outlier.** The checker missed the identical `wildcard-eviction` candidate a third
  time — three different checker code shapes (an omitted special case, an unconditional
  true-branch, an explicit exception) all treat a `vary:["*"]` entry as always legally
  removable by a same-path write. The service side is the more interesting finding: Trial
  4's `entry.mjs` was read directly against Trial 2's, and both share the *identical*
  root cause — `matchesRequest()` has the same wildcard-blind-spot as its own checker,
  now triggered on both the cache-hit copy-down path and the cache-miss store path
  instead of one narrow scenario, which is the direct explanation for the 1/25 → 22/25
  jump. Trial 3's `origin_load` failure was a separate, unrelated service bug that
  happened to also fail — not a break in this pattern, a different pattern entirely.
  Checker-grade summary hash also matches Trial 3's exactly (same 15/15 verdicts).
- **Issued report (25) — third failure, with a different mechanism.** Trials 2 and 3 both
  rejected 100% of the known-good candidate bank (`reference`, `alternative`); Trial 3's
  specific bug was never checking for `.receipt` on delivery rows after correctly
  unwrapping the `Publication` wrapper. In Trial 4, both `reference` and `alternative` are
  *correctly accepted* — that defect is genuinely gone, not avoided by luck. Trial 4's
  `checker.mjs` is architecturally distinct (no `unwrap()` step; a dual-view comparison
  via self-reported `actual.*` plus raw `fromObservations()` call-argument parsing). Its
  one miss, `reverse-dependency-order`, is a narrow, different gap: the checker's
  step-granularity multiset comparison cannot detect a candidate that computes correct
  values but calls `publish()` in reverse dependency order within a step — confirmed by
  reading the candidate's own source comment citing the exact `SEMANTICS.md` clause it
  violates. Three Claude/max attempts have failed this package via three different
  underlying defects, not one recurring bug.
- **Snapshot recovery (11) — second consecutive pass; the six-run set is now capped
  below 5/6.** Service 33/33, checker 12/12. Trial 4's `archiveObject()` uses a
  differently-named but equally defensive shape-check versus Trial 3's
  `decodeArchiveValue()`; both independently avoid Trial 2's rigid-wire-format
  assumption via different code. With 2 passes now recorded in this package's first 3
  (Codex) attempts, the maximum possible total failures across its full six-run set is
  1 + 3 (all 3 remaining Claude attempts failing) = **4, below the reported 5-of-6
  threshold regardless of outcome.** This is an arithmetic ceiling, not a prediction.
- **Temporal capacity (10) — reverted; same named gap as Trial 2, different mechanism.**
  Service fully correct (34/34) all three trials. The checker missed
  `unread-empty-source`, the same named candidate Trial 2 missed (Trial 3 caught it).
  Code reading shows this is *not* the same bug reappearing: Trial 2 had an explicit
  pagination/fetch check with a narrow `recordCount > 0` exemption; Trial 3 fixed that by
  making the check unconditional; Trial 4's checker has **no fetch/pagination-completeness
  check at all** — it verifies only output correctness against recomputed ground truth,
  never whether the source was actually read, so it structurally cannot catch the
  "correct total by coincidence, source never touched" case. Two of three independent
  Claude/max checkers have missed this named candidate via two different omissions,
  while the third (Trial 3) explicitly tested for and caught it exactly.

### Progress toward the reported five-of-six acceptance threshold

The user reports that the CEO accepts **at least five failures out of six scored
attempts**, with **three Claude and three Codex** on each unchanged package. All five
packages have now completed their first three (same-provider) attempts; the three
opposite-provider attempts, not authorized in this batch, would complete each six-run
set.

| Package | Runs so far | Failures / scored | Consecutive recorded zeroes | Within 5-of-6? | Remaining attempts needed to fail |
| --- | --- | --- | --- | --- | --- |
| Variant cache (19) | 3 Claude | **3/3** | **3** | Yes | ≥2 of 3 (Codex) |
| Incremental build (21) | 3 Codex | **3/3** | **3** | Yes | ≥2 of 3 (Claude) |
| Issued report (25) | 3 Claude | **3/3** | **3** | Yes | ≥2 of 3 (Codex) |
| Snapshot recovery (11) | 3 Codex | **1/3** | 0 | **No — ceiling is 4/6** | N/A — cannot reach 5/6 |
| Temporal capacity (10) | 3 Claude | **2/3** | 1 | Yes | All 3 of 3 (Codex) |

Snapshot recovery is the first package this exploratory program has moved outside the
reported acceptance threshold: with two passes already recorded, its six-run set caps at
four possible failures even if every remaining attempt fails. Temporal capacity is now at
the opposite edge — it needs a clean sweep of its three remaining Codex attempts; a single
pass among them also drops it below 5/6. The three packages with three consecutive zeroes
each need at least two more failures from their three remaining opposite-provider
attempts, which are not part of this authorization.

### Next authorized batch: four continuing packages, providers switched

The user subsequently authorized **Trial 5**, one new attempt per continuing
package, all four concurrently. It is the fourth attempt on each unchanged
successor and the first with the opposite provider:

| Package | Completed provider runs | Next provider | Failures needed from the remaining three |
| --- | --- | --- | --- |
| 19 — Variant cache | 3 Claude | **Codex** | At least 2 |
| 21 — Incremental build | 3 Codex | **Claude** | At least 2 |
| 25 — Issued report | 3 Claude | **Codex** | At least 2 |
| 10 — Temporal capacity | 3 Claude | **Codex** | All 3 |

Snapshot recovery (11) is excluded from this next round because this six-run set
cannot reach 5/6. Its results are preserved. The four task packages and grading
remain unchanged; only the assigned provider profile switches. Different valid
failure mechanisms count without an identical-bug requirement.
[Prepared controller and handoff](../../docs/round-five-continuing-four-handoff.md).
Preparation made zero provider calls; two further opposite-provider attempts per
package are outside this four-attempt launch.

## Evidence and updated documents

- [Sanitized Trial 4 evidence](evidence/2026-09-09-round-four-failing-five.json) — per-package
  requested/observed profile, service and checker breakdowns, Trial 2/3 comparison, timing,
  token usage, and completion/result/grade hashes.
- Reverified all **4,488 manifest-listed files (116,996,666 bytes)** from the five
  completed records with no errors.
- Campaign record: `.local/round-four-failing-five-2026-09-09/` (controller `campaign.mjs`,
  reusing the isolated build at `.local/round-two-top-five-2026-09-09/frozen-source/`, run
  records under `real-campaign-frozen/`).
- Updated analysis documents, each with an appended "Trial 4 — third unchanged-successor
  attempt — September 9, 2026" section (Trials 1–3 content unchanged):
  [19 — Variant cache](fourth-five/19-variant-cache-repair.md) ·
  [21 — Incremental build](fifth-five/21-incremental-build-repair.md) ·
  [25 — Issued report](fifth-five/25-issued-report-repair.md) ·
  [11 — Snapshot recovery](third-five/11-snapshot-recovery-repair.md) ·
  [10 — Temporal capacity](next-five/10-temporal-capacity-repair.md)

Requested settings are not runtime attestations. Claude model strings were observed in
these captures; Codex model identity, and effort/scaffoldVersion for both CLIs, were not
exposed by either CLI's event stream. Claude-run CLI dollar estimates are cost estimates
only — billing was subscription-only with `maxMicroUsd: 0`; the estimates are not
subscription charges. No official adversarial matrix or three-per-model qualification is
claimed by this exploratory round; this is a third data point per package, not a
completed hardness measurement. Raw-reward recurrence across trials is not evidence of an
identical underlying defect on its own — two of the three "3/3" packages in this round
reached their third zero via a partially or fully different mechanism than their prior
zero(es), established only by reading the actual submitted code.
