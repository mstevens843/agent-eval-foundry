# Trial 5: first opposite-provider attempt on the four continuing packages

> Subsequent coverage audit: temporal Trial 3 and snapshot Trial 3 were false passes under the original checker bank. Their raw rewards below are preserved; the [final-six audit](final-six-pass-audit-2026-09-09.md) supplies the uniform regrade and reopens both packages. Exclusion conclusions below describe the original grading only.

**Three of four packages passed their first opposite-provider attempt. The fourth,
incremental build (21), failed a fourth consecutive time — and its first-ever Claude
submission was confirmed, at the code level, to share the identical ordering defect as
all three prior Codex submissions.** Temporal capacity (10) is now the second package
(after snapshot recovery) whose six-run set can no longer reach the reported five-of-six
threshold, regardless of its remaining outcomes.

September 9, 2026. One fresh, independently-written, opposite-provider attempt for each of
the four packages still within the reported 5/6 target after Trials
2–4: variant-cache-repair (19, Claude → **Codex**), incremental-build-repair
(21, Codex → **Claude**), issued-report-repair (25, Claude → **Codex**) and
temporal-capacity-repair (10, Claude → **Codex**). Snapshot-recovery-repair (11) was
excluded: its 0→1→1 record already caps its six-run set at 4 possible failures, below
the reported threshold. Package bytes, public contract, private controls and grading
route are unchanged from Trials 2–4 — the controller hard-asserted this, and separately
hard-asserted that the provider actually switched, before dispatch. Solvers received only
the original public task inputs: no prior submissions, analysis, private controls, or this
campaign's operator handoff. This publication does not change any Trial 1–4 result, which
remain unchanged in their respective documents.

## Execution record

All four jobs were reserved and dispatched within a 172ms window
(2026-09-09T20:55:29.274Z – 20:55:29.446Z), confirmed running concurrently via `docker ps`
immediately after dispatch. Each ran under a signed, subscription-only JobStore
reservation (`maxMicroUsd: 0`, `maxAttempts: 1`, no automatic retries, no paid API
fallback), the same 10,800-second (3h) wall-clock budget, 2 CPUs / 2 GiB per container,
and the switched provider's established profile (Claude `anthropic/claude-opus-5` /
`max` / CLI `2.1.263`; Codex `openai/gpt-5.6-sol` / `xhigh` / CLI `0.153.2`), with every
other profile field (limits, image, network, credentials, grading route, provenance)
held identical to the package's own prior profile. No attempt came close to the timeout;
the longest (variant-cache-repair) ran 30m56s, the shortest (temporal-capacity-repair)
6m49s. All four reached a clean `completed` state with no invalid execution or
infrastructure error. The dispatch controller reused, byte-for-byte, the isolated runtime
built and independently verified for the first round-two campaign; its own read-only
`verify` mode and this session's independent hash checks both confirmed zero drift before
dispatch. All 3,631 manifest-listed files (111,137,143 bytes) across the four completed
records were reverified with zero errors.

## Results

| Package | Provider switch | T2 | T3 | T4 | T5 | Service | Checker | What changed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Variant cache (19) | Claude → **Codex** | 0 | 0 | 0 | **1** | 25/25 | 15/15 | First pass; new checker closes the wildcard-eviction gap |
| Incremental build (21) | Codex → **Claude** | 0 | 0 | 0 | **0** | 27/27 | 14/15 | **Fourth zero — identical defect, confirmed across both providers** |
| Issued report (25) | Claude → **Codex** | 0 | 0 | 0 | **1** | 27/27 | 14/14 | First pass; new checker catches `reverse-dependency-order` |
| Temporal capacity (10) | Claude → **Codex** | 0 | 1 | 0 | **1** | 34/34 | 13/13 | Second pass — **six-run set now capped at 4/6** |

### What actually happened, and how precisely

- **Incremental build (21) — the round's central finding: exact recurrence across a
  provider switch, confirmed by code reading.** This was the package's first-ever Claude
  attempt after three consecutive Codex failures. It failed the same way: the checker
  missed the identical `premature-publication` candidate. Reading this Trial 5
  `checker.mjs` and its shared `core.mjs` helper directly shows the identical mechanical
  gap already established for the three Codex submissions: `readLedger()` builds one
  post-hoc, order-blind map of every handle from all `compile`/`inspect`/`artifacts`
  observations, and the validator checks a published handle only against that final
  ledger entry's structural correctness — never comparing a `compile` observation's
  sequence number against the `publish` observation's sequence for the round that
  references it. This is independently corroborated without reading a single line of
  code: this record's checker-grade-summary file is byte-identical (same SHA-256) to
  Trial 3's and Trial 4's, meaning the accept/reject verdict matched on every one of the
  15 candidates across the provider switch. **Four independent submissions, two different
  providers, have now converged on the identical ordering blind spot** — meaningfully
  stronger evidence of a provider-independent gap (in either the public contract's
  clarity or a broadly shared reasoning blind spot for this specific ordering invariant)
  than the three-Codex-only finding from Trial 4.
