# Phase 6 — Port the discipline that already works

*Hand-authored. Every number in it is reproducible from the scripts and data files named beside it.*

---

## 0. The two load-bearing checks, settled first

Both were flagged as unverified and both gate whole lanes, so both were settled before anything
downstream ran.

### The A2 treatment diff is exactly one sentence

```
$ diff -r tasks/dao-a2-control tasks/dao-a2-treatment
55a56,57
> `ACKED` and `REVOKED` are terminal: neither has an outgoing transition.
>
```

Plus the `task.toml` name line. Nothing else. Confirmed.

### `idem_key` durability — and a correction to my own first answer

I reported this early in the phase as "reconstructible twice over": once as a pure function of durable
columns, and once from a write-ahead intent record. **The first half is wrong, and it is not merely
wrong — it is the trap the task is built around.**

`engine/worker.py:14` computes `idem_key(action_id, req_id, epoch)`. `epoch` is durable, but SEMANTICS
§4 says *"`epoch` increases by one every time the action is leased, ever"*, and `harness/driver.py`
advances the clock by `RESTART_STEPS = LEASE_STEPS + 1` on a crash precisely so *"a peer reclaims the
action at a higher epoch instead of the same worker resuming under the epoch it already had"*. So the
epoch after restart is **not** the epoch at the time of the call. Recomputing the key yields one the
tool has never seen, the idempotency dedupe does not fire, and the recovery call causes a **second
side effect**.

The one route that works is the other half: `try_execute` commits `intent:{k}` to the durable audit
table *before* `tool.invoke`, so the literal key is on disk.

```python
k = idem_key(aid, req_id, epoch)
db.audit(cur, aid, T.LEASED, T.LEASED, worker_id, epoch, f"intent:{k}")
conn.commit()          # committed BEFORE the side effect
tool.invoke(k, aid, payload)
```

All three independent residue readers found the epoch trap. Neither I nor the phase brief did. It is
recorded in `data/phase-6-derivation-test.json` under `theTrap`, and it turns out to be the single
most important fact in the phase — see §3.

---

## 1. The five screens, ported

The source project's `FINDINGS.md` §9 lists five screens in cost order. This repository had built
exactly one of them, and it had built the most expensive one.

| # | screen | cost | was in the foundry? | now |
|---|---|---|---|---|
| 1 | **Vise test** — write the evidence chain; verify the citations | paper, ~45 min | partially, inside the spec probe | `src/screens/vise.ts` |
| 2 | **Activation audit** — does the structure ever fire? | mechanical, seconds | no | `src/screens/activation.ts` |
| 3 | **Leak audit** — MI, value multiplicity, cheap classifier | mechanical, seconds | no | `src/screens/leak.ts` |
| 4 | **Identifiability** — do shipped facts determine the label? | mechanical, seconds | no | `src/screens/leak.ts` |
| 5 | **Agent screen** — 3 samples against a private scorer | ~25 min | **yes** — `src/spec-probe/` | unchanged |

`src/screens/run.ts` runs 1–4 cheapest-first and **stops at the first kill**, because the claim being
made is not "these checks find problems" — any four checks find problems — it is "the problems are
findable before the expensive step", and you cannot demonstrate that with a runner that always pays
for the expensive step.

Two design notes worth keeping:

- **Screens 3 and 4 are the two horns of the vise and fail in opposite directions.** Leak fails when
  the visible data determines the label; identifiability fails when it does not. A repair that
  satisfies one moves the artifact toward failing the other. They live in one file so nobody reads
  them apart.
- **A screen with no input is `notRun`, never a pass.** Same rule this repository already enforces
  between a failing cell and an unmeasured one, for the same reason.

### Two defects I had to fix in my own screens before trusting them

Reported because the first version of this retrospective was wrong and said 9/9 for the wrong reasons.

1. **The knob rule tested a global property.** It asked "do any two instances differ", which credits a
   knob with variation some *other* knob caused. It reported `keys` live for two families and `seed`
   dead for one, essentially at random. Now a knob fires only if two instances differing in **nothing
   but that knob** produce different outcomes.
