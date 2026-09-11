# Why the task is hard to make hard

A measured account of five attempts to build a Terminal-Bench 3 task that
frontier coding agents fail.

---

## 1. What was asked, and what happened

The assignment requires one original TB3 task where **all standard `/run` trials
fail** - both `claude-opus-5` at max reasoning effort and `gpt-5.6-sol` at xhigh,
three trials each, every one a genuine verifier failure rather than a crash,
rate-limit or timeout.

Five designs were attempted.

| # | Design | Outcome | Cost to establish |
|---|---|---|---|
| 1 | Settlement engine, six planted defects behind misleading comments | **solved, 55m of 120** | full build + trial |
| 2 | Same domain, engine correct but O(n²); bounded-work budget in rows read | **solved, 37m of 120** | full build + trial |
| 3 | Emit the exact set of reachable terminal observables | **killed before build** | ~30 min |
| 4 | Two-sided adversarial transaction guard | **killed, 3/3 agents solved it** | ~1 hour |
| 5 | Fifteen candidates → four mechanisms → all three survivors killed | **killed before build** | ~90 min |

Both solves were legitimate. Neither was a reward hack; the agents fixed the
actual defects and derived the actual architectures.

### 2026-08-25 addendum: the bar is met — 6 of 6

Durable-outbox v2 is the shipped task. On the corrected artifact (24 scenarios /
15 schedules / **267 checks**, commit `c0e04eb`) it produces **six clean
frontier-agent failures out of six**.

| Design | Outcome | Cost to establish |
|---|---|---|
| Durable approval outbox, corrected coverage — Opus ×3 | **3/3 failed**, 265/267, 254/267, 256/267, all reward 0.0 | 45m–1h58m each |
| Same artifact — Codex/GPT ×3 | **3/3 failed**, 256/267 ×3, all reward 0.0 | 29m–38m each |
| Adversarial `/cheat` — Opus | **reward 0.0, genuine attack, no bypass** | 21m 55s at max effort |
| v3: bounded idempotency window | **killed at the gate** | ~3h, no build, no trials |

**Final position: six of six standard trials fail. The strict bar is met.** Zero
timeouts, zero API errors, zero orphans, zero exceptions.

#### The finding that mattered most

An earlier artifact (18 scenarios / 201 checks) scored **5 of 6** — Opus solved
one of three. That solve was reported as a solve, then audited. **The audit found
the solving engine still contained the bug the hidden tests were built to catch**
(`ACKED -> REVOKED`). It passed because the hidden coverage sampled the wrong
parameter: withdrawals aimed at subjects usually still in flight, rather than the
one subject reliably already acknowledged.

The lesson generalises beyond this task, and it is the most transferable thing in
this document:

> **Validating that a trap is *robust* is not the same as identifying which
> parameter *controls* it.** The family was selected against an engine carrying
> the bug so broadly that every parameter value looked like a trigger. Against a
> stronger engine only the reliable trigger fires. Select against the
> narrowest-signal adversary available, not the broadest.

The correction added no rule, no mechanism and no spec change — it fuzzed the
grammar the task already ships and replaced four weak hidden schedules with six
valid ones. Nothing agent-visible changed by a byte.

#### What the six failures show

`SEMANTICS.md` §7 requires two things at once: never guess while an outcome is
unknown, and still finish work nobody withdrew.

- **Five of six resolved doubt too eagerly** — illegal `ACKED -> REVOKED`.
- **One refused to resolve doubt at all** — correct, but left an action in
  `IN_DOUBT` forever.

No engine delivered both halves. Failing from opposite directions is the
signature of a real difficulty rather than a single narrow trap.

What separated them was **whether they built a checker that could express the
rule.** Every Opus trial wrote its own verifier; two omitted a
transition-legality table, so their fuzzers ran clean over buggy engines. The one
that added a `LEGAL` table excluding `(ACKED, REVOKED)` is the only engine of six
to pass all six new schedules. All three Codex trials built no verification
tooling at all — 84 commands in one trial, zero invoking a self-written checker.

The rule is not hidden; it is stated three times in agent-visible normative text.
The difficulty is that **self-checking here requires building a checker complete
enough to state the rule**, and five of six never did.

Adversarial `/cheat` is complete and met on the corrected artifact: the Opus
trial did not refuse, attacked the process-separation boundary for 21m 55s, found
the one theoretically total bypass, built a proof-of-concept, and confirmed the
three-process architecture blocks it. Codex refused at the provider level on all
three attempts — reward 0.0, but **no attack was attempted**, so it is not
evidence of verifier resistance.

