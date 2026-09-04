# Phase 14 - Controlled Agent Operator Ablations

## Verdict

**BLOCKED BEFORE MEASUREMENT.** The preparation is complete, but the registered cross-provider
preflight did not pass. Anthropic subject execution and blind labelling are unavailable in this
runner, and the provider CLIs do not yet have a validated container execution path. Per the
preregistration, no OpenAI-only substitute ran.

Observed agent attempts: **0**. Countable attempts: **0**. Spend: **$0.00**.
No family effect, operator effect, interaction, solve rate or capability-failure rate was measured.
The measured operator ranking is therefore **empty**, not tied and not zero-effect.

## Frozen Registration

The design was registered before agent output in `data/phase-14-preregistration.json` at SHA-256 `bbc31777883629466cf70eca0a9ce9597f1b78a15d4d65242c24d416c0ee1a56`, against baseline commit `d73a50b`.
It caps the campaign at 12 subject attempts, 24 labels and $240.00 total spend.
No agent output was inspected and no cell was redesigned after registration.

The attempt-level factors are family (`F`) and starter profile (`T`). Activation (`A`) is a
paired target-versus-control comparison inside one submission. Selection (`Q`) is a deterministic
rescore of that same submission. Scenario rows are not independent model trials.

## Preflight

| provider family | subject execution | blind labelling | mode | evidence |
|---|---|---|---|---|
| openai | yes | yes | configured | the provider registry reported Codex configured through codex-cli 0.152.1 |
| anthropic | no | no | import-only | the provider registry reported Claude import-only because this runner has no explicit Anthropic execution credential |

Docker 29.3.1 was available and the submitted-artifact no-network smoke passed: yes.
That proves artifact grading isolation only. The generic provider container uses a base image
without the provider CLIs unless a purpose-built image is supplied, so provider-agent container
execution remains unvalidated. Existing Phase 13 campaigns record subprocess isolation.

Blocking conditions:

- anthropic subject execution unavailable
- anthropic blind labelling unavailable
- provider-agent container execution is not integrated for both provider CLIs

B6 ran in the same preparation invocation:

- Preflight known-good passed: yes; known-bad failed: yes; malformed input refused: yes.
- Package-delta rig usable: yes. Blind-label adjudication rig usable: yes.
- Phase 13 campaign-audit rig usable: yes.

| Phase 13 family | campaign manifest | hash current | scenarios current | slots NOT_RUN | isolation |
|---|---|---|---|---:|---|
| `dao-descendant` | `campaigns/dao-descendant-transfer-smoke-2026-09.json` | yes | yes | 2/2 | subprocess |
| `trading-reconciliation-recompute` | `campaigns/trading-reconciliation-recompute-transfer-smoke-2026-09.json` | yes | yes | 2/2 | subprocess |
| `deployment-rollback-recompute` | `campaigns/deployment-rollback-recompute-transfer-smoke-2026-09.json` | yes | yes | 2/2 | subprocess |

## Frozen Packages

| family | starter profile | challenge hash | delta from Phase 13 package | local starter failures | host errors |
|---|---|---|---|---:|---:|
| `dao-descendant` | `seeded-recompute` | `9d89b49307a960f65f2e6e8f204fd15e` | none | 18/24 | 0 |
| `dao-descendant` | `neutral-skeleton` | `e1d2992c882776c1fc4fc733eb607949` | `README.md`, `starter/subject.mjs` | 24/24 | 0 |
| `trading-reconciliation-recompute` | `seeded-recompute` | `94bfc2c401ad2cc19f7e84e8a1270a08` | none | 18/24 | 0 |
| `trading-reconciliation-recompute` | `neutral-skeleton` | `32f7371b922fd001c9c43bf21db69e99` | `README.md`, `starter/subject.mjs` | 24/24 | 0 |
| `deployment-rollback-recompute` | `seeded-recompute` | `2ddfad2fd3287f752c41a408184b48ce` | none | 18/24 | 0 |
| `deployment-rollback-recompute` | `neutral-skeleton` | `65b9c7c0769a574e1f36341445c777d9` | `README.md`, `starter/subject.mjs` | 24/24 | 0 |

The frozen Phase 13 preregistration hash still matches: yes. All seeded challenge hashes still match Phase 13: yes. The neutral profile changes only `README.md` and `starter/subject.mjs`; normative specification, examples, verifier, harness and scenarios remain byte-identical.
Any locked package can be materialized with `phase14 challenge --family <id> --starter <profile> --out <dir>` for independent inspection.
The neutral starter's local failures show that an unimplemented skeleton is rejected. They do not
show that an agent fails the task and do not rank the starter operator.

The scenario lock contains 54 activated targets and 18 nonactivation controls across three families. Its paired balanced view contains 36 rows total (6 targets plus 6 controls per family).

## Raw Agent Cells

