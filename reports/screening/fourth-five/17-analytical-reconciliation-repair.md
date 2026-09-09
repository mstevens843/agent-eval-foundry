# 17 — Analytical reconciliation repair

## Outcome

Codex, requested Sol / xhigh, completed in **18 minutes 28 seconds**. The original
record says **reward 0**: its service passed **28/28 scenarios**, and its checker
correctly classified **13/13 candidates**, but only **5/11** negative candidates
received the grader's preferred rejection label. No execution error was recorded.

This is **not a demonstrated capability failure**. Examination of the original
authority captures confirms that all six allegedly wrong labels named genuine
violations. The grader required a private primary label that the public contract
did not require the solver to guess. The original reward remains zero; this report
corrects its interpretation, not its stored history.

## What the task was, in plain English

A reporting service joins an account catalog, metering revisions and issued credits
to produce a finance report. It must include every active customer in the requested
tenant, attribute usage to the right account/customer, and apply the latest revision
of each logical record before deciding whether that record belongs in the reporting
period. Customers with no usage still belong in the output.

Amounts require exact arithmetic. Usage can arrive in different units, prices are
rational numbers, and the service must add exact contributions before rounding the
customer's total once with the specified half-even rule. Correct totals with the
wrong source IDs are also wrong: each row carries its supporting usage/credit IDs.

The interesting interaction is between revision selection, population selection,
attribution and arithmetic. A later revision can move a formerly eligible record out
of the reporting period or void it. Filtering first can accidentally resurrect its
old version. Rounding each small charge separately can change a convincing-looking total.

## What was in the package

The supplied multi-file service already had pagination, exact-number helpers, a
reconciliation pipeline and visible tests. Public semantics and API definitions
described the required behavior. A separate standalone checker was also required:
it had to judge actual recorded rows using the complete original source tables and
external call observations, not a candidate's self-reported success.

The protected service bank contained 28 scenarios. Checker grading used two correct
implementations and eleven wrong-solution controls, with repeated checker calls for
determinism. Before dispatch, source-table availability was repaired so a checker
could find missing work without borrowing another candidate's fetched records.
This was a necessary validity improvement, not evidence of increased difficulty.

## What the agent actually did

The retained command log contains 14 completed shell commands. The submitted changes
are concentrated in `src/revisions.mjs`, `src/reconcile.mjs`, a new `checker.mjs`, and
a new `test/edge-cases.test.mjs`.

1. It replaced the revision selector with a map keyed by tenant and record ID,
   retaining the greatest revision. Period and state filtering then happens after
   that selection. This fixes both the ordering mistake and cross-tenant identity reuse.
2. It changed per-row rounded charges into exact rational contributions. The existing
   rational addition and final rounding helpers could then do their intended job.
   It did not need to invent a new arithmetic library.
3. It wrote a standalone checker that independently recomputes the expected report
   from raw tables, compares actual values and source IDs, and checks recorded effects
   and pagination completion. This was additional implementation work, not just a
   call to the supplied tests.
4. Its new tests combine an empty intermediate page with a live continuation cursor,
   duplicate source rows, reused IDs in another tenant, a revision moved outside the
   period, a voided credit, and fractional charges whose correct sum depends on rounding
   once. Another test mutates amounts, duplicates an output row, disconnects a claimed
   row from its recorded effect, and leaves a page traversal incomplete.
5. Local tests failed during development and were corrected. The final captured
   verification runs the three-test suite and syntax checks successfully. These
   recovered development failures are not invalid trial executions.

The observable work supports a targeted, unaided repair and meaningful local checking.
It does not show a large randomized fuzz campaign, and one was not necessary to solve
the frozen service bank.

## Why the zero reward is misleading

For `filter-before-revision` and `unscoped-revision-id`, the private calibration label
was `attribution`. The submitted checker reported `exact_amounts` and `provenance`.
The original protected executions list **all three** as failed obligations.

For `stop-at-empty-page`, it reported `population`, `exact_amounts`, `provenance` and
`completion`; the grader still required `attribution`. For no-work, forged-completion
and isolation controls, it reported `population` and `provenance` rather than the
private primary `completion`. Those reported obligations also really failed.

There were no accepted bad candidates and no rejected correct candidates. The reason
failure is a mismatch between the evaluator's label rule and the actual public task,
not an incomplete repair exposed by the hidden scenarios. The audit uses the saved
checker output and hash-verified original authority results; it does not rerun the
submission under a friendlier package and call that a new trial.

## What this tells us about difficulty and improvement

The primary repair remains compact. Much of the surrounding pipeline was already
correct, and the two central transformations—select latest first, round once last—
follow directly from the public semantics. This attempt gives no evidence that this
construction is difficult enough for the intended failure target.