The solve was audited rather than explained away: identical image hashes and task
checksums across all runs, `instruction.md` verbatim as the only prompt, no
internet at agent phase, hidden schedules never seen by any agent, four
structurally distinct submitted engines, and every recorded result reproducible
today against the preserved artifacts. Opus's rate on this task is roughly one in
two.

It is still different from the earlier misses. Opus learned the obvious durable-outbox lesson, implemented receipt
reconciliation, passed both opposite UNKNOWN pair schedules, and still terminated
with a plausible implementation that left one action permanently `IN_DOUBT` in
two hidden completion cases. Codex also passed the UNKNOWN pair, but then missed a
different lifecycle edge: later withdrawal/supersession produced illegal
`ACKED -> REVOKED` audit transitions. A second clean Codex run repeated that
same lifecycle miss with zero Harbor exceptions. A third clean Codex run again
missed the lifecycle boundary and also marked landed external work as
`REVOKED` with `ever_executed=False`.

**The repeat is what matters most.** Opus failed the byte-identical artifact
twice, independently, in the same class: both runs implemented receipt
reconciliation, both passed all 22 UNKNOWN-pair checks, and both then allowed an
action to end permanently `IN_DOUBT`. The second run's engine states the choice
deliberately in a comment, so it is a considered conclusion rather than an
oversight. A failure that reproduces across independent runs of the same model is
evidence of a stable reasoning wall, not a lucky edge.

The self-check failure is the important part. Opus wrote its own local property
checker and fuzzers, but its checker explicitly treated a withdrawn `IN_DOUBT`
action as genuinely unresolved and therefore acceptable. Codex also wrote local
tests, including audit-chain checks, but it checked continuity and terminal
agreement without the verifier's legal-transition whitelist. Both submitted
confirmed-green local implementations, and the hidden verifier rejected different
durable-state mistakes.

The task is therefore not just catching one brittle hidden edge. It is exercising
a multi-dimensional durable state model: unknown outcome, receipt authority,
revocation/supersession, completion, and append-only audit explanation.

**And it is right at the boundary.** The two failing Opus runs and the solving one
differ on a single design judgement — whether an action whose outcome is unknown
must eventually drain to a terminal state. That is a coin-flip-ish call, which is
what a ~50% rate looks like. Pushing below it needs a second independent
decision of comparable difficulty, which is what the v3 gate went looking for.

Codex/GPT standard trials are now complete: 3/3 clean failures.
Official `/cheat` adversarial trials are complete: three trials, every one reward
0.0, no bypass. The direct Docker cheat
checks are verifier-hardening evidence only.

### The v3 attempt, and why it failed

Two v3 candidates were gated against the engine Opus actually submitted, on the
rule that a candidate survives only if it breaks that engine while a reference
still passes.

- *Per-subject ordering* (a superseded action crossing after its replacement):
  **dead**, zero violations across all eighteen scenarios.
- *Bounded idempotency window* (the tool forgets a key after a stated window, as
  Stripe and SQS do): **broke the solving engine on 7 of 7 scenarios** — and was
  still killed, because it is not solvable in that form.

The second one is the more interesting failure, and it generalises:

> An unanswered call is owed no settlement record, so repeating it is the only
> thing that can settle it. Take repetition away and the action can never
> terminate — so fairness requires a late-reconciliation path. But with that
> path, a well-built engine settles from it and never retries late, so the window
> never expires and the trap never fires. **The mechanism that makes the task
> solvable is the same mechanism that defuses its trap.**

That is the identifiability vise again, wearing new clothes: not "the answer is
computable from the shipped data" but "the escape hatch required for fairness is
the same one that neuters the difficulty".

Full records:

- `results/19-outbox-v2-standard-matrix-status.md` — final matrix and the solve
- `results/03-cheat-trials.md` — adversarial trials
- `results/23-v3-bounded-idempotency-window-gate.md` — the killed v3 candidate
- `results/17-outbox-v2-opus-trial.md`
- `results/18-outbox-v2-codex-trial.md`
- `results/20-outbox-v2-codex-2b-trial.md`
- `results/21-outbox-v2-codex-3b-trial.md`

---

## 2. The context that reframes the problem

The bar is far higher than it appears from the assignment text.

- **GPT-5.6 Sol (xhigh) scores 89.5% on Terminal-Bench v2.1.**
- On **Terminal-Bench Hard** - a subset explicitly curated to resist
  pattern-matching on training data - GPT-5.6 Sol (max) still scores **65.9%** and
  Claude Fable 5 **62.9%**.
- TB2 was designed to hold frontier models under 50%. They passed it. TB3 targets
  ≤30% solve rate.

