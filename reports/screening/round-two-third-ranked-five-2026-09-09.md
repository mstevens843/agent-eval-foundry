# Round-two screening: five third-ranked-five successors, Trial 2

September 9, 2026. **One new Foundry success: snapshot recovery returned reward 0
because its required checker rejected correct implementations.** The other four
attempts returned reward 1. Second-round exploratory attempts against the five
[third-ranked-five implementation successors](third-ranked-five-implementation-plan-2026-09-09.md):
capacity-maintenance-repair (13), partial-release-repair (08), rule-index-repair (15),
verified-installation-repair (12) and snapshot-recovery-repair (11). Each package's public
starter is now an empty entry-point skeleton; a service implementation and an independent
checker are both required deliverables; checker reasons are diagnostic-only. This publication
does not change the original Trial 1 results, which remain in the
[screening README's historical table](README.md#read-the-individual-trials) unmodified.

## Execution record

Exactly five real-provider solver attempts ran, all in this single campaign slot (attempt=1 in
the execution store for each package -- a fresh campaign, not an infrastructure retry of any
prior trial). Assignment: 15 to Codex (`openai/gpt-5.6-sol`, `xhigh`); 13 and 08 to Claude
(`anthropic/claude-opus-5`, `max`); 12 and 11 to Codex. `rule-index-repair` switches from its
Trial 1 Claude pairing to Codex this round; the other four keep their original model pairing.

All five jobs were reserved and dispatched within a 231ms window (2026-09-09T15:08:41.798Z --
15:08:42.029Z), and all five `foundry-real-*` containers were observed running concurrently via
`docker ps` immediately after dispatch. Each ran under a signed, subscription-only JobStore
reservation (`maxMicroUsd: 0`, `maxAttempts: 1`, no automatic retries, no paid API fallback), a
10,800-second (3h) wall-clock budget, 2 CPUs / 2 GiB per container. No attempt came close to the
timeout; the longest (rule-index-repair) ran 19m50s. All five reached a clean `completed` state
with no invalid execution or infrastructure error -- unlike the immediately preceding campaign
(next-five group), where one job (route-policy-repair) was interrupted by host memory pressure.
That interruption belongs to the preceding campaign. The operator checked memory
headroom before this dispatch, and these five containers completed without incident;
this observation does not establish that the precheck caused the different outcome.

The dispatch controller reused, byte-for-byte, the isolated runtime built and independently
verified for the first round-two campaign (source digest `2184eee8...`, `dist/index.js`
SHA-256 re-verified unchanged immediately before this dispatch). No new runtime was built.
Exactly zero extra model calls, substitutions, or retries occurred anywhere in this campaign.

## Results

| Package | Model | Reward | Service | Checker | Authoring time | Execution validity | Recommended next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Capacity maintenance (13) | Claude / Opus 5 max | **1** | 27/27 | 12/12 correct | 18m 28s | Valid, real-provider | Lower priority for failure-finding trials; retain as a correct control |
| Partial release (08) | Claude / Opus 5 max | **1** | 33/33 | 11/11 correct | 15m 33s | Valid, real-provider | Retain as a correct control; prior reason-format defect resolved |
| Rule index (15) | Codex / Sol xhigh | **1** | 26/26 | 13/13 correct | 19m 44s | Valid, real-provider | Lower priority for failure-finding trials; retain as a correct control |
| Verified installation (12) | Codex / Sol xhigh | **1** | 45/45 | 13/13 correct | 17m 51s | Valid, real-provider | Lower priority for failure-finding trials; retain as a correct control |
| Snapshot recovery (11) | Codex / Sol xhigh | 0 | **33/33** | 10/12 (2 false positives) | 18m 01s | Valid, real-provider | Prioritize another trial of this unchanged package |

Bold marks a fully correct dimension. Four of five packages produced a fully correct service
implementation **and** a fully correct checker -- clean passes on both deliverables. The fifth
(snapshot-recovery-repair) has a fully correct service but a checker that rejects both of its
own package's known-good reference implementations.

### New reward-zero success and other findings

The single reward-zero outcome is a supported failure of a required deliverable.
Reading the submitted checker and executing its unchanged bytes against the retained
fixtures reproduced the false rejections:

- **Checker-authoring gap, substantive, not a service capability failure:** snapshot-recovery-repair
  (11). `checker.mjs`'s `archiveBytes()` assumes `publications[0].archive` is a base64 string or
  `{bytes: string}`, but the actual harness input is already the decoded state object. This causes
  all 12 candidates to fail that path; the 10 genuinely-broken negative controls happen to still
  land on the correct verdict by coincidence, but both known-good positive candidates (`reference`,
  `alternative`) are wrongly rejected -- 2 false positives, 0 missed. This is the same failure
  pattern seen in `issued-report-repair` in the first round-two campaign: a checker that rejects correct implementations. The agent's self-tests used its own constructed input shapes and did not catch
  the assertion. Publicly documented API observations already supplied the archive
  bytes: all four cells of each positive candidate contained bytes that decoded to
  the published archive object. The submitted checker even had observation-reading
  code, but rejected the case before reaching it.
- **Partial release resolves a prior grading issue; rule index repeats a pass:** partial-release-repair (08) had
  the same correct service/checker logic in Trial 1 but was scored zero by a grader bug requiring
  byte-exact reason-string equality; that bug was fixed (confirmed via regrade) and this
  independently-written Trial 2 submission now passes cleanly under the corrected diagnostic-only
  policy. rule-index-repair (15) also passed cleanly, on its first Codex attempt after a prior
  Claude pass, including a newer bounded-work negative control absent from Trial 1's bank.
- **Two results replicate a stable prior clean pass:** capacity-maintenance-repair (13) and
  verified-installation-repair (12) both repeated their Trial 1 clean-pass outcome. Notably,
  capacity-maintenance-repair hit the *same* NUL-separator encoding friction Trial 1 recorded --
  the same defect class recurring across two independent trials, self-diagnosed and fixed both
  times -- and verified-installation-repair's fresh submission converged on the same two-pass
  layer-merge structure as Trial 1. Similar structure does not establish access to
  or reuse of the earlier submission.

No result here rests on an undefined label, an exact-reason-string mismatch, or any of the
grading-alignment concerns that affected earlier batches -- the diagnostic-only reason policy
applies to all five, and every checker verdict was graded on its boolean accept/reject only.

### Candidates for further trials

**Snapshot recovery (11) is this group's first candidate for another trial on its
unchanged version.** The reward-zero objective covers the required service and
checker together. A service pass does not erase an incorrect required checker, and
no benchmark rule requires a decoder tutorial before measuring recurrence.

The [TB implementation rubric](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-implementation.toml)
requires tests to follow the task's requirements and custom schemas to be supplied;
it permits expert inference and does not require listing every test or providing
solution steps. Here, the archive contract and documented API observations supply
the needed facts. The eight positive cells confirm that route directly.

Retain the failed submission unchanged as evidence. Prioritize another measured
attempt over modifying this task to teach the missing check. The other four
packages were solved and are lower priority for the current failure search. These
observations establish one new success, not a repeated failure rate.

## Evidence and updated documents

- [Sanitized round-two evidence](evidence/2026-09-09-round-two-third-ranked-five.json) --
  per-package requested/observed profile, service and checker breakdowns, timing, token usage,
  and completion/result/grade hashes. All **3,726** manifest-listed files were
  size- and hash-verified during publication; the offline diagnostic made zero new
  model calls and did not change the submitted checker or original score.
- Campaign record: `.local/round-two-third-ranked-five-2026-09-09/` (controller `campaign.mjs`,
  reusing the isolated build at `.local/round-two-top-five-2026-09-09/frozen-source/`, run
  records under `real-campaign-frozen/`).
- Updated analysis documents, each with an appended "Trial 2 -- implementation successor --
  September 9, 2026" section (Trial 1 content unchanged):
  [13 -- Capacity maintenance](third-five/13-capacity-maintenance-repair.md) ·
  [08 -- Partial release](next-five/08-partial-release-repair.md) ·
  [15 -- Rule index](third-five/15-rule-index-repair.md) ·
  [12 -- Verified installation](third-five/12-verified-installation-repair.md) ·
  [11 -- Snapshot recovery](third-five/11-snapshot-recovery-repair.md)

Requested settings are not runtime attestations. Claude model strings were observed in these
captures; Codex model identity, and effort/scaffoldVersion for both CLIs, were not exposed by
either CLI's event stream. Claude-run CLI dollar estimates are cost estimates only -- billing was
subscription-only with `maxMicroUsd: 0` and no paid API fallback. Those estimates
do not establish a subscription charge. No official adversarial
matrix or three-per-model qualification is claimed by this exploratory round.
