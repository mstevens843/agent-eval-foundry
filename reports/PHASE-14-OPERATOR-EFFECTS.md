# Phase 14 - Controlled Agent Operator Ablations

## Verdict

**MEASUREMENT STOPPED BY THE PREREGISTERED RULE.** All six seeded cells and both DAO neutral
sentinels solved cleanly. The remaining four neutral cells are intentionally unrun because the
frozen smoke and sentinel condition made them uninformative at this resolution.

Observed agent attempts: **8**. Countable: **8**. Clean solves: **8**. Reward zero: **0**. Agreed capability failures: **0**.
Provider-reported priced subject spend: **$1.99**, with 4 unpriced attempt(s). Blind labelling: **0** run(s), **$0.00** reported, with 0 unpriced run(s). Priced campaign spend: **$1.99**.
Authenticated preflight probes cost **$0.279485** plus one unpriced Codex call; preregistered campaign ceilings exclude preflight calibration.
No subject cell is currently unlocked. Follow the status and label decision above.

Reward zero and capability difficulty remain separate quantities. An unresolved or non-capability
failure changes the raw outcome table but never enters the capability tally or operator ranking.
No blind labels ran because no counted subject artifact failed; this is protocol compliance, not missing adjudication.

## Frozen Registration

The design was registered before agent output in `data/phase-14-preregistration.json` at SHA-256 `bbc31777883629466cf70eca0a9ce9597f1b78a15d4d65242c24d416c0ee1a56`, against baseline commit `d73a50b`.
It caps the campaign at 12 subject attempts, 24 labels, $180.00 subject spend, $60.00 labelling spend, and $240.00 total campaign spend.
Family and starter are attempt-level factors. Activation is a paired target-versus-control
description inside one submission. Selection is a deterministic rescore of that same artifact.
Scenario rows are never counted as independent model trials.

## Preflight

| provider family | subject execution | blind labelling | mode | evidence |
|---|---|---|---|---|
| openai | yes | yes | authenticated-container-probe | codex-cli 0.152.1 authenticated from a minimal read-only credential mount and completed a live API call inside the pinned provider image |
| anthropic | yes | yes | authenticated-container-probe | claude-code 2.1.260 accepted the explicit OAuth credential and completed live API calls both on the host and inside the pinned provider image |

Docker 29.3.1 is available. Provider-container plan B6: yes. No-network artifact smoke: yes.
The provider agent needs bridge networking for its vendor API. It receives only its own credential
channel and a writable per-attempt workspace with a nested read-only challenge. The submitted
module is then re-run with its family host in fresh no-network containers; the verifier remains
outside and consumes only the emitted calls, effects and reports.

Blocking conditions:

- None.

B6 in this preparation path covers preflight known-good/known-bad/malformed input, package
delta, blind-label adjudication, campaign manifests and both provider command plans. Every actual
grading invocation additionally runs reference, narrow known-bad and malformed host controls.

| Phase 13 family | campaign manifest | hash current | scenarios current | slots NOT_RUN | isolation |
|---|---|---|---|---:|---|
| `dao-descendant` | `campaigns/dao-descendant-transfer-smoke-2026-09.json` | yes | yes | 2/2 | subprocess |
| `trading-reconciliation-recompute` | `campaigns/trading-reconciliation-recompute-transfer-smoke-2026-09.json` | yes | yes | 2/2 | subprocess |
| `deployment-rollback-recompute` | `campaigns/deployment-rollback-recompute-transfer-smoke-2026-09.json` | yes | yes | 2/2 | subprocess |

## Frozen Packages

| family | starter profile | challenge hash | delta from seeded | local starter failures | host errors |
|---|---|---|---|---:|---:|
| `dao-descendant` | `seeded-recompute` | `9d89b49307a960f65f2e6e8f204fd15e` | none | 18/24 | 0 |
| `dao-descendant` | `neutral-skeleton` | `e1d2992c882776c1fc4fc733eb607949` | `README.md`, `starter/subject.mjs` | 24/24 | 0 |
| `trading-reconciliation-recompute` | `seeded-recompute` | `94bfc2c401ad2cc19f7e84e8a1270a08` | none | 18/24 | 0 |
| `trading-reconciliation-recompute` | `neutral-skeleton` | `32f7371b922fd001c9c43bf21db69e99` | `README.md`, `starter/subject.mjs` | 24/24 | 0 |
| `deployment-rollback-recompute` | `seeded-recompute` | `2ddfad2fd3287f752c41a408184b48ce` | none | 18/24 | 0 |
| `deployment-rollback-recompute` | `neutral-skeleton` | `65b9c7c0769a574e1f36341445c777d9` | `README.md`, `starter/subject.mjs` | 24/24 | 0 |

