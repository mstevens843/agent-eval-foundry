# Final five: ready for Trial 2

**23 → 02 → 10 → 01 → 22** complete preparation of all 25 successors. Local native
Harbor validation is complete. This engineering work launched no model trials.

See the [implementation report](../reports/screening/final-five-implementation-plan-2026-09-09.md)
and [exact exports, digests and evidence](../reports/screening/evidence/2026-09-09-final-five-implementation.json).

| Package | Target | Original analysis to append |
|---|---|---|
| 23 — Staged allocation | Claude | `reports/screening/fifth-five/23-staged-allocation-repair.md` |
| 02 — Persistent knowledge | Codex | `reports/screening/original-five/02-persistent-knowledge-repair.md` |
| 10 — Temporal capacity | Claude | `reports/screening/next-five/10-temporal-capacity-repair.md` |
| 01 — Certificate authorization | Codex | `reports/screening/original-five/01-caa-revalidation-repair.md` |
| 22 — Event window | Codex | `reports/screening/fifth-five/22-event-window-repair.md` |

Under `.local/final-five-implementation-2026-09-09/`, use:

- `release-ready/<id>/export` for the four Node packages.
- `caa-export` for the native CAA Foundry package, using its native execution route.
- `harbor-ready/<id>` for all five native Harbor exports.
- `source/` for the isolated authoring build; the live runtime was not rebuilt.
- `artifact-reproduction.json` and `caa-reproduction.json` for retained reproduction proofs.

The Node packages require service and checker; reason text is diagnostic. CAA requires
the native Go service and uses `/app/certd/` as its submission artifact. Knowledge now
includes a required checker and committed-publication redelivery; note those changes
when comparing Trial 2 with Trial 1.

Validation: 90 assurance checks, 51/51 Node checker classifications, 110 static checks,
24 Node integrity controls plus CAA's artifact/process controls, five Harbor oracle
passes, five expected nop zeroes, 67 regression tests, typecheck and reproduction.
All 1,120 protected source/controller files were unchanged.

Use the existing isolated campaign pattern and fresh records for future model trials.
The final evidence file is the authority for dispatch paths and package digests.
Record actual concurrency, durations, service/checker outcomes and specific failed
obligations. Preserve the original trial history. Local authored controls establish
readiness; future model trials establish observed difficulty.
