# Trial 3: repeating the five Trial 2 zeroes

**Three packages now have two consecutive recorded reward-zero results on unchanged
successors: incremental build (21), issued report (25) and variant cache (19).**
All five Trial 3 attempts completed without infrastructure errors. Snapshot recovery
(11) and temporal capacity (10) passed this attempt; both remain within the
user-reported CEO acceptance threshold of at least five failures in six attempts.

September 9, 2026. One fresh, independently-written, same-provider attempt for each of the five
packages that recorded reward 0 in Trial 2: variant-cache-repair (19, Claude), incremental-build-repair
(21, Codex), issued-report-repair (25, Claude), snapshot-recovery-repair (11, Codex) and
temporal-capacity-repair (10, Claude). Package bytes, public contract, private controls and
requested profile are byte-identical to each package's Trial 2 record — the controller hard-asserted
this before dispatch. These are fresh solver attempts under the same recorded setup.
Solvers received only the original public task inputs: no prior
submissions, analysis, or this campaign's operator handoff. This publication does not change any
Trial 1 or Trial 2 result, which remain unchanged in their respective documents.

## Execution record

All five jobs were reserved and dispatched within a 217ms window (2026-09-09T19:02:12.628Z –
19:02:12.845Z), confirmed running concurrently via `docker ps` immediately after dispatch. Each
ran under a signed, subscription-only JobStore reservation (`maxMicroUsd: 0`, `maxAttempts: 1`, no
automatic retries, no paid API fallback), the same 10,800-second (3h) wall-clock budget, 2 CPUs /
2 GiB per container, and the same requested model/effort/CLI as each package's Trial 2 attempt
(Claude `anthropic/claude-opus-5` / `max` / CLI `2.1.263`; Codex `openai/gpt-5.6-sol` / `xhigh` /
CLI `0.153.2`). No attempt came close to the timeout; the longest (variant-cache-repair) ran
24m38s. All five reached a clean `completed` state with no invalid execution or infrastructure
error. The dispatch controller reused, byte-for-byte, the isolated runtime built and independently
verified for the first round-two campaign; its own read-only `verify` mode and this session's
independent hash checks both confirmed zero drift before dispatch.

## Results

| Package | Provider | Trial 2 | Trial 3 | Service | Checker | Recurrence |
| --- | --- | --- | --- | --- | --- | --- |
| Variant cache (19) | Claude | 0 | **0** | **5/25 pass; 20 fail** (`origin_load`) | 14/15 (same miss) | Checker exact, service different |
| Incremental build (21) | Codex | 0 | **0** | 27/27 (same) | 14/15 (same miss) | Exact — identical root cause |
| Issued report (25) | Claude | 0 | **0** | 27/27 (same) | 12/14 (same 2 FPs) | Related — same symptom, different bug |
| Snapshot recovery (11) | Codex | 0 | **1** | 33/33 | 12/12 | Prior defect avoided this attempt |
| Temporal capacity (10) | Claude | 0 | **1** | 34/34 | 13/13 | Prior defect avoided this attempt |

Three of five repeated their Trial 2 zero; two passed cleanly. A pass ends a literal
failure streak but does not erase the earlier failure from a five-of-six record.

### What actually recurred, and how precisely

- **Incremental build (21) — exact recurrence, confirmed by code reading.** Both Trial 2's and
  this Trial 3's independently-written checkers verify structural/content-addressed correctness
  recursively but never compare the sequence at which a handle was minted (`compile()`) against
  the sequence at which it was published — the identical gap, missing the identical
  `premature-publication` candidate. Two fresh Codex/xhigh sessions, no shared context, converged
  on the same specific ordering blind spot. This package has two failures in its first two
  Codex attempts; the next prepared attempt is the third Codex run.
- **Issued report (25) — related recurrence, same symptom via a different bug.** Both checkers
  reject 100% of the known-good candidate bank (`reference`, `alternative`), but the mechanism
  differs: Trial 3's checker correctly unwraps the `{after, record}` `Publication` wrapper (Trial
  2's did not), yet never checks for `.receipt` on delivery rows, so deliveries pass through
  unwrapped and produce incorrect comparison keys. Two independent Claude/max attempts failed
  this required deliverable through related bugs. The claimed self-tests did not expose the
  mismatch that caused rejection of both known-good grading candidates. This package has
  two failures in its first two Claude attempts.
