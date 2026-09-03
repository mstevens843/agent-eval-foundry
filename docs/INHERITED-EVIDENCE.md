# Inherited evidence

**Read this before proposing a mechanism, setting a difficulty target, or pricing a plan.**

Everything here was measured in the source project
(`../klavis-terminal-bench-task`, principally `FINDINGS.md` and `prototype/README.md`) across five
design cycles and fifteen candidates, or established by this repository's own withdrawals. None of it
should be re-derived. It has been re-derived at least three times already, once per phase, at the
cost of roughly one family each time.

Numbers here are quoted from the source project, not from this repository's generated reports, so
they do not drift with our own evidence. Where a figure is an estimate rather than a measurement, it
says so.

---

## 1. The arithmetic ceiling

This is the single most important number in either repository, and it was not known here until
Phase 6.

Let `p` be the probability a frontier model solves the task. Trials are independent, so:

```
P(all 6 fail)   = (1-p)^6
P(at least 5)   = (1-p)^6 + 6p(1-p)^5
```

| p | P(6 of 6 fail) | P(≥5 of 6 fail) |
|---:|---:|---:|
| 0.10 | 53% | 89% |
| 0.20 | 26% | 66% |
| 0.30 | 12% | 42% |
| 0.35 | 7.5% | 32% |
| 0.40 | 4.7% | 23% |
| 0.50 | 1.6% | 11% |
| 0.55 | 0.8% | 6.9% |

Three consequences:

1. **A run of withdrawals is close to the expected outcome, not proof of a broken instrument.** A
   handful of families with zero survivors is what a low hit rate looks like at small n. This
   repository concluded its screen was broken. The likelier reading was that it never knew the base
   rate.
2. **5/6 is roughly four times easier than 6/6** at every p in the useful range. The two bars are not
   interchangeable and should never be quoted as one target.
3. **The binomial model overstates the difficulty of replication**, for the reason in §1.2. Read it
   before using this table to price anything.

### 1.1 Do not estimate p from the calibration table when trials exist

An earlier version of this document applied §2's prior (p = 0.35–0.55) to the shipped outbox task and
concluded that clearing 6/6 had been substantially luck. **That was wrong, and the error is worth
recording because it is the exact mistake this repository exists to catch: estimating a quantity from
a prior table when direct measurement was available.**

The measurement: the shipped 267-check artifact was run through the full six-trial matrix **twice, by
two independent operators**, with zero solves both times.

| | |
|---|---:|
| clean trials, two independent operators | **12** |
| solves | **0** |
| 95% upper bound on p | **0.22** |
| point estimate (Jeffreys) | ~0.04–0.07 |
| implied P(6 of 6 fail) at p = 0.07 | ~65% |
| implied P(6 of 6 fail) at p = 0.22 | ~23% |

So the honest range was roughly **23–65%**, not the 0.8–7.5% the prior implied. The task sits *below*
the calibration table's best row, and an independent replication is what establishes it. **A 7.5%
event does not occur twice to two different operators.**

### 1.2 Why `(1-p)^6` overstates difficulty here

The formula assumes six independent Bernoulli draws. For this mechanism that model is wrong.

`results/34` records what actually happens: *"self-checking here requires building a checker complete
enough to state the rule, and five of six never did."* Two of three trials from one lab built a
verifier that could not express the rule; all three from the other lab built no verification tooling
at all.

That is not a coin flip. It is a **systematic property of how each model habitually works.** Where a
model's standard workflow does not produce the check in question, its failure is closer to
deterministic than stochastic, and failures within a model family are correlated. Which is precisely
why the result replicated cleanly for a second operator.

> **Targeting a systematic blind spot is a different strategy from winning six coin flips, and it is
> the one that works.** Reliable 6/6 is reachable — it has been reached and replicated. The route is
> to find more blind spots, not to design harder puzzles.

Use the binomial table for *pricing an unscreened programme*, where mechanisms are unknown and the
prior applies. Do not use it to second-guess a measured result.

### What this does to the $100k question

Using the source project's own measured p, and its measured build cost:

| bar | success per attempt at p=0.35 | attempts for 1000 tasks | at ~20h each |
|---|---:|---:|---:|
| 6/6 | 7.5% | ~13,300 | ~128 engineer-years |
| 5/6 | 32% | ~3,100 | ~30 engineer-years |

"$100k buys 1000 tasks at 6/6" is off by two to three orders of magnitude, and this is the derivation
that shows it rather than asserting it.

---

## 2. The calibration table

Measured against demonstrated capability, replacing intuition. Source: `FINDINGS.md` §6.

| discovery shape | realistic p |
|---|---:|
| uses an evidence channel present in the container | ≥ 0.85 |
| is a consequence of a rule stated in the instruction | ≥ 0.85 |
| falls out of running a standard tool and reading the residual | ≥ 0.80 |
| is a memorised public implementation | ≥ 0.85 |
| **requires choosing against a confirmed green measurement** | **0.35–0.55** |
| **requires an abstraction the model must justify but cannot** | **0.3–0.5** |

