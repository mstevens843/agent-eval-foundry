# 21 — Incremental build repair

## Outcome

Codex, requested Sol / xhigh, completed in **15 minutes 31 seconds**. Its service
passed **27/27 protected scenarios** and its checker correctly classified **14/14
candidates**. The original record gives **reward 0** because two of twelve negative
candidates were rejected as `publication_scope`, while the grader requires
`current_artifacts` for those behaviors.

This is a **public reason-taxonomy alignment concern**, not a demonstrated missed
implementation defect. The rejected candidates publish missing or foreign targets.
The public prompt names publication scope but does not define it narrowly enough to
exclude target membership. Original reward zero is retained; it is not counted as a
clean capability failure or silently converted into a passing trial.

## What the task was, in plain English

An incremental build service must publish current compiler-attested artifacts across
successive requests. The entry file alone does not determine freshness: included
files, compiler identity, flags and ordered dependency aliases can all change the
required artifact. A correct-looking local byte string is insufficient—the result
must come with a genuine compiler-issued handle and current recursive provenance.

At the same time, compiling everything again can exceed the visible per-round budget.
The service must reuse legitimate existing attestations, including semantically
equivalent artifacts with different handles or harmless unused source rows. Every
round needs exactly its requested targets, including an empty publication for an
empty target set. Existing attestations are immutable.

This creates a real tension between cache reuse and complete identity/provenance.
The API is deliberately bounded: at most six actions, ten files and five rounds,
with complete public inputs and a guaranteed within-budget solution.

## What was in the package

The supplied service had include collection, cache keys, recursive building and round
orchestration. Public semantics described compiler serialization, dependency ordering,
valid cache equivalence, publication rules and compile-call accounting. A standalone
checker was a second required deliverable.

The checker received original rounds, actual publications and compile counts, and
raw compiler records including the transitive dependency attestations referenced by
the candidate. Preflight added that closure so a valid cache reuse strategy did not
need redundant inspect calls merely to make its evidence visible.

Protected grading used 27 service scenarios, two correct checker candidates and twelve
negative controls. This run used the new reason rule allowing any actually failed
public obligation, not one private control's primary label. That correction does not
solve undefined meanings of the public obligation names themselves.

## What the agent actually did

There are twelve captured shell commands. It changed `src/builder.mjs`,
`src/includes.mjs` and `src/key.mjs`, and added a standalone checker. The existing
round loop/publication code stayed unchanged.

1. It replaced lossy-key reuse with semantic validation of each cached artifact.
   A memoized recursive check compares action identity, entry, tool, flags, required
   current files and ordered dependency aliases, and verifies each referenced
   dependency is itself current for the required action.
2. It searches for a reusable target before recursively compiling dependencies.
   Different current dependency handles are allowed: a cached parent need not reference
   whichever equivalent child handle another target happened to choose.
3. It makes include collection follow the actual transitive include graph and checks
   missing sources/cycles defensively. Only required source rows go into newly built
   recipes; unrelated changes do not have to invalidate them.
4. It also repairs the old canonical recipe-key helper, but the new builder no longer
   uses that helper for its main semantic reuse decision. These are distinct changes,
   not two independent solutions to the same requirement.
5. Its checker reconstructs recursive currentness from raw attestations and current
   round inputs, verifies output membership, counts publications and checks compile
   budgets. It does not trust a supplied success flag or require newly minted handles.

The visible test and syntax checks passed. Inline simulation commands exercised five
rounds with compile counts **[2, 0, 2, 1, 1]**, varying sources, aliases, tools and
flags. Other traces tested stale artifacts, scope mistakes, budget excess and incomplete
publication. A separate retained-identity exercise reported reuse with counts [2, 0].
These are targeted self-tests, not a large randomized campaign. No new test file was
submitted. A Git-diff command failed in the non-Git workspace, then separate verification
commands succeeded; this recovered shell error is not an invalid trial execution.

## The two reason disagreements

Both `foreign-publication` and `partial-publication` were correctly rejected. The
checker classified extra/missing target membership as `publication_scope`, reserving
`current_artifacts` for a requested target whose handle was not semantically current.

