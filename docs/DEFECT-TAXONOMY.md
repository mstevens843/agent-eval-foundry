# Defect taxonomy and screens

**Read with `INHERITED-EVIDENCE.md`.** That document says what is worth building. This one says how a
build goes wrong and which screen catches it.

Every class below was found at least once in this repository or the source project, by measurement
rather than by reasoning. Each carries its instances, because a class with no instance is a
hypothesis.

---

## Part 1 — the classes

### A. Specification classes

These concern the visible text. This repository's instrument has historically been pointed almost
entirely here.

#### A1. Underspecified

The visible text does not determine the answer. A reader must supply an assumption.

*Verdict:* defect. Withdraw the claim, repair the text.

*Detection:* the vise test (Part 2, screen 1). If the evidence chain cannot be written, the answer is
not determined.

#### A2. Derivable but demanding — **the interior**

The text determines the answer, but only by cross-referencing and careful reading. Most readers miss
it.

*Verdict:* **legitimate difficulty. This is what a hard task is made of.** See
`INHERITED-EVIDENCE.md` §8: the one task that cleared 6/6 did so because self-checking required
building a checker complete enough to state the rule, and most engines never did.

*Detection:* a derivation exists, cites only in-package text, and survives an adversarial reader
trying to break it. Profile it — see Part 3.

> **An instrument without this category withdraws everything.** This repository collapsed A2 into A1
> for five phases, withdrew four families, and then killed a fifth that had been written specifically
> to survive the screen. A screen with no pass band is indistinguishable from a broken screen.

#### A3. Explicit

The answer is stated outright in one sentence.

*Verdict:* fair, but it grades reading comprehension. p ≥ 0.85 per the calibration table.

#### A4. Enumeration falsified by adjacent text

A list that reads as exhaustive, which the surrounding prose proves is not.

*Shape:* a state-transition block that omits an outgoing edge, where the paragraph immediately
following introduces a state absent from the block. Read alone, "this state has no outgoing arrow"
can no longer be relied on to mean "this state is terminal."

*Verdict:* **the shape alone does not settle the class.** Check for an independent derivation route
that does not depend on the enumeration being complete. If one exists, the rule is A2 and the
enumeration weakness is cosmetic; only if none exists is it A1.

*The worked instance, and a correction this document previously got wrong.* The source project's
terminal-`ACKED` rule has this shape, and an earlier version of this file filed it as tending toward
A1. **That was wrong on the record and it is corrected here**, because getting the classification
backwards on the one task that cleared the bar would invert the lesson:

- The rule **is** derivable without touching the diagram. §6 gives the single post-execution
  withdrawal path as `EXECUTED -> REVOKED`; §9 forbids recording a transition that did not occur; an
  already-`ACKED` action cannot satisfy §6 without violating §9. Two citations, two sections, depth 1,
  **no negative inference** — squarely inside the Part 3 pass band.
- The source project raised this concern during development, audited it, and concluded before
  shipping that the rule was already stated and no spec change was needed. That conclusion was
  restated at completion and **never retracted in the submitted artifact.** The shipped specification
  carries no literal "terminal" sentence and does not need one.
- The explicit sentence exists only in a later experimental copy built *by this repository* a week
  after the submission was complete, as one arm of a spec-repair differential. It is a measurement
  instrument, not a correction to the task.

*Why the differential result does not contradict this.* Adding the explicit sentence removed the bulk
of failures on that axis. That is true of **any** derivable rule made explicit — moving a rule from A2
to A3 always reduces failures, which is why A3 grades reading comprehension. A single-sentence
differential measures how much work the derivation was doing. **It cannot distinguish "I supplied
missing information" from "I made derivable information obvious,"** and reading it as the former is
the specific error corrected here.

*Detection:* for every list that carries a rule, ask whether anything else in the document adds a
member — then look for a route that does not depend on the list at all. A load-bearing **negative
inference** is fragile; an independent positive derivation makes the enumeration's completeness
irrelevant.

*Detection:* for every list that carries a rule, ask whether anything else in the document adds a
member. A load-bearing **negative inference** — depending on something *not* being present — is
always fragile.

---

### B. Verifier classes

These concern the grader, not the text. **This repository has no screen for any of them**, and three
of its most expensive findings live here.

#### B1. Stated but unenforced — **the most common one, and unnamed until now**

The rule is correctly stated in the visible text. No check catches its violation. An agent that
ignores it passes.

Three independent instances:

| instance | what happened |
|---|---|
| an append-only journal requirement | an engine that deleted entries and recomputed still passed every final-state check |
| a gap-ordering rule | applying events above a gap self-healed, so no end-state check ever saw it |
| a required periodic call | nothing required making the call, so an agent doing nothing satisfied every rule and passed |