> *"Only the last two rows are worth building on."*

**This table is a floor, not a ceiling.** It records the best pass rates the source project had
achieved across designs 1–5, written before the outbox shipped. The outbox then measured below its
best row (§1.1). Read it as "nothing above row 5 is worth trying," not as "row 5 is as good as it
gets."

**Every candidate and family should carry its row.** A candidate on the top four rows is p ≥ 0.80 and
should not be built, whatever else is attractive about it.

### The p^N collapse

Reward is binary, so a task requiring `N` independent discoveries at probability `p` passes at `p^N`.
Every source-project candidate claiming 3–5 independent discoveries collapsed to **N = 1 or 1.5**
under adversarial judging, because discoveries that follow from a single realisation are one
discovery.

This is the same result as this repository's axis measurement, reached earlier by a different method.
Where the two disagree, report both and investigate; do not pick the flattering one.

---

## 3. The identifiability vise

Source: `FINDINGS.md` §3. A near-unsatisfiability argument, not a heuristic.

> Fairness requires the graded rules fully stated. Human solvability requires the answer computable
> from rules + data by an expert in 4–10 hours. But if a human can compute it, a program can — and
> the agent writes that program and uses it as a self-check.

So either the container determines the answer, in which case the agent enumerates, regresses or
simulates its way to it and the human's route is the agent's route run slower; or it does not, in
which case the answer is the author's private convention, the human expert fails too, and the task is
an auto-reject on hidden requirements.

**Seven of fifteen candidates died on exactly this fork. None found an interior.**

The corollary is the part that bites: across all fifteen candidates, **not one named a capability
where a human expert beats the agent.** Spec transcription, exhaustive enumeration, residual
bucketing, ablation and lattice enumeration are all things frontier models do better than a tired
expert on a six-hour clock. The only structural asymmetry left is serial time depth, and the
constraint set disallows it as timeout pressure.

### The vise is not universal, and the exception is named

`results/13-screenF-cleanroom.md` concluded "fair implies probeable, probeable implies differentially
fuzzable, and differentially fuzzable implies solved." **That conclusion is too strong**, and a later
analysis found the counterexample: a merged, accepted 16-expert-hour task ships a reference binary at
`chmod 111` in the agent container and tells the agent outright to reimplement it by black-box
probing. Maximally probeable, unlimited queries, and still accepted and hard.

The distinguishing property was identified and then discarded: *probes are genuinely expensive, the
output space is enormous, and several layers must all be byte-correct simultaneously.*

**This matters because the wrong conclusion was inherited.** An independent nine-candidate sweep run
later steered away from the one shape with accepted precedent, because the designers were given the
ruling that artifact-embodied designs were dead.

---

## 4. What is measured shut

Do not propose these. Each was measured, not argued. Source: `FINDINGS.md` §8 and `prototype/README.md`.

| mechanism | why it failed |
|---|---|
| planted local bugs | the diff loop converges |
| performance budgets | withholding the bar removes the stopping bell, not the gradient; a blind annealer with no structural knowledge beat a hand-built reference plan by 48× |
| completeness-of-a-set | every natural quotient tested was sound, and the error direction was always finer and slower, never coarser and incomplete |
| two-sided adversarial defence with a small enumerable adversary space | enumerable |
| any label that is a provenance or arrival-order property | arrival order lives in row order, and `(df.ts.diff() < 0).sum()` is line one of any agent's exploration |
| cleanroom from a stripped native binary, small output space | 3 of 3 agents solved by differential probing |
| cleanroom from a Python `.pyc` oracle | 3 of 3 agents decompiled it |
| a 500-entry FIFO dedup cache | measured at 0.0000% activation; corpora generated at cache sizes 500 and 1,000,000,000 were byte-identical |
| tick-array exhaustion | measured at 0.0000% activation in both probeable and graded regions |

### Withholding the signal makes tasks easier, measured twice

The source project removed a numeric budget signal expecting difficulty to rise. The result was
**reward 1.0 in 28m51s — the fastest of four solves** — and the agent rebuilt the measurement
apparatus itself.

**This repository's "hidden graded region" pattern rests on the opposite assumption.** If the agent
can reconstruct the measurement, hiding it removes feedback the author wanted to withhold and nothing
else.

---

## 5. What has accepted precedent and has not been tried here

None of these appear in this repository's candidate pool, which is dominated by variations on one
mechanism. All are legitimate under the benchmark's own rules.

- byte-exact cleanroom from a probeable-but-unreadable binary
- published threshold with hidden measurement, calibrated above measured frontier scores
- live multi-container environments with an adversarial load driver
- graded evidence held by a sidecar the agent cannot read
- a hidden second instance
- stated resource caps that forbid the natural architecture
- adversarial stress subsets that invert the globally-winning heuristic
- **regression forensics against a deterministic archived behaviour, with interacting defects that
  mask each other**

