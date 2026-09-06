# Phase 22 — Transfer Infrastructure And The First Real Signal (mandatory-corrections revision)

Hand-authored, like `reports/PHASE-21-OPERATOR-CAUSAL-LAB.md` and `reports/PHASE-20-VERIFIER-TRUST-BOUNDARY.md`
before it. This phase's mandate was corrections-first: fix the methodological gaps a reviewing agent
found in Phase 21's pilot and in an earlier draft of this phase (no train/test split, statistical
overclaiming on hand-authored mutants, a proposed "universal" family editor, pre-authorized real spend)
before doing anything else. Executed fully autonomously per explicit operator instruction, with Lane 6
correctly left unexecuted because real-time spend authorization cannot be obtained from an absent
operator.

## Lane 0 — audit and freeze the preregistration

Full detail: `data/phase-22-preregistration.json`. Headline findings:

- **Phase 21 re-verified clean** — rebuilt `dist/`, re-ran `node scripts/verify-phase-21.mjs` (19/19
  tests across schema, matched-pair, McNemar, stopping rule, and the local pilot) fresh rather than
  trusting Phase 21's own summary.
- **All four preserved Phase 17 caa-revalidation submissions are compatible with the current live
  package.** Computed the current challenge hash directly (`prepareChallenge` → `c2948f2c26f2231ceaa47d0ec2d3f04a`,
  `scenarioSetId=revalidation-24-bd3bcd60`) and independently recomputed each preserved trial's own
  `challenge/` directory hash (`hashChallengeDir`), cross-checking both against `metadata.json`'s
  `registeredChallengeSha256`. All three numbers agree, for all four trials. This is what makes Lane
  3's regraded-submission evidence real rather than honestly skipped.
- **Second-family audit for the conditional Lane 5 transfer target**: only `caa-revalidation` and
  `prompt-injection-memory-poisoning` are cell-container migrated, so the transfer target was drawn from
  that set. `prompt-injection-memory-poisoning` (source: `src/families/memory-poisoning/`) has the same
  enumerate/select/generate separation the operator's precondition requires and its own 13-mutant bank,
  but a structurally different `verify({scenario, ledger, writes, report})` signature — confirming the
  need for per-family adapters rather than one shared editor. Preregistered as the transfer target
  *conditional on* a real Lane 3/4 signal; not built, because none materialized (see Lane 5 below).