The private domain implementation instead folds target-set equality into its
`current_artifacts` boolean. Its `publication_scope` boolean only checks the number,
round association and timing of publications. Therefore the original authority's
failure sets contain only `current_artifacts`, and the new any-observed-failure rule
still cannot accept the checker's alternate public interpretation.

The shared correction did make one concrete difference within this run: the duplicate-
publication control fails both completion and publication scope, and the checker names
only completion. That rejection is now correctly accepted. The two remaining failures
are a different issue—the undefined scope of the public labels—not evidence that the
private-primary-label fix was absent from execution.

The public contract defines the correct output unambiguously; the label taxonomy is
the problem. It never explains that “publication scope” excludes foreign/missing
targets. The agent detected the exact bad behavior, and every good/bad classification
was right. A future version needs explicit obligation-to-behavior mapping, or a
reason-grading design that does not depend on this undocumented partition. The
current run cannot fairly establish a target-model failure from those two labels.

## What the result teaches us

The agent went beyond replacing one cache-key expression: it implemented recursive
semantic equivalence and legitimate retained-handle reuse. That was the substantive
reasoning challenge, and the independent service bank confirmed it on this attempt.
The original implementation was nevertheless small enough for a direct contract-to-code
review, and the repair took about a quarter hour.

Keep the submitted solution as an alternative-positive regression. Future narrow
controls should distinguish identical bytes with wrong attestation provenance, harmless
unused files, ordered dependency aliases and transitive changes, without insisting on
one cache key or traversal. Increasing action count alone is not a supported hardness
mechanism. New requirements require new visible semantics and fresh bounded-solvability
validation, not retroactive reinterpretation of this submission.

The immediate lesson is also systemic: accepting multiple actual failed labels fixes
one evaluator defect, but does not prove the labels faithfully encode the public
contract. That mapping must itself be reviewed before treating reason-only zeroes as
model weaknesses.

## Evidence and limits

[Sanitized batch evidence](../evidence/2026-09-08-fifth-five.json) preserves the original
zero, service/checker counts, original observed failure sets, exact reason policy,
timing and capture hashes. Analysis reads retained submissions and original grader
outputs without rerunning the model. This is one exploratory attempt and a documented
alignment concern, not independent blind adjudication, official qualification or a
backend attestation. No private internal reasoning is analyzed.

## Changes applied since this trial (2026-09-08)

The multi-label harness fix (crediting any obligation a control's real trace actually
failed, not just one private primary label) was already applied to the frozen dispatch
tree before this trial ran, so #21's zero is a genuine remaining defect, not a repeat
of the labeling bug fixed for batch 4. Three separate fixes were made this pass:

**Fix 1 — `current_artifacts`/`publication_scope` check-boundary split**, in
`private/domain.mjs`. The `publish()` handler's content-correctness check
(`correct(o.handle, o.target, ...)`) ran against every output regardless of whether its
target was actually requested, so a foreign or partial target set was misattributed to
`current_artifacts` (content correctness) instead of `publication_scope` — the check
whose own name, and SEMANTICS.md's own wording ("no duplicate, missing or foreign
targets"), promises to cover exactly that. `binding`/`current_artifacts` and a new
`scoped`/`publication_scope` boolean are now computed separately; `foreign-publication`
and `partial-publication` in `control-manifest.json` are relabeled to `publication_scope`
accordingly. Verified via real Docker build+validate (`local-valid: true`) and direct
isolation checks: both controls now fail exactly `["publication_scope"]`.

