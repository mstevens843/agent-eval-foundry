# The spec-only probe

**Does your hidden grader require anything your visible specification never says?**

You can run this against your own benchmark. It imports nothing from the rest of this repository.

---

## The problem

You write a specification for the subject, and separately a verifier that decides whether the subject
passed. The two drift. The verifier grades a rule the specification never states, every frontier
model fails it, and the failure rate looks like difficulty.

It is not difficulty. It is your own underspecification — and **you cannot tell the difference from
the results**, because a genuinely hard task and an unstated rule produce the same thing: correlated
frontier failure that looks like signal.

Four flagship results in this project were withdrawn to exactly that defect. Not one was caught by
failure rate. Every one was visible in a mechanical comparison of the grader against the prose,
before a single model ran.

---

## What it does

Reads your hidden decision code, extracts the concrete commitments the grading depends on, and asks
for each one whether the visible package states it. Deterministic: no model, no network, and it never
executes the code it reads. Same inputs, same findings — which is what lets it block a build.

| detector | catches | the defect it generalises |
|---|---|---|
| `unstated-threshold` | a graded decision turning on a number no visible file prints | "sufficient in-window evidence", quantity stated nowhere |
| `unstated-set-membership` | membership in a literal set the specification never enumerates | the rule is published; the eight values it ranges over are not |
| `unstated-transition` | a terminal state or edge the transition table enforces and the prose omits | `ACKED: set()` in the verifier; nothing visible says ACKED is terminal |
| `unstated-precedence` | rules applied first-match-wins in an order nothing fixes | two rules both apply; which one you are graded under is invisible |
| `unstated-mandatory-call` | a call the grader requires — or forbids — that the prose only permits | "the subject **may** observe current state", graded as must |

---

## Use it

```ts
import { probe, directoryTarget, renderProbeReport } from "./spec-probe/index.js";

const target = directoryTarget(
  "my-task",
  "path/to/hidden",   // the verifier, the truth function — anything that decides the score
  "path/to/visible",  // the spec, README, starter, worked examples — anything the subject can read
);

const result = probe(target);
console.log(renderProbeReport(result));
```

`ProbeFile` is `{ path, source, language }` with language `"ts" | "py" | "text"`, so you can also
build a target in memory from strings if your files do not live on disk.

**When in doubt, call a file visible.** The question is always "could the subject have known?" A file
wrongly called hidden costs you one false positive. A file wrongly called visible silently clears a
real defect.

---

## Read the output correctly

**Precision is low, and that is the design.** A false positive costs one read. A false negative costs
you a phase, and it costs it silently. Every finding therefore prints the hidden line beside the
closest visible text, so dismissing it is as cheap as acting on it.

Three things in the output are worth knowing about:

- **`contradiction`** — visible text that points the *other way*. Strictly worse than silence: the
  subject was entitled to rely on that sentence, and your grader punishes it for doing so. If a
  finding has one, read that finding first.
- **`cleared`** — commitments found stated. If `cleared` is 0 **and** findings are 0, the probe
  extracted nothing and the report says so loudly. That is a broken invocation, not a clean package.
  It is the failure mode that looks like success.
- **severity** — `high` means the grading fails a subject for something the visible text never says
  or says the opposite of. Those are the withdrawal-grade ones.

---

## What it is validated on

Honest accounting, because a screen nobody has scored is an opinion.

**The discrimination test — the one that matters.** Two arms of a real task, identical except for one
sentence added to the specification:

| arm | probe | verdict |
|---|---|---|
| control (sentence absent) | flags `ACKED is terminal`, high | correct |
| treatment (sentence present) | silent on it | correct |

and the *only* difference between the two arms' findings is that one flag. Nothing else moved. This
is `test/spec-probe.test.ts`, run against the live task directories, not a fixture.

**Then the same two arms were run as a paid experiment.** The probe's flag is the sentence the
experiment manipulates, so the experiment is a direct test of whether the flag was worth raising.
Same model, same lab, same version:

