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