The last one has the only external measurement near the target: a proposal of that shape measured
**Claude 0/5 and Codex 1/5**, roughly p = 0.10 — the value §1 says is required for reliable 6/6.
"Interacting defects that mask each other" recurs in every strong example and appears nowhere in this
repository.

Explicitly excluded by the benchmark: hidden rules, timeout pressure, corner-case piles, unstated
resource starvation, network disabling.

---

## 6. Two different bars, routinely conflated

| bar | source | what it asks |
|---|---|---|
| **≤ ~30% solve rate** | the benchmark's own contribution call | a good task |
| **6 of 6 trials fail** | the take-home assignment | ~12% likely even at p = 0.30 |

This repository has optimised for the second and treated anything short of it as failure. Under the
benchmark's own standard a task at p = 0.30 is a success.

**Measure `p`. Report against both bars.** Chasing 6/6 directly means chasing a 1-in-13 outcome and
calling the other twelve attempts failures.

---

## 7. Task-shape facts

Measured across 70 merged benchmark tasks.

- **`expert_time_estimate_hours`: median 4.0, mean 6.6, max 60.** The hard tail is 8–24 hours. A task
  declaring 4 is declaring the median.
- **48 of 69 (70%) have expert-hours exceeding their own agent timeout.** Long is not banned; wide
  and tedious is. Expert-hours covers *figuring it out*; the "solvable in a few hours" clause covers
  *implementing once you know the answer*.
- **Instruction length is inversely correlated with difficulty.** A 150-word instruction carries an
  8-expert-hour task; the benchmark's longest instruction, at 1,401 words, is a 2-hour task.
- **The hard tail is discovery-dominated**, 95:5 or 80:20 discovery to implementation. One 8-hour task
  resolves to five one-to-three-line fixes.

### The authored specification is the answer key

Nine independently generated candidates were adversarially critiqued in one afternoon. All nine
collapsed at an estimated 40–115 minutes of solve time, and **every attack path began the same way:
`cat /app/docs/...`**.

A reviewer on the benchmark, quoted in the source notes:

> *"I see every token as an opportunity to mistakenly add ambiguity or create a specification detail
> which the tests might miss. If I want the task to be unambiguous and perfectly verified, then
> brevity is an important KPI."*

**This inverts one of this repository's core activities.** Its spec probe measures ambiguity in a
document that, on this evidence, should be short enough not to need one. Every ambiguity found in a
long normative specification is partly a symptom of having written one.

---

## 8. The mechanism that actually worked, and why

The one task that cleared 6/6 did so for a reason worth stating precisely, because it is easy to
describe wrongly in both directions.

> *"The rule is not hidden; it is stated three times in agent-visible normative text. The difficulty
> is that self-checking here requires building a checker complete enough to state the rule, and five
> of six never did."*

Every trial from one lab wrote its own verifier. Two built one that could not express the rule under
test, so **their own fuzzers ran green over a buggy engine**. The one that added a transition-legality
table was the only engine of six to pass. All three trials from the other lab built no verification
tooling at all — 84 commands in one trial, zero invoking a self-written checker.

That is calibration row 5: *choosing against a confirmed green measurement.*

**So the axis is not "is the rule stated." It is "does the agent's natural self-check cover the
rule?"** That is measurable from trajectories and it is the property to design for.

The failures also came from opposite directions — most resolved uncertainty too eagerly and wrote an
illegal transition; one refused to resolve it and stalled forever. **Failing on opposite sides of one
obligation is the signature of a real difficulty rather than a single narrow trap**, and it is a
useful test of whether a mechanism is genuine.

---

## 9. The selection lesson

Why an earlier version of that task scored 5/6 and the corrected one scored 6/6. No rule changed, no
mechanism changed, no agent-visible byte changed.

> **Validating that a trap is *robust* is not the same as identifying which parameter *controls* it.**
> Select against the narrowest-signal adversary available, not the broadest.

The earlier family was selected against an engine carrying the bug so broadly that every parameter
value looked like a trigger. Against a stronger engine only the reliable trigger fires, and the
earlier selection had missed it by one parameter value.

**A corollary this repository learned the hard way:** improving coverage of a rule can convert a
harmless ambiguity into the entire measurement. When a scenario selection changes, re-check the rules
the new selection concentrates the grade on.

---

## 10. Provenance

| claim | status |
|---|---|
| calibration table, vise, measured-shut list, activation figures | measured in the source project |
| the 70-task shape statistics | measured against merged benchmark tasks |
| the p = 0.10 external example | one published proposal's reported trial counts |
| the arithmetic in §1 | derived here from the source project's measured p |
| the $100k figures in §1 | derived, and sensitive to the build-hours estimate, which was never timed |

The build-hours input has never been measured anywhere in either repository. Every cost conclusion
inherits that.
