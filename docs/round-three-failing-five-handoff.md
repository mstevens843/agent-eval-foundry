# Trial 3: repeat the five Trial 2 zeroes

**Completed campaign; retained historical handoff.** See the [Trial 3 results](../reports/screening/round-three-failing-five-2026-09-09.md).
The next authorized preparation is the [Trial 4 handoff](round-four-failing-five-handoff.md),
which uses the subsequently clarified 5-of-6 acceptance threshold. Do not relaunch
this historical campaign.

Prepared on September 9, 2026. **All five are ready for one fresh exploratory
attempt each, launched concurrently. Preparation made zero provider calls.**
The packages, public instructions, grading inputs and saved provider profiles
match their completed Trial 2 records. No task-package changes were made.

## Assignment and retained results

| # | Package | Same provider | Trial 2 reward | Service | Checker | Append Trial 3 here |
| --- | --- | --- | --- | --- | --- | --- |
| 19 | variant-cache-repair | Claude | 0 | 24/25 | 14/15 | [19 analysis](../reports/screening/fourth-five/19-variant-cache-repair.md) |
| 21 | incremental-build-repair | Codex | 0 | 27/27 | 14/15 | [21 analysis](../reports/screening/fifth-five/21-incremental-build-repair.md) |
| 25 | issued-report-repair | Claude | 0 | 27/27 | 12/14 | [25 analysis](../reports/screening/fifth-five/25-issued-report-repair.md) |
| 11 | snapshot-recovery-repair | Codex | 0 | 33/33 | 10/12 | [11 analysis](../reports/screening/third-five/11-snapshot-recovery-repair.md) |
| 10 | temporal-capacity-repair | Claude | 0 | 34/34 | 12/13 | [10 analysis](../reports/screening/next-five/10-temporal-capacity-repair.md) |

Keeping the previous providers means **three Claude and two Codex** for this batch.
Claude requests `anthropic/claude-opus-5`, effort `max`, CLI `2.1.263`; Codex
requests `openai/gpt-5.6-sol`, effort `xhigh`, CLI `0.153.2`. These profiles were
copied from the completed runs, not reconstructed from current defaults.
Keep requested and observed identity distinct in the resulting evidence.

Each profile retains a 10,800-second maximum, two CPUs, 2,048 MiB memory,
bridge networking, output/artifact limits and the same pinned authoring image.
Three hours is a ceiling; finish and grade each attempt as soon as it completes.
Billing remains subscription-only, with no paid API fallback or automatic retries.

## Ready controller and provenance

