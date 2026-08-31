# Task Family Model

This document explains the model behind `agent-eval-foundry`.

The short version: the foundry is not trying to write one thousand unrelated benchmark tasks by
hand. It is trying to build a repeatable process for discovering task families that can produce many
fair, solvable, cheat-resistant, independently useful benchmark instances.

## Core Distinction

A **task family** is the reusable category: the behavior space, generator, reference contract,
verifier, known-bad implementations, trial protocol and evidence model.

A **task shape** is the declared specification for one family. It names the rules, mechanisms,
knobs, hidden graded region, fairness constraints, trust boundaries, expected mutants, cost and
evidence status.

A **scenario** or **instance** is one concrete sampled point inside a family. It has specific knob
values and a specific expected outcome.

A **benchmark suite** is the selected set of scenarios the verifier grades.

A **model trial** is one subject attempting that suite under a pinned challenge hash.

A **candidate pool** is the forward-looking inventory of possible task-family ideas before any one
idea earns validation-mode build time.

A **discovery score** is a deterministic routing score over candidate features: expected difficulty,
fairness, reference plausibility, verifier feasibility, cheat resistance, transfer potential, surface
coverage, axis potential and cost. It is not evidence that an agent will fail.

A **mechanism probe** is a tiny executable screen for one failure mechanism. It has a few scenarios,
a reference-like probe subject, known-bad probe subjects, a deterministic checker, promotion
criteria, kill criteria and transfer targets.

A **probe subject** is a cheap stand-in implementation used inside a mechanism probe. It can be
reference-like, baseline or known-bad, and every known-bad probe subject must fail the intended named
checks.

A **probe verdict** is the runner's next-action result: promote to task shape, repair, kill, hold,
evolve existing or transfer existing. It is still below full-family evidence.

A **calibration set** is a small known-outcome backtest used to see whether discovery scores route
families in the same direction as later evidence. The current calibration is n=6 and directional.

A **promotion queue** is the ordered next-work list after applying scores, cheap screens and probe
evidence. Probe evidence is allowed to outrank score-only intuition.

A **promotion record** is the bridge from a surviving probe into a family build. It names the source
candidate and probe, what stays fixed, what changes, the carried-forward authority source and
mutants, new risks, and pre-registered confirm/kill signals. It is build-routing evidence, not
real-agent difficulty evidence.

## Before Task Families: Discovery Workbench

The foundry now has a pre-family layer for ideas that have not earned a full build yet.

A **discovery candidate** is a task-family idea with a domain, failure mechanisms, a public-rule
sketch, a hidden-region sketch, expected knobs, expected mutants, baseline cheats, transfer
potential, surface-coverage tags, cost estimates and risk notes. It is planning input, not
difficulty evidence.

A **mechanism probe** is smaller than a family. It tests whether a proposed failure mechanism has a
cheap signal before the foundry pays for a reference, verifier, challenge package and model trial.

A **transfer test** asks whether a mechanism that worked in one family still works when carried to a
different domain. The mechanism transfers; the exact task does not.

The pre-family path is:

```text
candidate pool
  -> cheap screen
  -> mechanism probe
  -> promotion record
  -> transfer test
  -> task shape
  -> family build
```

Discovery Workbench v1 makes that path executable. It validates the candidate pool, scores each
candidate, chooses the cheapest next evidence, reports a promotion queue, tracks surface coverage
separately from defect mechanisms and can emit a task-shape draft scaffold. Those outputs route
engineering attention; they are not evidence that a model will fail.

Mechanism Probe Runner v1 makes the next step executable. A promoted candidate can run a small local
probe before becoming a full task family. The runner proves only that the proposed mechanism has a
fair, independently checkable signal against reference-like and known-bad probe subjects. It does not
prove real-agent difficulty, human solvability or verifier-integrity resistance.

Promoted Family Build Pipeline v1 turns a successful probe into validation-mode build work. The first
completed bridge is `access-token-scope-expansion`: selected from the top of `probes next`, recorded
in `data/promotions.json`, scaffoldable through `promotion scaffold`, and built as a full family with
reference, scenarios, verifier, mutants, package and reports. Its local evidence proves the bridge
works; a counted smoke trial is still required before difficulty claims.