| family | starter | provider | hash | state | counts | reward | root cause |
|---|---|---|---|---|---|---|---|
| `dao-descendant` | `seeded-recompute` | openai | `9d89b49307a960f65f2e6e8f204fd15e` | NOT_RUN | no | - | - |
| `dao-descendant` | `seeded-recompute` | anthropic | `9d89b49307a960f65f2e6e8f204fd15e` | NOT_RUN | no | - | - |
| `trading-reconciliation-recompute` | `seeded-recompute` | openai | `94bfc2c401ad2cc19f7e84e8a1270a08` | NOT_RUN | no | - | - |
| `trading-reconciliation-recompute` | `seeded-recompute` | anthropic | `94bfc2c401ad2cc19f7e84e8a1270a08` | NOT_RUN | no | - | - |
| `deployment-rollback-recompute` | `seeded-recompute` | openai | `2ddfad2fd3287f752c41a408184b48ce` | NOT_RUN | no | - | - |
| `deployment-rollback-recompute` | `seeded-recompute` | anthropic | `2ddfad2fd3287f752c41a408184b48ce` | NOT_RUN | no | - | - |
| `dao-descendant` | `neutral-skeleton` | openai | `e1d2992c882776c1fc4fc733eb607949` | NOT_RUN | no | - | - |
| `dao-descendant` | `neutral-skeleton` | anthropic | `e1d2992c882776c1fc4fc733eb607949` | NOT_RUN | no | - | - |
| `trading-reconciliation-recompute` | `neutral-skeleton` | openai | `32f7371b922fd001c9c43bf21db69e99` | NOT_RUN | no | - | - |
| `trading-reconciliation-recompute` | `neutral-skeleton` | anthropic | `32f7371b922fd001c9c43bf21db69e99` | NOT_RUN | no | - | - |
| `deployment-rollback-recompute` | `neutral-skeleton` | openai | `65b9c7c0769a574e1f36341445c777d9` | NOT_RUN | no | - | - |
| `deployment-rollback-recompute` | `neutral-skeleton` | anthropic | `65b9c7c0769a574e1f36341445c777d9` | NOT_RUN | no | - | - |

`NOT_RUN` is data here: the preflight stop rule fired before the cheaper provider could be sampled.
No refusal, missing label or infrastructure failure has been converted into reward 0.

## Local Calibration, Not Agent Effects

| family | reference failures | narrow target | narrow control | concentrated-24 narrow | balanced-12 narrow |
|---|---:|---:|---:|---:|---:|
| `dao-descendant` | 0/24 | 18/18 | 0/6 | 18/24 | 6/12 |
| `trading-reconciliation-recompute` | 0/24 | 18/18 | 0/6 | 18/24 | 6/12 |
| `deployment-rollback-recompute` | 0/24 | 18/18 | 0/6 | 18/24 | 6/12 |

These are deterministic Phase 13 reference/mutant outcomes. They prove mechanism activation,
held controls and suite discrimination. A mutant written to embody an error is not evidence that
an agent will make that error, so none enters the effect model or capability tally.

## Effect Ledger

| estimand | class | independent attempts | status | reason |
|---|---|---:|---|---|
| `E1-family` | family | 0 | not-estimable | No independent agent attempt ran in any family stratum. |
| `E2-starter` | genuine-difficulty | 0 | not-estimable | No matched seeded-versus-neutral attempt pair ran. |
| `E3-activation` | genuine-difficulty | 0 | not-estimable | No agent artifact exists to compare activated targets with nonactivation controls. |
| `E4-selection` | selection-coverage | 0 | not-estimable | No agent verifier output exists to rescore under both frozen scenario profiles. |
| `E5-family-by-starter` | genuine-difficulty | 0 | not-estimable | No family contains a matched starter contrast. |
| `E6-family-by-activation` | genuine-difficulty | 0 | not-estimable | No within-artifact activation contrast exists for an agent attempt. |

The registered analysis uses two-sided 95% Clopper-Pearson intervals only for independent
attempt-level rates. It emits no interval for 0/0. No binomial interval is computed over scenario
rows. A hierarchical model was not fit: with zero observations it is impossible, and even the
registered maximum of one attempt per family x starter x provider cell cannot identify stable
variance components without a prior-driven answer.

## Corrections From Audit

- Phase 13's 24 scenario rows are one submission cluster, not 24 independent agent trials.
- The frozen 24-scenario suite has no U0C0 row. Activation is therefore a paired target-versus-nonactivation description, not the local Phase 13 2x2 agent design.
- The starter contrast changes starter code and the README row that accurately describes it; it is a registered package-profile effect, not a pure one-line code effect.
- Existing Phase 13 campaigns declare subprocess isolation. They do not satisfy Phase 14's container prerequisite.
- The generic container command defaults to an image without either provider CLI. Docker availability and artifact isolation do not establish provider-agent container execution.
- The existing one-sidecar root-cause format cannot establish two-reader agreement. Phase 14 added a distinct cross-provider blind-label contract and B6 controls.

A package correction after future agent output must preserve the old attempt as void, produce a
new challenge hash and receive a replacement preregistration. None occurred in this phase.

## Verification Baseline

| command | result | detail |
|---|---|---|
| `pnpm test` | pass | 53 files and 1089 tests passed before Phase 14 changes |
| `pnpm typecheck` | pass | baseline TypeScript check exited 0 |
| `pnpm lint` | pass | baseline Biome check exited 0 |
| `pnpm build` | pass | baseline package build exited 0 |

## Next Execution Step

1. Restore Anthropic execution and independent labelling capacity without placing credentials in artifacts.
2. Supply and smoke-test purpose-built provider images or an equivalent container path for both CLIs; preserve the weaker network-on provider boundary explicitly.
3. Regenerate preflight. Only when it is green, run the six seeded attempts as the registered matched provider pairs and label every counted failure before applying an expansion rule.
4. Populate the same trial and effect ledgers from preserved artifacts. Do not edit the frozen cells or use an OpenAI-only sample as a substitute.

Until those conditions hold, Phase 14 has produced a reproducible experimental design and an
honest block, not a measured operator ranking.
