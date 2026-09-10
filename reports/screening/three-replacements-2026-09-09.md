# Three replacements: all five finalists now meet the reported threshold

**All three replacement attempts failed. Both remaining pending packages now meet
the reported five-of-six threshold: variant cache at 6/6, snapshot recovery at 5/6.
All five successor finalists now meet the "at least five failures out of six"
target.** Every replacement's base service and base checker passed cleanly — the
failures again came entirely from the newest, narrowly-targeted supplemental
controls, each independently confirmed as a required-checker-only defect by a
passing service-level replay.

September 9, 2026. This campaign ran the three fresh Codex replacements for the attempts
the user elected to void after the [remaining-pass audit](remaining-pass-audit-2026-09-09.md)
(`remaining-pass-coverage-v3`, extending `post-final-coverage-v2` and `final-six-coverage-v1`)
confirmed genuine checker defects in variant-cache-repair Trials 6 and 7, and
snapshot-recovery-repair Trial 4. Before dispatching anything, this session
independently reproduced the entire audit from scratch
(`node scripts/reproduce-remaining-pass-audit.mjs`, zero provider calls, real Docker
execution against the frozen harness and the actual retained submissions) and it
matched the published evidence and disposition exactly. Package bytes, public
contracts, private controls and grading routes remain unchanged throughout. Solvers
received only the original public task inputs — no prior submissions, analysis, any
audit, or this campaign's operator handoff.

## Void-and-replace accounting

Per explicit user disposition, the three newly-identified false passes are **voided**,
not counted as failures:

| Package | Voided trial | Original reward | Diagnostic v3 regrade | Counted reward |
| --- | --- | --- | --- | --- |
| Variant cache (19) | Trial 6 | 1 | 0 | **null** |
| Variant cache (19) | Trial 7 | 1 | 0 | **null** |
| Snapshot recovery (11) | Trial 4 | 1 | 0 | **null** |

These three records are permanently preserved exactly as originally published — never
overwritten, renumbered, or counted alongside their replacement. Earlier documented
regrades from `final-six-coverage-v1` and `post-final-coverage-v2` remain counted as
before; only these three newly-identified findings were voided.

## Execution record

Three attempts were authorized and launched together (concurrency cap of six): two
independent, blind variant-cache-repair replacements (Trial 8 replacing the void at
Trial 6, Trial 9 replacing the void at Trial 7) and one snapshot-recovery-repair
replacement (Trial 8 replacing the void at Trial 4) — all Codex, matching the voided
attempts' original provider. All three ran under the same signed, subscription-only
JobStore reservations, 2 CPUs/2 GiB per container, and 10,800-second budgets as every
prior trial. No attempt came close to the timeout; durations ranged 18m14s to 25m33s.
All three reached a clean `completed` state with no invalid execution or infrastructure
error, and the parent runner reported zero errors. Grading applied the original package
grade, the cumulative `remaining-pass-coverage-v3` checker supplement, and an additional
service-coverage replay (including the repaired 304-metadata check) to every submission.
All 2,729 manifest-listed files (123,073,664 bytes) across the three completed records
were reverified with zero errors.

## Results

| Package | Attempt | Replaces | Base service | Base checker | Supplement | Service replay | Recorded | Counted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Variant cache (19) | Trial 8 | void Trial 6 | 25/25 | 15/15 | 6/8 fail | pass | 1 | **0** |
| Variant cache (19) | Trial 9 | void Trial 7 | 25/25 | 15/15 | 6/8 fail | pass | 1 | **0** |
| Snapshot recovery (11) | Trial 8 | void Trial 4 | 33/33 | 12/12 | 17/18 fail | pass | 1 | **0** |

Every base service and base (original-bank) checker result was fully correct across
all three attempts. Every service-coverage replay passed, independently confirming each
failure is a required-checker-only defect, not a service bug.

### What actually happened, and how precisely

