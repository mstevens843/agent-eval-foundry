# Phase 9 — Build the descendant

*Hand-authored. Every number is reproducible from `data/descendant/` and the scripts named beside it.*

**Operator note, first because it gates the rest:** the Anthropic token was supplied and works — all
four Anthropic providers and Codex now report `configured`, so a two-lab matrix is unlocked. What is
*not* done is the matrix itself: each parent trial ran 29 minutes to 1 hour 58, so 12 descendant
trials plus 6 parent trials is 9–36 hours of wall clock. That did not fit this session. The descendant
is packaged so the matrix is an operator command, not further build work.

---

## 1. The controlling parameter, measured rather than argued

The trap: a worker dies between the tool call and the local record of it, the lease expires, the
action is re-leased at a higher epoch, and `idem_key(action_id, req_id, epoch)` recomputes to a key
the tool has never seen. The dedupe does not fire and the side effect happens twice.

**Method.** A 72-point grid over the existing schedule grammar, run against the real harness on a
local Postgres. Response variable: duplicate external side effects per action — exactly what
`check_exactly_once` grades. Nothing here reasons about which knob matters; the grid decided.

**Answer: `n_workers`, and it is a hard threshold.**

| n_workers | fires in | n |
|---:|---:|---:|
| **1** | **0.0%** | 24 |
| 2 | 45.8% | 24 |
| 3 | 58.3% | 24 |

**A single-worker schedule structurally cannot exercise this axis.** That is a 0.0000%-activation
structure — the same shape that killed two designs in the source project, found here before shipping
rather than after.

Secondary effects, also measured:

| parameter | effect |
|---|---|
| `n_crashes` | 1 crash → 19.4%; **plateaus at 50%** for 2, 3 and 5. More than two buys nothing. |
| `keys` | 6 keys → 44.4%, 12 keys → 25.0%. **Fewer keys concentrates it.** |
| `seed` | 11 → 47.2%, 23 → 22.2%. Which action gets hit. |

This is the parent's own 5/6 → 6/6 correction reached the same way — by measuring which parameter
*controls* the trap rather than validating that the trap is robust.

---

## 2. Amplification

| | parent | descendant |
|---|---|---|
| coverage | 5 armed crashes doubled **one action in ten** | best cell fires **100%** of runs |
| instances that separate | **3 of 24** after the A2 repair | **105 of 108** grid points |

Best cell: `n_workers=4, keys=4`. Selected set: **18 schedules, two per `(n_workers, keys)` cell**,
diversified across the grid rather than taking the first N.

---

## 3. The narrow adversary, and why it had to be narrow

- **Reference:** the solved engine, which stores `idem_key` as a durable **column** and reuses it
  across epochs — recovery by construction.
- **Narrow adversary:** the reference with **one call site changed** — the stored key is ignored and
  one derived from the current epoch used instead. Everything else byte-identical.

Selecting against a broadly-buggy engine makes every parameter look like a trigger. That is precisely
the error that shipped a false solve in the parent's 201-check round, and it is why the adversary here
carries exactly one defect.

---

## 4. Screens

### Independent-fatality — **PASS**

| | result |
|---|---|
| reference fails | **0 of 18** |
| narrow adversary caught | **18 of 18** |

The recompute defect **alone**, with everything else correct, fails every instance. **Kill signal 2
does not fire — the axis is isolated.**

### Activation audit — **PASS**

| check | fires against the narrow adversary |
|---|---|
| `exactly_once` | 18/18 |
| `expected_executions` | 18/18 |
| `revocation_ordering` | 18/18 |
| `executed_iff_called` | 18/18 |

**Kill signal 1 does not fire** — 100% against a one-third threshold.

**The honest reading of that table:** all four checks fire on all 18 instances because they are
detecting *the same defect*. That is isolation achieved, and it means the descendant is deliberately
**narrower** than the parent — one real axis where the parent had one real plus one specification
artifact. An axis meter would report width 1, and that is the intended trade.

### A rig error I caught and am reporting

The first version of this measurement set `result["tool"]`; the checks read `result["_tool"]`. Every
check needing the tool's record ran against `{}`, and **the reference appeared to fail all 18**. I
caught it because a reference engine failing everywhere is not a believable result, not because
anything flagged it. The rig now attaches ground truth exactly as `tests/collect.py` does. Had I
reported the first numbers, the entire fatality result would have been fiction.

