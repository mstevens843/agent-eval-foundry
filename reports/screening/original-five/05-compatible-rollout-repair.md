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