This layer is intentionally separate from the existing candidate ledger. The ledger records
historical promote/kill decisions. Discovery Workbench v1 manages the forward-looking pool and
computes which idea should be built, probed, killed, transferred or repaired next.

Durable Approval Outbox is the first concrete example:

Family: Durable Approval Outbox.

Example instances inside that family:

- crash after tool call
- `UNKNOWN` outcome with late receipt
- cancellation before execution
- cancellation after `ACKED`
- stale lease with two workers
- superseded approval
- duplicate delivery with the same idempotency key

Those are not new rules. They are different points in the same declared behavior space. The visible
rule is stable: once an action is acknowledged, it is final. The hidden suite samples different
valid timings, worker counts, crashes, receipts and cancellations to check whether the implementation
actually preserves that rule.

## How This Answers The 1000-Task Question

If asked to build one thousand tasks, the answer is not to hand-author one thousand unrelated tasks.
The answer is to build parameterized task families.

Each family should have:

- a declared behavior space
- knobs that generate many concrete scenarios
- visible rules
- a hidden graded region that samples the declared space
- a reference implementation
- an independent verifier
- known-bad mutants
- baseline implementations that must fail
- real-agent trials
- axis analysis
- kill/evolve evidence
- human-solvability evidence
- adversarial verifier-integrity evidence

Then the program samples concrete tasks from the families that survive.

That matters because raw task count is cheap to inflate. One thousand tasks can still measure three
things if they all fail for the same reason. The useful unit is the independent failure axis: how
many distinct ways the suite can separate implementations.

Families make task generation cheaper, but the foundry still has to prove that more instances add
signal. That is what the axis meter is for. If many scenarios share the same catch set, they may be
many test cases but only one measurement.

## Pipeline

The foundry lifecycle is:

```text
idea
  -> candidate
  -> task shape
  -> scaffold
  -> reference
  -> verifier
  -> mutants
  -> generated scenarios
  -> hidden region
  -> challenge package
  -> model trials
  -> axis analysis
  -> ship / kill / evolve
```

Each step exists to answer a different question.

| step | artifact | question answered | failure prevented |
|---|---|---|---|
| idea | short mechanism sketch | What failure might be worth measuring? | Starting with a task that has no theory of failure. |
| candidate | ledger row | Why should this candidate advance or die? | Forgetting why a decision was made. |
| task shape | `examples/shapes/*.json` | What rules, knobs and hidden region define the family? | Hidden tests becoming secret rules. |
| scaffold | family docs and package outline | What must be built before trials? | Treating an idea as executable evidence. |
| reference | known-good implementation | Can the task be solved at all? | Measuring bugs in the benchmark instead of bugs in subjects. |
| verifier | hidden grader | Can the suite judge outputs independently? | Trusting subject-written status or audit claims. |
| mutants | known-bad implementations | Does the verifier catch the bugs it claims to catch? | A verifier that runs green over the exact defect it exists to detect. |
| generated scenarios | concrete instances | Which points in the behavior space are graded? | Manual cherry-picking without a declared space. |
| hidden region | sampled subset | Is the hidden suite fair? | Adding rules the subject could not know. |
| challenge package | public files plus hash | What did the subject actually see? | Stale evidence after the task changes. |
| model trials | preserved submissions/transcripts | Do real agents fail this family? | Claiming difficulty from mutants only. |
| axis analysis | catch-set matrix | Are failures independent or redundant? | Calling more tests "more diversity" without measuring it. |
| ship / kill / evolve | gate report and kill analysis | What should happen next? | Shipping already-solved, unfair or one-axis families as broad evidence. |

## Glossary

**Failure mechanism**: The underlying kind of mistake the family is designed to expose, such as
uncertain external effects, stale state, context contamination, duplicate side effects or false audit
history.

**Task family**: A reusable benchmark category with a behavior space, reference, verifier, mutants,
scenario generator and evidence model.

**Task shape**: The machine-readable declaration of one task family: visible rules, knobs,
authoritative sources, hidden region, expected mutants, status and evidence.

