# Measured hardness-operator ledger

Extracted 2026-09-04. Scope: durable-approval-outbox history, its recompute-isolated descendant, and Phase 14 controlled agent ablations.

An operator is not called hardening merely because reward-0 outcomes increased. Validity
controls repair what reward means; difficulty operators change the reasoning burden; scenario
selection operators change how reliably an existing mechanism activates.

| operator | class | status | solve-rate evidence | capability attribution | confidence |
|---|---|---:|---|---|---:|
| `verifier-process-and-ledger-isolation` | validity-control | measured | not countable | not-applicable: this repairs what reward means | high |
| `a2-explicit-terminal-state-repair` | validity-control | measured | 2/6 -> 3/6 | negative for the repaired axis: wording carried the target failures | high |
| `committed-idempotency-authority` | difficulty | measured | 8/8 clean passes on paired non-activation/control views -> 8/8 clean passes on paired recompute-target views | no positive effect established: all eight countable Phase 14 submissions passed both paired views, so no root-cause labels ran | high |
| `fuzz-controlling-parameter` | scenario-selection | measured | 5/6 -> 6/6 | not-established under the foundry's blind-labelling rule | high |
| `recompute-activation-concentration` | scenario-selection | measured | 8/8 clean solves under the balanced rescore -> 8/8 clean solves under concentrated selection | no positive effect established: all eight countable Phase 14 submissions passed both target and control views, so no root-cause labels ran | high |
| `narrow-mutant-isolation` | validity-control | measured | not countable | not-applicable to local mutants | high |
| `b6-rig-integrity-controls` | validity-control | measured | not countable | not-applicable: instrumentation validity | high |
| `narrow-recompute-starter` | difficulty | measured | 2/2 clean solves with the neutral DAO starter -> 2/2 clean solves with the seeded recompute DAO starter | no positive effect established: all four DAO attempts solved, so no failure required root-cause labelling | medium |

## Move external truth outside the subject's authority

- **Changed:** The tool ledger moved to a root-owned service; scenario execution moved to an unprivileged process; collection no longer imports the engine; positive execution checks and cheat oracles were added.
- **Stayed fixed:** The durable-outbox behavior being requested and the exactly-once mechanism.
- **Before:** A no-tool engine and a buggy engine that rebound tool.calls each passed 113/113.
- **After:** The corrected oracle/reference passed 267/267; no-op, empty-ledger and ledger-rebind oracles all received reward 0.
- **Fairness:** improved: a reward now requires the external work the task asks for, without adding a hidden behavior rule
- **Verifier integrity:** closed three demonstrated bypasses: vacuous success, same-process ground-truth rewrite, and decorative database-role isolation
- **Solve-rate interpretation:** The old perfect scores were verifier bypasses, not comparable agent solves. This operator repairs validity and must not be credited as hardness.
- **Provenance:** `/Users/devlegacy/Desktop/projects/klavis-terminal-bench-task/results/15-outbox-verifier-audit.md`; `/Users/devlegacy/Desktop/projects/klavis-terminal-bench-task/FINDINGS.md#7`

## State the terminal ACKED rule explicitly

- **Changed:** One visible sentence: ACKED and REVOKED are terminal and have no outgoing transition.
- **Stayed fixed:** Task implementation, harness, verifier, scenarios, starter, agent instruction and all other visible text; task name differed for arm identity.
- **Before:** Control: 2/6 clean solves; 33 failing cells were ACKED->REVOKED illegal transitions.
- **After:** Treatment: 3/6 clean solves; 0 ACKED->REVOKED illegal-transition failures.
- **Fairness:** improved: moved the derivation from demanding A2 to explicit A3 and removed that wording axis from the descendant
- **Verifier integrity:** none: grading was unchanged
- **Solve-rate interpretation:** The measured causal effect is the disappearance of 33 target failures, not a claim that every reward difference came from the sentence.
- **Provenance:** `data/a2-spec-repair-differential.json`; `docs/DEFECT-TAXONOMY.md#part-3`

## Recover a committed idempotency key across lease epochs

- **Changed:** The correct implementation persists one action-stable key before calling the tool and recovers that value after uncertain completion instead of deriving from current lease state.
- **Stayed fixed:** The external operation, action identity, payload, tool idempotency behavior and retry requirement.
- **Before:** A recomputed epoch key creates two ledger effects for one action while each invocation returns OK.
- **After:** A recovered committed key creates one ledger effect and later calls receive an OK deduplication receipt.
- **Fairness:** passes: the committed value exists before the crash and is available to a correct implementation
- **Verifier integrity:** requires grading on an external per-action ledger rather than on subject status
- **Solve-rate interpretation:** Phase 14 E3 measured a paired descriptive target-minus-control failure effect of 0.000; scenario rows are not independent trials.
- **Provenance:** `data/phase-9-descendant.json#a3_narrowAdversary`; `src/screens/row-five.ts`; `/Users/devlegacy/Desktop/projects/klavis-terminal-bench-task/FINDINGS.md#3`; `data/phase-14-effect-ledger.json#E3-activation`

## Fuzz for the controlling activation parameter