- **Mutant envelope designed and frozen** (`src/phase-22/mutant-envelope.ts`,
  `data/phase-22-mutant-envelope.json`): a development bank (the original nine shipped mutants,
  unchanged — the ones Phase 21's selectors were built and piloted against) strictly disjoint from a
  held-out bank of eight new mutants, never seen during that construction. Two axes that were tried and
  dropped on direct empirical evidence, not judgment: result-order permutations and wider boundary-age
  offsets both turned out to produce a `mutantBehaviorHash` byte-identical to an existing development
  mutant, over the full 192-scenario space — this family's `caa_result_shape` check and its five-value
  discrete `AGE_PATTERNS` genuinely have no room for a non-redundant new mutant on those axes without
  editing `verify()`/`scenarios.ts`, which stay fixed. A "persistence/write-back contamination" mutant
  was not built at all: the family has no such mechanism to construct one for. What survived is a
  first/last/middle donor-position × 1/2/all collapse-width grid (eight cells; the ninth,
  first-donor/all-width, is the development bank's own `first-name-reuse`) — every one of the eight
  independently verified, by full-space behavioral fingerprint, to be distinct from every development
  mutant and from every other held-out mutant. One pre-existing redundancy was found in the *shipped*
  development bank itself (`no-query` and `fabricated-result` share a fingerprint, because this family
  hardcodes every cached answer to `ALLOW`) and deliberately left alone — real, out of this phase's
  scope, recorded rather than hidden.

## Lane 1 — the frozen mutant envelope

Built as part of Lane 0's design (same file: `src/phase-22/mutant-envelope.ts`). `assertEnvelopeSound`
mechanically enforces, on every `buildMutantEnvelope()` call: development/held-out id disjointness,
every mutant's failure rate over the full 192-scenario space strictly between 0% and 100% (not vacuous,
not universal), and held-out fingerprint uniqueness (against every development entry and against every
other held-out entry). `bankHash` (`0140428542f44980121ecf94ff4ef47d`) reproduces byte-for-byte across
independent builds — verified in both `test/phase-22-transfer.test.ts` and `scripts/verify-phase-22.mjs`.

## Lane 2 — the generic orchestrator and the OperatorAdapter interface

Rejected the "universal function" design from the earlier draft: `caa-revalidation`'s
`verify({scenario,report,queries})` and `memory-poisoning`'s `verify({scenario,ledger,writes,report})`
do not share a shape, so one editor across arbitrary families either half-works or silently assumes
structure a family doesn't have.

Built instead: `src/phase-22/operator-adapter.ts` declares a family-agnostic `OperatorAdapter`
interface — every scenario and subject value crosses it as an opaque `unknown`. `src/phase-22/orchestrator.ts`
owns only family-agnostic bookkeeping: build the naive/targeted matched pair, mechanically confirm it
via `requireMatchedPair` (Phase 21's own module, reused unchanged) that only the operator's declared
`shapeFieldsEdited` differ, grade the mutant bank under both selectors, and hand the result to Phase
21's stopping rule (also reused unchanged). A family with no registered adapter is refused
(`PHASE22_ADAPTER_NOT_FOUND`) rather than silently run through an unproven generic path. Adapter
registration is an explicit function call (`registerAllAdapters()`), not an import-time side effect —
this package declares `"sideEffects": false`, and a registration import kept only for its side effect
is a real risk of being silently tree-shaken by any bundler that takes that declaration at its word
(confirmed empirically: an `esbuild` bundle of a naive side-effect-import script dropped the
registration entirely).

One real adapter built: `src/phase-22/adapters/caa-revalidation-adapter.ts`, reusing
`selectNaiveBaseline`/`selectSmallTargeted` (Phase 21's pilot module, unchanged — those two functions
*are* the operator under test) and wrapping `runCell` as `gradeCell`. No `memory-poisoning` adapter was
built (see Lane 5).

## Lane 3 — real results, three separate evidence categories

All three sources were run for real, against the frozen envelope, and are reported separately —
**never combined into one number.**

### Evidence category 1: mutant-coverage (hand-authored, correlated mutants)

Ran `runCoverageExperiment` for both banks at both the shipped quota (24) and a stress quota (3),
matching Phase 21's own two-size design:

| bank | quota | caught by naive | caught by targeted | discordant (targeted wins) | discordant (naive wins) | concordant | McNemar p (secondary, caveated) |
|---|---|---|---|---|---|---|---|
| development | 24 | 9/9 | 9/9 | 0 | 0 | 9 | 1.0000 |
| development | 3  | 9/9 | 9/9 | 0 | 0 | 9 | 1.0000 |
| held-out    | 24 | 8/8 | 8/8 | 0 | 0 | 8 | 1.0000 |
| held-out    | 3  | 8/8 | 8/8 | 0 | 0 | 8 | 1.0000 |

Reference implementation clean under both selectors, every bank, every quota — no validity regression.
The exact discordant/concordant counts above are the primary, descriptive result; the p-values are
reported only as a secondary, explicitly-caveated statistic (`CoverageRunResult.secondaryCaveated`
states, verbatim in code, that this family's hand-authored mutants are not independent samples and the
test's independence assumption does not hold for them). **Zero discordant pairs at every size, both
banks — an honest null, not a search that came up empty by accident.** The mechanism: even the naive
selector's deterministic FNV-1a tie-break, at N=3, already includes 2 of 3 activated scenarios for this
specific frozen space — the "uniform draw could plausibly miss it by chance" premise the operator's
causal claim depends on does not hold for *this* naive baseline against *this* space, at *these* sizes.

### Evidence category 2: within-family replication (Lane 4)

`src/phase-22/within-family-replication.ts` — new, generic module (Phase 21 had no within-family
replication tier at all; only one variant existed per family). Applied to the two independent quota
sizes above: **`REPLICATED-NULL`** for both banks (every condition reached a null or
exhausted-without-significance stopping decision — consistently, not size-dependently).

### Evidence category 3: regraded-real-submission evidence (real Docker, zero new spend)

All four compatible preserved Phase 17 submissions (2 OpenAI, 2 Anthropic slots) regraded through the
Phase 20 trusted executor (`runSecureContainerHost`, real containers, no network) against both a
naive-24 and a targeted-24 hidden suite — 8 real container-graded suite-runs, not a new counted trial,
not exposing selector identity to the subject (the subject is a frozen, already-submitted file; only
which scenarios it is re-run against varies).

| slot | naive-24 | targeted-24 |
|---|---|---|
| phase17-caa-slot-1-openai-attempt-1 | clean | clean |
| phase17-caa-slot-2-anthropic-attempt-1 | clean | clean |
| phase17-caa-slot-3-openai-attempt-1 | clean | clean |
| phase17-caa-slot-4-anthropic-attempt-1 | clean | clean |

All four submissions graded clean under both suites — no discordance. This is a distinct evidence
category from mutant-coverage (it asks whether *real* agent behavior differs with the suite, not
whether a *hand-built* known-bad implementation gets exposed) and is reported separately, never merged
with the counts above.

## Lane 5 — cross-family transfer

**Not attempted, per the mission's own conditional gate.** Cross-family transfer is strictly conditional
on a real, non-null, replicated, correctly-directed primary-family signal. All three evidence
categories on `caa-revalidation` produced the same null, replicated across quota sizes. Per the mission:
"stop and record the null." Done — see the ledger update below. No `memory-poisoning` adapter or mutant
envelope was built; doing so before knowing whether there was a primary-family effect worth
transferring would have been exactly the unearned scope this phase's corrections exist to prevent.

## Categorical verdict

**`NULL-ON-FAIR-ENVELOPE`** — mechanically derived (not asserted) in `scripts/verify-phase-22.mjs` from
the held-out bank's replication verdict (`REPLICATED-NULL`) and its zero discordant pairs in both
directions. Recorded into `data/hardness-operators.json` as
`phase22-hidden-scenario-selection-targets-narrow-mutants-caa-revalidation` (confidence: `medium` — a
real null with nonzero concordant pairs, not a `low`-confidence non-measurement), distinct from and
alongside Phase 21's own dev-bank-only pilot record (kept, not overwritten — a different, weaker
methodology's result, not silently superseded).

## Lane 6 — conditional real-agent pilot

**Fully specified, not executed.** Per the mission's own explicit constraint, executing it would spend
real provider money and requires separate, explicit, in-the-moment operator authorization — not
something this document, or an earlier draft's proposed override language, can pre-grant. The operator
was unavailable for the duration of this phase; absence of authorization is the default, not a blocker
to everything else. Specification (unchanged from the corrected design agreed before execution): 2 Codex
+ 2 Claude initial attempts against the held-out-informed targeted suite vs. the naive suite, 2-of-2
blind adjudication per differential, conditional expansion to 6 under a preregistered directional rule.
Given Lane 3's null, the operator's own logic would likely direct this at a *different* operator or
substrate before spending on this one — but that decision is explicitly deferred to the operator, not
made here.

## Lane 7 — a second operator using the same orchestrator

**Not attempted.** Lanes 0-5 consumed the full session's available time budget rigorously; per the
mission's own instruction ("only if genuinely spare, high-quality time remains"), no time was spare.

## Verification

- `pnpm run typecheck`, `npx biome check src test scripts` (targeted paths touched this phase),
  `pnpm run build` — clean.
- `node scripts/secret-scan.mjs` — clean.
- `node dist/cli.js check` — clean.
- `node scripts/verify-phase-22.mjs` — passes; regenerates `data/phase-22-mutant-envelope.json`,
  reproduces the envelope's `bankHash` byte-for-byte across two builds, runs all four coverage
  experiments, assesses replication, smoke-tests the regrade path through real Docker, and appends the
  ledger record idempotently (a second run correctly detects the existing id and does not duplicate it).
- `test/phase-22-transfer.test.ts` (16 tests) — envelope soundness (disjointness, non-vacuous/universal
  failure rates, fingerprint-collision refusal), adapter registry fail-closed refusal, the orchestrator's
  real coverage experiment (including a refusal test: an adapter whose targeted selector is wired to
  equal its naive selector correctly trips `PHASE21_MATCHED_PAIR_NOT_DIFFABLE`), all five within-family
  replication verdict branches, and a real Docker-gated regrade of a preserved submission — all pass.
- `test/foundry-validators.test.ts` — updated with `PHASE22_ENVELOPE_INVALID` and
  `PHASE22_ADAPTER_NOT_FOUND` (both exercised in `phase-22-transfer.test.ts`, both real call sites in
  production code; a third candidate code, `PHASE22_EVIDENCE_CATEGORY_CONFLATED`, was drafted and then
  removed before use — no real call site existed for it, and Phase 21 already learned that lesson once.
  Full suite: 80 tests pass.
- Full relevant test suite re-run. **Pre-existing, independently confirmed unrelated failures** (verified
  by reproducing them on the Phase 21 commit with this phase's changes stashed out): six tests in
  `test/phase-19-evidence-rerank.test.ts`, all failing on the same `RigInputError`
  (`data/research-task-family-candidates.json: frozen input changed`) — a frozen-hash mismatch that
  predates this phase entirely and is untouched by it.

## Remaining blockers

- No family has current production-level (Lane 6-tier) evidence; this phase did not change that —
  generating any still requires explicit spend authorization.
- The `test/phase-19-evidence-rerank.test.ts` frozen-hash mismatch is real and pre-existing; it was not
  investigated or fixed here (out of this phase's scope), but it should not keep being carried forward
  silently either.
- `memory-poisoning`'s adapter and mutant envelope remain unbuilt — correctly gated behind a primary-
  family signal that did not materialize, but if a future phase decides to test transfer anyway (e.g.
  to see whether even a *replicated null* transfers as a null), building that adapter is the next
  concrete step.
- Only one operator (`hidden-scenario-selection-targets-narrow-mutants`) has been run through the new
  orchestrator; the other eleven from Phase 21's taxonomy remain unmeasured.

## GOOD / BAD / MEH: **GOOD**

Every mandatory correction from the reviewed critique was actually implemented and checked, not just
described: a real train/test split with an empirically-verified non-redundant held-out bank (two
candidate axes were tried and honestly dropped when they turned out redundant, rather than shipped
anyway to hit a target count); primary evidence reported as exact counts with the p-value demoted to a
caveated secondary statistic; a real adapter architecture that would survive a second family being added
without touching the orchestrator; a third, genuinely free evidence category (regraded real submissions)
that would have been easy to skip and wasn't; and Lane 6 was specified in full but correctly left
unauthorized and unexecuted rather than adopting another agent's suggested pre-authorization language.
The result itself is a null — that is not a failure of this phase. A phase that had shipped a fabricated
positive result, or silently combined evidence categories to manufacture one, would have been the actual
failure mode this correction round exists to prevent.

**Recommended next phase**: before spending anything on Lane 6, use the now-generic orchestrator to run
a *second* operator from Phase 21's twelve-operator taxonomy end to end (Lane 7, done properly with its
own dedicated time rather than as an afterthought) — ideally one with `evidenceStatus: "untested"` in
`data/phase-21-operators.json` rather than another already-piloted scenario-selection variant, so this
phase's infrastructure gets to prove itself on a genuinely new question instead of re-confirming the
same null a second way.
