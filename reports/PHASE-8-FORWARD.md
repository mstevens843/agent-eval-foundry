# Phase 8 — Run it forward

*Hand-authored. Every number is reproducible from the script or data file named beside it.*

---

## 1. Lane A — the forward pass, gate by gate

**A1. Chosen: `stale-cache-recompute`, built as `delegated-grant-replay`.**

Of the six row-5 survivors it sits on the **authorisation channel**, which `FINDINGS.md` §8 names as the
one unexplored direction where the confirmed-green escape might still be real.

The rejection worth recording is `lossy-order-reconstruction`. It was the tempting pick — no local
signal at all — and `FINDINGS.md` §4 measured that direction **shut**: any arrival-order label lives
in row order, and `(df.ts.diff() < 0).sum()` is line one of any agent's exploration. Choosing it would
have repeated a known dead end at full build cost.

Registered before building: calibration row 5; expected failure mode "the subject consults
`store.currentPolicy()` instead of `store.policyAt(grant.issuedAtVersion)`, and its own tests pass
because the fixtures never force the two policies apart."

### A2. Screen 1 — the vise test. **KILLED.**

Three independent readers, SPEC only, none seeing the brief, the candidate record, or each other.
Reader 2 was asked to *implement* and then to describe how it would check its own work — the question
that decides row 5.

| reader | result |
|---|---|
| 1 | **allowed**, high confidence. Identified the trap unprompted: *"`store.currentPolicy()` is the most convenient method on the table, so a programmer skimming the interface before reaching G3 would plausibly write [it] and wrongly deny this use."* |
| 2 | consulted `policyAt(issuedAtVersion)` — **correct**, high confidence. Called the current-policy accessors *"bait."* |
| 3 (adversarial) | **UNDERSPECIFIED** |

**Reader 3's finding is decisive and it is the identifiability vise itself.** A two-line rule that
never reads the policy —

```
allow = grantExists(grantId) && within(requestedScope, grant.scope)
```

— scores **3 of 3 on the entire Legal-outcomes table**. It ignores `issuedAtVersion`, `principal`,
`resource` and `currentPolicyVersion` entirely. G3's *widening* clause is **inert**, because G1
already caps every decision at `grant.scope`; only *narrowing* could bite, and narrowing is exactly
the direction with no outcome row. So:

> If the trial set contains no invalidly-issued grant, the task is **trivially solvable** and the
> mechanism is decorative. If it does, the task is graded on a case the spec **does not decide.**

Both horns, simultaneously. Reader 3 found 14 underspecifications; the sharpest is that *"validly
issued"* is load-bearing twice and never defined, and that **G5 argues both ways on it with equal
force** — allowing a grant the at-issue policy never permitted substitutes judgement for the policy;
overriding the durable log substitutes judgement for the log.

**Cost to kill: 3 model reads. No code written, no trial paid for.** Cost avoided: 18–120 hours of
build plus a $150–400 matrix. **Kill signal 1 applies — this is the phase succeeding, not failing.**

### A disagreement I am reporting rather than resolving

Readers 2 and 3 **contradict each other** on the row-5 property:

- **Reader 2: yes, a self-check catches it.** It designed the discriminating narrowing fixture
  unprompted — v1 grants `{read,write}`, v2 revokes `write`, the use requests `write` — and reported
  *"the disagreement is forced."*
- **Reader 3: no.** The Legal-outcomes table has three rows, none mentioning policy content, so all
  three derived tests pass under the wrong implementation. *"To catch the substitution the author
  would have to invent, unprompted, a case the spec never enumerates, and invent its expected answer
  too. Inventing an oracle the spec does not state is not a self-check; it is authoring a different
  spec."*

Both are right about different things: reader 2 demonstrates the test is **inventable**, reader 3 that
inventing it is **not self-checking**. The disagreement does not change the verdict, because reader
3's independent finding kills the candidate on its own.

### The correction that matters more than the kill

`stale-cache-recompute` was recorded in Phase 7 with `divergenceIsLocallyObservable: false`. **That was
my assertion, and a reader disproved it.** The record is corrected and the screen now rejects it.

Re-running the row-5 screen: **5 of 10 survive, not 6.**

**The Phase 7 figure was inputs I wrote about my own candidates.** This is the first one tested against
readers and it did not survive contact. The honest reading of "the shape is generative" is weaker than
Phase 7 stated: the screen is sound, but its inputs are author assertions until a reader tests them,
and the one tested so far was wrong. Kill signal 4 still does not fire — 5 is the threshold — but it
now sits *on* the line rather than above it.

### A3–A6: not reached

The candidate died at gate 1, so there is no build, no trial, no `p̂`, and no self-check-coverage
measurement for a new family. That is the correct outcome and the cheapest possible one.

---

## 2. Lane A5 — a constraint recorded before it could flatter anything

