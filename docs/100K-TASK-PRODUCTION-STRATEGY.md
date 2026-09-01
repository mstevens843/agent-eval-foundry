# Efficient Agent Benchmark Production Under A $100K Budget

Status: rough draft, expected to change as the foundry produces more evidence.

This paper answers one operational question:

> If I had $100,000 to produce one thousand agent benchmark tasks, what is the most efficient way to
> do it without producing one thousand redundant or gameable tasks?

The answer is not to hand-write one thousand tasks. The answer is to build a discovery funnel that
finds task families, proves they are fair and solvable, measures whether real agents fail them, and
then samples many concrete task instances from the families that survive.

The efficient unit is not the task. The efficient unit is the task family.

## Abstract

Modern coding agents can solve many difficult closed-world tasks by reading the repository,
building local tests, and reasoning through the spec. That makes naive benchmark construction
inefficient: more tasks do not automatically mean more signal.

This repository treats benchmark production as an evidence funnel. Candidate failure mechanisms are
screened before frontier-model budget is spent. Survivors become parameterized task families with
visible rules, declared behavior spaces, hidden graded regions, references, verifiers, mutants,
challenge packages, real-agent trials, human-solvability records, adversarial verifier audits and
axis analysis.

The key claim is:

> A benchmark program should optimize for independent failure axes per engineering hour, not raw task
> count.

Under the current budget model in this repository, $100,000 buys approximately 7 parameterized
families, 168 generated task instances and 21 independent axes at a $120/hour labor assumption. The
same money buys roughly 7 hand-authored tasks if every task is built as its own one-off family.

The exact numbers will move as the foundry learns. The process is the part that matters.

## 1. The Problem With "1000 Tasks"

"Build 1000 tasks" sounds concrete, but it hides the real question.

One thousand tasks can mean:

- one thousand independent measurements
- one thousand copies of the same measurement with small wording changes
- one thousand API surfaces with shared reasoning structure
- one thousand hidden tests for one behavior space
- one thousand unfair puzzles
- one thousand easy tasks that current agents already solve

Those are not the same product.

The durable approval outbox task exposed the core issue. The hard part was not normal logic. It was
uncertainty about an external action: maybe a payment, transaction, approval or tool call happened;
maybe it did not. The model had to avoid guessing, avoid duplicate execution, avoid rewriting
history and avoid stalling forever.

That produced a real failure mode. But it also showed why scaling by hand is wrong. The task was not
one magic prompt. It was a family:

- different crash timings
- different receipt timings
- different worker schedules
- different revocation timings
- different idempotency-key collisions
- different legal and illegal audit transitions

Each concrete case was an instance inside the same declared behavior space. The scalable strategy is
to build more families like that, then sample task instances from them.

## 2. Thesis

The most efficient strategy is:

> Build a staged discovery funnel that promotes task families only when they survive cheap screens,
> verifier mutation tests, package leak checks, real-agent smoke trials, axis analysis,
> human-solvability review and adversarial verifier audit.

This process has three goals:

1. Kill bad candidates early.
2. Spend frontier-model budget only after the family is mechanically credible.
3. Carry forward transferable failure mechanisms instead of copying task prose.

The task count comes last. First comes evidence that the family measures something useful.

## 3. What $100K Should Buy

The current generated budget report prices the program this way:

| production mode | families | task instances | independent axes | cost per task |
|---|---:|---:|---:|---:|
| parameterized families | 7 | 168 | 21 | $535.24 |
| hand-authored tasks | 7 | 7 | 7 | $12,846 |

This is not a final economic law. It is the current best estimate from the repository's own
measurements.

The important part is the shape of the spending:

| cost center | current share |
|---|---:|
| screening candidates | 28% |
| authoring families | 69% |
| frontier trials | 3% |
| generating instances | 0% |

Labor dominates. Model spend is not the bottleneck. The expensive work is designing fair behavior
spaces, writing references, hardening verifiers, building challenge packages, diagnosing failures
and repairing ambiguity.

So the efficient use of $100,000 is not "run a thousand agents." It is:

