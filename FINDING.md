# Failure rate cannot tell you whether your benchmark is hard

*A write-up for someone who does not know this repository. Nothing below assumes you have read
anything else here. Dated 2026-09-02.*

---

## The problem

You are building an agentic benchmark. You write a specification the model can read, and separately a
verifier that decides whether the model passed. You run frontier models. They all fail.

That result feels like the finish line. It is not even a measurement, because **a genuinely hard task
and an underspecified one produce exactly the same evidence**: frontier models failing in correlated
ways, on the same scenarios, for reasons that look like a shared capability gap. Correlated failure is
what difficulty looks like. It is also what an unstated rule looks like. The failure rate cannot
separate them, and neither can any statistic computed from it.

The author is the worst-placed person to notice, because the rule is in their head. It reads as
obvious to them, so its absence from the specification is invisible to them, and every model that
fails on it confirms what they already believe.

---

## The evidence: four flagship results, all withdrawn, all mine

This project built a portfolio of agentic task families and ran frontier models against them. Its
best results were:

| result | what it looked like | what it was |
|---|---|---|
| `durable-approval-outbox` | 6 of 6 frontier runs, two labs, reward 0 | the graded rule — a state is terminal — existed **only in the hidden verifier** |
| `deployment-model-alias-rollout-drift` | counted cross-lab failure, provider-delta diagnosis | the shipped starter **passed its own suite** |
| `checker-required-memory-poisoning` | rule M6 violated by every subject | M6 named "a record marked as carrying a secret"; the write contract had **no field to mark one** |
| `access-token` / `delegated-wallet` lineage | a family and its descendant | both starters were **complete passing solutions** |

Four for four. Not one was detected by failure rate; each was found by reading the grader against the
prose. One was found **against the author's own written brief**, which asserted that the rule was
stated three times in visible text. It was not, and two blind labellers found that independently
before the author re-checked.

That is the observation this document exists to generalise. It is not a claim that these tasks were
badly made. It is a claim that **the defect is invisible from the results**, and the results are what
everybody looks at.

---

## The instrument

Four failures in one direction is an anecdote. The rest of this is the attempt to turn it into
something with an error bar.

### 1. A gate that refuses to treat failure as difficulty

The core move is small and it is the whole thing: **a counted failure is not difficulty evidence
until somebody has said why it failed**, from a closed vocabulary, and nobody may label their own
trials.

    capability                  the subject was not good enough
    spec-underspecified         the subject could not have known
    spec-contradiction          the visible text says the opposite
    harness-contract-violation  the harness broke its own published contract
    package-leak                the package gave away the answer
    unlabelled                  nobody has read it yet

`unlabelled` is a state with a name, and it blocks. That single design choice is what turned four
flagship results from evidence into questions.

### 2. The boundary rule, committed in advance

Everything turns on where `capability` ends. The rule was written down **before** the experiment that
tested it:

> A graded requirement is `capability` **if and only if the visible text ADJUDICATES between the
> readings that lead to different answers.** Derivability is not enough. If two readings are each
> supported by visible normative text, and nothing visible resolves which governs the graded case,
> the requirement is `spec-underspecified` — even when the author believes one reading is obviously
> correct, and even when the requirement is entailed by a rule stated elsewhere.

The alternative — "a competent engineer would have inferred it" — is unfalsifiable without asking
engineers, and in practice it lets the author substitute their own reading for the profession's.
Adjudication is checkable by reading the package, which is the only artifact the subject had.

### 3. Controls, because an instrument that has only ever returned one answer has not been shown to work

The obvious objection: this gate has never returned `capability`, so maybe it can call anything
underspecified. That objection was tested against constructed cases with known ground truth — a
submission with one injected defect violating a rule the specification states in a numbered sentence
(truth: `capability`), and the same specification with one load-bearing sentence deleted (truth:
`spec-underspecified`) — shuffled, blinded, and given to two labellers.

**The result went the other way.** Zero false `spec-underspecified` on stated-rule violations. The
measured error is the *opposite* one: the labellers **miss** genuine underspecification and default
to `capability`, in one to two cases out of four.

This matters more than it sounds. It means the four withdrawals survived an instrument tilted
*against* them. That is much harder to dismiss than a clean call from a suspicious gate.