The Phase 13 preregistration hash is preserved: yes. Seeded challenge hashes are preserved: yes.
The neutral profile changes only `README.md` and `starter/subject.mjs`. Normative specification,
examples, harness, verifier and scenario set remain byte-identical.
The scenario lock has 54 activated targets and 18 controls across three families; 36 rows belong to the paired balanced views.

## Raw Agent Cells

| family | starter | provider | state | counts | reward | failure concentration | blind root cause | self-check evidence / outcome |
|---|---|---|---|---|---|---|---|---|
| `dao-descendant` | `seeded-recompute` | openai | COUNTED_SOLVE | yes | 1 | 0/18 T; 0/6 C | not-required-clean | ephemeral / green unknown |
| `dao-descendant` | `seeded-recompute` | anthropic | COUNTED_SOLVE | yes | 1 | 0/18 T; 0/6 C | not-required-clean | ephemeral / green unknown |
| `trading-reconciliation-recompute` | `seeded-recompute` | openai | COUNTED_SOLVE | yes | 1 | 0/18 T; 0/6 C | not-required-clean | ephemeral / green unknown |
| `trading-reconciliation-recompute` | `seeded-recompute` | anthropic | COUNTED_SOLVE | yes | 1 | 0/18 T; 0/6 C | not-required-clean | ephemeral / green unknown |
| `deployment-rollback-recompute` | `seeded-recompute` | openai | COUNTED_SOLVE | yes | 1 | 0/18 T; 0/6 C | not-required-clean | ephemeral / green unknown |
| `deployment-rollback-recompute` | `seeded-recompute` | anthropic | COUNTED_SOLVE | yes | 1 | 0/18 T; 0/6 C | not-required-clean | ephemeral / green unknown |
| `dao-descendant` | `neutral-skeleton` | openai | COUNTED_SOLVE | yes | 1 | 0/18 T; 0/6 C | not-required-clean | ephemeral / green unknown |
| `dao-descendant` | `neutral-skeleton` | anthropic | COUNTED_SOLVE | yes | 1 | 0/18 T; 0/6 C | not-required-clean | ephemeral / green unknown |
| `trading-reconciliation-recompute` | `neutral-skeleton` | openai | NOT_RUN | no | - | - | - | - / green unknown |
| `trading-reconciliation-recompute` | `neutral-skeleton` | anthropic | NOT_RUN | no | - | - | - | - / green unknown |
| `deployment-rollback-recompute` | `neutral-skeleton` | openai | NOT_RUN | no | - | - | - | - / green unknown |
| `deployment-rollback-recompute` | `neutral-skeleton` | anthropic | NOT_RUN | no | - | - | - | - / green unknown |

`NOT_RUN` contributes nothing. A self-check can be observed or described while its outcome remains
unknown; prose saying a check passed is not converted into `selfCheckGreen: true`.

## Attempt-Level Family Rates

| family | countable attempts | reward zero | exact 95% reward-zero interval | agreed capability | exact 95% capability interval |
|---|---:|---:|---|---:|---|
| `dao-descendant` | 4 | 0/4 | [0.000, 0.602] | 0/4 | [0.000, 0.602] |
| `trading-reconciliation-recompute` | 2 | 0/2 | [0.000, 0.842] | 0/2 | [0.000, 0.842] |
| `deployment-rollback-recompute` | 2 | 0/2 | [0.000, 0.842] | 0/2 | [0.000, 0.842] |

Intervals are Clopper-Pearson over independent agent attempts. They are wide at this smoke size;
the zero observed failures do not establish a zero population failure rate.

