# Fourth ranked group: ready for Trial 2

**09 → 06 → 05 → 16 → 17** are fully prepared for exploratory retrials through
Foundry or native Harbor. No model trials were launched by this implementation.

See [selection and implementation](../reports/screening/fourth-ranked-five-implementation-plan-2026-09-09.md)
and [exact execution evidence](../reports/screening/evidence/2026-09-09-fourth-ranked-five-implementation.json).

| Package | Suggested target | Append Trial 2 to |
|---|---|---|
| 09 — Ticket consolidation | Claude | `reports/screening/next-five/09-ticket-consolidation-repair.md` |
| 06 — Partition index | Codex | `reports/screening/next-five/06-partition-index-repair.md` |
| 05 — Compatible rollout | Claude | `reports/screening/original-five/05-compatible-rollout-repair.md` |
| 16 — Document export | Codex | `reports/screening/fourth-five/16-document-export-repair.md` |
| 17 — Analytical reconciliation | Codex | `reports/screening/fourth-five/17-analytical-reconciliation-repair.md` |

All five retain their Trial 1 model family: three Codex, two Claude. All now require
both service and checker. Rollout gains the checker and an explicit stage-response-loss
contract; identify this version change when comparing outcomes. Reasons are diagnostic.

Artifacts under `.local/fourth-ranked-five-implementation-2026-09-09/`:

- `before/<id>`: preserved source baselines.
- `source/`: isolated authoring build; the main runtime was not rebuilt.
- `release-v1/`: successful assurance, checker-oracle and recipient reproduction runs.
- `release-ready/<id>/export`: final Foundry exports; use these for model dispatch.
- `release-ready/<id>/validation/assurance.json`: digest-bound passing assurance.
- `harbor-ready/<id>`: complete native package with separate verifier and oracle.
- `static-checks/`, `integrity/`, `jobs/`: completed native execution evidence.
- `artifact-reproduction.json`: source preservation, byte checks and reproduced exports.

Validation passed: 78 assurance checks, 63/63 checker classifications, 110 static
checks, 30 integrity controls, five oracle passes, five expected nop zeroes,
45 regression tests, typecheck, changed-test lint and export reproduction.
All 1,222 protected source/controller files were unchanged.

Completed native jobs used these configurations; do not rerun them into their
existing output directories:

```sh
harbor run --config .local/fourth-ranked-five-implementation-2026-09-09/oracle-job.json
harbor run --config .local/fourth-ranked-five-implementation-2026-09-09/nop-job.json
```

Use the existing isolated-controller pattern for a later authorized model campaign.
The Foundry adapter's legacy `native` flag is not the native Harbor export mechanism.
Record exact package/profile identities, real launch concurrency, authoring and total
durations, service results and checker classifications separately. Preserve Trial 1
and this engineering record. A required-checker error is a task failure even when
the service passes; any grading-defect claim needs a specific contract conflict.

This brings preparation to twenty packages. The five remaining candidates are
23 Staged allocation, 02 Persistent knowledge, 10 Temporal capacity, 01 CAA and
22 Event window. Final submission qualification remains separate from these local
checks and exploratory model attempts.