- build the family-production system
- create a large candidate pool
- kill most candidates before full build
- fully build only the strongest families
- generate many task instances inside each surviving family
- measure axes so instance count does not masquerade as diversity

## 4. The Funnel

The original proposed production funnel had eight stages. That was directionally right, but too
linear: it still implied that a family naturally marches from candidate to full matrix once each box
is checked.

```text
candidate pool
  -> paper screen
  -> task-shape screen
  -> verifier/mutant screen
  -> one-agent smoke trial
  -> diagnosis and evolution
  -> cross-provider trial matrix
  -> human/adversarial evidence
  -> ship, hold, kill or evolve
```

The refined version is adaptive and is now modeled in the repository by
`src/foundry/adaptive-funnel.ts`, `data/mechanism-probes.json`, `data/transfer-tests.json` and
`reports/adaptive-funnel-report.md`.

### Refinement: Adaptive Funnel

The improved funnel has three modes.

**Discovery Mode**

- start with many mechanisms
- paper-screen aggressively
- build tiny probes
- identify cheap evidence
- kill closed-world, self-verifiable, unfair or author-context-dependent ideas

**Validation Mode**

- build a full family only after a probe survives
- write the reference, verifier, mutants and challenge package
- run one counted smoke trial
- diagnose failure by check, knob and transcript
- repair ambiguous specs or stale package hashes before any broader claim

**Production Mode**

- transfer the mechanism to another domain
- run cross-provider trials only after smoke evidence is on target
- run the full `/6` only after smoke and transfer evidence
- collect human clean-room and adversarial verifier-integrity evidence
- ship only after evidence streams are separated and current

The current adaptive funnel is:

```text
candidate mechanisms
  -> Discovery Mode probes
  -> Validation Mode full family build
  -> one-agent smoke trial
  -> transfer test across a second domain/family
  -> Production Mode matrix
  -> human/adversarial evidence
  -> ship / kill / evolve / hold
```

The key principle is:

> The funnel is adaptive: a pass, failure, refusal, ambiguity, stale hash or axis collapse sends the
> family to a different next action. The next step is computed from evidence, not from a fixed
> checklist.

So the old rule "each stage spends the least expensive evidence first" becomes stricter: spend the
cheapest useful evidence first, and do not buy the next evidence tier until the current one changes
the decision.

### Discovery Workbench v1

The adaptive funnel now has an execution-oriented intake layer: Discovery Workbench v1.

It implements the missing machine before task families exist:

- a 50-candidate pool in `data/candidate-pool.json`
- deterministic cheap screens for truth sources, hidden-rule fairness, reference plausibility,
  mutants, baseline cheats, private-context dependence, verifier feasibility, transfer potential and
  cost/axis tradeoffs
- a scoring model that balances expected agent difficulty against fairness, solvability, verifier
  feasibility, cheat resistance, transfer value, surface coverage, axis potential and cost
- a stable promotion queue that recommends probe, task-shape, hold, kill, evolve or transfer actions
- a probe-to-family bridge that emits a draft task shape from a promoted candidate
- a surface-coverage metric for domains, tool/action types, state patterns, authority models,
  external systems, UI/API/workflow surfaces and risk categories

This layer answers the operational question "what should we build next?" It does not prove a
candidate is difficult. A candidate score is planning evidence. Difficulty evidence begins only
after a built family has a current challenge hash, preserved submission, transcript, verifier output
and counted trial.

The new report is `reports/discovery-workbench-report.md`, and the CLI exposes:

```bash
node dist/cli.js discovery report
node dist/cli.js discovery candidates
node dist/cli.js discovery score
node dist/cli.js discovery next
node dist/cli.js discovery scaffold --candidate payment-unknown-capture-receipt --out /tmp/payment-task-shape
```

Discovery Workbench v1 is deliberately separate from axis analysis. Surface breadth can show that a
program touches many products or APIs, but it is not independent defect-axis evidence. A pool with
many domains and one repeated mechanism still needs transfer tests and agent trials before it earns
production-mode spend.