## Local Calibration, Not Agent Effects

| family | reference failures | narrow target | narrow control | concentrated-24 narrow | balanced-12 narrow |
|---|---:|---:|---:|---:|---:|
| `dao-descendant` | 0/24 | 18/18 | 0/6 | 18/24 | 6/12 |
| `trading-reconciliation-recompute` | 0/24 | 18/18 | 0/6 | 18/24 | 6/12 |
| `deployment-rollback-recompute` | 0/24 | 18/18 | 0/6 | 18/24 | 6/12 |

These deterministic reference/mutant outcomes prove activation and verifier discrimination.
A mutant written to embody the error is not evidence that an agent will make it.

## Effect Ledger

| estimand | class | independent attempts | status | estimate | exact 95% interval | interpretation |
|---|---|---:|---|---:|---|---|
| `E1-family` | family | 8 | measured-descriptive | 0.000 | [0.000, 0.369] | Raw reward-zero association across observed family strata; root-cause attribution is reported separately. |
| `E2-starter` | genuine-difficulty | 4 | measured-descriptive | 0.000 | - | Matched neutral-minus-seeded failure contrast. One stochastic attempt per cell limits causal precision. |
| `E3-activation` | genuine-difficulty | 8 | measured-descriptive | 0.000 | - | Paired within-artifact target minus control failure fraction; scenario rows are not independent trials and receive no binomial interval. |
| `E4-selection` | selection-coverage | 8 | measured-descriptive | 0.000 | - | Deterministic concentrated-minus-balanced scenario-failure fraction on the same artifact; a coverage effect, not an agent-behavior effect. |
| `E5-family-by-starter` | genuine-difficulty | 0 | not-estimable | - | - | All six family/provider matched starter pairs are required. |
| `E6-family-by-activation` | genuine-difficulty | 8 | measured-descriptive | - | - | Within-artifact activation contrast split by family; descriptive, not an independent scenario model. |

Measured operator ranking: empty; the DAO starter contrast was measured at 0.000 across both provider strata, so no operator effect is demonstrated.
The exact intervals are Clopper-Pearson intervals over independent attempts only. The hierarchical
model remains unfit: even all 12 cells provide one stochastic attempt per crossed cell, so stable
variance components would be prior-dominated.

## Corrections And Limits

- Phase 13's 24 scenario rows are one submission cluster, not 24 independent agent trials.
- The frozen 24-scenario suite has no U0C0 row. Activation is therefore a paired target-versus-nonactivation description, not the local Phase 13 2x2 agent design.
- The starter contrast changes starter code and the README row that accurately describes it; it is a registered package-profile effect, not a pure one-line code effect.
- Phase 13 campaigns used subprocess grading. Phase 14 executes provider agents in pinned containers and re-runs submitted modules in separate no-network containers before host-owned verification.
- Codex reports token usage but no dollar price. Its measured cost stays null and is counted as unpriced, never converted with a rate literal.
- A self-check is not marked green from model prose. The field remains null unless a machine-readable result survives capture.
- A cross-provider starter contrast measured at zero is retained as a measured null result and is not promoted into the demonstrated-operator ranking.
- Phase 12 made recipe profiles first-class in shape and evolution data but not in challenge-hash evidence lifecycle. The first neutral trial exposed the gap; registered variants now remain visible and are excluded from canonical family banks without being misclassified as package migrations.
- The provider image is pinned by CLI versions and recorded image identity, but provider API
  behavior is external and networked; this is weaker than the source task's Harbor boundary.
- Preflight spend is reported separately from subject and label spend. Codex dollar costs remain
  unknown because its CLI reports tokens but no price.

## Verification Baseline

| command | result | detail |
|---|---|---|
| `pnpm test` | pass | 53 files and 1089 tests passed before Phase 14 changes |
| `pnpm typecheck` | pass | baseline TypeScript check exited 0 |
| `pnpm lint` | pass | baseline Biome check exited 0 |
| `pnpm build` | pass | baseline package build exited 0 |

The report and machine ledgers regenerate from preserved artifacts. A package correction requires
a new challenge hash and replacement preregistration; no observed output is retained under a
corrected cell.
