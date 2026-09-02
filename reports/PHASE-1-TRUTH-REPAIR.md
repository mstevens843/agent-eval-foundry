# Phase 1 — Truth Repair

**Hand-authored. Not generated.** Every other file in `reports/` is produced by `node dist/cli.js all`
and byte-diffed by `scripts/verify-reports.mjs`. This one is written by a person-and-agent pass and is
not regenerated, because it is an argument about the repo rather than a measurement of it. Every
number in it is quoted from a generated report or from a command re-run at the time of writing.

Date: 2026-09-01. No model trial was run in this phase; everything below is local and deterministic.

---

## 0. The one-sentence result

Three of the eight built families shipped a **complete, passing solution as their "starter stub"**,
the repo's leak checker passed all three, and two of the three flagship difficulty results were
artifacts of that leak or of a harness bug — so the headline evidence has been withdrawn rather than
restated, counted trials went from 25 to 13, SHIP verdicts went from 5 to 2, and the gate that would
have caught all of it is now installed and blocking.

---

## 1. The before/after table

### 1.1 Starter grading — the proof that Findings A and B are closed

Every family's shipped starter, graded through its own hidden suite via
`routeFor(id).grade(examples/families/<id>/challenge/starter/subject.mjs)`. Re-run at the time of
writing; 0 host errors on every row.

| family | before | after | scenarios |
|---|---:|---:|---:|
| **access-token-scope-expansion** | **0 failed (0.0%)** | **384 failed (100%)** | 384 |
| **delegated-wallet-scope-reconciliation** | **0 failed (0.0%)** | **804 failed (100%)** | 804 |
| **deployment-model-alias-rollout-drift** | **0 failed (0.0%)** | **339 failed (100%)** | 339 |
| prompt-injection-containment | 108 (84.4%) | 108 (84.4%) | 128 |
| prompt-injection-memory-poisoning | 288 (100%) | 288 (100%) | 288 |
| checker-required-memory-poisoning | 792 (100%) | 792 (100%) | 792 |
| ui-action-record-replay | 174 (53.7%) | 174 (53.7%) | 324 |
| ui-replay-live-dom | 479 (55.4%) | 479 (55.4%) | 864 |

The three zeroes were not "a stub that happens to pass". The deployment-alias starter reproduced the
hidden `decideRollout` ladder including its reason codes, and published the undocumented sufficiency
threshold `currentSamples.length < 2` on line 43 — a number `SPEC.md` never stated in any numeral.

### 1.2 Counted trials

| family | counted before | counted after | why |
|---|---:|---:|---|
| prompt-injection-memory-poisoning | 8 | **0** | package repaired (facade contract, secret channel, M3/M5) |
| deployment-model-alias-rollout-drift | 2 | **0** | package repaired (starter stripped, 4 spec defects) |
| access-token-scope-expansion | 1 | **0** | package repaired (starter stripped, verifier blind spot) |
| delegated-wallet-scope-reconciliation | 1 | **0** | package repaired (starter stripped) |
| prompt-injection-containment | 6 | 6 | untouched |
| ui-action-record-replay | 5 | 5 | untouched |
| ui-replay-live-dom | 1 | 1 | untouched |
| checker-required-memory-poisoning | 1 | 1 | untouched |
| **repo-wide** | **25** | **13** | 15 trials superseded, all preserved on disk |

No trial directory was deleted or edited. Supersession is the existing hash-gating machinery doing
its job; the only manual work was writing the migration records that explain it (§1.7).

### 1.3 Ship verdicts

| | before | after |
|---|---:|---:|
| SHIP | 5 | **2** |
| HOLD | 1 | **0** |
| NOT-READY | 12 | **16** |

The two survivors are `ui-action-record-replay` and `ui-replay-live-dom`. Every family that lost SHIP
lost it to `difficulty-evidenced`, which is now blocking on a `capability` root cause rather than on a
nonzero trial count.

### 1.4 Agent axes

The published `>=2` for three families each came from **one** failing subject, because
`chain-analysis.ts:106` returned the literal `2` whenever the failure sets were not a chain.

| family | published | measured |
|---|---|---|
| checker-required-memory-poisoning | `>=2` | not measurable — fewer than 2 counted failing subjects |
| ui-replay-live-dom | `>=2` | not measurable — fewer than 2 counted failing subjects |
| deployment-model-alias-rollout-drift | `>=2` | 0 (no counted trial survives) |
| prompt-injection-memory-poisoning | `>=2` | 0 (no counted trial survives) |
| ui-action-record-replay | 1 | 1, bounded above by the 4-subject bank |

On the old constant the funnel's `agentAxes >= 2` production branch would have **opened for three
families**. With measured values it stays correctly closed for all of them.