### Refinement: Probe Before Family Build

Discovery scores are planning evidence. They are useful because they make candidates comparable, but
they are still judgement calls until a candidate creates executable evidence.

Mechanism Probe Runner v1 adds that missing bridge.

A mechanism probe is smaller than a full benchmark family. It has a few scenarios, a reference-like
subject, known-bad probe subjects, a deterministic checker, promotion criteria, kill criteria, a
cost estimate and transfer targets. It answers a narrow question:

> Before building the full family, does this mechanism have a fair, independently checkable signal
> that catches realistic wrong behavior?

Probe success does not mean the benchmark is hard. It means the next engineering hour can be spent
on a task shape, transfer test or descendant build with more confidence than score alone. Probe
failure is a cheap kill or repair signal, which is the point: a failed probe is much cheaper than a
failed family package plus model campaign.

The current runner executes probes for high-priority discovery candidates and requested equivalents:
deployment model-alias drift, CRM stale permission action, long-horizon cancellation, memory
authority laundering, verifier import hijack, calendar authority, ticket attachment injection,
schema drift, unknown payment receipt, trading partial-fill reconciliation, browser stale selector,
token scope drift, delegated-wallet authority reconciliation, audit rewrite and cross-tool authority
laundering.

Discovery calibration keeps the scoring model from flattering itself. The calibration report
backtests six known family outcomes:

- durable approval outbox
- prompt-injection containment
- prompt-injection memory poisoning
- UI action record replay
- UI replay live DOM
- checker-required memory poisoning

The set is intentionally labelled n=6 and directional. It can say "this routing pressure seems
wrong" or "probe evidence should dominate this score"; it cannot estimate the true yield of future
families. That estimate still needs more completed probes, promoted shapes and counted trials.

### Refinement: Promote From Probe To Family

Promoted Family Build Pipeline v1 closes the next link in the funnel:

```text
candidate
  -> discovery score
  -> executable mechanism probe
  -> promotion record
  -> full family build
  -> local reference/mutant/package evidence
```

A promotion record preserves what the probe proved, what mechanism pressure carries forward, what
changes in the larger family, the authority source, expected mutants, risks introduced, and
pre-registered confirm/kill signals. It also forbids a common evidence error: calling a promoted
family "difficult" before a counted agent has attempted the current package hash.

The first exercised promotion is `access-token-scope-expansion`. The selected source was the first
ranked promoted probe in the executable queue. The full family expands three token-scope probe cases
into a 1,152-point declared state space and a 384-scenario measured set. Its reference passes, eight
known-bad subjects/baselines fail intended checks, and the challenge package is leak-checked. That is
validation-mode local evidence.

Access-Token Smoke + Diagnosis + Transfer v1 then exercised the next gate:

```text
probe-promoted family
  -> local evidence
  -> one-agent smoke
  -> family-specific diagnosis
  -> transfer declaration
  -> matrix gate
```

The counted OpenAI/Codex smoke trial for `access-token-scope-expansion` passed 384 of 384 scenarios
under the pinned package hash. That is a useful negative result for the funnel: the pre-registered
kill signal fired, and the next step is already_solved_or_needs_evolution, not a full `/6` matrix.
The transfer test to wallet spending limits is declared so the mechanism can be re-probed in a
different domain, but no transfer evidence is claimed until that target-domain probe or family runs.

Access-Token Evolution v1 turns that clean pass into a concrete next artifact. The evolution engine
now has access-token-specific operators for durable state, delegated authority, authoritative
reconciliation, scope downgrade/revocation, truthful audit history and liveness pressure. It
proposes `delegated-wallet-scope-reconciliation`, runs a six-scenario local probe against
cached-scope, requested-scope, revocation-blind, audit-liar, over-blocker and receipt-trusting
subjects, and records a ready promotion. The promoted descendant is now a full validation-mode
family with 804 measured scenarios from an 82,944-point declared space, a clean reference, 10/10
known-bad subjects and baselines caught, 3 mutant-detection axes, a leak-checked package and a
one-slot OpenAI/Codex smoke campaign. That smoke trial passed all 804 scenarios cleanly under the
current package hash, so the descendant also routes to already_solved_or_needs_evolution. This is a
second example of a clean smoke pass preventing matrix spend rather than becoming a difficulty
claim.

