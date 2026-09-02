# Phase 3 — Calibration

**Hand-authored. Not generated.** Predictions were committed to `reports/PHASE-3-PREREGISTRATION.md`
before any experiment ran; read that first if you want to check that nothing here was rationalised
after the fact. Dated 2026-09-02.

---

## 1. Is the instrument calibrated?

**Yes, and it errs in the opposite direction from the one we feared.**

Fourteen cases with known ground truth — 7 positive controls (a real agent submission with one
injected defect that violates a rule the visible SPEC states in a numbered sentence, four of them with
a worked example), 4 negative controls (one load-bearing sentence deleted from the SPEC, so the truth
is known because it was removed), and 3 hard negatives (entailed but nowhere stated) — shuffled, with
neutral ids, mixed so no labeller could tell a control from a case. Two labellers, blind, one working
submission-first and one spec-first.

### The confusion matrix

| | truth `capability` (7) | truth `spec-underspecified` (4) | contested (3) |
|---|---|---|---|
| **labeller 1** | 7 correct, **0 false `spec-underspecified`** | 2 correct, 1 called `spec-contradiction`, **1 missed → `capability`** | 2 `capability`, 1 `spec-underspecified` |
| **labeller 2** | 7 correct, **0 false `spec-underspecified`** | 1 correct, 1 called `spec-contradiction`, **2 missed → `capability`** | 2 `capability`, 1 `spec-underspecified` |

**Primary metric — false `spec-underspecified` rate on positive controls: 0/7 = 0.0%, both labellers.**

Kill signal 1 (>20%) **does not fire.** It is not close.

Inter-labeller agreement on the control set: **13/14 = 0.929** (the single disagreement is `case-08`,
a negative control).

### H1 versus H2, in one sentence

> **H2 is refuted on this evidence: the labeller does not call everything underspecified. It called
> every one of seven stated-rule violations `capability`, and its actual error mode is the opposite —
> it MISSES underspecification, defaulting to `capability`, in 1 of 4 cases for the better labeller
> and 2 of 4 for the worse.**

That asymmetry is the most important number in this phase, and it cuts in a direction nobody
predicted. An instrument biased *toward* `capability` still called the outbox `spec-underspecified`.
The withdrawal is therefore harder to dismiss as an artifact of a suspicious gate, not easier.

### The caveats, stated plainly

- **Sensitivity is the weak side, and it is weak.** Counting any spec-defect label as detection,
  labeller 1 found 3 of 4 removed sentences and labeller 2 found 2 of 4. A gate that misses a quarter
  to a half of real underspecification is not a safety net; it is a partial filter. Anywhere a
  `capability` verdict is quoted, that miss rate belongs beside it.
- **`case-03` exposes a taxonomy seam, not a calibration failure.** Both labellers said
  `spec-contradiction` where the key said `spec-underspecified`. Deleting a threshold left surrounding
  prose that reads as asserting the opposite, so both readings are defensible. The two labels are
  adjacent, both are spec defects, and neither is `capability`. I count this as a boundary problem in
  the vocabulary rather than an error.
- **n is small.** 7 positives and 4 negatives. A 0% false-positive rate on 7 cases has a 95% upper
  bound near 35%; the honest claim is "no evidence of over-calling", not "proven rare".
- **The labellers are the same model family that produced the labels under test.** This measures
  whether the *standard* is applied consistently, not whether a different intelligence would agree.

---

## 2. The outbox verdict: strongly supported, not yet settled

The withdrawal **stands**, and it is better supported than when Phase 2 made it. But it is not
"settled", because the decisive experiment has not run.

Evidence for `spec-underspecified` now on record:

1. **The graded rule exists only in the hidden verifier.** `tests/invariants.py:161` has `ACKED: set()`.
   An exhaustive grep of the agent-visible tree finds ACKED in five places and **none** states it is
   terminal. Visible text points the other way: `instruction.md:17` "recorded as having done both";
   `SEMANTICS.md:135-136` "the audit trail must carry both facts"; `SEMANTICS.md:87-89` instantiates
   the post-execution case naming **EXECUTED** only.
2. **Four of five failing runs wrote their reading down, independently.** `cc267-codex-3` put
   `('ACKED','REVOKED')` in an **ALLOWED** legality table inside its own checker. `cc267-codex-1`'s
   self-written test **asserted** the edge must appear. `cc267-claude-2` and `-3` both cite §6 in
   transcript. This is the brief's own test for `capability` — what a competent reader answers from
   the visible text — answered unprompted, before this dispute existed, four times, the same way.
