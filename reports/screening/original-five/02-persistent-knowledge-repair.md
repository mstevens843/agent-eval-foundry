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

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `persistent-knowledge-repair-attempt-1`, package digest
`9d40456cb7d7456aee236396cc374fa3e17c9f2b1ce1ad71641e3234efe62eea`, route
`professional-multifile/authority-process@1`. Dispatched through the session's
`real-provider` execution route (signed JobStore reservation, Ed25519, realm
`real-provider`, `billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`)
— a fresh campaign slot (`attempt-1`), not an infrastructure retry of any prior run.
Author image `sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.
Evidence retained at
`.local/round-two-final-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/persistent-knowledge-repair-attempt-1/`.

Target: **codex**. Requested `openai/gpt-5.6-sol`, effort `xhigh`, CLI
`scaffoldVersion 0.153.2` (verified baked into the pinned author image). Model,
effort and scaffold version were not exposed by the codex CLI's event stream and
remain unobserved — a known instrumentation limit, not a data quality problem.

Dispatched 2026-09-09T17:31:23.135Z as one of five reservations installed within a
334ms window (17:31:23.079Z–17:31:23.413Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently, so this was a genuinely concurrent
five-way campaign. A sixth, separately-authorized job (`route-policy-repair`) was
deliberately dispatched roughly 102 seconds later as an additional concurrent job on
this host, bringing the round's total to three Claude and three Codex attempts; that
job's own timing and outcome are recorded in its own analysis document and do not
affect this job's validity. Completed 2026-09-09T17:42:49.682Z. Total elapsed
≈686,547ms (~11m27s) — solver authoring time (capture wall clock) ≈677,809ms
(~11m18s), grading ≈8.7s. This was the fastest and leanest job in the batch (38
captured events). Execution reached a clean `completed` state with no invalid
execution or infrastructure error.

### B. What changed since Trial 1

Trial 1 required only the service (12/12 scenarios, reward 1, no checker). This
successor removed the public revision, derivation, policy, persistence and
publication implementations, leaving an empty `subject.run` entry point, and added
two genuinely new required obligations that Trial 1 never faced: (1) a standalone,
separately-graded checker, and (2) committed-publication redelivery — the contract
now integrates four lost-response scenarios where a publish commits but the caller
never receives the response (simulated process termination), followed by identical
job redelivery, expanding the scenario count from 12 to 16.

### C. Results

Reward 1 — a clean pass on both required deliverables. Service: all 16 expected
scenario IDs observed, zero failures, zero missing/unexpected IDs. Checker: present,
deterministic, `checkerRequired: true`, `checkerPassed: true`, 10/10 candidates
correctly classified (0 missed, 0 false positives). This is the first time this
package's checker has ever been graded and the first time the redelivery contract has
been tested, and both passed cleanly on a single attempt.

### D. Observable solving behavior

The agent read `SEMANTICS.md`, `api.d.ts` and `CHECKER-INPUT.md` in one combined
`sed`/`rg` pass, then the (empty) starter and `instruction.md`, then wrote `entry.mjs`
directly. Its redelivery mechanism: on every `run`, it calls `api.receipts({})` and
builds a `published` map keyed by request id from the *existing* receipt history
before doing any new work; if an incoming request id already has a receipt, it
returns `{outcome: 'published', lineage: prior.lineage}` immediately, using the
already-committed lineage rather than re-evaluating or re-publishing. Revision
handling only applies an incoming update when `update.revision > previous.revision`,
and lineage evaluation (`evaluate()`) walks derived-record parent chains with cycle
detection (`active`/`finished` sets) and merges all contributing ancestors' lineage,
not just the first parent.

It validated this mechanism directly rather than asserting it: a single
`node --input-type=module` heredoc script built a mock `api` whose `publish()` throws
`'simulated lost response'` on its first call (`interrupt = true`), ran the job once
expecting that thrown error, then re-ran the *same* job object and asserted
`effects.length === 1` (the publish was not duplicated) and
`report1.decisions[0].outcome === 'published'` — i.e. it directly exercised the exact
lost-response-then-redelivery sequence the new contract requires, not just a
service-scenario replay. The same script also checked a blocked derived candidate
(mixed-authority parent) rejects with the correct partial lineage length, a cycle
resolves to a blocked/empty-lineage decision, and a second job with revised sources
correctly retains the original (job 1) publication's revision-1 lineage rather than
picking up the newer revision-2 values. It closed with `node --check` on both
`entry.mjs` and `checker.mjs`. No failed assertion or reverted approach appears in the
38-event capture; the run went straight from reading the contract to a working,
self-verified submission.

### E. Comparison and next step

Trial 1, working from a starter that already supplied revision/derivation/consumer/
store/policy/publication modules, reached reward 1 on 12 service-only scenarios in
6m10s. Trial 2, working from an empty starter and facing two entirely new required
obligations (a checker, and redelivery semantics), reached the same clean-pass outcome
in 11m27s — roughly double the wall-clock time but for substantively more scope, not
a like-for-like repeat. The compact 38-event capture and single self-test script
covering both the original service logic and the new redelivery mechanism suggest this
package's difficulty profile remains low for this Codex pairing even after starter
removal and contract expansion. Given a clean pass on a first-ever test of both new
requirements, retain the submission as a correct control and give observed reward-zero
candidates priority for further failure-finding trials.

### F. Verified publication record — September 9, 2026

Reward **1**; service **16/16**; checker **10/10**. All **698** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-final-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-final-five.json). Earlier trial records are preserved.
