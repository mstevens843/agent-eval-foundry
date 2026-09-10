# Post-final five: the last authorized attempts, under post-final-coverage-v2

> Follow-up: the [remaining-pass audit](remaining-pass-audit-2026-09-09.md) found
> checker defects in cache Trials 6/7 and snapshot Trial 4. The user elected to
> void and replace those three attempts: cache is pending at 4/4, snapshot at 4/5.
> Build and report remain complete at 6/6, temporal at 5/6. This v2 campaign record
> is historical; a base-suite pass does not establish universal correctness.

**All four reopened packages have now completed their fixed six-run sets. Two meet the
reported five-of-six threshold; two do not.** Every one of the five final raw executions
came back a service-and-base-checker clean pass — the entire signal in this campaign came
from two new, narrowly-targeted supplemental controls per package, not from any change to
the original grading bank.

September 9, 2026. This campaign ran the final authorized attempt(s) for the four packages
reopened by the [post-final pass audit](post-final-pass-audit-2026-09-09.md)
(`post-final-coverage-v2`, which extends the earlier `final-six-coverage-v1`): a second
checker-coverage audit that reproduced six additional false passes across variant cache,
issued report, and temporal capacity — packages the first audit had not touched — plus one
more for snapshot recovery, on top of the two the first audit had already corrected.
Before dispatching anything, this session independently reproduced the entire audit from
scratch (`node scripts/reproduce-post-final-pass-audit.mjs`, zero provider calls, real
Docker execution against the frozen harness and the actual retained submissions) and it
matched the published evidence exactly. Package bytes, public contracts, private controls
and grading routes remain unchanged throughout. Solvers received only the original public
task inputs — no prior submissions, analysis, either audit, or this campaign's operator
handoff.

## Execution record

Five attempts were authorized and launched together (concurrency cap of six): the last
Codex attempt each for variant-cache-repair, issued-report-repair, and
temporal-capacity-repair, plus both of snapshot-recovery-repair's remaining Claude
attempts (Trials 6 and 7), dispatched simultaneously and blind to one another — Trial 7
did not wait for Trial 6's result, and in fact Trial 7 finished about nine minutes before
Trial 6. All five ran under the same signed, subscription-only JobStore reservations, 2
CPUs/2 GiB per container, and 10,800-second budgets as every prior trial. No attempt came
close to the timeout; the fastest (temporal-capacity-repair) ran 7m10s, the longest
(snapshot-recovery-repair Trial 6) 29m42s. All five reached a clean `completed` state with
no invalid execution or infrastructure error, and the parent runner reported zero errors.
Grading applied the original package grade first, then the mandatory cumulative
`post-final-coverage-v2` supplement for every submission — the same supplemental grader
used for the audit itself, run again from scratch against each fresh submission's own
checker.mjs. All 4,263 manifest-listed files (81,542,893 bytes) across the five completed
records were reverified with zero errors.

## Results

| Package | Attempt | Provider | Base service | Base checker | Supplement | Recorded | Effective |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Variant cache (19) | Trial 7 | Codex | 25/25 | 15/15 | 2/2 pass | 1 | **1** |
| Issued report (25) | Trial 7 | Codex | 27/27 | 14/14 | 1/2 fail | 1 | **0** |
| Temporal capacity (10) | Trial 7 | Codex | 34/34 | 13/13 | 4/4 pass | 1 | **1** |
| Snapshot recovery (11) | Trial 6 | Claude | 33/33 | 12/12 | 3/4 fail | 1 | **0** |
| Snapshot recovery (11) | Trial 7 | Claude | 33/33 | 12/12 | 4/4 pass | 1 | **1** |

Every base service and every base (original-bank) checker result was fully correct across
all five attempts. The only source of any effective-reward divergence was the two new,
narrowly-targeted `post-final-coverage-v2` controls added per package.

### What actually happened, and how precisely