**The cause is diagnosable and general: end-state checks cannot catch transient violations.** A rule
about *how* you got somewhere is invisible to a check on *where you ended up*.

*Detection:* for every stated rule, write a subject that violates it and confirm some check fails. If
none does, the rule is decoration. This is cheap and mechanical and nothing here does it.

#### B6. The rig returns a verdict it has no basis for — **found inside our own instrument**

The measuring apparatus reads the wrong key, or an absent one, and evaluates the resulting empty
structure as a *result* rather than as a *failure to measure*. The output is confident, correctly
formatted, and unrelated to the subject.

The instance, and it is ours:

| instance | what happened |
|---|---|
| Phase 9's independent-fatality rig | ground truth was attached as `result["tool"]`; the checks read `result["_tool"]`, whose accessor returns `result.get("_tool") or {}`. Every tool-dependent check ran against `{}` and scored it as a failing subject. **A known-correct reference engine appeared to fail all 18 instances**, and that number reached a report draft. |

**Nothing flagged it.** It was caught because a correct engine failing everywhere is not a believable
result — by disbelief, not by any gate. Disbelief does not scale and does not survive a tired author.

This is the same family as B1 and B5: machinery that returns a verdict without the evidence to
support one. It is the most dangerous member of the family because it sits *upstream* of every other
screen — a broken rig invalidates whatever it was used to measure, including the screens themselves.

*Detection, in three parts and all of them cheap:*

1. **Controls in the same invocation.** A known-good must pass and a known-bad must fail before any
   output counts. If either comes back inverted the run is VOID — not "the subject is bad". This
   alone would have caught the instance above in seconds.
2. **Degeneracy is suspicious by construction.** All-pass and all-fail are the shape a broken rig
   produces. They are permitted only when the controls ran in the same invocation and held. Note that
   Phase 9's *real* result was also all-fail-against-the-mutant; the controls are the only thing that
   distinguishes it from the fiction.
3. **An empty input is not a failing input.** A check handed a structure that is absent, empty, or the
   wrong shape must raise, never return a verdict.

Implemented in `src/screens/rig-integrity.ts`, with the near-miss replayed as a test.

*Repair pattern:* deliver the input in phases with a barrier, snapshot the graded structure between
phases, and require earlier entries to survive unchanged. Or add a structural check on the discipline
itself rather than on its end state.

#### B2. Package leak

The visible package contains the answer.

*Instance:* a "starter stub" that was a near-verbatim port of the hidden decision procedure,
including an undocumented threshold. Graded through the real verifier it failed nothing. The trial
measured whether the agent would break a working starter.

*Detection:* grade every family's shipped starter through its own verifier. It must fail widely. This
repository now has that gate; it was added after the fact.

#### B3. Verifier bypass

The grader can be satisfied without doing the work.

Instances from the source project's verifier audit, each found **by running the attack**, not by
asking a model whether it found one:

| bypass | mechanism |
|---|---|
| no-op scoring full marks | an engine that never touched the external tool passed every check |
| ground-truth rebinding | the grader imported the agent's code into the process computing the expected answer, so the agent could rebind the oracle at import time |
| instrumentation bypass | an engine that opened its own connection reported zero instrumented operations, so no fault was ever injected and the bypass check stayed silent |

Two lessons worth more than the list:

- **Restoring a pristine file on disk is no defence against a runtime patch.** The fix for
  ground-truth rebinding was architectural: the agent's code no longer executes in the process that
  computes ground truth.
- **Hardening is not monotonic.** In the source project's own words: *"I removed a false-positive
  risk and introduced a false-negative."* Every fix needs its own regression oracle, kept and re-run.

*Detection:* a verifier audit is **a set of adversarial engines run against the real grader**. At
minimum: a no-op, a ground-truth-rewriter, and a status-only faker. A model asked to self-report
whether it found a bypass, with no verifier available to it, is not evidence.

#### B4. Non-independent defect

A planted defect that is redundant with another, or not independently fatal.

*Instance:* one of six planted defects was undetectable in isolation — the suite passed with it alone
present, because its effect self-healed (see B1).

*Detection:* run each defect alone against the full suite. Every one must be independently fatal. The
existing "mutants caught by intended check" gate is weaker and does not ask this.

#### B5. Never-firing check

A check that no subject in the measured set ever triggers, or a knob that never changes the expected
answer.

*Instances:* a 267-check suite where nine of eleven check types never fired against any subject; a
family where nine of fourteen knobs never moved the expected label, verified exhaustively; and from
the source project, two mechanisms measured at **0.0000% activation** — one where corpora generated
with wildly different parameters were byte-identical.

*Detection:* the activation audit (Part 2, screen 2). A check that never fires is not a check.

---

### C. Harness and environment classes

#### C1. Harness contract violation

The runner breaks a promise the visible package makes.

