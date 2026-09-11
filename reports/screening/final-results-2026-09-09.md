# Final screening results: five qualifying task packages

This is the preserved September 9 milestone. See the [September 11 combined results](final-results-2026-09-11.md) for the current qualifying totals.


September 9, 2026. **Three packages achieved 6/6 reward=0; two achieved 5/6. All five meet the reported ≥5/6 target.**

Across the five completed sets, **28 of 30 counted trials received reward=0**. Each package has exactly three counted Codex and three counted Claude trials. No finalist trial remains pending.

## Final standings

The fractions below count agent failures. A reward of zero is a successful difficulty result for the task author; a reward of one is a successful solution by the agent.

| Package and full trial history | Total reward=0 | Codex reward=0 | Claude reward=0 |
| --- | ---: | ---: | ---: |
| [21 — Incremental build](fifth-five/21-incremental-build-repair.md) | **6/6** | 3/3 | 3/3 |
| [25 — Issued report](fifth-five/25-issued-report-repair.md) | **6/6** | 3/3 | 3/3 |
| [19 — Variant cache](fourth-five/19-variant-cache-repair.md) | **6/6** | 3/3 | 3/3 |
| [11 — Snapshot recovery](third-five/11-snapshot-recovery-repair.md) | **5/6** | 3/3 | 2/3 |
| [10 — Temporal capacity](next-five/10-temporal-capacity-repair.md) | **5/6** | 2/3 | 3/3 |

[Machine-readable final results](evidence/2026-09-09-final-results.json) bind this summary to the preserved disposition and final campaign using SHA-256 hashes. `node scripts/verify-publication.mjs` independently derives the counts and checks all five provider balances.

## What the failures demonstrate

Each package requires a service implementation and a checker that judges candidate executions against the public contract. Either deliverable can produce a valid failure.

| Package | Defects established across its trial history |
| --- | --- |
| Incremental build | All six checkers missed publication before compiler issuance. All six service implementations passed their service suites. |
| Issued report | Checker failures included incorrect input interpretation, missed dependency ordering, and rejection of valid recovery after a delivery error. |
| Variant cache | Earlier attempts included service defects and missed invalidation behavior. Later checkers rejected legitimate cross-tier copies; the two latest also accepted stale metadata after a 304 revalidation. |
| Snapshot recovery | Checker failures included input interpretation, rejection of valid intermediate work, and missed numeric-string name corruption. The last attempt rejected a staged archive that was correctly replaced before publication. |
| Temporal capacity | Checkers missed complete source traversal or rejected valid restarted traversal. The final Codex attempt passed both original and expanded coverage. |

Failure mechanisms can differ between attempts; the six-run score measures whether each complete submission satisfies its required deliverables. The two retained reward=1 outcomes are snapshot recovery T7 (Claude) and temporal capacity T7 (Codex). Both survived the expanded audit and remain counted passes.

## Every counted trial

Trial numbers preserve physical history. T1 belongs to the earlier task version and is outside these six-run sets. Gaps below refer to preserved grading voids, described next.

| Package | Counted Codex trials and rewards | Counted Claude trials and rewards |
| --- | --- | --- |
| 21 — Incremental build | T2=0, T3=0, T4=0 | T5=0, T6=0, T7=0 |
| 25 — Issued report | T5=0, T6=0, T7=0 | T2=0, T3=0, T4=0 |
| 19 — Variant cache | T5=0, T8=0, T9=0 | T2=0, T3=0, T4=0 |
| 11 — Snapshot recovery | T2=0, T3=0, T8=0 | T5=0, T6=0, T7=1 |
| 10 — Temporal capacity | T5=0, T6=0, T7=1 | T2=0, T3=0, T4=0 |

## Grading corrections and excluded attempts

The agent-visible task packages and contracts stayed unchanged during repeated finalist trials. Audits added private coverage for existing obligations. Original grades are preserved; the final **counted reward** incorporates the documented grading corrections. Earlier retained submissions received the same applicable cumulative controls. New attempts received the original grade, cumulative checker coverage, and the additional service replay where required.

Three later-discovered false passes were excluded by an explicit author decision and replaced with fresh blind trials using the same provider:

| Package | Excluded attempt | Original / diagnostic / counted reward | Fresh counted attempt |
| --- | --- | --- | --- |
| Variant cache | T6 Codex | 1 / 0 / null | T8 Codex, reward=0 |
| Variant cache | T7 Codex | 1 / 0 / null | T9 Codex, reward=0 |
| Snapshot recovery | T4 Codex | 1 / 0 / null | T8 Codex, reward=0 |

Those voids are neither passes nor failures in the 30-trial result. Earlier documented regrades remain counted. The choice to exclude these three is recorded as the author's disposition, rather than an additional benchmark requirement.

The cumulative audit reproduced **24 retained submissions**, **50/50 private-oracle classifications**, and **29 service replays**, checking 20,836 retained files before and after without drift. The three fresh attempts added 2,729 verified files and all completed without infrastructure errors. All three services passed their original scenarios and additional replay coverage; their reward=0 outcomes came from required-checker defects.

- [Initial coverage audit](final-six-pass-audit-2026-09-09.md)
- [Second coverage audit](post-final-pass-audit-2026-09-09.md)
- [Remaining-pass audit and contract basis](remaining-pass-audit-2026-09-09.md)
- [Preserved counting disposition](evidence/2026-09-09-three-replacement-disposition.json)
- [Final fresh trials and forensic analysis](three-replacements-2026-09-09.md)

## Program totals

These totals describe different populations; the finalist results are a subset of the successor campaign.

| Population | Count |
| --- | ---: |
| Maintained task packages | 25 |
| Original selected screening records, one per package | 25 |
| Successor execution attempts | 54 |
| Completed successor raw grades | 53 |
| Counted successor trials after exclusions | 50 |
| Counted successor reward=0 / reward=1 | 28 / 22 |
| Preserved successor grading voids | 3 |
| Historical successor infrastructure interruption | 1 |
| Finalist counted trials, included in those 50 | **30** |
| Finalist reward=0 / reward=1 | **28 / 2** |
| Finalists at 6/6 / at 5/6 | **3 / 2** |

The published screening campaign contains **79 entries: 25 original selected records plus 54 successor attempts**. Earlier excluded setup/capture attempts are documented in the original campaign and are outside this defined population. This is not a count of every historical model call or the separate Outbox project.

## Scope and reproduction

These five packages meet the reported standard-trial screening target of at least five failures from six trials, with three trials per provider. Final destination review and adversarial qualification are separate. The records distinguish requested model settings from identities actually exposed by the provider CLI.

The [screening index](README.md) links all 25 task histories. The [project status](../../docs/project-status.md) links their maintained source. [Testing instructions](../../docs/testing.md) cover portable evidence verification and runtime checks. Raw captures, frozen executors, and image archives are intentionally private; published evidence includes their identities and verification results.