### Stage 0: Candidate Pool

Start broad. A reasonable first pass is 50 to 100 candidate family ideas, not 1000 concrete tasks.

The candidates should differ first by failure mechanism, not by surface wording.

Examples:

- uncertain external effects
- stale state
- delayed receipts
- duplicate side effects
- rollback after partial execution
- prompt injection through memory
- prompt injection through tool outputs
- permission drift
- approval-scope drift
- browser/UI replay under changing state
- hidden dependency discovery
- model-alias behavior drift
- audit-history truthfulness
- cross-tool authority escalation

Each candidate gets a ledger row with:

- failure mechanism
- why agents might fail
- why the task is fair
- authoritative source of truth
- expected hidden graded region
- expected mutants
- obvious baseline cheats
- likely reason it will die
- estimated build cost

The goal is not to be right yet. The goal is to make candidates comparable.

### Stage 1: Paper Screen

Kill candidates before writing code.

A candidate should die early if it is:

- closed-world and easily self-verifiable
- solved by obvious local tests
- mostly prompt wording, not a systems failure
- unfair because the hidden tests add secret rules
- impossible because no reference could solve it
- gameable because the verifier trusts subject-written facts
- too dependent on one provider's refusal behavior
- only measuring syntax or formatting
- too expensive for the expected signal

This is where many ideas should die. That is success. A cheap kill is better than a built family that
later measures nothing.

### Stage 2: Task-Shape Screen

For survivors, define a task shape.

The shape must declare:

- visible rules
- behavior space
- knobs
- hidden graded region
- authoritative truth source
- trust boundary
- legal state transitions
- package surface
- verifier contract
- expected mutants
- baselines that must fail
- human-solvability requirements
- adversarial audit requirements

This is the point where the task becomes a family.

The key rule:

> Hidden tests are fair only if they sample the declared behavior space. They are unfair if they add
> secret rules.

### Stage 3: Verifier And Mutant Screen

Do not run expensive model trials until the verifier proves it can catch known bugs.

Build:

- reference implementation
- verifier
- no-op baseline
- refuse-everything baseline
- accept-everything baseline where relevant
- known-bad mutants for each intended failure mechanism
- scenario generator
- hidden-region sampler

Every mutant should be tied to a named check. It is not enough that a mutant fails somewhere. It
should fail the check it was written to trip.

If a mutant passes, the benchmark is not ready. If a baseline passes, the benchmark is broken.

### Stage 4: One-Agent Smoke Trial

Do not jump straight to a full 3-by-2 or 6-run matrix.

Run one counted real-agent trial first, after the family passes reference, mutant, package and leak
checks.

Given the current environment, this means Codex/OpenAI first when Anthropic is unavailable. When all
providers are available, the efficient ladder is:

1. cheapest available capable subject
2. strongest available subject
3. second provider family
4. repeated trials only after the family survives the first three

One failed smoke trial does not prove broad difficulty. It proves the family separates at least one
real subject. That is enough to justify diagnosis and possibly a second provider.

One passed smoke trial does not automatically kill the family. It means:

- inspect the submission
- check whether the agent built its own verifier
- compare against mutants
- look for a missed hidden region
- decide whether to harden or kill

If multiple strong subjects pass cleanly, the family is likely already solved and should be killed
or evolved.

### Stage 5: Diagnosis

Every counted trial must produce a diagnosis packet.

The packet should answer:

- which scenarios failed
- which checks failed
- which knobs correlate with failure
- whether the failure hit the intended mechanism
- whether the model guessed external truth
- whether it stalled
- whether it over-blocked
- whether it wrote false audit history
- whether it duplicated a side effect
- whether it trusted subject-owned state
- whether it built a self-checker
- whether the self-checker was preserved
- whether the verifier or spec was ambiguous

