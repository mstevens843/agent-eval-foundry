# 09 — Ticket consolidation repair

Completed one Claude attempt, requested Opus 5 / max. Reward **1**. Authoring **14m 07s**; service **33/33** scenarios; checker **12/12** candidates with all ten negative controls correctly named.

## What the task was, in plain English

Repair a bulk ticket migration: find every open ticket in the allowed tenants, assign its tenant-specific team owner and add a marker label. Pages may overlap, be empty before the end, or require a fresh continuation. Batch updates can partially succeed and return results out of order. Meanwhile, another editor can change labels and notes. The migration must finish without losing those edits or touching unrelated tickets.

## What was in the frozen package

Four modules (pages, selection, update and service), two visible test files, a typed API and full public service/checker contracts. Service grading used 33 scenarios and completion, ownership, labels, preservation and conditional_writes. Checker grading covered two correct implementations and ten negative controls.

The visible contract limits the population to 100 rows, 30 pages and four tenants, guarantees that selected rows are not deleted, and allows at most two conflicts per row. Those are real guarantees; extending them secretly would invalidate a later hardness claim.

## Concrete repair, compared with the starter

The final implementation collected complete pages, qualified deduplication by tenant and ticket ID, resolved owners per tenant, and matched partial batch responses by identity. Conflicted rows were reread; patches were rebuilt from current labels while leaving note/status fields untouched. It also performed a final readback and retried remaining incomplete entries. This is why a stale snapshot or a successful batch envelope did not silently become a claim that every row was migrated.

## What the agent did and what grading observed

The task requires a complete tenant-scoped migration despite duplicate/empty/expired pages, per-row partial results and concurrent edits. It must resolve each tenant's owner independently and preserve labels, notes and unrelated tickets.

Claude changed all four service modules and added checker.mjs. All 32 recorded tools were Bash calls, including shell-based file writes. The event-based filesTouched list is therefore empty even though files changed; the final evidence uses byte comparisons against the frozen starter instead.

The implementation qualifies identity by tenant plus ticket ID, gathers pages, handles expiration, resolves owners per tenant, batches updates, maps results by identity rather than position, rereads conflicts and rebuilds patches with current labels. It confirms outcomes and retries unsettled work within the task's bounded conflict assumptions.

The agent built its own host, judge and mutant bank, then exercised checker classifications, trace variations, API edges and a larger synthetic population. Those tests supported a solution that the independent verifier accepted. This run did not exhibit the hoped-for secondary-invariant miss.

## What to improve next

A successor needs more than a larger ticket count or another retry knob. Candidate native interactions include explicitly authorized changes in selection eligibility during a long migration, independently revocable migration scope, or richer ownership relationships where preserving other applications' updates is essential. Each changes the actual product contract and requires reachable positive completion plus independent evidence.

First inspect the saved implementation for bounded, contract-valid near misses. The service's bounded retry strategy is not inherently wrong: do not secretly exceed published conflict bounds merely to make it fail. Its internal linear lookup could be improved for large populations, but no unmet performance requirement was demonstrated here.

Keep identity-aware result checks, positive work, all permitted alternatives, and preservation checks. Test explicit labels-plus-explanation schemas in checker fixtures so the partial-release formatting defect is not repeated.


## Evidence and publication limits

[Sanitized trial record](../evidence/2026-09-08-next-five.json) includes package/profile hashes, submitted-file deltas, observed settings, independent service and checker counts, and hashes of the retained completion manifest and grade. All files listed by that manifest were hash-verified during publication. [Batch index](../README.md) explains the evidence boundary.

The raw transcript and full submitted workspace remain in restricted local storage; this is an editorial analysis of the recorded actions and artifacts, not a publication of private internal reasoning or independently blind-adjudicated evidence. The current [task source](../../../tasks/ticket-consolidation-repair/) may have a different build identity. Suggestions are for a new version, not changes to the original result. Self-authored tests, independent service scenarios and checker candidates have different denominators.