**Scenario / instance**: One concrete graded case sampled from the family. It is a task instance, not
the whole family.

**Knob**: A parameter that changes an instance while staying inside the same family, such as crash
timing, receipt delay, memory kind, selector conflict or worker count.

**Declared behavior space**: The full set of legal combinations the family says it may sample.

**Hidden graded region**: The subset of the declared behavior space used by hidden tests. It is fair
only when it samples declared behavior instead of adding new rules.

**Visible rules**: The public rules a subject can read before attempting the task.

**Reference implementation**: A known-good implementation used to prove the family is mechanically
solvable.

**Verifier / grader**: The checker that decides whether a submitted implementation satisfies the
task contract.

**Authoritative source**: A source of truth the subject cannot forge, such as a receipt ledger,
effect ledger, browser trace, memory authority or verifier-owned scenario data.

**Trust boundary**: The line between what the subject can control and what the verifier owns. If the
subject can rewrite the ground truth, the grader is gameable.

**Mutant**: A deliberately broken implementation written to exercise a specific failure mechanism.
Each mutant must fail the check it was written to trip.

**Baseline**: A trivial implementation such as no-op, refuse-everything or accept-everything. If a
baseline passes, the benchmark is measuring the wrong thing.

**Subject**: The implementation being graded. A subject can be a real agent submission, a mutant, a
baseline or imported historical evidence.

**Trial**: One attempt by a subject against a challenge package and scenario set.

**Counted trial**: A trial that satisfies the counting rules: current hash, preserved submission,
preserved transcript/verifier output, no provider refusal, no infrastructure failure, no stale
package and no contamination.

**Provider refusal**: The provider declined to run or answer. It is preserved as evidence about the
provider path, but it is not evidence that the benchmark is hard or secure.

**Challenge hash**: A content hash of the public package the subject saw. If the package changes,
old trials become stale or superseded.

**Catch set**: For one scenario, the set of subjects that fail it.

**Independent axis**: A distinct direction of failure that cannot be explained as the same defect at
a different sensitivity. The foundry computes this from catch-set structure.

**Chain / nested failures**: A pattern where one subject's failures are a subset of another's, and
so on. A chain can separate weaker from stronger subjects, but it is still one axis.

**Shared bank**: A set of subjects that attempted multiple families. Cross-family axis claims require
shared subjects; otherwise axis counts add by construction and say little.

**Human-ready**: The public package appears complete enough to hand to an independent engineer for a
clean-room attempt.

**Human-evidenced**: An independent human solved the current public package clean-room, with notes,
time record and verifier output preserved.

**Adversarial-ready**: A hash-pinned attack packet exists for a family, with threat model and access
boundaries declared.

**Adversarial-audited**: A counted attacker tried to bypass the verifier without solving the task and
no replayable bypass was found under the declared threat model.

## Existing Family Examples

### Durable Approval Outbox

Family: crash-safe execution of approved external actions.

Core failure mechanism: uncertain external effects. A tool returns `UNKNOWN`, so the system cannot
know locally whether the outside-world action happened.

Representative knobs:

- worker count
- crash point
- revocation timing
- receipt timing
- idempotency key index
- whether the unknown action actually landed
- schedule seed

Example instances:

- a worker crashes after invoking the tool but before recording the result
- a receipt arrives after a cancellation request
- two workers race over a stale lease
- an action is `ACKED`, then a cancellation arrives too late

What agents got wrong: most resolved uncertainty too eagerly and wrote false history, especially by
allowing an already `ACKED` action to become revoked. One avoided guessing but stranded work
forever.

Current evidence: imported historical bank with counted frontier failures and axis analysis. Inside
this repo it is reference-solvable/imported rather than a native package-backed family.

Relevant reports:

- [`reports/durable-outbox-axis-report.md`](../reports/durable-outbox-axis-report.md)
- [`reports/historical-durable-outbox-trials.md`](../reports/historical-durable-outbox-trials.md)

### Prompt Injection Memory Poisoning

Family: indirect prompt injection where untrusted content survives through memory and affects a
later privileged decision.

