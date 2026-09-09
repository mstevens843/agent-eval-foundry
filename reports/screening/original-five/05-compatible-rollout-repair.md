# 05 — Compatible rollout repair

Claude solved the frozen rollout controller: reward 1, **12/12 scenarios**, reported duration **7m 21s**. The retained attempt has no capture or instruction-contamination issue.

## The task and package

Roll out model releases to a fleet with different consumer ABIs. Select the highest-ranked compatible release, stage it, require fresh health evidence for the exact consumer/release/generation, publish the binding and cache, and restore the correct prior release if the rollout fails. Clean only temporary records owned by this work; preserve other consumers and other jobs' state.

The starter separated catalog selection, health, control flow, cleanup and entry code. Its independent suite checked binding, compatibility, health, completion, cache, rollback, cleanup, reports and preservation. Deliberately incorrect controls isolated wrong ABI, stale green telemetry, wrong binding, broad cleanup and omitted cache publication.

## What the agent changed

- Filtered the catalog by ABI before ranking releases.
- Bound health samples to the exact consumer/release/generation, selected the latest relevant samples, and required both to be healthy.
- Restored each failing service's own previous release instead of the first inventory entry's release.
- Rechecked restored health and refreshed inventory when earlier work could have changed it.
- Tracked preexisting staging records and cleaned up only newly owned records, including on errors.

The recorded process included a driver simulator, checking the simulator against the buggy starter, and thousands of generated fleet/job combinations. These are self-authored checks, not thousands of hidden independent tests. The independent result is that every frozen service scenario passed.

## Construction lesson

This is a competent multi-obligation repair, but its defects were still readily separable from the public contract. The agent reconstructed and verified those obligations without exhausting the intended time budget. Strong local assurance establishes that we measured a solve honestly; it does not turn the package into a hard one.

The earlier proposal to make the rollback target unhealthy contradicts this version's explicit guarantee that prior releases are healthy when restored. That requires a new contract and an attainable fallback policy. It must not be added as a hidden trap. Separate local crash-recovery work is a successor experiment, not a rerun or measured improvement of this attempt.

## Evidence boundary

[Sanitized record](../evidence/2026-09-07-original-five.json) contains the frozen package/profile identity, recorded result and completion hashes. [Maintained source](../../../tasks/compatible-rollout-repair/) is not the submitted solution. [Batch limitations](../README.md) cover profile uncertainty and the distinction between exploratory screening and official qualification.


## Trial 2 preparation — fourth ranked group (2026-09-09)

**Ready for second exploratory trials through Foundry or native Harbor.** No new model attempt is recorded by this engineering work. Removed the public catalog, health, publication, cleanup and controller implementations. Integrated four stage-response-loss cases and two interrupted unhealthy-stage rollback cases, for 18 scenarios. A task-private adapter actually ends the submitted process after stage commits and redelivers the same job with external state/storage intact. Both private services retain original job-entry rollback targets and cleanup scope. Added `resume-without-health` and `forget-job-origin` controls. Kept explicit cleanup rather than the local prototype’s automatic stage-record retirement on bind. Added a typed API and a required independent checker using raw per-job state/history; no private legality verdicts are supplied. This successor has two required deliverables; Trial 1 required only the service.

Both service and checker are required. The public entry is empty, reason strings are optional diagnostics, helper modules are allowed, and the contract retains the facts needed to judge correctness. Existing shared authoring-policy improvements apply; no additional exploration gates were introduced.

Local validation passed 14 assurance checks across 18 service scenarios, including complete reference/alternative services and semantic rejection of the untouched starter. The independent checker classified **11/11** candidates correctly, with zero false accepts or misses. All 22 native static checks and six verifier integrity controls passed. The exact native export earned oracle reward 1 and nop reward 0, with no infrastructure error; nop rejects the absent required checker. Foundry assurance separately verifies the empty service's semantic failure. Export reproduction and targeted regression checks passed.

Foundry export: `.local/fourth-ranked-five-implementation-2026-09-09/release-ready/compatible-rollout-repair/export`. Package digest: `1d016de5fe639a81300ee633d5eb49606400f142eb1e0de37e03926d91f86c7d`. Native digest: `6f94432217f8991a65f9e188a7fb84b49bcde756e7f8950682e9fc54ca03c5be`. Suggested Trial 2 target: **Claude**, retaining this package's original model family. Append the eventual Trial 2 result below this engineering record, preserving Trial 1.

[Group implementation and selection](../fourth-ranked-five-implementation-plan-2026-09-09.md) and [exact validation evidence](../evidence/2026-09-09-fourth-ranked-five-implementation.json) retain file hashes, native trial identities and the remaining final-qualification requirements.
