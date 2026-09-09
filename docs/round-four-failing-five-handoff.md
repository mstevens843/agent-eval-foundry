# Third attempt on the unchanged successors — Trial 4 in the histories

Prepared September 9, 2026. **All five are ready for one more attempt each, running
concurrently, with the same provider again.** Preparation made zero provider calls.
This is the third attempt on each successor: original Trial 1 used an earlier
package, while Trials 2 and 3 used these unchanged exports. Append **Trial 4** to
the histories to avoid duplicating or overwriting the existing Trial 3 results.

## Exact assignments

| # | Package | Provider again | Trial 2 → Trial 3 reward | Same-provider attempt after this run | Original analysis |
| --- | --- | --- | --- | --- | --- |
| 19 | variant-cache-repair | Claude | 0 → 0 | Third Claude | [19](../reports/screening/fourth-five/19-variant-cache-repair.md) |
| 21 | incremental-build-repair | Codex | 0 → 0 | Third Codex | [21](../reports/screening/fifth-five/21-incremental-build-repair.md) |
| 25 | issued-report-repair | Claude | 0 → 0 | Third Claude | [25](../reports/screening/fifth-five/25-issued-report-repair.md) |
| 11 | snapshot-recovery-repair | Codex | 0 → 1 | Third Codex | [11](../reports/screening/third-five/11-snapshot-recovery-repair.md) |
| 10 | temporal-capacity-repair | Claude | 0 → 1 | Third Claude | [10](../reports/screening/next-five/10-temporal-capacity-repair.md) |

**Three Claude and two Codex now.** The user explicitly confirmed three consecutive
attempts with each package's original provider before switching. The three
opposite-provider attempts per package come afterward and are outside this launch.

All five package digests, instruction hashes and saved profiles match their
completed Trial 2 and Trial 3 records. Reuse the original public inputs, grader,
private controls and starters. No optimization, extra hints or prior solutions
are part of this batch. The two packages that passed last time remain included.

## Acceptance and progress

The user reports the CEO's acceptance threshold as **at least five failures out of
six scored attempts per unchanged package**, with **three Claude and three Codex**.
Six consecutive failures is the stronger aspiration, not the minimum threshold.

- 19, 21 and 25 currently have two consecutive recorded zeroes (2/2). Each needs
  at least three failures from its remaining four attempts.
- 11 and 10 have one failure and one pass (1/2). Each needs all four remaining
  attempts to fail. Their prior failure is retained; the pass does not require
  restarting this unchanged six-run set.
- A second solver pass puts the planned six-run set below 5/6. Report it instead
  of discarding the pass, substituting another attempt or changing the package.
- Required-checker failures can count with a correct service. Different valid
  failure mechanisms can count. Exact bug recurrence is analysis, not a gate.

Retain raw rewards and concrete attribution notes separately. Variant cache's
earlier Trial 2 matching/replacement note remains attached to that earlier result;
Trial 3 separately violated the origin-request budget. Do not let a changed bug
erase a result or treat repetition alone as resolving a documented contract question.

## Prepared controller

