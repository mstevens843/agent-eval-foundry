# Five-successor campaign: three new 6/6 results

September 11, 2026. This fixed checkpoint ends after Partial Release T4 and Ticket Consolidation physical attempt 6; later Ticket attempts are outside its scope. Compatible rollout, Verified installation and Capacity maintenance each complete a balanced six-failure set. The [combined portfolio](final-results-2026-09-11.md) now has ten tasks at 6/6 and two at 5/6.

[Sanitized campaign evidence](evidence/2026-09-11-successor-results.json) · [Combined twelve-finalist evidence](evidence/2026-09-11-twelve-finalists.json).

The original campaign dispatched 24 of 30 prepared slots: 20 launches in the main ledger and four in the installation continuation. Every dispatched slot maps to exactly one launch. Four later follow-up attempts bring this checkpoint to 28 physical calls. The linked installation regrade contributes zero calls. Three Ticket false passes are excluded, leaving 25 counted outcomes: 22 failures and three passes. The three new qualifying sets contribute 18 of those failures.

## Per-package evidence

### 05 — Compatible rollout

[Full task history](original-five/05-compatible-rollout-repair.md).

| Physical trial | Provider | Recorded reward | Counted reward | Service | Required checker |
| --- | --- | ---: | ---: | --- | --- |
| 1 | Claude | 0 | 0 | 25/25 pass | Output validation failed |
| 2 | Claude | 0 | 0 | 25/25 pass | Output validation failed |
| 3 | Claude | 0 | 0 | 25/25 pass | Output validation failed |
| 4 | Codex | 0 | 0 | 25/25 pass | 14/17; 3 valid rejected, 0 invalid accepted |
| 5 | Codex | 0 | 0 | 25/25 pass | 14/17; 3 valid rejected, 0 invalid accepted |
| 6 | Codex | 0 | 0 | 25/25 pass | Output validation failed |

- Version 3.0.1: `c55fbadc8e541790289e7f30dc6cb6742eac0fee0bc9ea790d36fdd8fb0bcef0`.

### 08 — Partial release

[Full task history](next-five/08-partial-release-repair.md).

| Physical trial | Provider | Recorded reward | Counted reward | Service | Required checker |
| --- | --- | ---: | ---: | --- | --- |
| 1 | Claude | 0 | 0 | 65/65 pass | Output validation failed |
| 2 | Claude | 1 | 1 | 65/65 pass | 17/17; 0 valid rejected, 0 invalid accepted |
| 3 | Claude | 1 | 1 | 65/65 pass | 22/22; 0 valid rejected, 0 invalid accepted |
| 4 | Codex | 1 | 1 | 65/65 pass | 22/22; 0 valid rejected, 0 invalid accepted; audit pending |

- Version 2.0.1: `9bd1c3ae996492793bc3f01264c28a3ed327836f2ae16b7353f8f1571cc0a612`.
- Version 2.0.2: `1422a83d7860f81e2bf9bdb52ce634887f2e8da4edcccbe8870cdcfebaadf897`.

T2 and T3 are retained valid passes under the [published audit](../pass-audits/partial-release-trial-three-2026-09-11.md). T4 is a recorded pass pending its own independent audit. T3 and T4 were separately authorized confirmations after the original stop. This task is excluded from the qualifying total.

### 09 — Ticket consolidation

[Full task history](next-five/09-ticket-consolidation-repair.md).

| Physical trial | Provider | Recorded reward | Counted reward | Service | Required checker |
| --- | --- | ---: | ---: | --- | --- |
| 1 | Claude | 0 | 0 | 69/69 pass | Output validation failed |
| 2 | Claude | 0 | 0 | 69/69 pass | Output validation failed |
| 3 | Claude | 0 | 0 | 69/69 pass | Output validation failed |
| 4 | Codex | 1 | null | 69/69 pass | 17/17; 0 valid rejected, 0 invalid accepted; audited false pass |
| 5 | Codex | 1 | null | 69/69 pass | 28/28; 0 valid rejected, 0 invalid accepted; audited false pass |
| 6 | Codex | 1 | null | 73/73 pass | 32/32; 0 valid rejected, 0 invalid accepted; audited false pass |

- Version 2.0.1: `39f2a285b88072ca203ca0ad1998517269e0a376daa00b52cc252dffa79916cb`.
- Version 2.0.2: `f01f00452514cce2527710420055fd93994f115d7bae7b1008a8ca598d3fad33`.
- Version 2.0.3: `bde0e2b5f7329bf06bea37992b7348a16f3ecd9c9178be9efcbf0d9cdd3344ac`.