- **Variant cache (19) and issued report (25) — first opposite-provider pass, ending
  three-attempt failure streaks.** Both fresh checkers (Codex, first attempt on either
  package) closed previously observed gaps: variant cache's checker ties eviction-legality to the same predicate that
  already excludes wildcard entries, closing the `wildcard-eviction` gap; issued report's
  checker reconstructs dependency order recursively in `reconcile()`, a different design
  from Trial 4's step-granularity comparison, catching `reverse-dependency-order`. Issued report’s
  service passed all 27 cases in each successor trial; variant cache’s earlier services
  passed 24/25, 5/25 and 3/25 respectively, before this 25/25 result. One data point on one provider
  switch does not establish a stable pass rate for either package.
- **Temporal capacity (10) — second pass; the six-run set is now capped below 5/6.**
  This Codex checker caught `unread-empty-source` — missed by two of the three Claude
  attempts (T2 and T4) — via a third distinct fetch-completeness approach: unconditional
  cursor-chain traversal. The package's run history is now fail→pass→fail→pass across
  T2–T5 (2 failures, 2 passes), with only 2 attempts remaining. The maximum possible
  total failures for this package's six-run set is 2 + 2 = **4, below the reported
  5-of-6 threshold regardless of the outcome of the two remaining Codex attempts.** This
  is an arithmetic ceiling, not a prediction. Temporal capacity is now the second package
  (after snapshot recovery) whose six-run set can no longer reach the reported acceptance
  bar.

### Progress toward the reported five-of-six acceptance threshold

The user reports that the CEO accepts **at least five failures out of six scored
attempts**, with **three Claude and three Codex** on each unchanged package. Four of six
attempts are now scored for each continuing package; two opposite-provider attempts
remain per package.

| Package | Runs so far | Failures / scored | Remaining attempts | Failures needed from remaining two | Within 5-of-6? |
| --- | --- | --- | --- | --- | --- |
| Incremental build (21) | 3 Codex + 1 Claude | **4/4** | 2 Claude | At least 1 | Yes — closest to threshold |
| Variant cache (19) | 3 Claude + 1 Codex | **3/4** | 2 Codex | **Both** | Yes — tightened this round |
| Issued report (25) | 3 Claude + 1 Codex | **3/4** | 2 Codex | **Both** | Yes — tightened this round |
| Temporal capacity (10) | 3 Claude + 1 Codex | **2/4** | 2 Codex | Impossible (max 4) | **No — ceiling breached** |
| Snapshot recovery (11), excluded | 3 Codex | 1/3 | — | — | No (already breached in Trial 4) |

Incremental build needs only one more failure from its two remaining Claude attempts —
the shortest remaining path of any continuing package, and the package with the
strongest cross-provider recurrence evidence. Variant cache and issued report each now
need *both* remaining Codex attempts to fail; a single further pass on either caps that
package at 4/6. Temporal capacity has joined snapshot recovery outside the reported
threshold. No further attempts are launched by this publication.

## Evidence and updated documents

- [Sanitized Trial 5 evidence](evidence/2026-09-09-round-five-continuing-four.json) — per-package
  requested/observed profile, provider-switch confirmation, service and checker breakdowns,
  Trial 2–4 comparison, timing, token usage, and completion/result/grade hashes.
- Reverified all **3,631 manifest-listed files (111,137,143 bytes)** from the four
  completed records with no errors.
- Campaign record: `.local/round-five-continuing-four-2026-09-09/` (controller `campaign.mjs`,
  reusing the isolated build at `.local/round-two-top-five-2026-09-09/frozen-source/`, run
  records under `real-campaign-frozen/`).
- Updated analysis documents, each with an appended "Trial 5 — first opposite-provider
  attempt — September 9, 2026" section (Trials 1–4 content unchanged):
  [19 — Variant cache](fourth-five/19-variant-cache-repair.md) ·
  [21 — Incremental build](fifth-five/21-incremental-build-repair.md) ·
  [25 — Issued report](fifth-five/25-issued-report-repair.md) ·
  [10 — Temporal capacity](next-five/10-temporal-capacity-repair.md)

Requested settings are not runtime attestations. Claude model strings were observed in
these captures; Codex model identity, and effort/scaffoldVersion for both CLIs, were not
exposed by either CLI's event stream. Claude-run CLI dollar estimates are cost estimates
only — billing was subscription-only with `maxMicroUsd: 0`; the estimates are not
subscription charges. No official adversarial matrix or three-per-model qualification is
claimed by this exploratory round; this is a fourth data point per package and the first
across a provider switch, not a completed hardness measurement. A checker-grade-summary
hash match across independently-written submissions is used here as corroborating
evidence for a code-level recurrence finding, not as a substitute for reading the actual
code — every recurrence claim in this document was verified against the actual submitted
`checker.mjs`.
