# Nine qualifying tasks: seven at 6/6, two at 5/6

September 11, 2026. **The Foundry has produced nine tasks meeting the ≥5/6 reward-zero target from a portfolio of 25 screened packages.** Four new 6/6 results join the original five finalists.

## Completed results

| Task and full trial history | Reward=0 / counted trials | Codex reward=0 | Claude reward=0 |
| --- | ---: | ---: | ---: |
| [03 — Browser replay](../../reports/screening/original-five/03-browser-replay-repair.md) | **6/6** | 3/3 | 3/3 |
| [04 — Delegated budget](../../reports/screening/original-five/04-delegated-budget-repair.md) | **6/6** | 3/3 | 3/3 |
| [18 — Recurring calendar](../../reports/screening/fourth-five/18-recurring-calendar-repair.md) | **6/6** | 3/3 | 3/3 |
| [19 — Variant cache](../../reports/screening/fourth-five/19-variant-cache-repair.md) | **6/6** | 3/3 | 3/3 |
| [20 — Workflow authority](../../reports/screening/fourth-five/20-workflow-authority-repair.md) | **6/6** | 3/3 | 3/3 |
| [21 — Incremental build](../../reports/screening/fifth-five/21-incremental-build-repair.md) | **6/6** | 3/3 | 3/3 |
| [25 — Issued report](../../reports/screening/fifth-five/25-issued-report-repair.md) | **6/6** | 3/3 | 3/3 |
| [10 — Temporal capacity](../../reports/screening/next-five/10-temporal-capacity-repair.md) | **5/6** | 2/3 | 3/3 |
| [11 — Snapshot recovery](../../reports/screening/third-five/11-snapshot-recovery-repair.md) | **5/6** | 3/3 | 2/3 |

**54 counted trials, 52 reward=0 and two reward=1; 27 trials per provider.** Each row is a complete six-trial set with three Codex and three Claude attempts. Reward=0 is a failure of a required task deliverable. A correct service paired with an incorrect required checker receives reward=0.

The [machine-readable record](evidence/2026-09-11-final-results.json) lists every counted finalist trial, its provider and reward, excluded attempts, and hashed source reports. The publication check recomputes the totals from the historical ledgers and completed campaign records.

## What the four new tasks demonstrate

| Task | Required-checker failures observed across its trial set |
| --- | --- |
| Browser replay | Missing or wrapped completion reports, incorrect rejection of permitted recovery and repeated operations, and omitted verdicts for a valid opaque token. |
| Recurring calendar | Rejection of correctly acknowledged duplicate updates and permitted revision histories; omitted opaque-token verdicts on other attempts. |
| Workflow authority | Rejection of legal repeat dispatch and recovery, missing required output structure, and omitted opaque-token verdicts. The first host-response bug was corrected and distinguished from an independently reproduced checker defect. |
| Delegated budget | Invented job-ID fields, incorrect scenario-cell parsing and legal-job associations, and omitted opaque-token verdicts. |

Their services passed the applicable service suites. The failures above concern the required checker, whose contract includes accepting valid executions, rejecting invalid ones, and returning a verdict for every supplied token. Different tasks sometimes expose the same JavaScript dictionary mistake (`__proto__`); nine qualifying tasks do not imply nine unrelated failure mechanisms.

## Counting and corrections

The target used here is at least five failures in six counted trials, balanced three per provider. Public contracts remained fixed within each repeated set. Private grading coverage changed where audits found omissions or a host bug; package digests and the reason for each change are retained. Whole-package byte identity is claimed only for attempts that actually used the same export.

Original rewards are never overwritten. Earlier agreed regrades remain counted according to their published dispositions. A grading void has counted reward null and contributes neither a failure nor a pass. Infrastructure-interrupted attempts also remain unscored. Fresh blind attempts fill the missing slots using the required provider.

For the new group, Browser T3 is a documented counted regrade, T5 is an unscored infrastructure interruption, and T6 is a grading void. Its six counted trials are T3, T4 and T10 on Claude, and T7, T8 and T9 on Codex. Calendar, Workflow and Budget count T3–T8, the first three on Codex and the next three on Claude. Historical trial numbers include earlier package versions and excluded attempts; they are not the six-slot counter.

Calendar and Budget's first 3.0.0 attempts completed authoring and grading before evidence publication exceeded a storage cap. Recovery verified the saved evidence against backups and published it without rerunning either model. Their completed checker failures remain counted.

The first five finalists' three grading voids remain excluded as recorded in the [September 9 results](final-results-2026-09-09.md). Their qualifying scores are unchanged.

## Latest campaign and retained passes

[Round 5 and the continuation](hardened-six-continuation-2026-09-11.md) executed **11 new attempts: five initial and six continuation attempts**. Ten returned reward=0 and Route returned reward=1. Seven continuation slots were authorized; one Route slot was unused. There were no infrastructure interruptions in these 11 attempts. Independent publication verification rechecked all 11 completion manifests, covering 13,377 files.

Across the whole new 3.0.0 group, 31 physical attempts produced 29 counted results, one grading void and one infrastructure interruption. The four qualifying sets account for 24 counted failures. Route accounts for the remaining five results: three failures and two retained passes.

Route policy stopped at **3/5 failures** after its second Codex pass. The last unused slot could only raise that to 4/6. Its [T7 pass audit](route-trial-seven-pass-audit-2026-09-11.md) found no additional defect across 320 service configurations and 682 checker classifications. Route is excluded from the nine qualifying tasks.

## Inspect or reproduce

Start with a task's history above for the instructions, submitted-code analysis, service/checker split and each dated trial. The [latest campaign evidence](evidence/2026-09-11-hardened-six-continuation.json) records completion hashes, package/profile identities and per-attempt findings. The [counting ledger](evidence/2026-09-11-hardened-six-counting-ledger.json) preserves the earlier dispositions used by the continuation.

Run `node scripts/verify-publication.mjs` to verify portable accounting and links without model credentials. See the [testing guide](../../docs/testing.md) for source, Docker and recipient checks. Raw captures and frozen execution archives remain local; public evidence is sanitized. These results establish the reported screening target; destination-specific review and adversarial qualification remain separately documented.