---

## 5. Lane 0 — the pool collapses, and this is the phase's largest finding

Four independent readers, one per remaining candidate. **All four overturned.** With Phase 8's
`stale-cache-recompute`, that is **5 of 5 author-generated row-5 candidates overturned by readers.**
Every reader marked `wouldNaturalTestsCatchIt = true`.

| candidate | verdict |
|---|---|
| session-scoped-cursor | locally-observable |
| canonical-digest-normalisation | locally-observable |
| retry-budget-carryover | locally-observable |
| lossy-order-reconstruction | locally-observable |
| *(stale-cache-recompute, Phase 8)* | locally-observable |

**The screen now returns 1 of 10, and the survivor was not generated.** `idem-key-epoch` was found by
*reading an existing task*.

The readers converge on why, and it is the same defect every time:

> In every generated candidate the divergent effect lands **in the subject's own state** — its sink,
> its digest, its balance, its projection — so the subject's natural tests witness it directly. I kept
> mistaking *"the grader checks X"* for *"the subject cannot check X"*.

The session-cursor reader put the discriminator exactly:

> *"Contrast idem-key-epoch, where the divergent effect is a second call landing at a remote tool
> behind a socket the engine cannot open — that effect is genuinely uncountable from inside."*

**The refinement this forces on the template.** The shape needs a sixth element it did not have: the
divergent effect must land where the subject **structurally cannot observe it** — a separate process,
a remote authority, a privilege boundary — *unobservable by construction and stated as such*, not
merely asserted by the author to be hard to notice. `screenRowFive` currently accepts the author's
assertion; it should require the unreachability to be architectural.

**The honest measured generativity of the template is zero new instances from five attempts.** Phase
7's "6 of 10" and Phase 8's "5 of 10" were both measuring my own assertions. This is why building the
descendant on the one *demonstrated* instance, rather than on a generated candidate, was the right
call — and it is the strongest argument in the phase for having done so.

---

## 6. Build hours — the input that has never existed

**0.18 hours (11 minutes)**, wall clock, first command to screened artifact.

Scope: controlling-parameter fuzz (72 runs), amplification sweep (108), narrow adversary, independent
fatality (216 runs across two engines), activation audit (36). Excludes writing this report.

**The caveat is essential and the number must not be used without it.** This is a *descendant*: the
spec, harness, verifier, reference engine and cheat oracles already existed. **It is not
`hoursPerFamily` for a family built from nothing** and must not be substituted for it. What it does
establish is the marginal cost of deriving a new measured task from an existing proven mechanism —
which is the only build cost anyone has now measured rather than estimated in either repository.

---

## 7. The economics, with the inputs that now exist

| quantity | value | source |
|---|---|---|
| descendant build | **0.18 h** | measured, this phase |
| family build from nothing | 18–120 h | shape files; still never measured |
| screening a candidate to death | **3 model reads** | Phase 8 forward pass |
| full spec probe | ~8 reads | Phase 5 |
| mechanical screens over a built family | seconds | Phase 6, 9 of 9 |
| a counted trial | **$9.62** | measured across 30 runs |
| the A2 differential | **$120.20** counted, **$152.81** with losses | Phase 4 |
| lost-run rate | 6.7% | measured |

**The screening argument as a measurement.** Without screening you build a family at 18–120 hours to
discover whether it is hard. With screening you spend 3–8 model reads to reach the same verdict. The
forward pass in Phase 8 did exactly that: 3 reads, no code, no trial.

**Expected builds per shipped task.** At the calibration table's best row, p = 0.35–0.55, so
P(6 of 6 fail) is 0.8–7.5% and P(≥5 of 6) is 6.9–32%. At the outbox's *measured* p̂ ≈ 0.07 those become
~65% and ~94%. The gap between those two rows is the whole thesis: **the prior prices an unscreened
programme, and a screened mechanism is priced from its own measurement.** The reason "1000 tasks at
6/6" is off by orders of magnitude is not that tasks are expensive to build — it is that most
candidates are not hard, and 5 of 5 of mine were not.