## Changes applied since this trial (2026-09-08)

This trial already scored reward **1** with every control correctly named, so nothing package-specific needed repair here. A shared harness fix landed afterward in the working `.local/post-program/next-five/2026-09-07-p09/source` tree, after a sibling trial (see [08-partial-release-repair](08-partial-release-repair.md)) surfaced that the checker grader required a bare, exact check-id string in `reasons`, wrongly rejecting checkers that instead wrote `"checkId: explanation"`. No scenario, control or reference file belonging to this package was touched.

**Regrade confirms no regression.** This trial's already-preserved checker.mjs was re-run against the fixed harness with zero new model calls: still a full pass (12/12 correct, 0 false positives, 0 missed, all 10 controls correctly named), unchanged from the original result. Full numbers: restricted regrade record `regrade-2026-09-08.json` (restricted local storage, same evidence boundary as the sanitized trial record above).

**When trials run again:** this package's grading should behave exactly as before; the fix is purely defensive against the reasons-formatting defect class observed elsewhere in this batch.


## Trial 2 preparation — fourth ranked group (2026-09-09)

**Ready for second exploratory trials through Foundry or native Harbor.** No new model attempt is recorded by this engineering work. Removed the public pagination, selection, update and orchestration implementations after completing both private service closures. Added an independent history/state checker. The grader now rejects an applied patch that drops an existing label even if a later patch restores the final set; `intermediate-label-loss` isolates this case. Checker inputs retain raw rows, write requests, pre-write states and external edit facts, with computed `selected` and `validPatch` annotations removed.

Both service and checker are required. The public entry is empty, reason strings are optional diagnostics, helper modules are allowed, and the contract retains the facts needed to judge correctness. Existing shared authoring-policy improvements apply; no additional exploration gates were introduced.

Local validation passed 16 assurance checks across 33 service scenarios, including complete reference/alternative services and semantic rejection of the untouched starter. The independent checker classified **13/13** candidates correctly, with zero false accepts or misses. All 22 native static checks and six verifier integrity controls passed. The exact native export earned oracle reward 1 and nop reward 0, with no infrastructure error; nop rejects the absent required checker. Foundry assurance separately verifies the empty service's semantic failure. Export reproduction and targeted regression checks passed.

Foundry export: `.local/fourth-ranked-five-implementation-2026-09-09/release-ready/ticket-consolidation-repair/export`. Package digest: `61056ab84d9aa2532dec0a292f0a84360046c0ff56a5336e6f3dca09d2b8d466`. Native digest: `1b35bc501ffb1672a350b5ccc44a7079d6cdd2048d3b332a443be17bd903a1e9`. Suggested Trial 2 target: **Claude**, retaining this package's original model family. Append the eventual Trial 2 result below this engineering record, preserving Trial 1.

