# browser-action-replay

**Status: idea. Nothing here has been built, screened or trialled; every number is a projection.**

## Problem

A workflow was recorded once against an application with no API — a plan of steps, each naming an
intent and the element it was captured against. The application then changed. Not maliciously: a
component library bumped, a nav folded at a narrower viewport, an interstitial appeared, a control
moved into a different container. Most such changes are semantically empty and a good replayer sails
through them. One is not.

The mechanism this family isolates is that the technique which survives the benign mutations is
exactly the technique that fails the meaningful one. Bind by role and accessible name and you
correctly follow a renamed class, a reordered sibling, a relocated container. Then two adjacent
controls swap position *and* meaning — "confirm" and "confirm and repeat monthly" — and the same
confident heuristic clicks the wrong intent. Confidence is the defect. Underneath sits a second
mechanism: the plan's expected-state assertions have gone stale, because the application's data
moved between capture and replay, and a replayer that clicks through a failed assertion produces an
action that succeeded on the wrong object.

## The agent-visible task

The agent gets a recorded plan, a signed capture manifest naming the environment it was recorded in
(DOM revision, viewport, locale, feature flags), a live application, and a published, exhaustive
mutation grammar: renamed selectors, reordered siblings, an inserted interstitial, a relocated
container, a collapsed disclosure, a relabelled-but-identical control, and a semantic swap. The rules state that replay must invoke the semantic action the step names; that re-binding is
expected but invoking a different intent is a failure; that a failed expected-state assertion
requires re-derivation or refusal, never continuation; that a genuinely ambiguous step must be
refused with a reason and a non-ambiguous one must not be; and that the replayer must emit a
per-step outcome record of replayed / re-derived / refused.

Nothing is hidden about the rules. As in the shipped outbox family, the difficulty is coverage of a
declared space, not secrecy.

## Hidden tests

The suite samples which mutation classes are applied, how many are composed on a page, which steps
they land on, and which environment deltas accompany them. The concentration is on compositions
where a benign class and the semantic swap touch the same neighbourhood, so the anchor a technique
relied on is removed by one mutation while the other punishes the fallback; and on steps whose
expected-state assertion goes stale under a `state_delta`. Grading reads the server's action ledger
for what actually happened and the harness's mutation manifest for which steps were genuinely
ambiguous, then compares both against the replayer's own outcome record.

## Reference strategy

Bind by semantic intent — role, accessible name, position within the labelled region — treating the
recorded CSS selector as a stale hint rather than as identity. Read the capture manifest, compute
the environment delta explicitly, and reconcile it, including opening a disclosure the narrower
viewport introduced. Evaluate assertions on parsed values, not rendered strings, so a locale change
is not mistaken for a data change. Re-derive a stale step from current state; refuse when
re-derivation is not determined. Detect that a candidate binding's semantics differ from the
recorded intent — a relabelled control is not a swapped one — and refuse rather than click. Dismiss
an interstitial as an obstacle, never as a step. Emit an outcome record that matches what was
attempted.

## Known-bad mutants

`stale-state-reader` continues past a failed assertion and acts on the item as captured.
`eager-resolver` binds an ambiguous step to the nearest plausible control and lands the neighbouring
intent in the ledger. `nop-faker` refuses everything: perfectly safe, empty ledger, must score zero.
`audit-liar` reports a step as replayed when the ledger shows no action. `duplicate-executor`
retries after a navigation that was lost rather than failed, and submits one intent twice.

## Why strong agents may false-positive

Role-based locators are current best practice and are right six times out of seven. An agent that
adopts them passes every benign mutation, writes a self-check confirming "the plan replayed
cleanly", and has no way to notice that the seventh case is the one where a clean replay is the
wrong outcome. Environment reconciliation is the second trap: adapting to what
is on screen works until a flag change removes a target, and the replayer silently substitutes a
step rather than reporting the delta. The third is comparing assertions on rendered strings, which
survives every English-locale run.

## How to prevent unfairness

The mutation grammar must be published and exhaustive — no eighth class ever applied. Every step the
suite requires to be replayed must have a unique correct binding derivable from the served page plus
plan plus capture manifest; genuinely ambiguous steps are graded as refusals, never as failures to
act. Grading reads the ledger and the outcome record, never screenshots, timing, or the route taken.
Every environment delta is declared and reconcilable. The application must be deterministic under
the seed, with no wall-clock or network dependence in the pages the plan touches, or a correct
replayer gets failed by a slow machine.

## How to cheat-harden the verifier

Ground truth is the server ledger plus the harness's mutation manifest, neither reachable from the
replayer; the replayer's log is a claim, never a source of expected values. The served DOM carries
no mutation labels and no stable test ids on the swapped controls, so the answer cannot be read off
the page. The capture manifest is signed and re-verified at grading, so editing the declared
environment to match the live one is detected. Scoring requires the ledger to contain the actions
the plan legitimately calls for, so total refusal and an empty ledger both score zero. The browser
context is torn down and the ledger sealed before assertions run.

## Knobs for generating many instances

`seed`, `mutation_class`, `mutation_depth`, `viewport`, `locale`, `feature_flags`, `state_delta`.
Depth is the important one: each class alone has a known defeat, and the interactions are where the
window, if there is one, lives.

## Honest risk that this family dies

**Already-solved** is the leading kill, and I would put it well above even odds. Accessibility-tree
and text-anchored rebinding is exactly what current browser agents do, and six of the seven declared
mutations are what that technique was built for. If the semantic-swap cells are the only ones that
discriminate, the family is one narrow trap wearing a grammar's clothing, and a single mechanism
that fires in a handful of cells is what `results/29` classifies as **no-window** — the second most
likely death here, since composing mutations may simply make steps refusable rather than
mis-bindable, and refusal is graded as correct. **Unfair-or-defused** is third and depends on one
build decision: ship a `data-testid` on the swapped controls and the task defuses; ship no
distinguishing signal at all and the step becomes undecidable, so a correct replayer that refuses is
graded the same as one that guesses right. The screen before any build is a three-sample trial on
composed semantic-swap cells only, judged on the ledger. If frontier agents refuse or bind correctly
in all three, this dies for $0, as eight of the source project's ten cycles did.