Repository: `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

- Controller: `.local/round-four-failing-five-2026-09-09/campaign.mjs`.
- Frozen readiness: `.local/round-four-failing-five-2026-09-09/real-campaign-frozen/READY.json`.
- New run root: `.local/round-four-failing-five-2026-09-09/real-campaign-frozen/`.
- [Preparation evidence, exact exports and prior run identities](../reports/screening/evidence/2026-09-09-round-four-failing-five-preparation.json).
- Controller changes: `.local/round-four-failing-five-2026-09-09/controller.diff`.
- Local check record: `.local/round-four-failing-five-2026-09-09/handoff-verification.json`.

This is a small adaptation of the **Trial 3 controller the operator just ran**.
It changes campaign paths/labels and accepts the actual prior rewards for all five,
including the two passes. Signed reservations, credential handling and concurrent
execution remain the same. Profiles are copied from actual completed records.

It imports the same previously used frozen runtime:
`.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js`.
Runtime SHA-256: `60695de963e5085dfe8ee4fb09353b1db0169219d9ad9425ac2a997a73b69b26`.
Frozen-source digest: `2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`.
Both were recomputed from actual files. Do not rebuild live `dist/` or create another
executor. Edits elsewhere in the repository do not change this frozen runtime.

Claude retains `anthropic/claude-opus-5`, effort `max`, CLI `2.1.263`; Codex retains
`openai/gpt-5.6-sol`, effort `xhigh`, CLI `0.153.2`. Requested profile identity and
observed backend identity remain separate in the results. Profiles retain the
same pinned author image, 2 CPUs, 2,048 MiB memory, bridge networking and output
limits. Each attempt has a **10,800-second maximum**, finishing earlier whenever
the solver completes. Subscription-only; no paid API fallback or automatic retries.

Verification passed for all five package/profile/instruction comparisons, retained
assurance (84 existing passing checks), controller syntax, `prepare` and read-only
`verify`, including verification from `/private/tmp` using an absolute path. The
pinned author image is available. At preparation, no Docker containers were running;
Docker had 10 CPUs and 16,748,032,000 memory bytes, and host memory was 73% free.
Recheck transient resource availability at launch; the earlier memory interruption
is a reason to avoid overlapping heavy campaigns, not a benchmark rule.

## Verify and launch once

Read this file and the controller diff. **Preparation is already complete.** Do not
rerun `prepare`, overwrite `READY.json`, change the retained exports or reuse a
previous campaign directory. The controller's campaign-local IDs still say
`attempt-1`; their history label is Trial 4 and successor attempt number is three.

Read-only verification, zero provider calls:

```sh
node /Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/round-four-failing-five-2026-09-09/campaign.mjs verify
```

Confirm this campaign has not already dispatched and the host is available, then
launch once through normal tool permissions using the established background-job
mechanism:

```sh
node /Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/round-four-failing-five-2026-09-09/campaign.mjs run --user-authorized-five-concurrent-trial-4
```

Use existing Claude environment loading and normal Codex authentication. Both were
available during preparation; no secret was printed or staged. If the shell lacks
the Claude variable, load the existing `~/.zprofile` configuration. Do not paste or
print tokens. Start fresh solver sessions using only each task's original public
inputs. The operator's prior analyses, submitted code and private controls must not
be passed into solver sessions.

Confirm all five containers are running together and retain their names and launch
timestamps. Monitor through completion. If interrupted, preserve existing containers,
JobStore state and partial evidence; inspect before any further dispatch. Do not
delete a claim and relaunch blindly. An infrastructure interruption is unscored.

## Analysis and publication

Append a dated **Trial 4 — third unchanged-successor attempt** section to each
original analysis linked above, preserving Trials 1–3. Report raw reward, overall
outcome, service outcome/counts and checker counts separately. An overall zero with
a correct service must still have overall `semantic-fail`, with `semantic-pass`
reserved for its separate service outcome. Include exact identities, duration,
failure mechanism, self-test evidence and comparison with both prior successor runs.

Apply the benchmark rules and the unchanged public contract. Reason text remains
diagnostic-only. Implied requirements do not need worked solutions or disclosure
of every hidden test. Do not add a same-bug requirement or call a previous failure
one-off because one later attempt passes. Support any attribution concern with the
specific public requirement and observed behavior.

Verify completion manifests, then publish:

- `reports/screening/round-four-failing-five-2026-09-09.md`.
- `reports/screening/evidence/2026-09-09-round-four-failing-five.json`.
- README, screening index, project status and publication-check inventory/counts.

Track all three same-provider results per unchanged package, including passes,
and show the remaining three opposite-provider attempts needed for the six-run
set. If the next run completes normally, each package's remaining three slots all
belong to the other provider. Record which packages reach three consecutive zeroes,
which retain 5-of-6 eligibility, and which fall below it. Do not launch the other
provider's runs or any additional retries under this five-attempt authorization.

Before this campaign launches, the successor totals are **31 attempts, 30 scored,
8 zeroes, 22 passes and 1 historical interruption**, across 25 distinct packages.
Trial 2 alone remains 26 attempts, 25 scored, 5 zeroes and 20 passes. Keep those
historical totals separate from new results. Do not commit or push unless requested.