### 1.5 Shared subjects

`sharedSubjectCount` intersected each family's subjects with the imported outbox bank only. That bank
is `{claude-opus-5, gpt-5.6-sol}`, so the metric was **capped at 2 by construction** while the gate
threshold is 3 — `shared-bank-ready` was not merely wrong, it was **unsatisfiable**.

| family | printed before | measured after |
|---|---:|---:|
| prompt-injection-containment | 2 | **4** (passes) |
| ui-action-record-replay | 2 | **4** (passes) |
| ui-replay-live-dom | 1 | 1 |
| checker-required-memory-poisoning | 1 | 1 |
| the four decounted families | 2 / 2 / 1 / 1 | 0 |

The threshold was **not** lowered. It is now meetable and two families meet it.

### 1.6 Outbox import

| | before | after |
|---|---:|---:|
| counted | 20 | **15** |
| failed >= 1 | README claimed 20; importer produced 13 | **13** |
| synthetic cells | 480 (312 failed, 168 fabricated passes) | **360** |
| runs excluded for running a different task | 0 | **7** |

Five counted runs were `reorg-safe-settlement` / `check-reorg-safe-settlement`, all reward 1.0. They
are still recorded, with a reason, exactly as cheat and gate runs already were. Reward-1 runs no
longer emit 24 cells of `failed: []`; those cells now carry an explicit `unmeasured` marker, because
a single aggregate bit cannot support 24 named per-scenario passes.

### 1.7 Lineage and the "matrix spend avoided" figure

| | before | after |
|---|---|---|
| lineage verdict | `lineage_solved_twice` / `reallocate` | withdrawn; branch status **unknown** |
| smoke status (both nodes) | `clean-pass`, counted | withdrawn |
| **matrix spend avoided** | **$97.32** | **$0.00** |
| matrix spend deferred and still owed | — | **$97.32** |

Spend avoided on the strength of a package that shipped its own answer is not avoided. It is deferred,
and the matrix is still owed once the families are re-measured.

### 1.8 Gates

| | before | after |
|---|---|---|
| advertised | "37 gates, 14 blocking, 23 advisory" | "37 gates: **9 blocking**, **5 schema-enforced**, 23 advisory" |
| `mechanisms-exercised` | the same boolean as `reference-passes` | computed independently from the sweep |
| gates that have never rejected anything | not reported | **27 of 37**, and the blocking ones are named |
| gates that have ever fired | 2 | 2 (unchanged — now stated) |

The five schema-enforced gates (`solvable`, `trust-boundary`, `fairness`, `cheat-resistance`,
`hidden-region-declared`) are honest checks that a shape violating them cannot even load, so counting
them as blocking inflated the number. They are kept, relabelled, and counted separately.

### 1.9 Other published numbers

| figure | before | after |
|---|---|---|
| mutant bank | 91 | **98** (6 new mutants registered + 1 backfilled) |
| candidate pool (README said 50 *and* 51) | 50 / 51 | **52**, generated |
| transfer tests (README) | 7 | **11** |
| mechanism probes (README) | 9 | **10** |
| README Evidence Snapshot | hand-typed, 3 of 5 hashes stale, 5 rows claiming SHIP | deleted; generated as `reports/evidence-snapshot.md` |
| tests | 730 (1 failing) | **902 (0 failing)** |

---

## 2. The root-cause ledger

All 30 trials on disk carry a `root-cause.json` with a label from a closed enum, the evidence read,
and the labeller's identity. Distribution:

| label | count |
|---|---:|
| `clean` (passed; nothing to attribute) | 13 |
| `unlabelled` | 5 |
| `harness-contract-violation` | 3 |
| **`capability`** | **3** |
| `spec-contradiction` | 2 |
| `infrastructure` | 2 |
| `spec-underspecified` | 1 |
| `package-leak` | 1 |

**Three of thirty trials are capability findings, and all three are in the UI families.** The full
per-trial table is in `reports/` alongside each trial; the load-bearing rows:

| trial | label | evidence |
|---|---|---|
| `deployment-model-alias-rollout-drift-2026-08-o1` | **package-leak** | all 192 failures are one reading of one question the visible package answered only inside the shipped solution |
| `mp-claude-r1`, `mp-claude-r3`, `mp-codex-3` | **harness-contract-violation** | re-graded through both the current and the pre-repair host; 32 → 0 under the contract the README promised |
| `mp-claude-2`, `mp-codex-2` | **spec-contradiction** | the action was blocked correctly in every failing cell; only the cited rule code differs |
| `mp-haiku-1`, `mp-sonnet-1` | **unlabelled** | mechanism established and unchanged under the repaired host, but the format forbids an *automated* labeller from writing `capability` over a diagnosis flagged for human read |
| `mp-gemini-1` | **infrastructure** | the CLI died at authentication; the subject was never reached |
| `live-dom-2026-08-o1` | **infrastructure** | crashed before writing anything; zero scenarios graded |
| `ui-claude-1`, `ui-claude-2`, `live-dom-2026-08-o2` | **capability** | the submissions quote the published rules, implement them, and get the behaviour wrong |

