# Phase 3 — pre-registration

**Hand-authored. Written BEFORE any Phase 3 experiment was run.** Dated 2026-09-02.

The point of this file is that an experiment whose interpretation is decided after the result is not
an experiment. Everything below is committed to in advance. Where a later result contradicts it, the
contradiction is the finding and this file is the evidence that it was not rationalised.

---

## 1. The question

> Is this project detecting a real and pervasive defect in adversarial benchmark authoring (H1), or
> has it built a labeller that can call anything underspecified (H2)?

Four flagship results have been withdrawn to the same defect class. Under H1 that is the product.
Under H2 the gate is unfalsifiable and nothing can ever ship. The evidence on disk cannot separate
them, because the labeller has never returned a `capability` verdict that survived scrutiny and has
never been shown a case where `capability` is the known truth.

---

## 2. My position on the boundary rule, committed before A2 and A3

The brief proposes: entailed-by-necessity, where a competent engineer asked "may I write this
transition?" would answer no from the visible text alone, is `capability`; needing to guess an
unstated constant, threshold, tie-break or set membership is `spec-underspecified`.

I was asked to challenge rather than adopt it. I think it is close but that the "competent engineer
would answer no" clause is doing too much work: as written it is unfalsifiable without actually asking
engineers, and it invites the author to substitute their own reading for the profession's. I commit to
a version that is operational rather than hypothetical:

> **A graded requirement is `capability` if and only if the visible text adjudicates between the
> readings that lead to different answers.** Derivability is not enough. If two readings are each
> supported by visible normative text, and no visible text resolves which governs the graded case,
> the requirement is `spec-underspecified` — even when the author believes one reading is obviously
> correct, and even when the requirement is entailed by a rule stated elsewhere.

The difference matters exactly on hard negatives. "Entailed" asks whether a correct chain of reasoning
exists. "Adjudicated" asks whether the text rules out the competing chain. A spec can entail X while
also supporting not-X, and a grader that only checks entailment will call that capability forever.

**Applied to the outbox, in advance of A2:** I take the `spec-underspecified` side, and I would take
it even if the brief's rule were adopted instead, for a reason that is empirical rather than
interpretive. The brief's own test asks what a competent reader would answer from the visible text.
We have that answer on disk, unprompted, from before this dispute existed: `cc267-codex-3` wrote an
explicit legality table into its own verification script and listed `('ACKED','REVOKED')` as
**allowed**; `cc267-codex-1`'s self-written test **asserted** the edge must appear; `cc267-claude-2`
and `cc267-claude-3` both state in their transcripts that §6 requires it. Four of five failing runs
independently wrote their reading down, and it was the same reading.

The competing reading is supported: `SEMANTICS.md:51` draws a diagram with no arrow out of ACKED, and
`db.py:34` calls ACKED "history". The visible text contains both and adjudicates neither. That is the
definition above, satisfied.

**What would change my mind:** A2's treatment arm failing at the same rate as control. If naming the
terminal set explicitly does not fix it, the readings were not the obstacle and I am wrong.

---

## 3. Pre-registered predictions

### A1 — labeller controls

| control class | ground truth | predicted labeller output | falsifier |
|---|---|---|---|
| positive (mutant violating a numbered rule that has a worked example) | `capability` | `capability` | any `spec-underspecified` here is a false positive and counts against H1 |
| negative (load-bearing sentence deleted from SPEC) | `spec-underspecified` | `spec-underspecified` | a `capability` here is a false negative — the gate misses real underspecification |
| hard negative (entailed but nowhere stated as a sentence) | contested by design | split, or `spec-underspecified` | unanimity either way is itself informative |

**Primary metric: false `spec-underspecified` rate on positive controls.**

Committed thresholds, before seeing any result:
- **> 20%** — kill signal 1 fires. The gate is not a measurement, every existing label is suspect
  including the outbox verdict, and fixing the labeller outranks every other work item.
- **5–20%** — the gate is usable but must report its own error rate anywhere it is quoted.
- **< 5%** — the gate is calibrated for positive controls, and H2 is not supported on this evidence.

I predict **< 20%**, and I am not confident. The labellers were selected for suspicion and have only
ever been run on cases that were in fact defective. A high false-positive rate here is a live
possibility and is the single most valuable thing this phase could discover.

### A2 — spec-repair differential

I predict **treatment passes where control fails**, on the `audit_explains` cells specifically, for at
least 4 of 6 treatment runs. Falsifier: both arms failing at similar rates, which reverses the
withdrawal and means the labeller over-triggers.

I do **not** predict the treatment arm passes cleanly. `cc267-claude-1` shows a second, independent
failure mode (`completion`, via actions stranded in `IN_DOUBT`) that naming the terminal set does not
obviously fix and may make more visible. A treatment arm that trades `audit_explains` failures for
`completion` failures is the "treatment fails differently" cell, and I think it is roughly as likely
as the clean result.

### A3 — human ground truth

I predict **both humans answer that an ACKED action may be recorded REVOKED** — i.e. they reproduce
the models' reading — with at least one citing §9 or `instruction.md:17` as licence. Falsifier: both
answering correctly and citing §4's diagram as exhaustive, which would show the rule was derivable and
that the labeller over-triggers regardless of A2.

---

## 4. What I will not do

- I will not treat agreement as accuracy. The outbox agreement of 6/6 = 1.000 is reported as
  agreement only, and is uninterpretable until A1 supplies a confusion matrix.
- I will not reverse a withdrawal without A2, and I will reverse it if A2 says so.
- I will not manufacture a positive. If Phase 3 ends with zero surviving cross-lab `capability`
  trials, the report says zero, and says that the project's result is a method for detecting the
  absence of a hard family rather than a hard family.