- **Changed:** Selection moved from broad schedules chosen against one buggy engine to a parameter grid followed by selection in the region that reliably activates the target mechanism.
- **Stayed fixed:** Agent-visible package, mechanism, reference, verifier rules and subject bank used for anti-overfitting checks.
- **Before:** The 245-check suite produced 5/6 failures and missed a solved engine carrying the target ACKED bug; the old four points caught 4-5 measured engines each.
- **After:** Six replacement key_index=0 points caught 6-7 engines each, including 5-6 not used for selection; the unchanged visible task then produced 6/6 failures.
- **Fairness:** unchanged: only hidden coverage of an existing declared rule changed
- **Verifier integrity:** improved activation validity; a candidate whose reference event did not fire was rejected
- **Solve-rate interpretation:** The two matrices used different fresh subjects, so this is an artifact-level outcome change, not an individual treatment effect.
- **Provenance:** `/Users/devlegacy/Desktop/projects/klavis-terminal-bench-task/results/33-coverage-correction.md`; `/Users/devlegacy/Desktop/projects/klavis-terminal-bench-task/results/34-cc267-standard-matrix.md`

## Concentrate recompute recovery on multi-worker schedules

- **Changed:** The descendant selects two seeds per (n_workers, keys) cell after a completed uncertain call, with explicit one-worker and no-crash controls.
- **Stayed fixed:** Repaired specification, reference, verifier and narrow recompute defect.
- **Before:** n_workers=1 activated 0/24 runs; the repaired parent separated the narrow defect on 3/24 instances.
- **After:** n_workers=2 and 3 activated 45.8% and 58.3% in the grid; the selected descendant region separated 105/108 points and its selected 18 schedules caught the narrow mutant 18/18.
- **Fairness:** passes: selection changes probability of reaching a published recovery case, not the rule
- **Verifier integrity:** adds explicit non-activation controls so parameter effect cannot be inferred from an all-fail rig
- **Solve-rate interpretation:** Phase 14 E4 is a paired descriptive rescore of the same eight agent artifacts, not eight new independent contrasts; measured effect 0.000.
- **Provenance:** `data/phase-9-descendant.json#a2_controllingParameter`; `data/phase-9-descendant.json#a4_amplification`; `src/families/dao-descendant/scenarios.ts`; `data/phase-14-effect-ledger.json#E3-activation`; `data/phase-14-effect-ledger.json#E4-selection`

## Measure one defect against an otherwise identical reference

- **Changed:** One policy switch changes committed-key recovery to current-epoch recomputation.
- **Stayed fixed:** All other reference behavior, calls, reports, payloads and harness behavior.
- **Before:** Broadly buggy engines made it impossible to tell which defect caused separation.
- **After:** Corrected Phase 9 rig: reference failed 0/18 and the narrow recompute mutant failed 18/18.
- **Fairness:** improved diagnosis: the result is attributed only to the intended defect
- **Verifier integrity:** positive, subject to the B6 correction recorded separately
- **Solve-rate interpretation:** Mutant fatality is verifier evidence, not solve-rate evidence.
- **Provenance:** `data/phase-9-descendant.json#a3_narrowAdversary`; `data/phase-9-descendant.json#a5_screens`

## Run known-good, known-bad and malformed-input controls with every rig

- **Changed:** Every new pass/fail rig must prove the reference passes, a targeted bad subject fails, and absent or wrong-shaped evidence is refused in the same invocation.
- **Stayed fixed:** The measured subject behavior and verifier rules.
- **Before:** A Phase 9 rig attached result.tool while checks read result._tool, making the correct reference appear to fail 18/18.
- **After:** The corrected rig passed reference 18/18 and failed the narrow mutant 18/18; Phase 10 added B6/screen 9 and this package runs it internally.
- **Fairness:** improved: broken apparatus produces a void run instead of a false subject failure
- **Verifier integrity:** directly detects inverted controls, degenerate uncalibrated results and missing input shape
- **Solve-rate interpretation:** This prevents fabricated measurement; it does not make a task harder.
- **Provenance:** `src/screens/rig-integrity.ts`; `data/phase-9-descendant.json#a5_screens`; `data/phase-10-status.json`

## Seed the public starter with the natural recomputation error

- **Changed:** The starter implements the tempting current-epoch derivation but leaves the repair to the agent.
- **Stayed fixed:** The complete repaired specification, committed key in the public view and submission interface.
- **Before:** Legacy starter profiles were not represented as a construction variable.
- **After:** The packaged starter fails all 18 activated schedules and passes non-activation controls through the real trial route.
- **Fairness:** passes locally: the starter is explicitly labelled wrong and the correct value is visible in every input
- **Verifier integrity:** none; the starter is graded by the same sealed ledgers as every submission
- **Solve-rate interpretation:** Phase 14 E2 measured a 0.000 matched reward-zero contrast across OpenAI and Anthropic; one attempt per cell limits causal precision.
- **Provenance:** `src/challenge/dao-descendant-package.ts`; `src/families/dao-descendant/runner.ts`; `data/phase-14-effect-ledger.json#E2-starter`

