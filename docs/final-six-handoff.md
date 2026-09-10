# Finish the six-attempt screening sets

> **Later audit:** The [post-final pass audit](../reports/screening/post-final-pass-audit-2026-09-09.md)
> reopened all four stopped finalists. This is the historical campaign handoff;
> future attempts must add `post-final-coverage-v2` cumulative grading.
> No new attempt was launched by that audit.

**Completed campaign:** incremental build met the target at **6/6** (3 Codex + 3 Claude). The other four finalists stopped below 5/6. [Final results](../reports/screening/final-six-2026-09-09.md). The preparation and launch instructions below are historical; no trials remain to dispatch under this campaign.

Work in `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.
The user authorizes the remaining attempts described below. This handoff is for the
operator only; it must never enter a solver workspace.

Read [the audit](../reports/screening/final-six-pass-audit-2026-09-09.md) and
[preparation evidence](../reports/screening/evidence/2026-09-09-final-six-preparation.json).
The audit reproduced two false passes, regraded every retained submission for the affected
tasks, and reopened temporal capacity and snapshot recovery. Original raw rewards remain
intact; use the separately published `final-six-coverage-v1` effective rewards for the
continuation decisions. Do not restart the task versions or rewrite public instructions.

| Package | Failures/scored | Remaining provider | Maximum fresh attempts | Stop rule |
| --- | --- | --- | --- | --- |
| 21 incremental-build-repair | 4/4 | Claude | 2 (Trials 6–7) | Run both regardless of the first result |
| 19 variant-cache-repair | 3/4 | Codex | 2 (Trials 6–7) | Stop after a scored pass |
| 25 issued-report-repair | 3/4 | Codex | 2 (Trials 6–7) | Stop after a scored pass |
| 10 temporal-capacity-repair | 3/4 | Codex | 2 (Trials 6–7) | Stop after a scored pass |
| 11 snapshot-recovery-repair | 2/3 | Claude | 3 (Trials 5–7) | Stop after a scored pass |

The target is at least five legitimate failures in six scored attempts, with exactly
three Claude and three Codex for a completed set. Trial 1 was the old task version and
does not enter this six-run set. A complete set with five or six failures meets the
user-reported numerical target. A package with two passes cannot reach it. No identical-bug
requirement is imposed. Snapshot has never had its opposite-provider attempt, so three
Claude slots remain; all other assignments stay the same as Trial 5.

## Ready to run

The orchestration is already prepared. Do not rerun `prepare`, regenerate exports, build
the live repository, or create another executor. The eleven one-slot controllers were
generated from the controller you successfully used for Trial 5. They import the same
frozen runtime at `.local/round-two-top-five-2026-09-09/frozen-source/`, verifying its
actual bytes and source digest before dispatch. The package exports, public instruction
hashes, exact assigned profiles, assurance files, prior completion/grade identities and
private coverage policy are pinned in the preparation evidence. The live root is used
only for those fixed artifacts, not as a source build. No provider calls have been made
by preparation.

The user amended concurrency from three to **six** after the original controller
started three attempts. Preserve the running children and the frozen original readiness.
Use the prepared expansion controller through the normal tool permission path:

```sh
node scripts/run-final-six-expanded.mjs verify
node scripts/run-final-six-expanded.mjs run --user-authorized-six-concurrent
```

The expansion verifies the original controller and all eleven frozen slots, identifies
the one active Node queue manager, pauses only that manager with SIGSTOP, and adopts
its running child controllers. Existing Docker trials and their credential brokers keep
running. It then fills six slots: build Trials 6 and 7 (both Claude), cache Trial 6
(Codex), issued-report Trial 6 (Codex), temporal Trial 6 (Codex), and snapshot Trial 5
(Claude). Both build trials are unconditional, so running them together does not defeat
early stopping. The other four packages still run their own attempts sequentially.
The total authorization stays at eleven attempts, including the three already launched.

Keep the expansion controller alive through completion. Its adoption record and final
summary are in `.local/final-six-2026-09-09/expanded/`; individual raw records and
`ADJUDICATED.json` remain in their original package/trial directories. The original
`READY.json`, runner, child controllers and evidence hashes remain unchanged. Do not
restart or resume the superseded original queue, which would compete for those same
slots. After the expansion finishes and all children have exited, terminate only the
superseded queue-manager PID recorded in `expanded/ADOPTION.json`; do not target a
child controller or Docker container. If expansion reports dispatch uncertainty, retain
the existing evidence and investigate without rerunning a claimed slot.

Each trial retains the pinned 2-CPU/2-GiB profile and 10,800-second budget. This
concurrency change makes no task, profile, grading or provider-assignment changes.

Claude uses the existing inherited `CLAUDE_CODE_OAUTH_TOKEN` from the established Keychain
login setup. Codex uses the same existing credential staging/broker as Trial 5. Do not
print tokens or put them in command arguments. If the Claude variable is absent, use a
normal login shell with the existing setup; do not rotate or recreate working credentials.
Use subscription-only billing, no API fallback, no automatic retries. Actual tool denials
must be reported through the normal permission system; do not create alternative launchers
to bypass them. User authorization for these specified attempts is already given.

Campaign root: `.local/final-six-2026-09-09/`. Each package/trial has its own controller,
`READY.json`, dispatch claim and JobStore; a local `attempt-1` ID is unique to that trial's
directory. The original parent and its expansion each have an exclusive dispatch claim. Do not relaunch after a claim
exists. Inspect the existing process, containers and records first if execution is
interrupted. Incomplete captures, controller kills and grading infrastructure errors are
unscored; preserve them and report the open slot rather than guessing a reward or retrying.

## Grading, analysis and publication

The base runner grades both the service and required checker. For 10 and 11, the parent
also invokes `scripts/grade-final-six-supplement.mjs` on the retained submitted checker in
an isolated, network-disabled Docker container. The effective reward is the conjunction
of the original reward and the supplemental pass. That exact revision was already applied
to all seven prior submissions for these tasks. The added fixtures and all previous
submissions stay private from solvers. Every attempt is fresh and blind to earlier trials.
Do not change the frozen task exports, profile, budgets or grading controls during this
campaign. Record both the original and effective rewards; never overwrite raw grades.

The expansion verifies completion manifests and writes `ADJUDICATED.json` for each completed
slot, per-package outcomes, then `expanded/FINAL.json`. Analyze the actual submitted code and failing
cells before making recurrence claims. Audit scored passes for concrete contract violations
or grader defects; finite tests are not proof of universal correctness. If a new coverage
defect is demonstrated, preserve the raw pass and publish a consistent regrade before
declaring elimination. Do not call a possible defect a failure without evidence, add public
requirements, require service failure when the checker is a required deliverable, or count
infrastructure failure toward 5/6.

Append each attempt to its original analysis document, with provider, trial number,
export/profile hashes, duration, service/checker totals, raw/effective reward, exact defect,
self-testing, completion claim, recurrence evidence and updated provider counts:

- 21: `reports/screening/fifth-five/21-incremental-build-repair.md`
- 19: `reports/screening/fourth-five/19-variant-cache-repair.md`
- 25: `reports/screening/fifth-five/25-issued-report-repair.md`
- 10: `reports/screening/next-five/10-temporal-capacity-repair.md`
- 11: `reports/screening/third-five/11-snapshot-recovery-repair.md`

Publish a campaign summary and sanitized evidence JSON. Update the screening README,
project status, publication inventory and validation tests. Preserve every previous trial
and the separate regrade history. Final tables must distinguish original recorded rewards
from corrected grading, report three-per-provider counts for completed sets, and show each
task as meeting 5/6, unable to reach 5/6, or unresolved because of infrastructure. Passing
the numerical screening target does not itself claim all final rubric/cheat qualification
requirements are complete. Run publication checks and `git diff --check`. Make no commits,
pushes or additional model calls beyond the scheduled maximum of eleven.
