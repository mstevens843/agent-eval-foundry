# Next five implementation successors

**Final screening status, September 11:** Browser replay, Recurring calendar, Workflow authority and Delegated budget each completed 6/6 reward-zero trials, balanced three per provider. Route stopped at 3/5 failures. See the [combined nine-task results](../reports/screening/final-results-2026-09-11.md). The preparation notes below describe the earlier implementation stages.

## Historical preparation


**Preparation status, September 10:** all five 3.0.0 successors are hardened and
frozen for exploratory trials. Use the [hardening report](../reports/screening/next-five-hardening-2026-09-10.md)
and [coverage map](../reports/screening/next-five-hardening-coverage-2026-09-10.md).
The exact Foundry exports and native `harbor-frozen-v2/<id>/` exports live under
`.local/next-five-hardening-2026-09-10/`; the report names each path and digest.
All oracle/nop, 73 checker classifications, 23 checker mutations and 45 native
integrity checks pass. `node scripts/verify-next-five-hardening.mjs` verifies the
recorded exports before launch. No new model trials have run on these bytes.

The [first hardened-version trial handoff](hardened-next-five-trial-one-handoff.md)
now has a prepared, verified controller for all five concurrent attempts: three
Codex and two Claude. Its frozen runtime includes the current hardening changes.
Readiness is recorded; dispatch remains with the trial operator.

The earlier paths and trial instructions below are retained version history.

The next exploratory group is **14 → 03 → 18 → 20 → 04**. Selection rationale,
engineering changes and validation results belong in
[the implementation report](../reports/screening/next-five-implementation-plan-2026-09-09.md).

| Package | Trial-analysis document |
|---|---|
| 14 — Route policy | `reports/screening/third-five/14-route-policy-repair.md` |
| 03 — Browser replay | `reports/screening/original-five/03-browser-replay-repair.md` |
| 18 — Recurring calendar | `reports/screening/fourth-five/18-recurring-calendar-repair.md` |
| 20 — Workflow authority | `reports/screening/fourth-five/20-workflow-authority-repair.md` |
| 04 — Delegated budget | `reports/screening/original-five/04-delegated-budget-repair.md` |

Maintained sources are `tasks/<id>`. **Foundry exploratory retrial exports are ready**
under `.local/next-five-implementation-2026-09-09/release-ready/<id>/export`.
Built native tasks are under
`.local/next-five-implementation-2026-09-09/harbor-final/<id>`; native browser
integrity and all five native Harbor oracle/nop pairs passed. Exact digests
and checked bytes are recorded in
[the evidence](../reports/screening/evidence/2026-09-09-next-five-implementation.json).

All five now require a service plus an independent release validator. Browser and
budget previously required only a service; Trial 2 is consequently a versioned
successor experiment. Preserve that distinction when comparing rewards or duration.
Reasons are optional diagnostics, and submitted helper modules are available.

Use the existing subscription-backed execution authorization and signed job
lifecycle when a later user instruction launches trials. A native Harbor export
does not imply that the Foundry provider adapter's legacy `native` switch supports
these task IDs. Keep each run tied to its exact export digest and actual model.
Never overwrite Trial 1 records or present local controls as model attempts.

For a local iteration, use `scripts/verify-selected-portfolio.mjs` with only the
affected IDs. `--release` adds export reproduction and fresh recipient validation.
Use `scripts/build-harbor-portfolio.mjs` with explicit task IDs; its no-ID default
still selects the first group. Browser verifier exports use the pinned Playwright
recipe and retain real browser ZIP traces as verifier artifacts. Normal solver
containers retain the benchmark's ordinary network configuration.

The shared authoring policies already changed in the first implementation: no
mandatory green public starter tests, separate timed human solve, self-verifiability
rejection or unrelated whole-batch revalidation for exploratory iteration.
Final submission still needs the human-authored material and required rubric,
standard and cheat qualification runs on the selected final version.

## Completed native validation — September 9

The deferred runs completed after the model campaign released Docker capacity.
These recorded commands made no model/provider calls. The two JSON job configs
explicitly select `oracle` and `nop`, with concurrency one within each local job.
Their output directories now contain evidence; use fresh names for any future rerun.

```sh
node scripts/verify-harbor-integrity.mjs \
  .local/next-five-implementation-2026-09-09/integrity-browser-final \
  .local/next-five-implementation-2026-09-09/harbor-final/browser-replay-repair

harbor run --config .local/next-five-implementation-2026-09-09/oracle-final-job.json

harbor run --config .local/next-five-implementation-2026-09-09/nop-final-job.json
```

Browser integrity passed six controls. All five oracle trials returned reward 1;
all five nop trials returned reward 0 because the required checker was absent.
Trial results and verifier summaries confirm no infrastructure errors. Foundry
assurance separately confirms semantic failure of every empty service starter.
The earlier browser timeout remains retained development evidence.

The [Trial 2 handoff](next-five-trial-2-handoff.md) contains the prepared controller,
model assignments, exact launch command and per-task reporting instructions.


## Successor 3.0.0 implementation — September 10, 2026

The September 9 packages, Trial 2 results and launch instructions above describe
historical versions. Maintained sources now implement the five 3.0.0 successors:
flat-policy migration, accessible browser replay, persistent calendar generations,
fenced multi-boundary workflow authorization and reservation/settlement accounting.
The core starters remain empty. No new model/provider trials were launched.

Use the [new implementation report](../reports/screening/next-five-successor-implementation-2026-09-10.md)
and [evidence manifest](../reports/screening/evidence/2026-09-10-next-five-successors.json)
for that implementation stage's artifacts and validation. Builds are isolated under
`.local/next-five-successors-2026-09-10/`; frozen prior exports/campaign runtimes
were not modified. The subsequent hardening review and frozen trial preparation
are linked at the top of this page. Local validation does not establish model
failure rates or add successful finalists.
