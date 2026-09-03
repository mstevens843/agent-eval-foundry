# Phase 4 — Settled

**Hand-authored. Not generated.** Dated 2026-09-02.

Predictions were committed in `reports/PHASE-3-PREREGISTRATION.md` before any of this ran. Read that
first if you want to check that nothing here was rationalised after the fact.

> **A2 IS COMPLETE.** Twelve valid runs, six per arm, three per lab per arm. Two further runs were
> killed by a machine shutdown and one by a network failure; all three are preserved, annotated, and
> excluded from every denominator.

---

## 1. The A2 result

### What was run

Two arms of `durable-approval-outbox`, differing by **one sentence**:

```diff
+`ACKED` and `REVOKED` are terminal: neither has an outgoing transition.
```

added to `environment/app/spec/SEMANTICS.md`, the agent-visible specification. The control arm is
**byte-identical to the original task** apart from its name — verified by `diff -r`. Both arms were
built as fresh copies so neither is privileged as "the original", and the task-name change applies
equally to both, so it cannot explain a difference between them.

Free validation before any spend: oracle 1.0 on both arms, nop 0.0 on treatment. The third is the one
that matters — without it, a treatment arm that passes could just mean the verifier was broken.

### The finding that matters most, and it is not the headline

**The control arm does not fail reliably.** Two control runs from the same lab, same model, same
version, on identical inputs:

| run | reward | tests | what its `withdraw` selected |
|---|---|---|---|
| `a2-control-codex-1` | **0.0** | 256/267 | `WHERE state <> REVOKED` — **includes ACKED** |
| `a2-control-codex-2` | **1.0** | 267/267 | `WHERE state IN ('READY','LEASED','IN_DOUBT','EXECUTED')` — **excludes ACKED** |

One inferred the terminal set correctly from the visible text. One did not, and wrote
`ACKED -> REVOKED` into the audit, which is exactly the graded violation: all eleven of its failures
are `Violation: audit for <id> records an illegal transition 'ACKED' -> 'REVOKED'`, on the six
`revoke-after-ack-{a..f}` scenarios.

That is what "derivable but not adjudicated" looks like when you catch it in the act. The rule can be
inferred. It is also not hard to miss. Both readings are reachable from the same specification, which
is the condition the boundary rule calls `spec-underspecified` — and it is now observed rather than
argued.

### The result, at full n

**A2 is complete: 6 valid runs per arm, 3 per lab per arm, as designed.**

| run | arm | lab | reward | cells failed | check(s) that fired |
|---|---|---|---|---:|---|
| `a2-control-opus-1b` | control | Anthropic | 0.0 | 6 | `audit_explains` |
| `a2-control-opus-2b` | control | Anthropic | 0.0 | 11 | `audit_explains` |
| `a2-control-opus-3` | control | Anthropic | 0.0 | 9 | `audit_explains`, `executed_iff_called` |
| `a2-control-codex-1` | control | OpenAI | 0.0 | 11 | `audit_explains` |
| `a2-control-codex-2` | control | OpenAI | 1.0 | 0 | — |
| `a2-control-codex-3` | control | OpenAI | 1.0 | 0 | — |
| `a2-treatment-opus-1b` | treatment | Anthropic | 0.0 | 1 | `completion` |
| `a2-treatment-opus-2` | treatment | Anthropic | 0.0 | 2 | `executed_iff_called` |
| `a2-treatment-opus-3` | treatment | Anthropic | 1.0 | 0 | — |
| `a2-treatment-codex-1` | treatment | OpenAI | 1.0 | 0 | — |
| `a2-treatment-codex-2` | treatment | OpenAI | 0.0 | 2 | `executed_iff_called` |
| `a2-treatment-codex-3` | treatment | OpenAI | 1.0 | 0 | — |

#### Reward barely moves

| condition | n | passed | rate |
|---|---:|---:|---:|
| control | 6 | 2 | **0.33** |
| treatment | 6 | 3 | **0.50** |
| control / OpenAI | 3 | 2 | 0.67 |
| treatment / OpenAI | 3 | 2 | **0.67 — identical** |

Fisher's exact, two-tailed: **p = 1.000**. At n=6 per arm this test has almost no power, so that is
"not enough data", not "no effect". **On reward, this experiment is inconclusive and would have been
inconclusive at any n this budget could buy.**

#### The check level is not inconclusive at all