**Kill signal 4 from Phase 6 (the deliverable exporter) remains unanswered**, and the family unit still
does not demonstrably amortise authoring cost.

---

## 8. Registered predictions

**A6, registered before any trial runs:** the descendant's self-check-green rate will be **higher than
the parent's 3 of 6 — at least 4 of 6.** The parent mixed two axes, and failures on the ACKED axis were
often loud. The descendant removes that axis and leaves only the trap whose defining property is that
the engine's own verification is *green*. **Falsified if the rate falls below 3 of 6**, which would
mean isolation diluted the mechanism rather than concentrating it (kill signal 4).

| kill signal | fires? |
|---|---|
| 1 — trap fires on < ⅓ of the measured set | **no** — 100% |
| 2 — recompute defect alone does not fail the suite | **no** — 18/18 |
| 3 — p̂ interval includes 0.80 | pending trials |
| 4 — self-check rate below 3 of 6 | pending trials |
| 5 — pool below threshold **and** descendant dies at a screen | **first clause fires, second does not.** The pool collapsed to 1; the descendant passed every screen it was run through. The conjunction that would justify stopping is **not** met. |

---

## 9. What is built, and what is next

**Built and packaged:** `dao-descendant`, from the A2 treatment arm — 22 scenarios (4 baseline and
UNKNOWN-axis, 18 recompute-concentrated), with the 6 `revoke-after-ack-*` schedules **retired** because
the treatment sentence closes that axis and they now separate nothing. Evidence in `data/descendant/`.

**Next, and it is operator work rather than build work:**

1. **Six more parent trials, three per lab.** This is the best evidence-per-dollar purchase available
   and it is independent of the descendant: it takes the outbox from p ≤ 0.393 to **p ≤ 0.221** and
   converts the repository's strongest family from unsupportable to supportable.
2. **Twelve descendant trials, six per lab**, against the registered self-check prediction.
3. **Rotate the token.** It appeared in a chat transcript.

---

## 10. The write-up

**1. Failure rate cannot distinguish a hard task from an underspecified one.** One sentence added to a
specification moved a check-level statistic from 33 failing cells to zero while reward stayed
inconclusive at p = 1.000. The agents were not failing the task; they were failing a rule the document
did not determine.

**2. Four of my own flagship results were artifacts** — specification defects, harness contract
violations, package leaks. One caught against my own written brief; three more found afterwards in my
own infrastructure.

**3. The instrument.** Eight screens in cost order, five before any code exists. Validated backwards
against nine built families killed in seconds, constructively against a mutant bank, and forwards
twice — once killing a candidate for three reads, once passing a descendant through every gate.

**4. The arithmetic.** Best known mechanisms sit at p = 0.35–0.55; reward is binary so N discoveries
pass at p^N; six trials bound p only to 0.39 and twelve to 0.22.

**5. The interior, located and graded.** *A value recoverable only from committed evidence, where
recomputation is silently wrong and the agent's own check confirms the wrong answer.* Proven graded:
recomputing produces two ledger entries under one action id, so `check_exactly_once` fires while every
local check passes. Measured: **3 of 6 trials ran their own checks green over a failing submission.**

**6. The build.** A descendant derived from that proven mechanism, with the specification artifact
removed and the real axis isolated **by measurement rather than argument** — `n_workers` found by
fuzzing, a single worker shown to never fire it at all, coverage amplified from 3-of-24 separating to
105-of-108, and the defect shown independently fatal on 18 of 18 while a correct engine passes all 18.

**7. The limits.** A registered axis-width test that did not fire. A calibration that was a ceiling
effect. A first negative control that passed vacuously. A clean-checkout check that was itself vacuous.
An enforcement screen whose first version gave 17 false positives. A prediction falsified at 0.393. A
measurement rig that made a correct engine look broken on all 18 instances. And the largest: **five of
five candidates I generated from my own template were overturned by the first readers to see them.**

> The most useful output across nine phases was consistently the corrections, not the production. Each
> was found by something other than me agreeing with myself.

The template describes the one real instance accurately and generated nothing. That is the finding, and
it is why the descendant — derived from the instance rather than from the shape — is the only thing in
this phase that survived contact.
