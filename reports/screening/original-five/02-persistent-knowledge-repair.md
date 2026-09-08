# 02 — Persistent knowledge repair

Codex solved the frozen service: reward 1, **12/12 scenarios**, reported duration **6m 10s**. This was a clean first attempt, without the CAA instruction leak.

## The task and package

A support publication service remembers source revisions and derived values across fresh processes. It must select current revisions, preserve complete transitive lineage, distinguish approved sources from external content, honor exact destination/grant versions, and avoid republishing the same logical request. Only the specified storage directory survives between jobs.

The starter was divided into revision, derivation, consumer, store, policy and publication modules. Ordinary visible tests covered only a subset of the stated behavior. The separate grading authority checked actual publications, values, lineage, decisions and preservation across twelve scenarios. Wrong-solution controls covered first-parent-only reasoning, stale revisions/grants, incorrect lineage, store replacement and no work.

## What the agent changed

- Applied an incoming revision only when it was strictly newer.
- Checked every derivation parent rather than only the first, and merged/deduplicated all contributing lineage.
- Consulted publication receipts before processing a repeated request and handled duplicates within a job.
- Required the grant version to match the request exactly.
- Used a null-prototype record map and validated persisted input shapes, avoiding special-key collisions.

It wrote additional tests for restart, replay, mixed authority, cycles, retractions and stale revisions. Its recorded diagnosis closely matched the private controls without access to their names. The independent grader accepted every service scenario.

## What we learned and what remains

The failure classes were distributed across real modules, but the public requirements mapped directly to small local fixes. The agent could enumerate those obligations, implement them, and check them successfully. More scenario count alone is unlikely to transform that structure.

A successor could explore genuine interruption between durable local updates and external publication, provided the public contract defines the recovery boundary and offers authoritative reconciliation. Local post-screening crash-recovery work exists separately and required a contract revision; it is not part of this historical result, nor included as a measured improvement in this publication. It needs separate integration review and versioned validation.

## Evidence boundary

[Sanitized record](../evidence/2026-09-07-original-five.json) preserves the exact package identity, final grade and completion hashes. [Maintained source](../../../tasks/persistent-knowledge-repair/) is separate from the captured submitted solution. Self-tests are observations of the agent's checking process, not an independent proof of correctness. See [batch limitations](../README.md).