| | control (6 subjects) | treatment (6 subjects) |
|---|---|---|
| `audit_explains` — the ACKED rule | **33 cells, 4 of 6 subjects** | **0 cells, 0 subjects** |
| `executed_iff_called` | 4 cells, 1 subject | 4 cells, 2 subjects |
| `completion` | 0 | 1 cell, 1 subject |
| **total failing cells** | **37** | **5** |
| instances that separate nothing | 9 of 24 | **21 of 24** |
| distinct catch sets | 6 | 2 |
| independent axes | 2 | 2 |
| axis width vs null-model mean | 2 vs 4.7 | 2 vs 2.8 |
| checks that never fired | 9 of 11 | 9 of 11 |

**33 of the control arm's 37 failing cells — 89% — are the specification defect.** One sentence takes
that to zero across a complete six-subject, 144-cell bank spanning both labs. The suite goes from 15
discriminating instances to 3.

What survives is one mechanism seen from both sides, which is why it is one axis and not two:

- `executed_iff_called` — *"an engine may not decide for itself whether the call happened"* — resolving
  an uncertain action wrongly.
- `completion` — stranding actions rather than resolving them.

The pre-registration predicted the surviving mode would be `cc267-claude-1`'s — stranding `IN_DOUBT`
rather than resolving it illegally — and `a2-treatment-opus-1b` failed exactly there.

#### Where the pre-registered statistic did NOT do what I predicted

Outcome 4 was worded as *"treatment removes exactly one axis"*, to be tested by comparing axis width
between arms. **The width is 2 in both arms. On its own stated test, outcome 4 did not fire.**

That is a miss in the instrument, not in the effect, and the distinction is checkable rather than
convenient:

- The control arm's two axes are the ACKED defect and the uncertainty mechanism.
- The treatment arm's two axes are the *two sides of the uncertainty mechanism*, which land on
  different subjects and are therefore incomparable catch sets, so the meter counts them separately.

Antichain width counts incomparable catch sets. It cannot know that "stranded it" and "resolved it
wrongly" are one obligation, and at six subjects one failure per subject is enough to split them. The
width is measuring which subject failed as much as what the suite measures.

Everything that *did* move moved hard: failing cells 37 → 5, distinct catch sets 6 → 2, discriminating
instances 15 → 3, and the defect check 33 → 0. **I should have pre-registered the check-firing
comparison rather than the width**, and I am recording that I did not rather than quietly reporting
the statistic that worked.

Both widths sit below their null-model means (2 against 4.7, and 2 against 2.8), so neither arm's
compression is an artifact of bank size.

#### Two version confounds, recorded

- The 2026-08 runs behind the original `6/6` used **codex 0.149.1**; A2 used **0.152.1**. Nothing here
  is comparable to that result. The pre-registration's insistence on re-running the control arm rather
  than reusing the 2026-08 controls is what saved the experiment.
- Within A2, one run drifted: `a2-control-opus-2b` ran **claude-code 2.1.259** where the other five
  Anthropic runs ran **2.1.258**. It is a patch release and it is on the control arm, which had the
  lower pass rate — so it cannot manufacture the effect reported here. Recorded because a confound
  found later reads as a confound concealed.

### One run excluded, and why it matters more than it looks

`a2-control-opus-2` returned reward 0.0 and **244 of 267** — by far the worst score in the
experiment, and on the control arm, where a bad score is what the hypothesis predicts.

It is excluded. Its `result.json` carries `exception_info.exception_type: NetworkConnectionError`,
and the agent produced **1,012 output tokens at a cost of $0.41**, against $13–$22 and tens of
thousands of tokens for every other Opus run here. The harness cut it off and the verifier then
graded whatever partial engine was on disk.

Counting it would have been quietly disastrous. Its 23 spurious failures fire **four checks the
control arm otherwise never fires** — `exactly_once`, `expected_executions`, `revocation_ordering`
and `executed_iff_called`. The clean disjointness in the table above would have become
`audit_explains` **plus four of the treatment arm's own checks**, and the decomposition result would
have dissolved into noise, in the direction that flatters the original hypothesis.

It is excluded **mechanically, on `exception_info`, never on cost** — otherwise "this run looks
wrong" becomes a judgement made case by case in the direction the author prefers. It is preserved
with an `INFRA.md` beside it, and `a2-control-opus-2b` replaces it.