2. **The leak audit was reading identifier leakage as task leakage.** A `schedule` in this repository
   is the knob tuple joined by `/` — `revoked/exact/fresh/r2` — so it is very nearly a unique key, and
   a decision tree splitting on a unique key reaches any accuracy you like by memorising it. That put
   two families at 75–100% for no reason connected to the task. The schedule is now decomposed into
   its components and the raw string, `id` and `seed` are excluded.

A third correction went the other way: the gate initially killed on structures that simply **never
varied** — `family` is constant in any single-family sweep — which took down two families for a
property of how the matrix was sliced. That is now reported and never fatal.

---

## 2. A5 — the screens run backwards against outcomes already known

`node scripts/screen-retrospective.mjs`

| artifact | inst | dead checks | dead knobs | tree/base | collisions | killed at |
|---|---|---|---|---|---|---|
| prompt-injection-containment | 128 | 4/9 | schedule | 100.0/46.9 | 0 | **activation** |
| prompt-injection-memory-poisoning | 288 | 3/11 | — | 100.0/46.5 | 0 | **activation** |
| ui-action-record-replay | 324 | 0/10 | — | 61.7/19.4 | 36 | **leak** |
| ui-replay-live-dom | 864 | 0/17 | — | 47.5/19.2 | 54 | **identifiability** |
| checker-required-memory-poisoning | 792 | 1/27 | seed | 52.0/2.9 | 0 | **activation** |
| access-token-scope-expansion | 384 | 1/11 | seed | 98.7/50.0 | 0 | **activation** |
| delegated-wallet-scope-reconciliation | 804 | 2/15 | — | 65.7/21.9 | 9 | **activation** |
| deployment-model-alias-rollout-drift | 339 | 2/16 | — | 47.2/5.6 | 1 | **activation** |
| durable-outbox (shipped matrix) | 24 | undeclared | — | 100.0/41.7 | 0 | **activation** |

**9 of 9 killed by mechanical screens alone, with no model run and no trial paid for.** By screen:
activation 7, leak 1, identifiability 1.

**Prediction P1 holds.** The source project's benchmark was four of five designs killed at steps 1–3
before any code existed. This is nine of nine killed at steps 2–4 in seconds, against a repository
that spent 18–120 hours per family to learn the same thing after the build.

The most-repeated finding is `mechanism_fired` — the check that asserts the family's own mechanism
was exercised — separating nothing in four families. A family whose mechanism check never
discriminates between subjects has not demonstrated it has a mechanism.

`ui-replay-live-dom` deserves a separate line: **54 collision groups covering all 864 rows.** Every
instance in it shares visible content with another instance carrying a different graded label. Under
screen 4 that family's labels are not determined by its shipped facts at all.

---

## 3. The outbox verdict, re-derived

Protocol: independent readers given **only** the subject-visible package — `instruction.md`,
`spec/SEMANTICS.md`, `engine/*.py`, `harness/*.py` minus `tool_server.py`, staged to a clean directory
with zero hidden-test leakage. No reader saw the phase brief, the candidate derivations, or each
other. Each had to quote verbatim, list assumptions absent from the cited text, and flag negative
inference.

### The ACKED axis — withdrawn, category 1

Question: *may an action that has reached `ACKED` be recorded as `REVOKED`?* Against the **control**
arm, the one without the terminal-states sentence.

| reader | answer | negative inference | confidence |
|---|---|---|---|
| reader-1 | **yes** | yes | medium |
| reader-2 | **cannot be determined** | yes | medium |
| reader-3 | **not determined** | yes | high |

**Three readers, three different answers, from the same package.** The pre-registered scoring rule —
*"readers disagree on the answer itself → category 1, underspecified"* — fires on the answers alone
and does not need the negative-inference argument at all.

**Derivation B fails, and my registered prediction P2 holds against the brief's.** The brief predicted
2 citations, 2 sections, depth 1, no negative inference — the pass band. What the readers found:

- §6's antecedent (*"if revocation lands after the tool call has already happened"*) **is** satisfied
  by an ACKED action, but its consequent names the recorded pair *"`EXECUTED` then `REVOKED`"*, which
  an already-acked action cannot produce. Two readings are each consistent with every sentence in the
  package and nothing selects between them.