**Codex is the only executable provider.** Anthropic is import-only (requires
`CLAUDE_CODE_OAUTH_TOKEN` in the runner environment), Gemini is entitlement-blocked.

A two-lab n≥6 matrix — the twelve trials that reach p ≤ 0.22 — **was not runnable in this session**.
Any matrix I could have run would have been single-lab and bounded p only to 0.393. This was
registered *before* choosing a candidate so a thin matrix could not later be presented as a full one.

A token was supplied in an earlier phase and rotated on my advice. I have not reused a rotated
credential from the transcript.

---

## 3. Lane B1 — the second matrix, and what the rules said

**It cannot be obtained. It is not on this machine in any form.**

- The source repo's `runs/` holds exactly six `cc267-*` trials plus three cheat trials.
- Those six are **byte-identical** to the six already imported: `cc267-claude-1` is 1,536,194 bytes in
  both, `cc267-codex-1` is 198,823 bytes in both.
- `results/` contains one 267-check matrix document and no second.
- A grep for independent-operator / replication / rerun across `results/` and `FINDINGS.md` returns
  only unrelated oracle and cheat reruns.

**The ruling, under the repository's own rules:** the replication is **real evidence this repository
cannot count.** It is not folded into any bound. The outbox stays at **p ≤ 0.393** from six countable
trials.

**Kill signal 5 fires.** Stated plainly, as instructed: *this repository cannot support a p ≤ 0.30
claim on its own strongest family, and the evidence that would support it exists outside it.*

That is the case the countability rules were written for, and saying so is worth more than the
tightened bound would have been.

---

## 4. Lane B2 — kill signal 3, resolved

**It does not fire, and the distinction matters.**

The signal was written as "the enforcement screen finds zero instances." My first screen found 17 —
all false positives from matching rule-code names against check names. `prompt-injection-containment`
publishes *decision reason codes* and enforces all of them through one generic check; there is even a
mutant built to violate `P5_SECRET_EGRESS` specifically.

The rebuilt screen is constructive — a subject that violates one rule must fail some check, which is
what the mutant bank *is* — and it finds **zero uncaught mutants** and **33 checks no mutant is aimed
at**.

**Zero uncaught mutants is a different thing from the original screen finding zero.** The original
would have meant "no stated rule lacks enforcement," which the class's three prior appearances make
implausible. The rebuilt result means "every planted defect is caught by its intended check" — the
existing gate working — while the *dual* gap is real and large: checks nothing has ever shown can
fail anyone.

---

## 5. Lane B3 — the unmutated checks, sharpened

`node scripts/unmutated-checks.mjs`

"No mutant aimed at it" is weaker than "never fires" — a mutant aimed at check A may fail check B
incidentally. Crossing the two:

| | count |
|---|---:|
| checks with no mutant aimed at them | 33 |
| **of those, also never fire against any subject** | **13** |
| of those, structural (a mutant would have to break the harness) | 7 |
| **of those, RULE checks — nothing has ever shown they can fail anyone** | **6** |

The six: `decisions_match_ledger` (PIC), `audit_legal_transitions` (PIC, memory-poisoning),
`audit_terminal` (PIC, memory-poisoning), `subject_report_matches_ledger` (checker-required).

**P4 is falsified.** I predicted a majority of the 33 would be structural; only 7 of 33 are.

Those six are class B1 located precisely: on all available evidence they are decoration.

---

## 6. Lane C — spending the seam, and a correction to Phase 7

### The correction first

Phase 7 reported *"the promotion validator never ran a live probe."* **That was too strong.**
`promotion.ts` depends on the probe vocabulary through `import type` alone — true — but `load.ts:149`
calls `assertPromotionsValid(promotions, loadProbeRunSummary(...), workbench)`, and
`loadProbeRunSummary` calls `runMechanismProbes` at line 140. **The validator does not run probes; its
caller runs them to produce its input, and the validator cannot be satisfied without one.**

The seam I cut was real — five files repointed, the validator's own imports are type-only — but
smaller than I framed it.

### What the live run actually buys

`assertPromotionsValid` uses the summary to confirm the recorded `sourceProbeVerdict` still matches
what the probe produces **today**. That is a genuine anti-drift guarantee, and deleting it without
replacement would weaken a gate to make a number look better. **`probe-runner.ts` is therefore not
deleted this phase**, and the blocker is now stated exactly: replacing the live re-run requires
promotions to carry a hash of the probe definition, which is a data migration on evidence records.

Of its 1,698 lines, 855 are the `EXECUTABLE_PROBES` bank — the definitions themselves, which any
hash-based replacement still needs. The deletable part is the execution engine, not the file.

### What was deleted

**43 of 52 candidates retired** against the calibration table, to a compact ledger in
`data/retired-candidates.json` recording each id's row and reason.

Nine were kept: the 2 interior candidates, plus **7 that are structurally referenced** by a probe,
promotion or lineage record. The first attempt retired those too and broke `cli check` with
`E_DANGLING_REF` — *"dangling references make coverage reports lie."* The gate caught it, which is the
gate working.