### 4. A pre-build probe, so the defect is caught before the money

The labelling gate works after the fact. The cheaper move is to catch the defect before a single
model runs, by mechanically cross-referencing the hidden grader against the visible prose and flagging
every commitment the grading depends on that the specification never states — a threshold, a set
membership, a transition, a precedence order, a required call.

Deterministic. No model, no network, and it never executes the code it reads. It runs in seconds
against a build measured in weeks.

---

## What actually happened when it was tested

This is the part that is usually not published.

### The probe works on the case with an experimental answer

Two arms of the outbox task were built, **identical except for one sentence** added to the visible
specification: *"`ACKED` and `REVOKED` are terminal: neither has an outgoing transition."*

The probe flags the arm without the sentence and clears the arm with it, and that flag is the **only**
difference between the two arms' findings. It named, before any model ran, the exact sentence the
experiment was designed to manipulate.

An independent adversarial reviewer — instructed to refute, defaulting to false-positive — was given
both arms blind. It returned **REAL_DEFECT** on the control arm and **FALSE_POSITIVE** on the
treatment arm. Two for two, in both directions.

### And its precision on a real portfolio is zero

Swept across all eight built families, the probe produced 23 findings. The same adversarial reviewer
refuted **all 23**. Every one had visible text stating the rule.

Both of those are true. The probe finds the real thing and it also produces a great deal of noise.
Measured precision on that portfolio: **0**.

Nine of the 23 were not judgement calls but bugs in the probe, which the adversarial pass exposed:
rule codes read out of a lookup table as though source order were evaluation order; constants read
out of scenario generators that grade nobody; a disjunction of two acceptable methods reported as two
separate requirements; a call the specification mandates *indirectly* — "the audit must carry facts
observed from the current authority" entails observing — read as unstated. After fixing them the same
sweep produces 9 findings, with no loss on the case that has an experimental answer.

**And one previously published finding did not survive.** An earlier phase of this project reported
three live defects the probe had found. One of them — a family said to grade an unstated mandatory
call — is refuted by its own specification, which requires an audit event for *every decision*
carrying facts "from the current authority". That claim is withdrawn.

### The experiment then complicated the story rather than confirming it

Both arms were run as a paid controlled experiment. The first matched pair looked decisive: control
**0.0**, treatment **1.0**, one sentence apart, same model and same lab.

The second control run scored **1.0**. And a treatment run scored **0.0**.

On reward the arms look similar, which reads as "no effect". **Reward is the wrong resolution.** At
three runs per arm across both labs, the check that fires is *disjoint*:

| | control (n=3) | treatment (n=3) |
|---|---|---|
| `audit_explains` — the ACKED rule | **17 failures, 2 of 3 subjects** | **0** |
| `executed_iff_called` | 0 | 2 |
| `completion` | 0 | 1 |

One sentence took the ACKED failures from seventeen to **zero**, in both labs, with no residue. What
survives is the mechanism the task was actually built around — what an agent does with an external
effect whose outcome it cannot observe — and it shows up from both sides of that one obligation:
resolving an uncertain action wrongly (`executed_iff_called`), and refusing to resolve it at all
(`completion`).

So the task was measuring two things and calling them one. One was real. One was the author's
specification, and six of the twenty-four scenarios existed only to hit it.

An analysis that stopped at the pass rate would have concluded "no effect" from data showing a clean
decomposition — the same error this whole document is about, one level up.

The control arm also does not fail reliably, and the difference between its two runs is one SQL
clause:

```sql
-- failed: includes ACKED, writes the forbidden ACKED -> REVOKED audit row
WHERE state <> 'REVOKED'
-- passed: excludes ACKED
WHERE state IN ('READY','LEASED','IN_DOUBT','EXECUTED')
```

Same model, same visible text, opposite readings. The rule is derivable — one run derived it — and it
is not adjudicated, so which reading a competent implementation takes is close to a coin flip. A
benchmark whose reward depends on which of two defensible readings a subject happened to take is not
measuring capability on that axis.

The reviewer's reading of the control arm explains the split, and it is worse than silence: the
visible specification **actively supports the losing reading**, in the document it declares "normative
and complete". It scopes the post-execution withdrawal rule by *when the call happened* rather than by
state, and an already-acknowledged action's call has happened. The instruction says such an action is
"recorded as having done both" — which is precisely the audit entry the grader rejects. The one
diagram that would settle it is disclaimed as non-exhaustive two lines below itself.