This is the project's own thesis at one level down: a harness failure that produced a plausible bad
score on the arm where a bad score was expected. Nothing about the number itself would have given it
away. The cost line did.

### What this settles and what it does not

**Settled**: the ACKED-terminal axis is a specification defect. One sentence removes it completely,
in both labs, with no residue. It was counted as difficulty for a month and it was not difficulty.

**Settled**: the family measures something real underneath it. Failures survive the repair, and they
are the mechanism the task was built around.

**Not settled**: how hard that real thing is. Three of six treatment subjects failed it, but on 5
cells out of 288 graded. A signal that thin is a signal; it is not a difficulty measurement, and no
`n` this budget could buy would have made it one.

**Not settled**: whether the surviving failures are themselves `capability`. They have not been
through the blind protocol. On this project's own rules that makes them `unlabelled`, and
`unlabelled` blocks.

### What the original 6/6 could always have been

Independent of everything above, and worth stating because it was never stated: a run of six failures
with no successes is consistent with a true per-run pass probability as high as **0.39** at the 5%
level, since `(1 − 0.39)^6 ≈ 0.05`. The `6/6 reward 0` headline was always compatible with a task
that frontier models pass roughly a third of the time. It was reported as a property of the task.

### Cost, complete

| | runs | spend |
|---|---:|---:|
| counted, control | 6 | $64.12 |
| counted, treatment | 6 | $56.08 |
| **counted total** | **12** | **$120.20** |
| crashed — machine shut down mid-flight | 2 | $32.20 |
| infra — `NetworkConnectionError` | 1 | $0.41 |
| **total spent** | **15** | **$152.81** |

The three excluded runs cost **$32.61 and produced nothing**, which is 21% of the spend. They are in
the cost record and in no denominator, because a plan that prices only the runs that finished is the
same optimistic error as one that prices only the families that shipped. The free oracle and nop
validations that gated all of this cost $0.

Against the pre-registered estimate of roughly $110 for twelve runs, the actual counted spend was
$120.20 — within 10%. Including the losses it was $152.81, which is the number a plan should carry.
---

## 2. The outbox verdict: decomposed, not withdrawn and not restored

**The family measures one real thing, and the `6/6 reward 0` figure was inflated by a second thing
that was never a capability at all.**

That is a smaller claim than the original and a better one, because it is the first claim this
project has made about the outbox that an experiment produced rather than an argument.

- **The ACKED-terminal axis is a specification defect.** It is not adjudicated by the visible text —
  which points the other way, three times, in the document declared "normative and complete" — and
  adding one sentence removes it from the failure set entirely.
- **The exactly-once-under-uncertainty axis is real.** It survives the repair, it is the mechanism
  the family was built around, and failing it requires deciding for yourself whether an uncertain
  external call happened, which is a genuine thing to be bad at.

The original headline counted both as difficulty. **89% of the control arm's failing cells are the
specification defect** — 33 of 37, across four of six subjects and both labs — and one sentence takes
that to zero. Six of the twenty-four scenarios, `revoke-after-ack-{a..f}`, exist solely to hit it, and
they carry one catch set between them: one measurement wearing six names, and the measurement was of
the author's specification.

The residue is small and it is real. Five failing cells survive the repair, on three of six subjects,
in both labs.

On the ACKED axis specifically, the original argument was that the rule was unstated and therefore
unknowable. The observation is sharper and less flattering: the rule is *knowable* — one control run
derived it — and it is *not adjudicated*, so whether a given competent implementation gets it right
is close to a coin flip. A benchmark whose reward depends on which of two defensible readings a
subject happened to take is not measuring capability on that axis. It is measuring which way the coin
came up.

The adjudicator's read of the control arm explains the 50/50 split, and it is stronger than anything
Phase 3 had, because **the visible normative text actively supports the losing reading**:

- `SEMANTICS.md:86-89` scopes the post-crossing withdrawal rule by *when the call happened*, not by
  state: "If revocation lands after the tool call has already happened, the side effect stands and
  the action is recorded as `EXECUTED` then `REVOKED`." An ACKED action's call has already happened.
- `instruction.md:17`: "An action that already reached the tool and is revoked afterwards is recorded
  as having done both." Reads directly onto the ACKED case, and yields the exact audit entry the
  grader rejects.
