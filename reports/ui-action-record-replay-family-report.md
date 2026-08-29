# UI action record and replay

`ui-action-record-replay` — browser and desktop UI automation without an API

Every figure below is measured: produced by running the family, not by declaring it.

## Verdict

| | |
|---|---|
| ship gate | **NOT-READY** |
| blocking failures | `difficulty-evidenced` |
| data quality | `measured` |
| status | `built` |
| agent trials run | none |

| gate | blocking | verdict | detail |
|---|---|---|---|
| `solvable` | yes | pass | 7 contract item(s) |
| `verifier-graded` | yes | pass | 10 expected mutant(s) |
| `trust-boundary` | yes | pass | 3/3 source(s) state unforgeability |
| `detectable` | yes | pass | all mechanisms detectable |
| `fairness` | yes | pass | 6 constraint(s) |
| `cheat-resistance` | yes | pass | 5 requirement(s) |
| `is-a-family` | yes | pass | 6 knob(s): seed, mutation, mutationDepth, confirmation, asyncSettled, replayCount |
| `hidden-region-declared` | yes | pass | The hidden suite samples the declared UI-mutation space: which change occurred b |
| `measured-axes` | no | pass | 6 measured axes |
| `reference-passes` | yes | n/a | family not built; nothing to run |
| `baselines-blocked` | yes | n/a | family not built |
| `mutants-caught-by-intended-check` | yes | n/a | family not built |
| `mechanisms-exercised` | yes | n/a | family not built |
| `isolation-level` | no | n/a | family not built |
| `shared-bank-ready` | no | n/a | family not built |
| `deterministic-reports` | no | n/a | family not built |
| `trial-ready` | no | n/a | family not built |
| `difficulty-evidenced` | yes | fail | no counted agent trials |
| `agent-axes-independent` | no | n/a | family not built |
| `not-already-solved` | yes | n/a | no counted agent trials yet |
| `priced` | no | pass | 55h build, $40 frontier |

## Mechanisms

| mechanism | what it is | mutants in the bank |
|---|---|---|
| `ui-replay-mismatch` | A recorded interaction with an interface replays cleanly against a snapshot but not against the live surface, because it bound to coordinates, ordering or transient text instead of to stable identity. | `audit-liar`, `model-in-the-loop`, `hidden-confirmation-skipper`, `action-order-reorderer`, `halter-not-reporter`, `nop-recorder` |
| `stale-state` | A decision is taken against a snapshot of state that has since changed, so the action is correct for a world that no longer exists at the moment it takes effect. | `duplicate-executor`, `stale-state-reader`, `provenance-dropper`, `recall-blind-executor`, `recency-over-provenance`, `same-session-resolver`, `hidden-confirmation-skipper`, `halter-not-reporter`, `approval-reuser`, `stale-approval-follower` |
| `hidden-environment-dependency` | The implementation works because of something in the authoring environment that was never declared — a preinstalled package, a set variable, network egress, a locale, a file left behind by an earlier step. | `oracle-prober`, `alias-pinner`, `model-in-the-loop` |

## The declared space

6 knobs, 648 points. The hidden suite samples this space more densely than
the visible examples and adds no rule — that is the fairness contract, and it is what makes a
hidden set legitimate rather than a trap.

| knob | type | values | what it controls |
|---|---|---|---|
| `seed` | seed | `11`, `23`, `41` | determines the generated UI tree and the action trace |
| `mutation` | enum | `none`, `attribute_renamed`, `node_reordered`, `node_wrapped`, `text_changed`, `node_removed` | what changed in the tree between recording and replay — the core of the family |
| `mutationDepth` | int | `0`, `2`, `4` | how far into the trace the mutation bites |
| `confirmation` | enum | `absent`, `present`, `suppressed` | whether the irreversible step raises a confirmation, and whether it is hidden |
| `asyncSettled` | bool | `true`, `false` | whether the region under the selector has finished loading at replay time |
| `replayCount` | int | `1`, `2` | exercises idempotency; a second replay must not repeat an irreversible step |

**Hidden graded region.** The hidden suite samples the declared UI-mutation space: which change occurred between record and replay, how deep in the trace it bites, whether a confirmation is absent, present or suppressed, whether an async region has settled, and whether the trace is replayed once or twice. Every parameter is a declared knob; the hidden set samples it more densely and adds no rule.

## Visible rules

These are published to the subject in full. A family whose difficulty comes from withholding the
rules is measuring guessing.

