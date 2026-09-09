# Next five implementation successors

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