- `SEMANTICS.md:83`: "`revoke(key)` revokes the action for key" — unqualified by state.
- The §4 diagram cannot supply the missing rule, because `SEMANTICS.md:56-58` **disclaims it as
  non-exhaustive**, and six of the grader's thirteen permitted edges appear nowhere in it. An engine
  that inferred "not drawn means illegal" would have to reject five transitions the grader requires.
- The nearest thing to an adjudicator, `db.py:33-34` — "Terminal actions (EXECUTED, ACKED, REVOKED)
  are history and do not block a successor" — defines *terminal* as "does not block a successor",
  which is a different property, and lists **EXECUTED**, which the hidden table gives two successors.
  It cannot settle ACKED without settling EXECUTED wrongly.

This is not silence. It is a specification that points the other way, three times, in the document it
declares "normative and complete". That is the worst case for a subject: not an omission it might
notice, but an instruction it is entitled to follow and is then failed for following.

`cc267-claude-1` remains the trial to watch and is still `unlabelled`. It failed on the *opposite*
side of the constraint — stranding actions in `IN_DOUBT` rather than resolving them illegally — which
is the signature of a genuine dual obligation. If the treatment arm still fails in its mode, that is
the one axis this family really does measure. That question needs the Anthropic treatment runs, which
are still in flight.

---

## 3. The spec-only probe, rebuilt and measured

Phase 3's probe lived in a scratch directory and did not survive the machine being restarted. Only
its reported numbers survived, in `reports/PHASE-3-CALIBRATION.md`. It has been rebuilt **in the
repository** as `src/spec-probe/`, which is where it should have been: Phase 3's own report flagged
that it was "mostly scratchpad, not repo", and that debt came due immediately.

**The rebuilt probe is a different instrument. Phase 3's numbers do not transfer to it and are not
claimed for it.** Everything below is measured on the rebuild.

### It catches the thing it was built to catch

The discrimination test, run against the live A2 task directories rather than a fixture:

| arm | probe | correct? |
|---|---|---|
| control (sentence absent) | flags `ACKED is terminal`, high severity | yes |
| treatment (sentence present) | silent on it | yes |

and the **only** difference between the two arms' finding sets is that one flag. Nothing else moved.

The probe flagged, before the experiment ran, the exact sentence whose absence produced eleven
`ACKED -> REVOKED` violations and whose presence produced 267/267. That is the strongest evidence
available that this class of finding is real and consequential.

### Its precision on this portfolio is zero, and that is the honest number

Swept over all eight built families, the first version produced **23 findings**. All 23 were handed
to independent adversarial reviewers instructed to refute them, defaulting to false-positive. **All
23 were refuted.**

Before believing that, the adjudicator was calibrated on a **two-sided control** — the two A2 arms,
whose answers are known because one of them was constructed by adding the sentence:

| case | truth | adjudicator |
|---|---|---|
| control arm — `ACKED is terminal` absent | real defect | **REAL_DEFECT**, high |
| treatment arm — the sentence present | correctly stated | **FALSE_POSITIVE** |

2/2, in both directions. An instrument that only ever refutes is worthless; this one confirms a
defect when there is one and clears it when it has been repaired. The 23/23 refutation is therefore
credible rather than an artifact of the "default to false-positive" instruction.

So both of these are true: the probe finds real defects, and on well-specified packages it produces
noise at a high rate.

### Nine of the 23 were bugs in the probe, and are fixed

The adjudication was worth more than its verdicts. Nine findings were not judgement calls at all:

| bug | findings killed |
|---|---|
| rule codes read out of a **keyed lookup table** as if source order were evaluation order | 6 |
| constants read out of **scenario generators** and **build-time self-gates**, neither of which grades a subject | 4 |
| a **disjunction** of two acceptable methods reported as two separate mandatory calls | merged 2 → 1 |
| a call the specification mandates **indirectly** — "the audit must carry facts observed from the current authority" entails observing — read as unstated | 5 |

After the fixes the sweep produces **9 findings** across eight families, down from 23, with no loss of
recall on the one case with experimental ground truth. `access-token-scope-expansion`, which Phase 3
named as a live defect, now clears — and Phase 3 was wrong about it: `SPEC.md:57` requires an audit
event for **every decision** carrying facts "from the current authority", which adjudicates the case
Phase 3 said was unadjudicated.

**Correction to `reports/PHASE-3-CALIBRATION.md` §4:** of the "three live defects nobody had
recorded", the access-token one does not survive adversarial review. That claim is withdrawn.