[Group implementation and selection](../fourth-ranked-five-implementation-plan-2026-09-09.md) and [exact validation evidence](../evidence/2026-09-09-fourth-ranked-five-implementation.json) retain file hashes, native trial identities and the remaining final-qualification requirements.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `ticket-consolidation-repair-attempt-1`, package digest
`61056ab84d9aa2532dec0a292f0a84360046c0ff56a5336e6f3dca09d2b8d466`, route
`professional-multifile/authority-process@1`. Evidence retained at
`.local/round-two-fourth-ranked-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/ticket-consolidation-repair-attempt-1/`.
Dispatched through the signed, subscription-only JobStore real-provider route
(Ed25519 reservation, `maxMicroUsd: 0`, `maxAttempts: 1`) — a fresh campaign slot
(`attempt-1`), not an infrastructure retry. Reused, byte-for-byte, the isolated
runtime built and independently verified for the first round-two campaign; its
`dist/index.js` SHA-256 was re-verified unchanged immediately before this dispatch.
Author image `sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.

Target: **claude**. Requested `anthropic/claude-opus-5`, effort `max`, CLI
`scaffoldVersion 2.1.263` (verified baked into the pinned author image). Observed
from runtime events: `model="claude-opus-5"` (matches requested); effort and
scaffold version are not exposed by the CLI's event stream and remain unobserved.

Dispatched 2026-09-09T16:47:54.943Z as one of five reservations installed within a
216ms window (16:47:54.943Z–16:47:55.159Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently — a genuinely concurrent five-way
campaign. Completed 2026-09-09T17:05:23.606Z. Total elapsed ≈1,048,663ms (~17m29s);
solver authoring time (capture wall clock) ≈1,040,491ms (~17m20s); grading ≈8.2s.
Well inside the 10,800,000ms (3h) budget. Execution reached a clean `completed`
state with no invalid-execution or infrastructure error.

### B. What changed since Trial 1

Trial 1's starter already supplied pagination, selection, update and orchestration
modules; this successor removes all of them, leaving a single empty `subject.run`
entry point, and adds the `intermediate-label-loss` control (rejecting a patch
sequence that drops an existing label even if a later patch restores the final
set). The checker is now a required, separately-graded deliverable rather than
diagnostic output, and reason strings are optional diagnostics only.

### C. Results

Reward **1** — a clean pass on both deliverables. Service: all 33 expected
scenarios pass (completion, ownership, labels, preservation, conditional_writes),
zero missing/unexpected IDs. Checker: `checkerRequired: true`, `checkerPassed:
true`, 13/13 candidates correctly classified — 0 missed, 0 false positives,
deterministic across repeat judgment.

### D. Observable solving behavior

All 32 captured tool calls were `Bash`. The agent wrote `entry.mjs` and
`checker.mjs` directly via heredocs, then built a self-contained test harness
under `/tmp/h`: a mock backend (`mock.mjs`) implementing the pager/batch/resolve
contract "as adversarially as [SEMANTICS.md] allows" (overlapping pages, forced
expiry, reordered/dropped batch results, injected concurrent edits immediately
before update evaluation), a scenario generator, and a candidates bank of 14
deliberately broken implementations (expiry-stops, first-page-only, id-only
identity, closed/unrelated-tenant writes, no conflict retry, double-marker,
single-resolve, wrong-team, note/status overwrites, stale/stripped labels,
no-op) plus one differently-shaped *correct* alternative (read-first, one row
per batch, redundant rewrites, sorted labels).

It ran the checker against independently computed ground truth across 16
candidates × 5 scenarios (accepting both correct implementations, rejecting all
14 mutants), then 20 synthetic edge cases, determinism and input-immutability
checks, a no-throw check on malformed input, and a 300-case × 5-cell performance
run (139ms against a 60s budget). It used `python3` inline scripts to patch its
own harness files mid-session rather than rewriting them via heredoc each time.
It explicitly flagged one interpretive judgment call in its final report: treating
a *submitted* write to a closed or unrelated-tenant ticket as a failure even if
the write had no effect (reading the prohibition as covering the request itself,
not just landed mutations) — noting this is stricter than a "landed-mutations-only"
reading might require, but costs nothing against a correct implementation. Its
final completion claim matches the actual graded result exactly: no overclaiming
found.

### E. Comparison and next step

Trial 1, working from a substantially pre-implemented starter, also reached
reward 1 (33/33 service, 12/12 checker, 14m07s). Trial 2, working from an empty
entry point and facing one additional control (`intermediate-label-loss`) absent
from Trial 1's bank, reached the same clean-pass outcome in comparable wall-clock
time (17m29s) while writing the full implementation and an independently-designed
adversarial test harness from scratch. This is a second consecutive clean pass for
this package/model pairing across a materially different starter and an expanded
control set — consistent with a stable, low-difficulty result rather than one that
depended on the removed scaffolding. Retain this successful submission as a correct control. Prioritize packages with
observed required-deliverable failures for further failure-finding trials.

### F. Verified publication record — September 9, 2026

Reward **1**; service **33/33**; checker **13/13**. All **821** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-fourth-ranked-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-fourth-ranked-five.json). Earlier trial records are preserved.

## September 11, 2026 — successor 2.0.0 engineering (no new model trial)

This is a new task version, not a regrade of the Trial 2 submission above, which
remains a correct clean pass against the earlier contract. Full rationale, the
obligation-to-coverage matrix, and cross-package validation results are recorded in
the [queue 11–15 successor report](../queue-eleven-fifteen-successors-2026-09-11.md);
this section summarizes only what is specific to this package.

**New business requirement.** The prior contract guaranteed "at most two conflicts
per selected row" (making a fixed 3-attempt retry provably sufficient) and that
concurrent edits never touch `status`/`tenant` (making the nominal
snapshot-vs-current membership distinction never actually diverge, since Trial 2's
own follow-up recommended "richer ownership relationships" or "explicitly authorized
changes in selection eligibility" as the honest next step). Version 2.0.0 adds a
crash/redelivery boundary on `api.batch` (page and conflict-injection budgets now
persist across the crash rather than resetting per delivery), and allows a
concurrently-injected edit to flip a selected row's status to `closed` mid-run after
it was captured in the snapshot as open — the row must still be migrated, per the
existing "population is frozen at snapshot time" rule, while `status` itself must
still never be overwritten. A new obligation, `membership`, independently verifies
the written set equals exactly the snapshot-frozen selection regardless of later live
drift.

**Why the previous strategy fails.** A solver that re-reads each row's live status
before settling it, and skips one whose live status is no longer "open," now wrongly
disqualifies a row that was legitimately snapshot-eligible. Separately, a solver that
discards all progress and restarts full pagination-and-resettlement from scratch on
every redelivery can now exhaust the combined (crash-inclusive) operation budget in
at least one deliberately tight scenario, while resyncing from fresh reads with
storage-tracked progress stays comfortably inside every scenario's budget, including
most crash scenarios — the budget pressure exists in only a hand-picked subset so a
solver must actually respond to it, not assume worst-case scarcity everywhere.

**Validation.** 33 scenarios grew to 67 (the 32-seed bit-flag generator extended to
64 seeds for the crash/status-flip dimensions, plus dedicated tight/loose-budget
cases); 11 controls grew to 13 (new: `live-recheck-membership`,
`budget-blind-restart`). Local dry-run: reference and alternative both 0 failures;
all 13 controls trip their declared check with their `clean` witness respected;
checker 15/15 correct, deterministic, non-mutating. Adversarial probe: removing the
membership cross-check (`touched`/`wanted`) did not, in the specific hand run
performed, cause `live-recheck-membership` to be wrongly accepted under the real
shipped checker — the general final-state equality loop appears to also catch it;
recorded as a secondary redundant-coverage observation in the linked report, not as
evidence against the dedicated `membership` clause, which passed 15/15 in the real,
unweakened, Docker-sandboxed native run below. Native Harbor (real Docker,
`--validate`): oracle reward 1 (service 67/67, checker 15/15, all 5 integrity checks
pass), nop reward 0 (missing required deliverable, not an infrastructure error).
Local Foundry: 18/18 operations pass, `local-valid`/`trial-eligible` both allowed.
Native export digest `f5f160cdb3642fc6cbadd401c7dcc2a7ef8088ec6808972601a5a6937ef7443a`.
Identity-by-(tenant,id), reordered-batch-result matching by identity, per-call label
monotonicity, and revision-guarded writes are all unchanged and re-confirmed still
enforced.

No model trial has been run against this version; per the implementation standards,
the Trial 1/Trial 2 reward counts above do not carry forward to it. This work was
done in an isolated worktree/branch (`next-five-successors-2026-09-11`) and has not
been merged, committed to `main`, or pushed.


## September 11 independent grader audit

The [independent audit](../queue-eleven-fifteen-checker-audit-2026-09-11.md) reproduced and fixed false accepts, false rejects,
API inconsistencies and checker-coverage gaps in the five-package successor handoff.
Its exact audited versions and export digests supersede this document's earlier readiness
claims for those bytes. The final audit passed 4,146 individual-cell comparisons,
28 checker mutations against both local and protected candidate banks, all 40 native
integrity checks and 105 Foundry assurance operations. No model trials were run, and
historical trial counts were not changed.


## 2026-09-11 — attempt 5 audit and directory-key correction

The recorded v2.0.2 Codex physical attempt-5 pass is a second audited benchmark
false pass. Its checker interprets a JSON-encoded tenant/team key before the exact
tenant key, accepting wrong-owner migrations and rejecting valid migrations when
those literal tenant strings coexist. Forty-eight protected witnesses reproduce
each direction; the saved service passes all 261 audit scenarios. The earlier
request-membership/schema correction remains effective.

The corrected v2.0.3 digest is
`bde0e2b5f7329bf06bea37992b7348a16f3ecd9c9178be9efcbf0d9cdd3344ac`.
It has 73 scenarios and 32 checker candidates (six valid, 26 faulty), with new
literal-key collision, case-folding, whitespace, and numeric normalization coverage.
Validation passed: 35/35 assurance, 32/32 reference checker, Docker oracle 1/nop 0,
8/8 integrity checks, 2,336 independent protected trace comparisons, and 15 caught
checker mutations. The exact saved attempt-5 checker now scores 25/32, reward 0;
its service remains 73/73. All five original submissions were consistently regraded
without rerunning a model or changing original evidence.

Attempts 4 and 5 are separate audited nulls; their original reward-1 records are
preserved. There are three eligible historical Claude failures and five physical
provider calls before continuation. Physical attempt 6 is prepared on Codex in a
new namespace; if scored, it would be eligible counted trial 4. No model trial,
commit, or push was performed by this audit/correction.

See [the complete audit and correction](../../pass-audits/ticket-consolidation-attempt-five-2026-09-11.md),
[the machine-readable disposition](../../pass-audits/ticket-consolidation-attempt-five-2026-09-11.json),
and [the next-attempt prompt](../../pass-audits/ticket-consolidation-v3-next-attempt-prompt-2026-09-11.md).


## 2026-09-11 — attempt 6 audit and deferred-marker correction

Physical attempt 6 (Codex, v2.0.3) is another reproduced benchmark false pass.
Its required checker demands the marker on every landed write and rejects a
valid migration that settles ownership first, then adds the marker before
completion. The issued contract and frozen verifier already permit this.
The submitted service passes all 265 audit scenarios; no accepted invalid
execution was found in 658 checker judgments. Four false-reject judgments
reproduce one omission in the required-checker bank.

The gap is fixed in v2.0.4, digest
`6d8179c6d01c8bbd4def8e1537292b34325691c8320f321faa07bb2e65191729`.
A valid deferred-marker strategy and faulty owner-only unfinished strategy
raise the bank to 34 candidates (seven valid, 27 faulty), with the 73 service
scenarios and authoritative verifier unchanged. Validation passes 37/37
assurance, 34/34 reference checker, Docker oracle 1/nop 0, 8/8 integrity,
2,482 protected comparisons, and 17 checker mutations. The exact saved attempt-6
checker now scores 33/34, reward 0, while its service remains 73/73.

Original evidence is unchanged. Attempts 4, 5, and 6 are separately audited
nulls; their reward-1 records remain historical. There are six physical calls
and three eligible historical Claude failures. Physical attempt 7 is prepared
on Codex in a new namespace and would be eligible counted trial 4 if scored.
No model trial, commit, or push was performed by this audit/correction.

See [the full audit](../../pass-audits/ticket-consolidation-attempt-six-2026-09-11.md),
[the null disposition](../../pass-audits/ticket-consolidation-attempt-six-2026-09-11.json),
and [the next-attempt prompt](../../pass-audits/ticket-consolidation-v4-next-attempt-prompt-2026-09-11.md).


## 2026-09-11 — published successor trial checkpoint

| Physical trial | Provider | Recorded reward | Counted reward | Service | Required checker |
| --- | --- | ---: | ---: | --- | --- |
| 1 | Claude | 0 | 0 | 69/69 pass | Output validation failed |
| 2 | Claude | 0 | 0 | 69/69 pass | Output validation failed |
| 3 | Claude | 0 | 0 | 69/69 pass | Output validation failed |
| 4 | Codex | 1 | null | 69/69 pass | 17/17; 0 valid rejected, 0 invalid accepted; audited false pass |
| 5 | Codex | 1 | null | 69/69 pass | 28/28; 0 valid rejected, 0 invalid accepted; audited false pass |
| 6 | Codex | 1 | null | 73/73 pass | 32/32; 0 valid rejected, 0 invalid accepted; audited false pass |

This table is derived from the [published successor evidence](../evidence/2026-09-11-successor-results.json), with exact package/profile identities and completion, result, grade and submitted-code hashes. [Campaign report](../successor-results-2026-09-11.md). Trials here are physical identities within the September 11 successor campaign; earlier trials above belong to their own versions.

Attempts 4–6 retain original reward 1 but have audited counted reward null. At this checkpoint there are three historical counted failures and three remaining counted slots; corrected v2.0.4 and further physical attempts are outside this table. No false pass is converted into a counted failure.

## 2026-09-11 — attempt 7 false pass; request metadata and label-type correction

Physical attempt 7 (Codex, v2.0.4, digest `6d8179c6d01c8bbd4def8e1537292b34325691c8320f321faa07bb2e65191729`)
recorded reward 1 and checker 34/34. The separate audit reproduces another
benchmark false pass: the submitted checker rejects valid updates carrying
ignored outer metadata, although only the patch has an exact-field restriction.
Two valid implementations pass all 73 service scenarios. The saved service
passes 265/265 audit scenarios; its checker has zero false accepts and 144
false-reject judgments out of 1,104, from one root cause.

The audit also finds and fixes an authoritative verifier/reference-checker
omission: conflicting patches with numeric or object label elements violated
the issued `string[]` type but were accepted. This is separate from the saved
checker's over-strictness. Both directions now have executable coverage.

Corrected v2.0.5, digest `186b34f818022cc0274c0fb684a665d5d86ffde2b146a1d0fb7076b6a712a3ed`,
has 39 candidates (nine valid, 30 faulty), with the same 73 scenarios. Validation
passes 42/42 assurance, 39/39 reference checker, Docker oracle 1/nop 0, 8/8
integrity, 2,847 independent protected comparisons and 20 checker mutations.
The corrected checker also classifies all 1,104 retained audit judgments correctly.
Attempt 7's linked regrade is service 73/73, checker 37/39 and diagnostic reward
0; it rejects exactly the two new valid metadata candidates.

Original evidence is unchanged. Attempts 4–7 are audited nulls, leaving three
counted historical Claude failures and zero counted Codex outcomes across seven
physical calls. New Codex slots 8–10 are prepared, undispatched, for eligible
counted trials 4–6, continuing only after clean failure and stopping on a pass
or unscored incident. No model calls, commits or pushes were made by this audit.
The earlier published checkpoint remains unchanged and ends at attempt 6.

See [the full audit](../../pass-audits/ticket-consolidation-attempt-seven-2026-09-11.md),
[the null disposition](../../pass-audits/ticket-consolidation-attempt-seven-2026-09-11.json),
and [the continuation prompt](../../pass-audits/ticket-consolidation-v5-next-attempt-prompt-2026-09-11.md).