| run | arm | reward | failures |
|---|---|---|---|
| 1 | control | **0.0** | 11, every one `audit records an illegal transition 'ACKED' -> 'REVOKED'` |
| 2 | control | **1.0** | none — 267 of 267 |
| 3 | treatment | **1.0** | none — 267 of 267 |

Read the second row before drawing a conclusion from the first. The control arm does **not** fail
reliably: one run inferred the terminal set from the visible text and one did not, and the difference
is a single SQL clause in each submission — `WHERE state <> REVOKED` (includes ACKED, fails) versus
`WHERE state IN ('READY','LEASED','IN_DOUBT','EXECUTED')` (excludes ACKED, passes).

That is the useful lesson, and it is not "the probe found a fatal defect". It is that the flagged
sentence marks a place where two competent readings of the same specification lead to opposite
answers. A subject's score there depends on which reading it took. That is worth knowing before you
publish a failure rate as difficulty — which is exactly what a screen is for, and exactly as far as a
screen's evidence goes.

**Precision on a portfolio sweep: zero, and reported as such.** Run over eight built families it
produced 23 findings. All 23 went to independent adversarial reviewers instructed to refute them,
defaulting to false-positive, and **all 23 were refuted**. Measured precision on that portfolio: 0.

The adjudicator was calibrated before its verdicts were believed — handed the control arm above,
whose defect is independently established, it returned REAL_DEFECT. It is not a rubber stamp.

Nine of the 23 were not judgement calls but **bugs in this probe**, and the adjudication is what
exposed them. All nine are fixed:

| bug | effect |
|---|---|
| rule codes read out of a keyed lookup table as if source order were evaluation order | 6 findings |
| constants read out of scenario generators and build-time self-gates, neither of which grades a subject | 4 findings |
| a disjunction of two acceptable methods reported as two separate mandatory calls | 2 merged to 1 |
| a call mandated *indirectly* — "the audit must carry facts observed from the current authority" entails observing — read as unstated | 5 findings |

After the fixes the same sweep produces **9 findings**, with no loss of recall on the discrimination
test above. Precision on this portfolio is still 0.

Both results are true and not in tension. The probe finds real defects — demonstrated experimentally
— and it also produces noise on packages that are in fact well specified. Treat it as a screen that
costs a few minutes of reading against a build measured in weeks, and never as a verdict.

**Known weaknesses**, measured rather than guessed:

- Thresholds of 0 and 1 are ignored. They are overwhelmingly structural (`length > 0`), and including
  them buried the real findings. A genuine "at least one" requirement will be missed.
- Clearing is generous: a value mentioned *anywhere* visible clears the commitment, with no
  requirement that the mention be in the relevant section. This throws away real defects on purpose.
- `unstated-precedence` is the noisiest detector and is capped at `low` severity.
- A commitment expressed in a shape the lexer does not recognise is not extracted, and an
  unextracted commitment is invisible. Check `cleared` to see how much it actually read.

---

## Design notes, if you are extending it

- **Hidden code is comment-stripped; visible text is not.** A comment in the verifier proves the
  author knew the rule and says nothing about whether the subject could. A comment in a file the
  subject can read *is* visible text — in the case above, a SQL comment was the most load-bearing
  sentence in the whole package, because it contradicted the hidden table.
- **The lexer is lexical, not a parser**, so one code path reads TypeScript and Python. The cases
  this was validated against are half of each, and a tool that only reads its author's favourite
  language is a tool nobody else can run.
- **`unstated-transition` requires closure**: a mapping is a state machine only if its values are
  also its keys. Without that test it matched every scenario knob space in the repository and
  produced 129 findings, all noise. A screen that flags everything blocks nothing.
- **`unstated-mandatory-call` resolves polarity** — does the grader punish the call's absence or its
  presence? Assuming absence was wrong about a third of the time, including on a family whose whole
  purpose is to catch a subject that *does* call the model. An inverted finding in a report meant to
  block builds is worse than no finding.