This is where the foundry learns.

The output is not only "reward 0" or "reward 1." The output is a typed explanation of what broke and
whether that break is transferable.

### Stage 6: Kill Or Evolve

A failed or passed trial should update the family state.

Possible outcomes:

- **ship candidate**: the family is fair, solvable and fails at least one real agent for the intended
  reason.
- **already solved**: capable agents pass; kill or harden.
- **redundant axis**: failures are nested or identical; keep only if sensitivity is useful.
- **unfair hidden rule**: hidden coverage added a rule; repair and invalidate stale trials.
- **ambiguous spec**: the model made a defensible choice the verifier rejected; repair and
  invalidate stale trials.
- **verifier gameable**: attack or mutant bypasses the grader; repair before any difficulty claim.
- **too synthetic**: the task is correct but too clean; evolve toward more realistic conditions.
- **insufficient evidence**: package exists but no real subject or human/adversarial record exists.

Evolution should change one structural pressure at a time when possible.

Examples of transferable evolution operators:

- add time separation
- add durable memory
- add partial observability
- add cross-tool interaction
- add competing authoritative sources
- add delayed receipts
- add duplicate deliveries
- add stale handles
- add live state mutation
- add benign noise
- require a subject-written checker
- require audit history, not only final state

The family should record what changed and what stayed fixed. If everything changes at once, the
result may be impressive but the learning is weak.

### Stage 7: Cross-Provider Matrix

Only after the family survives smoke trials and diagnosis should it receive a full matrix.

The normal target is:

- at least 3 counted trials from one strong provider family
- at least 3 counted trials from another provider family
- no stale hashes
- no provider refusals counted as failures
- no infrastructure errors counted as failures
- transcripts and verifier output preserved

The order should be adaptive:

- If Codex/OpenAI fails on the intended mechanism, run a second provider next.
- If Codex/OpenAI passes, run the strongest available subject before building more.
- If the strongest subject passes too, mark likely already-solved and evolve.
- If providers fail in the same way, mark transfer as stronger.
- If providers fail differently, mark axis diversity as stronger.

Repeated trials are useful only after the first cross-provider signal exists. Three runs from the
same provider can estimate stability; they cannot prove cross-lab transfer by themselves.

### Stage 8: Human And Adversarial Evidence

Before release-quality claims, collect two evidence layers that are separate from model difficulty.

Human evidence:

- public package is understandable
- an independent human can solve it clean-room
- the human did not see hidden verifier/scenarios/reference
- notes, timing and verifier output are preserved

Adversarial verifier-integrity evidence:

- attacker sees only the declared attack packet
- threat model and access boundary are explicit
- bypass attempts preserve transcript and artifacts
- provider refusal does not count as no-bypass
- found bypasses are replayable or explicitly unverified
- no-bypass claims are tied to a current challenge hash and verifier hash

These layers answer different questions. A task can be hard for agents and still unfair. A verifier
can catch mutants and still be gameable. A reference can solve the task and a human can still be
unable to understand the public package.

## 5. What To Carry Forward

Do not carry forward whole tasks. Carry forward mechanisms and evidence patterns.

Carry forward:

- failure mechanisms that reproduce across domains
- knobs that correlate with agent failure
- verifier hardening patterns
- authoritative-source designs
- legal transition tables
- baseline/mutant patterns
- challenge-hash discipline
- package leak checks
- human review packet format
- adversarial audit packet format
- diagnosis templates
- evolution operators that actually changed outcomes

Do not blindly carry forward:

- hidden scenario ids
- task-specific prose
- domain-specific constants
- model-specific quirks
- provider refusals
- failures caused by ambiguity
- failures caused by inaccessible truth
- axes measured only against mutants
- trial results under stale challenge hashes

The transfer question is:

> If the same structural pressure moves to another domain, do capable agents still fail for the same
> reason?

If yes, it is a mechanism. If no, it was probably a local trick.

## 6. What To Vary First

Do not vary task, prompt, verifier, hidden tests and cheat surface all at once.