### Kill signal 4 does not fire

> *If the portfolio probe sweep flags three or more families with unrepaired defects, then
> underspecification is systemic in this author's work rather than incidental.*

Zero families carry a defect that survived adversarial review. Underspecification in this portfolio
was **concentrated in the results already withdrawn**, not spread through the built families. That is
the opposite of what the brief expected, and it is a point in the portfolio's favour.

---

## 4. The gate

The brief asked for a blocking probe gate. **A blocking gate is indefensible here and was not built.**
With measured precision of zero on this portfolio, it would have blocked all eight families on noise,
and a gate that blocks everything gets switched off — which is worse than no gate, because the
repository still claims one.

What `src/spec-probe/gate.ts` blocks on instead is **silence**: a family may not count a trial while
carrying a high-severity finding that nobody has written a reason about. Accepting a finding is
allowed; ignoring one is not.

The gate can fail, and its tests prove it fails in the four ways that matter:

- a family whose adjudications are removed **blocks**
- a reason too short to have said anything (`< 80` chars) **does not clear** a finding
- recording a finding as a **real defect does not clear the gate** — the repair has to land
- an adjudication with no matching finding is reported as **stale**

Ten adjudications are on file in `data/probe-adjudications.json`, each with the reviewer's reasoning
and the file:line evidence it read.

### The sweep implicated the only surviving `capability` trials, and then cleared them

Lane C4 asks: if the probe flags a rule that a counted trial failed on, that trial's `capability`
label is in question. It did, and the coincidence is uncomfortable enough to state.

The only three trials in this repository still labelled `capability` are `ui-claude-1`, `ui-claude-2`
(on `ui-action-record-replay`) and `live-dom-2026-08-o2` (on its descendant). Those are **exactly the
two families the post-fix sweep still flags**: `ui-action-record-replay` on `query` and
`confirmationPresent`, `ui-replay-live-dom` on `queryAnchor`, `advanced=false` and `dlg`.

All five findings were adjudicated **false positive**, with the specification quoted — for instance
`ui-action-record-replay`'s `SPEC.md:7`, which states `R1_SELECTOR_RESOLVED_LIVE` normatively as a
numbered rule. So the labels are not in question on this evidence.

They remain in question for a different reason, unchanged since Phase 3: **none of the three has ever
been re-labelled under the blind protocol.** They carry `capability` because somebody wrote it, not
because two independent readers agreed. That is the open item, and no amount of probe work closes it.

### A live hole in the flagship gate, found and closed

Lane B3 asked whether `spec-underspecified` and `spec-contradiction` are treated identically by every
gate. **They are** — verified at all 17 sites — and for a good reason: every consumer routes through
the exported sets `FAILURE_ATTRIBUTING` and `DIFFICULTY_EVIDENCE_CAUSES` rather than comparing label
strings, so downstream the two are literally indistinguishable. Nothing enforced that, so
`test/label-parity.test.ts` now pins it. A future gate written as
`if (label === "spec-underspecified")` would have split them silently.

Looking for that turned up something worse. `parsePromotion` gated a `difficulty-evidenced` claim on
`countedAgentTrials > 0` — on a trial **existing**, not on anybody having read it. That is exactly the
predicate the root-cause layer was written to eliminate, surviving in the one validator the
root-cause layer never reached.

Five of this repository's counted outbox trials are root-caused `spec-underspecified`. Under that
check alone they would have carried a `difficulty-evidenced` promotion — the precise claim the last
two phases spent their time withdrawing.

The hole was **latent**: all three promotions on disk claim `local-evidence` with zero counted
trials, so nothing had walked through it yet. It is now closed. `PromotionEvidence` carries
`capabilityLabelledTrials`, a difficulty claim requires it to be non-zero, and the field defaults to
zero so a promotion written before it existed cannot claim difficulty by omission — silence is not
evidence. New rule code: `PROMOTION_DIFFICULTY_UNATTRIBUTED`.

---

## 4b. The calibration, rebuilt — and why its perfect score is a warning

Phase 3 calibrated on 7 positives and 4 negatives, and the artifacts were lost. The rebuild is
larger and better matched: **61 cases, 39 positives and 22 negatives**, across five families, built
so that a positive and its negative are the SAME mutant failing the SAME check with the SAME verifier
message — differing only in whether the specification still states the rule that governs it. Family,
behaviour, failing checks and counts are held constant, which the earlier set did not do.