- §9 governs **audit fidelity, not edge legality**. An engine that really moves ACKED→REVOKED has made
  that transition occur, so §9 does not forbid it. This is the step Derivation B needed and does not
  have.
- §7's *"the audit trail must carry both facts"* and `instruction.md`'s *"An action that already
  reached the tool and is revoked afterwards is recorded as having done both"* both pull **against**
  the rule. An ACKED action reached the tool.
- Reader 3 found the sharpest form: §4's diagram omits **two** things the same document requires —
  passage through `IN_DOUBT`, and the `EXECUTED → REVOKED` edge §6 mandates. *"A diagram that already
  fails to list a mandatory edge cannot be read as forbidding an unlisted one."*
- `engine/db.py`'s comment calling `(EXECUTED, ACKED, REVOKED)` terminal is self-defeating: §6
  requires `EXECUTED → REVOKED`, so "terminal" there cannot mean "no outgoing transition".

This is independently corroborated by A2, mechanically and with no judgement: one sentence closing the
enumeration took `audit_explains` from 33 cells to 0.

### The residue axis — restored, category 2

Question: *after an `after_tool` crash, how does the engine determine whether the side effect
occurred?*

**All three readers agree on the substance, all at high confidence, and all three independently found
the epoch trap.**

The decomposition that settles it — and the readers found it, not me:

- **Determination is impossible.** Reader 3 *proves* it rather than asserting it. World A: crash on the
  intent `commit`, so `tool.invoke` is never reached — no side effect, no receipt. World B: crash on
  the `tool` with outcome `OK` — the side effect happened, and no receipt is guaranteed, because §7
  promises receipts only for calls whose outcome was `UNKNOWN`. After rebuild the engine-visible rows
  are **identical** in both worlds: action `LEASED`, `executed=FALSE`, same epoch, same `intent:` row,
  and `poll_receipts()` empty in both. No function of observable state separates them.
- **Reconstruction is possible and derivable.** Commit a durable intent carrying the exact key before
  the call; after restart recover *that* key and re-invoke under it; idempotency collapses both worlds
  to one outcome. The engine never needs to know which world it was in.
- **The spec says exactly this itself:** §7 — *"A service that calls an external system cannot look up
  whether its own call landed, which is why exactly-once has to be **reconstructed rather than
  checked**."*

So the question as posed — and as Phase 5 posed it — was the wrong question, and the readers caught
that. The graded requirement is not "determine what happened"; it is "achieve exactly-once".

**Profile: 4 citations across 3 sections, depth 2, no load-bearing negative inference on the main
answer.** Under the A1 banding that is **`demanding-fragile`, not the ship band.** It is category 2 —
genuine difficulty, not underspecification — but at the tortuous end, and the honest reading is
*repair before shipping*. Rounding it into the pass band would be exactly the thing this phase exists
to stop.

### Verdict

**The durable outbox is withdrawn in part and restored in part.**

- ACKED axis: **withdrawn**, category 1.
- Residue axis: **restored**, category 2 at the fragile end.

That is the decomposition registered as outcome 4 in Phase 4, which the axis-width test was too coarse
to detect. It took a derivation test to see it.

`cc267-claude-1` stranding an action in `IN_DOUBT` forever is therefore a **genuine capability
failure** on the residue axis: the reconstruction route was derivable from cited text, and that engine
did not take it.

**Kill signal 3 does not fire.** Derivation B failed, but the residue survived on a separate axis, so
the outbox is not dead.

**What would overturn this:** if the hidden verifier grades *"determine what happened"* rather than
*"achieve exactly-once"*, the residue is category 1 after all and the restoration is wrong. That is
checkable against the verifier and **was not checked in this phase.**

### Why this is the interesting result

The trap is calibration-table row 5 in its purest form. An engine that recomputes the key after
restart has a self-check that runs **green** — it re-invoked, it got `OK`, it recorded `EXECUTED` —
over a double side effect it cannot see. That is *"requires choosing against a confirmed green
measurement"*, p 0.35–0.55, the only region worth building in.