- **Variant cache (19) — the checker's final attempt passed, closing the set below
  threshold.** This needed to fail to reach 5/6. It correctly accepted the new
  tier-copy control (the same specific alternative Trial 5's checker had wrongly rejected,
  which Trial 6's checker had already fixed) — reading `checker.mjs` confirms its
  get-write legality check builds a list of already-present entries across tiers and
  accepts any new entry that deep-equals one of them, rather than restricting legal writes
  to only the tier that was hit. Final effective history: T2=0, T3=0, T4=0, T5=0
  (effective; recorded 1, corrected by the post-final audit), Trial6=1, Trial7=1 — **4
  failures out of 6**, a complete 3 Claude + 3 Codex set.
- **Issued report (25) — a third consecutive Codex checker rejects the same documented
  error-recovery pattern, via a third distinct message.** The new control attempts a
  delivery before its version is published, receives the contract's documented
  `error:"version"` no-receipt response, then proceeds normally — behavior the contract
  explicitly permits. Trial 7's checker rejected it anyway, with two new specific
  reasons ("deliver call was not stored"; "deliver calls do not match required
  receipts") — different exact wording from Trial 5's ("malformed or unsuccessful
  deliver call") and Trial 6's ("an invalid delivery call was attempted"), but the same
  underlying category of defect. Code reading confirmed the structural cause: the
  checker's `inspectObservations()` flags any non-stored `deliver` response as itself a
  violation, with no check for whether it matches the documented no-op error, and the
  same call independently fails a separate `expectedDeliverCalls` multiset comparison
  too. Three independently-written Codex checkers, three different exact messages, one
  underlying mistake. Final effective history: T2=0, T3=0, T4=0, T5=0 (effective,
  reclassified), Trial6=0 (effective, reclassified), Trial7=0 — a complete **6 failures
  out of 6**, a full sweep.
- **Temporal capacity (10) — the first Codex checker on this package to pass the full
  cumulative bank.** The new control restarts a pagination traversal from `null` a
  second time before exhausting it via the returned cursor. Both prior Codex checkers
  (Trials 5 and 6) tracked only the first issued cursor and wrongly reported the
  traversal incomplete on restart. Trial 7's checker tracks a growing set of reachable
  cursors seeded at `null` rather than only the last-issued one, so it correctly
  recognizes the restarted traversal as exhausted — passing all four cumulative cases
  (the earlier v1 zero-query control plus the new v2 restart control). Final effective
  history: T2=0, T3=0 (effective, corrected by the first audit), T4=0, T5=0 (effective,
  reclassified), Trial6=0 (effective, reclassified), Trial7=1 — **5 failures out of 6**,
  meeting the threshold exactly at the boundary.
- **Snapshot recovery (11) — a third independent occurrence of the same coercion
  mistake, and the first checker to avoid it.** The new control changes account name
  `"001"` to `"1"` in both the restored database and portable backup — a genuinely
  invalid corruption, since account names are string data even when they look numeric.
  Trial 6's checker routes account fields through a shared comparator that coerces any
  all-digit string to a number before comparing, so it wrongly accepted the corruption —
  structurally the same mistake as Trial 5's `sameScalar()` helper, independently
  reintroduced by a different author. Trial 7's checker instead calls `String(value)` on
  the name field specifically (with a comment noting names are text data that must not
  be coerced), correctly rejecting the corruption with an exact three-way mismatch
  report. This package needed *both* Trial 6 and Trial 7 to fail; only one did. Final
  effective history: T2=0, T3=0 (effective, corrected by the first audit), T4=1, Trial5=0
  (effective, reclassified), Trial6=0 (effective, reclassified), Trial7=1 — **4 failures
  out of 6**, a complete 3 Codex + 3 Claude set (Trials 5–7 were this package's
  first-ever Claude attempts).

## Final classification — all four packages' six-run sets are now closed

| Package | Effective failures / scored | Provider balance | Classification |
| --- | --- | --- | --- |
| Incremental build (21) | 6/6 | 3 Claude + 3 Codex (complete) | Meets 5/6 *(unaffected by this campaign)* |
| Issued report (25) | **6/6** | 3 Claude + 3 Codex (complete) | **Meets 5/6** |
| Temporal capacity (10) | **5/6** | 3 Claude + 3 Codex (complete) | **Meets 5/6** |
| Variant cache (19) | 4/6 | 3 Claude + 3 Codex (complete) | Cannot reach 5/6 |
| Snapshot recovery (11) | 4/6 | 3 Codex + 3 Claude (complete) | Cannot reach 5/6 |

No package was left unresolved by infrastructure — every dispatched attempt completed and
was scored. All five finalists now have a complete, exactly balanced three-per-provider
six-run set; none remain unresolved or partially run. Meeting the numerical screening
target does not itself claim that every final rubric or cheat-qualification requirement is
complete.

## Evidence and updated documents

- [Sanitized post-final-five evidence](evidence/2026-09-09-post-final-five.json) — per-attempt
  base service/checker and supplemental breakdowns, raw/effective reward, timing, token
  usage, and completion/result/grade hashes.
- Reverified all **4,263 manifest-listed files (81,542,893 bytes)** from the five
  completed records with no errors.
- Independently reproduced the `post-final-coverage-v2` audit from scratch before
  dispatch (`scripts/reproduce-post-final-pass-audit.mjs`); the reproduction matched the
  published [post-final pass audit](post-final-pass-audit-2026-09-09.md) and its
  [sanitized evidence](evidence/2026-09-09-post-final-pass-audit.json) exactly.
- Campaign record: `.local/post-final-five-2026-09-09/` (parent runner
  `scripts/run-post-final-five.mjs`, per-attempt logs, adjudications, and `FINAL.json`);
  raw provider records remain under each package's existing
  `.local/final-six-2026-09-09/<id>/trial-N/` directory.
- Updated analysis documents, each with an appended final dated section (all prior trial
  and audit sections unchanged):
  [19 — Variant cache](fourth-five/19-variant-cache-repair.md) ·
  [25 — Issued report](fifth-five/25-issued-report-repair.md) ·
  [10 — Temporal capacity](next-five/10-temporal-capacity-repair.md) ·
  [11 — Snapshot recovery](third-five/11-snapshot-recovery-repair.md).

Requested settings are not runtime attestations. Claude model strings were observed in
these captures; Codex model identity, and effort/scaffoldVersion for both CLIs, were not
exposed by either CLI's event stream. Claude-run CLI dollar estimates are cost estimates
only — billing was subscription-only with `maxMicroUsd: 0`; the estimates are not
subscription charges. No official adversarial matrix or three-per-model qualification is
claimed by this exploratory program; each package's six-run set is one complete,
provider-balanced data point, corroborated throughout by code-level verification against
the actual submitted checkers rather than inferred from reward numbers alone.