**Fix 2 — two pre-existing, unrelated exposure bugs found while verifying Fix 1.** A
free regrade of the real preserved checker against the fixed package initially showed
`correct:9, missed:3, falsePositives:2` — reference and alternative rejected, no-work
wrongly accepted — which did not match Fix 1's own logic (untouched by the split) and
did not reproduce against the frozen dispatch tree's *unmodified* baseline. Root cause,
found by diffing `domain.mjs` against the frozen tree directly: the canonical
`fifth-five` tree's `runScenario` return object was missing `input: { rounds: s.rounds }`
(the real checker's `completion` check reads `cell.input.rounds`, silently treating it
as zero expected rounds without it) and missing a dependency-closure expansion over
`touchedHandles` (so a candidate's own recipe dependencies could be absent from the
exposed `artifacts` array, breaking the checker's own bytes-recomputation). Both fields
already existed in the frozen dispatch tree the real trial ran against — this was a
canonical-tree-only staleness bug, not a defect in the actual dispatched package — but
both are now present in both trees for consistency. After both fixes: a full free
regrade scores **14/14 correct, 0 false positives, 0 missed, pass: true**.

**Fix 3 — new `premature-publication` negative control**, added to
`control-manifest.json` and `private/controls/premature-publication.mjs` (temporal
attestation ordering — a candidate that predicts a not-yet-issued `compile()` handle and
publishes with it before actually calling `compile()`). Isolates cleanly to
`current_artifacts` on 26/27 scenarios (the zero-target round is correctly inert).
**The real preserved checker misses this control** (confirmed via free regrade:
`missed: ["premature-publication"]`, all other 14 candidates still correct) — a genuine,
now-documented blind spot to temporal ordering, distinct from the harness fixes above.

All three fixes were ported to the frozen dispatch tree
(`screening/2026-09-08-batches-3-5/source-fifth-v2`) and re-verified there independently
(`local-valid: true`; free regrade also 14/14 with the new control correctly missed).
**When trials run again:** #21 should score a genuine pass on the check-boundary defect
this report diagnosed; `premature-publication` remains available as a harder distinguishing
case for future checker submissions.

## September 9 implementation successor — ready for exploratory trials

The currentness, publication-scope and compiler-handle availability fixes are integrated. The input exposes original rounds and the complete observed dependency closure. The premature-publication control remains private. Duplicate unchanged-entry diagnosis is removed; include handling, build traversal and caching are no longer supplied in the starter.

Both deliverables now have complete private oracle implementations. The public service
starts from an empty entry point. The checker classifies every supplied case with a
Boolean verdict; optional reasons are ungraded diagnostics, and helper modules are
allowed. Original results above remain historical; no second model trial was run.

Executed validation on this successor:

- Service oracle: 27/27 scenarios; checker oracle: 15/15 candidates.
- Protected Foundry assurance: 18 operations passed; deterministic rebuild and
  exported-CLI recipient reproduction passed, including drift and invalid-execution checks.
- Native Harbor oracle reward 1; native nop reward 0; no Harbor exceptions.
- All 22 pinned upstream static checks and all six local checker/integrity controls passed.
  These local controls are not the official model-powered cheat qualification trials.

Canonical source: `tasks/incremental-build-repair`. Native export:
`.local/top-five-implementation-2026-09-09/harbor-ready/incremental-build-repair`.

Native export digest: `3517d6932c67baba9803be6c8c153c9c958c10357a35503ecb15879655f2f2b8`.
Foundry package digest: `34aa5b163fb0b44d29e89e3ceb4be36bb12d8f6a8d47fb2b445568a5f89fd33a`.

[Versioned evidence](../evidence/2026-09-09-top-five-implementation.json) records source
hashes, logs, per-check CTRF results and both package identities. The
[shared implementation record](../top-five-implementation-plan-2026-09-09.md) explains
policy and tooling changes. Use these maintained sources or the identified exports
for the next trial, rather than the older local successor copies named above.

Readiness means engineering readiness for exploration. Removing supplied implementation
code changes the difficulty hypothesis and invalidates any attempt to reuse earlier
model results as qualification for this version. Fresh model evidence is still needed.
The eventual chosen submission also needs human-authored reviewer material and the
required rubric, standard and cheat qualification runs; those requirements do not
justify delaying exploration to qualify all five candidates.

## Trial 2 — implementation successor — September 9, 2026

### Identity and execution

Run `incremental-build-repair-attempt-1`, package digest
`34aa5b163fb0b44d29e89e3ceb4be36bb12d8f6a8d47fb2b445568a5f89fd33a`. Requested target **codex**,
`openai/gpt-5.6-sol`, effort `xhigh`. Frozen execution source:
`2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`.
The pinned author image was
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.

Started `2026-09-09T11:35:50.944Z`, completed `2026-09-09T11:49:56.133Z`.
One of exactly five fresh campaign attempts, reserved within **232 ms** and reported
running concurrently by the dispatching agent's `docker ps` observation. Budget:
10,800 seconds, 2 CPUs, 2 GiB; signed subscription-only authorization, one attempt,
no automatic retries or recorded paid-API fallback. No timeout is recorded.
Requested settings are not runtime attestations: Claude model strings were observed;
Codex model identity and effort/scaffold versions were unobservable in the captures.
CLI dollar estimates are not subscription charges.

### Changes and results

The service starts from an empty entry point. The successor integrated currentness/
publication-scope corrections, complete raw rounds and dependency provenance, and the
`premature-publication` control before dispatch. The service and checker were required
in both trials; Trial 2 scores Boolean checker verdicts with diagnostic-only reasons.

**Reward 0. Service 27/27; checker 14/15.** Both valid candidates are accepted, twelve
negative controls rejected, and `premature-publication` wrongly accepted. No service
scenario failed. This is a substantive failure of a required deliverable.

The frozen SEMANTICS.md says: **“Only compiler-issued handles can be published.”**
CHECKER-INPUT.md supplies ordered `{seq, method, request, value}` observations.
In the first premature-publication control cell, target `t` publishes `built-4` at
sequence **13**, while the compiler only returns that handle at sequence **17**.
The same cell has further publish-before-issue pairs at 28/30, 43/45 and 60/61.
The handle names are predictable ordinals, not the content-addressed identifiers
asserted in the initial campaign analysis.

The submitted checker validates artifact structure against the final ledger and
counts compile/publish operations per round, but does not enforce issuance before
use. A later compile therefore makes a premature publication appear valid to it.
An offline replay of the unchanged submission reproduces both recorded verdict sets,
including acceptance of this defective candidate. The private control violates a
consequence of the public attestation rule; no undisclosed reason label is involved.

### Observable solving behavior

The capture analysis records twelve shell/file-change actions, a shared
`artifact-semantics.mjs` helper, service and checker revisions, and local checks for
cache reuse, invalidation and checker verdicts. The final message says the checker
validates “protocol ordering.” It enforces round boundaries, but misses the specific
issuance-before-publication relation above. That is a concrete completion-claim gap.

### Comparison and decision

Trial 1 also recorded reward 0, but its scored cause was a reason-taxonomy ambiguity.
A later diagnostic regrade found that older checker missed the new premature-publication
control too. That regrade is not an independent model attempt. Trial 2 is a fresh
checker written by the **same requested Codex model pairing**, not a different model.

Prioritize another independent attempt on this unchanged frozen version. Preserve the
submitted checker as evidence; repairing its omission or supplying an ordering tutorial
would defeat the experiment. The service suite passed, and the required checker failed
for a contract-supported reason. This meets the exploratory completed-but-wrong objective,
but is one fresh observation, not six qualifying failures or an established failure rate.

### Evidence and qualification boundary

The publication audit checked **974 manifest-listed files**
for this record with zero mismatches and compared all four supplied contract/interface
files against the frozen export. Raw evidence remains at
`.local/round-two-top-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/incremental-build-repair-attempt-1/`.
The earlier Trial 1 text and dated engineering additions above are preserved.

[Campaign results and audited decisions](../round-two-top-five-2026-09-09.md) ·
[Sanitized trial evidence](../evidence/2026-09-09-round-two-top-five.json) ·
[Integrity and diagnostic evidence](../evidence/2026-09-09-round-two-top-five-audit.json).

This is an exploratory repository assessment. The immutable result still records
`adjudication: unlabelled`, `modelEvidenceEligible: false` and
`countsAsModelFailure: false`; publication does not change those fields or claim
six standard failures, official cheat qualification or independent blind review.

## Trial 3 — repeat attempt — September 9, 2026

### Identity and execution

Run `incremental-build-repair-attempt-1` in a fresh campaign slot
(`.local/round-three-failing-five-2026-09-09/`), package digest
`34aa5b163fb0b44d29e89e3ceb4be36bb12d8f6a8d47fb2b445568a5f89fd33a` — byte-identical
to Trial 2's; the controller re-verified the profile and instruction hash matched
the Trial 2 record before dispatching. Requested target **codex**,
`openai/gpt-5.6-sol`, effort `xhigh` — same provider as Trial 2. Observed: model,
effort and scaffold version all unobservable from the Codex CLI's event stream.

Dispatched `2026-09-09T19:02:12.686Z`, completed `2026-09-09T19:17:28.768Z`. Total
elapsed ≈15m16s; solver authoring time (capture wall clock) 902,611ms (≈15m3s,
the fastest of this five-job batch); grading ≈13.5s. One of five reservations
installed within a 217ms window (19:02:12.628Z–19:02:12.845Z); `docker ps`
confirmed all five `foundry-real-*` containers running concurrently. This is a
fresh solver session given only the original public task inputs — no access to
Trial 1/2 submissions, analysis, or this handoff.

### Results

**Reward 0. Service 27/27 (fully correct, matching Trial 2's 27/27). Checker
14/15.** Both valid candidates accepted, 12 of 13 negative controls rejected
correctly, and — the same single candidate Trial 2 missed — `premature-publication`
wrongly accepted (`expectedFailingCheck: "current_artifacts"`,
`observedFailingChecks: ["current_artifacts"]`, ground truth confirms it genuinely
violates that check; the submitted checker's verdict was `ok: true`).

### Comparison with Trial 2 and recurrence assessment

This is an exact recurrence, not just a matching label. Reading this Trial 3
`checker.mjs` directly: its `isCurrent()`/`validAttestation()` pair verifies that
an artifact's recipe is structurally well-formed, that its bytes match a
recomputed hash of `[tool, flags, transformed-source, dependencyBytes]`, and that
every dependency is itself recursively "current" — but at no point does it compare
the *sequence* at which a handle was minted (via `compile()`) against the sequence
at which it was published. It is the identical mechanical gap Trial 2's checker
had: content-addressed/structural attestation is checked exhaustively; temporal
issuance-before-use ordering is never checked at all. Two independently-written
Codex/xhigh checkers, from two fresh solver sessions with no shared context, both
omitted the same specific ordering dimension. That is meaningfully stronger
evidence of a stable, reproducible checker-authoring blind spot for this package
than either attempt alone — the same class of recurrence seen elsewhere in this
series (e.g. capacity-maintenance-repair's repeated NUL-separator friction).

### Observable solving behavior

The capture is compact: one continuous turn producing `entry.mjs`, `checker.mjs`
and a shared `semantics.mjs` helper, closing with `npm test && node --check
entry.mjs && node --check checker.mjs` plus one inline probe asserting the
checker's verdict object has no `__proto__` pollution. The final agent message
claims "100 generated multi-round scenarios passed" and lists the adversarial
cases it covered: "stale-source, bad-byte, invalid-target, unknown-handle, and
over-budget." Notably, no ordering- or issuance-sequence case appears in that
list — the agent's own account of what it tested is consistent with the actual
gap in its checker; it does not overclaim coverage of temporal ordering, it
simply never tests that dimension.

### Failure-mechanism attribution and next step

This is a supported required-deliverable failure under the unchanged public
contract (a required checker failing counts even though the service passes;
reason text remains diagnostic-only) — not a calibration bug, an infrastructure
error, or a disputed label. Incremental-build-repair now has **two consecutive
reward-zero results on Codex/xhigh**, both attributable to the identical specific
gap (missing issuance-before-use ordering), from two independently-written
checkers. Continue measuring on the unchanged package. The ordering consequence can remain implied by the public contract; two misses do not create a requirement to disclose the hidden control or add solution hints.

### Acceptance progress and next prepared attempt

This unchanged successor has **2 failures and 0 solver passes in two scored attempts**, both on Codex. The user reports that the CEO accepts at least **five failures out of six**, with three attempts per provider; six consecutive failures is the stricter aspiration, not the acceptance threshold. This package remains within that threshold and needs **3 failures from the remaining four attempts**. Different failure mechanisms can count; no identical-bug requirement is added.

The next attempt is **Trial 4 in this document, the third attempt on this successor**, using the same provider, package and saved profile again. Afterward, this package will have three runs on its original provider and will need three on the other provider. [Prepared Trial 4 handoff](../../../docs/round-four-failing-five-handoff.md). Preparation launches no model calls.