First fix the grading alignment: a checker must reject wrong behavior and name a
public obligation the actual trace violates, not infer a hidden author's preferred
description. Preserve primary control labels for activation testing, where they belong.

For future construction, exercise distinct near-correct relational mistakes together:
revision identity, one-to-many ownership, required zero-usage customers, and exact
arithmetic. Any new source of ambiguity must have a public business definition and
sufficient authoritative input. Simply adding more rows or forbidding a straightforward
map-based solution would not establish a better task. A materially larger reconciliation
workflow would be a new version needing its own reference and control validation.

## Evidence and limits

[Sanitized batch evidence](../evidence/2026-09-08-fourth-five.json) records original
timing, reward, classifications, source changes and capture hashes. Raw transcripts,
submissions and the detailed original-label audit remain retained privately. This is
one exploratory run, not an independently blind-adjudicated result or a failure rate.
Requested model settings are not independent backend attestations. The report describes
observable commands and artifacts, not private internal reasoning.

## Changes applied since this trial (2026-09-08)

This report's diagnosis was exact: the frozen grader required a control's `reasons` to name the ONE privately-designated "primary" label (`control.check`), even though the original protected authority captures show every reported label (`exact_amounts`, `provenance`, `population`, `completion`) genuinely failed alongside the designated primary. Demanding the one designated label graded taxonomy-guessing, not diagnosis.

**Fix applied**, in `src/packages/portfolio.ts` (harness-wide, all four source trees this project maintains, plus the separate frozen tree the real dispatch actually ran against): `gradeChecker`'s `namedRightCheck` now credits a checker for naming ANY obligation that control's own real, authoritative trace actually failed, not just the one designated primary. `control.check` keeps its original, narrower job (deciding whether a scenario window is wide enough to make a control's defect observable at all) untouched. This is a harness change — no scenario, control or reference file for this task was touched.

**Regrade performed exactly as this report's audit implies is possible** — the same preserved submission bytes, under a separately versioned diagnostic, not overwriting this result or counting as a new trial. Re-run against the fixed harness with zero new model calls: now scores a full pass (13/13 correct, 0 false positives, 0 missed, all 11 controls correctly named — up from 5/11). This is the confirmed fix: the label-attribution defect this report identified is resolved, not merely explained.

**When trials run again:** a fresh attempt against this package should now score correctly on checker grading whenever it correctly names any of the obligations a control's own trace actually violates, without needing to guess the package author's private taxonomy preference.


## Trial 2 preparation — fourth ranked group (2026-09-09)

**Ready for second exploratory trials through Foundry or native Harbor.** No new model attempt is recorded by this engineering work. Removed the public pagination, revision, arithmetic and reporting implementation after completing private service closures. The independent checker derives effective revisions, customer population, exact rational amounts and source IDs from raw tables and actual record calls. The grader now enforces the already-public requirement to traverse every source through its terminal cursor. `undrained-empty-source` isolates incomplete traversal with an otherwise correct empty report. Repeated solution advice was trimmed while retaining the mathematical definition and custom output schema.

Both service and checker are required. The public entry is empty, reason strings are optional diagnostics, helper modules are allowed, and the contract retains the facts needed to judge correctness. Existing shared authoring-policy improvements apply; no additional exploration gates were introduced.

Local validation passed 17 assurance checks across 28 service scenarios, including complete reference/alternative services and semantic rejection of the untouched starter. The independent checker classified **14/14** candidates correctly, with zero false accepts or misses. All 22 native static checks and six verifier integrity controls passed. The exact native export earned oracle reward 1 and nop reward 0, with no infrastructure error; nop rejects the absent required checker. Foundry assurance separately verifies the empty service's semantic failure. Export reproduction and targeted regression checks passed.

Foundry export: `.local/fourth-ranked-five-implementation-2026-09-09/release-ready/analytical-reconciliation-repair/export`. Package digest: `c1e754da99fb64c00fb3b8e39407448b98e0ae54aa934d75007b1fc141aa410e`. Native digest: `bf8e9c89b48c2ee029b2bc1d4126d673f1d4f4691ada122e4f95b3e6fb10bf19`. Suggested Trial 2 target: **Codex**, retaining this package's original model family. Append the eventual Trial 2 result below this engineering record, preserving Trial 1.

[Group implementation and selection](../fourth-ranked-five-implementation-plan-2026-09-09.md) and [exact validation evidence](../evidence/2026-09-09-fourth-ranked-five-implementation.json) retain file hashes, native trial identities and the remaining final-qualification requirements.
