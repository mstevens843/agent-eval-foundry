# First trials on the five hardened 3.0.0 successors

Prepared September 10, 2026. **Five packages, one attempt each, all five concurrently:
three Codex and two Claude. No model calls have been made by preparation.**

These are new versions of previously screened tasks. Record each as **Trial 3 —
hardened successor 3.0.0, attempt 1** in its original analysis document. Earlier
version results remain historical evidence; this starts measurement on the new
bytes. Route's interrupted Trial 2 and its completed retry both remain preserved.

| Task | Provider | Original analysis document |
|---|---|---|
| 14 — Route policy | Claude | [14-route-policy-repair.md](../reports/screening/third-five/14-route-policy-repair.md) |
| 03 — Browser replay | Claude | [03-browser-replay-repair.md](../reports/screening/original-five/03-browser-replay-repair.md) |
| 18 — Recurring calendar | Codex | [18-recurring-calendar-repair.md](../reports/screening/fourth-five/18-recurring-calendar-repair.md) |
| 20 — Workflow authority | Codex | [20-workflow-authority-repair.md](../reports/screening/fourth-five/20-workflow-authority-repair.md) |
| 04 — Delegated budget | Codex | [04-delegated-budget-repair.md](../reports/screening/original-five/04-delegated-budget-repair.md) |

Requested profiles are `openai/gpt-5.6-sol`, `xhigh`, through Codex, and
`anthropic/claude-opus-5`, `max`, through Claude Code. Record the observed model
identity from each capture separately from the request. Subscription billing only,
with the existing credential broker. Each attempt has a 10,800-second maximum;
completion ends the attempt immediately. There are no automatic retries, model
substitutions, API billing fallbacks or additional cheat/model calls in this campaign.

## Prepared execution and evidence

Repository: `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

The [preparation manifest](../reports/screening/evidence/2026-09-10-hardened-next-five-trial-one-preparation.json)
records exact package/profile digests, source and dependency verification files,
controller hash and frozen readiness. The
[hardening report](../reports/screening/next-five-hardening-2026-09-10.md) and
[coverage map](../reports/screening/next-five-hardening-coverage-2026-09-10.md)
document validation. All five oracle/nop pairs, 73 checker classifications,
23 checker mutations, 45 native integrity controls and 110 static checks passed.

Campaign directory: `.local/hardened-next-five-trial-one-2026-09-10/`.
Execution records: its `real-campaign-frozen/` subdirectory.
`READY.json` already exists there; **do not rerun prepare or rebuild packages**.

The controller is adapted from the same operator's completed September 9 next-five
campaign, retaining its signed JobStore reservations, subscription broker,
concurrent dispatch and capture logic. `previous-controller.mjs`, `controller.diff`,
`provenance.json` and `build.log` make the changes reviewable. This campaign has its
own `frozen-source/`, copied and built from the current runtime, including the new
full-scenario checker coverage and immutable-input protections. Yesterday's runtime
predates those changes and must not be substituted.

The verification script independently reads and hashes the actual source, bundle,
dependency and package bytes. It does not accept the manifests alone as evidence.
It verified 882 source/config files and 2,088 dependency entries. The controller
also checks the pinned bundle before importing it. Source digest:
`153bdf9d0675e7d4ca59a7fe9b21430e887d24e889db7bbfb134e5dc4d7fa41d`.
Later edits to the live repository are independent of this frozen runtime; do not
compare the launch identity to the live tree or rebuild it because documentation changed.

Foundry exports remain under `.local/next-five-hardening-2026-09-10/`:

| Task | Export suffix |
|---|---|
| Route | `release-four/route-policy-repair/export` |
| Browser | `release-browser/browser-replay-repair/export` |
| Calendar | `release-calendar-shapes/recurring-calendar-repair/export` |
| Workflow | `release-four/workflow-authority-repair/export` |
| Budget | `release-four/delegated-budget-repair/export` |

The controller selects these exact exports from its frozen evidence. Do not use
the September 9 packages, the earlier September 10 implementation-only exports,
or supplemental controls belonging to the previous five finalists.

## Verify once, then launch once

Use the existing login-shell credential setup. Claude's token and the Codex auth
file were present at preparation; no token needs to be pasted or printed.

This command is read-only and makes no provider calls. It works from any directory:

```sh
node "/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/scripts/verify-hardened-next-five-trials.mjs"
```

If it reports an existing dispatch claim, inspect and monitor that campaign instead
of launching a duplicate. Otherwise, check current Docker activity and memory,
then run through the normal permission mechanism in a long-running shell session:

```sh
zsh -lc 'node "/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/hardened-next-five-trial-one-2026-09-10/campaign.mjs" run --user-authorized-five-concurrent-v3-trial-1'
```

The user has authorized these five attempts. No further conversational permission
or whole-batch validation is needed. Any actual tool permission denial still needs
resolution through that tool's normal permission system.

At preparation, Docker had 10 CPUs and approximately 15.6 GiB available memory,
the host reported 54% free system memory, disk had approximately 26 GiB free,
and no trial containers were active. The pinned authoring image was present, with
Codex CLI 0.153.2, Claude Code 2.1.263 and Playwright. These are observations,
not promises about the host at launch. Avoid another heavy campaign alongside this
one. Keep the controller alive and monitor it; a previous campaign lost its parent
process under memory pressure. Report actual container launches and reservation
timestamps promptly, then follow all five through completion. If interrupted,
preserve the jobs and containers and inspect their state before any recovery.
An incomplete attempt is an infrastructure outcome, never an assumed reward zero.

## Grade and publish

Each solver gets a fresh, blind workspace containing only its public task surface.
Keep analysis documents, prior submissions, private tests and oracles outside the
solver workspace. The frozen runtime grades both required deliverables with the
current hardening controls. A service pass alone does not determine total reward.
Required-checker errors can be valid reward-zero outcomes; reason text is diagnostic.

Inspect the submitted code and relevant traces for each result. Record reward,
service totals, checker totals, failed controls, the specific contract obligation,
whether the service/checker/both failed, completion claims and meaningful self-testing.
Accept permitted alternative solutions. Apply the task contract and benchmark
rubric; do not invent implementation requirements. If a grader discrepancy appears,
preserve the original grade and document a reproducer and the affected obligation.
Do not silently alter frozen graders, overwrite results or launch another attempt.

Append the dated Trial 3 section to **each of the five original analysis documents**
above, leaving earlier sections intact. Include duration, requested/observed model,
package/profile/runtime identities, artifact locations and manifest verification.
Retain raw captures locally and publish sanitized evidence without credentials.

Publish:

- `reports/screening/hardened-next-five-trial-one-2026-09-10.md`
- `reports/screening/evidence/2026-09-10-hardened-next-five-trial-one.json`

Update the screening index, README and project status with measured outcomes,
preserving the existing five finalists and their scores. Register new artifacts in
`scripts/verify-publication.mjs`, run `node scripts/verify-publication.mjs` and
`git diff --check`, and report the result table with analysis-backed next steps.
Do not commit, push or start further trials.
