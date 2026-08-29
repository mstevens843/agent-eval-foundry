# UI action record and replay

`ui-action-record-replay` — browser and desktop UI automation without an API

**This family is a shape, not a build.** Nothing here has been executed. Every quantity is an author's estimate and is labelled as one; the report exists so the estimate can be argued with before any money is spent on it.

## Verdict

| | |
|---|---|
| ship gate | **HOLD** |
| blocking failures | none |
| data quality | `estimated` |
| status | `candidate` |
| agent trials run | none |

| gate | blocking | verdict | detail |
|---|---|---|---|
| `solvable` | yes | pass | 7 contract item(s) |
| `verifier-graded` | yes | pass | 5 expected mutant(s) |
| `trust-boundary` | yes | pass | 2/2 source(s) state unforgeability |
| `detectable` | yes | pass | all mechanisms detectable |
| `fairness` | yes | pass | 5 constraint(s) |
| `cheat-resistance` | yes | pass | 5 requirement(s) |
| `is-a-family` | yes | pass | 6 knob(s): seed, mutation, mutation_depth, confirmation, async_settled, replay_count |
| `hidden-region-declared` | yes | pass | The hidden suite samples the declared UI-mutation space: which selector attribut |
| `measured-axes` | no | n/a | estimated 3 axes; not measured |
| `reference-passes` | yes | n/a | family not built; nothing to run |
| `baselines-blocked` | yes | n/a | family not built |
| `mutants-caught-by-intended-check` | yes | n/a | family not built |
| `mechanisms-exercised` | yes | n/a | family not built |
| `isolation-level` | no | n/a | family not built |
| `shared-bank-ready` | no | n/a | family not built |
| `deterministic-reports` | no | n/a | family not built |
| `difficulty-evidenced` | no | fail | no counted agent trials |
| `not-already-solved` | yes | n/a | no counted agent trials yet |
| `priced` | no | pass | 55h build, $40 frontier |

## Mechanisms

| mechanism | what it is | mutants in the bank |
|---|---|---|
| `ui-replay-mismatch` | A recorded interaction with an interface replays cleanly against a snapshot but not against the live surface, because it bound to coordinates, ordering or transient text instead of to stable identity. | `audit-liar` |
| `stale-state` | A decision is taken against a snapshot of state that has since changed, so the action is correct for a world that no longer exists at the moment it takes effect. | `duplicate-executor`, `stale-state-reader` |
| `hidden-environment-dependency` | The implementation works because of something in the authoring environment that was never declared — a preinstalled package, a set variable, network egress, a locale, a file left behind by an earlier step. | `oracle-prober`, `alias-pinner` |

## The declared space

6 knobs, 648 points. The hidden suite samples this space more densely than
the visible examples and adds no rule — that is the fairness contract, and it is what makes a
hidden set legitimate rather than a trap.

| knob | type | values | what it controls |
|---|---|---|---|
| `seed` | seed | `11`, `23`, `41` | determines the generated UI tree and the action trace |
| `mutation` | enum | `none`, `attribute_renamed`, `node_reordered`, `node_wrapped`, `text_changed`, `node_removed` | what changed in the DOM between recording and replay — the core of the family |
| `mutation_depth` | int | `0`, `2`, `5` | how far into the trace the mutation bites; a defect at step 5 survives naive smoke tests that only replay step 1 |
| `confirmation` | enum | `absent`, `present`, `suppressed` | whether the irreversible step raises a confirmation, and whether it is hidden |
| `async_settled` | bool | `true`, `false` | whether the region under the selector has finished loading at replay time |
| `replay_count` | int | `1`, `2` | exercises idempotency; a second replay must not repeat an irreversible step |

**Hidden graded region.** The hidden suite samples the declared UI-mutation space: which selector attribute changes between record and replay, how deep in the trace the change occurs, whether a confirmation dialog appears or is suppressed, whether an async region has settled, and whether the trace is replayed once or twice. Every parameter is declared in the knobs below; the hidden set samples it more densely than the visible examples, and adds no rule.

## Visible rules

These are published to the subject in full. A family whose difficulty comes from withholding the
rules is measuring guessing.