The efficient order is:

1. Vary the failure mechanism at candidate time.
2. Freeze visible rules before trials.
3. Vary hidden scenarios only inside the declared behavior space.
4. Keep the verifier independent of the subject.
5. Use mutants to test the verifier before using agents to test difficulty.
6. Use smoke trials to discover whether the shape is promising.
7. Use evolution operators to change one major structural pressure.
8. Run adversarial audit as a separate campaign.

If a real trial exposes an ambiguity, repair the spec and invalidate stale trials. That is not a
failure of the process. That is the process working.

## 7. Provider Strategy

The provider strategy should minimize wasted full matrices.

With Anthropic unavailable, use Codex/OpenAI for current smoke trials and package validation. Do not
claim cross-lab evidence from OpenAI-only results.

When Anthropic is available again, use this ladder:

1. Run one Codex/OpenAI smoke trial.
2. If it fails for the intended mechanism, run one Anthropic high-reasoning trial.
3. If both fail, run the remaining 2-by-2 or 3-by-2 matrix.
4. If one passes and one fails, diagnose the delta before spending more.
5. If both pass, kill or evolve.
6. If both fail but on identical nested scenarios, preserve the family but do not overclaim axes.
7. If failures are incomparable, promote the family as axis-rich.

The purpose of early trials is not a leaderboard. It is triage.

## 8. Analysis Results Required Per Trial

Each real-agent trial should produce more than a score.

Required artifacts:

- preserved public challenge package
- package hash
- subject submission
- transcript
- verifier output
- scenario-set id
- failed scenario ids
- failed check names
- knob split table
- catch set contribution
- self-checker detection
- baseline similarity check
- stale-hash status
- provider status
- diagnosis summary

The diagnosis should classify failures into mechanisms:

- guessed external reality
- stalled under uncertainty
- over-blocked valid work
- under-blocked forbidden work
- trusted subject-owned state
- rewrote audit history
- duplicated side effects
- dropped provenance
- failed to persist state
- relied on stale handles
- failed to observe preconditions
- verifier/spec ambiguity

This is what lets the foundry learn from reward 0 instead of only counting reward 0.

## 9. Promotion Rules

A family should not move through the funnel just because it looks clever.

Suggested promotion rules:

| stage | promote when | kill or repair when |
|---|---|---|
| candidate | mechanism is plausible and fair | closed-world, unfair, self-verifiable or no authoritative truth |
| shape | visible rules and hidden region are declared | hidden coverage would add secret rules |
| verifier | reference passes, mutants fail intended checks | mutants/baselines pass |
| smoke | one real agent fails intended mechanism | agent passes easily or failure is off-target |
| diagnosis | failure is explainable and transferable | failure came from ambiguity or harness confusion |
| matrix | cross-provider evidence or stable same-provider evidence exists | provider-only artifact or stale/ineligible runs |
| axis | failures are non-redundant or sensitivity is useful | scenarios collapse to one unhelpful catch set |
| human | clean-room solve passes current hash | human needed private hints or saw hidden artifacts |
| adversarial | attacker fails under declared threat model | bypass found, refusal only, stale verifier, hidden leak |

This turns "I think this is hard" into a series of smaller claims.

## 10. What A 100-Task Pilot Should Look Like

Before trying to produce 1000 tasks, run a 100-task pilot.

The pilot should target:

- 50 to 100 candidate mechanisms
- 15 to 25 task shapes
- 6 to 10 built families
- 3 to 5 shipped families
- 72 to 120 generated instances
- 10 to 20 independent axes
- at least one clean human solve
- at least one counted adversarial no-bypass audit
- at least two provider families on the strongest shipped families

A pilot is successful if it learns which families scale. It does not need to hit 100 shipped tasks
immediately.

The key measurements are:

- candidate-to-shape survival rate
- shape-to-built survival rate
- built-to-shipped survival rate
- post-build kill rate
- labor hours per shipped family
- model dollars per counted trial
- stale/invalidated trial rate
- independent axes per family
- instances per axis
- cross-provider transfer rate
- human clean-room solve rate
- adversarial bypass/no-bypass rate