### Net lines

| | lines |
|---|---:|
| tracked (candidate retirement, seam repointing, test update) | **−639** |
| new files (retirement ledger, pre-registration, Lane A record, one script) | +587 |
| **net** | **−52** |

**Net lines fall. P3 holds; kill signal 4 does not fire.** First time in four phases.

The honest note: the fall comes from retiring *data*, not from deleting *code*. The three named code
targets all still stand, and `probe-runner.ts`'s blocker is now specified rather than removed.

---

## 7. The write-up

**Why a benchmark task is hard to make hard, and what $100k actually buys.**

**1. Failure rate cannot distinguish a hard task from an underspecified one.** A controlled experiment
settles it: one sentence added to a specification — *"`ACKED` and `REVOKED` are terminal"* — moved a
check-level statistic from 33 failing cells to zero, while the reward-level result stayed
inconclusive at p = 1.000. The agents were not failing at the task. They were failing at a rule the
document did not determine, and no amount of reward data would have said so.

**2. Four of my own flagship results were artifacts.** Specification defects, harness contract
violations, package leaks. One was caught against my own written brief. Three more of the same class
were found in my own infrastructure afterwards.

**3. The instrument.** Eight screens in cost order, five of them before any code exists. Validated
three ways: backwards against nine built families it killed in seconds; constructively against a
mutant bank; and forwards, once, this phase — where it killed a screened candidate for three model
reads against an 18–120 hour build.

**4. The arithmetic, which reframes the original question.** The best known mechanisms sit at
p = 0.35–0.55. Reward is binary, so a task needing N independent discoveries passes at p^N, and
adversarial judging collapses every claimed 3–5 discoveries to 1 or 1.5. Six trials bound p only to
0.39; twelve reach 0.22. "1000 tasks that reliably get reward 0" is off by orders of magnitude — not
because the tasks are expensive to build, but because **most candidates are not hard and you cannot
tell which without measuring.**

**5. The interior, located and graded.** There is one shape worth building: *a value recoverable only
from committed evidence, where recomputation is silently wrong and the agent's own check confirms the
wrong answer.* Found concretely in a shipped task — an idempotency key folding in an epoch that moves
across a crash — and **proved graded**: recomputing produces two ledger entries under one action id,
so `check_exactly_once` fires while every local check passes. Measured: **3 of 6 trials ran their own
checks green over a submission the verifier failed.** The other three never wrote an assertion to be
wrong about.

**6. Run forward once.** A screened candidate on the one unexplored channel died at gate 1 for three
reads, because a policy-blind two-line rule scored 3/3 on its whole outcomes table. That is the
screen working and it is the cheapest possible answer.

**7. The limits, kept in.** A registered axis-width test that did not fire. A cross-family calibration
that turned out to be a ceiling effect. A first negative control that passed vacuously. A
clean-checkout check that was itself vacuous. An enforcement screen whose first version gave 17 false
positives. A prediction falsified at 0.393. A row-5 candidate I asserted was unobservable and a reader
disproved. And a claim in the last report — "the promotion validator never ran a live probe" —
corrected in this one.

That last section is why the rest is worth reading.

---

## 8. Predictions and kill signals

| id | prediction | outcome |
|---|---|---|
| P1 | the candidate dies at a screen rather than reaching trial | ✅ **holds** — screen 1, 3 reads |
| P2 | self-check-green rate ≥ 2 of 6 for the new family | ⬜ **not reached** — no trial |
| P3 | probe-runner deletable, net lines fall | ⚠️ **half** — net −52, but probe-runner not deleted |
| P4 | a majority of the 33 unmutated checks are structural | ❌ **falsified** — 7 of 33 |

| kill signal | fires? |
|---|---|
| 1 — candidate dies at a screen | **applies, and is a success** |
| 2 — p̂ interval includes 0.80 | n/a — no trial |
| 3 — self-check-green rate far below 3 of 6 | n/a — no trial |
| 4 — net lines rise a third time | **no** — −52 |
| 5 — second matrix unobtainable, bound stays 0.393 | **FIRES** |

---

## 9. What is left, honestly

**Lane E (the economics) was not done.** The inputs named in the brief — `axesPerFamily`,
`instancesPerFamily`, `hoursPerFamily`, the dead `postBuildKillRate`, the `$3.50` literal — remain
wrong, and kill signal 4 from Phase 6 remains unanswered. That is the fifth phase it has been
deferred and it should be the next phase's first lane, not its last.

**The forward pass completed but did not go far.** One candidate through one gate is a real forward
pass and the screens' first genuine prospective use, but it is not the same as a family reaching a
measured `p̂`. The four remaining row-5 candidates are unscreened by readers, and — given
`stale-cache-recompute` — their `divergenceIsLocallyObservable` values should be treated as
unverified author assertions until readers test them.