---

## 4. B1 — the candidate pool against the calibration table

`node scripts/reclassify-pool.mjs`

| discovery shape | p | n | worth building |
|---|---|---|---|
| evidence-channel-present | 0.85–1 | 44 | no |
| consequence-of-stated-rule | 0.85–1 | 0 | no |
| standard-tool-residual | 0.8–1 | 6 | no |
| memorised-public-implementation | 0.85–1 | 0 | no |
| **choose-against-confirmed-green** | **0.35–0.55** | **2** | **yes** |
| **abstraction-model-cannot-justify** | **0.3–0.5** | **0** | **yes** |

Rows 1–4: **50 of 52 (96.2%)**. Rows 5–6: **2 (3.8%)**.

**Prediction P3 holds. Kill signal 5 FIRES** — the threshold was 3 and the pool has 2.

**The honest caveat, which matters.** 44 of 52 received the *default* row, not a positive
classification. The classifier reads only what a candidate declared about itself and defaults to the
easiest row, which is deliberately the conservative direction — every difficulty estimate on both
projects has been optimistic in one consistent direction. So the defensible statement is **"only two
candidates' own declared text contains any marker of the hard rows"**, not "exactly 50 are provably
easy". The finding is that *the pool was not written with rows 5–6 in mind.*

The two survivors are `payment-unknown-capture-receipt` and `wallet-multisig-hidden-threshold`. The
first is the family Phase 5 built forward and killed at gate 1 — it was the right *kind* of candidate
and it still failed, which is a sharper data point than either outcome alone.

---

## 5. Lane C — the screen has a pass band

The screen had rejected five of five real artifacts, including one written by an author who knew every
failure mode and wrote against each. From outside, that is indistinguishable from a screen that always
says no.

Rung 5 of the calibration table has to satisfy two requirements that pull against each other, which is
the vise made concrete: identifiability demands the label **be** a function of the visible fields, and
the leak audit demands it not be a **shallow** one. Parity over three visible bits is the minimal
object with both properties — fully determined, and no depth-2 tree beats the base rate on it.

| rung | construction | expected | result |
|---|---|---|---|
| 1 — explicit | label stated in a visible field | leak catches it | ✅ caught |
| 3 — never fires | a declared check no subject fails | activation catches it | ✅ caught |
| 4 — not determined | same visible content, different labels | identifiability catches it | ✅ caught |
| **5 — choose against green** | **3-bit parity + a live 2-check matrix** | **PASSES** | ✅ **passes all three** |

`test/screens.test.ts`, 27 tests, all passing. **Kill signal 2 does not fire: the screen has a
demonstrated pass band for the first time in this project.**

One honest note on how that was reached. The first parity fixture used `pad = i % 5` against `abc =
i % 8`; with 64 rows those periods do not align, the joint distribution came out uneven, and a depth-2
tree read parity through the padding at 62.5%. **That was a defect in the calibration artifact, not in
the screen, and it was fixed by building the artifact correctly rather than by lowering the
threshold.** The commitment registered before the run was that a rung-5 failure would be the headline
and the thresholds would not move; the fixture bug is the one case that rule does not cover, and it is
recorded here so a reader can judge that call themselves.

---

## 6. What this phase did not do

Reported plainly, because the brief asked for nine deliverables and this covers six.

| lane | status | why |
|---|---|---|
| **B2 — self-check coverage** | **not built** | The metric that separated the six outbox agents in `results/34`. **Kill signal 4 is unanswered.** This is the highest-value remaining item: it is mechanically checkable, `results/34` already documents the split it must reproduce, and `self-check-behavior-report` exists and is unused. |
| **B3 — p^N side by side with the axis meter** | **partial** | `passRateBand()` is built and tested; it was not run against the built families and compared to the antichain width. |
| **Lane D — verifier audit port** | **not done** | The no-op / ground-truth-rewrite / status-only engines per family, run against the real grader. |
| **Lane E — economics** | **not done** | The standing list of wrong budget inputs is unchanged from Phase 5. |
| **Lane E2 — the write-up** | **not done** | Deferred for a sixth phase. |
| **Lane F — deletions** | **blocked, see below** | |