The `unlabelled` rows are the gate working rather than the labeller failing.
`ROOTCAUSE_CAPABILITY_OVER_UNREAD_DIAGNOSIS` refuses an automated `capability` stamp over a diagnosis
that needs a human read — and **both** of this repo's published mis-labellings had exactly that shape.
A human may override; the record then shows that a person did.

---

## 3. What is still true

- **The instrumentation is real.** Every defect in this report was found with the repo's own machinery
  — the hash gate, the migration guard, the stale-run guard, the mutant-coverage test, the dangling-ref
  check. Four of them fired on work done *during* this phase, including on text written by the agent
  fixing them.
- **`ui-action-record-replay` and `ui-replay-live-dom` still SHIP**, and their evidence was untouched:
  their hashes did not move, their trials still count, and their three `capability` labels survived
  adjudication.
- **The reference passes every graded scenario in all 8 families**, verified after every repair.
- **The UI family's chain reading was always honest.** Five counted trials across four subjects and two
  labs, failure counts 33/46/62/62/90 — five numbers that are one measurement. The repo said so before
  this phase and says so now.
- **Superseded evidence is preserved.** 15 invalidated trials, the adversarial audit, and the external
  intake packet all remain on disk with their artifacts. Nothing was deleted to make a number better.
- **The prompt-injection-containment family's six clean passes** remain six clean passes; that family
  was already NOT-READY on `not-already-solved` and still is.

---

## 4. What is now unknown

Withdrawn, with what would restore each.

| claim | status | what would restore it |
|---|---|---|
| "cross-lab failure generalises" (memory-poisoning) | **withdrawn** | re-run the 6 preserved submissions' models against hash `7443bf6d…`; the artifact pair must be re-attempted, the genuine three re-confirmed |
| "192/339 vs 0/339 is a provider delta" (deployment-alias) | **withdrawn** | n≥3 per lab against hash `805efb58…` with the starter stripped and the threshold published |
| "access-token / delegated-wallet are already solved" | **withdrawn** | one counted smoke each against `8ae0950d…` / `45f27b64…` |
| "$97.32 of matrix spend avoided" | **withdrawn** | nothing — it was never avoided; it is owed |
| deployment-alias is a viable family at all | **open** | see §5.4 — this is a judgement, not a measurement, and I did not resolve it |
| 5 trials' root cause | **`unlabelled`** | a human read; the evidence is on disk and the mechanism is established for `mp-haiku-1` / `mp-sonnet-1` |
| adversarial verifier-integrity for deployment-alias | **superseded** | a fresh audit against the repaired package |

---

## 5. Where I disagree with the audit

The audit was run against a moving tree and several items were reported rather than re-run. I checked
each. Five were wrong or incomplete, in both directions.

### 5.1 Finding B — "one undefined word" is wrong, and the truth is worse

The audit says the sufficiency quantity appears nowhere in the visible package. It does: the shipped
`challenge/starter/subject.mjs:43` contains `currentSamples.length < 2` verbatim, byte-identical in
the examples package and in **both** trial packets. So the 192-vs-0 split does not measure who read the
starter carefully — it measures **who kept the starter's decision function and who replaced it**. The
one-numeral experiment reproduces exactly as claimed (192/339 → 0/339); the diagnosis around it does not.

The audit also understated the leak: it called the deployment-alias starter "a near-verbatim port".
Graded as a submission, that starter scores **0 failures out of 339**. It is not a port, it is the answer.

### 5.2 Finding C — the cross-lab result is *half* artifact, not whole

Re-grading all six preserved submissions through a one-facade-per-scenario host:

| subject | stock | shared facade | verdict |
|---|---:|---:|---|
| mp-claude-r1 | 32 | **0** | artifact |
| mp-codex-3 | 32 | **0** | artifact |
| mp-haiku-1 | 32 | 32 | genuine |
| mp-sonnet-1 | 42 | 42 | genuine |
| mp-codex-2 | 13 | 13 | genuine (separate M3/M5 defect) |

The claim that actually dies is narrower and more specific than the audit's: **"7 of 10 cross-lab pairs
are identical or nested"** in `provider-variance-report.md`. All three identical pairs involved
`mp-codex-3`. After the fix: zero.

