# Finish the five remaining attempts with cumulative grading

Work in `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.
You are the trial operator. The user authorizes exactly the five fresh attempts below,
subscription-only, with a concurrency cap of **six**. **Launch all five together.**
There are four packages but five attempts because snapshot has two remaining Claude
slots. Run both snapshot trials independently and concurrently, even if one finishes
with a pass before the other. Do not wait for Trial 6 before launching Trial 7.

| Task | Current effective failures/scored | Fresh trial(s) | Provider | Final target |
| --- | --- | --- | --- | --- |
| 19 variant-cache-repair | 4/5 | Trial 7 | Codex | New attempt must fail for 5/6 |
| 25 issued-report-repair | 5/5 | Trial 7 | Codex | Either outcome gives at least 5/6 |
| 10 temporal-capacity-repair | 5/5 | Trial 7 | Codex | Either outcome gives at least 5/6 |
| 11 snapshot-recovery-repair | 3/4 | Trials 6 and 7 | Claude, both | Both must fail for 5/6 |

Incremental build (21) already has six original reward-zero results and gets no further
attempt. A completed set has exactly three Codex and three Claude attempts. Trial 1
belongs to the older task version and stays outside this set. Different legitimate
failure mechanisms count, including failures confined to the required checker.

Read the [post-final audit](../reports/screening/post-final-pass-audit-2026-09-09.md),
[regrade evidence](../reports/screening/evidence/2026-09-09-post-final-pass-audit.json),
and [prepared schedule](../reports/screening/evidence/2026-09-09-post-final-five-preparation.json).
The six newly corrected passes are completed, regraded attempts, not null trials or
replacement slots. Keep their original and effective rewards visible.

## Already prepared: verify, then launch

The new parent runner is `scripts/run-post-final-five.mjs`. Its five existing child
controllers and their `READY.json` files were verified; all five slots were unclaimed.
It reuses the frozen runtime you previously used at
`.local/round-two-top-five-2026-09-09/frozen-source/`, and the same immutable exports,
public instructions, assigned provider profiles, 2-CPU/2-GiB limits, and 10,800-second
budgets. No live source build, new executor, new package export or credential setup is
needed. Only the parent orchestration and cumulative private grading are new.

Use these commands from the repository root through the normal tool permission path:

```sh
node scripts/run-post-final-five.mjs verify
node scripts/run-post-final-five.mjs run --user-authorized-five-remaining-up-to-six-concurrent
```

`verify` checks the actual controller/runtime/package/profile bytes and grading-policy
hashes; it makes zero provider calls. Preparation is already complete. Do not rerun
`prepare`, restart `run-final-six.mjs` or `run-final-six-expanded.mjs`, or regenerate
the frozen child controllers. Those parent runners belong to the completed campaign
and use older scheduling/grading logic.

Claude uses the existing inherited `CLAUDE_CODE_OAUTH_TOKEN` from the established
Keychain/login-shell setup. Codex uses the existing credential broker. Never print a
token, pass one as a command argument, or rotate/recreate working authentication.
If the variable is missing, use the established normal login environment. Authorization
for the listed trials is already given; tool permission denials still go through the
normal permission mechanism. Report the actual denial once rather than treating it as
a token failure or starting alternative launchers.

Keep the parent alive through completion in a background execution mode suitable for
the long-running campaign. Confirm the five actual solver containers with `docker ps`
after dispatch and report the package/provider mapping. A cap of six does not authorize
a sixth extra attempt. Monitor memory and job health; do not silently change profiles,
providers or concurrency, and do not run unrelated heavy Docker validation alongside it.

The parent starts all five child processes before awaiting their results. Each child has
an isolated workspace, JobStore, credential staging, dispatch claim and raw record.
Both snapshot attempts must be blind to one another and all previous attempts. Operator
reports, regrade evidence, prior submissions and private control fixtures never enter
the solver workspace.

## Cumulative hardened grading is mandatory for this campaign

For **every one of the five submissions**, the parent runs the original package grade
and then `scripts/grade-post-final-supplement.mjs`. That grader applies
`post-final-coverage-v2`, including the earlier `final-six-coverage-v1` controls where
applicable. It verifies the pinned policy and fixture hashes. It runs after provider
children exit, so its extra Docker workload does not compete with five solver containers.

Use:

```text
effective reward = min(original recorded reward, cumulative supplement pass ? 1 : 0)
```

Retain the original raw grade and publish the supplemental result separately. A base
reward of 1 is not a final pass until cumulative grading passes. The same controls
already graded all retained attempts; do not drop them or add requirements mid-campaign.
Use the published benchmark/task contracts, not additional standards such as requiring
identical bugs, service-level failure, or six failures when the agreed threshold is 5/6.

Campaign output: `.local/post-final-five-2026-09-09/`, including logs, launch records,
supplemental grades, per-attempt adjudications, and `FINAL.json`.
Raw provider records remain in their previously prepared isolated directories:

```text
.local/final-six-2026-09-09/variant-cache-repair/trial-7/
.local/final-six-2026-09-09/issued-report-repair/trial-7/
.local/final-six-2026-09-09/temporal-capacity-repair/trial-7/
.local/final-six-2026-09-09/snapshot-recovery-repair/trial-6/
.local/final-six-2026-09-09/snapshot-recovery-repair/trial-7/
```

Below each directory, raw records are at
`real-campaign-frozen/jobs/real-provider/records/<task-id>-attempt-1/`.
The repeated local `attempt-1` names are separate JobStores, not duplicate global trials.

No automatic retries, substitutions, API billing fallback or extra attempts. If a
controller/capture/grading operation fails, inspect existing claims, processes,
containers and records before doing anything else. Preserve partial evidence, recover
completed records where possible, and mark a genuinely unfinished attempt as unscored.
Never relaunch a claimed slot or turn infrastructure failure into reward zero.

## Analysis and repository publication

After all five attempts are accounted for, inspect their actual service and checker
submissions and failed cells. Explain both original-bank and supplemental outcomes.
Verify concrete recurrence claims in code. If a passing submission has a suspected
coverage gap, reproduce it against its unchanged contract before claiming another
failure; retain the raw result and document any consistent regrade separately.

Append the correctly numbered trial sections to these original documents:

- 19 Trial 7: `reports/screening/fourth-five/19-variant-cache-repair.md`
- 25 Trial 7: `reports/screening/fifth-five/25-issued-report-repair.md`
- 10 Trial 7: `reports/screening/next-five/10-temporal-capacity-repair.md`
- 11 Trials 6 and 7: `reports/screening/third-five/11-snapshot-recovery-repair.md`

For each, include provider, hashes, duration, service results, original checker results,
cumulative supplemental results, original/effective rewards, the actual failure or
pass mechanism, relevant self-testing/completion claims, and updated provider counts.
Preserve all prior trial sections and audit histories.

Publish a campaign summary and sanitized evidence JSON. Update README,
`docs/project-status.md`, `reports/screening/README.md`, the publication inventory and
relevant validation assertions. Keep preparation and historical campaign evidence
unchanged; add the new outcomes as a follow-up. Final front-facing standings must show
all five finalists, including build's unchanged 6/6, and distinguish original zero
rewards from documented regrades. For completed sets report exact failures out of six,
three-per-provider counts, and whether ≥5/6 was met. If infrastructure leaves a slot
unresolved, say so explicitly.

Run `node scripts/verify-publication.mjs`, relevant focused tests and `git diff --check`.
No commits, pushes or additional model attempts. Report the completed final standings
and the files updated.