Three blind labellers: two same-family working from opposite ends (submission-first, spec-first), and
one **cross-family** — the case text passed to a locally installed OpenAI CLI, with the harnessing
agent forbidden from substituting its own judgement.

| | positives n=39 | negatives n=22 |
|---|---|---|
| labeller 1 — submission-first | 39 correct, **0 false spec-defect** | 22 correct, 0 missed |
| labeller 2 — spec-first | 39 correct, **0 false spec-defect** | 22 correct, 0 missed |
| labeller 3 — **cross-family** | 39 correct, **0 false spec-defect** | 20 correct, **2 missed** |

**Primary metric — false `spec-underspecified` rate on positive controls: 0/39 = 0.0%, all three
labellers.** Kill signal 1 (>20%) does not fire, and now with room: the 95% upper bound falls from
Phase 3's ~35% on n=7 to **7.7%** on n=39.

**Agreement, three ways:**

| pair | exact | class-collapsed |
|---|---|---|
| within-family (1 vs 2) | **61/61 = 1.000** | 1.000 |
| cross-family (1 vs 3) | **59/61 = 0.967** | 0.967 |
| cross-family (2 vs 3) | 59/61 = 0.967 | 0.967 |

**Kill signal 3 does not fire.** Cross-family agreement is 0.967, far above the 0.7 floor. The
standard is not model-specific — a different provider applies it and reaches the same answer 59 times
in 61. That was the single biggest open doubt about every label in this repository, and it is closed.

### Why I do not believe the 0% at face value

A perfect score on 61 cases from two labellers, agreeing 61/61 exactly, is a red flag rather than a
result. The likeliest explanation is a **ceiling effect: the controls are easier than the defect they
stand in for.**

The constructor's own accounting says so. The brief asked for negatives differing by one sentence.
Only **2 of 22** managed that. Nine needed the rule row plus its restatements in Legal and Illegal
Outcomes; **three needed a whole section removed** — the Audit Contract twice. A specification with
its entire Audit Contract missing is conspicuously incomplete, and noticing that is a much easier
task than the one this instrument actually faces.

The real outbox defect is subtler than anything in this set: a general constraint *is* published, and
the closed set it implies is simply never enumerated. Nothing is missing that looks missing. So

> **0/39 measures "can the labeller notice a specification with a hole in it". It does not measure
> "can the labeller notice a closed set that was never written down". Those are different tasks and
> the second one is the job.**

The one piece of evidence about the harder boundary is the cross-family labeller's two misses, and
they are informative: **both are `ui-replay-live-dom`, and both are cases the constructor itself
flagged as its weakest.** Format descriptions were deliberately retained — `settle()`'s
`advanced`/`remaining` stayed in the facade, `regionState().present` stayed — and the cross-family
labeller reconstructed the rule from the API shape and the surviving prose.

Which means those two may not be errors at all. If a reader can reconstruct the rule from text that
is still visible, the visible text arguably *does* adjudicate, and the key is wrong rather than the
labeller. That is the taxonomy seam showing up exactly where the construction was weakest, and it is
the honest place to point anybody who wants to attack these numbers.

### What is still not fixed

**There is no human labeller.** Not one, in any phase. Every agreement figure this project reports is
model-to-model. The cross-family result narrows that gap — it is no longer one model family talking
to itself — but "two different model families agree" is not "a human would agree", and no amount of
further work by this author closes it.

---

## 5. What is demonstrated

**Families with surviving cross-lab `capability` evidence: still zero — but the outbox is now the
closest thing to it this project has.**

After the repair, five failing cells survive across three of six subjects in both labs, on one
mechanism: what an engine does with an external effect whose outcome it cannot observe. That is a
real thing to be bad at, it is the thing the family was built to measure, and it is the first
difficulty signal here that survived a controlled single-sentence spec repair.

It is **not** `capability` evidence yet, and calling it that would be the same move this project
spent three phases undoing. Nobody has adjudicated those five cells under the blind protocol. On this
repository's own rules they are `unlabelled`, and `unlabelled` blocks. The honest sentence is:

> One family has a surviving failure mode that a controlled spec repair did not remove, at one
> measured axis, across two labs, on 5 of 288 graded cells. It has not been root-caused, so it is not
> yet difficulty evidence.