That is not an omission a careful reader would notice. It is an instruction the reader is entitled to
follow and is then failed for following.

---

## Two numbers that generalise to any suite

**1. A 6-of-6 failure is weak evidence.** If every one of six independent runs fails, the true
per-run pass rate can still be as high as **0.39** at the 5% level, since `(1 − 0.39)^6 ≈ 0.05`. A
"6/6 reward 0" headline is compatible with a task frontier models pass a third of the time. This
project reported one as a property of the task.

**2. Count how many of your checks have ever fired.** The suite behind that 6/6 has 267 check
executions over 11 distinct checks. Against the six real frontier agents that failed it, **two checks
ever fired**. Nine never fired at all. It was not measuring eleven things and finding two problems; it
was measuring two things, nine times over.

The statistic inverts depending on who you point it at:

| subjects | checks that ever fired |
|---|---|
| the author's own deliberately-broken mutants | **56–100%** |
| real frontier agents | **18%** |

Mutants exercise a suite by construction — each is written to trip a named check — which is exactly
why "my verifier catches all N of my mutants" feels like coverage evidence and is not. Real subjects
fail in a narrow correlated band, and the checks outside that band have never been exercised by
anything but the author's imagination.

Both numbers cost nothing. Neither requires this repository. Most suite owners have never computed
either.

---

## What survived

Stated small, because that is the point.

**Task families with capability evidence that survived scrutiny: zero.**

Not "few". None. Every family that produced a headline result either had its result withdrawn, or has
never had a counted trial adjudicated under the blind protocol.

What the project has instead is the instrument, and the fact that the instrument was pointed at its
author's own best work first.

---

## Limits, stated because they are the reason to believe the rest

- **Small n, everywhere.** The control-set calibration was 7 positives and 4 negatives; a 0% false
  positive rate on 7 cases has a 95% upper bound near 35%. The honest claim is "no evidence of
  over-calling", not "over-calling is rare". A larger, better-matched control set is in progress.
- **Both labellers share a model family.** That measures whether the *standard* is applied
  consistently, not whether a different intelligence would agree. A cross-family labeller is in
  progress. **There is no human labeller.** Not one. Every agreement figure this project reports is
  model-to-model, and no amount of additional work by the author fixes that.
- **The taxonomy has a seam.** `spec-underspecified` and `spec-contradiction` are adjacent and
  labellers split on cases between them. They carry different repairs — fix the sentence versus add
  one — so both labels are kept, but every gate treats them identically and accuracy is scored over
  the union.
- **A version confound was found in the flagship experiment.** The original 6/6 ran one agent CLI
  version; the controlled re-run uses a later one. Nothing here can be compared against the original
  result. The experiment survived only because its design insisted on re-running the control arm
  rather than reusing the old one — a decision made for a different reason.
- **The probe's precision on a well-specified portfolio is zero.** It is a screen, not a judge, and
  it should be run as one.
- **The instrument's bias is toward `capability`, and that is why the withdrawals are credible.** An
  instrument that erred toward calling things underspecified would make every withdrawal here
  suspect. This one errs the other way and withdrew them anyway. That is a reason to believe the
  withdrawals, not a reason to doubt them.

---

## The transferable claim

> **The dominant failure mode in adversarial benchmark authoring is not that tasks are too easy. It
> is that their difficulty is the author's own underspecification, and the author cannot tell from
> the results.**

If you are building one of these, three things cost you almost nothing and would have caught all four
of the failures above:

1. **Cross-reference your grader against your prose** before you spend on models. Every commitment
   the grading turns on — every threshold, set, transition, ordering, required call — should appear
   in text the subject can read. Expect noise; read it anyway.
2. **Refuse to count a failure as difficulty until somebody says why**, and do not let that somebody
   be the person who wrote the task.
3. **Count how many of your checks have ever fired against a real subject.** One line. If the answer
   is two of eleven, your check count is a fact about your verifier, not about your benchmark.

Nobody publishes the middle step — the part where you go looking for reasons to distrust your own
best result, and find them. That is what this is.