*Instance:* a package stating that a facade object persists across sessions, while both the host and
the runner constructed a new one per session. Submissions that trusted the published contract and
scoped state to that object lost it at every boundary. **The models that failed were the ones that
believed the documentation.**

*Detection:* for every promise the package makes about the runtime, assert it in a test against the
actual runner. Include host scripts in whatever hash gates evidence, so a harness change invalidates
trials the way a verifier change does.

#### C2. State that exists only on the author's machine

Green locally, red anywhere else. Three instances here:

| instance | mechanism |
|---|---|
| empty directories | git cannot store them, so a fresh clone lacked them and every package-backed family read a different readiness verdict |
| staging permissions | `mkdtempSync` creates 0700; a container forced to a fixed uid could not traverse its own bind mount, and node reported it as a missing module |
| a test guard | it checked that a daemon answered rather than that a container could start, so the tests were red while their assertions were never evaluated |

*Detection:* run every gate from a clean checkout in a temp directory, as a different uid, and diff
the verdicts. Anything that differs is a claim resting on one machine.

---

## Part 2 — the screens, in cost order

Ported from the source project's `FINDINGS.md` §9, with three added from this repository's own
findings. The source project's measured result:

> **"Four of five designs would have been killed at step 1, 2 or 3 — before any code was written for
> the task itself."**

This repository built only screen 5. That is why a full specification and four independent readers
were spent on a family that a 45-minute paper screen would have killed.

| # | screen | cost | catches |
|---|---|---|---|
| 1 | **Vise test** — name the chain of shipped evidence by which any solver determines the answer | 45 min, paper | A1, A4 |
| 2 | **Activation audit** — measure how often each structure that carries the difficulty actually fires | mechanical, hours | B5 |
| 3 | **Leak audit** — attack the corpus with mutual information, value multiplicity, and a five-minute gradient-boosted classifier | mechanical, hours | B2, and labels recoverable from visible data |
| 4 | **Identifiability check** — labels uniquely determined by shipped facts, and the plausible wrong answer violates a *stated* invariant | mechanical, hours | A1, private-convention grading |
| 5 | **Agent screen** — 3 samples, spec and interpreter but never the grader | ~25 min | residual difficulty |
| **6** | **Enforcement screen** — for every stated rule, a subject that violates it must fail some check | mechanical, cheap | **B1** |
| **7** | **Starter screen** — grade the shipped starter through its own verifier; it must fail widely | mechanical, minutes | **B2** |
| **8** | **Independent-fatality screen** — each planted defect alone must be fatal | mechanical | **B4** |
| **9** | **Rig-integrity gate** — a known-good must pass and a known-bad must fail *in the same invocation* before any rig output counts | mechanical, seconds | **B6** |

Screens 6–8 are additions. Screen 6 is the most valuable of the three because B1 has now appeared
three times independently and nothing looks for it.

If the chain in screen 1 **can** be written, that paragraph is not just a fairness certificate — it
is the attack path. Read it as the agent's plan.

---

## Part 3 — the derivation profile

Screen 1 should not return a binary. Record, per rule:

| property | meaning |
|---|---|
| citation count | distinct sentences the derivation needs |
| section span | separate sections cross-referenced |
| inference depth | steps between cited text and conclusion |
| negative-inference flag | whether it depends on something *not* being stated |

| profile | class | verdict |
|---|---|---|
| chain cannot be written | A1 | unfair — withdraw |
| 1 citation, 1 section, depth 1 | A3 | explicit — p ≥ 0.85, not worth building |
| 2–3 citations, ≤2 sections, depth ≤2, no negative inference | **A2** | **demanding and fair — the interior** |
| 4+ citations, or 3+ sections, or load-bearing negative inference | A2/A4 | fragile — repair before shipping |

Bands are provisional and should be revised once there is data on both sides of them. The point of
the dial is that it **has a pass band**; a screen that only rejects cannot be distinguished from a
broken one.

---

## Part 4 — labelling discipline

Any classification here is an input to a gate, so the gate's beneficiary must not produce it.

- The labeller does not run the trial, and does not know what verdict the label unlocks.
- It sees the visible package, the submission, the verifier output and the transcript. Not the ship
  gate, not the campaign hypothesis, not the other labels.
- Labels are written to disk **before** the verdict is computed.
- Two independent labellers, **from different provider families**, for any label that unlocks a
  claim. Agreement is reported as a number.
- Every label carries a falsifier: what would have to be true for it to be wrong.

**A calibration warning, learned expensively here.** Labeller agreement measured on *constructed*
controls was near-perfect and agreement on *real* cases was near-zero. Constructed controls are
cleanly A1 or A3; real cases are A2, where the boundary is genuinely contested. **Calibrate against
mechanical ground truth** — a single-sentence specification repair whose before/after check counts
are measured — not against controls you wrote.