Repository: `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

- Controller: `.local/round-three-failing-five-2026-09-09/campaign.mjs`.
- Frozen readiness: `.local/round-three-failing-five-2026-09-09/real-campaign-frozen/READY.json`.
- New run root: `.local/round-three-failing-five-2026-09-09/real-campaign-frozen/`.
- [Preparation evidence and all five exact export paths](../reports/screening/evidence/2026-09-09-round-three-failing-five-preparation.json).
- Controller changes: `.local/round-three-failing-five-2026-09-09/controller.diff`.
- Local check record: `.local/round-three-failing-five-2026-09-09/handoff-verification.json`.

This controller is adapted from the operator's already-used
`.local/round-two-final-five-2026-09-09/campaign.mjs`. The diff changes the campaign
paths, assignments and trial labels, copies the actual prior profiles, adds a
read-only `verify` mode and checks the frozen runtime bytes before import.
The signed reservation, credential staging and concurrent execution mechanisms
are retained. Its fresh JobStore uses campaign-local `attempt-1` IDs; the human
trial-history label is **Trial 3**.

The runtime is the existing, previously used
`.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js`:

- Actual runtime SHA-256: `60695de963e5085dfe8ee4fb09353b1db0169219d9ad9425ac2a997a73b69b26`.
- Recomputed frozen-source digest: `2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`.
- New controller SHA-256: `a7c24b5dd993051c67af97b5973dbd9ff3450d740c53688f163cd07900b051a4`.
- READY SHA-256: `39021dd99e5949fdd04bc35d7e4cd895e1658f0460da3495d44c5b4a1bd2ffc7`.

Preparation rehashed the real exports, instructions, profiles and prior completion,
result and grade files against retained evidence. All five package/profile/prompt
comparisons passed. The 84 existing assurance checks remain passing and their
package digests match. Controller syntax, `prepare`, and read-only `verify` passed;
the absolute-path verification also passed from `/private/tmp`.

Host observation at handoff: no running Docker containers, 10 Docker CPUs,
16,748,032,000 Docker memory bytes, 76% system-wide memory free, and about 30 GiB
disk free. Both existing credential sources were available; no secret was printed
or staged. These are observations at preparation time, so briefly recheck resource
availability at launch. The earlier memory-pressure interruption remains a reason
to avoid overlapping heavy campaigns, not a new benchmark qualification rule.

## Operator procedure

1. Read this handoff and the controller diff. Use the completed campaigns and
   actual files for any provenance check. The frozen runtime is the one already
   used for Trial 2; do not create another executor or rebuild live `dist/`.
2. Run the read-only verification below. Preparation is already complete; do not
   rerun `prepare` or overwrite `READY.json`. Confirm no dispatch claim or results
   already exist for this campaign and briefly check Docker/memory availability.
3. Run the single launch command through normal tool permissions using the
   established long-running job mechanism. Existing credential loading supplies
   Claude's environment token and Codex's normal auth file. If the current shell
   lacks the Claude variable, load the existing `~/.zprofile` configuration;
   do not paste credentials into the prompt or print their values.
4. Confirm all five solver containers are actually running together and retain
   the observed container names/timestamps. Monitor through completion and grade
   both required deliverables. The controller dispatches with `Promise.allSettled`.
5. If dispatch is interrupted or uncertain, inspect this campaign's existing
   containers, records and JobStore. Preserve partial evidence. Do not delete the
   dispatch claim, blindly relaunch, or invent a zero for an infrastructure error.

Read-only verification (zero provider calls):

```sh
node /Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/round-three-failing-five-2026-09-09/campaign.mjs verify
```

Authorized launch — exactly one new attempt per package:

```sh
node /Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/round-three-failing-five-2026-09-09/campaign.mjs run --user-authorized-five-concurrent-trial-3
```

Keep all five exports, the frozen runtime, this controller, its preparation JSON
and `READY.json` unchanged. Work elsewhere in the repository can continue because
source-identity checks bind to the frozen source. Start fresh solver sessions with
only their original public task inputs; do not supply previous submissions,
analysis, private control details or this operator handoff to the solvers.

## Analysis and publication

Append a dated **Trial 3** section to each original analysis linked above, preserving
Trial 1 and Trial 2. Include package/profile hashes, provider and requested model,
observed identity where available, duration, reward, service/checker counts,
completion claims, relevant self-tests and failure mechanism. Compare the new
mechanism with Trial 2 and explicitly say whether the zero repeated.

Apply the benchmark rules and the unchanged public task contract. A required
checker can fail a task even when the service passes. Reason text remains
diagnostic-only. Implied requirements do not need a worked example or a list of
hidden tests. Any attribution concern must cite the particular public requirement
and observed behavior. Preserve variant cache's existing matching/replacement
note without treating this repeat as either resolving it or changing its prior
recorded zero. Report raw reward and supported cause separately.

Write `reports/screening/round-three-failing-five-2026-09-09.md` and sanitized
`reports/screening/evidence/2026-09-09-round-three-failing-five.json`. Verify raw
completion manifests before publishing. Link the report from the README, screening
index and project status. Extend the publication inventory/checks for this new
campaign while keeping historical Trial 2 totals distinct: 25 scored packages,
5 zeroes, 20 passes, plus one earlier unscored interruption. A new attempt does
not create a new distinct package. Do not commit or push unless requested.

The user's target is **six consecutive clean failures for one unchanged package:
three Claude and three Codex**. Track results and provider counts per package,
not across this five-package batch. A new zero here gives that package two
consecutive recorded zeroes on its successor, both with the same provider;
explain clean-failure attribution using the contract and evidence. A solver pass
ends the failure streak; an infrastructure interruption is unscored and must remain
visible. This batch alone does not meet the six-run target. Report the remaining
provider counts; do not launch additional qualification or cheat runs under this
five-attempt authorization.