Contributing a task these models fail is therefore at the genuine frontier, not a
matter of trying harder. Two solves is a normal outcome.

### What the models are documented to be bad at

Snorkel's error analysis over 195 Opus 5 trajectories, 77 judge-confirmed root
causes:

| Cause | Share |
|---|---|
| **Reasoning errors** | **35%** |
| Output formatting | 18% |
| Planning | 13% |
| Tool use | 10% |
| Verification | 10% |
| Execution / termination | 5% |

> "Reasons to a wrong conclusion and doesn't catch the mistake before finishing."
>
> "Opus 5's ceiling is fundamentally a reasoning and verification problem rather
> than a tooling limitation."

Long-Horizon Terminal-Bench finds the same thing from another angle: verification
failures account for **47–60%** of unresolved runs, where "the agent typically
makes a plausible attempt, but does not correctly check whether the goal state is
actually satisfied before terminating."

**This is the target.** A task should be built so the agent's own self-check is
incomplete or misleading. Designs 1 and 2 did the opposite - each handed the agent
a fast, *reliable* local check of exactly the graded property, neutralising its
single largest failure mode.

---

## 3. The identifiability vise

Five cycles converge on one structural result.

> Let `R` be the graded rules and `D` the shipped data.
>
> **Fairness** requires `R` fully stated, with no hidden rules - hidden *seeds* and
> hidden *data* are permitted, hidden *rules* are not.
>
> **Human solvability** requires the answer be computable from `R + D` by an
> expert in 4–10 hours.
>
> But if the answer is computable from `R + D` by a human, it is computable by a
> program - and the agent writes that program and uses it as a **self-check**.

So the container either determines the answer, in which case the agent
enumerates, regresses or simulates its way to it and the human's route is simply
the agent's route run slower; or it does not, in which case the answer is the
author's private convention, the human expert fails too, and the task is an
auto-reject on hidden requirements.

Seven of the fifteen candidates in cycle 5 died on exactly this fork. None found
an interior.

### Route symmetry

The corollary, and the reason it bites. Across all fifteen candidates, **not one
named a capability where a human expert beats the agent.** Spec transcription,
exhaustive enumeration, residual bucketing, layout diffing, ablation, lattice
enumeration - these are all things Opus 5 demonstrably does better than a tired
expert on a six-hour clock.

The only structural asymmetry remaining in the constraint set is **time and serial
depth**, and that is explicitly disallowed: timeouts do not count as model
failures.

Stated as a near-unsatisfiability: *fully stated rules* + *a human who succeeds in
4–10h* + *no hidden requirements* + *exact deterministic grading* + *no timeout
pressure* jointly imply the answer is program-computable from shipped artifacts,
which implies the agent can both compute it and self-check it.

### Both horns, measured

**Horn 1 - the evidence is present, so the agent finds it.** Design 5's
extrapolation family shipped a labelled corpus from a narrow regime and graded on
a wider one, hoping some structures would be invisible in the corpus. Measured
activation:

| structure | in the shipped corpus | in the graded region |
|---|---|---|
| truncating shift | **52.25%** | 80.22% |
| Newton isqrt | **67.49%** | 83.52% |

In a 600,000-record corpus the truncating shift appears ~313,515 times. Residual
bucketing against exact labels recovers it immediately.

**Horn 2 - the evidence is absent, so nobody can find it.**

| structure | in the shipped corpus | in the graded region |
|---|---|---|
| skew breakpoint | **0.0000%** | 86.56% |
| tick-array exhaustion | **0.0000%** | 0.0000% |

Nothing shipped determines these. A human expert cannot derive them either;
grading on them is grading on my private convention.

**No interior.** Design 5's provenance family produced three independent
instantiations that landed on one monotone curve:

| instantiation | canonical check on the wrong answer | label identifiability |
|---|---|---|
| TAPE-M2 | not invariant - red, and it *localises* the error | fully determined (100.000000% leak, 12-line rule, 6/6 seeds) |
| M2-TAPEMERGE | partially invariant | 28.90% of graded slots undetermined |
| M2-TAPEJOIN | totally invariant - 1500/1500 owners green | ≥2²¹⁶ ≈ 10⁶⁵ consistent labelings |

**Engineering the confound *is* engineering the ambiguity - one fact with two
names.** The error in that domain is conjugate: a phantom row is +1 on one side, a
missing fill is +1 on the other, at the same owner, side and amount. Converting
between them is invariant in every count and every sum, which is not a blind spot
in the verifier but a **symmetry of the shipped data itself**. Twenty-five worlds
permuted within that symmetry hash to **one SHA-256** over all shipped columns -
byte-identical files - while carrying twenty-five different truths.