- **Variant cache (19) — a third and fourth independent Codex checker reject the
  same legitimate tier copy.** Both replacements failed on the identical candidate,
  `copy-other-path-control` (a valid cross-tier copy of an already-cached entry during
  a *different* path's get), via two different specific messages: Trial 8 reported
  "get b stored a fabricated or non-storable entry"; Trial 9 reported "illegal cache
  write to edge-b." Reading both checkers directly confirms the same structural mistake
  already established for the voided Trials 6 and 7: Trial 8's `legalGetWrite()` and
  `derivedFromCopy()` disqualify any entry whose path doesn't match the current event's
  path; Trial 9's `legalGetWrite()`/`possibleCopyReps()` doubly filters candidate copies
  the same way. Four independent Codex submissions (two voided, two fresh) have now
  rejected this exact class of valid behavior — four for four — even though two of the
  four are excluded from the official count by the user's disposition.
  Both latest cache checkers also incorrectly accepted `stale-304-metadata-control`:
  the trace retains old cache metadata after successful 304 revalidation. Their 6/8
  score therefore contains two errors, one false rejection and one missed invalid
  execution. Their own service replays handled that scenario correctly.
- **Snapshot recovery (11) — a new, independently-discovered defect, not a repeat of
  Trial 4's mistake.** The replacement's checker correctly classified all 17 other
  cumulative controls, including the numeric-name-coercion case Trials 5/6 had missed
  and the intermediate-write case earlier trials handled correctly. Its one failure was
  `replace-staged-archive-control`: a valid pattern where the service stages one archive
  payload, then legitimately replaces it with the correct payload before publication —
  the contract only requires the *final* published state to be correct. Reading
  `checker.mjs` shows it applies its full request-shape validation to *every* archive
  call rather than only the last one before publish, so the initial placeholder call
  alone fails validation. This is a genuinely different defect from Trial 4's original
  mistake (a spurious `successfulCommits > 0` requirement before publication) — same
  general pattern of over-strict validation, but a different code path and a different
  contract obligation, independently discovered on a fresh submission.

## Final classification — all five successor finalists now meet the threshold

| Package | Counted failures / trials | Provider balance | Classification |
| --- | --- | --- | --- |
| Incremental build (21) | 6/6 | 3 Claude + 3 Codex (complete) | Meets ≥5/6 *(unaffected)* |
| Issued report (25) | 6/6 | 3 Claude + 3 Codex (complete) | Meets ≥5/6 *(unaffected)* |
| **Variant cache (19)** | **6/6** | 3 Claude + 3 Codex (complete) | **Meets ≥5/6** |
| **Snapshot recovery (11)** | **5/6** | 3 Codex + 3 Claude (complete) | **Meets ≥5/6** |
| Temporal capacity (10) | 5/6 | 3 Claude + 3 Codex (complete) | Meets ≥5/6 *(unaffected)* |

No package was left unresolved by infrastructure. All five successor finalists now
have a complete, exactly balanced three-per-provider six-run set that meets the
reported "at least five failures out of six" threshold. Meeting the numerical
screening target does not itself claim that every final rubric or
cheat-qualification requirement is complete.

## Evidence and updated documents

- [Sanitized three-replacements evidence](evidence/2026-09-09-three-replacements.json) —
  per-attempt base service/checker, supplement, and service-replay breakdowns,
  original/counted reward, void accounting, timing, token usage, and
  completion/result/grade hashes.
- Reverified all **2,729 manifest-listed files (123,073,664 bytes)** from the three
  completed records with no errors.
- Independently reproduced the `remaining-pass-coverage-v3` audit from scratch before
  dispatch (`scripts/reproduce-remaining-pass-audit.mjs`); the reproduction matched the
  published [remaining-pass audit](remaining-pass-audit-2026-09-09.md), its
  [sanitized evidence](evidence/2026-09-09-remaining-pass-audit.json), and the
  [counting disposition](evidence/2026-09-09-three-replacement-disposition.json)
  exactly.
- Campaign record: `.local/three-replacements-2026-09-09/` (parent runner
  `scripts/run-three-replacements.mjs`, per-attempt logs, adjudications, and
  `FINAL.json`); raw provider records under each package's own trial directory.
- Updated analysis documents, each with an appended final dated section (all prior
  trial and audit sections, including the voided attempts, unchanged):
  [19 — Variant cache](fourth-five/19-variant-cache-repair.md) ·
  [11 — Snapshot recovery](third-five/11-snapshot-recovery-repair.md).
- The audit, disposition, and preparation evidence JSONs referenced above remain
  immutable; this document and its evidence are a new, separate follow-up record.

Requested settings are not runtime attestations. Codex model identity, and
effort/scaffoldVersion, were not exposed by the CLI's event stream. Codex CLI never
reports a price. No official adversarial matrix or three-per-model qualification is
claimed by this exploratory program; each package's counted six-run set is one
complete, provider-balanced data point, corroborated throughout by code-level
verification against the actual submitted checkers and by independent service-level
replays, rather than inferred from reward numbers alone.