Physical attempts 4–6 are [audited nulls](../pass-audits/ticket-consolidation-attempt-six-2026-09-11.md); original reward-one files remain untouched. There are three eligible historical Claude failures, zero eligible Codex outcomes and three counted slots remaining. Corrected v2.0.4 is frozen at digest `6d8179c6d01c8bbd4def8e1537292b34325691c8320f321faa07bb2e65191729`; physical attempt 7 would be counted trial 4. This checkpoint does not claim any trial on that correction.

### 12 — Verified installation

[Full task history](third-five/12-verified-installation-repair.md).

| Physical trial | Provider | Recorded reward | Counted reward | Service | Required checker |
| --- | --- | ---: | ---: | --- | --- |
| 1 | Claude | 0 | 0 | 55/55 pass | Output validation failed |
| 2 | Claude | null | 0 | 55/55 pass | Output validation failed (linked recovery) |
| 3 | Claude | 0 | 0 | 55/55 pass | Output validation failed |
| 4 | Codex | 0 | 0 | 55/55 pass | 17/20; 3 valid rejected, 0 invalid accepted |
| 5 | Codex | 0 | 0 | 55/55 pass | 17/20; 3 valid rejected, 0 invalid accepted |
| 6 | Codex | 0 | 0 | 55/55 pass | 17/20; 3 valid rejected, 0 invalid accepted |

- Version 2.0.1: `5796a522e5ca55610974eba98e43b43d3d47266e458274eb50d4e23aa264ef45`.

T2's original grade is an unscored Docker incident. Its [published reconciliation](../pass-audits/verified-installation-trial-two-reconciliation-2026-09-11.json) links a completed, same-package grading-only recovery to the original provider attempt. It counts once as reward 0. The recovery adds no provider attempt and does not change the original incident record.

### 13 — Capacity maintenance

[Full task history](third-five/13-capacity-maintenance-repair.md).

| Physical trial | Provider | Recorded reward | Counted reward | Service | Required checker |
| --- | --- | ---: | ---: | --- | --- |
| 1 | Claude | 0 | 0 | 30/30 pass | Output validation failed |
| 2 | Claude | 0 | 0 | 30/30 pass | Output validation failed |
| 3 | Claude | 0 | 0 | 30/30 pass | Output validation failed |
| 4 | Codex | 0 | 0 | 30/30 pass | 17/19; 2 valid rejected, 0 invalid accepted |
| 5 | Codex | 0 | 0 | 30/30 pass | 17/19; 2 valid rejected, 0 invalid accepted |
| 6 | Codex | 0 | 0 | 30/30 pass | 17/19; 2 valid rejected, 0 invalid accepted |

- Version 2.0.1: `3c17fef32da7bc83ea82ac8f94fc7eabb4cccdb05a86a47d8991c8dec4b5f684`.

## Meaning of the failures

All 28 resolved service grades pass, including the recovered installation grade. A failed required checker causes combined reward 0. In the three qualifying sets, eight Codex submissions produce real classification aggregates: Capacity rejects reference/alternative, Installation rejects reference/alternative/recoverable-write-error, and Rollout rejects three valid candidates. Their aggregate `falsePositives` counter means rejected valid candidates; `missed` means accepted invalid candidates. The other ten qualifying outcomes fail checker output validation. Several prior source inspections found the `__proto__` plain-object assignment defect, but this publication does not label every output failure as that specific cause.

All six checker-source hashes within each new qualifying task are distinct. This establishes distinct stored submissions, not independent failure mechanisms. Each qualifying six-trial set uses one frozen package digest, with three Claude and three Codex runs. Requested model names/effort are separated from observations, including unobservable model identity; runtime evidence-eligibility flags are retained.

## Preserved operational incident

The main controller failed its final integrity scan because separately authorized installation continuation dispatches occupied the shared prepared slots but appeared only in the continuation ledger. Its `CONTROLLER-ERROR.json`, both ledgers, and all original records remain unchanged. No main `FINAL.json` was created or fabricated. A separate reconciliation establishes ownership of all 24 original dispatches, and this publication independently rechecks the launch mapping and stored evidence.

The reporting operation invokes no provider, grader or model; it reads retained files. No subscription charges or exact underlying model identities are inferred from requested profiles. Earlier campaigns are preserved separately. Ticket's further authorized continuation uses exclusively owned slots and is outside this snapshot.

## Reproduce this checkpoint

`node scripts/verify-publication.mjs` checks portable hashes, accounting and navigation without credentials. `node scripts/publish-successor-results.mjs verify` additionally requires the retained local records and frozen runtime, verifies all 37,792 original manifest files plus 1,455 recovery files, and recomputes the checkpoint. It cannot dispatch a model. The portable report intentionally excludes raw transcripts, credentials and machine-local file paths.