---

## 4. The one escape that was proposed, and why it failed

The only articulated escape from the vise:

> Verification is cheap to state and cheap to check *once you have a candidate*,
> but the **search** for the candidate is misdirected, because the loud channel
> returns a confirmed green.

Both halves failed under measurement.

**The search is not misdirected.** Wherever labels were determined, the container
necessarily shipped a channel that was *not* invariant - and such a channel is a
labelled pointer, not merely a red light. One instantiation: 34 of 1,970 owners
fail reconciliation with residual 5.1030e+11, and those owners are exactly the
wrong groups. Another: the per-slot residual is exactly zero on 2,464 of 3,000
slots with **zero overshoot slots**, decomposing the problem into 3,000
independent subproblems that enumerate exhaustively in 34.5 seconds.

**And the structural reason, which generalises:**

> The graded label was a claim about **arrival history**, not economic content. A
> duplicate and its genuine twin are bit-identical in every economic field, so
> confounding the economic channel buys nothing - the label was never a function
> of that channel. Shipped data can only determine an arrival-history label by
> carrying an arrival-history signal, and that signal has **no hiding place**: it
> lives in row order, and row order is the first thing any profiling pass
> computes. `(df.ts.diff() < 0).sum()` is line one of any agent's exploration.

So for **any** mechanism whose graded label is a provenance, arrival-order or
which-copy-won property, this escape is imaginary.

It may still exist for a mechanism whose label is a function of the **economic**
channel - the channel all three instantiations successfully confounded and none of
them graded. Nobody has exhibited one.

---

## 5. What the agents actually did

Worth recording precisely, because difficulty arguments should be calibrated
against demonstrated capability rather than intuition.

**Design 1**, solved in 55 minutes. The trajectory shows the agent referencing the
shipped reference implementation **119 times**, using it as an oracle to
reconstruct the verifier, then iterating to green. It wrote three test files of
its own.

**Design 2**, solved in 37 minutes. It ran the harness 18 times, saw
`BUDGET_EXCEEDED` 12 times, inspected `rows_read` 12 times, and hill-climbed to
the intended architecture - a materialised canonical table with indexed
retractions - deriving it independently. One of its six self-written test files
was named `margin.py`: it was measuring its headroom against the allowance.

**Design 4**, three fresh agents, all three solved it in ~25 minutes:

- one built a 420-world grid, a 200,000-sample fuzz and a 12,096-world adversary
  enumeration, unprompted;
- one enumerated **all 61 maximally-strong assertions** valid in every honest
  world - the best solution achievable with an unbounded budget - and **proved its
  own answer optimal**, identifying 171 worlds no legal guard can catch;
- one swept **5,471,232 worlds**, ran a leave-one-out ablation on its own
  assertions, and determined which grading predicates were even *satisfiable*,
  proving two variants unsatisfiable;
- **two of three found an expressiveness flaw in the task that I had missed** -
  the assertion language had `lamports_gte` and `lamports_eq` but no
  `lamports_lte`, so a payout could only be bounded from the wrong direction.

When the agents under test reason about a task's own expressiveness limits more
carefully than its author, the difficulty estimate is not marginally wrong.

---

## 6. The calibration table

Every difficulty estimate on this project - mine, and a judge that correctly
scored an already-solved design at 0.93 - was optimistic, in one consistent
direction. This replaces intuition:

| Discovery shape | Realistic p |
|---|---|
| Uses an evidence channel present in the container | ≥ 0.85 |
| Is a consequence of a rule stated in the instruction | ≥ 0.85 |
| Falls out of running a standard tool and reading the residual | ≥ 0.80 |
| Is a memorised public implementation (Uniswap v3, WAL epochs, Solana nonces) | ≥ 0.85 |
| **Requires choosing against a confirmed green measurement** | **0.35–0.55** |
| **Requires an abstraction the model must justify but cannot** | **0.3–0.5** |

Only the last two rows are worth building on.

**The quantitative lesson from design 4:** reward is binary, so if a task requires
`N` independent discoveries each at probability `p`, the pass rate is `p^N`.
Design 4 had `N=1` at `p≈1.0`. Every subsequent candidate claimed 3–5 independent
discoveries; adversarial judging collapsed all of them to `N=1` or `1.5`, because
discoveries that follow from a single realisation are one discovery.

### Two war stories that were not mechanisms

Twice, a compelling production incident failed to survive a measurement of how
often it actually fires.