- **Variant cache (19) — mixed recurrence.** The checker missed the *identical* `wildcard-eviction`
  candidate as Trial 2 (same expected/observed check) — genuine recurrence. But the service failed
  differently: Trial 2 failed one scenario (`cache_provenance`); this attempt fails 20 of 25 on
  `origin_load`, with an empty final cache in the inspected cell. The exact code-level cause
  has not been established. Trial 3's origin-budget failure is independently supported;
  the existing Trial 2 matching/replacement attribution note remains attached to that earlier
  result. A different service bug does not invalidate the new failure or require a reset.
- **Snapshot recovery (11) and temporal capacity (10) — passed this attempt.** Both fresh
  checkers avoided their respective Trial 2 mistakes with a more general, defensive design
  (snapshot recovery's `decodeArchiveValue()` type-checks the input before deciding how to handle
  it; temporal capacity's fetch-check is unconditional and its own test suite includes a test
  named for the condition Trial 2 missed). Each now has one failure and one pass. Two
  observations cannot establish a stable failure rate or prove that the failure was a one-off.

### Progress toward the reported five-of-six acceptance threshold

The user reports that the CEO accepts **at least five failures out of six scored
attempts**, with **three Claude and three Codex** on each unchanged package. Six
consecutive failures remains the stronger aspiration. Count all attempts in the
planned set; do not discard a pass or pool results across packages.

| Package | Runs so far | Failures / scored | Consecutive recorded zeroes | Failures needed from remaining four |
| --- | --- | --- | --- | --- |
| Incremental build (21) | 2 Codex | **2/2** | **2** | At least 3 |
| Issued report (25) | 2 Claude | **2/2** | **2** | At least 3 |
| Variant cache (19) | 2 Claude | **2/2** | **2** | At least 3 |
| Snapshot recovery (11) | 2 Codex | **1/2** | 0 | All 4 |
| Temporal capacity (10) | 2 Claude | **1/2** | 0 | All 4 |

**All five remain within the numerical threshold.** No package has completed its
six-run set yet. A second solver pass would put that package's planned six-run set
below 5/6. The next prepared batch keeps each provider again, completing the first
three same-provider runs; the three opposite-provider runs come afterward.
Different valid failure mechanisms and required-checker-only failures can count.
Exact repetition of a particular bug is not an added acceptance requirement.

The next attempt is **Trial 4 in the original histories and the third attempt on
these unchanged successors**. [Prepared controller and handoff](../../docs/round-four-failing-five-handoff.md).
This documentation and preparation launch no additional model attempts.

## Evidence and updated documents

- [Sanitized Trial 3 evidence](evidence/2026-09-09-round-three-failing-five.json) — per-package
  requested/observed profile, service and checker breakdowns, Trial 2 comparison, timing, token
  usage, and completion/result/grade hashes.
- Reverified all **4,448 manifest-listed files (114,263,397 bytes)** from the five
  completed records with no errors. Two published `outcome` fields had copied the
  service pass instead of the overall result; they now match raw `result.json`,
  with `serviceOutcome` recorded separately. Raw grades and scores were unchanged.
- Campaign record: `.local/round-three-failing-five-2026-09-09/` (controller `campaign.mjs`,
  reusing the isolated build at `.local/round-two-top-five-2026-09-09/frozen-source/`, run
  records under `real-campaign-frozen/`).
- Updated analysis documents, each with an appended "Trial 3 — repeat attempt — September 9, 2026"
  section (Trial 1 and Trial 2 content unchanged):
  [19 — Variant cache](fourth-five/19-variant-cache-repair.md) ·
  [21 — Incremental build](fifth-five/21-incremental-build-repair.md) ·
  [25 — Issued report](fifth-five/25-issued-report-repair.md) ·
  [11 — Snapshot recovery](third-five/11-snapshot-recovery-repair.md) ·
  [10 — Temporal capacity](next-five/10-temporal-capacity-repair.md)

Requested settings are not runtime attestations. Claude model strings were observed in these
captures; Codex model identity, and effort/scaffoldVersion for both CLIs, were not exposed by
either CLI's event stream. Claude-run CLI dollar estimates are cost estimates only — billing was
subscription-only with `maxMicroUsd: 0`; the estimates are not subscription charges. No official adversarial matrix
or three-per-model qualification is claimed by this exploratory round; this is a second data
point per package, not a completed hardness measurement.