That is much smaller than `6/6 reward 0`. It is also the first version of the claim that an
experiment produced rather than an argument.

The check-firing statistic, added to the axis meter this phase, sharpens the coverage argument more
than expected:

| suite | subjects | checks declared | checks that ever fired |
|---|---|---:|---:|
| durable-approval-outbox | 6 **real frontier agents** | 11 | **2** |
| eight built families | **mutants** | 9–27 | 56–100% |

The same class of suite fires most of its checks against deliberately-broken mutants and almost none
against real agents. Mutants exercise a suite; real agents do not. So "my suite has N checks and
catches M mutants" says nothing about what it measures against the subjects anyone cares about — and
that is a diagnostic any suite owner can run in one line, on their own data, today.

### Kill signal 5 does not fire, and the number that matters is the compression

> *If the deliverable exporter cannot produce more than two genuinely distinct instances for any
> family, the family unit does not amortise authoring cost the way the whole thesis assumes.*

This is answerable without building the exporter, because "genuinely distinct instances" is exactly
what the axis meter already counts. Two instances failed by the same set of subjects are one
measurement wearing two names, whatever the knobs say.

| family | declared space | scenarios graded | distinct catch sets | independent axes |
|---|---:|---:|---:|---:|
| `deployment-model-alias-rollout-drift` | 663,552 | 339 | 72 | **20** |
| `delegated-wallet-scope-reconciliation` | 82,944 | 804 | 9 | **3** |
| `ui-replay-live-dom` | 3,456 | 864 | 56 | **19** |
| `checker-required-memory-poisoning` | 2,376 | 792 | 30 | **12** |
| `access-token-scope-expansion` | 1,152 | 384 | 6 | **3** |
| `prompt-injection-memory-poisoning` | 864 | 288 | 17 | **5** |
| `ui-action-record-replay` | 648 | 324 | 12 | **6** |
| `prompt-injection-containment` | 384 | 128 | 7 | **4** |
| | | | | **72 total** |

**Every family produces more than two.** The minimum is 6 distinct catch sets and 3 axes. The family
unit does amortise, and the kill signal does not fire.

The interesting number is the other one. `delegated-wallet-scope-reconciliation` declares a behaviour
space of **82,944** and yields **9 distinct measurements** — a compression of roughly 9,000×.
`deployment-model-alias-rollout-drift` declares 663,552 and yields 72. A declared space is a
statement about how many instances you *could* generate. It is not a statement about how many
different things they measure, and the two differ by three to four orders of magnitude.

**These figures are upper bounds and are measured generously.** They come from each family's own
*mutant* bank, and mutants are written to trip named checks, so they exercise a suite far more
completely than real subjects do (§5: 56–100% check firing against mutants, 18% against real
agents). The one family with a real-agent bank measures **2** axes, against 3 from its mutant bank.
The budget model has been repriced to 2 for that reason, not to the 9-per-family the table above
would flatter it with.

---

## 6. Corrections to earlier phases

Stated here rather than edited into the earlier reports, because a report that changes under you is
not evidence.

1. **Phase 3 §4** claimed `access-token-scope-expansion` grades an unstated mandatory facade call.
   **Withdrawn** — `SPEC.md:57` and `:61-62` adjudicate it (§3 above).
2. **Phase 3 §4's probe numbers** (3/3 recall, 48% precision, 2/2 discrimination) describe an
   instrument that no longer exists. They are not claimed for the rebuild, whose own numbers are in
   §3 and are worse on precision.
3. **The A2 headline reported mid-run from the first matched pair was premature.** One control run
   failing and one treatment run passing looked decisive; the second control run passed. Recorded
   because the sequence is the point: a matched pair is not an experiment.

---

## 7. Net code delta — the rule was not met

**Net lines of code ROSE by 1,419.** The phase rule said they must fall. Stating it first because a
rule reported at the bottom of a long document is a rule being managed rather than kept.

| area | added | removed | net |
|---|---:|---:|---:|
| `src/` | 2,547 | 1,862 | **+685** |
| `test/` | 875 | 141 | **+734** |
| **code total** | | | **+1,419** |
| `reports/` | 1,071 | 604 | +467 |
| `data/` | 523 | 0 | +523 |

Largest additions and removals in `src/`:

