# Twelve qualifying tasks: ten at 6/6, two at 5/6

September 11, 2026 successor checkpoint. **Twelve of the 25 screened tasks meet the reported ≥5/6 reward-zero target.** Compatible rollout, Verified installation and Capacity maintenance add three 6/6 sets to the earlier seven.

## Completed results

| Task and full trial history | Reward=0 / counted trials | Codex reward=0 | Claude reward=0 |
| --- | ---: | ---: | ---: |
| [03 — Browser replay](original-five/03-browser-replay-repair.md) | **6/6** | 3/3 | 3/3 |
| [04 — Delegated budget](original-five/04-delegated-budget-repair.md) | **6/6** | 3/3 | 3/3 |
| [05 — Compatible rollout](original-five/05-compatible-rollout-repair.md) | **6/6** | 3/3 | 3/3 |
| [12 — Verified installation](third-five/12-verified-installation-repair.md) | **6/6** | 3/3 | 3/3 |
| [13 — Capacity maintenance](third-five/13-capacity-maintenance-repair.md) | **6/6** | 3/3 | 3/3 |
| [18 — Recurring calendar](fourth-five/18-recurring-calendar-repair.md) | **6/6** | 3/3 | 3/3 |
| [19 — Variant cache](fourth-five/19-variant-cache-repair.md) | **6/6** | 3/3 | 3/3 |
| [20 — Workflow authority](fourth-five/20-workflow-authority-repair.md) | **6/6** | 3/3 | 3/3 |
| [21 — Incremental build](fifth-five/21-incremental-build-repair.md) | **6/6** | 3/3 | 3/3 |
| [25 — Issued report](fifth-five/25-issued-report-repair.md) | **6/6** | 3/3 | 3/3 |
| [10 — Temporal capacity](next-five/10-temporal-capacity-repair.md) | **5/6** | 2/3 | 3/3 |
| [11 — Snapshot recovery](third-five/11-snapshot-recovery-repair.md) | **5/6** | 3/3 | 2/3 |

**72 counted finalist trials: 70 reward=0, two reward=1; 36 Codex and 36 Claude trials.** Each qualifying task has six counted outcomes, balanced three per provider. Reward=0 denotes failure of the complete required deliverable, including the submitted checker. These are ten six-failure sets, not ten sets of successful solver passes.

The [current machine-readable record](evidence/2026-09-11-twelve-finalists.json) derives these totals from the preserved [earlier nine-finalist milestone](evidence/2026-09-11-final-results.json) and the [successor checkpoint](evidence/2026-09-11-successor-results.json). The earlier five-finalist [September 9 result](final-results-2026-09-09.md) also remains unchanged.

## The three new qualifying sets

| Task | Frozen version | Service results | Required-checker results |
| --- | --- | --- | --- |
| Compatible rollout | 3.0.1 | 25/25 on all six trials | T1–3 and T6 fail output validation; T4–5 score 14/17 and reject three valid candidates. |
| Verified installation | 2.0.1 | 55/55 on all six resolved grades | T1–3 fail output validation; T4–6 score 17/20 and reject three valid candidates. T2's grading was recovered without another model call. |
| Capacity maintenance | 2.0.1 | 30/30 on all six trials | T1–3 fail output validation; T4–6 score 17/19 and reject two valid candidates. |

All 18 new qualifying outcomes are service passes and required-checker failures. The eight attempts with classification aggregates reject valid implementations and accept no invalid candidate in their issued banks. The other ten fail checker output validation; this publication does not infer one precise cause for every missing aggregate. Repeated aggregate scores have distinct saved checker hashes, but distinct code does not establish distinct failure mechanisms or statistical independence.

Full per-trial scores, identities and hashes are in the [successor campaign report](successor-results-2026-09-11.md) and each task's history. The three sets each use a single package digest. Earlier family versions and exploratory trials are outside those six-trial sets.

## Packages outside the qualifying total

- **Partial release is solved.** Historical T2 and corrected-package T3 retain audited valid passes. Additional Codex T4 recorded a service pass and 22/22 checker score; that particular submission remains pending a separate false-pass audit. Its extra confirmation attempts do not turn the package into a qualifying failure set.
- **Ticket consolidation has three historical counted failures and no valid pass at this checkpoint.** Physical attempts 4, 5 and 6 retain their original reward 1 but are separately audited nulls. Missing request/schema coverage, incorrect literal-directory handling, and rejection of a valid deferred-marker strategy were corrected in successive builds. None contributes a counted failure or a valid pass. Corrected v2.0.4 is ready for physical attempt 7, eligible counted trial 4; later results are outside this fixed checkpoint.
- **Route policy previously stopped at 3/5 failures**, with two retained Codex passes. Its last unused slot could only raise it to 4/6. The [T7 audit](route-trial-seven-pass-audit-2026-09-11.md) found no additional defect across 320 service configurations and 682 checker classifications.

## Counting and operational corrections

The target is at least five reward-zero outcomes in six counted trials, balanced three per provider. Original rewards remain immutable. Documented grading voids and audited false passes have counted reward null. Regrades are linked diagnostic or recovery records, not new provider attempts. A recovery can supply the resolved grade for the original model attempt only under an explicit published disposition.

Verified Installation T2 completed its provider run but encountered a Docker grading incident. Its same-package, same-submission linked recovery supplied reward 0. The original incident remains untouched, and the original attempt counts once. The separate installation continuation logged its own launches; using the original slot pool caused the main controller's orphan-dispatch assertion to fail. The error and both ledgers remain preserved. A separate reconciliation verifies 24 original-pool dispatches, each with exactly one launch, without fabricating the main controller's missing final marker.

The successor checkpoint covers **28 physical provider attempts**: the original 24 plus four follow-up attempts. After the recovery and three Ticket nulls, it contains **25 counted outcomes: 22 zeroes and three ones**. Only the 18 outcomes of the three completed failure sets join the finalist totals. Publication independently verifies **37,792 original manifest files**, plus **1,455 linked-regrade files**. It makes no provider calls.

Earlier counting corrections remain in force: Browser counts T3, T4 and T10 on Claude and T7–T9 on Codex; its T5 infrastructure interruption and T6 grading void remain excluded. Calendar, Workflow and Budget count T3–T8. Their previous 31-attempt campaign and the 11-attempt final continuation remain documented in the [earlier campaign report](hardened-six-continuation-2026-09-11.md). The first five finalists' grading voids are unchanged.

## Inspect and verify

Run `node scripts/verify-publication.mjs` for portable accounting, hashes, provider balance, exclusions and navigation. With retained local trial records, `node scripts/publish-successor-results.mjs verify` rechecks the raw completion manifests and rebuilds this exact checkpoint without model calls. See the [testing guide](../../docs/testing.md) for other verification tiers.

The evidence records requested and observed settings separately. Runtime `modelEvidenceEligible` and `countsAsModelFailure` flags are preserved; standard screening accounting does not promote these results into externally adjudicated model-capability findings. Raw captures and full trial workspaces remain local. This publication verifies retained evidence and counting; it does not claim independent held-out authors, a fresh false-pass/failure audit of every submission, universal correctness, or destination-specific adversarial qualification.