1. A recorded capability is a typed artifact: an ordered trace whose every step carries a selector, a precondition and a postcondition.
2. Replay executes the artifact with no model in the loop. Calling the model is a rule violation even when it works.
3. A selector is resolved against the live tree at replay time. The recorded node id is a hint and may be stale.
4. A precondition is observed, never assumed, and the audit records the observed value.
5. A step whose target declares a confirmation must observe and accept one before completing. An absent dialog is not a confirmation.
6. Replay is idempotent under retry: a completed irreversible step must not repeat.
7. A trace that can never replay as recorded is reported unreplayable; a trace blocked by the current state is halted. Those are different instructions.
8. The audit records, per step, the node resolved and the conditions observed — not merely that the step ran.

## Reference contract

What a correct implementation must do. The reference exists to prove the family is solvable at
all; a family whose reference does not pass is measuring its own bugs.

- Resolve each selector against the live tree, and treat more than one match as ambiguous rather than picking the first.
- Observe each precondition and halt with a named reason when it does not hold.
- Distinguish a region that has not loaded from a node that is gone.
- Observe the confirmation state for a step that declares one.
- Keep a durable record of completed irreversible steps so a repeat replay is a no-op.
- Report a trace whose target no longer exists as unreplayable rather than half-running it.
- Emit an audit naming the resolved node and the observed conditions per step.

## Authoritative sources

What settles each question, and why the subject cannot forge it. This is the trust boundary: a
grader that asks the subject what happened is not a grader.

### effect ledger

**Settles:** which irreversible effects actually fired, in what order, on which replay pass

**Why the subject cannot forge it:** It is owned by the simulated application and the facade exposes no read method. A replayer can cause a payment and can never observe or edit the record of payments, so `replay_idempotent` is decided by what happened rather than by what was reported.

### facade call ledger

**Settles:** every call the replayer made, including calls to the model

**Why the subject cannot forge it:** The harness records each call as it is made. This is what makes `no_model_in_loop` a measurement: a replayer that improvises past a renamed attribute may well complete the flow, and the improvisation is still visible.

### live tree

**Settles:** what the page actually contained when a selector was resolved

**Why the subject cannot forge it:** The verifier re-resolves each recorded selector against the live tree itself, so a step claiming to have resolved a node the selector cannot reach is caught regardless of what the audit says.

## Expected mutants

Each mutant is a wrong implementation written to fail one named check. If a mutant passes, the
check is decorative and the suite has a hole where a measurement should be.

| mutant | must fail | in the registry |
|---|---|---|
| `stale-state-reader` | `selector_resolved_live` | yes |
| `eager-resolver` | `precondition_observed` | yes |
| `hidden-confirmation-skipper` | `confirmation_observed` | yes |
| `duplicate-executor` | `replay_idempotent` | yes |
| `model-in-the-loop` | `no_model_in_loop` | yes |
| `action-order-reorderer` | `replay_order_preserved` | yes |
| `audit-forger` | `replay_audit_explains` | yes |
| `halter-not-reporter` | `unreplayable_reported` | yes |
| `over-blocker` | `replay_completes` | yes |
| `nop-recorder` | `replay_completes` | yes |

## Expected failure modes

How a real attempt is expected to go wrong. Written before any trial, so the trials can disagree.

- Replaying against the recorded node id, which is stale the moment the framework re-creates the element.
- Running a step without observing its precondition, so a disabled control is clicked anyway.
- Treating a suppressed confirmation as a confirmation and firing the irreversible step.
- Repeating the payment on a second replay because completion was never recorded durably.
- Halting on a missing target instead of reporting the trace unreplayable, so an operator waits for something that will never happen.
- Improvising past a mutation by asking a model, which completes the flow and destroys the capability.
- Producing an audit that says a step ran without saying what was observed.

## Fairness

- Every mutation kind the hidden suite uses is published, so no failure depends on a change the author could not anticipate.
- The tree is a deterministic function of the seed: no wall clock, no randomness the subject cannot see.
- A trace that is genuinely unreplayable is reportable as such and scores as correct.
- Both halves are graded: declaring every trace unreplayable fails `replay_completes` exactly as blindly replaying fails `selector_resolved_live`.
- Selectors are structural rather than textual, so the family measures state handling and not string matching.
- A pending region is distinguishable from a missing node, so 'wait' and 're-record' are separable answers.

## Cheat resistance

- The effect ledger lives outside the subject and exposes no read method.
- The verifier re-resolves selectors against the live tree instead of trusting the replay audit.
- Calls to the model are recorded by the harness, so improvising cannot be hidden by a clean report.
- A subject that performs no actions fails `replay_completes` rather than passing the no-forbidden-effect checks vacuously.
- Scenario trees are regenerated from the seed rather than taken from the subject's report.

## Cost

| | |
|---|---:|
| build hours | 55 |
| frontier spend to measure | $40 |
| independent axes | 6 |



---

Generated by `agent-eval-foundry` from the checked-in task shape. Deterministic — no timestamp.