1. A recorded capability is a typed artifact: an ordered action trace, each action carrying a selector, a precondition that must hold before it runs, and a postcondition that must hold after.
2. Replay executes the artifact with no model in the loop. If replay needs the model to decide anything, the recording was incomplete and must fail rather than improvise.
3. A selector must be resolved against the live UI state at replay time, never against the state captured during recording.
4. When a precondition does not hold at replay time, the action must halt with a named reason. Proceeding on the assumption that the UI looks the way it did during recording is the defect this family exists to catch.
5. Any step whose effect is irreversible (submit, pay, delete, send) must record a confirmation state, and replay must observe that state rather than assume it.
6. Replay must be idempotent under retry: replaying a trace that already completed must not repeat an irreversible step.
7. The replay audit must record, per action, the selector resolved, the precondition observed, and the postcondition observed — not merely that the step ran.
8. A trace that cannot be replayed deterministically must be reported as unrecordable rather than stored as a capability.

## Reference contract

What a correct implementation must do. The reference exists to prove the family is solvable at
all; a family whose reference does not pass is measuring its own bugs.

- Record a trace whose every action carries a selector, a precondition and a postcondition.
- Resolve each selector against the live tree at replay time.
- Halt with a named reason when a precondition fails, rather than continuing on the recorded assumption.
- Observe the confirmation state for irreversible steps instead of assuming it.
- Guard irreversible steps so a second replay is a no-op.
- Emit a replay audit naming the resolved selector and the observed pre/postconditions per action.
- Refuse to store a trace that cannot replay deterministically.

## Authoritative sources

What settles each question, and why the subject cannot forge it. This is the trust boundary: a
grader that asks the subject what happened is not a grader.

### effect ledger

**Settles:** which irreversible effects actually occurred — submissions, payments, deletions — and in what order

**Why the subject cannot forge it:** It is owned by the simulated application, not by the replayer. The replayer receives a facade with no read method, so it can cause effects and can never observe or edit the record of them. Under container isolation the ledger is in the grading process and the subject is in the container.

### live DOM state

**Settles:** what the UI actually contained at the moment each selector was resolved

**Why the subject cannot forge it:** The harness snapshots the tree before and after every action and stores the snapshots outside the subject's reach, so a replayer that claims a precondition held is checked against what was really there rather than against its own report.

## Expected mutants

Each mutant is a wrong implementation written to fail one named check. If a mutant passes, the
check is decorative and the suite has a hole where a measurement should be.

| mutant | must fail | in the registry |
|---|---|---|
| `stale-state-reader` | `selector_resolved_live` | yes |
| `audit-liar` | `replay_audit_explains` | yes |
| `duplicate-executor` | `replay_idempotent` | yes |
| `nop-faker` | `replay_completes` | yes |
| `eager-resolver` | `precondition_observed` | yes |

## Expected failure modes

How a real attempt is expected to go wrong. Written before any trial, so the trials can disagree.

- Replaying against the recorded tree rather than the live one, so a renamed attribute silently targets the wrong node.
- Treating a missing confirmation dialog as confirmation, and firing the irreversible step anyway.
- Repeating the irreversible step on a second replay because completion was never recorded durably.
- Halting correctly but producing an audit that says the step ran without saying what was observed.
- Refusing to replay anything once any mutation is detected, which passes every safety check and completes no work.

## Fairness

- Every mutation kind the hidden suite uses appears in the knob list, so no replay failure depends on a UI change the author could not have anticipated.
- The simulated UI is deterministic given the seed: no wall-clock, no randomness the subject cannot see.
- A trace that is genuinely unreplayable must be reportable as such and scores as correct, so the family does not punish an implementation for refusing an impossible recording.
- Both halves are graded: refusing to replay anything fails `replay_completes` exactly as blindly replaying fails `selector_resolved_live`.
- Selectors are structural rather than textual, so the family measures state handling and not string matching.

## Cheat resistance

- The effect ledger lives outside the subject and exposes no read method.
- DOM snapshots are taken by the harness before and after each action and are never passed to the subject.
- The replay audit is cross-checked against the harness snapshots, so a subject that claims a precondition held is compared with what was actually there.
- Scenario inputs are regenerated from the seed rather than taken from the subject's own report.
- A subject that performs no actions scores zero rather than passing the no-forbidden-effect checks vacuously.

## Cost

| | |
|---|---:|
| build hours | 55 _(estimated)_ |
| frontier spend to measure | $40 _(estimated)_ |
| independent axes | 3 _(estimated)_ |

## What would make these numbers real

1. Build the reference and confirm it passes every scenario.
2. Write the expected mutants and confirm each fails the check it was written to fail.
3. Run counted agent trials under subprocess isolation or stronger.
4. Compute the axis count from the resulting matrix rather than estimating it.

Until step 4, the axis figure above is an author's guess and the ship gate refuses to ship on
it. That refusal is the point: the estimate is allowed to exist, and it is not allowed to be
mistaken for a measurement.

---

Generated by `agent-eval-foundry` from the checked-in task shape. Deterministic — no timestamp.