3. **A labeller biased toward `capability` still said `spec-underspecified`** (§1).
4. **The deterministic probe independently flagged it** (§4), with evidence stronger than expected:
   the only visible statement of terminality is a SQL comment in `db.py` listing EXECUTED as terminal,
   which the hidden table contradicts by giving EXECUTED successors.

**What is still missing: A2.** The spec-repair differential — two arms differing by one sentence — is
prepared but unrun. It is the only thing that can distinguish "the sentence was the task" from "the
rule was derivable and five models were careless". Until it runs, this is a well-supported inference,
not a measurement.

---

## 3. The boundary rule

Committed before the results, and it survived them.

> **A graded requirement is `capability` if and only if the visible text ADJUDICATES between the
> readings that lead to different answers.** Derivability is not enough. If two readings are each
> supported by visible normative text and nothing visible resolves which governs the graded case, the
> requirement is `spec-underspecified` — even when one reading seems obviously correct.

Why this and not "a competent engineer would answer no from the visible text": that test is
unfalsifiable without asking engineers, and it lets the author substitute their own reading for the
profession's. Adjudication is checkable by reading the package.

**Worked examples on the `capability` side** (all seven positive controls; two shown):
- `DWS8_NO_DUPLICATE_SPEND` — "A wallet spend effect for the same idempotency key may execute at most
  once across repeated attempts", published as a rule code, restated at SPEC:108-109, with a worked
  example. A submission that double-spends has no competing reading to appeal to.
- `ATS3_SCOPE_MUST_MATCH_APPROVAL` — "requested scope, current token scope and current approval scope
  must match exactly", plus an Illegal Outcomes entry naming "treating broader token scope as
  sufficient". Stated, exemplified, and the failure mode named.

**Worked examples on the `spec-underspecified` side** (the four withdrawals):
- **outbox**: the constraint "the audit accounts for every transition, with none that did not occur"
  is published; the *terminal set it implies* is not. General rule stated, closed set unstated.
- **deployment-alias**: "sufficient in-window evidence", with the quantity in no numeral anywhere.
- **memory-poisoning**: rule M6 speaks of "a record marked as carrying a secret" while the write
  contract had no field to mark one.
- **access-token/wallet**: not underspecification at all — a package leak, a different defect that the
  starter-must-fail gate catches. Included to mark the boundary.

**The hard-negative finding.** Both labellers agreed on all three contested cases, and split them:
`case-06` (an unenumerated permitted-field set on an issued grant — the closest structural twin of the
outbox ACKED case) went `spec-underspecified`; `case-02` and `case-11` went `capability`. The pattern
is consistent with the rule: where the visible text ordered the rules or stated the tie-break in domain
words, they called capability; where only a general constraint was published and the closed set it
implied was not, they called underspecification.

This rule belongs in `docs/TASK-FAMILY-MODEL.md` with these examples. That is queued, not done.

---

## 4. The spec-only probe (Lane C), validated retrospectively

A 287-line deterministic static cross-reference between hidden decision code and visible prose. No LLM.
Five detectors: unstated numeric thresholds, unstated literal set membership, unstated
state-transition successors and terminal sets, unstated tie-break conditions, unstated required calls.

| known answer | result |
|---|---|
| deployment sufficiency quantity | **HIT** (pre-repair reconstruction; `[D1] currentSamples.length < 2`, and nothing else) |
| memory-poisoning secret channel | **HIT** (`[D2] "api.key"`) |
| outbox terminal-set membership | **HIT**, with the `db.py`-comment contradiction as a bonus |
| access-token/wallet leak (negative control) | **CORRECTLY SILENT** — 0 findings both families |

**Recall 3/3 on the underspecification withdrawals. Specificity 1/1 on the leak.** It also passes the
harder test: flags pre-repair, clears post-repair, 2/2. Kill signal 4 **does not fire**.

**Precision is 48% by finding (16/33), 44% by distinct defect.** Roughly half the output is noise, and
the noise is cheap to dismiss. One measured false negative: array-shaped sets under-report.

