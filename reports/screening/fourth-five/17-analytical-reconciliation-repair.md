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
