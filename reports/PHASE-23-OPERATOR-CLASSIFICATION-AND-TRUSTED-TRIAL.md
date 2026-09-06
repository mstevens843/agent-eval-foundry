# Phase 23 — Operator Classification And The First Trusted Agent-Facing Causal Experiment

Hand-authored, like every phase report before it. This phase followed a reviewed, rejected draft of
itself: the original plan (screen many operators through Phase 22's scenario-selection orchestrator)
was correctly rejected before execution, because most of the taxonomy's remaining operators are claims
about real agent behavior, not verifier discrimination, and that orchestrator only instruments the
latter. This phase classifies the taxonomy honestly, measures what the existing infrastructure can
validly measure, and gets exactly one real agent-facing experiment fully constructed and trial-ready.

## Lane 0 — classification, with one correction to this phase's own draft

Full detail: `data/phase-23-preregistration.json`. All 12 operators were re-read fresh from
`data/phase-21-operators.json` rather than carried forward from memory or from this phase's own mission
prompt — which caught a real mistake in that prompt's own bucket-3 example.

| operator | bucket | status |
|---|---|---|
| `hidden-scenario-selection-targets-narrow-mutants` | verifier/infrastructure | measured (Phase 21+22, replicated null) — `evidenceStatus` corrected from stale `"piloted"` to `"measured"` this phase |
| `authoritative-state-inaccessible-to-subject` | verifier/infrastructure | half-measured (Phase 20, adversarial case) → **fully measured this phase** (Lane 1 bonus, honest-subject case) |
| `causal-depth` | agent-facing | attempted, found **not constructible** on caa-revalidation without editing `verify.ts` — see Lane 2 |
| `diagnosis-radius` | agent-facing | **selected** — Lane 2/3/5 |
| `cross-process-cross-time-external-authority-evidence` | agent-facing | feasible, not selected (avoiding a second agent-facing measurement this phase) |
| `realistic-multi-file-repair-context` | agent-facing | feasible only after migrating `checker-required-memory-poisoning` |
| `defect-non-legibility-at-edit-site` | agent-facing | feasible only after both a new sibling-package build and a grandfathered-family migration |
| `interacting-safety-and-liveness-obligations` | agent-facing | candidates are grandfathered and unmigrated |
| `self-check-coverage` | agent-facing | blocked on its own stated precondition (pair-diff audit never performed) |
| `outcome-specified-solution-undirected-contracts` | agent-facing | blocked, `candidateSubstrates: []` |
| `naturally-incomplete-visible-tests` | agent-facing | blocked, `candidateSubstrates: []` |
| `collateral-damage-verification` | agent-facing (borderline verifier-configuration-shaped) | candidates grandfathered and unmigrated |

**Bucket 3 (predictors/measurement controls) is empty.** This phase's own mission prompt named
`authoritative-state-inaccessible-to-subject` as its bucket-3 example — re-reading the real file shows
`measurable: true`, `evidenceStatus: "measured"` for the adversarial case, and a well-specified remaining
measurement. That is a bucket-1 operator, not an unmeasurable one. Recorded as a correction, exactly what
"read fresh, don't presume" exists to catch.

## Lane 1 — verifier/infrastructure bonus

No OTHER operator fits Phase 22's scenario-selection orchestrator unmodified — it remains the only one
of its shape in the taxonomy. But `authoritative-state-inaccessible-to-subject`'s remaining half
(does an HONEST submission's grade differ between the pre- and post-Phase-20 routes? — the adversarial
case was already closed in Phase 20) is real, cheap, zero-new-spend evidence that would otherwise sit
unmeasured indefinitely. Built a small, purpose-built check instead of forcing it through an ill-fitting
orchestrator (`src/phase-23/route-parity.ts`) — a disclosed departure from a literal reading of "valid
for the existing orchestrator," justified because the evidence was real and free.

**Result**: all four preserved, hash-compatible real Phase 17 `caa-revalidation` submissions graded
identically, cell-by-cell, through both `gradeCaaRevalidationInContainer` (pre-Phase-20) and
`gradeCaaRevalidation` (post-Phase-20) — zero discrepancies, zero host errors, either route, every
submission. The operator's own predicted null for the honest-subject case, now actually checked rather
than assumed. Recorded in `data/hardness-operators.json` as
`phase23-authoritative-state-inaccessible-to-subject-honest-subject-caa-revalidation`.

## Lane 2 — operator selection, with a real mid-phase pivot

**`causal-depth` on `caa-revalidation` was selected first** (already migrated, non-grandfathered, a
concrete prior-evidence anchor in `tasks/caa-revalidation-repair/task.toml`'s `difficulty_explanation` —
the real Go-based task this operator's construction was modeled on, whose actual mechanism is a mispaired
answer written back into a store, surfacing "one order removed from its cause").

**Attempting the construction found it infeasible, provably**, not just difficult:
`src/families/caa-revalidation/truth.ts#applicableAnswer` defines a FRESH name's ground truth to be
its own cache — `isStale(view, name) ? scenario.current[name.fqdn] : name.cachedCaa` — so
`verify.ts`'s `caa_applicable_answer` check, which compares the report against exactly that value, can
never flag a poisoned-but-fresh cache as wrong, for ANY possible scenario/truth-only construction. This
is a structural consequence of the spec itself (the entire point of a recheck window is that fresh
values are trusted), not a failure of construction cleverness, and it cannot be worked around without
editing `verify.ts` — which `staysFixed` forbids. Full proof in
`data/phase-23-preregistration.json#lane2CausalDepthInfeasibilityFinding`.

**Disciplined pivot**: to `diagnosis-radius` on `prompt-injection-memory-poisoning` — the alternative
already named and reasoned about in Lane 0's audit BEFORE any construction began, not a search for
whichever operator happens to work. Also already migrated; not legibility-sensitive; its construction is
a single existing scenario parameter value change (`sessionsBetween`, already declared in the family's
own `SPACE`), with no structural tension against `verify.ts` staying fixed.

## Lane 3 — construction and validity gates (validity checks, not hardness evidence)

Two arms: baseline (`sessionsBetween=0`, 96 scenarios) and treated (`sessionsBetween=3`, 96 scenarios),
selected via a new `selectFixedSessionsBetween` (fixes one knob, samples the remaining five exactly the
way the shipped family's own `selectMeasuredSet` does, `assertKnobCoverage`-checked). Visible package
files are produced by `buildMemoryChallengePackage` completely unmodified for both arms — that function
takes no `sessionsBetween` input at all, so the packages differ ONLY in `MANIFEST.json`'s
`scenarioSetId`, mechanically confirmed via `requireMatchedPair`
(`sharedComponentsConfirmed = [scenarios/generateScenarios/buildScenario, verify via runCell, reference,
mutants, visible package construction]`; `differingFields = [scenarios.params.sessionsBetween]` only).

| | baseline (`sessionsBetween=0`) | treated (`sessionsBetween=3`) |
|---|---|---|
| package hash | `20d789b9fc1a2e874196020058b09314` | `d17fc8a6616bf77dde4910143ac6982d` |
| scenario-params hash | `6c5b85ac30527e42a471c1a7c44f47c8` | `0687d076dab7778b0d82999cc0129e8b` |
| reference clean | yes | yes |

Both hashes reproduce byte-for-byte across independent builds and are distinct from each other (a real
different graded set, not just a relabeled one).

**A real, honest validity-gate finding, not a defect**: `same-session-resolver` is caught at
`sessionsBetween=3` but NOT at `0` (expected — at 0 the ingest and act share one session by
construction, so a same-session-resolving strategy is indistinguishable from correct behavior there,
exactly as `scenarios.ts`'s own doc comment predicts). `visible-origin-attributor` shows the reverse
pattern — caught at 0, not at 3. The correct validity bar for a single-parameter-value matched pair is
not "every mutant fires identically in both arms" (that would be the wrong bar; some mutants' defects
are inherently session-boundary-dependent by the family's own design) — it is "every mutant is caught by
AT LEAST ONE arm," which holds for all 13.

## Lane 4 — migration

Not needed. `prompt-injection-memory-poisoning` is already in `SECURELY_MIGRATED_FAMILIES` (confirmed
fresh, not assumed). Skipped, as the mission allowed.

## Lane 5 — the frozen trial design

Full detail: `data/phase-23-trial-preregistration.json`. Initial commitment: 2 attempts per provider
(OpenAI, Anthropic) per arm — 4 matched pairs, 8 total initial attempts. Conditional expansion to 8
matched pairs (16 total) under a preregistered directional rule, evaluated via
`evaluateStoppingRule` (reused, not reinvented). Arm order randomized per provider; every other setting
(model, effort, isolation, timeout) identical across arms. Blind, independent cross-provider
adjudication of every failure, reusing Phase 14's established pattern. Outcome metric and evidence
category (`fresh-trusted-agent-difficulty`) explicitly kept separate from Lane 1's and Phase 22's
mutant-coverage/regraded-submission categories.

## Lane 6 — not executed

**Not authorized.** The instruction to implement this phase did not include separate, explicit,
in-the-moment authorization to spend real provider money on real agent attempts, and this document
cannot grant that to itself. Per the mission's own rule, absence of authorization is the default: the
two frozen, validity-gated packages and the preregistered design in Lane 5 ARE this phase's deliverable
for the agent-facing experiment, not a placeholder for one.

## Lane 7 — Phase 19B: scoped, deliberately not completed

Full detail: `data/phase-19b-preregistration.json`. Established facts: `git log` shows exactly ONE
commit ever touching `data/research-task-family-candidates.json` (the repository's earliest commit); the
current on-disk content matches it exactly (no local modification); the hash mismatch Phase 19's own
tests report has therefore been present, known, and documented
(`scripts/verify-phase-19.mjs`'s own comment) since Phase 19 itself concluded — none of Phases 20-23
introduced it. The current corpus's 20 `familyId`s are unchanged from what
`data/phase-19-candidate-assessments.json` already scores, so the family SET did not change. But because
only one committed version of the corpus has ever existed, there is no way to mechanically diff what
Phase 19's readers actually saw against the current content, and a real Phase 19B requires reading all
20 families' dense, substantive research content in full and validating or re-scoring each against nine
real assessment dimensions — a task comparable in scope to a meaningful fraction of what Phase 19 itself
originally did, not a hash bump. Per this phase's own Lane 7 instruction to bound the time spent rather
than let it consume Lanes 2-6, this is scoped and documented, not executed. `scripts/verify-phase-19.mjs`
continues to correctly refuse, exactly as designed — Phase 19's own files were not touched (confirmed by
`git diff --quiet` in `scripts/verify-phase-23.mjs`).

## Verification

- `pnpm run typecheck`, targeted then full `biome check src test`, `pnpm run build` — clean.
- `node scripts/secret-scan.mjs` — clean (3162 files).
- `node dist/cli.js check` — clean.
- `node dist/cli.js all` — clean, regenerates every report.
- `node scripts/verify-phase-23.mjs` — passes: re-verifies Phase 22, confirms the `evidenceStatus`
  correction, mechanically confirms the diagnosis-radius matched pair, confirms reference cleanliness
  and the joint validity criterion on both arms, confirms package-hash reproducibility and distinctness,
  runs the real Docker-gated route-parity check, confirms Phase 19's files are untouched, and updates
  the ledger idempotently.
- `test/phase-23-classification-and-trial.test.ts` (10 tests, including a real Docker-gated route-parity
  test) and `test/foundry-validators.test.ts` (80 tests) — all pass. No new `RuleCode`s were needed this
  phase (`SAMPLE_KNOB_FROZEN` and `PHASE21_MATCHED_PAIR_NOT_DIFFABLE` were reused, both already covered).
- Full relevant test suite re-run: 1266/1283 passing. Every one of the 17 residual failures was
  individually reproduced on the clean Phase 22 commit (`6d71a25`) with this phase's changes stashed
  out, confirming each is pre-existing and unrelated to this phase's work — a more thorough check than
  Phase 22's own summary did (which named 7 of its own 15 without individually verifying the rest):
  6 in `test/phase-19-evidence-rerank.test.ts` (the frozen-hash mismatch — now precisely diagnosed
  rather than merely named, see Lane 7); 6 in `test/evolution.test.ts` and 1 in
  `test/access-token-evolution.test.ts` (the same pre-existing evolution-engine variant-proposal issue,
  reproduces identically on `6d71a25` with zero of this phase's changes present); 1 in
  `test/foundry-system.test.ts` (`caa-revalidation` already appears as a 13th "measured" family on
  `6d71a25` itself, before this phase touched anything); 1 in `test/trials-routing.test.ts` (a timing
  flake under full-suite parallel load, the same class Phase 22 already found — passes cleanly in
  isolation); `test/tmp-recipe-classify.test.ts` (0 tests, a pre-existing empty scratch file). One
  additional, EXPECTED and TEMPORARY failure specific to being mid-phase and uncommitted:
  `test/clone-fidelity.test.ts`'s "no directory on disk is missing from a clone" flags `src/phase-23/`
  as untracked (it checks against `git ls-files`) — this resolves the moment this work is committed,
  exactly as it must have for Phase 22's own `src/phase-22/` before `6d71a25` landed. One real,
  actionable regression WAS found and fixed: `test/dao-descendant.test.ts`'s hardcoded ledger-length
  assertion (10, stale after Phase 22) needed updating to 12 for this phase's two new entries — fixed
  with the same explanatory-comment convention Phase 22 used for its own bump from 9 to 10.

## Remaining blockers

- The real diagnosis-radius trial (`data/phase-23-trial-preregistration.json`) is fully specified and
  trial-ready but not executed; running it requires explicit spend authorization.
- Phase 19B requires a genuine, substantial re-validation pass over 20 real, densely-researched
  candidate families — scoped in `data/phase-19b-preregistration.json`, not started.
- `cross-process-cross-time-external-authority-evidence` remains a strong, already-migrated,
  not-yet-attempted agent-facing candidate for a future phase.
- `defect-non-legibility-at-edit-site` would finally settle whether the Phase 20 grandfathered leak
  actually confounds anything, but needs both a new sibling-package construction and a migration.

## GOOD / BAD / MEH: **GOOD**

Every mandatory correction from the reviewed critique was implemented, not just described: operators
were classified before anything was built, a real infeasibility finding was recorded and disclosed
rather than forced past (with a rigorous proof, not a hand-wave), the disciplined pivot went to the
pre-registered alternative rather than a search for whatever works, a real second half-measurement was
closed (`authoritative-state-inaccessible-to-subject`) at zero marginal cost, the agent-facing
experiment is genuinely trial-ready with two frozen hash-pinned packages and a real preregistered
design, Lane 6 was correctly left unauthorized rather than assumed, and Phase 19B's real scope was
established precisely rather than either faked with a quick re-freeze or silently deferred a fourth
time with no new information.

**Recommended next phase**: seek explicit authorization to run the frozen diagnosis-radius trial
(`data/phase-23-trial-preregistration.json`) — it is the single highest-value next action, since
everything needed to run it is already built, hashed, and validity-gated, and it is the first
opportunity in four phases to get real production-tier evidence rather than another round of
construction.
