# Round-two screening: five fourth-ranked-five successors, Trial 2

September 9, 2026. Second-round exploratory attempts against the five
[fourth-ranked-five implementation successors](fourth-ranked-five-implementation-plan-2026-09-09.md):
ticket-consolidation-repair (09), partition-index-repair (06), compatible-rollout-repair (05),
document-export-repair (16) and analytical-reconciliation-repair (17). Each package's public
starter is now an empty entry-point skeleton; a service implementation and an independent
checker are both required deliverables; checker reasons are diagnostic-only. This publication
does not change the original Trial 1 results, which remain in the
[screening README's historical table](README.md#read-the-individual-trials) unmodified.

## Execution record

Exactly five real-provider solver attempts ran, all in this single campaign slot (attempt=1 in
the execution store for each package -- a fresh campaign, not an infrastructure retry of any
prior trial). Assignment: 09 and 05 to Claude (`anthropic/claude-opus-5`, `max`); 06, 16 and 17
to Codex (`openai/gpt-5.6-sol`, `xhigh`). All five retain their original Trial 1 model family.

All five jobs were reserved and dispatched within a 216ms window (2026-09-09T16:47:54.943Z --
16:47:55.159Z), and all five `foundry-real-*` containers were observed running concurrently via
`docker ps` immediately after dispatch. Each ran under a signed, subscription-only JobStore
reservation (`maxMicroUsd: 0`, `maxAttempts: 1`, no automatic retries, no paid API fallback), a
10,800-second (3h) wall-clock budget, 2 CPUs / 2 GiB per container. No attempt came close to the
timeout; the longest (compatible-rollout-repair) ran 30m25s. All five reached a clean `completed`
state with no invalid execution or infrastructure error. Host memory headroom was explicitly
checked before dispatch (a prior campaign in this session was interrupted by memory pressure);
free memory ran tight during this campaign (briefly near 60MB) but all five containers completed
without incident.

The dispatch controller reused, byte-for-byte, the isolated runtime built and independently
verified for the first round-two campaign (source digest `2184eee8...`, `dist/index.js`
SHA-256 re-verified unchanged immediately before this dispatch). No new runtime was built.
Exactly zero extra model calls, substitutions, or retries occurred anywhere in this campaign.

## Results

**Five solver passes, zero Foundry reward-zero successes.** Every service suite
and required-checker classification passed.

| Package | Model | Reward | Service | Checker | Authoring time | Execution validity | Recommended next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ticket consolidation (09) | Claude / Opus 5 max | **1** | 33/33 | 13/13 correct | 17m 20s | Valid, real-provider | Retain as a correct control; lower trial priority |
| Partition index (06) | Codex / Sol xhigh | **1** | 17/17 | 12/12 correct | 16m 28s | Valid, real-provider | Retain as a correct control; lower trial priority |
| Compatible rollout (05) | Claude / Opus 5 max | **1** | 18/18 | 11/11 correct | 30m 15s | Valid, real-provider | Retain as a correct control; lower trial priority |
| Document export (16) | Codex / Sol xhigh | **1** | 29/29 | 13/13 correct | 19m 01s | Valid, real-provider | Retain as a correct control; lower trial priority |
| Analytical reconciliation (17) | Codex / Sol xhigh | **1** | 28/28 | 14/14 correct | 12m 58s | Valid, real-provider | Retain as a correct control; lower trial priority -- resolves Trial 1's grading-alignment zero |

### What this campaign adds

- **Two results directly resolve or newly clear a prior issue.** compatible-rollout-repair (05)
  had its checker graded for the first time -- Trial 1 was service-only -- and its contract
  gained new stage lost-response/recovery semantics; both passed cleanly, with the submission
  handling redelivery via an atomically-written pre-job-state journal so rollback always targets
  the true pre-job release regardless of job-side mutation. analytical-reconciliation-repair (17)
  had Trial 1 scored zero by a harness bug requiring one private "primary" label (since fixed
  harness-wide and confirmed via regrade on Trial 1's own preserved bytes, 13/13 up from 5/11);
  this independently-written Trial 2 submission reaches the same clean pass under the corrected
  rule against a checker bank one control larger -- a second, independent confirmation of the
  same capability, not merely a re-scored old result.
- **Three results replicate a stable prior clean pass on the same model.**
  ticket-consolidation-repair (09), partition-index-repair (06) and document-export-repair (16)
  all repeated their Trial 1 clean-pass outcome on the same target. partition-index-repair
  converged on the same structural fix as Trial 1 (per-partition completed-offset tracking,
  version-guarded writes) independently, in an unusually compact 39-event run.
- **Self-testing was substantive across the board, not just claimed.** Every package's completion
  claim was checked against actual grading and found accurate; two were independently
  cross-verified against raw capture evidence rather than taken at face value (partition-index-repair's
  "500 randomized traces" claim was confirmed present in the capture output; document-export-repair's
  checker gained a widened decompression-size guard after the agent reasoned through a legitimate
  inflation scenario it had not initially covered).

No result here rests on an undefined label, an exact-reason-string mismatch, or any of the
grading-alignment concerns that affected earlier batches -- the diagnostic-only reason policy
applies to all five, and every checker verdict was graded on its boolean accept/reject only.

### Candidates for further trials

Retain all five submissions as correct controls. This campaign produced no
reward-zero result, so give the observed failure candidates priority in subsequent
failure-finding trials. Compatible rollout's new checker/recovery work and analytical
reconciliation's corrected grading both passed on fresh submissions; those are
useful construction and measurement findings, not additional model failures.

## Evidence and updated documents

- [Sanitized round-two evidence](evidence/2026-09-09-round-two-fourth-ranked-five.json) --
  per-package requested/observed profile, service and checker breakdowns, timing, token usage,
  and completion/result/grade hashes. All **3,945** manifest-listed files
  were verified against recorded sizes and hashes during publication.
- Campaign record: `.local/round-two-fourth-ranked-five-2026-09-09/` (controller `campaign.mjs`,
  reusing the isolated build at `.local/round-two-top-five-2026-09-09/frozen-source/`, run
  records under `real-campaign-frozen/`).
- Updated analysis documents, each with an appended "Trial 2 -- implementation successor --
  September 9, 2026" section (Trial 1 content unchanged):
  [09 -- Ticket consolidation](next-five/09-ticket-consolidation-repair.md) ·
  [06 -- Partition index](next-five/06-partition-index-repair.md) ·
  [05 -- Compatible rollout](original-five/05-compatible-rollout-repair.md) ·
  [16 -- Document export](fourth-five/16-document-export-repair.md) ·
  [17 -- Analytical reconciliation](fourth-five/17-analytical-reconciliation-repair.md)

Requested settings are not runtime attestations. Claude model strings were observed in these
captures; Codex model identity, and effort/scaffoldVersion for both CLIs, were not exposed by
either CLI's event stream. Claude-run CLI dollar estimates are cost estimates only -- billing was
subscription-only with `maxMicroUsd: 0` and no paid API fallback; those
estimates are not subscription-charge records. No official adversarial
matrix or three-per-model qualification is claimed by this exploratory round.
