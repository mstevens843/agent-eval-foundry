# Third ranked group: trial preparation

The group is **13 → 08 → 15 → 12 → 11**. See the
[implementation report](../reports/screening/third-ranked-five-implementation-plan-2026-09-09.md)
for selection, changes and validation status. These are the third group of five
engineering successors, not the historical screening batch named `third-five`.

**All five Foundry and native Harbor exports passed local validation and are ready
for exploratory retrials.** Exact digests and native job results are in
[the evidence](../reports/screening/evidence/2026-09-09-third-ranked-five-implementation.json).

| Package | Existing trial analysis |
|---|---|
| 13 — Capacity maintenance | `reports/screening/third-five/13-capacity-maintenance-repair.md` |
| 08 — Partial release | `reports/screening/next-five/08-partial-release-repair.md` |
| 15 — Rule index | `reports/screening/third-five/15-rule-index-repair.md` |
| 12 — Verified installation | `reports/screening/third-five/12-verified-installation-repair.md` |
| 11 — Snapshot recovery | `reports/screening/third-five/11-snapshot-recovery-repair.md` |

Sources are maintained under `tasks/<id>`. Artifacts are under
`.local/third-ranked-five-implementation-2026-09-09/`:

- `before/<id>` preserves the selected source baseline.
- `release-v1/` preserves the initial maintenance validation failure; it is not a
  dispatch artifact.
- `release-ready/<id>/export` contains the reproducible Foundry export.
- `harbor-ready/<id>` contains the native Harbor task, complete private service and
  checker oracle, and separate verifier environment.
- `static-checks/` contains the 22 upstream static checks per task.
- `integrity/` and `jobs/` hold the completed native execution evidence.

All five require both service and release-validator implementations. Starters are
empty; API and domain contracts remain available. Reason strings are diagnostic,
and helper modules are allowed. Raw input/effect data is available to the checker;
computed grading verdicts and expected outputs are private.

Use only an export whose full digest and completed validation are recorded in the
implementation evidence. A later model campaign should freeze its executor source
separately and create a fresh job store and output directory. It must not reuse the
running first group's reservations or controller records. Keep actual model,
profile, package digest, service outcome, checker outcome and elapsed time in each
new Trial 2 record. This engineering work makes no model calls.

The completed native local jobs explicitly selected `oracle` or `nop`, with
concurrency one. Their exact executed configurations are retained as evidence:

```sh
harbor run --config .local/third-ranked-five-implementation-2026-09-09/oracle-job.json
harbor run --config .local/third-ranked-five-implementation-2026-09-09/nop-job.json
```

Those are provider-free local checks, not the assignment's standard or cheat model
trials. Future validation should use fresh job names/output directories. The final
submission still requires its human-authored material and all
rubric, standard and cheat qualification on the final selected version. The prior
group's deferred native checks remain a separate work item.
