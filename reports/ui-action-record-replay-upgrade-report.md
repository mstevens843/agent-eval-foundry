# UI action record and replay — what is modelled

**Thesis.** A model can discover a UI workflow. The capability worth shipping is a recording that
replays deterministically **with no model in the loop**, because a workflow needing the model on
every run is a demo with a subscription.

**State.** Measured against 10 mutants over 324 scenarios:
reference clean, every mutant caught by its intended check, **6 independent axes** —
the widest structure in this repository. Challenge package builds and passes its leak check
(8 files, hash `1050e79f4804a96a5327d50dd81765b0`).

5 counted agent trial(s) exist.

## What the family models, and how honestly

6 capabilities are modelled for real, 2 are simulated, one is absent.

| capability | modelled | how | graded by |
|---|---|---|---|
| recording a discovered workflow as a replayable artifact | **real** | a typed action trace: ordered steps, each with a selector, a precondition and a postcondition | `replay_completes`, `replay_audit_explains` |
| replaying with no model in the loop | **real** | `app.askModel` exists, works, and every call is recorded by the harness | `no_model_in_loop` |
| selector drift between record and replay | simulated | six declared mutations — rename, reorder, wrap-and-remount, text change, removal, none — applied at a declared depth | `selector_resolved_live`, `unreplayable_reported` |
| semantic preconditions | **real** | each step declares an attribute and the value it must hold; the replayer must read it live rather than trust the recording | `precondition_observed` |
| hidden confirmation state | **real** | three states — absent, present, suppressed — with the flow declaring in the tree whether it confirms at all | `confirmation_observed` |
| duplicate side effects | **real** | an effect ledger the subject cannot read, and a scenario knob that replays the same trace twice | `replay_idempotent` |
| stale UI state / async settling | simulated | a region that resolves as `pending` rather than missing, so 'not yet' and 'gone' are distinguishable | `replay_completes`, `unreplayable_reported` |
| action audit truth | **real** | the verifier re-resolves every recorded selector against the live tree instead of trusting the audit | `selector_resolved_live`, `replay_audit_explains` |
| a real browser: layout, timing, focus, scroll, iframes, shadow DOM | **absent** | the application is a deterministic tree with no renderer | nothing — and this is the fidelity limit, stated rather than implied |

"Real" here means the property is decided by something the subject cannot influence — an effect
ledger, a call ledger, or the verifier re-resolving selectors itself. "Simulated" means the
phenomenon is modelled faithfully in a tree rather than observed in a renderer.

## The fidelity limit, stated plainly

The application is a deterministic tree. There is no layout, no timing, no focus management, no
scrolling, no iframes and no shadow DOM. A replayer that passes here has demonstrated that it
carries state correctly across a changing structure; it has **not** demonstrated that it survives
a real page.

That is a fidelity claim, and it is separate from the measurement claim. The measurement is real:
ten mutants, each a one-line diff from the reference, each caught by the check it was written to
trip, and six independent axes over that bank. What the measurement is ABOUT is a simplified
world.

## What a browser-backed harness would add, and cost

| addition | what it would newly measure | rough cost |
|---|---|---|
| a real DOM via a headless browser | layout-dependent selectors, scroll and visibility preconditions, focus stealing | 25–40 h, plus a browser dependency in the trial sandbox |
| real timing | races between replay and hydration, retry policy under genuine latency | 15 h, and every scenario becomes nondeterministic unless the clock is controlled |
| a recorded real application | whether traces from production apps replay at all | large, and it changes the family from a measurement into a dataset |

The honest ordering is that the FIRST of those is worth doing only after a counted agent trial on
the current family. If a capable model already fails the deterministic version — and the memory
family showed that a well-built family can — then the simplified world is discriminating and a
browser adds fidelity to a measurement that already exists. If every model passes, a browser would
buy a more realistic version of a task nobody fails.

## The campaign that would settle it

`ui-2026-08` is written and unrun: 4 slots, 1 not run.

**Kill signal:** Every counted trial passes every graded scenario, which means the replay contract is obvious to a capable model and the family measures nothing. Alternatively, every counted trial fails `replay_completes` on the async-pending scenarios only, which would mean the family is measuring a harness convention rather than a capability.

**Confirm signal:** At least one counted trial fails at least one scenario, with failures spread across more than one check — in particular `replay_idempotent` at replayCount 2, or `no_model_in_loop`, which no amount of care about clicking prevents.

Every slot is runnable with one command; the challenge package and the router already exist.
The reason it has not run is stated in the plan rather than left as an absence.

## Mutants and what each one proves

| mutant | must fail | caught in |
|---|---|---:|
| `stale-state-reader` | `selector_resolved_live` | 18/324 |
| `eager-resolver` | `precondition_observed` | 216/324 |
| `hidden-confirmation-skipper` | `confirmation_observed` | 34/324 |
| `duplicate-executor` | `replay_idempotent` | 34/324 |
| `model-in-the-loop` | `no_model_in_loop` | 225/324 |
| `action-order-reorderer` | `replay_order_preserved` | 107/324 |
| `audit-forger` | `replay_audit_explains` | 324/324 |
| `halter-not-reporter` | `unreplayable_reported` | 108/324 |
| `over-blocker` | `replay_completes` | 216/324 |
| `nop-recorder` | `replay_completes` | 216/324 |

The one worth reading is `model-in-the-loop`: it frequently **succeeds** at the flow — improvising
past a renamed attribute genuinely completes the checkout — and fails anyway, because the harness
owns the channel it improvised through. A family that only checked outcomes would score it as the
best implementation in the bank.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