### Net code delta: **+2,007 lines. P6 fails.**

| area | lines |
|---|---|
| `src/screens/` (7 files) | +1,209 |
| `test/screens.test.ts` | +423 |
| `scripts/` (2 files) | +144 |
| `data/` (2 files) | +193 |
| tracked edits | +38 |

**Why nothing was deleted, specifically.** The brief named `probe-runner.ts` (1,838 lines) and said to
change the promotion validator rather than keep it alive. I measured the coupling before touching it:
**23 exports, every one live**, across `src/foundry/promotion.ts`, `src/foundry/load.ts`, four reports
and three test files. `src/adversarial-audit/` (4,087 lines) is imported by 16 files including
`src/cli.ts`, five reports, six test files and two CI scripts. `discovery-calibration.ts` does not
exist under that name.

Retiring either is a phase of work, not a deletion, and doing it carelessly risks the two ground rules
that outrank net lines — *never make a gate pass by making it unreachable*, and *preserve, never delete,
evidence*. A dead-export scan found 277 unreferenced exports of which only 10 are fully dead; that is
roughly 100 lines and would not have changed the sign.

So: net lines have now risen in two consecutive phases, and the honest statement is that **this
repository has no deletion path that does not first require a refactor nobody has scheduled.**

---

## 7. Pre-registered predictions, scored

| id | prediction | outcome |
|---|---|---|
| **P1** | ported screens kill the withdrawn families earlier and cheaper | ✅ **holds** — 9/9, mechanically, seconds |
| **P2** | Derivation B does *not* reach depth 1 without negative inference | ✅ **holds** — and worse: readers disagree on the answer |
| **P3** | most of the pool lands in rows 1–4 | ✅ **holds** — 50/52, with the caveat in §4 |
| **P4** | self-check coverage reproduces the `results/34` split | ⬜ **not run** |
| **P5** | calibration row 5 passes the screen | ✅ **holds** — pass band demonstrated |
| **P6** | net lines fall | ❌ **fails** — +2,007 |

| kill signal | fires? |
|---|---|
| 1 — ports are wrong if they don't kill earlier | **no** |
| 2 — screen has no pass band | **no** — rung 5 passes |
| 3 — Derivation B fails *and* `idem_key` non-reconstructible → outbox dead | **no** — B failed, but the key is recoverable and the residue survives |
| 4 — self-check coverage does not separate the six | **unanswered** |
| 5 — fewer than 3 candidates in rows 5–6 | **FIRES** — 2 of 52 |

---

## 8. What this phase actually established

**The foundry has been paying, one family per phase, for a result its own source project derived
theoretically across five design cycles and fifteen candidates.** The identifiability vise predicts
every withdrawal in Phases 1–5. The screens that follow from it cost seconds and kill nine of nine
built families in this repository.

Three things are new, and none of them was in either repo:

1. **The instrument now has three categories, and the middle one is where the value is.** The ACKED
   axis is category 1 and the residue axis is category 2, in the *same task*. An instrument with two
   categories collapsed them and withdrew the whole thing.

2. **The residue's difficulty has a name and a mechanism.** `idem_key` folds in `epoch`; a crash forces
   a re-lease; recomputing the key produces a second side effect while the engine's own self-check
   runs green. That is calibration row 5 exactly, found in a task that already exists, and it is the
   first concrete instance anyone on either project has exhibited of the only shape worth building.

3. **The screen passes something.** Until this phase it had rejected five of five.

The one-sentence version:

> Specification defects come in two kinds and only one is a defect. Four mechanical screens costing
> seconds separate them, and applied backward to nine built families they reproduce every withdrawal
> the foundry paid 18–120 hours each to discover. Applied to the flagship task they split it: one axis
> is underspecified and stays withdrawn, and one is a genuine reasoning wall whose trap is that the
> agent's own check runs green over the failure.

The honest limits: the classifier defaults 44 of 52 candidates rather than classifying them; the
residue restoration depends on the verifier grading reconstruction rather than determination, which
was not checked; kill signal 4 is unanswered; and net lines rose for the second phase running.