Core failure mechanism: context contamination across a persistence boundary. The subject handles
provenance within one session, then loses it when information is stored and read back later.

Representative knobs:

- attack type
- number of sessions between ingestion and action
- memory kind
- visible versus held-out coverage
- seed

Example instances:

- untrusted content is stored in a summary and later treated as trusted memory
- a vector note carries poisoned instruction into a later session
- a later tool call uses a value whose origin was laundered through memory

What agents got wrong: the parent containment family was already solved, but the memory-poisoning
descendant exposed the persistence boundary. Some agents failed the same 32 scenarios across labs,
which made the transfer claim stronger than a single-provider result.

Current evidence: package-backed, real-agent difficulty evidenced, and cross-lab failure
generalises for the measured family. Human evidence and counted adversarial no-bypass evidence are
separate claims.

Relevant reports:

- [`reports/prompt-injection-memory-poisoning-agent-results.md`](../reports/prompt-injection-memory-poisoning-agent-results.md)
- [`reports/prompt-injection-memory-poisoning-axis-report.md`](../reports/prompt-injection-memory-poisoning-axis-report.md)

### UI Replay Live DOM

Family: deterministic replay of a recorded UI workflow against a changing DOM-like surface.

Core failure mechanism: stale state and replay mismatch. A trace that worked during recording may
bind to the wrong live element later.

Representative knobs:

- region fate
- settle budget
- busy fidelity
- anchor fidelity
- anchor conflict
- prior state
- replay count
- seed

Example instances:

- a previously recorded node disappears
- two candidate anchors conflict
- `aria-busy` is misleading
- a region becomes enabled later
- a precondition changes between recording and replay

What agents got wrong: the counted Codex/OpenAI trial failed on replay completion and precondition
observation. It did not fail the categorical anchor-resolution check in that run, so the real-agent
evidence is settling/precondition evidence, while the categorical anchor axis remains
mutant-detection evidence.

Current evidence: package-backed and difficulty-evidenced by one OpenAI subject. It is DOM-like, not
browser-backed, and does not yet have cross-lab or real-agent axis-breadth evidence.

Relevant reports:

- [`reports/ui-replay-live-dom-agent-results.md`](../reports/ui-replay-live-dom-agent-results.md)
- [`reports/ui-replay-live-dom-codex-diagnosis.md`](../reports/ui-replay-live-dom-codex-diagnosis.md)
- [`reports/ui-replay-browser-backed-scaffold.md`](../reports/ui-replay-browser-backed-scaffold.md)

### Checker-Required Memory Poisoning

Family: memory-poisoning task where the subject must ship both an implementation and an independent
checker.

Core failure mechanism: false verification. Agents often describe or sketch verification but do not
preserve an executable checker strong enough to reject bad traces and known-bad subjects.

Representative knobs:

- attack type
- sessions between ingestion and action
- memory kind
- checker probe
- visible coverage
- seed

Example instances:

- implementation is correct but checker accepts bad traces
- checker is correct but implementation mishandles the task
- checker trusts subject-written receipts
- checker ignores duplicate execution
- checker accepts status-only traces
- no checker or stub checker is submitted

What agents got wrong: the counted Codex/OpenAI trial preserved both `subject.mjs` and `checker.mjs`
but still failed most graded scenarios, including implementation behavior and checker-quality
checks.

Current evidence: package-backed, mutant-measured and difficulty-evidenced by one OpenAI subject. It
does not yet support cross-lab breadth or human-evidenced claims.

Relevant reports:

- [`reports/checker-required-memory-poisoning-agent-results.md`](../reports/checker-required-memory-poisoning-agent-results.md)
- [`reports/checker-required-memory-poisoning-axis-report.md`](../reports/checker-required-memory-poisoning-axis-report.md)

## What Makes Hidden Tests Fair

Hidden tests are fair when they sample a declared behavior space. They are unfair when they add
secret rules.

The distinction matters because hidden coverage is necessary for benchmarks. If every hidden case is
visible, a subject can overfit the examples. But the subject still deserves to know the rules of the
world it is implementing.