| | lines |
|---|---:|
| `src/spec-probe/` (new module, 8 files + README) | **+1,681** |
| `src/foundry/probe-runner.ts` (pruned) | −844 |
| `src/adversarial-audit/bundles.ts` (self-graded run path) | −301 |
| `src/foundry/discovery-calibration.ts` (deleted) | −262 |
| `src/adversarial-audit/container.ts` | −131 |

### Why, and what is still owed

The deletion that would have made this negative is `src/foundry/probe-runner.ts` in full — 1,838
lines remaining, plus its 157-line renderer and 328-line test. The brief sanctions it explicitly:
the mechanism probe is superseded by the spec-only probe. **It was pruned, not retired.**

It was not retired because **the evidence rule forbids it**, and that is a better reason than the
one I first reached for. `assertPromotionsValid` in `src/foundry/promotion.ts` requires every
promotion's `sourceProbeId` to resolve to a **live** probe result, and requires the recorded
`sourceProbeVerdict` to equal the verdict the probe produces when it is actually run. Delete the
probe and three checked-in promotion records plus a lineage record stop validating — so retiring
`probe-runner.ts` means editing `data/promotions.json` and `data/lineages.json`, which are preserved
evidence.

That is a genuine conflict between two of this phase's rules, not an excuse. "Net lines must fall"
and "preserve, never delete evidence" point in opposite directions here, and the evidence rule wins.
Retiring the probe properly means first migrating those records to a form that does not require a
live probe execution to validate — which is real work, and is the debt.

One probe was also kept that four data records do not require. `provider-failover-router-alias-drift`
(309 lines) supplies the probe-evidence block in
`reports/deployment-model-alias-rollout-drift-evolution-options.md`. Deleting it does not blank that
section — it makes the report print *"has not been matched to an executable probe result yet. Status:
proposal-only"*, which is false: the probe existed and promoted. **A report becoming less true to
save 309 lines is not a saving.**

One further honest note: an automated pass at deleting the 17 genuinely unreferenced exports was
attempted and **reverted**. The brace-matching over-consumed and took adjacent code with it, which
`tsc` caught within seconds. Roughly 150 lines — not worth a hand-audit at this point, and not worth
an unreliable script at any point.

For the record on who added what: the deletion lane itself removed **2,156 lines** and was net
negative. The phase is net positive because the same window added `src/spec-probe/` (2,034), its
tests (898), two data files of preserved evidence (523) and the secret scanner (275).

**What the accounting actually shows**, and it is the part worth keeping: the replacement is smaller
than the thing it replaces. `src/spec-probe/` is 1,681 lines including its README and does a job the
2,682-line `probe-runner.ts` was doing badly — the new one is validated against known ground truth
and can fail; the old one has returned `promote_to_task_shape` on every probe it has ever run. The
net rose because the old one is still there.

**Owed, and it is a real debt rather than a deferral:** migrate the promotion and lineage records off
live-probe validation, then retire `probe-runner.ts`, its renderer and its test (≈2,300 lines). That
alone takes the phase to roughly −900 on code. The migration is the hard half and it is the half
that keeps the evidence intact.

---

## 8. Still open

- **The five surviving failures need blind adjudication.** They are the whole remaining question
  about this family, and this phase did not answer it. `cc267-claude-1` — the trial that failed on
  the *opposite* side of the constraint — should be read alongside them.
- **The three `capability` trials have still never been re-labelled blind.** Unchanged since Phase 3.
  They carry that label because somebody wrote it, not because two independent readers agreed.
- **The calibration's perfect score is a ceiling effect** (§4b). The controls are easier than the
  defect they stand in for; only 2 of 22 negatives were one-sentence deletions. A harder control set
  is the next real measurement.
- **There is no human labeller.** Not in any phase. Every agreement figure here is model-to-model.
  The cross-family result narrows the gap and does not close it.
- **Net lines rose by 1,419** (§7). Retiring `probe-runner.ts` requires first migrating promotion and
  lineage records off live-probe validation, because two phase rules conflict and the evidence rule
  wins.
- **The deliverable exporter was not built.** Kill signal 5 was answered by measurement instead
  (§5) — every family yields more than two genuinely distinct instances — but no exporter emits them.
- **A3 — human ground truth on the ACKED question — was never run**, by the operator's instruction,
  pending two engineers. It is the one experiment that would settle whether the terminal set is
  derivable by a competent reader who is not a language model.
