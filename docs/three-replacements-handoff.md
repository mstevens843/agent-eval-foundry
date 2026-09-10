# Three fresh replacements for newly voided false passes

> **Completed campaign — historical operator instructions.** All three attempts finished. All five finalists now qualify: three at 6/6 reward=0 and two at 5/6. [Final results](../reports/screening/final-results-2026-09-09.md). The launch instructions below preserve the original handoff and do not authorize another run.

Work in `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.
You are the same trial operator who completed the previous campaigns. The user
authorizes exactly three fresh subscription-only Codex attempts, launched together,
with a concurrency cap of six. Preparation is complete; this handoff makes no model calls. All three child slots
verified ready and unclaimed. Publication checks cover 57 documents; 20 focused tests
and one Docker service-grading integration test passed.

## Exact slots and current counts

| Package | Counted failures/trials | Fresh trial | Replaces grading-void trial | Provider |
| --- | --- | --- | --- | --- |
| 19 variant-cache-repair | 4/4 | Trial 8 | Trial 6 | Codex |
| 19 variant-cache-repair | 4/4 | Trial 9 | Trial 7 | Codex |
| 11 snapshot-recovery-repair | 4/5 | Trial 8 | Trial 4 | Codex |

Both cache replacements start together in independent blind workspaces. Run all
three regardless of completion order. No extra attempt is authorized by the cap of six.
The three finished packages receive no more trials: incremental build 6/6, issued
report 6/6, temporal capacity 5/6. Snapshot's Claude Trials 6 and 7 already ran; do
not repeat them. These replacements restore three counted attempts per provider.

The user chose to void **only the three newly discovered false passes**. Keep earlier
documented regrades counted. Preserve each void's original reward 1, diagnostic v3
reward 0, and counted reward null. Never count both a void and its replacement, and
never renumber or overwrite the old trial. A null is not a reward zero.

Read the [audit](../reports/screening/remaining-pass-audit-2026-09-09.md),
[verified diagnostic evidence](../reports/screening/evidence/2026-09-09-remaining-pass-audit.json),
[counting disposition](../reports/screening/evidence/2026-09-09-three-replacement-disposition.json),
and [prepared campaign](../reports/screening/evidence/2026-09-09-three-replacements-preparation.json).

## Verify and launch

```sh
node scripts/run-three-replacements.mjs verify
node scripts/run-three-replacements.mjs run --user-authorized-three-replacements-up-to-six-concurrent
```

Use the normal tool permission mechanism. Authorization for these three attempts is
already supplied. If a tool blocks execution, report its actual reason rather than
mistaking it for an authentication failure or starting a different launcher.

The prepared child controllers are derived from the already-executed cache Trial 7
controller, whose source hash is checked against the previous preparation evidence.
The template changes only task assignment, new trial IDs/paths and replacement
authorization text. Each child's prepare/verify checks actual runtime, package,
assurance, instruction and provider-profile bytes. All reuse the verified runtime
at `.local/round-two-top-five-2026-09-09/frozen-source/`; no live source rebuild or
new executor is involved. Each has a fresh JobStore, dispatch claim and workspace.
The parent and child preparation made zero provider calls.

Do not rerun prepare or invoke a completed old campaign. These are Codex-only slots;
use the existing Codex credential broker. No Claude token setup is required. Never
print credentials or introduce API billing fallback. Preserve the existing Codex
profile, image, network, 2-CPU/2-GiB limits and 10,800-second authoring budget.

Keep the parent alive in the established long-running background execution mode.
Confirm the three solver containers via `docker ps`. Monitor through completion;
do not run unrelated heavy Docker validation alongside them. Solvers receive only
the unchanged public package, not this handoff, prior submissions, audit reports or
private grading fixtures.

## Current grading coverage

After all provider children finish, the parent applies **remaining-pass-coverage-v3**
to every submission. It includes all earlier v1/v2 checker controls, plus the new
valid alternatives and cache metadata negative. It also replays the submitted service
against the added scenarios, including the repaired 304-metadata check.

```text
counted reward = min(original reward,
                     cumulative checker supplement passes ? 1 : 0,
                     additional service coverage passes ? 1 : 0)
```

The parent records original and supplemental results separately. A raw pass alone
is not the final outcome. Checker reasons are diagnostic; judge correctness using
the frozen task contracts. Do not demand identical failure mechanisms or a service
bug when the required checker fails. Do not introduce new requirements mid-campaign.

Campaign output is `.local/three-replacements-2026-09-09/`, including launch records,
logs, checker/service supplements, adjudications and `FINAL.json`. Raw records are
under each `<task>/trial-N/real-campaign-frozen/jobs/real-provider/records/` child.
No automatic retries, extra attempts, provider substitutions or task modifications.
If execution fails, preserve the records and diagnose the claimed slot before doing
anything else. Infrastructure failures are unscored, never reward-zero successes.

## Analysis and publication

Append cache Trial 8 and Trial 9 to
`reports/screening/fourth-five/19-variant-cache-repair.md`, and snapshot Trial 8 to
`reports/screening/third-five/11-snapshot-recovery-repair.md`. Preserve all prior
trial and audit sections. Record the void each fresh trial replaces, provider,
source/package/profile hashes, timing, service/base-checker/supplemental results,
original reward, counted reward and actual code-level failure or pass mechanism.

Publish a new campaign summary and sanitized evidence. Update README, project status,
screening index and publication checks. Keep the audit, disposition and preparation
JSONs immutable; add the new results as follow-up evidence. Report all five finalists:

- Build stays 6/6; issued report stays 6/6; temporal stays 5/6.
- Cache begins at four failures/four counted trials; the two new results give 6/6,
  5/6 or 4/6. It needs at least one new failure to meet ≥5/6.
- Snapshot begins at four failures/five counted trials; its replacement gives 5/6
  or 4/6. It needs the new attempt to fail.

After three completed replacements there will be 54 physical successor attempts,
50 counted trials, three grading voids and one historical infrastructure interruption.
Verify three counted Codex and three counted Claude trials per finalist. A valid
pass remains a pass; document any suspected further coverage issue without silently
voiding it or dispatching another attempt.

Run publication checks, relevant focused tests and `git diff --check`. Do not commit,
push or launch additional trials. Return final scores, void/replacement accounting,
the findings and files updated.
