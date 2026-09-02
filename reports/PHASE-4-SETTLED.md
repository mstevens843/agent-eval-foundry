# Phase 4 — Settled

**Hand-authored. Not generated.** Dated 2026-09-02.

Predictions were committed in `reports/PHASE-3-PREREGISTRATION.md` before any of this ran. Read that
first if you want to check that nothing here was rationalised after the fact.

> **STATUS: A2 IS STILL RUNNING.** Three of twelve runs had returned a verdict when §1 was written,
> all from one lab. Every number in §1 carries its `n`, and the section says plainly what it does not
> yet support. Nothing else in this report depends on A2.

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

### Outcome 4: the suite decomposes, and the two arms fail on disjoint checks

Four runs in, one lab, and the arms are level on reward — 1 pass and 1 failure each. On reward alone
that reads as outcome 2, "both fail similarly, the withdrawal reverses". **The reward is the wrong
thing to look at.**

| run | arm | reward | failing cells | the check that fired |
|---|---|---|---:|---|
| `a2-control-codex-1` | control | 0.0 | 11 | `audit_explains` |
| `a2-control-codex-2` | control | 1.0 | 0 | — |
| `a2-treatment-codex-1` | treatment | 1.0 | 0 | — |
| `a2-treatment-codex-2` | treatment | 0.0 | 2 | **`executed_iff_called`** |

**The two arms fail on completely disjoint checks.** Not overlapping, not correlated — disjoint. The
control arm's only failing check is `audit_explains`, on the six `revoke-after-ack` scenarios; every
one of its eleven failures is `audit records an illegal transition 'ACKED' -> 'REVOKED'`. The
treatment arm's only failing check is `executed_iff_called`, on `crash-after-tool` and `hostile-mix`:

> `Violation: action r0008 is REVOKED with ever_executed=False but the tool recorded 1 side
> effect(s); an engine may not decide for itself whether the call happened.`

That is **pre-registered outcome 4**, and it was the one the brief called most interesting:

> *treatment removes exactly one axis → the suite decomposes: one axis was spec, one is real.*

Adding one sentence removed the ACKED axis entirely and left a different failure standing — and the
one left standing is the family's founding mechanism. Not a transition-table bookkeeping rule, but
the actual dual obligation the task was built to measure: **an engine confronted with an uncertain
external effect may not decide for itself whether the call happened.** That is a real thing to be
bad at, and it is what remains when the specification defect is removed.

The prediction was close but not exact. It named `cc267-claude-1`'s mode — stranding actions in
`IN_DOUBT` rather than resolving them illegally. What survives is the same axis from the opposite
side: resolving an uncertain action to REVOKED when the tool had in fact executed it. Stranding and
wrongly-resolving are the two ways to fail one dual obligation, which is exactly why it is one axis
and not two.

| | control | treatment |
|---|---|---|
| instances | 24 | 24 |
| instances separating nothing in this bank | 13 | 22 |
| distinct catch sets | 1 | 1 |
| **independent axes** | **1** | **1** |
| checks that ever fired | `audit_explains` | `executed_iff_called` |

Both arms measure width 1 at this `n` because only one subject fails in each. The number that
carries the result is not the width — it is that **the sets are disjoint**.

### What this does and does not settle

**It does not settle it.** Four runs, one lab. The Anthropic arms are still in flight, and three
runs per arm per lab is what the design called for. Specifically:

- Reward-level: both arms 1-of-2. Fisher's exact p = 1.000, which at this `n` means "no data".
- Check-level: disjoint, which is a qualitative result and a strong one, but resting on one failing
  run per arm.

**What it does establish** is that reward is the wrong resolution for this question. Two arms with
identical pass rates are failing at completely different things, and any analysis that stopped at
`reward` would have concluded "no effect" from data that shows a clean decomposition. That is the
same error the whole project is about, one level up: a summary statistic that cannot distinguish two
situations anybody would want distinguished.

### A confound found, and the decision that avoided it

The 2026-08 runs that produced the original `6/6 reward 0` used **codex 0.149.1**. The A2 runs use
**codex 0.152.1**. Same model name, different agent harness.

So any comparison between A2 and the original 6/6 crosses a version boundary and cannot be trusted.
The within-A2 comparison does not, because both arms run 0.152.1.

The pre-registration insisted that the control arm be re-run rather than reused from 2026-08. That
decision was made for a different reason — symmetry — and it is what saved the experiment.

### What the original 6/6 could always have been

Independent of everything above, and worth stating because it was never stated: a run of six failures
with no successes is consistent with a true per-run pass probability as high as **0.39** at the 5%
level, since `(1 − 0.39)^6 ≈ 0.05`. The `6/6 reward 0` headline was always compatible with a task
that frontier models pass roughly a third of the time. It was reported as a property of the task.

### Cost so far

Two runs were killed mid-flight when the machine was shut down: `$17.13` and `$15.07` of real spend,
no verdict, preserved under `runs/a2-*-opus-1/` with a `CRASHED.md` recording the state. They
contribute to no denominator, and they are counted in the cost record, because a plan that prices
only the runs that finished is the same optimistic error as one that prices only the families that
shipped.

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

The original headline counted both as difficulty. Six of the twenty-four scenarios —
`revoke-after-ack-{a..f}` — exist solely to hit the first, and they carry one catch set between them:
one measurement wearing six names, and the measurement was of the author's specification.

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

**Families with surviving cross-lab `capability` evidence: still zero.**

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

## 7. Net code delta

*Pending — Lane G is in flight. This section will carry the exact delta by directory.*

---

## 8. Still open at the time of writing

- **A2**: six of twelve runs complete; the Anthropic arms and the second and third Codex replicates
  are still in flight. Outcome 4 — the axis comparison — is not measurable until the treatment bank
  is complete.
- **Lane B**: the calibration set is being rebuilt at n≥24 positives with *matched* negatives (the
  same mutant failure with and without the SPEC sentence that states its rule), which is a stronger
  design than Phase 3's. Cross-family labelling uses a genuinely different provider.
- **A human labeller**: not available. There is no human in this loop, and the agreement figure this
  phase reports will be model-to-model only. That limitation is not fixable by working harder at it.