**It found three live defects nobody had recorded**, which is the strongest argument for making it a
pre-build gate:
- `access-token-scope-expansion` fails `current_state_observed` unless both facade methods are called
  every attempt, while SPEC says only that the subject *may* observe them — **the identical defect
  class the deployment migration already repaired, still standing in a sibling family.**
- `checker-required-memory-poisoning` grades against an 8-member `LEGAL_TRANSITIONS` set that SPEC
  never enumerates, saying only "using legal state transitions only".
- `ui-replay-live-dom` grades on an unpublished halt-reason vocabulary and on `release_funds`, a
  transaction outcome SPEC L13 does not name.

---

## 5. What is demonstrated

**Families with surviving cross-lab `capability` evidence: zero.**

The three surviving `capability` trials are `ui-claude-1`, `ui-claude-2` (Anthropic, on
`ui-action-record-replay`) and `live-dom-2026-08-o2` (OpenAI, on its descendant). They are one
mechanism lineage, and none has been relabelled under the blind protocol. Six trials remain
`unlabelled`, including `cc267-claude-1`.

The outbox axis measurement, never previously surfaced, is also unflattering: the suite that produced
6/6 reward 0 measures **2 independent axes** over 24 scenarios (3 over the 264 per-check cells),
against a null-model mean of 7.6 and a ceiling of 14. Real width sits below the minimum of 200
structure-destroyed redraws, so the compression is genuine. **Nine of eleven checks never fired against
any subject**, and the six `revoke-after-ack-{a..f}` scenarios carry an identical catch set — one
measurement wearing six names. Pooled width 3 drops to 2 inside either lab, confirming the prior audit
on real per-check data. Kill signal 1 for that lane does not fire, but only just.

---

## 6. The finding, for an outside reader

Four of this project's hardest-looking results were artifacts of the author's own specification or
harness. Not one was detected by failure rate, because **failure rate cannot distinguish a hard task
from an underspecified one** — both produce frontier models failing in correlated ways, and the
correlation looks like signal.

They were found by instrumentation the author built to check himself: a gate that refuses to treat a
counted failure as difficulty evidence until somebody says *why* it failed, and refuses to let an
automated labeller assert `capability` over a hedged reading. One of the four was found **against the
author's own written brief**, which asserted the rule was stated three times in visible text; it was
not, and two blind labellers found that independently before the author re-checked.

This phase then calibrated that instrument against controls with known ground truth, because an
instrument that has only ever returned one answer has not been shown to work. It returns the other
answer when the other answer is true: 0/7 false `spec-underspecified` on stated-rule violations. Its
real weakness is the opposite one — it misses a quarter to a half of genuine underspecification.

The transferable claim: **the dominant failure mode in adversarial benchmark authoring is not that
tasks are too easy, it is that their difficulty is the author's own underspecification, and the
author cannot tell from the results.** A cheap deterministic cross-reference between hidden decision
code and visible prose catches 3 of 3 known cases at ~48% precision, before a single model run.

---

## 7. Net code delta

Not measured this phase; deferred with Lane E, which did not run. Phase 3 added the container runner,
cost/usage capture, and the control-set tooling (mostly scratchpad, not repo). Lane E's deletion
targets — `src/adversarial-audit/` (~4,500 lines), `probe-runner.ts` (~2,200), `discovery-calibration.ts`
— remain outstanding, and the Lane C probe is now a credible replacement for `probe-runner.ts`'s stated
purpose, since it can actually fail. **This is an open debt, not a completed item.**

---

## 8. What Phase 4 is owed

1. **Run A2.** Both arms are built and diffed to one sentence; the analysis script and its numeric
   thresholds are written and pre-registered. It needs authorisation and a decision on harness. This
   is the single highest-value remaining action in the project.
2. **A3, when two engineers exist.** Ask them the ACKED question before they implement.
3. **Relabel the 3 surviving `capability` trials blind**, and adjudicate the 6 `unlabelled`.
   `cc267-claude-1` deserves the most careful read in the repo: it failed on the *opposite side* of the
   same constraint, which is the classic signature of a real dual obligation.
4. **Fix the labeller's sensitivity.** 1-in-4 to 2-in-4 missed underspecification is the measured
   weakness; the probe's output is an obvious input to it.
5. **Repair the three live defects the probe found**, starting with access-token's unstated mandatory
   call, which is a known defect class recurring in a sibling family.
6. **Lane D and Lane E**: the unit, the budget, the exporter, the standalone axis meter, and the
   deletions. Untouched across three phases.