### 5.3 Finding E1 — refuted

`MEASURED_FAMILIES` (`loop.ts:60-69`) lists **all 8** families and is set-equal to `BUILT_FAMILY_IDS`.
The audit's mechanism is wrong. The *symptom* was real, and its cause is worse: **`node dist/cli.js all`
was aborting at the first violation**, so reports on disk were stale wholesale. `foundry-evolution-report.md`
regenerated from unchanged code flips that row from NOT-READY/0 trials to SHIP/2 trials.

### 5.4 Finding B second half — three rule codes, not four

Confirmed that 9 of 14 knobs never change the expected label (verified twice: counterfactually on all
339 anchors, and exhaustively over the full 663,552-point space, zero flips both ways). But only
**three** of ten published rule codes are ever an expected reason (DMD4 109, DMD5 96, DMD7 38) — the
fourth label value is `ALLOWED`, which `spec.ts:46` defines separately and which is not a rule code.

**My judgement on whether the family survives:** the four SPEC defects are repaired and the starter is
stripped, so it is no longer measuring transcription. But after all that it is a 48-row truth table
over five predicates advertised as a 663,552-point space, and the knobs the family is *named for*
(`currentVersionState`, `cacheState`, `providerDisagreement`) never move the answer, because
`decideRollout` ignores the cached view entirely. `quarantineThreshold` (0.05) is read by nothing.
I did **not** retire it and did **not** silently keep it. Recommendation: **one counted smoke per lab
against `805efb58…` decides it.** If the delta survives a starter-free package, do the minimum-viable
mechanism work — make `mixed_versions` actually drop the in-window count below sufficiency, make
`misattributed` flip the answer for a subject that reads `publicVersionLabel`, and put at least one
scenario between `quarantineThreshold` and `rollbackThreshold`. If it does not, retire it.

### 5.5 Smaller corrections

- **Finding D**: 24 standard-prefixed runs, not 26. The importer counted 20; 13 had a failing cell.
  The README's "20 failed >= 1" did not match the importer's own output *before* any of this.
- **Finding E2**: not "every family reports 1" — four reported 1 and four reported 2. The real defect
  is that the metric is capped at 2 against a threshold of 3.
- **Finding E4**: confirmed, plus a **second** last-wins Map the audit missed, in
  `discovery-workbench-report.ts:47`. Fixing only the first would have left the report lying.
- **Task 5**: `SMOKE-EVIDENCED` **does not appear anywhere in the repo**. The invented verdict in the
  README table was `PROVIDER-DELTA`, and no code emits that either. `ShipVerdict` already has a state
  for what it was trying to say (`HOLD`), so no new state was added.

### 5.6 Things nobody had noticed

- The kill-analysis loop keyed on `already_solved`, so once a family's counted trials hit zero its
  report **stopped being regenerated** — stale files claiming a clean smoke pass would have sat in
  `reports/` indefinitely.
- `evolution-validation-report.md` reported "the rate does not move with the knob" over **zero rows**:
  an absence created by a repair, presented as a measurement.
- `access-token`'s `scope_bound_exactly` never inspected the issued grant. A subject making every
  correct decision while issuing `admin:invoice` on `invoice-*` for `ops-bot` scored **0 failures out
  of 384** — a 0% detection rate on the family's own mechanism. Its sibling caught the equivalent on
  336 of 804.
- `reports/ship-gate-report.md` was byte-identical to `ship-recommendation.md` and matched neither
  generator's output.
- Six mutants were referenced by shapes but never registered in the bank.
- Four repairs had invalidated 15 trials with **no migration record**; the guard that demands one
  fired only once the reports were regenerated.

---

## 6. Verification

Run at the time of writing:

```
pnpm exec tsc --noEmit --pretty false   clean
pnpm lint                               clean, 249 files
pnpm test                               902 passed, 38 files, 0 failures
pnpm build                              clean
node dist/cli.js check                  passes
pnpm verify                             see note below
```

`pnpm verify` takes over ten minutes on this machine and is therefore CI-wired rather than folded into
`pnpm test`; the reasoning is recorded with the change. Report freshness was previously caught by
nothing.

## 7. What Phase 2 is owed

1. Containerised runs with **observed** model ids, n≥3 per lab, against the four repaired hashes.
2. A human clean-room solve per repaired family — the packages changed materially and the human claims
   attached to the old ones are stale.
3. A fresh adversarial audit for deployment-alias against `805efb58…`.
4. A human read on the 5 `unlabelled` trials.
5. The deployment-alias keep/rebuild/retire decision (§5.4), which needs exactly one counted smoke per
   lab to settle.
