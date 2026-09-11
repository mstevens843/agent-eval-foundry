# Round 5 and conditional continuation to six counted trials

September 11, 2026. Round 5 (historical Trial 7) launched five fresh concurrent
attempts on the unchanged public 3.0.0 contract, same providers as Round 4.
The user then extended authorization: continue each task after a clean
reward-zero result until it has **six counted trials, three Codex and three
Claude**, stopping any task immediately on its next reward-one result. **Four
of five tasks reached a complete, balanced six-trial record (all 6/6
reward-zero); one task stopped early on a pass, exactly as instructed.** No
infrastructure interruptions occurred across all eleven new attempts this
round (5 from Round 5, 6 from the continuation).

## Results

| Package | Final tally | Providers | Stop reason |
| --- | --- | --- | --- |
| [14 — Route policy](third-five/14-route-policy-repair.md) | 5 scored, 3 failures | 2 Codex + 3 Claude | **Stopped on pass** (T7, reward 1) — 1 slot deliberately unused |
| [03 — Browser replay](original-five/03-browser-replay-repair.md) | 6 scored, 6 failures | 3 Codex + 3 Claude | Six counted — fills the previously-missing counted Claude slot |
| [18 — Recurring calendar](fourth-five/18-recurring-calendar-repair.md) | 6 scored, 6 failures | 3 Codex + 3 Claude | Six counted |
| [20 — Workflow authority](fourth-five/20-workflow-authority-repair.md) | 6 scored, 6 failures | 3 Codex + 3 Claude | Six counted |
| [04 — Delegated budget](original-five/04-delegated-budget-repair.md) | 6 scored, 6 failures | 3 Codex + 3 Claude | Six counted |

Route policy stopped when its second counted pass arrived, following the explicit stop-on-pass instruction. Its 3-failure/5-scored tally can reach at most 4/6 with the unused slot, so this version cannot meet 5/6. Both Codex passes remain counted; the [T7 audit](route-trial-seven-pass-audit-2026-09-11.md) found no additional defect.

## Execution

**Round 5** (`.local/hardened-next-five-trial-five-2026-09-11/`, source digest
`597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`, a
byte-identical copy of the completed Round 4 runtime) dispatched five
attempts within a **250ms spread** (2026-09-11T08:20:44.884Z–08:20:45.134Z).
Browser replay's package moved to **coverage-v3** this round (adds a
permitted existing-dialog recovery case the coverage-v2 bank omitted; public
requirements unchanged); the other four packages stayed on coverage-v2,
byte-identical to Round 4.

**The continuation** (`.local/hardened-six-continuation-2026-09-11/`, launched
via `scripts/run-hardened-six-continuation.mjs`) adopted all five Round 5
results without rerunning them, then conditionally launched follow-up
attempts — at most five concurrent, one per task, waiting for each task's
result before deciding its next attempt. It launched **six of seven authorized continuation slots**. Route's remaining slot was unused because its adopted Round 5 result was a pass. All continuation attempts reused the same Round 5 frozen
runtime; none rebuilt anything.

## The recurring `"__proto__"` shape-gate bug

Of the ten checker-required, reward-zero attempts across Round 5 and the
continuation, the `"__proto__"`-into-plain-object shape-gate bug (a checker
storing verdicts in a plain object via bracket assignment, which cannot
represent the literal opaque token `"__proto__"` as an own property) appears
in: route policy — n/a (passed); recurring calendar (both T7 and T8);
workflow authority (both T7 and T8); delegated budget (both T7 and T8); and
browser replay's T10 (Claude). Browser replay's three Codex attempts (T7, T8,
T9) instead each produced a real, complete per-candidate score that
incorrectly rejected the `reference`/`alternative` baselines — a genuine
content-level defect, not a shape crash. Every affected checker.mjs was read
directly and independently confirmed against its own package's
`checker-process.log` and `cases.json` before being reported; none of these
findings were assumed from a prior round's pattern.

## Browser replay's missing Claude slot — resolved

Browser replay's counted history previously had a gap: Round 4/historical
Trial 6's Codex attempt was excluded from counting after an independent audit
found its saved checker rejected a valid existing-dialog completion under an
augmented bank (original reward 1, diagnostic regrade 0, counted reward
**null** — preserved as historical record, unchanged by this round), and a
separate, earlier Round 3/Trial 5 Claude attempt remains infrastructure-
interrupted and unscored (its own standalone retry campaign remains prepared,
verified, and deliberately deferred — not launched here or at any point this
session). This round's four fresh, independently-authored attempts (T7-T9 on
Codex, T10 on Claude) are new, separately-counted results. T10 specifically
fills the package's previously-missing counted Claude slot, bringing Browser
replay to a complete 3 Codex + 3 Claude, six-counted record.

## Publication infrastructure

The 512 MiB `EVIDENCE_PUBLICATION_BUDGET_BYTES` budget and gzip
`process.log` compression held cleanly for all eleven new attempts. Every
completion manifest referenced in this report was independently re-verified
via `verifyEvidence()` during this analysis — no tampering, no infrastructure
error, on any attempt.

## Evidence and publication

[Sanitized evidence](evidence/2026-09-11-hardened-six-continuation.json)
records every new trial from Round 5 and the continuation, including exact
package/profile identities, checker-finding detail per attempt, durations and
usage. All five original analysis documents linked above contain a dated
Round 5 / continuation section; their full Trial 1–6/audit/coverage-v2/
coverage-v3/browser-runtime-reliability history remains intact.

Raw records remain under `.local/hardened-next-five-trial-five-2026-09-11/`
and `.local/hardened-six-continuation-2026-09-11/`. Runtime records,
submissions and package exports were not changed. The deferred standalone
Browser/Claude retry campaign was not launched.

The campaign made 11 model calls: five Round 5 attempts and six continuation attempts. Seven continuation slots were authorized; the remaining Route slot was never dispatched. Documentation and verification added no model calls. Requested settings are separate from observable CLI metadata; CLI
price estimates are not subscription charges. The five existing finalists
(incremental-build-repair, issued-report-repair, variant-cache-repair,
snapshot-recovery-repair, temporal-capacity-repair) and their standings are
unaffected by this campaign.
