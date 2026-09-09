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

## Trial 2 preparation — final group (2026-09-09)

**Ready for second exploratory trials through Foundry or native Harbor.** Removed the public revision, derivation, policy, persistence and publication implementations after completing both private services. Integrated four committed-publication lost-response cases with actual process termination and identical job redelivery, for 16 scenarios. Added a typed API and required independent checker; only raw jobs and execution histories are exposed. Receipt-blind redelivery is a negative history control. Empty decision reports now produce semantic failures rather than verifier exceptions. This successor adds a checker deliverable; Trial 1 required the service only.

Local validation passed **13 assurance checks**, including a semantic failure for the untouched starter. Its independent checker classifies **10/10 candidates** correctly; reason text is diagnostic. The final native export passed 22 static checks, Harbor oracle reward 1 and nop reward 0, with no infrastructure exceptions. Both export formats reproduce. No model attempt was launched by this engineering work.

Foundry export: `.local/final-five-implementation-2026-09-09/release-ready/persistent-knowledge-repair/export`. Package digest: `9d40456cb7d7456aee236396cc374fa3e17c9f2b1ce1ad71641e3234efe62eea`. Native export: `.local/final-five-implementation-2026-09-09/harbor-ready/persistent-knowledge-repair`. Native digest: `8f9453df86143808c306966acc54ac1b14a886a1d2d8e16c0fd356e2413b6643`. Suggested target: **Codex**, retaining the original model family. Append the eventual Trial 2 outcome below this engineering record; preserve Trial 1.

[Implementation and completed checks](../final-five-implementation-plan-2026-09-09.md) · [Exact evidence](../evidence/2026-09-09-final-five-implementation.json).