The 1000-task program should be priced after this pilot, not before.

## 11. What The Current Foundry Already Implements

The repository already implements the core evidence machinery:

- Discovery Workbench v1: candidate pool, cheap screens, scoring, promotion queue, surface coverage
  and task-shape draft generation
- Mechanism Probe Runner v1: executable pre-family probes, probe-aware discovery queue and
  probe-to-task-shape scaffold generation
- discovery calibration against six known family outcomes, labelled directional rather than
  predictive
- task shape declarations
- mechanism registry
- candidate ledger
- scaffold generation
- reference/verifier/mutant family pattern
- scenario generation for built families
- challenge packages and hashes
- trial records and countability rules
- stale-evidence invalidation
- axis meter and catch-set analysis
- public SWE-bench matrix import for external calibration
- kill taxonomy
- evolution operators
- provider/submission-quality reports
- human-solvability readiness and clean-room record validation
- adversarial verifier-integrity packets, replay and no-bypass evidence
- adaptive discovery/validation/production funnel with mechanism probes and transfer tests
- budget model

What is still being built is broader measured use of that funnel:

- outcome tracking over completed discovery probes and promoted task-shape drafts
- promotion/kill dashboards over completed probe outcomes
- stronger automated diagnosis from transcripts
- broader cross-provider and human evidence
- more measured families
- more external benchmark calibration

## 12. Open Questions

The draft strategy should change as evidence improves.

Open questions:

- How many candidate ideas are needed to yield one shipped family after the system matures?
- Which evolution operators transfer across domains?
- Which knobs create real agent difficulty instead of only mutant discrimination?
- When does a one-axis family remain valuable as a sensitivity ladder?
- How often do real trials reveal spec ambiguity?
- How often do adversarial audits find verifier defects after package leak checks pass?
- How many human clean-room solves are needed before a family is confidently human-solvable?
- How should defect-axis diversity be combined with product/API surface coverage?
- Which provider family should be used first when all models are available?
- How much does self-checker behavior predict success?

These are not reasons to avoid building. They are the measurements the foundry should collect.

## 13. The Most Efficient Plan

If the goal is the strongest possible $100,000 program, the plan is:

1. Generate 50 to 100 candidate task-family ideas.
2. Paper-screen them aggressively.
3. Promote 15 to 25 to task shapes.
4. Build only the highest-signal 6 to 10 families.
5. Run reference, verifier, baseline and mutant screens before any frontier trials.
6. Run one counted Codex/OpenAI smoke trial while Anthropic is unavailable.
7. Add Anthropic/Gemini/other provider trials when available, but do not block all engineering on
   them.
8. Diagnose each real failure by check, knob, transcript and catch set.
9. Evolve passed or redundant families instead of forcing them through the matrix.
10. Spend full 3-by-2 matrices only on families that survive smoke, diagnosis and package integrity.
11. Require human-ready and adversarial-ready before public claims.
12. Require human-evidenced and adversarial-audited before high-confidence release claims.
13. Use axis count to decide whether more instances are adding signal.
14. Use surface-coverage metrics separately when the benchmark is meant to cover many products or
    APIs.
15. Reprice the program after the pilot using measured survival rates.

The operating principle is simple:

> Spend thought before code, code before model trials, smoke trials before full matrices, and axis
> analysis before task-count claims.

## 14. Conclusion

The most efficient way to produce one thousand useful agent benchmark tasks is not to start by
writing one thousand tasks.

Start with failure mechanisms. Turn the best mechanisms into task families. Generate many concrete
instances from declared behavior spaces. Prove the reference can solve them. Prove the verifier
catches known-bad implementations. Package the task without leaks. Run real agents. Diagnose the
failures. Measure independent axes. Kill what is easy, unfair, redundant or gameable. Evolve what
almost works.

That is how a single durable-outbox finding becomes a benchmark-production method.

The deliverable is not just more tasks. It is a system for deciding which tasks deserve to exist.