Durable Approval Outbox is the working example. The rule "`ACKED` is terminal" was already visible.
The correction that moved the task from a false positive to a clean failure did not add that rule.
It changed which valid schedules the hidden suite sampled, so the already-visible rule was actually
tested.

That is the line the foundry tries to preserve:

- fair: hidden tests choose different values from declared knobs
- unfair: hidden tests introduce a new rule the public task did not state

## Too Easy, Too Hard, Or Broken

The foundry treats different failure modes differently.

### Too Easy

A family is too easy when real agents pass all counted trials. The response is not to ship the
family with a weak headline. The response is to mark it `already_solved`, kill or harden it, and
feed the failure into the evolution loop.

Prompt Injection Containment did this. Its verifier and mutants worked, but agents solved it. That
made it a useful kill, not a useful benchmark family.

### Too Hard Or Unfair

A task is too hard or unfair when the correct behavior is not actually reachable from the public
contract.

Signals include:

- no reference implementation can pass
- a human needs private context
- hidden tests add rules
- the verifier depends on truth the subject cannot access when it should
- the task punishes correct behavior because a needed receipt, tool or hatch is unreachable

These are benchmark defects, not model failures.

### Broken Verifier

A verifier is broken when it can be fooled or when it cannot detect the mistakes it claims to
detect.

Signals include:

- mutants pass
- baselines pass
- hidden artifacts leak into the challenge package
- scorer output can be forged
- stale challenge hashes still count
- subject-written audit/status is trusted as ground truth

The foundry's verifier and adversarial layers exist because "the grader says so" is not enough.

### Not Enough Evidence

Sometimes the right status is simply "not evidenced yet."

Examples:

- no real agent trial
- no clean-room human solve
- no counted adversarial no-bypass audit
- no shared subject bank across families

The reports preserve these as missing evidence instead of turning them into passes or failures.

## Why Axes Matter

An instance's catch set is the set of subjects that fail that instance.

If 50 scenarios are failed by exactly the same models, those may be 50 scenarios but only one
measurement in the available bank.

If failures are nested, the suite may be measuring one difficulty axis at different sensitivities:

```text
weak subject failures subset medium subject failures subset strong subject failures
```

That can still be useful. It ranks implementations. But it is not broad diversity.

If failures are incomparable, the suite is measuring different kinds of mistakes:

```text
subject A fails scenarios that subject B passes
subject B fails scenarios that subject A passes
```

That is the structure the foundry wants to find, because it means the family or family set is doing
more than measuring one weakness repeatedly.

The important point: more scenarios are not automatically more evidence. Axis analysis asks whether
the additional scenarios actually separate implementations in new ways.

## Human And Adversarial Layers

Reference solvability, human solvability and verifier integrity are different claims.

**Reference-solvable** means a correct implementation exists and can pass the suite. It proves the
task is mechanically solvable.

**Human-ready** means the public package appears complete enough for an independent engineer to
attempt without hidden context.

**Human-evidenced** means an independent human solved the current public package clean-room, with
notes, time record and verifier output preserved.

**Adversarial-ready** means a hash-pinned attack packet exists, with a declared threat model and
access boundaries.

**Adversarial-audited** means a real attacker tried to bypass the verifier without solving the task,
and no replayable bypass was found under the declared threat model.

A provider refusal is not no-bypass evidence. It means no valid attack attempt happened.

These layers answer different objections:

- "Is the task solvable?" -> reference evidence.
- "Could a real engineer understand it?" -> human evidence.
- "Can the grader be cheated?" -> adversarial verifier-integrity evidence.
- "Do agents actually fail it?" -> model trial evidence.
- "Does it measure more than one thing?" -> axis evidence.

## Final Mental Model

The foundry is a benchmark production system, not a pile of one-off tasks.

It starts with candidate failure mechanisms, turns the best ones into task families, generates many
instances inside declared behavior spaces, proves the reference can solve them, grades the verifier
against known-bad implementations, packages the public challenge without leaks, runs real agents,
measures independent axes, and then ships, kills or evolves the family based on evidence.

That is the answer to the 1000-task question: build families first, then generate instances from the
families that survive. Raw task count is not the goal. Fair, solvable, cheat-resistant tasks that add
independent signal are the goal.