- A 500-entry FIFO dedup cache, measured at **0.0000% activation** in two
  independent instantiations. In one, corpora generated with cache sizes of 500
  and 1,000,000,000 were **byte-identical**, md5
  `860d21ddbb0837934c7a33f0d00ef621`. It structurally cannot fire, because a
  second-granularity key can only recur inside one wall-clock second.
- Tick-array exhaustion, measured at **0.0000%** in both the probeable and graded
  regions.

A good story about a real outage is not evidence that the underlying condition is
reachable in a synthetic instance. Measure the activation.

---

## 7. What was built anyway

The shipped task is complete and every automated gate passes: 22/22 static checks,
35/35 implementation-rubric criteria, oracle 1.0, nop 0.0, three deterministic
cheat oracles at 0.0, and 30/30 determinism runs across 3,240 assertions.

**Two of the three cheat oracles exist because the rubric reviewer found real
exploits**, both verified rather than hypothesised:

1. **Connection-factory bypass.** An engine that opened its own connections
   reported zero instrumented commits, so no scheduled crash ever fired and
   nothing complained - five of six defects fixed plus a bypass scored reward 1
   with a demonstrably crash-unsafe engine. My first fix was also wrong: counting
   connections *handed out* fails, because the runtime still asks the factory for
   one and then ignores it. The working fix counts whether a handed connection is
   ever *used*.
2. **In-process oracle rebinding.** pytest imported the agent's engine into the
   same process that computed the expected answer, so an engine module could
   rebind the reference implementation's functions at import time. Restoring a
   pristine file on disk is no defence against a runtime patch, and neither is
   dropping privileges. Fixed architecturally: the engine is now constructed only
   inside a subprocess, so agent code never executes in the process that computes
   ground truth.

Closing the second surfaced a third: a daemonised grandchild inheriting the stdout
pipe deadlocked the harness, and `os._exit(0)` during collection made pytest exit
**zero with no tests run** - so the exit code alone read as success. The verifier
now also requires a report containing exactly the expected number of passing
checks.

---

## 8. What would actually be needed

Honest answers, not consolation.

**The escape that survives the vise is a bounded budget asymmetry.** Agent 2h,
human 8h, with the difficulty coming from serial depth. The constraint set
disallows it as timeout pressure, and disallowing it is what makes the remaining
constraints nearly unsatisfiable. Every other asymmetry was measured shut.

**The unexplored direction** is a mechanism whose graded label is a function of
the economic channel rather than an arrival-order property - the channel every
provenance instantiation successfully confounded and none of them graded. This is
the one place the "confirmed-green measurement" escape might still be real. It
was not reached in the time available.

**What does not work, measured:** planted local bugs; performance budgets
(withholding the bar removes the stopping bell, not the gradient - a blind
annealer with zero structural knowledge beat my hand-built reference plan by
**48×**); completeness-of-a-set (every natural quotient tested was sound, and the
error direction was always toward finer and slower, never coarser and incomplete);
two-sided adversarial defence with a small enumerable adversary space; and any
label that is a provenance property.

---

## 9. Method, and what I would keep

The single most valuable change was to **stop estimating difficulty and start
measuring it**.

| Design | How difficulty was established | Cost |
|---|---|---|
| 1 | full build + harbor trial | ~2.5h + 55m |
| 2 | full build + harbor trial | ~1.5h + 37m |
| 3 | state-space measurement | ~30 min |
| 4 | 3-agent difficulty screen | ~1 hour |
| 5 | mechanical screens, three mechanisms | ~90 min |

`prototype/minitrial/` is the reusable artifact: isolate a minimal version of a
candidate, give fresh agents the spec and interpreter but never the grader, and
score what they write. Three samples in ~25 minutes, against 40–55 minutes for a
single harbor trial that requires the whole task to exist first.

The screening discipline that emerged, in order of cost:

1. **Vise test** (paper, 45 min). Name the chain of shipped evidence by which
   *any* solver determines the answer. If it cannot be written, the task is unfair.
   If it can, that paragraph is the attack path.
2. **Activation audit** (mechanical, hours). Measure how often each structure that
   is supposed to carry the difficulty actually fires. Twice this alone killed a
   design.
3. **Leak audit** (mechanical, hours). Attack the corpus with mutual information,
   value multiplicity, and a five-minute gradient-boosted classifier.
4. **Identifiability check** (mechanical, hours). Demonstrate the labels are
   uniquely determined by shipped facts, and that the plausible wrong answer
   violates a stated invariant.
5. **Agent screen** (~25 min, 3 samples). Only for designs that survive 1–4.

Four of five designs would have been killed at step 1, 2 or 3 - before any code
was written for the task itself.
