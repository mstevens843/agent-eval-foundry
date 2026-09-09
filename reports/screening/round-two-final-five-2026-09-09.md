# Round-two screening: five final-five successors, Trial 2 — plus the route-policy retry

September 9, 2026. **Temporal capacity adds one new Foundry reward-zero success.**
The other four final-group packages and the route-policy retry returned reward 1.
Second-round exploratory attempts against the five
[final-five implementation successors](final-five-implementation-plan-2026-09-09.md):
staged-allocation-repair (23), persistent-knowledge-repair (02), temporal-capacity-repair (10),
caa-revalidation-repair (01) and event-window-repair (22). caa-revalidation-repair is a native Go
service with no checker requirement (N/A); the other four use the Node portfolio route and
require both service and independent checker, with checker reasons diagnostic-only. This is also
the last of the five prepared Trial 2 groups in this series — all twenty-five original screened
packages now have at least one recorded Trial 2 attempt. This publication does not change the
original Trial 1 results, which remain in the
[screening README's historical table](README.md#read-the-individual-trials) unmodified.

Alongside this batch, a sixth, separately-authorized job reran **route-policy-repair (14)** —
the package whose only prior Trial 2 attempt (in the second group's campaign) was interrupted by
host memory pressure before producing any result. This retry used a genuinely new campaign slot
(its own JobStore, not a resume of the interrupted job) and was dispatched deliberately alongside
this batch to reach three Claude / three Codex attempts total for the round. It is tracked and
evidenced separately from the five-package campaign below; its own dated section is appended to
`third-five/14-route-policy-repair.md` after the existing INCONCLUSIVE record, which remains
untouched.

## Execution record

**Five-package campaign.** Assignment: staged-allocation-repair and temporal-capacity-repair to
Claude (`anthropic/claude-opus-5`, `max`); persistent-knowledge-repair, caa-revalidation-repair
and event-window-repair to Codex (`openai/gpt-5.6-sol`, `xhigh`). All five retain their original
Trial 1 model family. All five jobs were reserved and dispatched within a 334ms window
(2026-09-09T17:31:23.079Z – 17:31:23.413Z), confirmed running concurrently via `docker ps`
immediately after dispatch. Each ran under a signed, subscription-only JobStore reservation
(`maxMicroUsd: 0`, `maxAttempts: 1`, no automatic retries, no paid API fallback), a 10,800-second
(3h) wall-clock budget and 2 CPUs per container. The four Node tasks had 2 GiB
each; CAA had **4 GiB**, as recorded in its profile. CAA's authoring image differs
from the other four (`sha256:c1e434806d5b8b83ec5d3c3b85408d56d8c3f0768a56a93ad1c478587b40b674`, the retained
native Go/Codex image). No attempt came close to the timeout; the longest (temporal-capacity-repair)
ran 24m57s. All five reached a clean `completed` state with no invalid execution or infrastructure
error.

**route-policy-repair retry.** Dispatched separately at 17:33:05.336Z — about 102 seconds after
the five-package batch's containers were confirmed running — using the same frozen runtime and
the already-verified next-five evidence file. All six `foundry-real-*` containers were confirmed
running concurrently via `docker ps` after its launch. The overlap covered only the
initial part of this 42m26s job: event window completed at 17:40:19.543Z, while the
retry continued until 18:15:31.372Z. This was the
longest and most token-heavy run of the recorded Trial 2 campaigns: 12.7M input tokens. It completed
cleanly with no infrastructure error, unlike its earlier interrupted attempt.

The dispatch controllers reused, byte-for-byte, the isolated runtime built and independently
verified for the first round-two campaign (source digest `2184eee8...`, `dist/index.js` SHA-256
re-verified unchanged immediately before both dispatches). No new runtime was built. There were five planned final-group calls and one separately recorded manual
route-policy retry. Neither controller made automatic retries or substitutions.

## Results

| Package | Model | Reward | Service | Checker | Authoring time | Execution validity | Recommended next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Staged allocation (23) | Claude / Opus 5 max | **1** | 41/41 | 13/13 correct | 19m 40s | Valid, real-provider | Retain as a correct control; lower trial priority |
| Persistent knowledge (02) | Codex / Sol xhigh | **1** | 16/16 | 10/10 correct | 11m 18s | Valid, real-provider | Retain as a correct control; lower trial priority -- first checker/redelivery grading, passed cleanly |
| Temporal capacity (10) | Claude / Opus 5 max | 0 | **34/34** | 12/13 (1 missed) | 24m 47s | Valid, real-provider | Prioritize another trial of this unchanged package |
| CAA revalidation (01, native) | Codex / Sol xhigh | **1** | 24/24 | N/A (no checker) | 18m 15s | Valid, real-provider | Retain as a correct control; lower trial priority |
| Event window (22) | Codex / Sol xhigh | **1** | 27/27 | 15/15 correct | 8m 47s | Valid, real-provider | Retain as a correct control; lower trial priority |
| Route policy (14, retry) | Claude / Opus 5 max | **1** | 27/27 | 12/12 correct | 42m 19s | Valid, real-provider | Retain as a correct control; lower trial priority -- resolves the earlier infrastructure interruption |

Five of six results pass every deliverable required by their task. CAA requires
only the native service; the other five also require a checker. The one reward-zero (temporal-capacity-repair) has a fully correct service; the
failure is confined to the checker.

### What this campaign adds

- **One substantive checker-authoring gap, precisely diagnosed.** temporal-capacity-repair's
  `checker.mjs` implements a `paginationViolation()` check that only flags "the source was never
  fetched" when `recordCount > 0` -- a deliberate design choice (confirmed from the agent's own
  transcript, which discusses this conservatism explicitly) meant to avoid penalizing a
  skipped read when there is nothing to read. The contract nevertheless requires
  exhausting all pages; it supplies no zero-record exemption. That same reasoning exempts exactly the
  `unread-empty-source` negative control this check exists to catch: zero records, no fetch, a
  correct-looking zero total by coincidence. This is a tuned-wrong edge case in a tested design,
  not an untested oversight -- the same general class of checker gap seen twice before in this
  series (incremental-build-repair, snapshot-recovery-repair), each with a different concrete
  mechanism.
- **Two results demonstrate a new deliverable or contract clause passing cleanly on first
  grading.** persistent-knowledge-repair's checker and new committed-publication redelivery
  semantics were graded for the first time (Trial 1 was service-only) and passed cleanly; the
  submission validates redelivery directly with a mock `api` that simulates a lost response and
  re-run, confirming no duplicate publish. caa-revalidation-repair -- this series' only native
  task -- passed all 24 scenarios; its submission keyed concurrent authority responses by
  identifier in a mutex-protected map, the exact concurrency/identity defect Trial 1's own
  retrospective had flagged as this package's core difficulty.
- **The route-policy-repair retry resolves the series' one open infrastructure question.** The
  earlier interrupted attempt left the question of this package's actual Trial 2 performance
  genuinely open. This retry answers it cleanly: a checker built via symbolic community-delta
  exploration, validated against an independent brute-force enumeration and catching all 7 of its
  own deliberately-injected breakages, with a disclosed (not hidden) scaling limitation.

No result here rests on an undefined label, an exact-reason-string mismatch, or any of the
grading-alignment concerns that affected earlier batches -- the diagnostic-only reason policy
applies to all five checker-required packages, and every checker verdict was graded on its
boolean accept/reject only.

### Candidates for further trials

**Prioritize temporal capacity (10) for another trial on its unchanged version.**
Its service passed 34/34, but the required checker accepted a candidate that violated
the source-traversal obligation. The public instruction to exhaust all pages and
host-recorded fetch observations support that failure directly. The unchanged-checker
offline diagnostic reproduced acceptance of `unread-empty-source`; no model was called
and no submitted code or original grade was changed.

This follows the [TB implementation rubric](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-implementation.toml):
tests must follow stated requirements; every individual test need not be enumerated
and prerequisite reasoning need not be explained. No extra solution hint or
service-level failure requirement is imposed here. Retain the five passing submissions
as correct controls and put observed required-deliverable failures first in the queue.

Across all five groups and the separate route-policy retry: **25 distinct packages,
26 launched attempts, 25 scored results, 5 zero rewards and 20 solver passes**.
The earlier interrupted attempt remains unscored; its later successful retry resolves
the pending package result without erasing the interruption. The fourth group added
zero new failures; this final group added one. The existing cache contract question
remains documented in the first group's audit. See the
[complete Trial 2 portfolio](round-two-portfolio-2026-09-09.md).

## Evidence and updated documents

- [Sanitized five-package evidence](evidence/2026-09-09-round-two-final-five.json) and
  [sanitized retry evidence](evidence/2026-09-09-route-policy-repair-retry.json) -- per-package
  requested/observed profile, service and checker breakdowns, timing, token usage, and
  completion/result/grade hashes. **3,627** final-group files and **745** retry
  files were verified against their completion manifests.
- Campaign records: `.local/round-two-final-five-2026-09-09/` and
  `.local/round-two-route-policy-retry-2026-09-09/` (each with its own controller, JobStore and
  run records under `real-campaign-frozen/`).
- Updated analysis documents, each with an appended "Trial 2 -- implementation successor --
  September 9, 2026" section (Trial 1 content unchanged):
  [23 -- Staged allocation](fifth-five/23-staged-allocation-repair.md) ·
  [02 -- Persistent knowledge](original-five/02-persistent-knowledge-repair.md) ·
  [10 -- Temporal capacity](next-five/10-temporal-capacity-repair.md) ·
  [01 -- CAA revalidation](original-five/01-caa-revalidation-repair.md) ·
  [22 -- Event window](fifth-five/22-event-window-repair.md) ·
  [14 -- Route policy](third-five/14-route-policy-repair.md) (appended as "Trial 2 (retry)",
  after the preserved INCONCLUSIVE record).

Requested settings are not runtime attestations. Claude model strings were observed in these
captures; Codex model identity, and effort/scaffoldVersion for both CLIs, were not exposed by
either CLI's event stream. Claude-run CLI dollar estimates are cost estimates only -- billing was
subscription-only with `maxMicroUsd: 0` and no paid API fallback; those
estimates are not subscription-charge records. No official adversarial
matrix or three-per-model qualification is claimed by this exploratory round.
